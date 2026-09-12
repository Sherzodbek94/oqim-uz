# OQIM — Dizayn tizimi

> Bu fayl `app/tailwind.config.js` va `app/src/index.css` izohlari havola qiladigan
> hujjat (`design.md §2.1`, `§9.3`, `§9.4`, `§9.9`). Bo'lim raqamlari shu
> havolalarga mos saqlangan — raqamlarni o'zgartirishdan oldin koddagi
> izohlarni ham yangilang.
>
> Hujjat **mavjud** tizimni yozib qo'yadi, yangisini taklif qilmaydi. Haqiqat
> manbasi ikki fayl: `app/tailwind.config.js` (tokenlar) va `app/src/index.css`
> (shkala, komponent klasslari, harakat).

---

## §1 Maqsad

OQIM — o'zbek tilidagi moliyaviy savodxonlik o'yini (doska + startap rejimi).
Vizual yo'nalish: **issiq krem qog'oz + quyuq siyoh matn + zumrad aksent** —
stol o'yini taktilligi, ekran interfeysi emas.

Tizim ikki qatlamdan iborat:

| Qatlam | Manba | Holati |
|---|---|---|
| OQIM tokenlari (`sand`, `ink`, `emerald`, `clay`, `gold`, `sky`, `cell`) | `tailwind.config.js` | **Asosiy** — ishlatiladi |
| shadcn/ui HSL o'zgaruvchilari (`--background`, `--primary`, …) | `src/index.css` `:root` | Qoldiq — §10.2 ga qarang |

Yangi kod **faqat OQIM tokenlarini** ishlatadi.

---

## §2 Asoslar

### §2.1 Rang tokenlari

`tailwind.config.js` → `theme.extend.colors`.

**Fonlar — `sand`**

| Token | Hex | Qo'llanishi |
|---|---|---|
| `sand-50` | `#FBF8F2` | Sahifa foni (`body`) |
| `sand-100` | `#F4EEE1` | Ikkilamchi sirt, `btn-ghost` hover |
| `sand-200` | `#EAE1CF` | Chegaralar, faol bo'lmagan holat |

**Matn — `ink`**

| Token | Hex | Kontrast (krem fonda) | Qo'llanishi |
|---|---|---|---|
| `ink-900` | `#1E2D2A` | — | Sarlavhalar, asosiy matn |
| `ink-600` | `#51635D` | 6.02 | Tana matni (`body` default) |
| `ink-400` | `#5C6E67` | 5.10 | So'nuq matn, uchinchi pog'ona |

`ink-400` ilgari `#8A9992` edi va krem fonda atigi **2.81** berardi — WCAG AA
bu o'lchamdagi matndan 4.5 talab qiladi. Token 171 joyda ishlatilgani uchun
tuzatish tokenning o'zida qilindi, yangi pog'ona qo'shilmadi. Yangi qiymat
o'lchangan hamma fonda o'tadi: oq 5.45, `#FBF8F2` 5.10, `#F4EEE1` 4.68,
`#EFF6F1` 4.93. Yagona istisno `sand-200` (4.17) — u yerdagi hamma tugun
faol emas, WCAG esa faol bo'lmagan boshqaruvdan kontrast talab qilmaydi.

**Aksentlar**

| Guruh | Tokenlar | Rol |
|---|---|---|
| `emerald` | 700 `#24604A` · 600 `#2E7D5F` · 100 `#DDEEE3` · 50 `#EFF6F1` | Asosiy harakat, muvaffaqiyat |
| `clay` | 700 `#9A4729` · 600 `#B45A38` · 500 `#C9744C` · 100 `#F6E4D7` | Xavf, xarajat |
| `gold` | 700 `#8A6314` · 600 `#B98428` · 500 `#D9A441` · 100 `#F7ECD2` | Pul, mukofot |
| `sky` | 700 `#335E70` · 600 `#41788F` · 100 `#DCEAF0` | Ma'lumot, bozor |

**`700` pog'onalari kichik matn uchun.** `clay-600` krem fonda 4.44,
`clay-100` fonida 3.81 — AA dan o'tmaydi; `clay-700` ikkalasida ham o'tadi
(5.99 / 5.14). Xuddi shu sabab `gold-700` uchun: `gold-600` krem fonda 3.09,
`gold-700` esa to'rtta och fonda 4.61–5.42.

**Doska katakchalari — `cell`**

`opportunity` `#2E7D5F` · `market` `#41788F` · `event` `#7A5CA8` ·
`charity` `#C9744C` · `doodad` `#C24E4E` · `payday` `#D9A441` ·
`baby` `#7FA05A` · `downsized` `#5A6B70`

### §2.2 Kontrast siyosati

1. Matn ustida turadigan **har bir fon o'lchanadi**, taxmin qilinmaydi — rang
   DOM tugunining ortidan piksel bo'yicha olinadi.
2. Kichik matn uchun AA (4.5:1) majburiy. Ikonka va chegara uchun 3:1.
3. Faol bo'lmagan boshqaruvdan kontrast talab qilinmaydi (WCAG 1.4.3 istisnosi).
4. Gradientlar **eng quyuq uchi** bo'yicha o'lchanadi, o'rtasi bo'yicha emas.
   `gradient-gold` ning quyuq uchi shu sababdan `#B98428` dan `#BE8B2C` ga
   yoritildi: e'lon qilingan uchda `ink-900` 4.37 berardi, yangisida eng yomon
   holat ham 4.73. `e2e/startup.spec.ts` shuni tekshiradi.

### §2.3 Tipografiya

**Shriftlar** (`theme.extend.fontFamily`):

| Rol | Klass | Stek |
|---|---|---|
| Display | `font-display` | Bricolage Grotesque → ui-sans-serif |
| Tana | `font-sans` | Inter → ui-sans-serif |
| Raqam / pul | `font-money` | JetBrains Mono, `tabular-nums` |

**Shkala** — `index.css` `@layer utilities`. Tailwind `fontSize` kengaytirilmagan;
shkala nomlangan utilitalar orqali beriladi.

| Utilita | Mobil | ≥768px | Qo'llanishi |
|---|---|---|---|
| `.text-display-xl` | 40 / 44 | 64 / 68 | Sahifa qahramoni |
| `.text-display-lg` | 34 / 38 | 48 / 52 | Bo'lim qahramoni |
| `.text-h2` | 28 / 34 | 36 / 42 | Bo'lim sarlavhasi |
| `.text-h3` | 24 / 30 | — | Kichik bo'lim |
| `.text-h4` | 18 / 26 | — | Karta sarlavhasi (`font-sans`) |
| `.text-body-sm` | 14 / 22 | — | Ikkilamchi tana matni |
| `.text-caption` | 12 / 16 | — | Yorliq, `uppercase`, `0.04em` |
| `.text-money-lg` | 28 / 34 | — | Asosiy summa |
| `.text-money` | 16 / 24 | — | Summa |
| `.text-money-sm` | 13 / 18 | — | Jadvaldagi summa |

**Shkalaning pasti 12px.** Undan kichik o'lcham shkalada yo'q — §10.1 ga qarang.

`h1, h2, h3` global holda `font-display text-ink-900` oladi (`@layer base`).

### §2.4 Bo'shliq

Tailwind standart shkalasi (`0.25rem` qadam) o'zgartirilmagan va ilova bo'ylab
unga amal qilinadi — butun `src/` da faqat 3 ta ixtiyoriy qiymat bor. Yangi kod
ham shkalada qolishi kerak.

### §2.5 Radius va soya

`--radius: 0.625rem`. Komponentlarda `rounded-full` (tugma, chip) va
`rounded-2xl` (karta) ishlatiladi.

| Soya | Qo'llanishi |
|---|---|
| `shadow-card` | Tinch holatdagi karta |
| `shadow-lift` | Hover — `-translate-y-0.5` bilan birga |
| `shadow-modal` | Modal |
| `shadow-token` | O'yin toshi (ichki `inset` bilan) |

---

## §3 Harakat

**Easing:** `ease-out-expo` `cubic-bezier(0.22, 1, 0.36, 1)` — interfeys uchun;
`ease-piece-bounce` `cubic-bezier(0.34, 1.56, 0.64, 1)` — o'yin toshi uchun.

**Nomlangan animatsiyalar** (`index.css`): `animate-die-tumble`,
`animate-die-idle`, `animate-gauge-pulse`, `animate-marquee`,
`animate-marquee-reverse`, `animate-pattern-pan`, `animate-btn-pulse`.

**Harakatni kamaytirish** global hal qilingan (`index.css`, `prefers-reduced-motion`):
`animation-duration: 0.01ms`, iteratsiya 1, `transition-duration: 0.15s`,
`scroll-behavior: auto`. Ofis personaji sprite'i (`.oq-actor-work`,
`steps(16, jump-none)`) shu blok bilan birinchi kadrda to'xtaydi.

---

## §4 Responsiv

- Tailwind standart nuqtalari. Amalda `sm:`/`md:`/`lg:` ishlatiladi (`xl:` — 1 marta).
- Doska **konteyner so'rovi** bilan qayta tuziladi: `@container (min-width: 600px)`
  da boshqaruvlar doska ustiga `absolute` joylashadi, mobil status yashiriladi.
- `≥1024px` da doska balandlikka bog'lanadi: `width: min(100%, calc(100dvh - 116px))`,
  `max-width: 920px` — kvadrat doska sahifani gorizontal toshirmasligi uchun.

---

## §5 Dark mode — AMALGA OSHIRILMAGAN

`tailwind.config.js` da `darkMode: ["class"]` e'lon qilingan, lekin:

- `index.css` da `.dark` token bloki **yo'q**;
- `src/` dagi 146 faylda `dark:` varianti **0 marta** uchraydi.

Palitra butunlay och (krem/qum). Dark mode — **yangi ish**, kalit emas. Uni
qilishdan oldin: `ink` pog'onalari teskari fonda qaytadan o'lchanishi kerak,
`sand` fonlari o'rnini bosadigan quyuq sirtlar aniqlanishi kerak, gradientlar
qayta ko'rilishi kerak. Rejalashtirilmaguncha `darkMode` e'lonini olib tashlash
ham to'g'ri variant — hozir u mavjud bo'lmagan imkoniyatni va'da qiladi.

---

## §9 Komponentlar

§9.3, §9.4, §9.9 — `index.css` `@layer components` dagi CSS klasslari
(kod izohlari shu raqamlarga havola qiladi). Qolganlari — React komponentlari.

### §9.1 Layout va Footer
`components/Layout.tsx`, `components/Footer.tsx`.

### §9.2 Navbar
`components/Navbar.tsx`.

### §9.3 Tugmalar

| Klass | Ko'rinishi |
|---|---|
| `.btn-primary` | `bg-gradient-emerald`, oq matn, `shadow-card` |
| `.btn-gold` | `bg-gradient-gold`, `text-ink-900` |
| `.btn-secondary` | Oq fon, `border-ink-900/10`; hover'da `emerald-600` |
| `.btn-ghost` | Fonsiz, `text-ink-600`; hover'da `bg-sand-100` |
| `.btn-danger` | `bg-clay-500`; hover'da `clay-600` |

Umumiy: `rounded-full`, `px-6 py-3` (ghost — `px-4 py-2`), `text-sm font-semibold`,
`ease-out-expo 200ms`, hover `-translate-y-0.5` + `shadow-lift`,
active `scale-[0.97]`.

### §9.4 Kartalar

| Klass | Ko'rinishi | Holati |
|---|---|---|
| `.card` | `rounded-2xl border-sand-200 bg-white p-6 shadow-card` | **Ishlatilmaydi** — §10.3 |
| `.card-game-piece` | `.card` + `shadow-token` + `overflow-hidden` | 4 joyda |
| `.card-stat` | `.card`, lekin `p-4` | 11 joyda |

### §9.5 Modal va overlay
`pages/game/CardModals.tsx`, `pages/game/Overlays.tsx`. `shadow-modal`.

### §9.6 Doska
`pages/game/Board.tsx`, `PathBoard.tsx`, `PlanBoard.tsx`. Katakcha ranglari — `cell.*` (§2.1).

### §9.7 O'yinchi toshi va zar
`components/PlayerToken.tsx`, `components/Dice.tsx`. `shadow-token`, `animate-die-*`.

### §9.8 Oqim ko'rsatkichi va pul
`components/OqimGauge.tsx` (`animate-gauge-pulse`), `components/MoneyDisplay.tsx` (`font-money`).

### §9.9 Chiplar

`.chip` — `inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase
tracking-[0.04em]`. Rangni chaqiruvchi beradi (`bg-emerald-100 text-emerald-700` kabi).

### §9.10 Bildirishnoma va xato
`components/Notifications.tsx`, `components/ErrorBoundary.tsx`.

---

## §10 Ma'lum qarzlar

### §10.1 Shkaladan tashqari shrift o'lchamlari
`src/` da **141 ta** `text-[Npx]` bor; shundan **98 tasi 9–11px** — ya'ni
shkalaning 12px poliga tushmaydi (`text-[11px]` 53, `text-[10px]` 39,
`text-[9px]` 6). Bir qismi mavjud pog'onalarni takrorlaydi: `text-[12px]` =
`.text-caption`, `text-[13px]` = `.text-money-sm`, `text-[14px]` = `.text-body-sm`,
`text-[16px]` = `.text-money`.

Bu kontrast ishiga zid ishlaydi: nisbatlar o'qilishi uchun hisoblangan, so'ng
matn 9px da chiqariladi. Yo'l: takrorlanganlarni utilitaga ko'chirish, 9–11px
uchun esa shkalaga ataylab `.text-micro` (11/14) qo'shib, undan pastini
taqiqlash.

### §10.2 Ikkita parallel token lug'ati
`:root` dagi shadcn HSL o'zgaruvchilari OQIM tokenlari bilan bir xil tushunchani
ikki marta ta'riflaydi — `--primary: 158 46% 34%` ≈ `emerald-600` `#2E7D5F`.
Brend yashilini o'zgartirish ikki joyni tahrir qilishni talab qiladi.
`--sidebar-*` (8 o'zgaruvchi + 8 Tailwind yozuvi) esa hech qachon
chaqirilmaydigan primitiv uchun turadi.

### §10.3 O'lik komponent yuzasi
`components/ui/` da **52 primitiv**, `src/` dan **11 tasi** chaqiriladi.
Chaqirilmaydigan 41 tasi orasida `card`, `form`, `table`, `select`, `badge`,
`chart`, `sidebar`, `calendar`, `carousel` bor. `.card` CSS klassi ham
ishlatilmaydi — kartalar joyida yoziladi.

### §10.4 Klass ichidagi xom hex
15 ta `text-[#…]` bor; uchtasi mavjud tokenni aynan takrorlaydi
(`#7A5CA8` = `cell.event`, `#C24E4E` = `cell.doodad`, `#5A6B70` = `cell.downsized`).
`#4E8D7C` esa hech qaysi token manbasida yo'q — hujjatlanmagan yashil.
`src/` da umumiy 194 ta xom hex bor; SVG `fill`/`stroke` uchun bir qismi
o'rinli, lekin ular ham token orqali berilishi kerak.

---

## §11 O'zgartirish tartibi

1. Rangni **faqat** `tailwind.config.js` da o'zgartiring. Agar token 50+ joyda
   bo'lsa, yangi pog'ona qo'shish o'rniga tokenning o'zini tuzatish arzonroq
   (§2.1, `ink-400` misoli).
2. Kontrastni o'zgartirgandan keyin haqiqiy fonlarni qayta o'lchang va
   `e2e/` dagi tekshiruvlarni yuritng.
3. Yangi shrift o'lchami kerak bo'lsa — shkalaga nomlangan utilita qo'shing,
   `text-[Npx]` yozmang.
4. Bu faylni yangilaganda koddagi `design.md §…` havolalarini ham tekshiring.
