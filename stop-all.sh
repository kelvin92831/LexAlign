#!/bin/bash

# 法規對應比對系統 - 停止腳本

echo "🛑 停止所有服務..."
echo ""

# 停止 Node.js 程序
echo "停止 Node.js 程序..."
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# 詢問是否停止 ChromaDB
read -p "是否停止 ChromaDB 容器？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v docker &> /dev/null; then
        docker stop chroma-regulation 2>/dev/null && echo "✅ ChromaDB 已停止" || true
    fi
fi

echo ""
echo "✅ 所有服務已停止"

