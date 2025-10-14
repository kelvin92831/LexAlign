# 系統架構文件

## 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                         使用者介面                             │
│                    Next.js Frontend (Port 3000)              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST API
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      Express.js Backend (Port 3001)          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  DocParser   │  │  RAG Service │  │ Gemini Service│     │
│  │   Module     │  │  (ChromaDB)  │  │  (AI Model)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      外部服務                                 │
├─────────────────────────────────────────────────────────────┤
│  • Google Gemini 2.5 Pro API                                │
│  • ChromaDB (Local Vector Store)                            │
│  • File System (Document Storage)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 前端架構

### 技術棧

- **框架**: Next.js 14 (App Router)
- **樣式**: TailwindCSS
- **狀態管理**: React useState/useEffect
- **HTTP 客戶端**: Fetch API

### 元件結構

```
app/
├── page.js              # 主頁面（狀態管理）
├── layout.js            # 全域布局
└── globals.css          # 全域樣式

components/
├── UploadSection.js     # 文件上傳區塊
├── ProcessingSection.js # 處理進度區塊
└── ResultsSection.js    # 結果展示區塊

lib/
└── api.js               # API 客戶端封裝
```

### 資料流

```
使用者操作 → React State 更新 → API 呼叫 → 後端處理 → 回應更新 State → UI 重新渲染
```

---

## 後端架構

### 技術棧

- **框架**: Express.js
- **文件解析**: Mammoth (docx → HTML/text) + Cheerio (HTML 解析)
- **向量資料庫**: ChromaDB
- **AI 模型**: Google Generative AI SDK (Gemini 2.5 Pro)
- **文件生成**: docx (Word generator)

### 模組結構

```
backend/src/
├── app.js                          # 應用程式進入點
├── routes/                         # API 路由
│   ├── upload.js                   # 文件上傳路由
│   ├── match.js                    # 比對路由
│   ├── suggest.js                  # 建議生成路由
│   └── download.js                 # 報告下載路由
├── services/                       # 核心服務
│   ├── doc-parser/                 # 文件解析服務
│   │   ├── types.js                # 型別定義
│   │   ├── regulation-parser.js    # 法規解析器
│   │   └── policy-parser.js        # 內規解析器
│   ├── rag/                        # RAG 服務
│   │   └── chroma-service.js       # ChromaDB 封裝
│   └── llm/                        # LLM 服務
│       └── gemini-service.js       # Gemini API 封裝
├── utils/                          # 工具函式
│   ├── logger.js                   # 日誌工具
│   ├── errors.js                   # 錯誤處理
│   └── validators.js               # 驗證工具
└── config/                         # 設定檔
    ├── index.js                    # 環境變數載入
    └── keys.example.ts             # 環境變數範本
```

### 請求處理流程

```
HTTP Request
    ↓
Express Router
    ↓
Middleware (multer, validation)
    ↓
Route Handler
    ↓
Service Layer (DocParser / RAG / LLM)
    ↓
Response / Error Handler
    ↓
HTTP Response
```

---

## 核心模組設計

### 1. DocParser Module

**職責**：解析 docx 文件，提取結構化資料

#### Regulation Parser（法規解析器）

- **輸入**: 法規修正對照表（.docx）
- **處理**:
  1. 使用 Mammoth 轉換為 HTML
  2. 使用 Cheerio 解析 HTML 表格結構
  3. 識別章節標題（第X條）
  4. 提取修正條文、現行條文、說明
  5. 判斷差異類型（新增/修正/刪除）
- **輸出**: `RegulationDiffDoc` 物件

#### Policy Parser（內規解析器）

- **輸入**: 內規文件（.docx）
- **處理**:
  1. 使用 Mammoth 讀取文件
  2. 提取元資料（文件編號、版本、日期）
  3. 按章節分割文本
  4. 切片（chunk size: 700, overlap: 200）
- **輸出**: `PolicyChunk[]` 陣列

### 2. RAG Module

**職責**：向量檢索與內規比對

#### ChromaDB Service

- **功能**:
  - 初始化向量資料庫
  - 新增文件片段（自動向量化）
  - 語義搜尋（相似度檢索）
  - 集合管理

- **檢索策略**:
  - 使用語義相似度搜尋
  - Top-K 篩選（預設 5）
  - 回傳片段 + 元資料 + 距離分數

### 3. LLM Module

**職責**：AI 建議生成

#### Gemini Service

- **模型**: Gemini 2.5 Pro
- **輸入**: 法規修正項目 + **完整內規文件**（而非片段）
- **Prompt 設計**:
  ```
  系統角色: 法規遵循顧問
  任務: 分析法規修正對應的內規修改需求
  輸入: 法規修正 + 完整內規文件（包含最相關章節標記）
  輸出: JSON 格式建議（5 欄資訊）
  ```
- **參數**:
  - Temperature: 0.3（偏保守）
  - Max Tokens: 8192（支援長文件）
- **上下文增強**:
  - 優先傳送 Top-1 最相關的完整文件
  - 標記最相關章節供 LLM 參考
  - 保留文件結構和上下文

---

## 資料模型

### RegulationDiffItem

```javascript
{
  sectionTitle: string,      // 第X條
  oldText: string,           // 現行條文
  newText: string,           // 修正條文
  explanation: string,       // 說明
  diffType: '新增' | '修正' | '刪除',
  anchors: string[]          // 條號標記
}
```

### PolicyChunk

```javascript
{
  content: string,           // 內容文字
  metadata: {
    doc_id: string,          // SO-02-002
    doc_name: string,        // 檔名
    version: string,         // v3.7
    section_path: string,    // 第六章/第一節
    article_no: string,      // 第三條
    keywords: string[]       // 關鍵字
  },
  index: number              // 片段索引
}
```

### SuggestionItem

```javascript
{
  file: string,              // 內規文件
  section: string,           // 章節
  diff_summary: string,      // 法規修正摘要
  change_type: string,       // 新增/修正/刪除
  suggestion_text: string,   // 建議修正文
  reason: string,            // 理由與依據
  trace: {
    regulation_anchor: string,
    policy_anchor: string
  }
}
```

### SuggestionByDocument（按文件分組）

```javascript
{
  doc_name: string,          // 內規文件名稱
  doc_type: string,          // 主規章 / 附件範本
  changes: [                 // 該文件的所有修改建議
    {
      diff_summary: string,
      change_type: string,
      section: string,
      suggestion_text: string,
      reason: string,
      trace: { ... }
    }
  ]
}
```

---

## API 設計

### RESTful 端點

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/upload/regulation` | POST | 上傳法規文件 |
| `/api/upload/policy/auto-load` | POST | 自動載入內規（從 data/internal_rules） |
| `/api/upload/policy/check` | GET | 檢查內規資料夾狀態 |
| `/api/match` | POST | 執行 RAG 比對 |
| `/api/match/test-search` | POST | 測試 RAG 檢索（開發用） |
| `/api/suggest` | POST | 生成 AI 建議 |
| `/api/download/:taskId` | GET | 下載報告（按文件分組） |

### 任務 ID 機制

- 每次上傳法規文件生成唯一 `taskId`（timestamp）
- 後續所有操作都使用該 `taskId` 追蹤
- 中間結果暫存於檔案系統（`tmp/uploads/`）

---

## 安全性設計

### 1. 輸入驗證

- 檔案類型檢查（僅 .docx）
- 檔案大小限制（10MB）
- 必要參數驗證

### 2. 錯誤處理

- 統一錯誤格式
- 分類錯誤類型（ValidationError, InternalError）
- 不洩漏敏感資訊

### 3. 資料隔離

- 不同任務使用不同 taskId
- 暫存檔案自動清理機制

---

## 效能優化

### 1. 文件解析

- 串流讀取大型文件
- 批次處理多個檔案

### 2. 向量檢索

- ChromaDB 內建快取
- Top-K 限制減少計算量

### 3. AI 生成

- 傳送完整內規文件（而非片段）以提供完整上下文
- 設定較高 Token 上限（8192）支援長文件處理
- 標記最相關章節供 LLM 重點參考

---

## 可擴展性

### 水平擴展

- 無狀態後端設計
- 可多實例部署 + Load Balancer

### 垂直擴展

- 獨立向量資料庫伺服器
- GPU 加速向量運算

### 功能擴展

- 插件式服務架構
- 可替換 RAG 實作（FAISS, Pinecone）
- 可替換 LLM 模型（Claude, GPT）

---

## 監控與日誌

### 日誌層級

- DEBUG: 詳細除錯資訊
- INFO: 一般操作記錄
- WARN: 警告訊息
- ERROR: 錯誤訊息

### 監控指標

- API 回應時間
- AI 生成成功率
- 檔案處理數量
- 錯誤率統計

---

## 技術債務

### 已知限制

1. ~~無法處理複雜表格結構~~（已解決：使用 HTML 解析）
2. 不支援圖片與圖表
3. 向量資料庫未做持久化備份
4. 無多租戶隔離機制
5. 內規文件需手動放置於 `data/internal_rules` 資料夾

### 改進方向

1. ~~實作表格解析增強~~（已完成）
2. 整合 OCR 技術處理圖表
3. 實作資料庫定期備份
4. 新增使用者權限系統
5. 實作 Web 介面的內規文件管理功能
6. 優化 RAG 檢索策略（查詢增強、重排序）

---

## 版本資訊

- **架構版本**: v1.0
- **更新日期**: 2025-10-11