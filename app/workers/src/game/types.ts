/**
 * OQIM (avvalgi Cashflow UZ) — game engine types (game.md).
 * All money values are in UZS (so'm), plain integers.
 */

export type CellType =
  | "payday"
  | "avans"
  | "opportunity"
  | "market"
  | "event"
  | "charity"
  | "doodad"
  | "baby"
  | "downsized"
  | "weekend";

export type FTCellType = "bonus" | "business" | "dream" | "charity" | "audit";

export type BotPersonality = "cautious" | "balanced" | "bold";

/** fix-16 (X2): o'yin uslubi — klassik zar doskasi, yo'l xaritasi yoki reja rejimi (fix-17). */
export type BoardMode = "classic" | "path" | "plan";

/** fix-13c (Q1): o'yin rejimi — oddiy yoki tez (qisqa o'yin). */
export type GameMode = "classic" | "tez";

/** fix-15 (P2): qiyinlik darajasi — personaj moliyasidan hisoblanadi yoki qo'lda tanlanadi. */
export type Difficulty = "easy" | "medium" | "hard";

/** fix-15 (P4): farzand ta'limi holati (bog'cha → maktab; maktab boshlanganda bog'cha to'xtaydi). */
export type ChildEdu = "none" | "kg-state" | "kg-private" | "sch-state" | "sch-plus" | "sch-private";

/** fix-15 (P4): farzand yozuvi — tug'ilgan oy + ta'lim tanlovi. */
export interface ChildRecord {
  /** tug'ilgan oy (GameState.month) */
  bornMonth: number;
  edu: ChildEdu;
  /** 3 yosh: bog'cha tanlovi taklif qilindi (bir martalik) */
  offeredKg?: boolean;
  /** 7 yosh: maktab tanlovi taklif qilindi (bir martalik) */
  offeredSchool?: boolean;
}

/** fix-15 (P4): navbatdagi farzand ta'limi tanlovi (modal orqali hal qilinadi). */
export interface PendingChildEvent {
  childIndex: number;
  stage: "kg" | "school";
}

/** Kiyosaki kvadranti: E — yollanma xodim, S — o'z ishini o'zi qiluvchi, B — biznes egasi, I — investor. */
export type Quadrant = "E" | "S" | "B" | "I";

/** Profession field — used by kasbga mos hodisalar (profession-tagged events). */
export type ProfessionField =
  | "talim"
  | "tibbiyot"
  | "it"
  | "savdo"
  | "qishloq"
  | "xizmat"
  | "qurilish"
  | "huquq"
  | "moliya"
  | "transport";

/** Temporary income modifier on a single asset (e.g. ijara 3 oyga 0). */
export interface AssetIncomeMod {
  assetId: string;
  monthsRemaining: number;
  multiplier: number;
}

/** Temporary modifier on all loan payments (e.g. foiz stavkalari tushdi). */
export interface LoanPaymentMod {
  pct: number;
  monthsRemaining: number;
}

/* ---------------- Qahramonlar (heroes) & qobiliyatlar ---------------- */

/** Expense category for ability discounts (ta'lim / tibbiyot xarajatlari). */
export type ExpenseCategory = "talim" | "tibbiyot";

/**
 * Hero ability modifier — applied by the engine at deal price, income calc,
 * market offers and event resolution.
 */
export type AbilityModifier =
  /** deal purchase price change (pct, negative = cheaper); optional tag/risky filter */
  | { type: "deal-price"; pct: number; tags?: string[]; riskyOnly?: boolean }
  /** monthly income change for matching deals when acquired (pct) */
  | { type: "deal-income"; pct: number; tags?: string[] }
  /** market sale offer change for matching asset kinds (pct) */
  | { type: "sale-price"; pct: number; kinds?: AssetKind[] }
  /** expense discount for a category of doodads/events (pct, negative = cheaper) */
  | { type: "expense"; pct: number; category: ExpenseCategory }
  /** negative bozor hodisalari (asset-value/news) hit this hero softer (pct reduced) */
  | { type: "negative-event-soften"; pct: number };

export interface Ability {
  id: string;
  name: string;
  desc: string;
  /** lucide icon name */
  icon: string;
  modifiers: AbilityModifier[];
}

/** Qahramon — profession + starting finances + special ability. */
export interface Hero {
  id: string;
  name: string;
  professionName: string;
  flavor: string;
  avatar: string;
  field: ProfessionField;
  /** qahramonning tabiiy kvadranti (taklif tartibi uchun) */
  quadrant: Quadrant;
  salary: number;
  expenses: number;
  savings: number;
  loans: { name: string; principal: number; monthlyPayment: number }[];
  ability: Ability;
}

/* ---------------- Bozor yangiliklari (news ticker) ---------------- */

/** Active headline effect while it is shown on the ticker. */
export interface ActiveNews {
  id: string;
  turnsLeft: number;
}

export type AssetKind =
  | "business"
  | "realestate"
  | "stock"
  | "currency"
  | "deposit"
  | "bonds";

/* ---------------- Fond birjasi (securities exchange) ---------------- */

/** Birja sektori (news sectorBias va bozor hodisalari uchun). */
export type Sector =
  | "bank"
  | "sanoat"
  | "telekom"
  | "energetika"
  | "qishloq"
  | "texnologiya"
  | "oltin"
  | "obligatsiya";

/** O'yinchining qimmatli qog'oz pozitsiyasi. */
export interface Holding {
  securityId: string;
  qty: number;
  avgBuyPrice: number;
}

/** Birja holati — o'yin state'ida saqlanadi (narxlar umumiy bozor). */
export interface ExchangeState {
  prices: Record<string, number>;
  /** har bir qog'oz uchun oxirgi 12 narx nuqtasi (mini chart) */
  history: Record<string, number[]>;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  monthlyPayment: number;
  /** oylik foiz stavkasi (0.018 = 1.8%/oy) */
  monthlyRate: number;
  remainingMonths: number;
  /** amortizatsiya qoldig'i — muddatidan oldin yopish shu summa */
  remainingBalance: number;
  totalMonths: number;
  /** fix-14: qarz turi — "bank" (standart, default) yoki "qarz" (qarindoshlardan foizsiz) */
  kind?: "bank" | "qarz";
  /** fix-14: faqat kind="qarz" uchun — to'liq qaytarish muddati (GameState.month) */
  dueMonth?: number;
}

/**
 * "Bo'lib to'lash" — installment plan liability.
 * Monthly payment counts as an expense until remainingMonths hits 0.
 */
export interface Installment {
  id: string;
  title: string;
  monthlyPayment: number;
  remainingMonths: number;
  totalMonths: number;
  /** asset acquired through this plan (informational) */
  assetId?: string;
}

export interface Asset {
  id: string;
  title: string;
  kind: AssetKind;
  icon: string;
  price: number;
  paid: number;
  monthlyCashflow: number;
  /** >0 means still under construction — no cashflow yet (game.md §7.2) */
  constructionLeft?: number;
  /** optional content tag copied from the deal (onlayn/chorva/dala/avto/qurilish/restoran/xizmat/savdo/talim) */
  tag?: string;
  /** sotishda qo'llanadigan qayta sotuv foizi (100 = to'liq narx) */
  resalePercent?: number;
  /** likvidlik darajasi 1-5 (bitimdan ko'chadi; yo'qsa 3 deb olinadi) */
  liquidity?: number;
  /** sotib olingandagi bozor indeksi (P/L ko'rsatkichi uchun) */
  buyIndex?: number;
  /** xavf darajasi 1-5 (bitimdan ko'chadi; fix-13c Q3: yomon oy ehtimoli) */
  riskLevel?: number;
  /** "riskli" aktiv (fix-13c Q3: inqiroz ehtimoli) */
  risky?: boolean;
}

export interface ExpenseParts {
  taxes: number;
  housing: number;
  food: number;
  transport: number;
  other: number;
}

export interface Player {
  id: number;
  name: string;
  isBot: boolean;
  personality: BotPersonality | null;
  professionId: string;
  /** tanlangan qahramon (null = o'z personaji / qahramonsiz) */
  heroId: string | null;
  /** o'z personaj kasbi nomidan aniqlangan maydon (kasbga mos hodisalar uchun) */
  customField: ProfessionField | null;
  /** Kiyosaki kvadranti (so'rovnoma orqali aniqlanadi) */
  quadrant: Quadrant;
  /** kredit reytingi (300–850) */
  creditScore: number;
  /** ishsizlik oylari: >0 bo'lsa maosh 0, har oy kunida kamayadi */
  unemployedMonths: number;
  /** ketma-ket penya oylari (2 ga yetganda bankrotlik oqimi) */
  penyaStreak: number;
  /** portfel maslahatchisi: shuncha oy salbiy bozor hodisalari yumshoq */
  marketAdviceMonths: number;
  /** resolved avatar image path */
  avatar: string;
  colorIndex: 0 | 1 | 2 | 3;
  /** Rat Race cell index (0..29) — oy kalendari: position+1 = oy kuni */
  position: number;
  /** Fast Track cell index (0..15) */
  ftPosition: number;
  cash: number;
  salary: number;
  expenseParts: ExpenseParts;
  children: number;
  /** fix-15 (P4): farzandlar yozuvi (children soni bilan sinxron) */
  children2: ChildRecord[];
  /** fix-15 (P4): navbat boshida hal qilinadigan farzand ta'limi tanlovi */
  pendingChildEvent: PendingChildEvent | null;
  /** fix-15 (P3): oxirgi farzand tug'ilgan oy (2 yil = 24 oy minimal oraliq) */
  lastBabyMonth: number;
  /** fix-15 (P2): qiyinlik darajasi (setup'da tanlangan/hisoblangan) */
  difficulty: Difficulty;
  loans: Loan[];
  installments: Installment[];
  assets: Asset[];
  /** fond birjasi portfeli */
  portfolio: Holding[];
  /** vaqtinchalik dividend ko'paytiruvchisi ("Dividend to'lovlari oshdi" hodisasi) */
  dividendBoost: { mult: number; monthsRemaining: number } | null;
  /** rounds remaining with 2 dice (charity reward) */
  charityTurns: number;
  /** turns to skip (unemployment / migration) */
  skipTurns: number;
  taxFreeTurns: number;
  freezeBusinessTurns: number;
  /** salary coefficient from life events (1 = normal); applies at payday */
  salaryMultiplier: number;
  /** months left for a temporary salaryMultiplier; null = doimiy (permanent) */
  salaryMonths: number | null;
  /** temporary loan-payment modifier (foiz stavkalari hodisasi) */
  loanPaymentMod: LoanPaymentMod | null;
  /** temporary per-asset income modifiers */
  assetModifiers: AssetIncomeMod[];
  /** distinct paid weekend activities (Zaryad bonusi uchun) */
  weekendSpends: string[];
  zaryadClaimed: boolean;
  mortgageDiscount: boolean;
  /** bir martalik bitim chegirmasi kuponi (ipoteke taklifi hodisasi) */
  dealCoupon: { pct: number; kinds: AssetKind[] } | null;
  /** keyingi N bitim kartasida "tahliliy" ROI badge ko'rsatiladi (Investitsiya kursi) */
  analystDealsLeft: number;
  /** xayriya katakchasi bloklangan aylanalar (to'yxona rad etilganda) */
  charityBlockedTurns: number;
  usedEmergencyLoan: boolean;
  /** fix-14: qarz vaqtida qaytarilmaganda shu oygacha (GameState.month) yangi qarz bloklanadi */
  qarzBlockedUntil: number;
  /** bu oy avans olindi — oy kunida maoshdan avansReceived qismi ayiriladi */
  avansTakenThisMonth: boolean;
  /** bu oy avans sifatida berilgan summa — oy kunida aynan shu ayiriladi (avans + payday = maosh) */
  avansReceived: number;
  /** fix-17 (R1): reja rejimida ish kunlariga mutanosib maosh koeffitsiyenti (0–1; klassikda 1). Oy yakunida 1 ga qaytariladi. */
  planSalaryScale: number;
  /** fix-18 (E): reja rejimi joriy haftasi (0–3). Oy yakunida 0 ga qaytariladi. */
  planWeekIdx: number;
  /** "Keyinroq olaman" orqali kechiktirilgan doodadlar */
  deferredDoodads: DeferredDoodad[];
  /** jami kechiktirishlar soni (limit: MAX_DOODAD_DEFERS) */
  deferCount: number;
  /** ketma-ket oy kunlari soni: passiv daromad ≥ xarajatlar (Fast Track sharti) */
  escapeStreak: number;
  /** bilim darajasi 1–5 (B3): ta'lim hodisalari va bitimlar orqali o'sadi */
  knowledge: number;
  /** bilim oshirilgan aktiv turlari (har turdan faqat 1 marta +1) */
  knowledgeFromDeals: AssetKind[];
  /** S/B kvadrant mijozlari (B2) */
  clients: Client[];
  /** menejer yollangan — mijozlar soni cheklovi (3) olib tashlanadi (B2) */
  hasManager: boolean;
  /** Bilim markazi harakatlari cooldown'i: actionId → oxirgi ishlatilgan oy (fix-9) */
  knowledgeActions: Record<string, number>;
  /** Mijoz topish kanallari cooldown'i: actionId → oxirgi ishlatilgan oy (fix-9) */
  clientActions: Record<string, number>;
  /** "Ish taklifi" (fix-12): clientId → oxirgi taklif oyi va boostlar soni */
  clientWork: Record<string, ClientWorkState>;
  escaped: boolean;
  bankrupt: boolean;
  ftCashflow: number;
  dreamId: string;
  /** orzu sotib olingan — endi uni DREAM_HOLD_MONTHS oy ushlab turish kerak (C3) */
  dreamBought: boolean;
  /** orzu ketma-ket ushlab turilgan oylar (naqd manfiy bo'lsa pauza) */
  dreamHeldMonths: number;
  turnsPlayed: number;
  escapeTurn: number | null;
  /* ---- Profil statistikasi (C2) — o'yin davomida yig'iladi ---- */
  /** boshlang'ich kvadrant (profil yozuvi uchun) */
  quadrantStart: Quadrant;
  /** ko'rilgan eng yuqori passiv daromad (FT oqimi bilan) */
  statMaxPassive: number;
  /** eng past / eng yuqori kredit reytingi */
  statMinCredit: number;
  statMaxCredit: number;
  /** bankrotliklar soni (shu o'yinda) */
  statBankruptcies: number;
  /** fix-13b (M1): Moliyaviy ustoz — shu o'yinda ochilgan dars id'lari */
  lessonsSeen: string[];
  /** fix-13b (M1): ketma-ket oylar — naqd > 3× xarajat, lekin ishlamay yotibdi */
  idleCashMonths: number;
}

/** Kechiktirilgan doodad — 3 oydan keyin narx ×1,12 bilan qaytadi. */
export interface DeferredDoodad {
  cardId: string;
  /** kechiktirilgan oy (GameState.month) */
  addedMonth: number;
  /** shu karta necha marta kechiktirilgan */
  count: number;
}

/* ---------------- Mijozlar tizimi (S/B kvadrant, B2) ---------------- */

/** Mijoz — S/B kvadrantdagi biznes oqimining bir qismi (oylik to'lov + sadoqat). */
export interface Client {
  id: string;
  name: string;
  /** oylik to'lov — biznes oqimining 8–15%-i atrofida */
  monthlyFee: number;
  /** sadoqat 1–5: eng past sadoqatli mijoz ketish xavfida birinchi */
  loyalty: number;
}

/** "Ish taklifi" mexanikasi holati (fix-12): har mijoz uchun cooldown + boostlar. */
export interface ClientWorkState {
  /** oxirgi ish taklif qilingan oy (cooldown: 1 oy) */
  lastMonth: number;
  /** muvaffaqiyatli boostlar soni (maks 2, har biri fee +20%) */
  boosts: number;
}

export interface LogEntry {
  id: number;
  round: number;
  icon: string;
  text: string;
  tone: "neutral" | "good" | "bad" | "gold";
}

/** fix-10 (F2): Bildirishnomalar markazi elementi — 🔔 paneldagi karta. */
export interface NotificationItem {
  id: number;
  /** aylana (ko'rsatish: "N-kun" chipi) */
  round: number;
  /** o'yinchining joriy oy kuni konteksti uchun oy raqami */
  month: number;
  icon: string;
  title: string;
  body: string;
  tone: "neutral" | "good" | "bad" | "gold";
}

export type ScreenState = "setup" | "ratrace" | "fasttrack" | "end";

export type EndVariant = "win" | "bankrupt" | "bot-win";

export interface GameState {
  version: 20;
  /** fix-13c (Q1): o'yin rejimi (oddiy/tez) */
  mode: GameMode;
  screen: ScreenState;
  /** fix-16 (X2): o'yin uslubi (default "classic"; "path" = yo'l xaritasi) */
  boardMode: BoardMode;
  /** fix-16 (X1): yo'l xaritasi holati (faqat boardMode==="path"; klassikda null) */
  path: import("./path").PathState | null;
  /** fix-17 (R2): reja rejimi holati (faqat boardMode==="plan"; boshqalarda null) */
  plan: import("./plan").PlanState | null;
  players: Player[];
  current: number;
  round: number;
  /** oy kalendari: nechinchi oy (0-katakdan o'tishda +1) */
  month: number;
  phase: TurnPhase;
  dice: [number, number];
  diceCount: 1 | 2;
  discarded: number;
  log: LogEntry[];
  /** fix-10 (F2): bildirishnomalar markazi (eng yangisi birinchi, max 50) */
  notifications: NotificationItem[];
  /** recently drawn Hodisa ids (cooldown — EVENT_COOLDOWN draws) */
  recentEvents: string[];
  /** active bozor yangiligi (news ticker) */
  news: ActiveNews | null;
  /** turns since game start (news drawn every NEWS_EVERY_TURNS) */
  newsCounter: number;
  /** recently drawn news ids */
  recentNews: string[];
  /** fond birjasi: joriy narxlar + 12 nuqtali tarix */
  exchange: ExchangeState;
  /** aktiv turlari bozor indekslari (1,0 = bazaviy; har oy drift) */
  marketIndices: Record<AssetKind, number>;
  endVariant: EndVariant | null;
  winnerId: number | null;
  /** g'alaba yo'li: orzu 3 oy ushlab turildi yoki +50 mln FT oqimi (C3) */
  winPath: "dream" | "cashflow" | null;
  spectating: boolean;
}

export type TurnPhase =
  | "idle"
  | "rolling"
  | "moving"
  | "resolving"
  | "awaiting-end"
  | "game-over";

export interface DealCard {
  id: string;
  title: string;
  kind: AssetKind;
  icon: string;
  price: number;
  down: number;
  /** net monthly cashflow added to income */
  cashflow: number;
  note: string;
  size: "small" | "big";
  /** for mortgage-backed deals (kvartira): income row + separate loan */
  grossIncome?: number;
  /** ipoteka: principal = price − down; oylik to'lov annuityPayment orqali hisoblanadi */
  loan?: { name: string; principal: number; monthlyRate: number; months: number };
  constructionTurns?: number;
  /** content tag for profession-tagged events & hero abilities (onlayn/chorva/dala/avto/qurilish/restoran/xizmat/savdo/talim) */
  tag?: string;
  /** xavf darajasi 1-5 (deals.json) */
  riskLevel?: number;
  /** likvidlik darajasi 1-5 (deals.json) */
  liquidity?: number;
  /** bozor taklifida sotish narxi ko'paytiruvchisi, % (assets.json resaleValuePercent) */
  resalePercent?: number;
  /** "riskli" bitim (kripto/oltin/startap) — Ziyoda qobiliyati uchun */
  risky?: boolean;
  /** bitimni sotib olish uchun minimal bilim darajasi (B3) */
  minKnowledge?: number;
}

export interface MarketCard {
  id: string;
  kind: AssetKind;
  factor: number;
  text: (assetTitle: string, offer: number) => string;
  icon: string;
}

export type EventEffect =
  | { type: "inflation"; pct: number }
  /** cash change; negative amounts in a category get hero expense discounts */
  | { type: "cash"; amount: number; category?: ExpenseCategory }
  | { type: "mortgage-discount" }
  | { type: "migration" }
  | { type: "freeze-business" }
  | { type: "tax-free" }
  /** pay/deduct only if player is a farmer (negative = loss) */
  | { type: "harvest"; farmerAmount: number }
  /** change market price of all assets of a kind by pct (guard: no-op if none) */
  | { type: "asset-value"; kind: AssetKind; pct: number }
  /** cash per owned asset of a kind (guard: no-op if none) */
  | { type: "cash-per-asset"; kind: AssetKind; amount: number }
  /** change monthly cashflow of all assets of a kind by pct, doimiy (guard) */
  | { type: "asset-income-pct"; kind: AssetKind; pct: number }
  /** all loan payments ±pct for N months (guard: no loans → no-op) */
  | { type: "loan-payments"; pct: number; months: number }
  /** cash only for players of matching profession field(s) */
  | { type: "field-cash"; fields: ProfessionField[]; amount: number }
  /** cash + doimiy maosh o'zgarishi, faqat mos kasb maydoni uchun */
  | { type: "field-cash-salary"; fields: ProfessionField[]; amount: number; salaryPct: number }
  /** cash if field matches AND player owns a tagged asset */
  | { type: "field-tag-cash"; fields: ProfessionField[]; tag: string; amount: number }
  /** temporary income modifier if field matches and player owns matching assets */
  | {
      type: "field-income-mod";
      fields: ProfessionField[];
      tag?: string;
      kind?: AssetKind;
      pct: number;
      months: number;
    }
  /** kredit taklifi hodisasi: naqd + annuitet qarz yaratiladi */
  | { type: "loan-offer"; name: string; principal: number; monthlyRate: number; months: number }
  /** xayriya katakchasini N aylanaga bloklash */
  | { type: "charity-block"; months: number }
  /** tasodifiy natija: `chance` ehtimol bilan amount yo'qotiladi */
  | { type: "cash-chance"; amount: number; chance: number }
  /** keyingi N bitimda "tahliliy" ROI badge (Investitsiya kursi) */
  | { type: "analyst-badge"; deals: number }
  /** bir martalik bitim chegirmasi kuponi (masalan, kvartira −10%) */
  | { type: "deal-coupon"; pct: number; kinds: AssetKind[] }
  /** bozor hodisasi → birja: shu sektorlardagi qog'ozlar narxi ±pct (darhol) */
  | { type: "securities-move"; sectors: Sector[]; pct: number }
  /** dividendlar ×mult, N oy davomida (oy kunida kamayadi) */
  | { type: "dividend-boost"; months: number; mult: number }
  /** IPO taklifi: chegirmali narxda maxQty donagacha sotib olish */
  | { type: "ipo-offer"; securityId: string; discountPct: number; maxQty: number }
  /** maosh × (1+pct/100); months null = doimiy (kvadrant hodisalari) */
  | { type: "salary-pct"; pct: number; months: number | null }
  /** naqd = joriy maosh × mult (yillik mukofot) */
  | { type: "cash-salary"; mult: number }
  /** xarajat qismiga doimiy oylik o'zgarish */
  | { type: "expense-part"; part: keyof ExpenseParts; amount: number }
  /** shu turdagi aktivlar daromadi ±pct, N oy (vaqtinchalik) */
  | { type: "asset-kind-income-mod"; kind: AssetKind; pct: number; months: number }
  /** vaqtinchalik qo'shimcha oylik xarajat (N oy) */
  | { type: "temp-expense"; title: string; amount: number; months: number }
  /** portfel maslahatchisi: keyingi N oy salbiy bozor hodisalari 50% yumshoq */
  | { type: "market-advice"; months: number }
  /** portfelning pct% ini joriy narxda sotish (birja holati kerak) */
  | { type: "portfolio-sell"; pct: number }
  /** so'm kursi tebranishi: import bizneslar −pct, eksport/texnologiya +pct (N oy) */
  | { type: "fx-swing"; downTags: string[]; upTags: string[]; pct: number; months: number }
  /** soliq tekshiruvi: aktivlar bozor qiymatining pct%-i (min so'mdan kam emas) */
  | { type: "asset-market-tax"; pct: number; min: number }
  /** refinansirlash: barcha kreditlar stavkasi −rateDelta/oy, to'lov qayta hisoblanadi */
  | { type: "refinance"; rateDelta: number }
  /** bilim darajasi +amount (ta'lim hodisalari, B3) */
  | { type: "knowledge"; amount: number }
  /** biznesga yangi mijoz qo'shiladi (B2) */
  | { type: "client-add"; name: string; monthlyFee: number; loyalty: number }
  /** eng past sadoqatli mijoz ketadi; menejer bo'lsa 50% qoladi (B2) */
  | { type: "client-leave" }
  /** hech qanday moliyaviy ta'sir yo'q (faqat hikoya/dars) */
  | { type: "nothing" };

/** Ikki tanlovli hodisa (dilemma) varianti — o'z effekti + natija + dars matni. */
export interface EventChoice {
  id: string;
  label: string;
  /** short effect preview shown under the label */
  hint: string;
  effect: EventEffect;
  /** ixtiyoriy ikkinchi effekt (masalan, naqd + badge) */
  effect2?: EventEffect;
  resultText: string;
  /** o'quv izohi — modal ostidagi "Dars:" blokida ko'rsatiladi */
  lessonText: string;
  /** tanlovdan keyin bozor taklifi kartasi ochiladi (meros — investitsiya) */
  drawMarket?: boolean;
}

export interface EventCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
  effect: EventEffect;
  /** o'quv izohi (bir effektli hodisalar uchun) */
  lessonText?: string;
  /** ikki tanlovli dilemma — effect o'rniga choices ishlatiladi */
  choices?: [EventChoice, EventChoice];
  /** faqat biznes aktiv egalariga taklif qilinadi */
  requiresBusiness?: boolean;
  /** faqat shu tegli aktiv (yoki avto krediti) egalariga taklif qilinadi */
  requiresTag?: string;
  /** faqat shu kvadrantdagi o'yinchilarga taklif qilinadi */
  requiresQuadrant?: Quadrant;
  /** faqat shu kvadrantlardan biridagi o'yinchilarga taklif qilinadi */
  requiresQuadrants?: Quadrant[];
  /** faqat farzandi bor o'yinchilarga taklif qilinadi */
  requiresChildren?: boolean;
  /** faqat naqdi manfiy o'yinchilarga taklif qilinadi */
  requiresNegativeCash?: boolean;
  /** minimal kredit reytingi talab qilinadi */
  requiresMinScore?: number;
  /** kamida 1 faol qarz talab qilinadi */
  requiresLoans?: boolean;
}

export interface DoodadCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
  cost: number;
  /** optional financed alternative */
  credit?: { down: number; principal: number; monthlyPayment: number; months: number };
  /** when cash < cost and no credit option: fully financed loan */
  forceLoan?: { principal: number; monthlyPayment: number };
  /** ixtiyoriy xarajat — rad etish mumkin */
  canDecline?: boolean;
  /** witty consequence shown when declined */
  declineText?: string;
  /** xarajat kategoriyasi (qahramon chegirmalari uchun) */
  category?: ExpenseCategory;
}

/* ---------------- Dam olish kuni (weekend) ---------------- */

export interface WeekendOption {
  label: string;
  /** tiny consequence text shown after the choice */
  note: string;
  /** immediate cost (0 = bepul) */
  cost: number;
  /** override cost when the player has children (oilaviy variant) */
  costIfChildren?: number;
  /** recurring expense: added as a 12-month installment-style plan */
  addInstallment?: { monthlyPayment: number; months: number };
}

export interface WeekendCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** to'lovli variant */
  spend: WeekendOption;
  /** bepul variant */
  free: WeekendOption;
}

/* ---------------- Hayotiy hodisa (life event) ---------------- */

export type LifeEventEffect =
  /** cash change; negative amounts in a category get hero expense discounts */
  | { type: "cash"; amount: number; category?: ExpenseCategory }
  /** salary × (1+pct/100); months null = doimiy, otherwise temporary */
  | { type: "salary-pct"; pct: number; months: number | null }
  /** different amount for a specific profession */
  | { type: "cash-profession"; amount: number; professionId: string; professionAmount: number; category?: ExpenseCategory }
  /** most expensive realestate asset's income frozen for N months */
  | { type: "freeze-top-realestate"; months: number }
  /** applies only if the player owns a business asset */
  | { type: "cash-if-business"; amount: number }
  /** applies if the player owns a tagged asset (or has the profession) */
  | { type: "cash-if-tag"; tags: string[]; amount: number; orProfessionId?: string };

export interface LifeEventCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
  effect: LifeEventEffect;
  /** faqat shu kvadrantdagi o'yinchilarga tushadi (masalan, lavozim ko'tarilishi — faqat E) */
  requiresQuadrant?: Quadrant;
}

/* ---------------- Kredit takliflari (standing loan offers) ---------------- */

export interface LoanOffer {
  id: string;
  title: string;
  desc: string;
  months: number;
  maxPrincipal: number;
  /** selectable principal amounts */
  amounts: number[];
  /** oylik foiz stavkasi — oylik to'lov annuitet formula bilan hisoblanadi */
  monthlyRate: number;
  /** only offered when the player owns at least one business asset */
  requiresBusiness?: boolean;
  /** minimal kredit reytingi (past bo'lsa taklif yopiq) */
  minScore?: number;
}

export interface Dream {
  id: string;
  title: string;
  /** fix-11 (F2): qisqa "shaxsiyat" tavsifi — setup picker va FT modalda ko'rinadi */
  desc: string;
  price: number;
  stripX: number; // crop offset into dreams-strip.png (0..4)
  /** oylik saqlash xarajati (Fast Track oy kunida yechiladi) */
  upkeep: number;
  /** orzu + biznes: oylik daromad (butik-mehmonxona) */
  income?: number;
  /** har oy ushlab turilgani uchun kredit reytingi bonusi (xayriya maktabi — obro') */
  creditPerMonth?: number;
}

export interface FTDeal {
  id: string;
  title: string;
  price: number;
  cashflow: number;
}

export interface Profession {
  id: string;
  name: string;
  flavor: string;
  avatar: string;
  field: ProfessionField;
  salary: number;
  expenses: number;
  loanPayment: number;
  savings: number;
  loans: {
    name: string;
    principal: number;
    monthlyPayment: number;
    /** o'z personaj formasi: haqiqiy annuitet shartlari */
    monthlyRate?: number;
    months?: number;
  }[];
  /** o'z personaj: foydalanuvchi kiritgan xarajatlar taqsimoti (yo'qsa splitExpenses) */
  expenseParts?: ExpenseParts;
}

/**
 * Oy kalendari — 30 katak = oyning 30 kuni, soat yo'nalishida yuqori-chap
 * burchakdan (index 0). Perimetr 9×8 (2×(9+8)−4 = 30); burchaklar: 0, 8, 15, 23.
 * Index 0 = Oy kun (oy boshi), index 15 = Avans (oy o'rtasi).
 * Dam olish kunlari shanba/yakshanba patternida: kun%7 6 yoki 0 bo'lgan
 * kunlar → indexlar 5, 6 (6–7-kun) va 19, 20 (20–21-kun).
 */
export const RAT_CELLS: CellType[] = [
  "payday", // 0 Oy kun (burchak, oy boshi)
  "opportunity", // 1
  "doodad", // 2
  "market", // 3
  "event", // 4 Hodisa
  "weekend", // 5 Dam olish kuni (6-kun, shanba)
  "weekend", // 6 Dam olish kuni (7-kun, yakshanba)
  "opportunity", // 7
  "market", // 8 (burchak)
  "event", // 9 Hodisa
  "opportunity", // 10
  "charity", // 11 Xayriya
  "doodad", // 12
  "market", // 13
  "opportunity", // 14
  "avans", // 15 Avans (burchak, oy o'rtasi)
  "event", // 16 Hodisa
  "doodad", // 17
  "opportunity", // 18
  "weekend", // 19 Dam olish kuni (20-kun, shanba)
  "weekend", // 20 Dam olish kuni (21-kun, yakshanba)
  "market", // 21
  "charity", // 22 Xayriya
  "opportunity", // 23 (burchak)
  "event", // 24 Hodisa
  "doodad", // 25
  "market", // 26
  "baby", // 27 Farzand
  "opportunity", // 28
  "downsized", // 29 Ishsizlik
];

/** game.md §5 — 16 Fast Track cells. Index 0 doubles as the lap start (payday). */
export const FT_CELLS: FTCellType[] = [
  "bonus", // 0 Naqd bonus (lap start)
  "business",
  "dream",
  "business",
  "business",
  "charity",
  "business",
  "dream",
  "business",
  "audit",
  "business",
  "dream",
  "business",
  "business",
  "business",
  "business",
];

/**
 * Katak palitrasi (fix-9 hero uslubi): zumrad — bitim, loy — xarajat/farzand,
 * oltin — ish haqi/avans/xayriya, binafsha — hodisa, salviya — bozor,
 * moviy — dam olish, slanets — ishsizlik.
 */
export const CELL_COLORS: Record<CellType, string> = {
  payday: "#D9A441",
  avans: "#C9A227",
  opportunity: "#2E7D5F",
  market: "#7FA05A",
  event: "#7A5CA8",
  charity: "#B98428",
  doodad: "#C9744C",
  baby: "#C24E4E",
  downsized: "#5A6B70",
  weekend: "#41788F",
};

/** Qisqa o'zbekcha katak nomlari (fix-9: kriptik kodlar o'rniga). */
export const CELL_CAPTIONS: Record<CellType, string> = {
  payday: "Ish haqi",
  avans: "Avans",
  opportunity: "Bitim",
  market: "Bozor",
  event: "Hodisa",
  charity: "Xayriya",
  doodad: "Xarajat",
  baby: "Farzand",
  downsized: "Ishsizlik",
  weekend: "Dam olish",
};

/** To'liq katak nomlari — hover/long-press tooltip uchun. */
export const CELL_FULL: Record<CellType, string> = {
  payday: "Oy kun — oylik naqd oqim (ish haqi) to'lanadi",
  avans: "Avans — maoshning 30%-i oldindan",
  opportunity: "Imkoniyat — kichik yoki katta bitim kartasi",
  market: "Bozor — aktivlarni sotish takliflari",
  event: "Hodisa — hayotiy burilish kartasi",
  charity: "Xayriya — ehson, keyingi yurishda 2 zar bonusi",
  doodad: "Kutilmagan xarajat — cho'ntakni bo'shatadi",
  baby: "Farzand tug'ildi — oila xarajatlari oshadi",
  downsized: "Ishsizlik — 2 yurish o'tkazib yuborasiz",
  weekend: "Dam olish kuni — zaryad yoki xarajat",
};

export const FT_CELL_COLORS: Record<FTCellType, string> = {
  bonus: "#D9A441",
  business: "#D9A441",
  dream: "#B98428",
  charity: "#C9744C",
  audit: "#5A6B70",
};

export const FT_CELL_CAPTIONS: Record<FTCellType, string> = {
  bonus: "Bonus",
  business: "Biznes",
  dream: "Orzu",
  charity: "Xayriya",
  audit: "Audit",
};

/** Fast Track katakchalari uchun to'liq tooltip nomlari. */
export const FT_CELL_FULL: Record<FTCellType, string> = {
  bonus: "Naqd bonus — aylana boshi",
  business: "Yirik biznes bitimi",
  dream: "Orzu katagi",
  charity: "Xayriya",
  audit: "Soliq auditi — to'lov",
};

export const SAVE_KEY = "oqim-save-v1";
/** eski brend saqlanma kaliti — bir marta o'qib, yangi kalitga ko'chiriladi (C1) */
export const OLD_SAVE_KEY = "cfuz-save-v1";
export const BEST_KEY = "cfuz-best";
export const SETTINGS_KEY = "cfuz-settings";
/** profil statistikasi kaliti (C2) */
export const PROFILE_KEY = "oqim-profile-v1";
/** Orzu g'alabasi: sotib olingach shuncha FT navbat (oy) ushlab turish kerak (C3). */
export const DREAM_HOLD_MONTHS = 3;

/** Fast Track win threshold: additional FT cashflow (game.md §5). */
export const FT_WIN_CASHFLOW = 50_000_000;
/** Fast Track payday multiplier (classic Cashflow rule). */
export const FT_PAYDAY_MULT = 100;
/**
 * Child monthly cost (game.md §3.3).
 * fix-15 (P4): bazaviy farzand xarajati (ta'limsiz) — 800 ming/oy;
 * bog'cha/maktab xarajati shunga qo'shimcha (childEduCost).
 */
export const CHILD_COST = 800_000;
export const MAX_CHILDREN = 3;
/** fix-15 (P3): farzandlar orasidagi minimal oraliq — 2 yil (24 oy). */
export const BABY_MIN_GAP_MONTHS = 24;
/** fix-15 (P4): bog'cha yoshi (3 yil = 36 oy) va maktab yoshi (7 yil = 84 oy). */
export const KINDERGARTEN_AGE_MONTHS = 36;
export const SCHOOL_AGE_MONTHS = 84;
/** fix-15 (P4): ta'lim tanlovlarining oylik xarajati. */
export const CHILD_EDU_COSTS: Record<ChildEdu, number> = {
  none: 0,
  "kg-state": 400_000,
  "kg-private": 1_200_000,
  "sch-state": 300_000,
  "sch-plus": 800_000,
  "sch-private": 2_500_000,
};
/** Bank loan interest (game.md §3.3 Imkoniyat). */
export const LOAN_RATE_YEAR = 0.3;
/** Bank qarzi muddati (oy). */
export const BANK_LOAN_MONTHS = 24;
/** Emergency loan interest (game.md §6). */
export const EMERGENCY_RATE_YEAR = 0.4;
/** Shoshilinch qarz muddati (oy). */
export const EMERGENCY_LOAN_MONTHS = 12;
/** Bitim ipotekasi (kvartira): 22%/yil, 15 yil. */
export const MORTGAGE_RATE_YEAR = 0.22;
export const MORTGAGE_MONTHS = 180;
/** Meros kelib chiqqan/eski qarzlar uchun standart oylik stavka (18%/yil). */
export const DEFAULT_LOAN_MONTHLY_RATE = 0.015;
/** Fast Track shartlari (bosqichli erkinlik tizimi). */
export const ESCAPE_STREAK_NEEDED = 2;
/** fix-13c (Q1): Tez rejim — erkinlik uchun 1 oy streak kifoya. */
export const TEZ_STREAK_NEEDED = 1;
/** fix-13c (Q1): Tez rejim boshlang'ich naqd ko'paytiruvchisi. */
export const TEZ_CASH_MULT = 1.5;
export const ESCAPE_MIN_ASSETS = 2;
export const ESCAPE_MAX_DEBT_LOAD = 0.5;
/** Bosqich 1 (Moliyaviy xavfsizlik): naqd ≥ shu × oylik xarajatlar. */
export const SAFETY_CASH_MULT = 3;
/** Forced-sell discount during bankruptcy (game.md §6). */
export const FORCED_SELL_FACTOR = 0.5;

/* fix-14 (T1): qarindoshlardan foizsiz qarz */
/** minimal qarz summasi */
export const QARZ_MIN = 500_000;
/** maksimal qarz = oylik umumiy daromad (maosh+passiv) × shu koeffitsiyent */
export const QARZ_INCOME_MULT = 2;
/** taklif qilinadigan muddatlar (oy) */
export const QARZ_MONTHS: readonly number[] = [3, 6, 12];
/** kechiktirilgan qarz uchun obro' zarari */
export const SCORE_QARZ_LATE = -40;
/** kechiktirilganda yangi qarz shuncha oyga bloklanadi */
export const QARZ_BLOCK_MONTHS = 12;

/* fix-14 (T2): shoshilinch sotuv — likvidlikka ko'ra shoshilinch chegirma */
export const URGENCY_FACTORS: Record<number, number> = { 1: 0.7, 2: 0.78, 3: 0.85, 4: 0.9, 5: 0.95 };
/** Hayotiy hodisa: chance to draw after each Oy kun (payday). */
export const LIFE_EVENT_CHANCE = 0.12;
/** "Zaryad" bonus: paid for ≥3 distinct weekend activities in one game. */
export const ZARYAD_BONUS = 2_000_000;
export const ZARYAD_THRESHOLD = 3;
/** "Bo'lib to'lash" installment plan: total markup over the remaining price. */
export const INSTALLMENT_MARKUP = 0.1;
/** Installment plan duration (months). */
export const INSTALLMENT_MONTHS = 12;
/** Installment plan is not offered for deals at or below this price. */
export const INSTALLMENT_MIN_PRICE = 5_000_000;
/** Hodisa cooldown: same event can't reappear within this many draws. */
export const EVENT_COOLDOWN = 10;
/** Bozor yangiliklari: har shuncha navbatda yangi sarlavha chiquadi. */
export const NEWS_EVERY_TURNS = 3;
/** Yangi sarlavha shuncha navbat faol qoladi. */
export const NEWS_DURATION = 3;
/** Bozor yangiliklari cooldown (takrorlanmaslik uchun). */
export const NEWS_COOLDOWN = 6;

/* ---------------- Aktiv risklari (fix-13c, Q3) ---------------- */
/** riskLevel ≥ 3 aktiv uchun "yomon oy" bazaviy ehtimoli: (riskLevel−2) × shu %. */
export const RISK_BAD_MONTH_PCT = 4;
/** "riskli" aktivlar uchun oyiga inqiroz (3 oyga daromad ×0,5) ehtimoli. */
export const RISKY_CRISIS_CHANCE = 0.02;
/** Inqiroz davomiyligi (oy) va ko'paytiruvchisi. */
export const RISKY_CRISIS_MONTHS = 3;
export const RISKY_CRISIS_MULT = 0.5;
/** "Yomon oy" sabablari — navbatma-navbat ishlatiladi. */
export const RISK_BAD_REASONS = ["mijoz kamligi", "ta'mir ishlari", "mavsum pasayishi", "raqobat kuchaydi"];

/* ---------------- Kredit reytingi (credit score) ---------------- */
export const CREDIT_SCORE_MIN = 300;
export const CREDIT_SCORE_MAX = 850;
export const CREDIT_SCORE_START = 650;
/** Qarzli o'z personaj boshlang'ich reytingi. */
export const CREDIT_SCORE_START_INDEBTED = 600;
export const SCORE_ONTIME = 3;
export const SCORE_PENYA = -30;
export const SCORE_NEW_LOAN = -5;
export const SCORE_CLOSED = 15;
export const SCORE_EMERGENCY = -20;
export const SCORE_BANKRUPTCY = -150;
/** Bitimni kreditga olish uchun minimal reyting. */
export const SCORE_DEAL_MIN = 600;
/** Doodad krediti uchun minimal reyting. */
export const SCORE_DOODAD_MIN = 550;
/** Garovga yaroqlilik: minimal qayta sotuv foizi. */
export const COLLATERAL_MIN_RESALE = 60;
/** Kredit takliflari: maksimal summa = shu × oylik daromad. */
export const LOAN_INCOME_CAP_MULT = 6;

/* ---------------- Penya ---------------- */
/** Kechiktirilgan to'lovning shu foizi qarz qoldig'iga qo'shiladi. */
export const PENYA_RATE = 0.05;
/** Penya faqat yetishmovchilik oylik kredit to'lovlarining shu ulushigacha bo'lsa. */
export const PENYA_MAX_SHORTFALL_PCT = 0.2;
/** Shu marta ketma-ket penyadan keyin bankrotlik oqimi. */
export const PENYA_MAX_STREAK = 2;

/* ---------------- Doodad krediti (annuitet 12 oy, 24%/yil) ---------------- */
export const DOODAD_CREDIT_MONTHLY_RATE = 0.02;
export const DOODAD_CREDIT_MONTHS = 12;

/** Ishsizlik davomiyligi (oy kunlari). */
export const UNEMPLOYED_MONTHS = 2;

/* ---------------- Oy kalendari (30 katak = 30 kun) ---------------- */
/** Rat Race doskasi perimetri: 9 keng × 8 baland (burchaklar 0, 8, 15, 23). */
export const RAT_BOARD_COLS = 9;
export const RAT_BOARD_ROWS = 8;
/** Avans katakchasi indeksi (oy o'rtasi, burchak). */
export const AVANS_INDEX = 15;
/** Avans: effektiv oylik maoshning shu ulushi naqd beriladi. */
export const AVANS_RATE = 0.3;
/** Dam olish kuni katakchasiga tushganda avtomatik uy xarajati ehtimoli. */
export const HOME_EXPENSE_CHANCE = 0.3;
export const HOME_EXPENSE_MIN = 150_000;
export const HOME_EXPENSE_MAX = 600_000;

/* ---------------- Bozor indekslari (aktiv bozor qiymati) ---------------- */
/** Har oy indeks random(MARKET_DRIFT_MIN, MARKET_DRIFT_MAX) + yangilik biasi bilan drift qiladi. */
export const MARKET_DRIFT_MIN = -0.04;
export const MARKET_DRIFT_MAX = 0.06;
export const MARKET_INDEX_MIN = 0.5;
export const MARKET_INDEX_MAX = 2.0;
/** Aktiv turi → bozor sektori nomi (yangilik biasi mappingi uchun). */
export const ASSET_SECTORS: Record<AssetKind, string> = {
  realestate: "mulk",
  business: "biznes",
  stock: "aksiya",
  currency: "valyuta",
  deposit: "depozit",
  bonds: "obligatsiya",
};

/* ---------------- Istalgan payt sotish (likvidlik) ---------------- */
/** Likvidlik darajasi → sotish narx ko'paytiruvchisi (yo'qsa 3 deb olinadi). */
export const LIQUIDITY_FACTORS: Record<number, number> = {
  1: 0.8,
  2: 0.88,
  3: 0.93,
  4: 0.97,
  5: 1.0,
};
export const DEFAULT_LIQUIDITY = 3;

/* ---------------- Doodad kechiktirish ("Keyinroq olaman") ---------------- */
/** Har o'yinchiga o'yin davomida maksimal kechiktirishlar soni. */
export const MAX_DOODAD_DEFERS = 2;
/** Kechiktirilgan xarajat shuncha oydan keyin qaytadi. */
export const DEFER_RETURN_MONTHS = 3;
/** Qaytganda narx ustamasi (×1,12). */
export const DEFER_PRICE_MARKUP = 0.12;

/* ---------------- Kredit boshqaruvi ---------------- */
/** "To'liq yopish" (muddatidan oldin, qo'lda) reyting bonusi. */
export const SCORE_EARLY_PAYOFF = 5;

/* ---------------- Erkinlik qayta ta'rifi (A7) ---------------- */
/** Bosqich 3 (Erkinlik): passiv daromad ≥ shu × oylik xarajatlar. */
export const ESCAPE_PASSIVE_MULT = 1.2;
/** Maosh oshirilganda xarajatlarning o'sish koeffitsiyenti (lifestyle inflation). */
export const LIFESTYLE_INFLATION_RATE = 0.4;

/* ---------------- Kvadrant progressiyasi (B1) ---------------- */
/** E→S o'tishi uchun talab qilinadigan minimal bilim darajasi. */
export const QUADRANT_S_MIN_KNOWLEDGE = 2;
/** S→B o'tishi uchun talab qilinadigan minimal aktivlar soni. */
export const QUADRANT_B_MIN_ASSETS = 2;
/** B→I o'tishi uchun talab qilinadigan birja portfeli qiymati. */
export const QUADRANT_I_PORTFOLIO = 100_000_000;

/* ---------------- Bilim darajasi (B3) ---------------- */
export const KNOWLEDGE_MIN = 1;
export const KNOWLEDGE_MAX = 5;

/* ---------------- Mijozlar tizimi (B2) ---------------- */
/** Menejersiz faol mijozlar chegarasi. */
export const CLIENT_CAP_NO_MANAGER = 3;
/** Biznes aktiv sotib olinganda qo'shiladigan mijozlar soni (min–max). */
export const CLIENT_COUNT_MIN = 1;
export const CLIENT_COUNT_MAX = 3;
/** Mijoz oylik to'lovi — biznes oqimining shu foizi oralig'ida. */
export const CLIENT_FEE_MIN_PCT = 8;
export const CLIENT_FEE_MAX_PCT = 15;
/** Mijoz sadoqati diapazoni. */
export const CLIENT_LOYALTY_MIN = 1;
export const CLIENT_LOYALTY_MAX = 5;
/** Menejer yollash narxi = shu × jami oylik xarajatlar (bir martalik). */
export const MANAGER_COST_EXPENSE_MULT = 2;
/** Menejer mijozni ushlab qolish ehtimoli (mijoz ketish hodisasida). */
export const MANAGER_RETAIN_CHANCE = 0.5;

/* ---------------- Maosh indeksatsiyasi (B5) ---------------- */
/** Har shuncha oyda maosh indeksatsiya qilinadi (E/S kvadrantlar). */
export const SALARY_INDEX_MONTHS = 12;
/** Indeksatsiya foizi (+6%). */
export const SALARY_INDEX_PCT = 0.06;
