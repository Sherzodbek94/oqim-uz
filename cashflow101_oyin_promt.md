# Cashflow101 O'zbekistonga Moslashtirilgan O'yin — Promt

**Siz tajribali o'yin dizayneri va full-stack dasturchisiz. Robert Kiyosakining "Cashflow Quadrant" kitobi va Cashflow 101 stol o'yini asosida, O'zbekiston iqtisodiy sharoitiga to'liq moslashtirilgan moliyaviy savodxonlik o'yinini yaratib bering.**

## 1. O'yin konsepsiyasi

O'yin Cashflow 101 mexanikasini takrorlaydi: o'yinchi "kichik tezkor aylanma" (Rat Race) dan chiqib, "tez yo'l" (Fast Track) ga o'tishi kerak. Buning uchun passiv daromad oylik xarajatlardan oshishi lozim. Lekin butun iqtisodiy muhit, kasblar, investitsiya vositalari va xarajatlar O'zbekiston realiyasi bo'lishi shart.

## 2. O'zbekiston sharoitiga moslashtirish (eng muhim qism)

**Pul birligi:** O'zbek so'mi (UZS). Barcha raqamlar real bozordan olingan miqyosda bo'lsin.

**Kasblar (o'yin boshida tanlanadi), har biri real maosh darajasiga ega:**
- Maktab o'qituvchisi (~3-4 mln so'm)
- Shifokor (~4-5 mln so'm)
- Haydovchi/taksi haydovchisi (~4-6 mln so'm)
- Dasturchi (IT) (~10-20 mln so'm)
- Savdogar/do'kon egasi (~6-12 mln so'm)
- Bank xodimi (~6-9 mln so'm)
- Quruvchi/usta (~5-8 mln so'm)
- Ofitsiant (~3-5 mln so'm)
- Agronom/fermer (~5-10 mln so'm)
- Huquqshunos (~7-12 mln so'm)

**Moliyaviy hisob-kitob jadvali (Financial Statement):**
- Daromad: maosh, passiv daromad (biznes, ijaradan, dividentlar)
- Xarajatlar: kommunal to'lovlar, oziq-ovqat, transport, bolalar ta'limi (o'qish kurslari, repetitor), to'y/oila marosimlari uchun mablag' ("to'y fondi"), kredit to'lovlari, soliqlar
- Aktivlar va Passivlar ro'yxati (Doodads o'rniga): smartfon, avtomobil (Cobalt/Gentra keng tarqalgan), yangi mebel, kiyim-kechak

**Investitsiya imkoniyatlari (O'zbekiston realiyasiga mos):**
- Ko'chmas mulk: Toshkent va viloyatlarda kvartira sotib olib ijara berish; mahallada yer uchastkasi; "yangi qurilish"dan (новостройка) arzon narxda kvartira olib, qurilish tugagach foydaga sotish
- Kichik biznes: choyxona, sartaroshxona, oziq-ovqat do'koni, onlayn do'kon (Telegram/Instagram savdosi), tikuv sexi
- Moliyaviy instrumentlar: bank depoziti (yuqori foiz stavkalari bilan), davlat qimmatli qog'ozlari, IPO (milliy kompaniyalar aksiyalari), valyuta (dollarga investitsiya, so'm kursining tebranishi xavfi bilan)
- Mikrokredit/tovar krediti tizimi va uning yuqori foizlari — xavf sifatida

**Maxsus hodisalar kartalari (O'zbekiston kontekstida):**
- Inflyatsiya oshishi (so'm qadrsizlanishi)
- To'y/tug'ilgan kun taklifi — katta xarajat, rad etsangiz "noodatiy" deb qaralishi mumkin (madaniy element)
- Davlat subsidiyalari va imtiyozli kreditlar (yoshlar uchun ipoteka, tadbirkorlik grantlari)
- Mahalla qo'mitasi yordami, xayriya (sadaqa) imkoniyatlari — bonus sifatida
- Mavsumiy ishlar, mehnat migratsiyasi (xorijga ishlashga ketish — vaqtincha yuqori daromad)
- Elektr/gaz ta'minotidagi uzilishlar (biznesga zarar)

## 3. O'yin mexanikasi

- Zar tashlash, doskada harakatlanish: "Imkoniyat", "Hodisa", "Bozor", "Xayriya" kataklari
- Har bir o'yinchi uchun dinamik moliyaviy balans jadvali avtomatik hisoblanadi
- Passiv daromad ≥ oylik xarajatlar → Rat Race'dan chiqish
- Fast Track bosqichida katta bizneslar: qurilish kompaniyasi, ishlab chiqarish korxonasi, IT-startap, eksport qiluvchi fermer xo'jaligi
- Bankrotlik qoidalari: kreditlarni to'lay olmasa, aktivlarni arzonga sotish
- 2-6 o'yinchi rejimi + kompyuterga qarshi yakkaxon rejim

## 4. Texnik talablar

- **Platforma:** veb-ilova (React + TypeScript, Tailwind CSS, mobil va desktop uchun moslashuvchan dizayn)
- O'yin holati localStorage'da saqlansin, sessiyani davom ettirish imkoniyati bo'lsin
- **Interfeys tili:** o'zbek tili (lotin alifbosi); ixtiyoriy: rus tili almashtirish tugmasi
- Dizayn: zamonaviy, och ranglar, O'zbekiston milliy naqshlari (masalan, suzani uslubidagi bezaklar) bilan boyitilgan, lekin ortiqcha yorqin bo'lmagan palitra
- Ovoz effektlari: zar tashlash, karta ochish, g'alaba ovozlari

## 5. Qo'shimcha funksiyalar

- Har bir investitsiya kartasida qisqa moliyaviy izoh ("Bu investitsiya sizga oylik 1.5 mln so'm passiv daromad keltiradi, lekin boshlang'ich 60 mln so'm kerak")
- O'yin oxirida statistika: necha aylanishda chiqilgan, eng muvaffaqiyatli investitsiya
- O'quv rejimi: yangi boshlanuvchilar uchun moliyaviy tushunchalarni tushuntiruvchi ko'rsatmalar (aktiv vs passiv, passiv daromad nima)
- Natijani ulashish tugmasi (Telegram orqali screenshot/natija ulashish)

## 6. Yakuniy natija

To'liq ishlaydigan veb-ilova kodini yozib bering: o'yin mantiq'i, barcha kartalar ma'lumotlari (kamida 50 ta imkoniyat, 30 ta hodisa, 20 ta bozor kartasi — hammasi o'zbek tilida va O'zbekiston narxlarida), moliyaviy jadval komponenti, zar animatsiyasi va yakuniy ekran.

---

**Ishlatish bo'yicha maslahat:** bu promtni Claude, ChatGPT yoki Kimi kabi sun'iy intellekt dasturlash vositalariga bering. Agar natija to'liq bo'lmasa, promtni bosqichlarga bo'ling: avval o'yin mantiq'ini, keyin dizaynni, so'ng kartalar kontentini alohida so'rang.

---

# QO'SHIMCHA: Kimi Code bilan qurish bo'yicha qo'llanma

## Ishni boshlash tartibi

1. Kompyuteringizda yangi papka yarating va unga kiring:
```bash
mkdir cashflow-uz && cd cashflow-uz
```

2. Kimi Code'ni ishga tushiring:
```bash
kimi
```

3. Avval yuqoridagi ASOSIY promtni to'liq yuboring. Kimi Code loyiha strukturasini o'zi yaratadi.

## Muhim maslahat: bosqichma-bosqich ishlang

Kimi Code'ga hammani bir vaqtda buyurmang. Quyidagi tartibda 6 bosqichda boring — har bosqich tugagach `npm run dev` bilan tekshirib turing:

### Bosqich 1 — Loyiha poydevori
```
Vite + React + TypeScript + Tailwind CSS loyihasini sozla. 
O'yin uchun asosiy ekran: o'yin doskasi (aylana shaklida kataklar), 
zar tashlash tugmasi va moliyaviy jadval paneli. 
Zamonaviy, och ranglar palitrasida, o'zbek tilida interfeys.
```

### Bosqich 2 — O'yin mantiq'i
```
O'yin holati uchun state management qo'sh: o'yinchi tanlagan kasb, 
naqd pul, oylik daromad/xarajatlar, passiv daromad, aktivlar/passivlar ro'yxati.
Zar tashlash va doskada harakatlanish mexanikasini yoz. 
localStorage'da saqlash funksiyasini qo'sh.
```

### Bosqich 3 — Kartalar ma'lumotlari
```
data/cards.ts faylida o'zbek tilida kartalar bazasini yarat:
- 50 ta Imkoniyat kartasi (kichik biznes, ko'chmas mulk, depozit, aksiyalar — O'zbekiston narxlarida)
- 30 ta Hodisa kartasi (inflyatsiya, to'y taklifi, subsidiya, migratsiya va h.k.)
- 20 ta Bozor kartasi (aktivlarni sotish takliflari)
Har kartada: sarlavha, tavsif, narx, oylik passiv daromad, shartlar.
```

### Bosqich 4 — Moliyaviy jadval
```
Cashflow 101 dagi kabi Financial Statement komponentini yarat:
daromad, xarajatlar, passiv daromad, aktivlar, passivlar ustunlari bilan.
Passiv daromad >= xarajatlar bo'lsa, "Rat Race'dan chiqdingiz!" xabari chiqsin.
```

### Bosqich 5 — Fast Track va g'alaba
```
Fast Track bosqichini qo'sh: katta bizneslar (qurilish kompaniyasi, 
IT-startap, eksport fermer xo'jaligi), g'alaba sharti va yakuniy ekran statistikasi.
```

### Bosqich 6 — Chiroyli qilish
```
Dizaynni yaxshila: zar animatsiyasi, karta ochilish effektlari, 
mobil moslashuvchanlik, Telegram orqali natija ulashish tugmasi.
```

## Foydali buyruqlar

- Xato chiqsa: xato matnini Kimi Code'ga ko'chirib yuboring — o'zi tuzatadi
- Oldingi holatga qaytish: `git` bilan commit qilib boring (har bosqichdan keyin)
- Loyihani ko'rish: `npm run dev` → brauzerda `localhost:5173`

## Eslatma

Kimi Code kredit sarflaydi — shuning uchun aniq, qisqa buyruqlar bering va har bosqichda natijani tekshiring. Bitta katta promtdan ko'ra 6 ta kichik bosqich kamroq kredit sarflashi va sifatliroq natija berishi mumkin.
