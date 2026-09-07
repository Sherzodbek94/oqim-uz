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
| POST | `/api/auth/verify/request` | `{email}` bilan bir martalik tasdiqlash havolasini so‘rash |
| POST | `/api/auth/verify/confirm` | `{email, token}` bilan emailni tasdiqlash |
| POST | `/api/auth/reset/request` | `{email}` bilan parolni tiklash havolasini so‘rash |
| POST | `/api/auth/reset/confirm` | `{email, token, password}` bilan parolni yangilash |
| GET | `/api/auth/me` | Joriy hisob; token talab qilinadi |
| POST | `/api/profile/sync` | Profil sinxronlash; token talab qilinadi |
| GET | `/api/admin/users?cursor=...` | Foydalanuvchilar; admin talab qilinadi |
| POST | `/api/admin/ban` | Hisobni bloklash; admin talab qilinadi |
| POST | `/api/admin/leaderboard/migrate` | Eski natijalarning 50 yozuvli sahifasini indekslash; admin tokeni va ixtiyoriy cursor |

Kiritish sxemalari `app/workers/src/validation.ts` da. JSON hajmi 512 KiB bilan cheklangan; noto‘g‘ri ma’lumot 400, katta so‘rov 413, noto‘g‘ri media turi 415, so‘rov limiti 429 qaytaradi.

## Deploy

Frontend va Worker alohida chiqariladi. Sifat workflow’i deploy bajarmaydi. Haqiqiy KV bindingi, JWT siri va Durable Object migratsiyalarini sozlash bo‘yicha `app/AUDIT_REMEDIATION.md` ni o‘qing. Mavjud foydalanuvchi omborini yangi bo‘sh ombor bilan almashtirmang.

## Ochiq audit ishlari

Email amallari `/hisob` sahifasida, unga `/profil` orqali o‘tiladi. `app/workers/env.example` server konfiguratsiyasi namunasidir. Jo‘natish adapteri [Resend Email API](https://resend.com/docs/api-reference/emails/send-email) bilan ishlaydi: `RESEND_API_KEY`, tasdiqlangan domendagi `MAIL_FROM` va backend ruxsat ro‘yxatidagi HTTPS `PUBLIC_APP_URL` kerak. Kalit faqat Worker siri sifatida saqlanadi, frontend `VITE_` o‘zgaruvchilariga yozilmaydi. Xizmat sozlanmaguncha havola so‘rash 503 qaytaradi.

Tasdiqlash havolasi 24 soat, parol tiklash havolasi 15 daqiqa amal qiladi. Server tokenning faqat hashini saqlaydi; havola fragmenti sahifa ochilganda manzil satridan olib tashlanadi. Email tasdiqlash adminlik bermaydi. Parol tiklanganda oldingi JWTlar bekor qilinadi. Mavjud bo‘lmagan email va jo‘natish xatolari hisob mavjudligini oshkor qiladigan javob bermaydi. Integratsiya testlari barcha tashqi email so‘rovlarini almashtiradi; haqiqiy xat jo‘natilmaydi.

Auditning bajarilgan va tugallanmagan bandlari `app/AUDIT_REMEDIATION.md` da yuritiladi. Hisoblar ombori, reyting indeksi, email tasdiqlash va parolni tiklash kodi tayyor; haqiqiy ma’lumotlarni ko‘chirish va jo‘natuvchi domenni sozlash deploy bosqichida bajariladi. Kengaytirilgan biznes simulyatsiyasi hali tugallangan deb belgilanmagan.
