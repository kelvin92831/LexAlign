# 前端應用

## 安裝與啟動

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

建立 `.env.local` 檔案：

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

應用將在 `http://localhost:3000` 運行

### 4. 建構生產版本

```bash
npm run build
npm run start
```

## 開發

### 程式碼檢查

```bash
npm run lint
npm run lint:fix
```

### 目錄結構

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.js             # 首頁
│   ├── layout.js           # 全域布局
│   └── globals.css         # 全域樣式
├── components/             # React 元件
│   ├── UploadSection.js    # 上傳區塊
│   ├── ProcessingSection.js # 處理區塊
│   └── ResultsSection.js   # 結果區塊
└── lib/                    # 工具函式
    └── api.js              # API 客戶端
```

## 配置

### API URL

修改 `.env.local` 中的 `NEXT_PUBLIC_API_URL` 來指定後端 API 位址。

### TailwindCSS

樣式設定位於 `tailwind.config.js`

## 部署

請參考根目錄的 `docs/DEPLOYMENT.md`

