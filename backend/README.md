# 後端服務

## 安裝與啟動

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並填入實際金鑰：

```bash
cp .env.example .env
```

編輯 `.env` 檔案，至少需要設定：

```env
GOOGLE_API_KEY=your_actual_google_api_key
```

### 3. 啟動服務

開發模式（含熱重載）：

```bash
npm run dev
```

生產模式：

```bash
npm start
```

服務將在 `http://localhost:3001` 運行

## 測試

```bash
npm run test
```

## 程式碼檢查

```bash
npm run lint
npm run lint:fix
```

## 環境變數說明

請參考 `src/config/keys.example.ts` 取得完整的環境變數範本。

必要變數：
- `GOOGLE_API_KEY`: Google Gemini API 金鑰

選用變數：
- `PORT`: 伺服器 port（預設 3001）
- `CHUNK_SIZE`: 文件切片大小（預設 700）
- `TOP_K`: RAG 檢索數量（預設 5）

## API 文件

請參考根目錄的 `docs/API.md`

