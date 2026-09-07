# OQIM

O‘zbek tilidagi moliyaviy stol o‘yini. React 19, TypeScript va Vite frontend; Cloudflare Worker, Durable Objects va KV asosidagi onlayn o‘yin serveri.

## Ishga tushirish

Node.js 22 va npm kerak. Repozitoriyni to‘liq yuklang: server o‘yin qoidalarini `app/src/lib/game` dan import qiladi.

```sh
cd app
npm ci
npm ci --prefix workers
npm run dev
```

Frontend server manzili `VITE_OQIM_SERVER` orqali build vaqtida belgilanadi. Mahalliy Worker uchun `app/.env.local` ichida `VITE_OQIM_SERVER=http://localhost:8787` ni sozlang. Bu o‘zgaruvchiga maxfiy qiymat yozmang.

## Tuzilma

- `app/src/lib/game`: umumiy hisob-kitob, qoidalar, hodisalar va botlar.
- `app/src/pages/game`: doska, hisobot, sozlash va qaror oynalari.
- `app/src/lib/net`: onlayn ulanish va API javoblari.
- `app/workers/src`: autentifikatsiya, xonalar, cheklovlar va natijalar.
- `app/scripts`: regressiya va haqiqiy mahalliy Worker integratsiya tekshiruvlari.
- `app/e2e`: Chromium va WebKit brauzer testlari.

## Sifat nazorati

`app` katalogida:

```sh
npm run lint
npm run build
npm run check:game-core
npm run check:bundle
npm run smoke
npm run test:worker
npm audit --audit-level=high
```

Brauzer testlari GitHub Actions orqali bajariladi. Ular kompyuter va telefon o‘lchamlarida doska, mobil hisobot, klaviatura boshqaruvi, axe tekshiruvi, buzilgan saqlanma va API xatolarini qamraydi. Hisobot hamda xato izlari Actions artefaktlarida 14 kun saqlanadi. Bu tekshiruvlar haqiqiy qurilma, screen reader yoki production Core Web Vitals o‘lchovining o‘rnini bosmaydi.

## API

JSON javoblarda `ok` va xatoda `error` maydoni mavjud. Himoyalangan yo‘llar `Authorization: Bearer <token>` talab qiladi.

| Usul | Yo‘l | Vazifa |
|---|---|---|
| GET | `/api/health` | Xizmat holati |
| POST | `/api/rooms` | `{name, timerSec, bots}` bilan xona yaratish |
| GET | `/api/rooms/:code` | Xona holati |
| GET | `/api/rooms/:code/ws` | Ruxsatli Origin orqali WebSocket ulanishi |
| GET | `/api/rooms/:code/results` | Xona natijalari |
| GET | `/api/leaderboard` | So‘nggi 50 natija |
| POST | `/api/auth/register` | Ro‘yxatdan o‘tish |
| POST | `/api/auth/login` | Kirish |
| GET | `/api/auth/me` | Joriy hisob; token talab qilinadi |
| POST | `/api/profile/sync` | Profil sinxronlash; token talab qilinadi |
| GET | `/api/admin/users?cursor=...` | Foydalanuvchilar; admin talab qilinadi |
| POST | `/api/admin/ban` | Hisobni bloklash; admin talab qilinadi |

Kiritish sxemalari `app/workers/src/validation.ts` da. JSON hajmi 512 KiB bilan cheklangan; noto‘g‘ri ma’lumot 400, katta so‘rov 413, noto‘g‘ri media turi 415, so‘rov limiti 429 qaytaradi.

## Deploy

Frontend va Worker alohida chiqariladi. Sifat workflow’i deploy bajarmaydi. Haqiqiy KV bindingi, JWT siri va Durable Object migratsiyalarini sozlash bo‘yicha `app/AUDIT_REMEDIATION.md` ni o‘qing. Mavjud foydalanuvchi omborini yangi bo‘sh ombor bilan almashtirmang.

## Ochiq audit ishlari

Auditning bajarilgan va tugallanmagan bandlari `app/AUDIT_REMEDIATION.md` da yuritiladi. Hisoblar uchun Durable Object va versiya bilan atomar yozish tayyor; haqiqiy hisoblarni ko‘chirish deploy bosqichida bajariladi. Email tasdiqlash/parolni tiklash, indekslangan reyting va kengaytirilgan biznes simulyatsiyasi hali tugallangan deb belgilanmagan.
