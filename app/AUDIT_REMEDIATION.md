# Audit tuzatishlari — 2026-09-06

## Bir nechta biznesni tanlash — 2026-09-08

- Lokal hisobot va onlayn o'yinchilar panelida B kvadranti uchun «Boshqariladigan biznes» tanlovi. Tanlash faqat o'z navbatida zar tashlashdan oldin; ochiq qarorda onlayn almashtirish rad etiladi.
- `managedBusinessId` saqlanadi. Eski saqlovlarda oldingi faol buyurtma/birinchi biznes tartibi saqlangan; sotilgan biznesga qolgan tanlov save ochilganda tozalanadi. Qurilishdagi va begona biznes tanlanmaydi.
- `eligibleEvents` operatsiya va filial kartasini biznes ID hamda nomiga bog'laydi. Xodim, uskuna, ombor va buyurtma faqat o'sha aktivga qo'llanadi; sotilgan nishon boshqa biznesga avtomatik almashtirilmaydi.
- Har bir biznes alohida buyurtma olib boradi. Tanlanmagan buyurtmalar muddati ham oyda kamayadi. Jami naqd umumiy, xodim/quvvat/zaxira va oylik biznes xarajatlari alohida.
- Onlayn server tanlovni tekshiradi, qarorning nishoni va bosqichini qayta tekshiradi; klientdan narx yoki effekt qabul qilmaydi.
- Regressiya: ikkita buyurtma, xarajatlar ajratilishi, o'zgargan tanlovda karta nishoni, sotilgan/begona biznes, oy muddatlari, save/reload va onlayn tanlash. Brauzer testlari lokal qayta ochish va server javobidan keyingi onlayn tanlovni tekshiradi.
- Avvalgi «ko'p biznesni qo'lda tanlash yo'q» cheklovi shu bosqichda yopildi. Sohalarga xos narx/quvvat iqtisodiyoti va umumiy balansning uzoq sinovi keyingi ishlar; merge/deploy bajarilmaydi.

## Onlayn biznes qarorlari — 2026-09-07

- `workers/src/game/online.ts`: biznes kartalari endi pending qaror bo'lib ochiladi; server yaratgan bir martalik `decisionId`, joriy o'yinchi va deadline tekshiriladi. Klient faqat ID va 0/1 tanlov yuboradi, effekt va narx server kartasidan olinadi.
- `GameRoom.ts`: yangi xabarlar shakli tekshiriladi. Botlar biznes tanlovini mavjud mantiq bilan bajaradi; insonning taymeri tugasa xarid/buyurtma avtomatik qabul qilinmaydi.
- `Online.tsx`, `net/client.ts`: biznes qarori va ikkita tanlov, server holati kelganda kartani yopish; ombor, quvvat va muddatni o'yinchilar panelida ko'rsatish.
- S kvadrantidagi biznes egasi o'z navbatida zar tashlashdan oldin menejer yollashi mumkin. Narx mavjud `managerCost` qoidasidan olinadi; yetarli aktiv bilan B ga o'tish tekshiriladi. Takroriy yollash rad etiladi. Yangi xonalar avvalgidek E kvadrantidan boshlanadi.
- Smoke tekshiruv: haqiqiy zar bilan hodisaga tushish, navbat avtorizatsiyasi, eskirgan ID, noto'g'ri tanlov, takroriy topshirish, timeout, ombor/naqd, publicState va S→B menejer yo'li. Brauzer testi WebSocket mock orqali qaror yuborish va panel yopilishini tekshiradi; haqiqiy production WebSocket sinovi emas.
- Avval qayd etilgan onlayn biznes kartalarini chiqarib tashlash cheklovi shu kodda yopildi. Boshqa eski tanlovli hodisalar hali alohida; production'da ishlashi uchun frontend va Worker birgalikda yangilanishi kerak. Hozir merge/deploy yo'q.

## Biznes operatsiyalari — 2026-09-07

- `business.ts`, `business-events.ts`: qo'shimcha buyurtma → zaxira → topshirish zanjiri; faol buyurtma keyingi hodisada ustuvor. 20 birlik uchun 2 mln zaxira xaridi, 3,6 mln tushum; 3 oy muddat. Bazaviy oylik biznes faoliyatidan alohida, xizmatlar uchun birlik material/ish paketi sifatida talqin qilinadi.
- Xodim: 1 mln bir martalik xarajat, 1 mln doimiy oylik maosh, +10 quvvat; ko'pi bilan 5 qo'shimcha xodim. Uskuna: 5 mln naqd aktivga aylanadi, +10 quvvat, jami maksimal 100. Xodim/uskuna avtomatik daromad bermaydi.
- Ombor zaxirasi aktiv qiymatiga kiradi, topshirishda uning tannarxi aktiv qiymatidan chiqadi; naqd ikki marta yechilmaydi. Bekor qilish/muddat tugashida zaxira saqlanadi. Biznes sotilsa unga bog'liq buyurtma ham aktiv bilan ketadi; alohida yashirin to'lov yo'q.
- Yangi oyda quvvat tiklanadi, buyurtma muddati kamayadi. Biznes to'xtaganda topshirish bloklanadi. Naqd yetishmasa qarz avtomatik olinmaydi va qisman o'zgarish bo'lmaydi.
- `StatementPanel`: ochiladigan biznes tafsilotida zaxira, qolgan quvvat va buyurtma muddati. Boshqaruv hozir hodisa kartalari orqali, erkin alohida boshqaruv oynasi emas. Bir vaqtda bir biznes buyurtmasi ustuvor; ko'p biznesli buyurtma tanlash hali yo'q.
- Botlar buyurtma uchun zaxira mablag'ini tekshiradi, buyurtmasiz uskunani rad etadi. Eski saqlovlar o'zgarishsiz ochiladi; yangi operatsion maydonlar chegaralar bo'yicha tekshiriladi.
- Tekshiruvlar: maosh, quvvat, ombor, topshirishni takrorlash, expiry, no-op xatolar, save roundtrip va 1 000 buyurtmali arifmetik simulyatsiya. Bu simulyatsiya barcha kvadrantlarning umumiy o'yin balansini isbotlamaydi.
- Production merge va backend deploy bajarilmaydi; GitHub PR #15 ichida saqlanadi.

## Bajarilgan

- `workers/src/auth.ts`, `mail.ts`, `src/pages/AccountHelp.tsx`: email tasdiqlash va parol tiklash API hamda `/hisob` sahifasi. 256-bit tasodifiy tokenlar faqat SHA-256 hash sifatida saqlanadi; vaqt va revision tekshiruvi bir martalik ishlatishni ta’minlaydi. Parol o‘zgarsa sessiya versiyasi oshadi. Hisob mavjudligi bo‘yicha bir xil javob, IP/email urinish limiti, fon jo‘natish va maxfiy ma’lumotlarsiz xato logi qo‘llanadi. Workerd testida provider to‘liq mock qilinadi: expiry, purpose ajratish, parallel iste’mol, eski JWT bekor bo‘lishi va jo‘natish xatosi tekshirilgan.

- `workers/src/leaderboard.ts`: teskari vaqt kaliti bo‘yicha KV indeksi. Yoqilganda ommaviy reyting bir list va ko‘pi bilan 50 get bajaradi; arxiv hajmiga bog‘liq to‘liq skan yo‘q. Yangi natija eski kalitga ham, indeksga ham yoziladi; ikkala yozuv muvaffaqiyatli bo‘lmaguncha xona natijani tugallangan deb belgilamaydi. Admin migratsiyasi 50 yozuvli sahifalar va cursor bilan davom etadi. Muddati o‘tgan natijalar qayta tiriltirilmaydi; JSON buzilgan yozuvlar sanaladi. KV eventual consistency saqlanadi: yangi natija darhol ko‘rinishi kafolatlanmaydi.

- `workers/src/UserAccount.ts`: hisoblar email bo‘yicha Durable Object orqali o‘qiladi va versiya sharti bilan atomar saqlanadi. Parallel ro‘yxatdan o‘tishdan biri 409 oladi; eski profil yozuvi yangi bloklash holatini bosmaydi. KV birinchi import manbasi va admin katalogi bo‘lib qoladi; katalog yozuvi alarm bilan qayta uriniladi. Haqiqiy workerd testida parallel yaratish, eski yozuvni rad etish, blokning darhol kuchga kirishi va importdan keyin KV yozuvi asosiy hisobni almashtirmasligi tekshirildi. Production migratsiya hali bajarilmagan.

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
4. Admin huquqi kerak bo‘lsa, shaxsni tashqi ishonchli usulda tasdiqlab, importdan OLDIN KV foydalanuvchisiga `role: admin`, `adminGrantedAt` vaqtini va `ADMIN_EMAILS` allowlistini operator o‘rnatadi. Importdan keyin KV’ni tahrirlash hisob huquqini o‘zgartirmaydi; asosiy yozuv Durable Object’da. Email yozishning o‘zi tasdiq emas.
5. Eski JWTlar yangilangan serverda qabul qilinmaydi — qayta kirish kerak. Eski oddiy matnli xona tokenlari ham mijozda tiklanmaydi.
6. Deploydan oldin stagingda parol hashining Worker CPU budjetiga sig‘ishi, haqiqiy KV/migratsiya va ikki brauzer multiplayer oqimini tekshiring. Node mock testi haqiqiy Cloudflare integratsiya testi emas.
7. `USER_ACCOUNT` bindingi va `v3-accounts` migratsiyasini birga chiqaring. Eski serverda hisob yozishlarini to‘xtatib, KV hisoblarining to‘liq zaxirasini oling; importlarni shu zaxira bilan tekshiring. KV eventual consistency sababli tekshirilmagan bo‘sh o‘qishni yangi email deb qabul qilish mumkin emas. `ACCOUNT_REGISTRATION_ENABLED` sukutda o‘chiq: faqat hisoblar to‘liq ko‘chirilgani tekshirilgach `true` qiling. Import mavjud parol, profil, rol va sessiya versiyasini saqlaydi. Yangi kod ishlagach eski KV-only serverga oddiy rollback qilmang: avval asosiy hisoblarning yangi zaxirasini eksport qilish kerak.

8. Reyting: yangi Worker chiqarilgach admin tokeni bilan `POST /api/admin/leaderboard/migrate` ga avval `{}`, keyin qaytgan cursor bilan `{"cursor":"..."}` yuboring. `cursor: null` bo‘lguncha davom eting. `invalid` noldan katta bo‘lsa manba yozuvlarini tekshiring; o‘zboshimchalik bilan o‘chirmang. Eski va yangi natijalarni solishtirib, KV yozuvlarining tarqalishini kutgach `LEADERBOARD_INDEX_READY=true` qiling. Bungacha eski o‘qish yo‘li ishlaydi. Xatoda ayni sahifani takrorlash xavfsiz; eski yozuvlar o‘chirilmaydi. Favqulodda holatda flagni o‘chirib eski o‘qishga qaytish mumkin.

## Hali yakunlangan deb hisoblanmaydigan ishlar

- Haqiqiy qurilmada vizual/E2E, screen reader va Core Web Vitals o‘lchovlari.
- Cloudflare hisobiga kirish va haqiqiy bindinglarsiz backend production deploy.
- Email tasdiqlash/parolni tiklash kodi tayyor; haqiqiy jo‘natuvchi domen, Resend siri va PUBLIC_APP_URL sozlanishi, yetkazib berish tekshiruvi deploy bosqichida qolgan. Kuchli izchil hisob omborining kodi va mahalliy integratsiya testi tayyor, ammo haqiqiy hisoblarni ko‘chirish va production cutover ochiq.
- Reyting indeksining kodi va ko‘chirish API tayyor; haqiqiy natijalarni ko‘chirish, tekshirish va indeksni production’da yoqish deploy bosqichida qolmoqda.
- Sohalar bo‘yicha to‘liq biznes simulyatsiyasi, hamkorlik va boshqa uzoq muddatli mahsulot takliflari. Ushbu tuzatishlar ularning to‘liq realizatsiyasi emas.

## Tekshirish

`app` ichida: `npm ci`, `npm ci --prefix workers`, `npm run lint`, `npm run build`, `npm run check:game-core`, `npm run smoke`, `npm audit --audit-level=high`.

`app/workers` ichida: `npm ci`, `npx tsc --noEmit`, `npm audit --audit-level=high`. Deploy uchun to‘liq repozitoriy kerak: Worker umumiy `app/src/lib/game` manbasini import qiladi.
# Biznes modeli: keyingi bosqich (2026-09-07)

- B kvadrantining boshlang'ich biznesi 10 kasb sohasiga mos nom, xodimlar va aktiv tegiga ega.
- Balans saqlandi: tushum 30 mln, operatsion xarajat 16 mln, bazaviy sof foyda 14 mln. Bu real bozor prognozi emas.
- Biznes kartasida maosh, ijara, ta'minot, marketing va boshqa xarajatlar alohida ochiladi. Eski saqlovlarda tafsilotlar bo'lmasa, uydirma taqsimot ko'rsatilmaydi.
- Filial krediti endi naqd bonus va vaqtinchalik ustama emas: 80 mln kredit to'liq 80 mln filial aktiviga sarflanadi. Filial tushumi 18 mln, xarajati 12 mln; kredit to'lovi alohida. Aktiv odatdagi bozor/xavf/sotish mexanizmlariga bo'ysunadi.
- Ta'lim, transport va onlayn biznes uchun teg hamda B kvadranti bilan cheklangan hodisalar qo'shildi.
- Regressiya testi: kasblar, xarajatlar yig'indisi, filialning naqd/aktiv/qarz izchilligi va hodisa cheklovlari.
- Keyingi operatsion bosqich yuqorida: xodim, zaxira, quvvat va buyurtma zanjiri qo'shildi. Hali barcha sohalar uchun alohida zanjirlar, ko'p biznesni qo'lda tanlash va to'liq o'yin balansining uzoq simulyatsiyasi qolgan. Ushbu bosqich to'liq audit yakunlandi degani emas.
- Backend deploy keyinga qoldirilgan. Onlayn o'yinda yangi qoidalar Worker ham yangilangandan keyingina ishlaydi.
