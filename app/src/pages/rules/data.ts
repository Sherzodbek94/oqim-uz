import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Baby,
  Briefcase,
  Coins,
  CreditCard,
  Flame,
  HandCoins,
  HeartHandshake,
  Home,
  Landmark,
  LayoutGrid,
  Lightbulb,
  Mail,
  Palmtree,
  Percent,
  PiggyBank,
  Plane,
  PowerOff,
  Scale,
  ShieldAlert,
  ShoppingBag,
  Store,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Table of contents (rules.md page skeleton)                          */
/* ------------------------------------------------------------------ */

export interface TocItem {
  id: string;
  num: string;
  label: string;
}

export const TOC: TocItem[] = [
  { id: "s1", num: "01", label: "Maqsad" },
  { id: "s2", num: "02", label: "Doska va kataklar" },
  { id: "s3", num: "03", label: "O'yin bosqichlari" },
  { id: "s4", num: "04", label: "Moliyaviy hisobot" },
  { id: "s5", num: "05", label: "Kundalik aylanadan chiqish" },
  { id: "s6", num: "06", label: "Moliyaviy tushunchalar" },
  { id: "s7", num: "07", label: "Strategiyalar" },
  { id: "s8", num: "08", label: "Erkinlik yo'li" },
  { id: "s9", num: "09", label: "Bankrotlik" },
  { id: "s10", num: "10", label: "O'zbekiston konteksti" },
  { id: "s11", num: "11", label: "Bilim testi" },
  { id: "s12", num: "12", label: "FAQ" },
  { id: "s13", num: "13", label: "Yo'l xaritasi" },
];

/* ------------------------------------------------------------------ */
/* §2 — Board cell legend                                              */
/* ------------------------------------------------------------------ */

export interface CellExample {
  title: string;
  lines: { label: string; value: string; tone?: "pos" | "neg" }[];
  note: string;
}

export interface CellLegend {
  key: string;
  name: string;
  icon: LucideIcon;
  /** main accent hex */
  color: string;
  /** enumerated chip classes (no template literals) */
  chipCls: string;
  desc: string;
  freq: string;
  examples: CellExample[];
}

export const CELLS: CellLegend[] = [
  {
    key: "payday",
    name: "Oy kun",
    icon: Coins,
    color: "#D9A441",
    chipCls: "bg-gold-100 text-gold-600",
    desc: "Aylanani har boshingizda yoki to'xtaganingizda oylik naqd oqimingizni olasiz.",
    freq: "30 tadan 1 ta",
    examples: [
      {
        title: "Oy kun!",
        lines: [{ label: "Naqd oqim", value: "+5 370 000 so'm", tone: "pos" }],
        note: "Balansingizga oylik oqim qo'shildi.",
      },
      {
        title: "Oy kun — bank to'lovi",
        lines: [
          { label: "Oqim", value: "+4 100 000 so'm", tone: "pos" },
          { label: "Balans", value: "12 850 000 so'm" },
        ],
        note: "Katta oqim — tezroq jamg'arma.",
      },
    ],
  },
  {
    key: "avans",
    name: "Avans",
    icon: HandCoins,
    color: "#C9A227",
    chipCls: "bg-[#C9A227]/10 text-[#9A7B1E]",
    desc: "Sof maoshning (maosh − oylik kredit to'lovlari) 30%-i oldindan beriladi — kreditga ketadigan pul avansga kirmaydi.",
    freq: "30 tadan 1 ta",
    examples: [
      {
        title: "Avans kuni!",
        lines: [{ label: "Avans (maosh−kreditlar 30%)", value: "+2 700 000 so'm", tone: "pos" }],
        note: "Faqat naqd — dividend va kredit hisob-kitoblari Oy kunda bo'ladi. Kredit to'lovlari maoshni yutsa avans 0.",
      },
    ],
  },
  {
    key: "opportunity",
    name: "Imkoniyat",
    icon: Lightbulb,
    color: "#2E7D5F",
    chipCls: "bg-emerald-100 text-emerald-700",
    desc: "Kichik yoki katta bitim kartasini tanlang: kvartira, choyxona, depozit...",
    freq: "30 tadan 7 ta",
    examples: [
      {
        title: "Mahalla choyxonasi",
        lines: [
          { label: "Narx", value: "90 000 000 so'm" },
          { label: "Oqim", value: "+3 000 000 so'm/oy", tone: "pos" },
        ],
        note: "ROI ≈ 40%/yil — kichik bitim.",
      },
      {
        title: "Yunusobod kvartirasi (ijara)",
        lines: [
          { label: "Boshlang'ich to'lov", value: "96 000 000 so'm" },
          { label: "Oqim", value: "+2 300 000 so'm/oy", tone: "pos" },
        ],
        note: "Ipoteka bilan, katta bitim.",
      },
      {
        title: "Bank depoziti 22%/yil",
        lines: [
          { label: "Minimal summa", value: "10 000 000 so'm" },
          { label: "Oqim", value: "+183 000 so'm/oy", tone: "pos" },
        ],
        note: "Eng xavfsiz passiv daromad.",
      },
    ],
  },
  {
    key: "market",
    name: "Bozor",
    icon: Store,
    color: "#41788F",
    chipCls: "bg-sky-100 text-sky-700",
    desc: "Xaridorlar paydo bo'ladi — aktivlaringizni foyda bilan sotish imkoniyati.",
    freq: "30 tadan 5 ta",
    examples: [
      {
        title: "Xaridor topildi!",
        lines: [{ label: "Taklif", value: "Kvartirangizga +15%" }],
        note: "Sotish yoki saqlab qolish — tanlov sizniki.",
      },
      {
        title: "Choyxona uchun taklif",
        lines: [{ label: "Taklif", value: "110 000 000 so'm" }],
        note: "90 mln ga olgandiganiz — yaxshi foyda.",
      },
    ],
  },
  {
    key: "event",
    name: "Hodisa",
    icon: Zap,
    color: "#7A5CA8",
    chipCls: "bg-[#7A5CA8]/10 text-[#7A5CA8]",
    desc: "Hayotiy voqea: inflyatsiya, to'y taklifi, subsidiya. Tanlashsiz qo'llanadi.",
    freq: "30 tadan 4 ta",
    examples: [
      {
        title: "Inflyatsiya oshdi",
        lines: [{ label: "Xarajatlar", value: "+5% /oy", tone: "neg" }],
        note: "Hayotdagidek — narxlar ko'tarildi.",
      },
      {
        title: "Imtiyozli ipoteka dasturi",
        lines: [{ label: "Imkoniyat", value: "Boshlang'ich to'lov −10%" }],
        note: "Davlat dasturi — bir martalik imkoniyat.",
      },
    ],
  },
  {
    key: "charity",
    name: "Xayriya",
    icon: HeartHandshake,
    color: "#C9744C",
    chipCls: "bg-clay-100 text-clay-600",
    desc: "Daromadning 10% ini bering — 3 aylana ikki zar bilan o'ynaysiz.",
    freq: "30 tadan 2 ta",
    examples: [
      {
        title: "Ehson",
        lines: [
          { label: "To'lov", value: "−900 000 so'm", tone: "neg" },
          { label: "Bonus", value: "3 aylana × 2 zar", tone: "pos" },
        ],
        note: "Ixtiyoriy — lekin strategik.",
      },
    ],
  },
  {
    key: "doodad",
    name: "Kutilmagan xarajat",
    icon: ShoppingBag,
    color: "#C24E4E",
    chipCls: "bg-[#C24E4E]/10 text-[#C24E4E]",
    desc: "Smartfon, Cobalt, mebel — cho'ntakdan chiqadigan xarajatlar.",
    freq: "30 tadan 4 ta",
    examples: [
      {
        title: "Yangi smartfon",
        lines: [{ label: "Xarajat", value: "−8 000 000 so'm", tone: "neg" }],
        note: "Naqd yetmasa — qarz olasiz.",
      },
      {
        title: "Cobalt ga shinalar",
        lines: [{ label: "Xarajat", value: "−1 600 000 so'm", tone: "neg" }],
        note: "Qish keldi — tayyorlik ko'ring.",
      },
    ],
  },
  {
    key: "baby",
    name: "Farzand",
    icon: Baby,
    color: "#7FA05A",
    chipCls: "bg-[#7FA05A]/15 text-[#5F7D42]",
    desc: "Oila kengayadi: oylik xarajatga +600 ming so'm qo'shiladi.",
    freq: "30 tadan 1 ta",
    examples: [
      {
        title: "Qizcha tug'ildi!",
        lines: [{ label: "Xarajat", value: "+600 000 so'm/oy", tone: "neg" }],
        note: "Tabriklaymiz! Byudjet qayta hisoblanadi.",
      },
    ],
  },
  {
    key: "downsized",
    name: "Ishsizlik",
    icon: Briefcase,
    color: "#5A6B70",
    chipCls: "bg-[#5A6B70]/10 text-[#5A6B70]",
    desc: "Bir oylik xarajatni to'lang va 2 navbat o'tkazib yuboring.",
    freq: "30 tadan 1 ta",
    examples: [
      {
        title: "Ishdan bo'shatildingiz",
        lines: [
          { label: "To'lov", value: "−5 500 000 so'm", tone: "neg" },
          { label: "Jarima", value: "2 navbat o'tkaziladi", tone: "neg" },
        ],
        note: "Zaxira saqlaganlar uchun osonroq.",
      },
    ],
  },
  {
    key: "weekend",
    name: "Dam olish kuni",
    icon: Palmtree,
    color: "#4E8D7C",
    chipCls: "bg-[#4E8D7C]/10 text-[#4E8D7C]",
    desc: "Shanba-yakshanba kunlari: dam olish rejasi tanlanadi; ba'zan kichik uy xarajati avtomatik yechiladi.",
    freq: "30 tadan 4 ta",
    examples: [
      {
        title: "Dam olish rejasi",
        lines: [
          { label: "Chorvoq sayohati", value: "−900 000 so'm", tone: "neg" },
          { label: "Shahar parki", value: "−50 000 so'm", tone: "neg" },
        ],
        note: "3 xil to'lovli dam olish — «Zaryad» bonusi +2 mln so'm.",
      },
      {
        title: "Uy xarajati",
        lines: [{ label: "Kommunal to'lov", value: "−350 000 so'm", tone: "neg" }],
        note: "Ba'zan dam olish kuni uy xarajati bilan o'tadi (150–600 ming).",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* §3 — Turn walkthrough                                               */
/* ------------------------------------------------------------------ */

export const STEPS: { title: string; body: string }[] = [
  {
    title: "Kasb oling",
    body: "Tasodifiy kasb sizning start kapitalingiz: maosh, jamg'arma va qarzlar bilan.",
  },
  {
    title: "Zar tashlang",
    body: "Zar soni kataklar bo'ylab harakatni belgilaydi. Xayriya qilganlar vaqti-vaqti bilan 2 zar tashlaydi.",
  },
  {
    title: "Katakni bajaring",
    body: "Bitim tuzing, hodisani qabul qiling yoki xarajatni to'lang — hammasi hisobotga avtomatik yoziladi.",
  },
  {
    title: "Hisobotni kuzating",
    body: "Har harakat moliyaviy hisobotингizni o'zgartiradi. Oqim musbat bo'lib qolsin!",
  },
  {
    title: "Passiv daromadni oshiring",
    body: "Aktivlar sotib oling: ijara kvartirasi, choyxona, depozit. Har biri oylik oqim qo'shadi.",
  },
  {
    title: "Chiqing va g'alaba qiling",
    body: "Passiv daromad xarajatlardan 20% ko'p → Erkinlik yo'li (yoki passiv daromad ≥ 1,2× xarajatlar + naqd zaxira ≥ 3× oylik xarajat). Orzuingizni sotib olib, uni 3 oy ushlab turing yoki +50 mln oqimga erishing.",
  },
];

/* ------------------------------------------------------------------ */
/* §8 — Orzular saqlash xarajati (C3: upkeep + 3-oy qoidasi)            */
/* ------------------------------------------------------------------ */

export interface DreamUpkeepRow {
  title: string;
  price: number;
  /** oylik sof xarajat (manfiy = sof daromad) */
  monthly: number;
  note: string;
}

export const DREAM_UPKEEP: DreamUpkeepRow[] = [
  { title: "Shaxsiy kutubxona", price: 150_000_000, monthly: 500_000, note: "Bilim — eng arzon orzu, kichik oylik xarajat" },
  { title: "Oilaviy hovli", price: 450_000_000, monthly: 2_000_000, note: "Uy-joy — kommunal va qarov" },
  { title: "Butun dunyo bo'ylab sayohat", price: 550_000_000, monthly: 0, note: "Sayohat — bir martalik, upkeep yo'q" },
  { title: "Xayriya maktabi", price: 800_000_000, monthly: 3_000_000, note: "Xayriya — obro': har oy +10 kredit reytingi (850 gacha)" },
  { title: "Butik-mehmonxona biznesi", price: 2_000_000_000, monthly: -5_000_000, note: "Biznes — 8 mln daromad − 3 mln upkeep" },
];

export const DREAM_HOLD_RULE =
  "Orzuni sotib olish yetarli emas — uni 3 oy (3 Erkinlik yo'li navbati) ushlab turish kerak. Naqd pulingiz manfiyga ketsa, orzu yo'qolmaydi, lekin hisoblagich pauza bo'ladi.";

/* ------------------------------------------------------------------ */
/* §4 — Annotated statement (Bank xodimi sample)                       */
/* ------------------------------------------------------------------ */

export const STATEMENT = {
  profession: "Bankir",
  salary: 18_000_000,
  passiveBase: 1_870_000,
  passiveAfter: 2_870_000,
  expensesTotal: 15_400_000,
  incomeRows: [
    { label: "Maosh", value: 18_000_000 },
    { label: "Depozit foizi", value: 1_870_000 },
  ],
  expenseRows: [
    { label: "Asosiy xarajatlar", value: 13_200_000 },
    { label: "Ipoteka to'lovi", value: 2_200_000 },
  ],
  assets: [
    { label: "Bank depoziti (22%/yil)", value: 102_000_000, flow: "+1 870 000 so'm/oy" },
  ],
  deal: { label: "Telegram do'kon", value: 25_000_000, flow: "+950 000 so'm/oy" },
  liabilities: [
    { label: "Ipoteka (uy krediti)", value: 50_000_000, flow: "−2 200 000 so'm/oy" },
  ],
};

export type ZoneId = "income" | "expenses" | "cashflow" | "assets" | "liabilities" | "gauge";

export const ANNOTATIONS: { pin: number; zone: ZoneId; title: string; body: string }[] = [
  {
    pin: 1,
    zone: "income",
    title: "Jami daromad",
    body: "Maosh + passiv daromadlar yig'indisi. Chiqish sharti faqat passiv qismiga bog'liq.",
  },
  {
    pin: 2,
    zone: "expenses",
    title: "Jami xarajatlar",
    body: "Har oy cho'ntakdan chiqadigan hamma pul: oziq-ovqat, kommunal, kredit to'lovlari.",
  },
  {
    pin: 3,
    zone: "cashflow",
    title: "Oylik naqd oqim",
    body: "Naqd oqim — oyning oxirida qoladigan pul. Musbat bo'lsa — yaxshi. Salbiy bo'lsa — bankrotlik yaqin.",
  },
  {
    pin: 4,
    zone: "assets",
    title: "Aktivlar",
    body: "Sizga pul keltiradigan mulklar: depozit, ijara kvartirasi, choyxona, biznes.",
  },
  {
    pin: 5,
    zone: "liabilities",
    title: "Passivlar",
    body: "Pul oladigan majburiyatlar: ipoteka, iste'mol kreditlari. Erta yoping — oqim oshadi.",
  },
  {
    pin: 6,
    zone: "gauge",
    title: "Chiqish o'lchovi",
    body: "Passiv daromad xarajatlarning necha foizini qoplaydi. 100% — Erkinlik yo'li eshigi ochiladi!",
  },
];

/* ------------------------------------------------------------------ */
/* §5 — Escape math stages                                             */
/* ------------------------------------------------------------------ */

export const ESCAPE = {
  expenses: 5_500_000,
  stages: [
    { passive: 2_000_000, label: null as string | null },
    { passive: 3_500_000, label: "Depozit qo'shildi" },
    { passive: 5_000_000, label: "Choyxona qo'shildi" },
    { passive: 6_000_000, label: "Kvartira qo'shildi" },
  ],
};

/* ------------------------------------------------------------------ */
/* §6 — Glossary                                                       */
/* ------------------------------------------------------------------ */

export interface GlossaryTerm {
  id: string;
  term: string;
  icon: LucideIcon;
  body: string;
  example: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "aktiv",
    term: "Aktiv",
    icon: Coins,
    body: "Aktiv — cho'ntagingizga pul oqizadigan narsa. O'ynaganingizda ham, uxlaganingizda ham siz uchun ishlaydi.",
    example: "Misol: ijara berilgan kvartira +2,3 mln/oy.",
  },
  {
    id: "passiv",
    term: "Passiv (majburiyat)",
    icon: CreditCard,
    body: "Passiv — cho'ntagingizdan pul oladigan narsa. Qarz, kredit, ta'mir talab qiluvchi mol-mulk — barchasi passiv.",
    example: "Misol: Cobalt krediti −2,1 mln/oy.",
  },
  {
    id: "passiv-daromad",
    term: "Passiv daromad",
    icon: PiggyBank,
    body: "Ishlamasdan keladigan daromad: ijara haqi, depozit foizi, divident. Kundalik aylanadan chiqishning yagona kaliti shu.",
    example: "Misol: 102 mln so'mlik depozit har oy +1,87 mln foiz keltiradi.",
  },
  {
    id: "naqd-oqim",
    term: "Naqd oqim (cashflow)",
    icon: ArrowLeftRight,
    body: "Oylik daromad minus oylik xarajatlar. Oy kun kataklarida aynan shu summa balansingizga tushadi.",
    example: "Misol: 10,87 mln − 5,5 mln = +5,37 mln/oy oqim.",
  },
  {
    id: "roi",
    term: "ROI (investitsiya daromadliligi)",
    icon: Percent,
    body: "Yillik oqim ÷ kiritilgan pul × 100%. Bitimlarni solishtirishning eng tez usuli — qancha yuqori bo'lsa, pul shuncha tez qaytadi.",
    example: "Misol: choyxona 90 mln ga +3 mln/oy ≈ 40%/yil.",
  },
  {
    id: "kapital-osish",
    term: "Kapital o'sishi",
    icon: TrendingUp,
    body: "Aktivning o'zi qimmatlashi — valyuta, aksiya yoki ko'chmas mulk bahosining ko'tarilishi. Oqimdan farqli, faqat sotganingizda realizatsiya bo'ladi.",
    example: "Misol: dollar jamg'armasi yiliga 8–10% mustahkamlansa — bu kapital o'sishi.",
  },
  {
    id: "kredit-yuki",
    term: "Kredit yuki",
    icon: Scale,
    body: "Qarz to'lovlarining oylik daromadga nisbati. 40% dan oshsa — xavfli zona: har qanday hodisa byudjetni ag'darishi mumkin.",
    example: "Misol: maosh 9 mln, kreditlar 2,45 mln → yuk 27% (xavfsiz).",
  },
  {
    id: "diversifikatsiya",
    term: "Diversifikatsiya",
    icon: LayoutGrid,
    body: "Tuxumlarni bir savatga solmaslik — pulni turli aktivlar orasida taqsimlash. Bitta biznes yiqilsa, qolganlari sizni ushlab turadi.",
    example: "Misol: depozit + choyxona + kvartira — uchta mustaqil oqim manbai.",
  },
  {
    id: "inflyatsiya",
    term: "Inflyatsiya",
    icon: Flame,
    body: "Pulning qadrsizlanishi; so'mlik jamg'armaning yashirin dushmani. Yotoq ostida yotgan naqd pul har yil kichrayadi.",
    example: "Misol: 10% inflyatsiyada 100 mln so'm bir yilda 90 mln «quvvat»ga tushadi.",
  },
  {
    id: "ipoteka",
    term: "Ipoteka",
    icon: Landmark,
    body: "Uyni garovga qo'yib olinadigan uzoq muddatli kredit. O'zbekistonda imtiyozli davlat dasturlari mavjud — o'yinda ham hodisa sifatida keladi.",
    example: "Misol: 480 mlnlik kvartira, 96 mln boshlang'ich to'lov, 1,9 mln/oy to'lov.",
  },
];

/* ------------------------------------------------------------------ */
/* §7 — Strategies                                                     */
/* ------------------------------------------------------------------ */

export const STRATEGIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Landmark,
    title: "Kichikdan boshlang",
    body: "Avval depozit va Telegram do'kon kabi arzon oqim manbalarini yig'ing.",
  },
  {
    icon: Scale,
    title: "Qarz yukini kamaytiring",
    body: "Iste'mol kreditlarini erta yoping — har yopilgan qarz oqimni oshiradi.",
  },
  {
    icon: HeartHandshake,
    title: "Xayriya — investitsiya",
    body: "Ikki zar = ikki baravar tez aylana. Strategik damlarda foydali.",
  },
  {
    icon: ShieldAlert,
    title: "Zaxira saqlang",
    body: "Ishsizlik yoki to'y taklifi uchun kamida 1 oylik xarajatni naqd ushlab turing.",
  },
];

/* ------------------------------------------------------------------ */
/* §10 — Uzbekistan context                                            */
/* ------------------------------------------------------------------ */

export const CONTEXT_CARDS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: TrendingUp,
    title: "Inflyatsiya",
    body: "Hodisa kartalarida xarajatlarni oshiradi — hayotdagidek.",
  },
  {
    icon: Mail,
    title: "To'y taklifi",
    body: "O'zbek to'ylari katta xarajat; o'yinda ham shunday.",
  },
  {
    icon: Landmark,
    title: "Subsidiyalar va imtiyozli ipoteka",
    body: "Davlat dasturlari imkoniyat sifatida keladi.",
  },
  {
    icon: Plane,
    title: "Mehnat migratsiyasi",
    body: "Riskli lekin tez pul: 2 navbat evaziga +15 mln.",
  },
  {
    icon: PowerOff,
    title: "Elektr/gaz uzilishi",
    body: "Biznesingiz bir aylana sustlashishi mumkin.",
  },
  {
    icon: Home,
    title: "Ko'chmas mulk bozori",
    body: "Toshkent kvartiralari va yangi qurilishlar real narx oralig'ida.",
  },
];

/* ------------------------------------------------------------------ */
/* §11 — Quiz                                                          */
/* ------------------------------------------------------------------ */

export interface QuizQuestion {
  q: string;
  answers: string[];
  correct: number;
  explanation: string;
}

export const QUIZ: QuizQuestion[] = [
  {
    q: "Aktiv nima?",
    answers: ["Pul yeydigan narsa", "Pul keltiradigan narsa", "Bankdagi qarz"],
    correct: 1,
    explanation: "Aktiv cho'ntakka pul oqizadi — masalan, ijara kvartirasi yoki depozit.",
  },
  {
    q: "Kundalik aylanadan chiqish sharti?",
    answers: ["100 mln jamg'arma", "Katta maosh", "Passiv daromad xarajatlardan 20% ko'p"],
    correct: 2,
    explanation: "Maosh emas — passiv daromad xarajatlardan 20% ko'p bo'lganda chiqasiz.",
  },
  {
    q: "Choyxona: 90 mln kiritdingiz, +3 mln/oy oqim. ROI taxminan?",
    answers: ["8%/yil", "40%/yil", "153%/yil"],
    correct: 1,
    explanation: "3 mln × 12 oy = 36 mln; 36 ÷ 90 × 100% = 40%/yil.",
  },
  {
    q: "Ishsizlik katakchasiga tushsangiz?",
    answers: [
      "1 oylik xarajat to'lanadi, 2 navbat o'tkaziladi",
      "O'yin tugaydi",
      "Hech narsa bo'lmaydi",
    ],
    correct: 0,
    explanation: "Shuning uchun zaxira muhim — naqd zaxira sizni qutqaradi.",
  },
  {
    q: "Qaysi biri passiv daromad?",
    answers: ["Oylik maosh", "Kvartira ijarasi", "To'yda tortilgan sovg'a"],
    correct: 1,
    explanation: "Ijara haqi siz ishlamingizni talab qilmaydi — haqiqiy passiv daromad.",
  },
];

export const QUIZ_VERDICTS = [
  { min: 0, text: "Qoidalar bo'limini qayta o'qing" },
  { min: 3, text: "Erkinlik yo'li ko'rinib qoldi!" },
  { min: 5, text: "Moliyaviy tulkisiz!" },
];

/* ------------------------------------------------------------------ */
/* §12 — FAQ                                                           */
/* ------------------------------------------------------------------ */

export const FAQ: { q: string; a: string }[] = [
  {
    q: "O'yin qayerda saqlanadi?",
    a: "Brauzeringiz localStorage'ida. Boshqa qurilmaga o'tmaydi, kesh tozalansa o'chadi.",
  },
  {
    q: "Do'stlarim bilan o'ynay olamanmi?",
    a: "Hozircha botlar bilan (2–4 o'yinchi). Mahalliy multiplayer rejesi yo'l xaritasida.",
  },
  {
    q: "O'yin bepulmi?",
    a: "Ha, to'liq bepul. Ro'yxatdan o'tish ham shart emas.",
  },
  {
    q: "Bu investitsiya maslahatimi?",
    a: "Yo'q — bu ta'limiy o'yin. Haqiqiy investitsiya oldidan mutaxassisga murojaat qiling.",
  },
  {
    q: "Boshqa moliyaviy o'yinlardan farqi nima?",
    a: "Kasblar, narxlar, hodisalar va valyuta to'liq O'zbekiston sharoitiga moslashtirilgan.",
  },
];
