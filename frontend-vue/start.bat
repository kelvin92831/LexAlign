@echo off
chcp 65001 >nul
cls

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🎨 LexAlign 專業版前端
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM 檢查 Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 錯誤: 未安裝 Node.js
    echo 請先安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js 版本: %NODE_VERSION%
echo.

REM 檢查依賴
if not exist "node_modules" (
    echo 📦 首次運行，正在安裝依賴...
    call npm install
    echo.
)

REM 檢查環境變量
if not exist ".env" (
    echo ⚙️  創建環境配置...
    copy .env.example .env >nul
    echo ✓ 已創建 .env 文件
    echo.
)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🚀 啟動開發伺服器
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📍 前端: http://localhost:3000
echo 🔌 後端: http://localhost:3001 (請確保後端已啟動)
echo.
echo 💡 提示:
echo    • 按 Ctrl+C 停止服務
echo    • 修改代碼會自動刷新
echo    • 查看文檔: FINAL_UPDATE.md
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

npm run dev
