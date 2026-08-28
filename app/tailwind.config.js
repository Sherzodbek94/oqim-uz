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
        /* Cashflow UZ design tokens (design.md §2.1) */
        sand: {
          50: "#FBF8F2",
          100: "#F4EEE1",
          200: "#EAE1CF",
        },
        ink: {
          900: "#1E2D2A",
          600: "#51635D",
          400: "#8A9992",
        },
        emerald: {
          700: "#24604A",
          600: "#2E7D5F",
          100: "#DDEEE3",
          50: "#EFF6F1",
        },
        clay: {
          600: "#B45A38",
          500: "#C9744C",
          100: "#F6E4D7",
        },
        gold: {
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
        "gradient-gold": "linear-gradient(120deg, #D9A441, #B98428)",
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
