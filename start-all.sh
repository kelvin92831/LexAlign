#!/bin/bash

# 法規對應比對系統 - 完整啟動腳本
# 包含 ChromaDB、後端、前端的完整啟動流程

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 法規對應比對系統 - 完整啟動"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 錯誤：未安裝 Node.js${NC}"
    echo "請先安裝 Node.js 18 或更高版本"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本：$(node -v)${NC}"
echo ""

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  警告：未安裝 Docker${NC}"
    echo "ChromaDB 需要 Docker 運行"
    echo ""
    echo "請選擇："
    echo "1. 安裝 Docker：https://www.docker.com/products/docker-desktop"
    echo "2. 或使用 Python 安裝 ChromaDB：pip install chromadb && chroma run --host localhost --port 8000"
    echo ""
    read -p "已經手動啟動 ChromaDB？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Docker 已安裝${NC}"
    
    # 檢查 ChromaDB 容器是否已在運行
    if docker ps | grep -q chromadb/chroma; then
        echo -e "${BLUE}ℹ️  ChromaDB 容器已在運行${NC}"
    else
        echo ""
        echo -e "${BLUE}📦 啟動 ChromaDB 容器...${NC}"
        
        # 檢查是否有舊容器
        if docker ps -a | grep -q chroma-regulation; then
            echo "   移除舊容器..."
            docker rm -f chroma-regulation 2>/dev/null || true
        fi
        
        # 啟動新容器
        docker run -d \
            --name chroma-regulation \
            -p 8000:8000 \
            -v chroma-data:/chroma/chroma \
            chromadb/chroma:latest
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ ChromaDB 容器已啟動${NC}"
            echo "   等待 ChromaDB 初始化..."
            sleep 5
        else
            echo -e "${RED}❌ ChromaDB 容器啟動失敗${NC}"
            exit 1
        fi
    fi
fi

# 驗證 ChromaDB 連線
echo ""
echo "🔍 驗證 ChromaDB 連線..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ChromaDB 服務正常運行${NC}"
else
    echo -e "${RED}❌ 無法連接到 ChromaDB (http://localhost:8000)${NC}"
    echo "請確認 ChromaDB 服務已啟動"
    exit 1
fi

# 安裝後端依賴
echo ""
echo -e "${BLUE}📦 檢查後端依賴...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo "   安裝後端依賴..."
    npm install
else
    echo -e "${GREEN}✅ 後端依賴已安裝${NC}"
fi

# 檢查 .env 檔案
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 檔案，建立預設配置${NC}"
    cp .env.example .env 2>/dev/null || echo "GOOGLE_API_KEY=your_api_key_here" > .env
fi

# 檢查 GOOGLE_API_KEY
if grep -q "your_google_api_key_here\|your_api_key_here" .env; then
    echo -e "${YELLOW}⚠️  警告：GOOGLE_API_KEY 尚未設定${NC}"
    echo "   請編輯 backend/.env 並設定您的 Google API Key"
    echo "   取得方式：https://makersuite.google.com/app/apikey"
    echo ""
fi

# 啟動後端
echo ""
echo -e "${BLUE}🚀 啟動後端服務...${NC}"
npm run dev &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}✅ 後端服務已啟動 (PID: $BACKEND_PID)${NC}"
sleep 3

# 安裝 Vue 前端依賴
echo ""
echo -e "${BLUE}📦 檢查 Vue 前端依賴...${NC}"
cd frontend-vue
if [ ! -d "node_modules" ]; then
    echo "   安裝 Vue 前端依賴..."
    npm install
else
    echo -e "${GREEN}✅ Vue 前端依賴已安裝${NC}"
fi

# 檢查 .env
if [ ! -f ".env" ]; then
    echo "   建立 .env..."
    echo "VITE_API_URL=http://localhost:3001" > .env
fi

# 啟動 Vue 前端
echo ""
echo -e "${BLUE}🎨 啟動 Vue 前端應用...${NC}"
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✅ Vue 前端應用已啟動 (PID: $FRONTEND_PID)${NC}"

# 等待服務啟動
sleep 3

# 顯示啟動完成訊息
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ 系統啟動完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📍 服務位址：${NC}"
echo "   • Vue 前端介面：http://localhost:3000"
echo "   • 後端 API：http://localhost:3001"
echo "   • ChromaDB：http://localhost:8000"
echo ""
echo -e "${BLUE}📊 狀態檢查：${NC}"
echo "   • 後端健康檢查：curl http://localhost:3001/health"
echo "   • ChromaDB 心跳：curl http://localhost:8000/api/v1/heartbeat"
echo ""
echo -e "${BLUE}🛑 停止服務：${NC}"
echo "   按 ${YELLOW}Ctrl+C${NC} 停止所有服務"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 清理函數
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 正在停止服務...${NC}"
    
    # 停止 Node.js 程序
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    # 詢問是否停止 ChromaDB
    echo ""
    read -p "是否停止 ChromaDB 容器？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker stop chroma-regulation 2>/dev/null || true
        echo -e "${GREEN}✅ ChromaDB 已停止${NC}"
    else
        echo -e "${BLUE}ℹ️  ChromaDB 容器繼續運行${NC}"
        echo "   手動停止：docker stop chroma-regulation"
    fi
    
    echo ""
    echo -e "${GREEN}👋 服務已停止，再見！${NC}"
    exit 0
}

# 註冊清理函數
trap cleanup INT TERM

# 保持腳本運行
wait

