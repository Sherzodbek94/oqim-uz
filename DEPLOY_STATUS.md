# OQIM — Cloudflare deploy holati

## ✅ Deploy muvaffaqiyatli yakunlandi

| Komponent | URL | Holat |
|-----------|-----|-------|
| **Server (Workers + Durable Objects)** | https://oqim-server.yigitcha-9493.workers.dev | ✅ Faol |
| **Frontend (Cloudflare Pages)** | https://d085653b.oqim.pages.dev | ✅ Faol |

## Tekshiruv natijalari

- Health: `GET /api/health` → `{"ok":true,"service":"oqim-server","version":19}`
- Xona yaratish: `POST /api/rooms` → `{"ok":true,"code":"KVAWP5",...}`
- Lobby holati: `GET /api/rooms/KVAWP5` → lobby ma'lumotlari qaytdi

## Nima o'zgartirildi

1. `app/workers/wrangler.toml` da Durable Objects migratsiyasi:
   - `new_classes` → `new_sqlite_classes` (Cloudflare bepul tarifi talabi)
2. `app/package-lock.json` va `app/workers/package-lock.json` qayta yaratildi (eski `npm.mirrors.msh.team` mirror ishlolmagan edi).

## Foydalanish

- O'yin sahifasi: https://d085653b.oqim.pages.dev
- Onlayn xona yaratish uchun sahifada **"Onlayn o'yin"** ga kiring.
- Server URL frontend build vaqtida kiritildi: `VITE_OQIM_SERVER=https://oqim-server.yigitcha-9493.workers.dev`

## Qayta deploy qilish (agar kerak bo'lsa)

Server:
```cmd
cd "C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\app\workers"
set PATH=C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\.tools\node;%PATH%
wrangler deploy
```

Frontend:
```cmd
cd "C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\app"
set PATH=C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\.tools\node;%PATH%
set VITE_OQIM_SERVER=https://oqim-server.yigitcha-9493.workers.dev
npm run build
wrangler pages deploy dist --project-name=oqim
```
