# RAG 系統優化建議

## 概述

本文件記錄針對法規對應比對系統的 RAG（Retrieval-Augmented Generation）檢索優化建議。目標是提升內規文件檢索的準確性和相關性。

---

## 現況分析

### 當前實作

- **文件切塊**：固定大小切塊（chunk size: 512, overlap: 100）
- **查詢方式**：直接串接法規條文、修正內容、說明
- **檢索方式**：純向量相似度搜尋（ChromaDB default embedding）
- **結果使用**：傳送完整文件給 LLM（已優化）

### 主要問題

1. **查詢過於冗長**：將整條法規修正內容直接作為查詢，稀釋關鍵資訊
2. **切塊策略簡單**：固定大小切塊可能截斷語義，遺失上下文
3. **缺乏重排序**：向量檢索後沒有二次精排，Top-1 準確率可能不足
4. **Embedding 模型**：使用通用英文模型，對中文語義理解可能不足

---

## 優化方案

### 🎯 方案 1：優化查詢構建（優先級：⭐⭐⭐⭐⭐）

**影響**：最大  
**實施難度**：低  
**預期改善**：顯著提升檢索相關性

#### 實作步驟

1. **提取關鍵概念**

```javascript
// backend/src/routes/match.js

function extractKeyPhrases(text) {
  const keyPhrasePatterns = [
    // 規範性詞彙
    /(?:應|應當|必須|需要|禁止)(.{2,20}?)(?:[。，；]|$)/g,
    // 資安關鍵詞
    /(資[通訊]安全|委外|風險|合約|稽核|備援|個資|供應商|雲端)/g,
    // 制度建立
    /(?:建立|制定|訂定|執行|辦理)(.{2,15}?)(?:[制度|機制|措施|程序|作業])/g,
  ];
  
  const phrases = new Set();
  keyPhrasePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) phrases.add(match[1].trim());
      if (match[0]) phrases.add(match[0].trim());
    }
  });
  
  return Array.from(phrases).slice(0, 10);
}
```

2. **生成差異摘要**

```javascript
function generateDiffSummary(newText, oldText) {
  // 找出新增和刪除的關鍵詞
  const oldWords = new Set(oldText.match(/[\u4e00-\u9fa5]{2,}/g) || []);
  const newWords = new Set(newText.match(/[\u4e00-\u9fa5]{2,}/g) || []);
  
  const added = [...newWords].filter(w => !oldWords.has(w));
  const removed = [...oldWords].filter(w => !newWords.has(w));
  
  const summary = [];
  if (added.length > 0) summary.push('新增：' + added.slice(0, 5).join('、'));
  if (removed.length > 0) summary.push('刪除：' + removed.slice(0, 5).join('、'));
  
  return summary.join('；') || '條文內容調整';
}
```

3. **組合增強查詢**

```javascript
function buildEnhancedQuery(item) {
  const parts = [];
  
  // 條文標題（高權重）
  if (item.sectionTitle) {
    parts.push(item.sectionTitle);
  }
  
  // 關鍵概念
  if (item.explanation) {
    const keywords = extractKeyPhrases(item.explanation);
    if (keywords.length > 0) {
      parts.push('關鍵概念：' + keywords.join('、'));
    }
  }
  
  // 差異摘要
  if (item.newText && item.oldText) {
    const diffSummary = generateDiffSummary(item.newText, item.oldText);
    parts.push('修正重點：' + diffSummary);
  } else if (item.newText) {
    parts.push('新增內容：' + item.newText.substring(0, 200));
  }
  
  // 完整說明（截短）
  if (item.explanation) {
    parts.push('說明：' + item.explanation.substring(0, 300));
  }
  
  return parts.join('\n\n');
}

// 使用增強查詢
const query = buildEnhancedQuery(item);
const contexts = await chromaService.search(query, topK);
```

#### 預期效果

**改進前**：
```
查詢長度：800+ 字
Top-1 準確率：60%
```

**改進後**：
```
查詢長度：200-400 字（更精煉）
Top-1 準確率：75-80%（預估）
```

---

### 🎯 方案 2：改進文件切塊策略（優先級：⭐⭐⭐⭐）

**影響**：大  
**實施難度**：中  
**預期改善**：保持語義完整性，提升檢索質量

#### 實作步驟

修改 `backend/src/services/doc-parser/policy-parser.js`：

```javascript
chunkText(text, baseMetadata) {
  const chunks = [];
  const sections = this.splitBySections(text);
  
  sections.forEach((section, sectionIndex) => {
    const { title, content } = section;
    
    // 策略 1：小章節保持完整
    if (content.length <= 800) {
      chunks.push({
        content: `${title}\n\n${content}`.trim(),  // ✨ 包含標題
        metadata: {
          ...baseMetadata,
          section_path: title,
          section_index: sectionIndex,
          is_complete_section: true,  // ✨ 標記完整章節
        },
      });
    } 
    // 策略 2：大章節按條文切分
    else {
      const articles = this.splitByArticles(content);
      
      articles.forEach((article, articleIndex) => {
        chunks.push({
          content: `${title} > ${article.title}\n\n${article.content}`.trim(),
          metadata: {
            ...baseMetadata,
            section_path: `${title} > ${article.title}`,
            section_index: sectionIndex,
            article_index: articleIndex,
            article_no: article.title,
          },
        });
      });
    }
  });
  
  return chunks;
}

// 新增：按條文切分
splitByArticles(content) {
  const articles = [];
  const lines = content.split('\n');
  let currentArticle = { title: '', content: '' };
  
  for (const line of lines) {
    // 檢測條文標題（第X條）
    if (/^第[一二三四五六七八九十百\d]+條/.test(line.trim())) {
      if (currentArticle.content.trim()) {
        articles.push(currentArticle);
      }
      currentArticle = {
        title: line.trim(),
        content: '',
      };
    } else {
      currentArticle.content += line + '\n';
    }
  }
  
  if (currentArticle.content.trim()) {
    articles.push(currentArticle);
  }
  
  return articles.length > 0 ? articles : [{ title: '內容', content }];
}
```

#### 優勢

- ✅ 保持條文完整性
- ✅ 每個 chunk 都包含章節標題（增強語義）
- ✅ 標記完整章節（可用於後續過濾）
- ✅ 更符合法規文件的結構特性

---

### 🎯 方案 3：添加重排序機制（優先級：⭐⭐⭐）

**影響**：中  
**實施難度**：中  
**預期改善**：提升 Top-1 準確率

#### 實作步驟

在 `backend/src/services/rag/chroma-service.js` 添加重排序方法：

```javascript
/**
 * 提取關鍵詞
 */
extractKeywords(text) {
  const keywords = [];
  
  // 中文關鍵詞（2-6 字）
  const chineseWords = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  
  // 過濾常見詞
  const stopWords = new Set(['的', '是', '在', '有', '和', '與', '或', '等', '及']);
  const filtered = chineseWords.filter(w => !stopWords.has(w));
  
  // 詞頻統計
  const freq = {};
  filtered.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });
  
  // 取前 10 個高頻詞
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * 重排序檢索結果
 */
rerankResults(query, results, topK) {
  const queryKeywords = this.extractKeywords(query);
  
  // 對每個結果重新打分
  const reranked = results.map(result => {
    let score = 1 - result.distance;  // 向量相似度 (0-1)
    
    // 加分項 1：關鍵詞匹配
    const matchedKeywords = queryKeywords.filter(kw => 
      result.content.includes(kw)
    );
    score += matchedKeywords.length * 0.1;  // 每個關鍵詞 +0.1
    
    // 加分項 2：完整章節
    if (result.metadata.is_complete_section) {
      score += 0.05;
    }
    
    // 加分項 3：章節標題匹配
    if (result.metadata.section_path) {
      const titleMatch = queryKeywords.some(kw => 
        result.metadata.section_path.includes(kw)
      );
      if (titleMatch) score += 0.15;
    }
    
    // 加分項 4：主規章優先
    if (result.metadata.doc_name && !result.metadata.doc_name.includes('-F')) {
      score += 0.08;
    }
    
    return {
      ...result,
      rerank_score: score,
      original_distance: result.distance,
    };
  });
  
  // 按重排序分數排序
  reranked.sort((a, b) => b.rerank_score - a.rerank_score);
  
  return reranked.slice(0, topK);
}

/**
 * 搜尋方法（加入重排序）
 */
async search(query, topK = null, options = {}) {
  // ... 原有代碼 ...
  
  const results = await this.collection.query(queryParams);
  const formatted = this.formatResults(results);
  
  // ✨ 添加重排序
  const reranked = this.rerankResults(query, formatted, k);
  
  return reranked;
}
```

#### 重排序評分公式

```
最終分數 = 向量相似度 (0-1)
         + 關鍵詞匹配數 × 0.1
         + 完整章節加分 (0.05)
         + 章節標題匹配加分 (0.15)
         + 主規章加分 (0.08)
```

---

### 🎯 方案 4：升級 Embedding 模型（優先級：⭐⭐）

**影響**：長期收益高  
**實施難度**：高  
**預期改善**：中文語義理解顯著提升

#### 選項 A：使用開源中文模型

安裝 `@xenova/transformers`：

```bash
npm install @xenova/transformers
```

使用 BGE-M3 或類似模型：

```javascript
import { pipeline } from '@xenova/transformers';

class CustomEmbeddingService {
  async initialize() {
    this.embedder = await pipeline('feature-extraction', 'BAAI/bge-m3');
  }
  
  async generateEmbedding(text) {
    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}
```

#### 選項 B：使用 Google Gemini Embedding API

利用現有的 Gemini API：

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiEmbeddingService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async generateEmbedding(text) {
    const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
```

#### 選項 C：使用 OpenAI Embedding

```javascript
import OpenAI from 'openai';

class OpenAIEmbeddingService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }
  
  async generateEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

#### 成本與效能比較

| 模型 | 成本 | 中文效果 | 部署複雜度 |
|------|------|----------|-----------|
| ChromaDB Default | 免費 | 中 | 低 |
| BGE-M3 (本地) | 免費 | 高 | 中 |
| Gemini Embedding | 低 | 高 | 低 |
| OpenAI Embedding | 中 | 高 | 低 |

---

## 實施計畫

### Phase 1：立即改進（1-2 小時）

✅ **實施方案 1**：優化查詢構建
- 提取關鍵詞
- 生成差異摘要
- 組合增強查詢

**預期效果**：檢索相關性提升 20-30%

### Phase 2：質量提升（3-4 小時）

✅ **實施方案 2**：改進切塊策略
- 按條文切分
- 保留章節上下文
- 標記完整章節

✅ **實施方案 3**：添加重排序
- 混合打分機制
- 提升 Top-1 準確率

**預期效果**：整體準確率提升至 80-85%

### Phase 3：長期優化（需要更多資源）

✅ **實施方案 4**：升級 Embedding 模型
- 評估不同模型
- 成本效益分析
- 漸進式遷移

**預期效果**：中文語義理解提升 15-25%

---

## 評估指標

### 檢索質量指標

1. **Top-1 準確率**：最相關文件是否在第一位
2. **Top-3 命中率**：相關文件是否在前三位
3. **平均相似度分數**：檢索結果的平均分數
4. **錯誤檢索率**：完全不相關文件的比例

### 測試方法

建立測試集：
- 10 條法規修正
- 手動標註每條最相關的內規文件
- 比較優化前後的檢索結果

---

## 注意事項

1. **漸進式實施**：從方案 1 開始，逐步實施
2. **A/B 測試**：保留舊版本進行對比
3. **用戶反饋**：收集實際使用者的反饋
4. **性能監控**：關注檢索速度和資源消耗

---

## 參考資源

- [ChromaDB 官方文檔](https://docs.trychroma.com/)
- [BGE-M3 論文](https://arxiv.org/abs/2309.07597)
- [RAG 最佳實踐](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [向量檢索優化技巧](https://www.llamaindex.ai/blog/boosting-rag-picking-the-best-embedding-reranker-models-42d079022e83)

---

**最後更新**：2025-10-14

