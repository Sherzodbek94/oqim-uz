# OQIM — Mualliflik loyihasi, jismoniy doska va tarmoq rejimi: Yo'l xaritasi

**Sana:** 2026-yil avgust | **Holat:** raqamli prototip v18 tayyor

---

## 1. MUALLIFLIK HUQUQI VA HUQUQIY HIMOYA

### 1.1. Nima avtomatik himoyalangan
O'zbekiston qonunchiligida (MUq to'g'risidagi qonun) asar yaratilgan zahoti mualliflik huquqi paydo bo'ladi — ro'yxatdan o'tkazish shart emas. Himoyalangan:
- O'yin qoidalari matni, kartalardagi barcha matnlar (bitimlar, hodisalar, darslar)
- Grafik dizayn: doska, logotip, plitkalar, illustratsiyalar
- Dastur kodi (EHM dasturi sifatida)

**Diqqat:** o'yin *mexanikasi* (g'oya) himoyalanmaydi — faqat uning ifodasi (matn, dizayn, kod). Shu sababli brend himoyasi muhimroq.

### 1.2. Rasmiy ro'yxatdan o'tkazish (tavsiya etiladi)
1. **Mualliflik asarini depozit qilish** — Adliya vazirligi huzuridagi Intellektual mulk agentligi (my.gov.uz / ip.uz) orqali. Hujjatlar: ariza, asarning nusxasi (kod + dizayn fayllari + qoidalar PDF), davlat boji (~1 BHM atrofida). Muddat: ~10 ish kuni. Bu sudda isbot bo'ladi.
2. **"OQIM" tovar belgisi** — eng muhim qadam. Nice tasniflagichi bo'yicha:
   - 9-sinf: dasturiy ta'minot, mobil ilovalar
   - 28-sinf: stol o'yinlari
   - 41-sinf: ta'lim xizmatlari
   Xarajat: ~3–5 mln so'm (boj + agent xizmati), muddat: 8–12 oy. Rasman "OQIM™", keyin ®.
3. **Domen va ijtimoiy tarmoqlar** — oqim.uz, barcha platformalarda @oqim ni band qilish (hoziroq!).
4. **Mualliflik belgisi** — har sahifa/karta/qoida kitobida: "© 2026 OQIM. Barcha huquqlar himoyalangan."

---

## 2. JISMONIY DOSKALI O'YIN (real stol usti versiyasi)

### 2.1. Komponentlar (tiraj ~100–500 dona uchun)
| Komponent | Tavsif | Taxminiy narx (1 dona) |
|---|---|---|
| Doska | 50×50 sm, karton 2mm, mat laminatsiya | 25–35 ming so'm |
| 5 karta kolodasi (~200 karta) | Bitimlar, Hodisalar, Xarajatlar, Bilim, Bozor — 300g qog'oz | 30–40 ming so'm |
| O'yinchoqlar + 2 zar | 6 rang | 10–15 ming so'm |
| Moliyaviy hisobot varaqlari bloknoti | 50 varaq (aktiv/passiv jadval) | 8–12 ming so'm |
| Qoida kitobchasi | 16–24 sahifa, rangli | 10–15 ming so'm |
| Quti | qattiq karton, magnet yopish | 20–30 ming so'm |
| **Jami tannarx** | | **~100–150 ming so'm** |
| **Chakana narx** | (2–2.5× marja) | **250–350 ming so'm** |

### 2.2. Ishlab chiqarish bosqichlari
1. **Dizayn fayllarini tayyorlash** (2–3 hafta): CMYK, 300 dpi, 3mm bleed; mavjud raqamli dizayn tizimini (emerald/gold) chopga moslashtirish
2. **Prototip** — mahalliy tipografiyada 5–10 nusxa, oilaviy/do'stlar bilan 5+ o'yin sessiyasi testi
3. **Balans testi** — kartalar qiymatlari jismoniy o'yinga moslashishi kerak (kalkulyatorsiz o'ynaladigan yaxlit sonlar!)
4. **Tiraj** — Toshkent tipografiyalari (100 donadan arzonroq, 500 donadan ~30% tejash)
5. **Sotish kanallari**: kitob do'konlari, maktablar (B2B — moliyaviy savodxonlik darsi!), Telegram, Instagram, OLX, korporativ sovg'alar

### 2.3. Jismoniy versiyaning raqamli ilovadan farqi
- Kartalarda hisoblar yaxlitlanadi (kalkulyator kerak bo'lmasin)
- Hisobot varaqasi qog'ozda — ilovadagi "Moliyaviy holat" panelining analogi
- 3 rejimdan jismoniy uchun "Klassik" eng mosi; "Reja rejimi" maxsus plitkalar to'plami bilan kengaytma sifatida sotilishi mumkin

---

## 3. TARMOQ (ONLAYN) MULTIPLAYER — 4 kishigacha, belgilangan vaqt

### 3.1. Hozirgi holat
Ilova hozir **frontend-only** (localStorage) — faqat bitta qurilmada botlar bilan. Onlayn o'yin uchun backend kerak.

### 3.2. Texnik arxitektura (tavsiya)
| Qatlam | Texnologiya | Vazifa |
|---|---|---|
| Real-time server | Node.js + WebSocket (Socket.io yoki Hono+WS) | Xonalar, navbat sinxronizatsiyasi |
| Ma'lumotlar bazasi | MySQL | Akkauntlar, o'yin tarixi, reyting |
| Xonalar tizimi | 6 xonali kod (masalan "OQIM-7421") | Do'stlar taklif qiladi |
| Navbat taymeri | Server-side, 60–120 soniya tanlanadi | "Belgilangan vaqt" talabi |
| Reconnect | Sessiya tokeni bilan | Internet uzilsa qayta ulanish |

### 3.3. Funksional talablar (foydalanuvchi ssenariysi)
1. O'yinchi "🌐 Onlayn o'yin" → xona yaratadi → kodni do'stlariga yuboradi
2. 2–4 ishtirokchi kiradi, har biri personaj + qiyinlik tanlaydi
3. Xost "Boshlash" bosadi → barcha qurilmalarda sinxron doska
4. Har navbatda taymer — vaqt tugasa avtomatik "O'tkazib yuborish"
5. Yakunda umumiy natijalar jadvali + g'alaba kartasi

### 3.4. Murakkablik bahosi
- **MVP (minimal):** 3–4 hafta ish — xonalar + sinxron navbat + taymer (botlar o'rniga real odamlar). Dvijok (engine.ts) tayyorligi katta ustunlik — faqat "transport qatlam" qo'shiladi.
- **To'liq versiya:** + akkauntlar, reyting, do'stlar ro'yxati, kuzatuvchi rejimi — yana 3–4 hafta.
- Xosting: ~10–20$/oy (kichik VPS yoki managed service).

---

## 4. UMUMIY HARAKAT REJASI (tavsiya etilgan tartib)

| # | Qadam | Muddat | Xarajat |
|---|---|---|---|
| 1 | Domen + ijtimoiy tarmoqlarni band qilish | 1 kun | ~100 ming so'm |
| 2 | "OQIM" tovar belgisiga ariza | 2 hafta (tayyorlash) | ~3–5 mln so'm |
| 3 | Mualliflik depoziti | 2 hafta | ~1 mln so'm |
| 4 | Onlayn multiplayer MVP | 3–4 hafta | rivojlantirish |
| 5 | Jismoniy prototip + test | 1 oy | ~1.5–2 mln so'm |
| 6 | Tiraj (100–500 dona) | 2–3 hafta | 15–60 mln so'm |
| 7 | Maktablar/Telegram marketing | doimiy | byudjetga qarab |

**Strategik maslahat:** avval onlayn multiplayer (4-qadam) — u arzon, tez va mahsulotni "jonli" ko'rsatadi; jismoniy doskani esa buyurtmalar yig'ilgach (oldindan buyurtma kampaniyasi) ishlab chiqaring — kapital xavfi kamayadi.
