# OQIM Hayot — noldan yangi o‘yin

`/hayot` klassik o‘yinning dizayn rejimi emas. Yangi ma’lumotlar, sof reducer, iqtisodiy hisoblar, voqealar, maqsad va interfeys mustaqil yozilgan. Klassik `/game` va `/game-city` fayllari tahrirlanmaydi. Faqat React ilova qobig‘i, dialog komponenti, hosting va mos rasmlar qayta ishlatiladi.

## O‘yin

- Uch boshlanish: yollanma ishchi, mustaqil mutaxassis, biznes egasi.
- Xarita: uy, ish, bozor, nonvoyxona, dizayn studiyasi, bank, bilim markazi. Zar yoki katak yo‘lagi yo‘q.
- Bir oy 4 ta harakat. Hodisa qarori alohida harakat sarflamaydi. Oy yakuni bir marta o‘tkaziladi.
- Savdo, ishlab chiqarish va xizmatning quvvati, birlik narxi, o‘zgaruvchan tannarxi, ijara va maoshi turlicha.
- Kengaytirish quvvat va maosh fondini oshiradi; reklama faqat joriy oyni ta’sirlantiradi; kurs samaradorlik yaxshilanishini ochadi.
- Boshqaruvchisiz biznes foydasi passiv hisoblanmaydi. Boshqaruvchi maoshi foydadan ayriladi.
- Kredit tushumi daromadga kirmaydi. 12 oy, qoldiq qarzga 2% oylik foiz, kamayuvchi to‘lovlar.
- G‘alaba: passiv sof daromad yashash va kredit to‘lovini qoplaydi, 3 oylik zaxira bor, ketma-ket 3 oy shu shart saqlanadi.
- Naqd oy yakunida manfiy bo‘lsa o‘yin tugaydi; oldindan hisoblash va tasdiqlash mavjud.

## Saqlash va chegaralar

`oqim-life-independent-v1` alohida localStorage kaliti. Eski o‘yin saqlanmasi o‘qilmaydi yoki ko‘chirilmaydi. Brauzer xotirasi xatosi foydalanuvchiga aytiladi. Bir qurilmali yakka o‘yin; serverli multiplayer emas.

Narxlar o‘quv uchun taxminiy kalibrlangan, jonli bozor ko‘rsatkichi emas. Model solig‘i, debitorlik, kreditorlik, ombor tannarxi, inflyatsiya va buxgalteriya amortizatsiyasi hisoblanadi. QQS, jismoniy uskuna nosozligi modeli va real bank stavkalari yo‘q. Model taxminlari EXPANSION_PLAN.md da ko‘rsatilgan. 36 tur hodisa va 9 biznes modeli bor; eski o‘yinning butun kartalar katalogi avtomatik ko‘chirilmagan.

Art: `/life-city.webp` yangi 2.5D shaharcha xaritasi. Mavjud avatarlar va mavzuli sahnalar qayta ishlatilgan. Xaritadagi belgilar real o‘yin joylari va aktiv egaligini ko‘rsatadi.

## Tekshiruv

`scripts/smoke-life.ts`: pul hisoblari, kredit, passiv foyda, eski holatni o‘zgartirmaslik, uch karyerada 12 oy, g‘alaba/mag‘lubiyat, buzilgan save.
`e2e/life.spec.ts`: haqiqiy UI bilan oy yakuni, voqea, menejer, hisobot, qayta ochish, eski save saqlanishi va xarita yuklanishi.

## Kengaytirilgan boshqaruv
Qahramon 4×4 sprite atlas bilan yo‘l grafigi bo‘ylab yuradi. Masshtab 100–180%; yaqinlashtirganda xaritani barmoq/sichqoncha bilan surish mumkin. Animatsiyani kamaytirish mavjud. Bino tanlash vaqt yoki pul sarflamaydi. Xarita hali fon rasmidir; barcha binolar jonlantirilgan deb hisoblanmasin.

## Hisoblash manbasi va chegara
Foyda va pul oqimini ajratish uchun naqd bo‘lmagan xarajatlar hamda aylanma mablag‘ o‘zgarishi hisobga olinadi. Bu tamoyil [IFRS Foundation IAS 7 sharhi](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) bilan solishtirildi; o‘yin IFRS yoki O‘zbekiston soliq hisobotiga to‘liq mos deb da’vo qilinmaydi. Model stavkalari qonuniy stavkalar emas.

## Sprite manbasi
`public/life-walker.webp`: built-in Imagegen, 4×4 shaffof yurish atlas. Prompt: same Uzbek young adult in teal jacket, cream shirt, navy trousers; 4 walking frames per row, four diagonal orientations, isometric 2.5D, aligned feet, no text/background. PNG manba WebP ga kodlangan; qatorlar kamera yo‘nalishiga moslab ishlatiladi.

## Ichki sahnalar (keyingi bosqich)
9 biznes uchun alohida izometrik ichki tasvir va uch bosqichli interaktiv jarayon qo‘shildi. `BusinessInterior.tsx` joriy state va `economics`dan prognoz oladi; ko‘rik pul, hafta yoki save ni o‘zgartirmaydi. Egalik qilinmagan biznes faqat taxminiy ko‘rik sifatida belgilanadi. Animatsiya foydalanuvchi tomonidan yoqiladi/to‘xtatiladi; reduced-motion yoqilganda qo‘lda bosqich tanlanadi. Animatsiya jarayon ko‘rsatkichlarini almashtiradi, rasmdagi odamlar va uskunalar hozircha alohida skelet animatsiyasiga ega emas.

Asset: `app/public/life-interiors.webp`, built-in image generation. Prompt: square 3×3 atlas, nine independent isometric cutaway interiors in order grocery/clothing/ecommerce, bakery/furniture/dairy, design/carwash/barber; Uzbek contemporary setting, teal/amber/wood palette, workers and recognizable equipment, no text or UI. Original generated PNG preserved; atlas encoded WebP and displayed by CSS crop.
