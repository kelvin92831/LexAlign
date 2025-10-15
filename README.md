# 法規對應比對系統 (Regulation Mapping System)

> 自動比對法規修訂與公司內規，透過 AI 技術生成修改建議

## 📌 專案概述

本系統旨在協助金融業資安部門快速完成法規遵循修訂工作。透過 **RAG（檢索增強生成）技術** 與 **Gemini 2.5 Pro 大型語言模型**，自動對應最新法規修正與公司現行內規，並生成具體的修改建議。

### 主要功能

- ✅ 上傳法規修正對照表（docx 格式）
- ✅ 自動載入公司內規文件（從 `data/internal_rules` 資料夾）
- ✅ RAG 向量檢索比對相關內規段落
- ✅ AI 生成具體修改建議與理由（傳送完整文件給 LLM）
- ✅ 匯出 Word 格式報告供審核（按文件分組）

### 技術架構

| 層級 | 技術 |
|------|------|
| **前端** | Next.js 14 (App Router) + TailwindCSS |
| **後端** | Node.js + Express.js |
| **AI 模型** | Google Gemini 2.5 Pro |
| **向量資料庫** | ChromaDB |
| **文件解析** | Mammoth (docx → HTML) + Cheerio (HTML 解析) |
| **文件生成** | docx (Word generator) |

---

## 🚀 快速開始

### 前置需求（非常重要）

- Node.js 22.20+ 
- npm 或 yarn
- docker
- Google AI API Key（用於 Gemini 模型）

### 安裝步驟

#### 1. 複製專案 

```bash
git clone <repository-url>
cd LexAlign
```

或整包下載（.zip）

#### 2. 安裝後端依賴

```bash
cd backend
npm install
```

#### 3. 設定環境變數

建立 `backend/.env` 檔案（參考 `backend/src/config/keys.example.ts`）：
(直接複製下面，API key 記得要改)

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
MAX_OUTPUT_TOKENS=8192
```

#### 4. 安裝前端依賴

開啟新的終端機視窗：

```bash
cd frontend
npm install
```

#### 5. 設定前端環境變數

建立 `frontend/.env.local` 檔案：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 啟動步驟

- 快速啟動（僅適用 macOS） 

  回到根目錄執行腳本：

  ```bash
    ./start-all.sh
  ```

- Windows 看這！

  #### 步驟 1：開啟 docker

  #### 步驟 2：啟動 chromaDB

  在 powershell 執行：

  ```bash
  docker run -d \
              --name chroma-regulation \
              -p 8000:8000 \
              -v chroma-data:/chroma/chroma \
              chromadb/chroma:latest
  ```

  #### 步驟 3：啟動前端

  開另一個 powershell 執行： 

  ```bash
  cd frontend
  npm run dev
  ```

  前端將在 `http://localhost:3000` 運行


  #### 步驟 4：啟動後端

  再開另一個 powershell 執行：

  ```bash
  cd backend
  npm run dev
  ```

  後端將在 `http://localhost:3001` 運行


  ##### 註：三個 powershell 皆要保持運行！！

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

1. **文件解析**：使用 HTML 表格解析提取修正條文、現行條文、說明欄
2. **自動載入內規**：從 `data/internal_rules/` 資料夾載入所有內規文件並建立向量索引
3. **向量檢索**：使用 RAG 技術搜尋相關內規段落（Top-5）
4. **完整文件檢索**：取得最相關內規的完整文件內容
5. **AI 生成**：透過 Gemini 2.5 Pro（傳送完整文件）生成修改建議與理由

### 步驟 4：查看結果

系統提供兩種檢視方式：

**📁 按文件分組檢視（預設）**
- 以內規文件為單位分組顯示
- 每個文件顯示需要的所有修改
- 適合實際修訂內規時使用

**📋 按法規條文檢視**
- 以法規修正條文為單位顯示
- 適合追蹤法規遵循狀況

每條建議包含：
- 法規修正摘要
- 變更類型（新增/修正/刪除）
- 受影響章節
- 建議修正文
- 理由與依據
- 追溯資訊

**下載報告**：點擊「下載 Word」匯出按文件分組的完整報告

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
├── data/                       # 資料檔案
│   ├── internal_rules/         # 內規文件（系統自動讀取）
│   └── official_documents/     # 法規文件（測試用）
│
├── docs/                       # 專案文檔
│   ├── API.md                  # API 文檔
│   ├── ARCHITECTURE.md         # 架構文檔
│   ├── USER_GUIDE.md           # 使用手冊
│   ├── DEPLOYMENT.md           # 部署指南
│   └── RAG_OPTIMIZATION.md     # RAG 優化建議
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
| `/api/upload/policy/auto-load` | POST | 自動載入內規文件（從 data/internal_rules） |
| `/api/upload/policy/check` | GET | 檢查內規資料夾狀態 |
| `/api/match` | POST | 執行 RAG 比對 |
| `/api/match/:taskId` | GET | 取得比對結果 |
| `/api/match/test-search` | POST | 測試 RAG 檢索（開發用） |
| `/api/suggest` | POST | 生成 AI 建議 |
| `/api/suggest/:taskId` | GET | 取得建議結果 |
| `/api/download/:taskId` | GET | 下載報告（docx/json，按文件分組） |
| `/health` | GET | 健康檢查 |

**詳細 API 文檔**：參考 [docs/API.md](docs/API.md)

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

**報告採用「按文件分組」格式**，方便逐份內規進行修訂。

### 報告結構

1. **標題頁**：法規對應比對建議報告
2. **文件分組章節**：
   - 每個內規文件獨立一節
   - 文件類型標記（主規章 / 附件範本）
   - 該文件的所有修改建議清單

### 每條建議包含

| 欄位 | 說明 |
|------|------|
| **法規修正摘要** | 對應的法規條號與修正重點 |
| **變更類型** | 新增 / 修正 / 刪除 |
| **受影響章節** | 內規的哪個章節需要修改 |
| **建議修正文** | AI 生成的具體修正文句或段落 |
| **理由與依據** | 說明對照公文修訂內容與內規落差、引用來源 |
| **追溯資訊** | 法規條號 ↔ 內規條號對應 |

---

## 🔐 資料安全

- ✅ 所有文件皆人工放置，不含自動爬取內容
- ✅ 傳送完整內規文件給 Gemini 模型以提升準確度（僅處理過程使用）
- ✅ 系統不自動覆寫內規文件，只生成建議報告供人工審核
- ✅ 支援本地部署，資料不外流
- ✅ 內規文件存放於本地 `data/internal_rules` 資料夾，完全可控

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

- **版本**：1.1.0
- **發布日期**：2025-10-14
- **PRD 版本**：v1.0（參考 `PRD/法規對應比對系統 PRD v1.0.md`）

### 更新記錄

**v1.1.0** (2025-10-14)
- ✅ 改為自動載入內規文件（從 `data/internal_rules` 資料夾）
- ✅ 法規解析改用 HTML 表格解析（Mammoth + Cheerio）
- ✅ LLM 上下文改為完整文件（提升準確度）
- ✅ 建議輸出改為按文件分組
- ✅ Word 報告改為按文件分組格式
- ✅ 提升 Max Tokens 至 8192

**v1.0.0** (2025-10-11)
- 初始版本發布

---

## 📚 延伸閱讀

- [API 文檔](docs/API.md) - 完整的 API 端點說明
- [架構文檔](docs/ARCHITECTURE.md) - 系統架構與技術細節
- [使用手冊](docs/USER_GUIDE.md) - 詳細的使用指南
- [部署指南](docs/DEPLOYMENT.md) - 生產環境部署說明

