# ✅ 系統設置完成指南

## 🎉 已完成的設置

✅ **後端環境變數已建立** (`backend/.env`)  
✅ **完整啟動腳本已建立** (`start-all.sh`)  
✅ **停止腳本已建立** (`stop-all.sh`)  
✅ **ChromaDB 配置已更新**

---

## 🚀 快速啟動（三步驟）

### 步驟 1：設定 Google API Key

編輯 `backend/.env`，將 `GOOGLE_API_KEY` 改為您的實際金鑰：

```bash
# 使用文字編輯器打開
nano backend/.env

# 或使用 VS Code
code backend/.env
```

找到這一行：
```env
GOOGLE_API_KEY=your_google_api_key_here
```

改為：
```env
GOOGLE_API_KEY=你的實際金鑰
```

**取得 API Key**: https://makersuite.google.com/app/apikey

---

### 步驟 2：確保 Docker 已安裝

檢查 Docker：
```bash
docker --version
```

如果未安裝，請安裝 Docker Desktop：
- **macOS**: https://www.docker.com/products/docker-desktop

---

### 步驟 3：一鍵啟動所有服務

```bash
./start-all.sh
```

這個腳本會自動：
- ✅ 啟動 ChromaDB 容器（Port 8000）
- ✅ 安裝所有依賴
- ✅ 啟動後端服務（Port 3001）
- ✅ 啟動前端應用（Port 3000）

---

## 📍 訪問系統

啟動完成後，訪問：

- **前端介面**: http://localhost:3000
- **後端 API**: http://localhost:3001
- **ChromaDB**: http://localhost:8000

---

## 🛑 停止服務

```bash
# 按 Ctrl+C（在啟動腳本的終端）
# 或執行停止腳本
./stop-all.sh
```

---

## 🧪 測試系統

使用內建測試資料：

1. 開啟 http://localhost:3000
2. 上傳法規文件：`data/official_documents/0002_114000918附件1(差異比較表).docx`
3. 批次上傳內規：選擇 `data/internal_rules/` 內的所有 .docx 檔案
4. 等待約 60-90 秒
5. 查看 AI 生成的建議
6. 下載 Word 報告

---

## 🔍 驗證服務狀態

```bash
# 檢查後端
curl http://localhost:3001/health

# 檢查 ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# 檢查 Docker 容器
docker ps | grep chroma
```

---

## ⚠️ 常見問題

### Q: Docker 容器啟動失敗

**解決方式**：
```bash
# 清理舊容器
docker rm -f chroma-regulation

# 重新啟動
./start-all.sh
```

### Q: Port 已被佔用

**解決方式**：
```bash
# 找出佔用 Port 的程序
lsof -ti:3000  # 前端
lsof -ti:3001  # 後端
lsof -ti:8000  # ChromaDB

# 終止程序
kill -9 <PID>
```

### Q: 沒有 Docker 怎麼辦？

**替代方案**：使用 Python 安裝 ChromaDB
```bash
# 安裝
pip install chromadb

# 啟動（在新終端）
chroma run --host localhost --port 8000

# 然後啟動後端和前端
cd backend && npm run dev
cd frontend && npm run dev
```

---

## 📚 進階設定

### 調整 AI 參數

編輯 `backend/.env`：

```env
TEMPERATURE=0.3        # AI 創造力 (0.0-1.0)
MAX_OUTPUT_TOKENS=2048 # 輸出長度
TOP_K=5                # RAG 檢索數量
```

### 調整 Port

```env
# 後端 Port
PORT=3001

# ChromaDB Port
CHROMA_HOST=http://localhost:8000
```

如果修改前端 Port，需要同時更新 `frontend/.env.local`：
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📖 完整文件

- [README.md](README.md) - 專案總覽
- [QUICKSTART.md](QUICKSTART.md) - 快速開始
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - 使用者手冊
- [docs/API.md](docs/API.md) - API 文件
- [backend/CHROMA_SETUP.md](backend/CHROMA_SETUP.md) - ChromaDB 設定

---

## ✨ 下一步

1. ✅ 已完成環境設置
2. 📝 設定 Google API Key
3. 🚀 執行 `./start-all.sh`
4. 🧪 使用測試資料測試系統
5. 📖 閱讀使用者手冊了解更多功能

---

## 🆘 需要協助？

如遇問題：
1. 查看終端錯誤訊息
2. 檢查 [常見問題](#常見問題)
3. 參考 [完整文件](#完整文件)
4. 聯繫技術支援

---

**🎊 恭喜！系統已準備就緒！**

