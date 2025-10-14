# 部署指南

## 部署方式

### 選項 1：本地開發環境

請參考 README.md 的「快速開始」章節

---

### 選項 2：Docker 部署（規劃中）

```bash
# 建構映像檔
docker-compose build

# 啟動服務
docker-compose up -d
```

---

### 選項 3：生產環境部署

#### 後端部署

1. **環境準備**

```bash
cd backend
npm install --production
```

2. **環境變數設定**

建立 `.env` 檔案，設定以下變數：

```env
NODE_ENV=production
PORT=3001
GOOGLE_API_KEY=your_production_api_key
# ... 其他設定
```

3. **啟動服務**

使用 PM2 管理 Node.js 程序：

```bash
npm install -g pm2
pm2 start src/app.js --name regulation-backend
pm2 save
pm2 startup
```

4. **反向代理**

使用 Nginx 作為反向代理：

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 前端部署

1. **建構生產版本**

```bash
cd frontend
npm run build
```

2. **部署方式 A：靜態網站託管**

將 `frontend/out` 資料夾部署至：
- Vercel
- Netlify
- AWS S3 + CloudFront

3. **部署方式 B：Node.js 伺服器**

```bash
npm run start
```

使用 PM2 管理：

```bash
pm2 start npm --name regulation-frontend -- start
pm2 save
```

4. **Nginx 設定**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 資料庫備份

### ChromaDB 備份

```bash
# 備份向量資料庫
cp -r backend/chroma_db /backup/chroma_db_$(date +%Y%m%d)

# 還原
cp -r /backup/chroma_db_20251011 backend/chroma_db
```

---

## 監控與日誌

### 日誌位置

- 後端：`backend/logs/` (需自行配置)
- PM2 日誌：`~/.pm2/logs/`

### 查看 PM2 日誌

```bash
pm2 logs regulation-backend
pm2 logs regulation-frontend
```

### 監控儀表板

```bash
pm2 monit
```

---

## 系統需求

### 硬體需求

- **CPU**: 2 核心以上
- **記憶體**: 4GB 以上（建議 8GB）
- **磁碟空間**: 10GB 以上

### 軟體需求

- **作業系統**: Ubuntu 20.04+ / CentOS 7+ / macOS
- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本

---

## 安全性設定

### 1. 環境變數保護

- 切勿將 `.env` 檔案提交至版控
- 使用環境變數管理工具（如 dotenv-vault）
- 定期更換 API 金鑰

### 2. HTTPS 設定

使用 Let's Encrypt 取得免費 SSL 憑證：

```bash
sudo certbot --nginx -d your-domain.com
```

### 3. 防火牆設定

```bash
# 開放必要 port
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. 檔案上傳安全

- 限制檔案大小（預設 10MB）
- 僅接受 .docx 格式
- 定期清理暫存檔案

---

## 效能優化

### 1. 後端優化

- 啟用 Node.js Cluster 模式
- 設定 Redis 快取（規劃中）
- 優化 ChromaDB 查詢效能

### 2. 前端優化

- 啟用 Next.js 靜態生成（SSG）
- CDN 加速靜態資源
- 圖片與資源壓縮

---

## 故障排除

### 後端無法啟動

1. 檢查環境變數設定
2. 確認 port 3001 未被佔用
3. 查看日誌檔案

### 前端無法連線後端

1. 檢查 `NEXT_PUBLIC_API_URL` 設定
2. 確認後端服務正常運行
3. 檢查防火牆設定

### AI 建議生成失敗

1. 確認 `GOOGLE_API_KEY` 有效
2. 檢查 Gemini API 配額
3. 查看後端錯誤日誌

---

## 維護建議

### 定期維護

- **每日**: 檢查服務狀態與日誌
- **每週**: 備份向量資料庫
- **每月**: 更新依賴套件、檢查安全性漏洞

### 更新流程

1. 備份資料庫與設定檔
2. 拉取最新程式碼
3. 安裝依賴
4. 執行測試
5. 重啟服務

```bash
git pull origin main
cd backend && npm install
cd ../frontend && npm install
pm2 restart all
```

---

## 擴展性規劃

### 水平擴展

- 多台後端伺服器 + Load Balancer
- 獨立向量資料庫伺服器
- 使用 Kubernetes 管理容器

### 功能擴展

- 整合 Firebase Storage（檔案儲存）
- 新增多使用者權限管理
- 實作即時通知功能

---

## 聯絡支援

如遇部署問題，請聯繫技術支援團隊。

