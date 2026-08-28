# OQIM — Cloudflare deploy holati

## ✅ Deploy muvaffaqiyatli yakunlandi

| Komponent | Doimiy URL | Holat |
|-----------|------------|-------|
| **Frontend (Cloudflare Pages)** | https://oqim.pages.dev | ✅ Faol (production) |
| **Server (Workers + Durable Objects)** | https://oqim-server.yigitcha-9493.workers.dev | ✅ Faol |

> Har bir yangi deploy `https://oqim.pages.dev` manzilini avtomatik yangilaydi. `https://XXXXXX.oqim.pages.dev` ko'rinishidagi havolalar faqat o'sha deploy'ga tegishli vaqtinchalik preview URL laridir — ular o'zgarmaydi, lekin asosiy manzil doimo oxirgi versiyani ko'rsatadi.

## Tekshiruv natijalari

- Health: `GET /api/health` → `{"ok":true,"service":"oqim-server","version":19}`
- Xona yaratish: `POST /api/rooms` → `{"ok":true,"code":"KVAWP5",...}`
- Lobby holati: `GET /api/rooms/KVAWP5` → lobby ma'lumotlari qaytdi
- Auth register: `POST /api/auth/register` → token + user qaytdi

## Nima o'zgartirildi

1. `app/workers/wrangler.toml` da Durable Objects migratsiyasi:
   - `new_classes` → `new_sqlite_classes` (Cloudflare bepul tarifi talabi)
2. `app/package-lock.json` va `app/workers/package-lock.json` qayta yaratildi (eski `npm.mirrors.msh.team` mirror ishlolmagan edi).
3. `wrangler pages deploy` endi `--branch=main` bilan ishga tushiriladi va `https://oqim.pages.dev` doim yangilanadi.

## Foydalanish

- Doimiy sayt manzili: **https://oqim.pages.dev**
- Onlayn xona yaratish uchun sahifada **"O'ynash"** tugmasini bosing va rejim tanlang.
- Server URL frontend build vaqtida kiritildi: `VITE_OQIM_SERVER=https://oqim-server.yigitcha-9493.workers.dev`

## Qayta deploy qilish (agar kerak bo'lsa)

Server:
```cmd
cd "C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\app\workers"
set PATH=C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\.tools\node;%PATH%
wrangler deploy
```

Frontend (doimiy manzilni yangilaydi):
```cmd
cd "C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\app"
set PATH=C:\Users\1\Downloads\Kimi_Agent_O'zbek Cashflow O'yini\.tools\node;%PATH%
set VITE_OQIM_SERVER=https://oqim-server.yigitcha-9493.workers.dev
npm run build
wrangler pages deploy dist --project-name=oqim --branch=main
```
