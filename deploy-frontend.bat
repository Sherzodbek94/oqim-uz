@echo off
chcp 65001 >nul
setlocal
set "NODE_ROOT=%~dp0.tools\node"
set "PATH=%NODE_ROOT%;%PATH%"
cd /d "%~dp0app"

if "%CLOUDFLARE_API_TOKEN%"=="" (
  echo XATOLIK: CLOUDFLARE_API_TOKEN muhit o'zgaruvchisi o'rnatilmagan.
  echo Iltimos, avval Cloudflare API token yarating.
  exit /b 1
)

if "%VITE_OQIM_SERVER%"=="" (
  echo XATOLIK: VITE_OQIM_SERVER muhit o'zgaruvchisi o'rnatilmagan.
  echo Iltimos, server deploy qilingan URL ni ko'rsating:
  echo   set VITE_OQIM_SERVER=https://oqim-server.sizning-account.workers.dev
  exit /b 1
)

echo Frontend paketlarini o'rnatish...
if exist package-lock.json del package-lock.json
npm install

echo Frontend build...
npm run build

echo Cloudflare Pages'ga joylash...
wrangler pages deploy dist --project-name=oqim --branch=main
pause
