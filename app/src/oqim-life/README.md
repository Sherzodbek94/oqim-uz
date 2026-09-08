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

Narxlar o‘quv uchun taxminiy kalibrlangan, jonli bozor ko‘rsatkichi emas. Soliq, QQS, debitorlik, xomashyo ombori, uskunaning jismoniy amortizatsiyasi va real bank stavkalari alohida simulyatsiya qilinmaydi. Hisoblash oylik pul tushumi/to‘lovi soddalashtirilgan modelidir. 6 tur hodisa va 3 biznes modeli bor; eski o‘yinning butun kartalar katalogi avtomatik ko‘chirilmagan.

Art: `/life-city.webp` yangi 2.5D shaharcha xaritasi. Mavjud avatarlar va mavzuli sahnalar qayta ishlatilgan. Xaritadagi belgilar real o‘yin joylari va aktiv egaligini ko‘rsatadi.

## Tekshiruv

`scripts/smoke-life.ts`: pul hisoblari, kredit, passiv foyda, eski holatni o‘zgartirmaslik, uch karyerada 12 oy, g‘alaba/mag‘lubiyat, buzilgan save.
`e2e/life.spec.ts`: haqiqiy UI bilan oy yakuni, voqea, menejer, hisobot, qayta ochish, eski save saqlanishi va xarita yuklanishi.
