/**
 * OQIM — Qahramonlar (heroes) layer on top of professions.
 * Ported from erkinlik_kvadranti assets/data/characters.json (+advanced):
 * 8 heroes with starting finances (UZS) and special abilities that have
 * real mechanical effects in the engine (deal price, income, events).
 */
import type {
  Ability,
  ExpenseCategory,
  ExpenseParts,
  Hero,
  Player,
  Profession,
  ProfessionField,
} from "./types";
import { annuityPayment } from "./engine";

/** Neytral qobiliyat — o'z personaj yaratganda yoki qahramonsiz. */
export const NEUTRAL_ABILITY: Ability = {
  id: "yangi-boshlanuvchi",
  name: "Yangi boshlanuvchi",
  desc: "Qobiliyatsiz — hamma narsani o'z tajribasidan o'rganadi.",
  icon: "Sprout",
  modifiers: [],
};

export const HEROES: Hero[] = [
  {
    id: "aziza",
    name: "Aziza",
    professionName: "O'qituvchi",
    flavor: "Maktabda ishlaydigan, bilim berishni yaxshi ko'radigan tajribali o'qituvchi.",
    avatar: "/avatar-teacher.png",
    field: "talim",
    quadrant: "E",
    salary: 3_000_000,
    expenses: 2_500_000,
    savings: 2_000_000,
    loans: [],
    ability: {
      id: "bilim-quvvati",
      name: "Bilim quvvati",
      desc: "Ta'lim turidagi xarajatlar va hodisalar 20% arzon.",
      icon: "GraduationCap",
      modifiers: [{ type: "expense", category: "talim", pct: -20 }],
    },
  },
  {
    id: "bekzod",
    name: "Bekzod",
    professionName: "Shifokor",
    flavor: "Davlat kasalxonasida ishlaydigan, odamlarga yordam berishni sevgan shifokor.",
    avatar: "/avatar-doctor.png",
    field: "tibbiyot",
    quadrant: "E",
    salary: 6_000_000,
    expenses: 4_000_000,
    savings: 5_000_000,
    loans: [],
    ability: {
      id: "soglik",
      name: "Sog'liq",
      desc: "Tibbiy xarajatlar 30% kam.",
      icon: "Stethoscope",
      modifiers: [{ type: "expense", category: "tibbiyot", pct: -30 }],
    },
  },
  {
    id: "gulnoza",
    name: "Gulnoza",
    professionName: "Sartarosh",
    flavor: "O'z go'zallik ustaxonasida mijozlarga xizmat ko'rsatadigan mohir sartarosh.",
    avatar: "/avatar-waiter.png",
    field: "xizmat",
    quadrant: "S",
    salary: 4_000_000,
    expenses: 3_000_000,
    savings: 3_000_000,
    loans: [{ name: "Ustaxona qarzi", principal: 500_000, monthlyPayment: 50_000 }],
    ability: {
      id: "qol-mahorati",
      name: "Qo'l mahorati",
      desc: "Xizmat ko'rsatish tipli kichik bitimlar daromadi +15%.",
      icon: "Scissors",
      modifiers: [{ type: "deal-income", pct: 15, tags: ["xizmat"] }],
    },
  },
  {
    id: "davron",
    name: "Davron",
    professionName: "Fermer",
    flavor: "Qishloqda yer-mulkka ega, meva-sabzavot yetishtiradigan mehnatkash fermer.",
    avatar: "/avatar-farmer.png",
    field: "qishloq",
    quadrant: "S",
    salary: 3_500_000,
    expenses: 3_000_000,
    savings: 4_000_000,
    loans: [{ name: "Texnika qarzi", principal: 2_000_000, monthlyPayment: 200_000 }],
    ability: {
      id: "yer-baxti",
      name: "Yer baxti",
      desc: "Qishloq xo'jaligi bitimlari narxi 15% arzon.",
      icon: "Wheat",
      modifiers: [{ type: "deal-price", pct: -15, tags: ["dala", "chorva"] }],
    },
  },
  {
    id: "jamshid",
    name: "Jamshid",
    professionName: "IT-mutaxassis",
    flavor: "Masofadan turib xalqaro loyihalarda ishlaydigan dasturchi.",
    avatar: "/avatar-programmer.png",
    field: "it",
    quadrant: "S",
    salary: 7_000_000,
    expenses: 4_500_000,
    savings: 8_000_000,
    loans: [],
    ability: {
      id: "kod-quvvati",
      name: "Kod quvvati",
      desc: "IT/onlayn bitimlar daromadi +20%.",
      icon: "Zap",
      modifiers: [{ type: "deal-income", pct: 20, tags: ["onlayn", "it"] }],
    },
  },
  {
    id: "nodira",
    name: "Nodira",
    professionName: "Restoran egasi",
    flavor: "Shahar markazida mashhur restoranga egalik qiluvchi tadbirkor ayol.",
    avatar: "/avatar-trader.png",
    field: "savdo",
    quadrant: "B",
    salary: 12_000_000,
    expenses: 8_000_000,
    savings: 15_000_000,
    loans: [{ name: "Biznes qarzi", principal: 5_000_000, monthlyPayment: 400_000 }],
    ability: {
      id: "mehmondost",
      name: "Mehmondo'st",
      desc: "Restoran/choyxona/kafe tipli bitimlar daromadi +25%.",
      icon: "Coffee",
      modifiers: [{ type: "deal-income", pct: 25, tags: ["restoran"] }],
    },
  },
  {
    id: "sarvar",
    name: "Sarvar",
    professionName: "Ko'chmas mulk agenti",
    flavor: "Ko'p yillik tajribaga ega, ko'chmas mulk bozorini yaxshi biladigan agent.",
    avatar: "/avatar-banker.png",
    field: "moliya",
    quadrant: "I",
    salary: 5_000_000,
    expenses: 3_000_000,
    savings: 25_000_000,
    loans: [{ name: "Ofis ipotekasi", principal: 10_000_000, monthlyPayment: 700_000 }],
    ability: {
      id: "koz-quvvati",
      name: "Ko'z quvvati",
      desc: "Bozor takliflarida ko'chmas mulk sotish narxi +10% yuqori.",
      icon: "Home",
      modifiers: [{ type: "sale-price", pct: 10, kinds: ["realestate"] }],
    },
  },
  {
    id: "ziyoda",
    name: "Ziyoda",
    professionName: "Investor",
    flavor: "Moliya bozorlarida faol qatnashadigan, tajribali investor ayol.",
    avatar: "/avatar-lawyer.png",
    field: "moliya",
    quadrant: "I",
    salary: 4_000_000,
    expenses: 2_500_000,
    savings: 30_000_000,
    loans: [],
    ability: {
      id: "xavf-tahlili",
      name: "Xavf tahlili",
      desc: "Riskli bitimlar (kripto, startap) 15% arzon; salbiy bozor hodisalari 50% kam ta'sir qiladi.",
      icon: "TrendingUp",
      modifiers: [
        { type: "deal-price", pct: -15, riskyOnly: true },
        { type: "negative-event-soften", pct: 50 },
      ],
    },
  },
];

export function heroById(id: string | null | undefined): Hero | null {
  if (!id) return null;
  return HEROES.find((h) => h.id === id) ?? null;
}

/** Player's effective ability (hero's or the neutral "Yangi boshlanuvchi"). */
export function abilityOf(p: Player): Ability {
  return heroById(p.heroId)?.ability ?? NEUTRAL_ABILITY;
}

/** Hero mapped onto the existing profession system (own starting stats). */
export function heroToProfession(hero: Hero): Profession {
  return {
    id: `hero-${hero.id}`,
    name: hero.professionName,
    flavor: hero.flavor,
    avatar: hero.avatar,
    field: hero.field,
    salary: hero.salary,
    expenses: hero.expenses,
    loanPayment: hero.loans.reduce((s, l) => s + l.monthlyPayment, 0),
    savings: hero.savings,
    loans: hero.loans,
  };
}

/* ---------------- O'z personajingizni yarating ---------------- */

/** O'z personaj formasi: bitta qarz satri (qoldiq + stavka + muddat → annuitet). */
export interface CustomLoanInput {
  name: string;
  principal: number;
  /** yillik foiz stavkasi, % (masalan, 24 = 24%/yil) */
  annualRatePct: number;
  /** qolgan muddat, oy */
  months: number;
}

/** O'z personaj formasi: xarajatlar taqsimoti (jami avtomatik hisoblanadi). */
export interface CustomExpensesInput {
  housing: number;
  food: number;
  transport: number;
  education: number;
  other: number;
}

export interface CustomProfileInput {
  professionName: string;
  salary: number;
  expenses: CustomExpensesInput;
  cash: number;
  /** ixtiyoriy qarzlar (annuitet shartlari bilan) */
  loans: CustomLoanInput[];
}

/** Forma xarajatlarining jamisi. */
export function customExpensesTotal(e: CustomExpensesInput): number {
  return e.housing + e.food + e.transport + e.education + e.other;
}

/** Bitta qarz satrining annuitet oylik to'lovi (forma uchun jonli hisob). */
export function customLoanPayment(l: CustomLoanInput): number {
  if (!(l.principal > 0) || !(l.annualRatePct > 0) || !(l.months > 0)) return 0;
  return annuityPayment(Math.round(l.principal), l.annualRatePct / 100 / 12, Math.round(l.months));
}

/** Kasb nomi kalit so'zlari → kasb maydoni (kasbga mos hodisalar uchun). */
const FIELD_KEYWORDS: [RegExp, ProfessionField][] = [
  [/(o'qituvchi|oqituvchi|ustoz|muallim|talim|maktab|teacher)/i, "talim"],
  [/(shifokor|doktor|tibbiyot|hamshira|doctor|vrach)/i, "tibbiyot"],
  [/(dasturchi|programm?er|developer|koder|\bit\b)/i, "it"],
  [/(fermer|dehqon|qishloq)/i, "qishloq"],
  [/(haydovchi|taksi|shofyor|driver|transport|logist)/i, "transport"],
  [/(advokat|yurist|huquq|lawyer|sudya)/i, "huquq"],
  [/(savdogar|sotuvchi|savdo|tijorat|dokondor)/i, "savdo"],
  [/(usta|quruvchi|qurilish|builder|me'mor)/i, "qurilish"],
  [/(bankir|bank|moliya|buxgalter|bugalter|iqtisod)/i, "moliya"],
  [/(ofitsiant|sartarosh|oshpaz|xizmat|stilist)/i, "xizmat"],
];

/** Kasb nomidan maydonni aniqlaydi (mos kelmasa null). */
export function fieldFromProfessionName(name: string): ProfessionField | null {
  for (const [re, field] of FIELD_KEYWORDS) {
    if (re.test(name)) return field;
  }
  return null;
}

const FIELD_AVATARS: Record<ProfessionField, string> = {
  talim: "/avatar-teacher.png",
  tibbiyot: "/avatar-doctor.png",
  it: "/avatar-programmer.png",
  qishloq: "/avatar-farmer.png",
  transport: "/avatar-taxi.png",
  huquq: "/avatar-lawyer.png",
  savdo: "/avatar-trader.png",
  qurilish: "/avatar-builder.png",
  moliya: "/avatar-banker.png",
  xizmat: "/avatar-waiter.png",
};

export function avatarForField(field: ProfessionField | null): string {
  return field ? FIELD_AVATARS[field] : "/avatar-teacher.png";
}

/**
 * Custom profile validation (setup form):
 * qattiq blok faqat eksplyut/absurd holatlarga: jami xarajatlar ≤ 0 yoki > maosh × 3.
 * Past xarajatlar (maoshning 30% idan kam) endi bloklanmaydi — faqat yumshoq
 * ogohlantirish (customLowExpensesWarning). Qarz to'lovlari 5 xarajat maydoniga
 * kirmaydi (alohida hisoblanadi, ikki marta sanalmaydi).
 */
export function validateCustomProfile(input: CustomProfileInput): string | null {
  if (input.professionName.trim().length < 2) return "Kasb nomini kiriting";
  if (!(input.salary > 0)) return "Oylik maosh 0 dan katta bo'lishi kerak";
  const exp = input.expenses;
  const parts = [exp.housing, exp.food, exp.transport, exp.education, exp.other];
  if (parts.some((v) => v < 0)) return "Xarajatlar manfiy bo'lishi mumkin emas";
  const total = customExpensesTotal(exp);
  if (total <= 0) return "Oylik xarajatlar 0 dan katta bo'lishi kerak";
  if (total > input.salary * 3)
    return "Xarajatlar maoshning 3 baravaridan oshmasligi kerak";
  if (input.cash < 0) return "Boshlang'ich naqd pul manfiy bo'lishi mumkin emas";
  for (const l of input.loans) {
    if (l.principal < 0 || l.annualRatePct < 0 || l.months < 0)
      return "Qarz qiymatlari manfiy bo'lmasligi kerak";
    if (l.principal > 0 && (!(l.annualRatePct > 0) || !(l.months > 0)))
      return "Summa kiritilgan qarz uchun yillik stavka va muddat (oy) 0 dan katta bo'lishi shart";
  }
  return null;
}

/**
 * Yumshoq ogohlantirish (bloklamaydi): jami xarajatlar maoshning 30% idan kam bo'lsa.
 * O'yinchiga passiv daromad maqsadiga tezroq yetishi mumkinligini eslatadi.
 */
export function customLowExpensesWarning(input: CustomProfileInput): string | null {
  if (!(input.salary > 0)) return null;
  const total = customExpensesTotal(input.expenses);
  if (total > 0 && total < input.salary * 0.3)
    return "💡 Xarajatlaringiz nisbatan past — passiv daromad maqsadiga tezroq yetasiz!";
  return null;
}

/**
 * Build a Profession-compatible object from the custom profile form.
 * Xarajatlar taqsimoti saqlanadi (soliq 20% ajratilib, qolgan qismlar mutanosib);
 * qarzlar haqiqiy annuitet shartlari (stavka/muddat) bilan kiritiladi.
 */
export function customToProfession(input: CustomProfileInput): Profession {
  const field = fieldFromProfessionName(input.professionName);
  const loans = input.loans
    .filter((l) => l.principal > 0)
    .map((l) => {
      const principal = Math.round(l.principal);
      const monthlyRate = l.annualRatePct / 100 / 12;
      const months = Math.round(l.months);
      return {
        name: l.name,
        principal,
        monthlyPayment: annuityPayment(principal, monthlyRate, months),
        monthlyRate,
        months,
      };
    });
  const total = Math.round(customExpensesTotal(input.expenses));
  const taxes = Math.round(total * 0.2);
  const scale = total > 0 ? (total - taxes) / total : 0;
  const housing = Math.round(input.expenses.housing * scale);
  const food = Math.round(input.expenses.food * scale);
  const transport = Math.round(input.expenses.transport * scale);
  const expenseParts: ExpenseParts = {
    taxes,
    housing,
    food,
    transport,
    // ta'lim/bolalar + boshqa → "boshqa" qismiga birlashtiriladi (yakuniy farq shu yerda)
    other: total - taxes - housing - food - transport,
  };
  return {
    id: "custom",
    name: input.professionName.trim(),
    flavor: "O'z yo'lini o'zi tanlagan personaj.",
    avatar: avatarForField(field),
    field: field ?? "xizmat",
    salary: Math.round(input.salary),
    expenses: total,
    loanPayment: loans.reduce((s, l) => s + l.monthlyPayment, 0),
    savings: Math.round(input.cash),
    loans,
    expenseParts,
  };
}

/** Expense discount (%) the player's ability grants for a category. */
export function expenseDiscountPct(p: Player, category: ExpenseCategory): number {
  const ab = abilityOf(p);
  let total = 0;
  for (const m of ab.modifiers) {
    if (m.type === "expense" && m.category === category) total += m.pct;
  }
  return total; // negative = cheaper
}
