/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* OQIM design tokens (design.md §2.1) */
        sand: {
          50: "#FBF8F2",
          100: "#F4EEE1",
          200: "#EAE1CF",
        },
        ink: {
          900: "#1E2D2A",
          600: "#51635D",
          /*
           * 400 — QUYUQLASHTIRILDI (#8A9992 -> #5C6E67).
           *
           * Eskisi krem fonda atigi 2.81 berardi, WCAG AA esa bu o'lchamdagi
           * matndan 4.5 talab qiladi. Bu bitta token emas, ILOVA BO'YLAB
           * nosozlik edi: `text-ink-400` 171 joyda turibdi va axe uni
           * `/startap` ning har bir tab'ida «serious» deb belgilardi —
           * pastki navigatsiyaning uchta faol bo'lmagan yorlig'i, «Prognoz»
           * qatori, «Hozircha yolg'izsiz…» maslahati va boshqalar.
           *
           * Yangisi matn ustida turadigan HAMMA fonda o'tadi. Fonlar taxmin
           * emas — butun ilova bo'ylab O'LCHANDI (har bir `ink-400` tugunining
           * ortidagi rang piksel bo'yicha olindi): oq 5.45, #FBF8F2 5.10,
           * #F4EEE1 4.68, #EFF6F1 4.93, oraliq kremlar (#F5EFE3, #F6F1E6,
           * #F8F5ED) 4.7–5.0.
           *
           * Bitta istisno `sand-200` (#EAE1CF) — 4.17. O'lchov u yerdagi
           * hamma tugun FAOL EMAS ekanini ko'rsatdi: yetib borilmagan sozlash
           * qadamlari (2/3/4), ochilmagan kvadrant nishonlari (S/B/I),
           * o'chirilgan asosiy tugma va uning ikonkasi, «Chiqish shartlari»
           * dagi qulflar. WCAG faol bo'lmagan boshqaruvdan kontrast talab
           * qilmaydi, 3:1 lik ikonka/chegara talabidan esa 4.17 baribir
           * yuqori — va eski 2.29 dan ancha yaxshi.
           *
           * NEGA TOKENNING O'ZI. Ikkinchi yo'l — yangi `ink-500` qo'shib,
           * 146 ta tirik matnni unga ko'chirish edi. Bitta qator o'rniga 146
           * ta tahrir, va `ink-400` kelajakdagi kod uchun tuzoq bo'lib
           * qolardi.
           *
           * NARXI: `ink-600` dan farq qisqardi (6.02 va 5.10). Krem fonda AA
           * so'nuq matnni bundan yorug' qilishga yo'l qo'ymaydi — uchinchi
           * pog'onani saqlashning boshqa usuli yo'q.
           */
          400: "#5C6E67",
        },
        emerald: {
          700: "#24604A",
          600: "#2E7D5F",
          100: "#DDEEE3",
          50: "#EFF6F1",
        },
        clay: {
          /*
           * 700 — KICHIK MATN uchun. 600 (#B45A38) krem fonda 4.44,
           * `clay-100` fonida esa atigi 3.81 beradi; WCAG AA kichik matndan
           * 4.5 talab qiladi. Bu qadam ikkala fonda ham o'tadi (5.99 / 5.14).
           */
          700: "#9A4729",
          600: "#B45A38",
          500: "#C9744C",
          100: "#F6E4D7",
        },
        gold: {
          /*
           * 700 — KICHIK MATN uchun, `clay-700` bilan bir xil sababdan.
           * `gold-600` (#B98428) krem fonda atigi 3.09, oqda 3.28 beradi;
           * WCAG AA kichik matndan 4.5 talab qiladi. Bu qadam to'rtta och
           * fonda ham o'tadi: sand-50 5.11, oq 5.42, sand-100 4.69,
           * gold-100 4.61.
           *
           * `gold-600` o'zi QOLDIRILDI: u yana 55 joyda, ko'pincha fon yoki
           * hover rangi sifatida ishlatiladi va ularning har biri alohida
           * o'lchovni talab qiladi.
           */
          700: "#8A6314",
          600: "#B98428",
          500: "#D9A441",
          100: "#F7ECD2",
        },
        sky: {
          700: "#335E70",
          600: "#41788F",
          100: "#DCEAF0",
        },
        cell: {
          opportunity: "#2E7D5F",
          market: "#41788F",
          event: "#7A5CA8",
          charity: "#C9744C",
          doodad: "#C24E4E",
          payday: "#D9A441",
          baby: "#7FA05A",
          downsized: "#5A6B70",
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,45,42,.05), 0 8px 24px rgba(30,45,42,.07)",
        lift: "0 2px 4px rgba(30,45,42,.06), 0 16px 40px rgba(30,45,42,.12)",
        modal: "0 24px 80px rgba(30,45,42,.22)",
        token: "0 3px 8px rgba(30,45,42,.25), inset 0 -2px 0 rgba(0,0,0,.15)",
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, #FBF8F2 0%, #F4EEE1 55%, #EFF6F1 100%)",
        /*
         * Quyuq uchi #B98428 dan #BE8B2C ga bir qadam yoritildi.
         *
         * Bu bugungi NOSOZLIKNI tuzatmaydi: piksel o'lchovi tugmalar ostidagi
         * haqiqiy oraliqni #c38e30…#d6a13f deb berdi va `ink-900` u yerda
         * 4.59–5.76, ya'ni AA dan o'tadi. Lekin gradientning E'LON QILINGAN
         * quyuq uchida `ink-900` atigi 4.37 — balandroq tugmada yoki
         * gradient burchagi o'zgarsa nosozlik o'zidan paydo bo'lardi.
         * Yangi uchda eng yomon holat ham 4.73.
         *
         * Ko'z bilan farq sezilmaydi (bitta to'xtashning yorqinligi 2.6%
         * ga o'zgardi), lekin `e2e/startup.spec.ts` dagi qorovul gradientni
         * ENG YOMON uchi bo'yicha o'lchaydi — u shu qadamsiz yolg'on
         * ogohlantirish berardi.
         */
        "gradient-gold": "linear-gradient(120deg, #D9A441, #BE8B2C)",
        "gradient-emerald": "linear-gradient(120deg, #2E7D5F, #24604A)",
        "felt-vignette": "radial-gradient(circle, #EFF6F1 0%, #F4EEE1 70%)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
        "piece-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
