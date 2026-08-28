# OQIM — Innovatsion doska konsepsiyalari
*Professional game-design tahlil, 2026-08. Mavzu: zar+katak yurish mexanikasidan zamonaviy alternativlar.*

## Nima uchun zar+katak eskirgan?
Klassik "zar tashla — N katak yur" (Monopoly, 1935) mexanikasida o'yinchi **tanlov qilmaydi** — taqdir hal qiladi. Zamonaviy board-game dizaynining asosiy printsipi: **qiziqarli tanlovlar (interesting decisions)**. Moliyaviy savodxonlik o'yini uchun bu ikki barobar muhim — real hayotda pul "tasodifiy katakda" emas, **bizning tanlovlarimiz natijasida** boshqariladi.

---

## Konsepsiya A — "Shahar xaritasi: erkin yo'l tanlovi" 🗺️
**Rasm:** `assets/concepts/map-free-movement.png`

**Mohiyat:** Doska — Toshkentni eslatuvchi illyustrativ shahar xaritasi. Manzillar (Bank, Universitet, Bozor, Ofis, Birja, Mahalla) yo'llar bilan bog'langan. Zar o'rniga — **oylik vaqt birliklari** (masalan, 20 ta). Harakat har bir yo'l segmenti 1–3 vaqt birligi talab qiladi.

**Qanday o'ynaladi:**
- Oy boshida o'yinchi marshrutini O'ZI rejalashtiradi: "Bu oy Universitetga boraman (bilim +1), keyin Bozorga (bitim izlash)"
- Chorraxada yo'l tanlovi payg'ambar animatsiya bilan ko'rinadi (rasmdagi yashil/oltin strelkalar)
- Har manzil o'z imkoniyatlarini ochadi; uzoq yo'l = qimmat vaqt
- Zar saqlanishi mumkin, lekin faqat "kutilmagan hodisa" uchun, harakat uchun emas

**Ta'limiy kuchi:** vaqt — eng kamlik resurs ekanini o'rgatadi. "Hamma narsaga vaqt yetmaydi — tanla."
**Risolat:** klassik Cashflow ruhidan eng kengaydigan, lekin eng "premium" ko'rinadigan variant.
**Murakkablik:** yuqori (marshrut AI botlar uchun ham kerak).

---

## Konsepsiya B — "Oylik reja: vaqt planneri" 📅
**Rasm:** `assets/concepts/time-planner.png`

**Mohiyat:** Doska = 30 kunlik kalendar (bizda allaqachon oy kalendari bor — tabiiy evolyutsiya!). Har kunning yacheykasiga o'yinchi **harakat plitkalarini** qo'yadi: 💼 Ish, 📚 O'qish, 💰 Investitsiya, ❤️ Oila, 💪 Sog'liq, 🎉 Dam olish.

**Qanday o'ynaladi:**
- Oy boshida o'yinchi oylik rejani tuzadi (drag-and-drop plitkalar)
- Har plitka o'z effektini beradi: Ish → maosh kuni, O'qish → bilim, Investitsiya → bitim imkoniyati
- **Balans mexanikasi:** faqat 💼 qo'ysa — charchoq (samaradorlik −), faqat 🎉 — pul yo'q. Sog'liq plitkasi tashlamasa — kasallik hodisasi ehtimoli oshadi
- Hodisalar rejani "buzadi": to'y taklifi rejalashtirilgan kunga tushib qoladi

**Ta'limiy kuchi:** eng kuchli — real hayotdagi **vaqt boshqaruvi va work-life balance** darsi. Hozirgi 30-katak kalendar mexanikasining mantiqiy davomi.
**Unikal:** moliya o'yinlarida bunday mexanika deyarli yo'q — OQIM uchun differensiator.
**Murakkablik:** o'rta (mavjud kalendar asosida quriladi).

---

## Konsepsiya C — "Yo'l xaritasi: tanlovlar shox-shabbasi" 🌿
**Rasm:** `assets/concepts/node-paths.png`

**Mohiyat:** Slay the Spire uslubidagi roguelite yo'l xaritasi. Oldinda **ko'rinib turgan** 2–3 ta yo'l: yashil (xavfsiz, kichik yutuq), oltin (o'rta), qizil (xavfli, katta yutuq). Tugunlar: bitim, hodisa, xarajat, ta'lim, sovg'a.

**Qanday o'ynaladi:**
- Har navbatda o'yinchi oldidagi 2–3 yo'l tugunidan BIRINI tanlaydi — tasodif yo'q, strategiya bor
- "Tuman" (fog of war) faqat 2–3 qadam oldingani ko'rsatadi
- Qizil yo'l: yirik bitimlar, lekin doodad xavfi yuqori; yashil: sekin, lekin barqaror
- Bilim darajasi tuman radiusini kengaytiradi (bilimli o'yinchi "oldinroq ko'radi" — metafora!)

**Ta'limiy kuchi:** **risk/reward o'qish** — har tanlovning narxi ko'rinadi. "Xavfni ko'ra bilish" — investorning asosiy ko'nikmasi.
**Mobil uchun ideal:** vertikal scroll, bitta barmoq bilan o'ynaladi.
**Murakkablik:** o'rta. Zar butunlay kerak emas.

---

## Konsepsiya D — "Harakat kartalari: hayotiy kun" 🃏
**Rasm:** `assets/concepts/action-cards.png`

**Mohiyat:** Deck-driven o'yin. Doska o'rniga — qahramonning isometrik xonadoni/hayoti. Har kunda qo'ldagi **harakat kartalaridan** o'ynaysan: "Tungi smena" (+pul, −energiya), "Frilans", "Kitob o'qish", "Oila bilan dam olish", "Investitsiya tahlili".

**Qanday o'ynaladi:**
- Energiya ⚡ va Vaqt 🕐 resurslari (rasmdagi chap yuqoridagi barlar)
- Har karta resurs sarflaydi; karta "charchagan" bo'lib, dam olish bilan qayta tiklanadi
- Bilim oshkandan yangi, kuchli kartalar ochiladi (deck-building!)
- Hodisalar qo'lga "vazifa kartasi" qo'shadi

**Ta'limiy kuchi:** kundalik **odatlar** boy olishning asosini tashkil etishini o'rgatadi — eng hayotiy dars.
**Murakkablik:** eng yuqori (to'liq qayta loyiha — yangi o'yin deyarli).

---

## Mening professional tavsiyam

**Gibrid strategiya (2 bosqich):**

1. **Hozir (v16):** Konsepsiya **C** (tanlovlar shox-shabbasi) — hozirgi engine'ga eng yaxshi yotadi: RAT_CELLS → tugunlar ro'yxati, zar → yo'l tanlovi (2-3 variant), kartalar/hodisalar/bitimlar/birja — hammasi saqlanadi. Mobil uchun eng qulay. Bilim = ko'rish radiusi — ajoyib metafora.

2. **Keyin (v17+ katta yangilanish):** Konsepsiya **B** (oylik planner) ni alohida "Reja rejimi" sifatida qo'shish — kalendar allaqachon bor, plitkalar mexanikasi ustiga quriladi. Bu OQIM'ni bozorda noyob qiladi.

**B tavsiya etilmaydi hozir:** A (chiroyli, lekin qimmat + botlar murakkab) va D (to'liq qayta yozuv) — keyingi katta versiyalar uchun zaxira g'oyalar.

Rasmlar: `/mnt/agents/output/assets/concepts/` (map-free-movement.png, time-planner.png, node-paths.png, action-cards.png)
