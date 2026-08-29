# YO'NALISH HUJJATI — OQIM v7 (professional audit asosida)

Sana: 2026-08-24. Asos: 2 parallel audit (moliyaviy verifier 63 tekshiruv + game-design reviewer).

## 1. BREND QARORI

**Yangi nom: OQIM** — tagline: «Moliyaviy erkinlik o'yini» / «Aylanadan chiq».
Sabablar: «OQIM» qisqa, o'zbekcha, naqd oqim mohiyatini beradi, esda qolinadigan.
Kengaytirilgan nom: **OQIM — Erkinlik Yo'li**.
Bajariladi: Stage C'da (title, logo, strings, home, footer, save key migratsiyasi).

## 2. KRITIK FIX'LAR (Stage A — birinchi)

| # | Muammo | Yechim |
|---|--------|--------|
| A1 | Avans+payday = 130% maosh | `avansTakenThisMonth` flag; payday 70% to'laydi agar avans olingan bo'lsa; oy tugaganda reset |
| A2 | 0-xarajat exploit | custom personaj: min xarajat = maosh × 30%; escape'da `totalExpenses > 0` sharti |
| A3 | Aktiv narxlar statik | har AssetKind uchun oylik bozor indeksi (drift ±3–8%/oy); statement'da bozor qiymati + trend |
| A4 | Istalgan payt sotish yo'q | "Sotish" tugmasi: narx = bozor × resalePercent × likvidlik chegirmasi (liquidity 1→−20%, 4–5→−3%) |
| A5 | Kredit boshqaruvi yo'q | qisman yopish / to'liq yopish / grafik bo'yicha — statement kredit qatorida tugmalar |
| A6 | Doodad binar | "Keyinroq olaman" — istaklar ro'yxati, 3 oy ichida qaytadi, narx +12%, limit 2 marta |
| A7 | Lifestyle inflation yo'q | maosh oshganda xarajatlar +40% o'sishdan; FI: passiv ≥ 1.2 × xarajatlar (2 payday streak saqlanadi) |

## 3. TIZIM CHUQURLASHTIRISH (Stage B)

| # | Tizim | Dizayn |
|---|-------|--------|
| B1 | Kvadrant progressiyasi E→S→B→I | sakrash taqiqlangan; har o'tish shartli (S: 1 biznes aktiv + bilim 2; B: 2+ aktiv + menejer yollash; I: portfel 100mln+) |
| B2 | S/B mijozlar tizimi | `clients: Client[]` (nomi, oylik to'lov, sadoqat); hodisalar mijoz qo'shadi/olib qochadi; B: menejer yollash bandlik cheklovini oladi |
| B3 | Bilim darajasi (1–5) | ta'lim hodisalari/bitimlar bilim beradi; big deals `minKnowledge` talab qiladi; UI'da bilim chip'i |
| B4 | Cobalt/Gentra bankrotligi | `canDecline: true` + arzonroq alternativa (Nexia 65mln) |
| B5 | Maosh o'sishi | har 12 oyda +6% indeksatsiya (E/S); home↔game data sinxroni |
| B6 | Escape balansi | streak 2 saqlanadi, lekin "zaxira 3× xarajat" alternativ sharti qo'shiladi |

## 4. POLISH (Stage C)

- Profil sahifasi: o'yinlar soni, g'alaba %, eng tez escape, achievements, qahramon statistikasi (localStorage `oqim-profile-v1`)
- Rebrending: OQIM (barcha matnlar, title, logo SVG, meta)
- Orzular: upkeep xarajatlari (hovli 2M/oy, mehmonxona aktivga aylanadi, xayriya 3M/oy → reyting buffi); g'alaba = orzu + 3 oy ushlab turish
- Rules sahifasi sinxroni (kvadrant, bilim, mijozlar, sotish)
- Yangi real hodisalar (5–8 ta): bolaning maktab to'lovi, qarindosh to'yi bosimi, valyuta tebranishi, soliq tekshiruvi (B), kredit tarixi yaxshilanishi

## 5. KEYINGI BOSQICHLAR (kelajak, hozir emas)

- Aktiv ROI rebalans (60–110% → 35–60%/yil) — katta balans o'zgarishi, alohida sessiyada foydalanuvchi bilan kelishiladi
- Multiplayer / share-karta
- Backend (hisoblar sinxroni)
