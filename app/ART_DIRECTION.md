# OQIM — moliyaviy shaharcha

Mavjud voqealar, narxlar, tanlovlar va navbat qoidalarini o‘zgartirmaydigan vizual qatlam.

## Sahnalar

`public/event-scenes.webp`: 4 ustun × 3 qatorli yagona atlas, quyidagi tartibda:

| Qator | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| 1 | Maosh / ish | Bozor | Bank | Biznes |
| 2 | Ta’lim | Oila | Sog‘liq | Ta’mir |
| 3 | Dam olish | Xayriya | Orzu / uy | Ishlab chiqarish |

`public/town-center.webp`: doska markazining bezak manzarasi. Undagi binolar sotib olingan aktivlarni anglatmaydi.

## Qamrov

EventScene.tsx dagi majburiy Record barcha ModalState turlarini qamrab oladi: bitim tanlash, bitim, bozor, hodisa natijasi, dilemma, migratsiya, xayriya, xarajat, farzand, ta’lim, ishdan bo‘shash, dam olish, hayot voqeasi, kredit, birja, FT bitim, FT orzu, FT xayriya, FT ma’lumot va bot xabari. Sarlavha mavzuga aniq mos kelganda sahna tanlanadi, aks holda shu tur uchun umumiy rasm ishlatiladi. Har bir individual voqea uchun alohida rasm yaratilmagan.

Klassik va FT doskalaridagi kataklar rasm bilan bezatilgan. Onlayn rejimdagi mavjud pending qarorlar ham shu atlasdan foydalanadi. Rasmlar dekorativ: ekran o‘quvchisi mavjud sarlavha va tanlovlarni o‘qiydi. Kartadagi rasmlar balandligi cheklangan, tanlovlar vertikal scroll orqali ochiq qoladi. Path/Plan doska geometriyasi o‘zgarmagan.

## Asset yaratish

Built-in Imagegen ishlatildi. PNG manbalaridan WebP formatiga sifat 82 bilan o‘girildi; rasmlar qayta chizilmagan.

Atlas prompt: 4×3 teng sahnali, matnsiz, chegarasiz yagona sprite atlas; premium yorqin 2.5D o‘zbek shaharchasi uslubi; maosh olayotgan xodim, bozor, bank, do‘kon, maktab, chaqaloqli oila, shifokor, to‘q sariq avtomobil ta’miri, piknik, yordam tarqatayotgan ko‘ngillilar, uy kaliti va zavod; bir xil kamera va yorug‘lik, markazdagi subyektlar, sahnalar orasida kesishishsiz.

Markaz prompt: kvadrat 2.5D shaharcha dioramasi, chetlarda uylar/do‘kon/ofis/maktab/bank/daraxtlar/kanal, markazning yarmi sokin och tosh maydon; matnsiz, interfeyssiz, tokensiz va personajsiz; yashil, moviy va issiq to‘q sariq palitra.
