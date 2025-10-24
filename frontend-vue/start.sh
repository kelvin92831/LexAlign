#!/bin/bash

# LexAlign 專業版啟動腳本

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 LexAlign 專業版前端"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未安裝 Node.js"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"
echo ""

# 檢查依賴
if [ ! -d "node_modules" ]; then
    echo "📦 首次運行，正在安裝依賴..."
    npm install
    echo ""
fi

# 檢查環境變量
if [ ! -f ".env" ]; then
    echo "⚙️  創建環境配置..."
    cp .env.example .env
    echo "✓ 已創建 .env 文件"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 啟動開發伺服器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 前端: http://localhost:3000"
echo "🔌 後端: http://localhost:3001 (請確保後端已啟動)"
echo ""
echo "💡 提示:"
echo "   • 按 Ctrl+C 停止服務"
echo "   • 修改代碼會自動刷新"
echo "   • 查看文檔: FINAL_UPDATE.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
