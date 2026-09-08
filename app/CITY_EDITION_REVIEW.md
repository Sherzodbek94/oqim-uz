# Shaharcha versiyasi — o‘yin interfeysi tekshiruvi

Yangi ko‘rinish: `/game-city`. Avvalgi ko‘rinish: `/game`.
Ikkalasi bir o‘yin mexanikasi va saqlangan jarayondan foydalanadi.

## Aniqlangan muammolar va tuzatishlar

- `Game.tsx`: markazdagi boshqaruv shaharcha tasvirini to‘sardi. Yangi versiyada zar, navbat holati va asosiy amal doska ostida joylashadi.
- `game/CardModals.tsx`: hodisa oynasi markazni yopardi. Yangi versiyada katta ekranda qaror oynasi o‘ngga joylashtiriladi; kichik ekran va katta hisobot oynalari moslashuvchan dialogni saqlaydi.
- `index.css`: mayda katak raqamlari va rasmlar raqobatlashardi. Shaharcha versiyasida nomlar ko‘rinadi, ortiqcha raqamlar yashiriladi va sahnalar kattalashtiriladi.
- `App.tsx`: yangi yo‘nalish eski ko‘rinishni almashtirmaydi. Bo‘sh navbat paytida ikki versiya orasida o‘tish mumkin.

## Tekshirish chegarasi

Qo‘lda o‘ynash uchun brauzer ochishga urinish `ERR_BLOCKED_BY_CLIENT` bilan bloklandi. Shu sabab bu hisobot qo‘lda o‘ynab tasdiqlangan audit emas. `e2e/game.spec.ts` yangi versiyani ochish, katak tanlash, kenglikka sig‘ish, eski versiyaga qaytish va haqiqiy saqlangan o‘yinda zar tashlashni avtomatik tekshiradi. CI screenshot artefakti vizual ko‘rib chiqish uchun yoziladi.

## Keyingi takliflar

1. Har bir aktivni xaritadagi alohida binoga bog‘lash: sotib olingan aktiv egaligi va oylik oqimi manzarada ko‘rinsin.
2. Qaror yonida oldin/keyin naqd pul, qarz va oylik oqimni bir xil shaklda ko‘rsatish.
3. Birinchi yurish uchun uch qadamli yo‘riqnoma: zar, katak ma’nosi, qaror natijasi.

Bu versiya mavjud illyustratsiya va qoidalar asosidagi qo‘shimcha prototipdir. To‘liq erkin shaklli 2.5D xarita va har hodisa uchun alohida illyustratsiya hali bajarilmagan.
