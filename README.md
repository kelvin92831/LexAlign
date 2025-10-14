# 法規對應比對系統 (Regulation Mapping System)

> 自動比對法規修訂與公司內規，透過 AI 技術生成修改建議

## 📌 專案概述

本系統旨在協助金融業資安部門快速完成法規遵循修訂工作。透過 **RAG（檢索增強生成）技術** 與 **Gemini 2.5 Pro 大型語言模型**，自動對應最新法規修正與公司現行內規，並生成具體的修改建議。

### 主要功能

- ✅ 上傳法規修正對照表（docx 格式）
- ✅ 批次上傳公司內規文件（最多 50 份）
- ✅ RAG 向量檢索比對相關內規段落
- ✅ AI 生成具體修改建議與理由
- ✅ 匯出 Word 格式報告供審核

### 技術架構

| 層級 | 技術 |
|------|------|
| **前端** | Next.js 14 (App Router) + TailwindCSS |
| **後端** | Node.js + Express.js |
| **AI 模型** | Google Gemini 2.5 Pro |
| **向量資料庫** | ChromaDB |
| **文件解析** | Mammoth (docx parser) |
| **文件生成** | docx (Word generator) |

---

## 🚀 快速開始

### 前置需求

- Node.js 18+ 
- npm 或 yarn
- Google AI API Key（用於 Gemini 模型）

### 安裝步驟

#### 1. 複製專案

```bash
git clone <repository-url>
cd Ｔ_final
```

#### 2. 安裝後端依賴

```bash
cd backend
npm install
```

#### 3. 設定環境變數

建立 `backend/.env` 檔案（參考 `backend/src/config/keys.example.ts`）：

```env
# 伺服器設定
PORT=3001
NODE_ENV=development

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=models/gemini-2.5-pro-latest

# RAG 設定
RAG_DB_TYPE=chroma
CHROMA_PATH=./chroma_db
CHUNK_SIZE=700
CHUNK_OVERLAP=200
TOP_K=5

# 檔案上傳設定
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./tmp/uploads

# AI 生成設定
TEMPERATURE=0.3
MAX_OUTPUT_TOKENS=2048
```

#### 4. 啟動後端

```bash
cd backend
npm run dev
```

後端將在 `http://localhost:3001` 運行

#### 5. 安裝前端依賴

開啟新的終端機視窗：

```bash
cd frontend
npm install
```

#### 6. 設定前端環境變數

建立 `frontend/.env.local` 檔案：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 7. 啟動前端

```bash
cd frontend
npm run dev
```

前端將在 `http://localhost:3000` 運行

---

## 📖 使用說明

### 步驟 1：準備內規文件

將公司內規文件放入 `data/internal_rules/` 資料夾：

```bash
# 將內規文件複製到資料夾
cp 您的內規文件.docx data/internal_rules/
```

**注意**：系統會自動讀取此資料夾的所有 .docx 檔案，無需手動上傳。

### 步驟 2：上傳法規文件

1. 開啟系統首頁 `http://localhost:3000`
2. 查看「內規資料夾狀態」（確認系統已偵測到內規文件）
3. 上傳**法規修正對照表**（.docx 格式）
4. 點擊「開始分析」

### 步驟 3：自動比對分析

系統將自動執行以下流程：

1. **文件解析**：解析對照表，提取修正條文、現行條文、說明欄
2. **自動載入內規**：從 `data/internal_rules/` 資料夾載入所有內規文件
3. **向量檢索**：使用 RAG 技術搜尋相關內規段落（Top-5）
4. **AI 生成**：透過 Gemini 2.5 Pro 生成修改建議與理由

### 步驟 4：查看結果

1. 檢視 AI 生成的修改建議（包含 5 欄資訊）：
   - 關聯內規文件
   - 對應法規修正
   - 差異辨識（新增/修正/刪除）
   - 建議修正文
   - 理由與依據

2. 下載 Word 報告供後續審核

---

## 🔄 工作流程變更說明

**新版流程（v1.1）**：
- ✅ **移除手動上傳內規功能**
- ✅ **改為自動讀取 `data/internal_rules/` 資料夾**
- ✅ **簡化使用者操作流程**

**優點**：
- 更快速：省去每次選擇文件的時間
- 更一致：確保使用相同的內規文件集合
- 更簡單：使用者只需上傳法規文件

**如何更新內規**：
```bash
# 新增或更新內規文件
cp 新的內規.docx data/internal_rules/

# 系統下次分析時會自動載入
```

---

## 📂 專案結構

```
Ｔ_final/
├── backend/                    # 後端服務
│   ├── src/
│   │   ├── routes/             # API 路由
│   │   │   ├── upload.js       # 文件上傳
│   │   │   ├── match.js        # 比對檢索
│   │   │   ├── suggest.js      # 建議生成
│   │   │   └── download.js     # 報告下載
│   │   ├── services/           # 核心服務
│   │   │   ├── doc-parser/     # 文件解析
│   │   │   ├── rag/            # 向量檢索
│   │   │   └── llm/            # Gemini 服務
│   │   ├── utils/              # 工具函式
│   │   ├── config/             # 設定檔
│   │   └── app.js              # 主程式
│   └── package.json
│
├── frontend/                   # 前端應用
│   ├── app/                    # Next.js 頁面
│   │   ├── page.js             # 主頁面
│   │   ├── layout.js           # 布局
│   │   └── globals.css         # 全域樣式
│   ├── components/             # UI 元件
│   │   ├── UploadSection.js    # 上傳區塊
│   │   ├── ProcessingSection.js # 處理區塊
│   │   └── ResultsSection.js   # 結果區塊
│   ├── lib/                    # 前端工具
│   │   └── api.js              # API 客戶端
│   └── package.json
│
├── data/                       # 測試資料
│   ├── internal_rules/         # 內規文件
│   └── official_documents/     # 法規文件
│
├── PRD/                        # 產品需求文件
│   └── 法規對應比對系統 PRD v1.0.md
│
└── README.md                   # 專案說明
```

---

## 🔧 API 端點

### 後端 API

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/upload/regulation` | POST | 上傳法規修正對照表 |
| `/api/upload/policy` | POST | 上傳內規文件 |
| `/api/upload/policy/batch` | POST | 批次上傳內規文件 |
| `/api/match` | POST | 執行 RAG 比對 |
| `/api/match/:taskId` | GET | 取得比對結果 |
| `/api/suggest` | POST | 生成 AI 建議 |
| `/api/suggest/:taskId` | GET | 取得建議結果 |
| `/api/download/:taskId` | GET | 下載報告（docx/json） |
| `/health` | GET | 健康檢查 |

---

## 🧪 測試

### 使用測試資料

專案內附測試資料：

- 法規文件：`data/official_documents/0002_114000918附件1(差異比較表).docx`
- 內規文件：`data/internal_rules/` 資料夾內的所有 .docx 檔案

可直接上傳進行測試。

### 後端測試

```bash
cd backend
npm run test
```

### 前端測試

```bash
cd frontend
npm run lint
```

---

## 📊 修改建議報告格式

每條建議包含以下五欄：

| 欄位 | 說明 |
|------|------|
| **關聯內規文件** | 文件名稱、版次、章節（條號/段落錨點） |
| **對應法規修正** | 條號或主題、修正重點摘要 |
| **差異辨識** | 類型（新增 / 修正 / 刪除）＋ 影響範圍 |
| **建議修正文** | AI 生成的具體修正文句或段落 |
| **理由與依據** | 說明對照公文修訂內容與內規落差、引用來源 |

---

## 🔐 資料安全

- ✅ 所有文件皆人工上傳，不含自動爬取內容
- ✅ 僅上傳必要文字片段送入 Gemini 模型
- ✅ 系統不自動覆寫內規文件，只生成建議報告供人工審核
- ✅ 支援本地部署，資料不外流

---

## ⚙️ 系統需求

### 效能指標

- 每份對照表（含 50 份內規庫）平均處理時間 ≤ 90 秒
- 章節定位準確率 ≥ 90%
- 修改建議採納率目標 ≥ 70%

### 資源需求

- 記憶體：建議 4GB 以上
- 磁碟空間：建議 2GB 以上（用於向量資料庫與暫存檔案）

---

## 🛠️ 開發指南

### 程式碼規範

- 遵循 ESLint + Prettier
- Commit 訊息格式：
  - `feat:` 新增功能或 API
  - `fix:` 修正錯誤
  - `refactor:` 重構，不影響功能
  - `docs:` 文件更新
  - `chore:` 依賴或設定調整

### 新增模組

請遵守專案目錄結構（參考 `.cursor/rules/rules.md`）

---

## 📝 版本資訊

- **版本**：1.0.0
- **發布日期**：2025-10-11
- **PRD 版本**：v1.0（參考 `PRD/法規對應比對系統 PRD v1.0.md`）

---

## 🤝 貢獻

此專案目前為內部使用系統。如需擴充功能或回報問題，請聯繫資安部門。

---

## 📄 授權

內部專案，保留所有權利。

---

## 📞 聯絡資訊

如有問題或建議，請聯繫：

- **專案負責人**：資安部門
- **技術支援**：[待補充]

---

## 🙏 致謝

- Google Gemini AI
- ChromaDB
- Next.js & React 社群
- Express.js & Node.js 社群

