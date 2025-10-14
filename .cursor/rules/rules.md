# Cursor 開發規範（Rules for Cursor AI Assistant）

> 專案：**法規對應比對系統 (Regulation Mapping System)**  
> 目標：讓 Cursor 依既定結構產生穩定、可維護的程式碼；避免不必要的檔案/資料夾與設定更動。

---

## 🏗️ 專案技術棧與定位
- **前端**：Next.js (App Router) + TailwindCSS
- **後端**：Node.js + Express.js
- **AI 模型層**：Gemini 2.5 Pro（Google AI Studio / Vertex AI）
- **RAG 向量資料庫**：Chroma 或 FAISS（擇一，預設 Chroma）
- **身分驗證**：Firebase Auth（Email/Password）
- **檔案儲存**：Firebase Storage（僅 docx）
- **語言/文件**：全中文；來源為 docx 差異對照表；內規亦為 docx。

---

## 📂 專案目錄結構（請遵守）

```
project-root/
│
├── frontend/                        # Next.js (App Router)
│   ├── app/                         # 頁面與 route
│   ├── components/                  # UI 元件
│   ├── lib/                         # 前端共用工具 (hooks、api 客戶端)
│   └── styles/                      # Tailwind 與全域樣式
│
├── backend/
│   ├── src/
│   │   ├── routes/                  # Express 路由
│   │   ├── services/                # Gemini / RAG / DocParser 服務模組
│   │   │   ├── doc-parser/          # .docx 解析
│   │   │   ├── rag/                 # 檢索與索引
│   │   │   └── llm/                 # Gemini 服務
│   │   ├── utils/                   # 共用工具（logger、validators、errors）
│   │   └── config/                  # 設定與金鑰樣板（*.example.*）
│   ├── app.js                       # 伺服器進入點
│   └── package.json
│
├── docs/                            # PRD、介面規格、設計文件
│   └── PRD.md
│
└── README.md
```

**要求：**
1) 生成程式碼時，**必須放到對應的目錄**；不要隨意新增平行資料夾。  
2) 若需新增模組，請先在 `backend/src/services/` 內建立對應的子資料夾（`doc-parser/`, `rag/`, `llm/`）。  
3) 若需前端 API 呼叫程式碼，請新增於 `frontend/lib/`。

---

## ⚙️ 模組開發規範

### 1) 文件解析（DocParser）
- 僅支援 `.docx`；以 `mammoth` 或 `docx`（node 版）解析。
- 需輸出**結構化結果**（保留段落與表格欄位）。
- 差異對照表的「**修正條文 / 現行條文 / 說明**」要抽為結構化欄位。

**輸出資料結構範例：**
```ts
export type DiffType = "新增" | "修正" | "刪除";

export interface RegulationDiffItem {
  sectionTitle: string;           // 例：第二條 名詞定義
  oldText?: string;
  newText?: string;
  explanation?: string;           // 對照表「說明」欄
  diffType: DiffType;
  anchors?: string[];             // 條號/款目
}

export interface RegulationDiffDoc {
  filename: string;
  items: RegulationDiffItem[];
}
```

### 2) 向量檢索（RAG）
- 使用 `langchain` + `Chroma`（預設）或 `FAISS`。
- **Chunk 規則**：每片 600–800 字；overlap 200 字；盡量以「章/節/條」為切點；保留原始段落索引以利追溯。
- **Metadata 必含**：
```ts
interface PolicyMetadata {
  doc_id: string;          // 例：SO-02-002
  doc_name: string;        // 檔名（含中文）
  version?: string;        // 例：V3.7
  issued_at?: string;      // 發行日期（YYYY/MM/DD）
  section_path?: string;   // 例：第六章/第一節
  article_no?: string;     // 例：第三條、第七條
  form_ids?: string[];     // 例：["F06", "F07", "F11"]
  keywords?: string[];     // 例：["雲端運算服務", "集中度", "核心系統"]
}
```

### 3) LLM 模組（GeminiService）
- 模型：`models/gemini-2.5-pro-latest`
- 僅傳入**必要片段**（法規修正片段 + 內規檢索到的 Top-k 片段）。
- 需可設定 Top-k（預設 5）。
- 產出**不直接改文**，只提供建議（含擬修句）。

**輸入/輸出定義：**
```ts
export interface SuggestionInput {
  diffItem: RegulationDiffItem;    // 來自對照表的一條修正
  policyContexts: Array<{
    content: string;               // 內規對應段落文字
    meta: PolicyMetadata;
  }>;
}

export interface SuggestionItem {
  file: string;                    // SO-02-002
  section: string;                 // 第六章 第一節
  diff_summary: string;            // 對應法規修正摘要
  change_type: DiffType;           // 新增/修正/刪除
  suggestion_text: string;         // 建議修正文（擬修）
  reason: string;                  // 理由與依據（對照/落差解釋）
  trace: {
    regulation_anchor?: string;    // 公文條號/標題
    policy_anchor?: string;        // 內規章節/條號
  };
}

export interface SuggestionOutput {
  suggestions: SuggestionItem[];
}
```

### 4) 後端 API（固定路由與職責）
```
POST /api/upload/regulation   # 上傳法規修正（docx）→ 解析成 RegulationDiffDoc
POST /api/upload/policy       # 上傳/更新內規（docx）→ 切片 + 向量化 + 入庫
POST /api/match               # 以對照表逐條（或批次）檢索內規 Top-k 片段
POST /api/suggest             # 以 match 結果呼叫 Gemini 產生建議（逐條或批次）
GET  /api/download/:taskId    # 匯出報告（docx 或 pdf）
```

- `match` 與 `suggest` 可接受參數：`topK`、`temperature`、`max_output_tokens`。
- `download` 預設提供 docx；pdf 為只讀簡報版。

### 5) 報告輸出（固定 5 欄）
> 僅輸出 5 欄位，請勿增加自定欄位。

1. **關聯內規文件**（文件名稱、版次、章節/條號/段落錨點）  
2. **對應法規修正**（條號或主題、修正重點摘要）  
3. **差異辨識**（新增 / 修正 / 刪除 + 影響範圍）  
4. **建議修正文**（AI 擬修句/段）  
5. **理由與依據**（對照公文修訂 vs 現行內規落差 + 來源追溯 ID）  

---

## 🔒 安全與限制（請務必遵守）
- **禁止** Cursor 生成或修改 `.env` 實際金鑰；一律使用 `backend/src/config/keys.example.ts` 作範本，並在程式中以 `process.env.*` 讀取。
- **禁止** 產生或支援 PDF 來源解析（MVP 僅 docx 來源）。
- **禁止** 修改部署設定（如 `firebase.json`、CI/CD）。
- **禁止** 將完整文件原文上傳至 LLM；只允許必要片段（可設定字數上限）。
- **上傳檔案** 需以 AES-256 at rest 儲存於 Firebase Storage（由程式處理）。
- **前端/後端** 程式碼需符合 ESLint + Prettier。

---

## 🚧 開發行為準則
- 生成前**先描述**：檔案將建立於何處（目錄/檔名）。
- **優先沿用** 既有模組；避免新建平行結構。
- **Commit 規範**：
  - `feat:` 新增功能或 API
  - `fix:` 修正錯誤
  - `refactor:` 重構，不影響功能
  - `docs:` 文件更新
  - `chore:` 依賴或設定調整
- PR 需附：變更摘要、影響面、測試說明。

---

## 🧪 測試原則
- 覆蓋核心單元：`DocParser`, `RAGService`, `GeminiService`
- 使用 Jest 或 Vitest
- 提交前執行：
```
npm run test
npm run lint
```

---

## 🧭 未來擴充（供 Cursor 參考，勿主動實作）
- 半自動/排程爬取公會與金管會公告（來源白名單）
- 多角色權限：編輯者/審核者
- 內規變更追蹤與版本比較（diff 視覺化）
- DMS 整合（僅做介面層抽象）
