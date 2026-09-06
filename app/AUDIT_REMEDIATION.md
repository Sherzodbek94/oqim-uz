# Audit tuzatishlari — 2026-09-06

## Bajarilgan

- `workers/src/auth.ts`: ro‘yxatdan o‘tish adminlik bermaydi; ishonchli operator belgilaydigan `adminGrantedAt` talab qilinadi. JWT standart soniyali `exp`, issuer/audience, algoritm va sessiya versiyasi bilan tekshiriladi; muddati 1 soat. Yangi parollar kamida 12 belgi, PBKDF2-SHA256 600 000 iteratsiya. Eski 100 000 iteratsiyali hash muvaffaqiyatli kirishda yangilanadi.
- `workers/src/validation.ts`, `http.ts`: runtime sxemalar, 512 KiB JSON limiti, boshqariladigan 400/413/415 javoblari, umumiy CORS va Authorization preflight.
- `workers/src/rateLimit.ts`: atomar Durable Object limiti; himoya bindingisiz so‘rovlar xavfsiz rad qilinadi.
- `workers/src/GameRoom.ts`: xona kodi to‘qnashganda 409, WebSocket origin/ulanish/xabar limitlari; tugagan o‘yin natijasi yozilmasa qayta urinish.
- `workers/src/game/online.ts`: natijalar uchun idempotent kalit; KV sahifalash va parallel o‘qish.
- Asosiy engine, data, bots, plan va types serverda frontend manbasidan qayta eksport qilinadi; nusxalar orasidagi farqlanish yo‘qotildi.
- `financeSummary`: jami daromad − jami xarajat = sof oqim, Erkinlik yo‘li daromadi ham kiritiladi. Hisobot selektorlari o‘yinchini o‘zgartirmaydi.
- `StatementPanel`: beshta asosiy ko‘rsatkich, yig‘iladigan batafsil hisobot, ishlaydigan mobil tablar va klaviatura bilan boshqariladigan Radix tabs.
- `Board`/CSS: kichik konteynerda boshqaruv doska ostida, katta konteynerda markazda; kataklar tugma va matnli izoh bilan, token minimal ko‘rinadigan o‘lchamda.
- Qarorlar va boshlang‘ich qo‘llanma Radix dialogida: fokus cheklovi, klaviatura, muhim qarorni tasodifiy yopishni cheklash. Oddiy hodisa toast orqali ko‘rsatiladi; qarordan keyingi ortiqcha navbat tugmasi olib tashlandi.
- `useGamePersistence`: faqat tiklash mumkin bo‘lgan holatlarni kechiktirib saqlash, xato va qayta urinish tugmasi.
- O‘yin sahifasi kech yuklanadi; kam harakat sozlamasi, hero o‘lchamlari, WSS CSP va haqiqiy standart server manzili.
- Dependency lock fayllari yangilandi; CI yuqori xavfli dependency auditini va yangi regressiya testlarini bajaradi.

## Deploy oldidan muhim shartlar

Frontend nashri va Cloudflare Worker alohida xizmatlardir. Frontend nashri backend kodini avtomatik yangilamaydi.

1. `workers/wrangler.toml` uchun haqiqiy mavjud `OQIM_USERS` KV namespace bindingini operator sozlashi kerak. ID taxminan kiritilmagan; mavjud ma’lumotlar bazasini almashtirmang.
2. `JWT_SECRET` kamida 32 bayt bo‘lsin; uni `wrangler secret put JWT_SECRET` orqali saqlang, repozitoriyga yozmang.
3. `RATE_LIMITER` bindingi va `v2-audit` migratsiyasini Worker bilan birga chiqarish zarur.
4. Admin huquqi kerak bo‘lsa, shaxsni tashqi ishonchli usulda tasdiqlab, KV foydalanuvchisiga `role: admin`, `adminGrantedAt` vaqtini va `ADMIN_EMAILS` allowlistini operator o‘rnatadi. Email yozishning o‘zi tasdiq emas.
5. Eski JWTlar yangilangan serverda qabul qilinmaydi — qayta kirish kerak. Eski oddiy matnli xona tokenlari ham mijozda tiklanmaydi.
6. Deploydan oldin stagingda parol hashining Worker CPU budjetiga sig‘ishi, haqiqiy KV/migratsiya va ikki brauzer multiplayer oqimini tekshiring. Node mock testi haqiqiy Cloudflare integratsiya testi emas.

## Hali yakunlangan deb hisoblanmaydigan ishlar

- Haqiqiy qurilmada vizual/E2E, screen reader va Core Web Vitals o‘lchovlari.
- Cloudflare hisobiga kirish va haqiqiy bindinglarsiz backend production deploy.
- Email tasdiqlash/parolni tiklash, KV hisob yozuvlari uchun kuchli izchillikdagi saqlashga migratsiya.
- Reytingning indekslangan ma’lumotlar bazasiga o‘tishi: sahifalash bor, ammo barcha sahifalarni skanerlash katta hajmda qimmat.
- Sohalar bo‘yicha to‘liq biznes simulyatsiyasi, hamkorlik va boshqa uzoq muddatli mahsulot takliflari. Ushbu tuzatishlar ularning to‘liq realizatsiyasi emas.

## Tekshirish

`app` ichida: `npm ci`, `npm ci --prefix workers`, `npm run lint`, `npm run build`, `npm run check:game-core`, `npm run smoke`, `npm audit --audit-level=high`.

`app/workers` ichida: `npm ci`, `npx tsc --noEmit`, `npm audit --audit-level=high`. Deploy uchun to‘liq repozitoriy kerak: Worker umumiy `app/src/lib/game` manbasini import qiladi.
