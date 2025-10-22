import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { chromaService } from '../services/rag/chroma-service.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

// 显示 RAG 配置（启动时）
logger.info('RAG 配置已加载', {
  topK: config.rag.topK,
  priorityDocId: config.rag.priorityDocId,
  priorityWeight: config.rag.priorityWeight,
});

/**
 * 提取關鍵詞組
 * @param {string} text - 文本內容
 * @returns {string[]} 關鍵詞組陣列
 */
function extractKeyPhrases(text) {
  if (!text) return [];
  
  const phrases = new Set();
  
  // 模式 1：「應/應當/必須/需要/禁止」相關規範
  const shouldPatterns = /(?:應|應當|必須|需要|禁止|得|不得)([^。，；\n]{2,25}?)(?:[。，；\n]|$)/g;
  let matches = text.matchAll(shouldPatterns);
  for (const match of matches) {
    if (match[1] && match[1].trim().length >= 2) {
      phrases.add(match[1].trim());
    }
  }
  
  // 模式 2：專業術語（資訊安全相關）
  const technicalTerms = [
    /資[通訊]安全[^。，；\n]{0,15}/g,
    /委外[^。，；\n]{0,15}/g,
    /風險[管理評估控制][^。，；\n]{0,15}/g,
    /合約[^。，；\n]{0,15}/g,
    /稽核[^。，；\n]{0,15}/g,
    /備援[^。，；\n]{0,15}/g,
    /個資[^。，；\n]{0,15}/g,
    /供應商[^。，；\n]{0,15}/g,
    /雲端[運算服務][^。，；\n]{0,15}/g,
    /營運持續[^。，；\n]{0,15}/g,
  ];
  
  technicalTerms.forEach(pattern => {
    const termMatches = text.matchAll(pattern);
    for (const match of termMatches) {
      if (match[0] && match[0].trim().length >= 2) {
        phrases.add(match[0].trim());
      }
    }
  });
  
  // 模式 3：「建立/制定/訂定/執行/辦理」+ 「制度/機制/措施/程序/作業」
  const actionPatterns = /(?:建立|制定|訂定|執行|辦理|進行|實施)([^。，；\n]{2,20}?)(?:制度|機制|措施|程序|作業|規範|辦法|計畫)/g;
  matches = text.matchAll(actionPatterns);
  for (const match of matches) {
    const fullPhrase = match[0];
    if (fullPhrase && fullPhrase.length >= 4) {
      phrases.add(fullPhrase);
    }
  }
  
  // 限制數量，按長度排序（較長的通常更具體）
  return Array.from(phrases)
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);
}

/**
 * 生成新舊條文差異摘要
 * @param {string} newText - 新條文
 * @param {string} oldText - 舊條文
 * @returns {string} 差異摘要
 */
function generateDiffSummary(newText, oldText) {
  if (!newText || !oldText) return '';
  
  // 提取中文詞組（2-6個字）
  const extractWords = (text) => {
    const words = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
    return new Set(words);
  };
  
  const oldWords = extractWords(oldText);
  const newWords = extractWords(newText);
  
  // 找出新增和刪除的詞
  const added = [...newWords].filter(w => !oldWords.has(w));
  const removed = [...oldWords].filter(w => !newWords.has(w));
  
  const summaryParts = [];
  
  // 新增詞彙（取最相關的5個）
  if (added.length > 0) {
    const relevantAdded = added
      .filter(w => w.length >= 3)  // 過濾太短的詞
      .slice(0, 5);
    if (relevantAdded.length > 0) {
      summaryParts.push('新增概念：' + relevantAdded.join('、'));
    }
  }
  
  // 刪除詞彙（取最相關的3個）
  if (removed.length > 0) {
    const relevantRemoved = removed
      .filter(w => w.length >= 3)
      .slice(0, 3);
    if (relevantRemoved.length > 0) {
      summaryParts.push('移除概念：' + relevantRemoved.join('、'));
    }
  }
  
  // 檢測關鍵詞替換（如：資訊→資通）
  const replacements = [];
  for (const removedWord of removed.slice(0, 5)) {
    for (const addedWord of added.slice(0, 5)) {
      if (removedWord.length >= 2 && addedWord.length >= 2) {
        const similarity = calculateSimilarity(removedWord, addedWord);
        if (similarity > 0.5 && similarity < 1.0) {
          replacements.push(`${removedWord}→${addedWord}`);
        }
      }
    }
  }
  
  if (replacements.length > 0) {
    summaryParts.unshift('用詞調整：' + replacements.slice(0, 3).join('、'));
  }
  
  return summaryParts.join('；') || '條文內容修正';
}

/**
 * 計算兩個字串的相似度（簡單版本）
 */
function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1);
  const set2 = new Set(str2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * 建構增強型查詢
 * @param {Object} item - 法規修正項目
 * @returns {string} 優化後的查詢文字
 */
function buildEnhancedQuery(item) {
  const parts = [];
  
  // 1. 條文標題（高權重）
  if (item.sectionTitle) {
    parts.push(`📌 條文：${item.sectionTitle}`);
  }
  
  // 2. 從修正說明中提取關鍵概念
  if (item.explanation) {
    const keywords = extractKeyPhrases(item.explanation);
    if (keywords.length > 0) {
      parts.push(`🔑 關鍵概念：${keywords.slice(0, 8).join('、')}`);
    }
  }
  
  // 3. 新舊條文的差異摘要
  if (item.newText && item.oldText) {
    const diffSummary = generateDiffSummary(item.newText, item.oldText);
    if (diffSummary) {
      parts.push(`🔄 修正重點：${diffSummary}`);
    }
    
    // 從新條文中也提取關鍵詞
    const newTextKeywords = extractKeyPhrases(item.newText);
    if (newTextKeywords.length > 0) {
      parts.push(`📝 新條文要點：${newTextKeywords.slice(0, 6).join('、')}`);
    }
  } else if (item.newText) {
    // 新增條文：提取關鍵詞而非完整內容
    const newTextKeywords = extractKeyPhrases(item.newText);
    if (newTextKeywords.length > 0) {
      parts.push(`➕ 新增內容要點：${newTextKeywords.slice(0, 8).join('、')}`);
    }
    // 加上簡短摘要（前150字）
    const summary = item.newText.substring(0, 150).replace(/\s+/g, ' ');
    parts.push(`摘要：${summary}...`);
  }
  
  // 4. 完整說明（精簡版，300字）
  if (item.explanation) {
    const explanation = item.explanation.substring(0, 300).replace(/\s+/g, ' ');
    parts.push(`💬 說明：${explanation}${item.explanation.length > 300 ? '...' : ''}`);
  }
  
  const enhancedQuery = parts.join('\n\n');
  
  // 記錄查詢優化資訊
  logger.debug('查詢優化', {
    original_length: (item.sectionTitle?.length || 0) + 
                     (item.newText?.length || 0) + 
                     (item.explanation?.length || 0),
    enhanced_length: enhancedQuery.length,
    section: item.sectionTitle,
  });
  
  return enhancedQuery;
}

/**
 * POST /api/match
 * 比對法規修正與內規文件
 */
router.post('/', async (req, res, next) => {
  try {
    const { taskId, topK } = req.body;

    if (!taskId) {
      throw new ValidationError('缺少 taskId 參數');
    }

    // 使用請求中的 topK，如果未提供則使用配置檔中的值
    const effectiveTopK = topK !== undefined ? topK : config.rag.topK;

    logger.info('開始比對法規與內規', { 
      taskId, 
      topK: effectiveTopK,
      source: topK !== undefined ? 'request' : 'config'
    });

    // 讀取法規解析結果
    const resultPath = path.join(
      config.upload.uploadPath,
      `regulation_${taskId}.json`
    );

    let regulationData;
    try {
      const content = await fs.readFile(resultPath, 'utf-8');
      regulationData = JSON.parse(content);
    } catch (error) {
      throw new ValidationError('找不到法規解析結果，請先上傳法規文件');
    }

    const { items } = regulationData;
    const matchResults = [];

    // 逐條比對
    for (const item of items) {
      logger.info(`比對條文: ${item.sectionTitle}`);

      // 建構增強型查詢（使用智能關鍵詞提取和差異分析）
      const query = buildEnhancedQuery(item);

      // 搜尋相關內規
      let contexts = await chromaService.search(query, effectiveTopK);

      // === 特定文件加權處理 ===
      const priorityDocId = config.rag.priorityDocId;
      const priorityWeight = config.rag.priorityWeight;
      
      if (priorityDocId && priorityWeight !== 1.0) {
        logger.debug('應用文件加權', { 
          priorityDocId, 
          priorityWeight,
          section: item.sectionTitle 
        });
        
        contexts = contexts.map(ctx => {
          const docId = ctx.metadata?.doc_id;
          
          // 如果是優先文件，降低 distance（提高相似度）
          if (docId === priorityDocId) {
            const originalDistance = ctx.distance;
            const adjustedDistance = ctx.distance * priorityWeight;
            
            logger.debug('文件加權調整', {
              doc_id: docId,
              doc_name: ctx.metadata?.doc_name,
              original_distance: originalDistance.toFixed(4),
              adjusted_distance: adjustedDistance.toFixed(4),
              boost: ((1 - priorityWeight) * 100).toFixed(1) + '%',
            });
            
            return {
              ...ctx,
              distance: adjustedDistance,
              original_distance: originalDistance,  // 保留原始距離供參考
              is_boosted: true,
            };
          }
          
          return ctx;
        });
        
        // 重新排序（按調整後的 distance）
        contexts.sort((a, b) => a.distance - b.distance);
      }

      matchResults.push({
        diffItem: item,
        policyContexts: contexts.map(ctx => ({
          content: ctx.content,
          meta: ctx.metadata,
          distance: ctx.distance,
          original_distance: ctx.original_distance,  // 如果有加權，保留原始距離
          is_boosted: ctx.is_boosted || false,
        })),
      });
    }

    // 儲存比對結果
    const matchPath = path.join(
      config.upload.uploadPath,
      `match_${taskId}.json`
    );
    await fs.writeFile(matchPath, JSON.stringify(matchResults, null, 2));

    logger.info('比對完成', { itemCount: matchResults.length });

    res.json({
      success: true,
      data: {
        taskId,
        matchCount: matchResults.length,
        results: matchResults,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/match/:taskId
 * 取得比對結果
 */
router.get('/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const matchPath = path.join(
      config.upload.uploadPath,
      `match_${taskId}.json`
    );

    let matchData;
    try {
      const content = await fs.readFile(matchPath, 'utf-8');
      matchData = JSON.parse(content);
    } catch (error) {
      throw new ValidationError('找不到比對結果');
    }

    res.json({
      success: true,
      data: {
        taskId,
        matchCount: matchData.length,
        results: matchData,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

