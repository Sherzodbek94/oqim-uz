@echo off
chcp 65001 >/dev/null
setlocal
set "NODE_ROOT=%~dp0.tools\node"
set "PATH=%NODE_ROOT%;%PATH%"
cd /d "%~dp0app\workers"

if "%CLOUDFLARE_API_TOKEN%"=="" (
  echo XATOLIK: CLOUDFLARE_API_TOKEN muhit o'zgaruvchisi o'rnatilmagan.
  echo Iltimos, Cloudflare dashboard'dan API token yarating:
  echo https://dash.cloudflare.com/profile/api-tokens
  echo Token these ixtiyorlarini bering: Cloudflare Workers Deploy, Durable Objects, Account read.
  echo Keyin quyidagi buyruqni ishga tushiring:
  echo   set CLOUDFLARE_API_TOKEN=sizning_tokeningiz
  exit /b 1
)

echo OQIM serverini Cloudflare'ga joylash...
wrangler deploy
pause
