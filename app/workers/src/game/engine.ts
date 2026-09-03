/**
 * OQIM — game engine (pure logic, no UI).
 * Functions mutate a draft Player/GameState — the controller clones state first.
 */
import type {
  ActiveNews,
  Asset,
  AssetKind,
  ChildEdu,
  ChildRecord,
  Client,
  DealCard,
  DeferredDoodad,
  Difficulty,
  Dream,
  DoodadCard,
  EventCard,
  ExpenseParts,
  GameMode,
  GameState,
  LifeEventCard,
  Loan,
  LoanOffer,
  LogEntry,
  NotificationItem,
  MarketCard,
  Player,
  Profession,
  ProfessionField,
  Quadrant,
  WeekendCard,
} from "./types";
import {
  AVANS_RATE,
  BABY_MIN_GAP_MONTHS,
  BANK_LOAN_MONTHS,
  CHILD_COST,
  CHILD_EDU_COSTS,
  KINDERGARTEN_AGE_MONTHS,
  SCHOOL_AGE_MONTHS,
  CLIENT_CAP_NO_MANAGER,
  CLIENT_COUNT_MAX,
  CLIENT_COUNT_MIN,
  CLIENT_FEE_MAX_PCT,
  CLIENT_FEE_MIN_PCT,
  CLIENT_LOYALTY_MAX,
  CLIENT_LOYALTY_MIN,
  COLLATERAL_MIN_RESALE,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  CREDIT_SCORE_START,
  CREDIT_SCORE_START_INDEBTED,
  DEFAULT_LIQUIDITY,
  DEFAULT_LOAN_MONTHLY_RATE,
  DEFER_PRICE_MARKUP,
  DEFER_RETURN_MONTHS,
  DREAM_HOLD_MONTHS,
  DOODAD_CREDIT_MONTHLY_RATE,
  DOODAD_CREDIT_MONTHS,
  EMERGENCY_LOAN_MONTHS,
  EMERGENCY_RATE_YEAR,
  ESCAPE_MAX_DEBT_LOAD,
  ESCAPE_MIN_ASSETS,
  ESCAPE_PASSIVE_MULT,
  ESCAPE_STREAK_NEEDED,
  RISKY_CRISIS_CHANCE,
  RISKY_CRISIS_MONTHS,
  RISKY_CRISIS_MULT,
  RISK_BAD_MONTH_PCT,
  RISK_BAD_REASONS,
  TEZ_STREAK_NEEDED,
  FT_PAYDAY_MULT,
  FT_WIN_CASHFLOW,
  HOME_EXPENSE_CHANCE,
  HOME_EXPENSE_MAX,
  HOME_EXPENSE_MIN,
  INSTALLMENT_MARKUP,
  INSTALLMENT_MIN_PRICE,
  INSTALLMENT_MONTHS,
  KNOWLEDGE_MAX,
  KNOWLEDGE_MIN,
  LIFESTYLE_INFLATION_RATE,
  LIQUIDITY_FACTORS,
  LOAN_INCOME_CAP_MULT,
  LOAN_RATE_YEAR,
  MANAGER_COST_EXPENSE_MULT,
  MANAGER_RETAIN_CHANCE,
  MARKET_DRIFT_MAX,
  MARKET_DRIFT_MIN,
  MARKET_INDEX_MAX,
  MARKET_INDEX_MIN,
  MAX_CHILDREN,
  MAX_DOODAD_DEFERS,
  PENYA_MAX_SHORTFALL_PCT,
  PENYA_MAX_STREAK,
  PENYA_RATE,
  QARZ_BLOCK_MONTHS,
  QARZ_INCOME_MULT,
  QARZ_MIN,
  QARZ_MONTHS,
  QUADRANT_B_MIN_ASSETS,
  QUADRANT_I_PORTFOLIO,
  QUADRANT_S_MIN_KNOWLEDGE,
  RAT_CELLS,
  SAFETY_CASH_MULT,
  SALARY_INDEX_MONTHS,
  SALARY_INDEX_PCT,
  SCORE_CLOSED,
  SCORE_DEAL_MIN,
  SCORE_DOODAD_MIN,
  SCORE_EARLY_PAYOFF,
  SCORE_EMERGENCY,
  SCORE_NEW_LOAN,
  SCORE_ONTIME,
  SCORE_PENYA,
  SCORE_QARZ_LATE,
  UNEMPLOYED_MONTHS,
  URGENCY_FACTORS,
  ZARYAD_BONUS,
  ZARYAD_THRESHOLD,
} from "./types";
import { CLIENT_NAMES, DOODAD_CARDS, DREAMS, EVENT_CARDS, HOME_EXPENSES, LIFE_EVENTS, PROFESSIONS } from "./data";
import { abilityOf, expenseDiscountPct, heroById } from "./heroes";
import { newsById, newsMatches } from "./news";
import {
  buySecurity,
  makeExchangeState,
  movePrices,
  portfolioDividends,
  portfolioValue,
  securityById,
  sellSecurity,
  tradeFee,
} from "./exchange";
import type { ExchangeState, BoardMode } from "./types";
import { generatePath } from "./path";
import { makePlanState } from "./plan";
import { formatUZSCompact } from "./format";

let uid = 1;
export const nextId = () => uid++;

/* ---------------- Construction ---------------- */

/**
 * Annuitet oylik to'lov: PMT = P · r(1+r)^n / ((1+r)^n − 1).
 * Butun so'mga yaxlitlanadi; r = 0 bo'lsa P/n.
 */
export function annuityPayment(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return Math.round(principal / months);
  const k = Math.pow(1 + monthlyRate, months);
  return Math.round((principal * monthlyRate * k) / (k - 1));
}

/**
 * Yangi annuitet krediti yaratish: to'lov formula orqali hisoblanadi,
 * qoldiq va muddat to'liq to'ldiriladi.
 */
export function createLoan(
  id: string,
  name: string,
  principal: number,
  monthlyRate: number,
  months: number
): Loan {
  return {
    id,
    name,
    principal,
    monthlyPayment: annuityPayment(principal, monthlyRate, months),
    monthlyRate,
    remainingMonths: months,
    remainingBalance: principal,
    totalMonths: months,
  };
}

/**
 * Meros/fikselangan to'lovli qarzlar (kasb, qahramon, doodad kreditlari) uchun
 * amortizatsiya shartlarini keltirib chiqarish: berilgan oylik to'lov saqlanadi.
 * `months` berilsa — to'lovga mos yashirin stavka (bisection) topiladi;
 * berilmasa — DEFAULT_LOAN_MONTHLY_RATE stavkada muddat hisoblanadi.
 */
export function amortizeTerms(
  principal: number,
  monthlyPayment: number,
  months?: number
): Pick<Loan, "monthlyPayment" | "monthlyRate" | "remainingMonths" | "remainingBalance" | "totalMonths"> {
  if (principal <= 0 || monthlyPayment <= 0) {
    return { monthlyPayment: 0, monthlyRate: 0, remainingMonths: 0, remainingBalance: 0, totalMonths: 0 };
  }
  if (months !== undefined && months > 0) {
    // to'lov × muddat ≤ principal → foizsiz (r = 0)
    if (monthlyPayment * months <= principal) {
      return { monthlyPayment, monthlyRate: 0, remainingMonths: months, remainingBalance: principal, totalMonths: months };
    }
    let lo = 1e-6;
    let hi = 0.2;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (annuityPayment(principal, mid, months) < monthlyPayment) lo = mid;
      else hi = mid;
    }
    const monthlyRate = (lo + hi) / 2;
    return { monthlyPayment, monthlyRate, remainingMonths: months, remainingBalance: principal, totalMonths: months };
  }
  const r = DEFAULT_LOAN_MONTHLY_RATE;
  if (monthlyPayment <= principal * r) {
    // to'lov foizni ham qoplamaydi — 60 oyga annuitet qayta hisoblanadi
    const n = 60;
    return {
      monthlyPayment: annuityPayment(principal, r, n),
      monthlyRate: r,
      remainingMonths: n,
      remainingBalance: principal,
      totalMonths: n,
    };
  }
  const n = Math.max(
    1,
    Math.min(600, Math.round(Math.log(monthlyPayment / (monthlyPayment - principal * r)) / Math.log(1 + r)))
  );
  return { monthlyPayment, monthlyRate: r, remainingMonths: n, remainingBalance: principal, totalMonths: n };
}

/** Split a profession's base expenses (excl. loan payments) into statement rows. */
export function splitExpenses(total: number): ExpenseParts {
  const taxes = Math.round(total * 0.2);
  const housing = Math.round(total * 0.3);
  const food = Math.round(total * 0.25);
  const transport = Math.round(total * 0.12);
  const other = total - taxes - housing - food - transport;
  return { taxes, housing, food, transport, other };
}

/**
 * Lifestyle inflation (A7): maosh o'sish nisbatining 40%-i xarajatlarga ham
 * ko'chadi — har bir xarajat kategoriyasi 1 + 0,4 × growthRatio ga ko'payadi.
 */
export function scaleExpensesForRaise(p: Player, growthRatio: number) {
  if (!(growthRatio > 0)) return;
  const k = 1 + LIFESTYLE_INFLATION_RATE * growthRatio;
  const e = p.expenseParts;
  p.expenseParts = {
    taxes: Math.round(e.taxes * k),
    housing: Math.round(e.housing * k),
    food: Math.round(e.food * k),
    transport: Math.round(e.transport * k),
    other: Math.round(e.other * k),
  };
}

/**
 * Maoshni oshirishning markaziy nuqtasi (lavozim ko'tarilishi, indeksatsiya):
 * yangi maosh o'rnatiladi va xarajatlar lifestyle inflation bilan ko'payadi.
 */
export function applySalaryRaise(p: Player, newSalary: number) {
  const old = p.salary;
  if (old > 0 && newSalary > old) scaleExpensesForRaise(p, newSalary / old - 1);
  p.salary = Math.round(newSalary);
}

/* ---------------- Bilim darajasi (B3) ---------------- */

/**
 * Bilim darajasini oshirish (1–5 oralig'ida qisiladi). Haqiqiy qo'shilgan
 * miqdor qaytariladi (chegarada 0).
 */
export function gainKnowledge(p: Player, amount = 1): number {
  const before = p.knowledge;
  p.knowledge = Math.max(KNOWLEDGE_MIN, Math.min(KNOWLEDGE_MAX, Math.round(p.knowledge + amount)));
  return p.knowledge - before;
}

/**
 * Bitim orqali bilim: har AssetKind'dan faqat bir marta +1.
 * true = bilim berildi, false = bu turdan allaqachon olingan.
 */
export function knowledgeFromDeal(p: Player, kind: AssetKind): boolean {
  if (p.knowledgeFromDeals.includes(kind)) return false;
  p.knowledgeFromDeals.push(kind);
  gainKnowledge(p, 1);
  return true;
}

/** Bitim bilim talabiga to'g'ri kelmaydi (minKnowledge'dan past) — sotib olish bloklangan. */
export function dealKnowledgeLocked(p: Player, deal: DealCard): boolean {
  return deal.minKnowledge !== undefined && p.knowledge < deal.minKnowledge;
}

export function makePlayer(
  id: number,
  name: string,
  profession: Profession,
  opts: {
    isBot: boolean;
    personality: Player["personality"];
    colorIndex: Player["colorIndex"];
    dreamId: string;
    heroId?: string | null;
    customField?: ProfessionField | null;
    /** Moliyaviy kvadrant (default "E") */
    quadrant?: Quadrant;
    /** boshlang'ich kredit reytingi (default: qarzli o'z personaj 600, boshqalar 650) */
    creditScore?: number;
    /** fix-15 (P2): qiyinlik darajasi (default "medium") */
    difficulty?: Difficulty;
    /** fix-15 (P2): boshlang'ich naqd ko'paytiruvchisi (qiyinlik override: Oson ×1,3 / Qiyin ×0,8) */
    startCashMult?: number;
    /** fix-15 (P2): boshlang'ich maosh ko'paytiruvchisi (Qiyin override: ×0,95 — "past stavka") */
    salaryMult?: number;
    /** fix-13c (Q1): boshlang'ich naqd ko'paytiruvchisi (Tez rejim: 1,5) */
    cashMult?: number;
  }
): Player {
  const cashMult = (opts.startCashMult ?? 1) * (opts.cashMult ?? 1);
  const salMult = opts.salaryMult ?? 1;
  return {
    id,
    name,
    isBot: opts.isBot,
    personality: opts.personality,
    professionId: profession.id,
    heroId: opts.heroId ?? null,
    customField: opts.customField ?? null,
    quadrant: opts.quadrant ?? "E",
    creditScore:
      opts.creditScore ??
      (profession.id === "custom" && profession.loans.some((l) => l.principal > 0)
        ? CREDIT_SCORE_START_INDEBTED
        : CREDIT_SCORE_START),
    unemployedMonths: 0,
    penyaStreak: 0,
    marketAdviceMonths: 0,
    avatar: profession.avatar,
    colorIndex: opts.colorIndex,
    position: 0,
    ftPosition: 0,
    cash: Math.round(profession.savings * cashMult),
    salary: Math.round(profession.salary * salMult),
    expenseParts: profession.expenseParts ?? splitExpenses(profession.expenses),
    children: 0,
    children2: [],
    pendingChildEvent: null,
    lastBabyMonth: -BABY_MIN_GAP_MONTHS,
    difficulty: opts.difficulty ?? "medium",
    loans: profession.loans.map((l, i) =>
      l.monthlyRate !== undefined && l.months !== undefined
        ? createLoan(`start-${id}-${i}`, l.name, l.principal, l.monthlyRate, l.months)
        : {
            id: `start-${id}-${i}`,
            name: l.name,
            principal: l.principal,
            ...amortizeTerms(l.principal, l.monthlyPayment),
          }
    ),
    installments: [],
    assets:
      (opts.quadrant ?? "E") === "B"
        ? [
            {
              id: `business-${id}`,
              title: "Mavjud kichik biznes",
              kind: "business",
              icon: "Store",
              price: 200_000_000,
              paid: 70_000_000,
              monthlyRevenue: 30_000_000,
              monthlyOperatingCosts: 16_000_000,
              monthlyCashflow: 14_000_000,
              employees: 3,
              tag: "savdo",
              resalePercent: 70,
              liquidity: 3,
              buyIndex: 1,
              riskLevel: 2,
            },
          ]
        : [],
    portfolio: [],
    dividendBoost: null,
    charityTurns: 0,
    skipTurns: 0,
    taxFreeTurns: 0,
    freezeBusinessTurns: 0,
    salaryMultiplier: 1,
    salaryMonths: null,
    loanPaymentMod: null,
    assetModifiers: [],
    weekendSpends: [],
    zaryadClaimed: false,
    mortgageDiscount: false,
    dealCoupon: null,
    analystDealsLeft: 0,
    charityBlockedTurns: 0,
    usedEmergencyLoan: false,
    qarzBlockedUntil: 0,
    avansTakenThisMonth: false,
    planSalaryScale: 1,
    planWeekIdx: 0,
    avansReceived: 0,
    deferredDoodads: [],
    deferCount: 0,
    escapeStreak: 0,
    knowledge: KNOWLEDGE_MIN,
    knowledgeFromDeals: [],
    clients:
      (opts.quadrant ?? "E") === "B"
        ? [{ id: `client-${id}`, name: "Mahalliy doimiy mijoz", monthlyFee: 1_800_000, loyalty: 4 }]
        : [],
    hasManager: false,
    knowledgeActions: {},
    clientActions: {},
    clientWork: {},
    escaped: false,
    bankrupt: false,
    ftCashflow: 0,
    dreamId: opts.dreamId,
    dreamBought: false,
    dreamHeldMonths: 0,
    turnsPlayed: 0,
    escapeTurn: null,
    quadrantStart: opts.quadrant ?? "E",
    statMaxPassive: 0,
    statMinCredit:
      opts.creditScore ??
      (profession.id === "custom" && profession.loans.some((l) => l.principal > 0)
        ? CREDIT_SCORE_START_INDEBTED
        : CREDIT_SCORE_START),
    statMaxCredit:
      opts.creditScore ??
      (profession.id === "custom" && profession.loans.some((l) => l.principal > 0)
        ? CREDIT_SCORE_START_INDEBTED
        : CREDIT_SCORE_START),
    statBankruptcies: 0,
    // fix-13b (M1): Moliyaviy ustoz
    lessonsSeen: [],
    idleCashMonths: 0,
  };
}

/** Boshlang'ich bozor indekslari — barcha aktiv turlari 1,0 dan. */
export function makeMarketIndices(): Record<AssetKind, number> {
  return { business: 1, realestate: 1, stock: 1, currency: 1, deposit: 1, bonds: 1 };
}

export function makeGame(players: Player[], boardMode: BoardMode = "classic", mode: GameMode = "classic"): GameState {
  return {
    version: 20,
    mode,
    screen: "ratrace",
    boardMode,
    path: boardMode === "path" ? generatePath() : null,
    plan: boardMode === "plan" ? makePlanState() : null,
    players,
    current: 0,
    round: 1,
    month: 1,
    phase: "idle",
    dice: [1, 1],
    diceCount: 1,
    discarded: 0,
    log: [],
    notifications: [],
    recentEvents: [],
    news: null,
    newsCounter: 0,
    recentNews: [],
    exchange: makeExchangeState(),
    marketIndices: makeMarketIndices(),
    endVariant: null,
    winnerId: null,
    winPath: null,
    spectating: false,
  };
}

/* ---------------- Derived finances ---------------- */

/**
 * Bozor yangiliklari (news ticker) income multiplier for one asset.
 * Ziyoda's "Xavf tahlili" softens negative headlines by 50%.
 */
export function newsMultiplier(p: Player, a: Asset, news: ActiveNews | null | undefined): number {
  if (!news) return 1;
  const h = newsById(news.id);
  if (!h || !newsMatches(h, a)) return 1;
  let pct = h.pct;
  if (pct < 0) {
    for (const m of abilityOf(p).modifiers) {
      if (m.type === "negative-event-soften") pct = Math.round(pct * (1 - m.pct / 100));
    }
  }
  return 1 + pct / 100;
}

export interface FinanceOpts {
  forPayday?: boolean;
  news?: ActiveNews | null;
  /** birja holati — portfel dividendlarini passiv daromadga qo'shadi */
  exchange?: ExchangeState;
  /** fix-13c (Q1): o'yin rejimi — tez rejimda streak talabi 1 */
  mode?: GameMode;
}

/** fix-13c (Q1): rejimga qarab erkinlik streak talabi (tez = 1). */
export function streakNeeded(mode?: GameMode): number {
  return mode === "tez" ? TEZ_STREAK_NEEDED : ESCAPE_STREAK_NEEDED;
}

/** Effective monthly cashflow of one asset after temporary income modifiers + news. */
export function assetCashflow(p: Player, a: Asset, news?: ActiveNews | null): number {
  if (a.constructionLeft && a.constructionLeft > 0) return 0;
  let v = a.monthlyCashflow;
  for (const m of p.assetModifiers) {
    if (m.assetId === a.id) v = Math.round(v * m.multiplier);
  }
  const nm = newsMultiplier(p, a, news);
  if (nm !== 1) v = Math.round(v * nm);
  return v;
}

/* ---------------- Mijozlar tizimi (B2) ---------------- */

/**
 * Faol mijozlar: menejersiz eng ko'p CLIENT_CAP_NO_MANAGER ta (yuqori to'lovli
 * mijozlar saqlanadi); menejer yollanganda cheklov yo'q.
 */
export function effectiveClients(p: Player): Client[] {
  if (p.hasManager) return p.clients;
  return [...p.clients].sort((a, b) => b.monthlyFee - a.monthlyFee).slice(0, CLIENT_CAP_NO_MANAGER);
}

/** Mijozlardan oylik passiv daromad (faol mijozlar to'lovlari yig'indisi). */
export function clientIncome(p: Player): number {
  return effectiveClients(p).reduce((s, c) => s + c.monthlyFee, 0);
}

/** Menejer yollash narxi: MANAGER_COST_EXPENSE_MULT × jami oylik xarajatlar (bir martalik). */
export function managerCost(p: Player): number {
  return Math.round(totalExpenses(p) * MANAGER_COST_EXPENSE_MULT);
}

/**
 * Menejer yollash: mijozlar soni cheklovi olib tashlanadi (B kvadrantiga
 * o'tish sharti ham). Narx to'langan bo'lsa true, aks holda false.
 */
export function hireManager(p: Player): boolean {
  if (p.hasManager) return false;
  const cost = managerCost(p);
  if (p.cash < cost) return false;
  p.cash -= cost;
  p.hasManager = true;
  return true;
}

/**
 * Biznes aktiv sotib olinganda yangi mijozlar: CLIENT_COUNT_MIN–MAX ta,
 * har birining to'lovi aktiv oqimining CLIENT_FEE_MIN_PCT–MAX_PCT %-i,
 * sadoqati CLIENT_LOYALTY_MIN–MAX. Qo'shilgan mijozlar qaytariladi.
 */
export function addClientsForAsset(p: Player, asset: Asset, rand: () => number = Math.random): Client[] {
  const count = CLIENT_COUNT_MIN + Math.floor(rand() * (CLIENT_COUNT_MAX - CLIENT_COUNT_MIN + 1));
  const added: Client[] = [];
  const usedNames = new Set(p.clients.map((c) => c.name));
  for (let i = 0; i < count; i++) {
    const pool = CLIENT_NAMES.filter((n) => !usedNames.has(n));
    const name =
      pool.length > 0
        ? pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
        : CLIENT_NAMES[Math.floor(rand() * CLIENT_NAMES.length)];
    usedNames.add(name);
    const feePct = CLIENT_FEE_MIN_PCT + rand() * (CLIENT_FEE_MAX_PCT - CLIENT_FEE_MIN_PCT);
    const client: Client = {
      id: `c${nextId()}`,
      name,
      monthlyFee: Math.max(10_000, Math.round((asset.monthlyCashflow * feePct) / 100)),
      loyalty: CLIENT_LOYALTY_MIN + Math.floor(rand() * (CLIENT_LOYALTY_MAX - CLIENT_LOYALTY_MIN + 1)),
    };
    p.clients.push(client);
    added.push(client);
  }
  return added;
}

/**
 * Mijoz ketishi: eng past sadoqatli mijoz ketadi; menejer bo'lsa
 * MANAGER_RETAIN_CHANCE ehtimol bilan ushlab qolinadi.
 * Ketgan mijoz qaytariladi (ushlab qolinsa yoki mijoz yo'qsa null).
 */
export function clientLeave(p: Player, rand: () => number = Math.random): Client | null {
  if (p.clients.length === 0) return null;
  if (p.hasManager && rand() < MANAGER_RETAIN_CHANCE) return null;
  const lowest = [...p.clients].sort((a, b) => a.loyalty - b.loyalty)[0];
  p.clients = p.clients.filter((c) => c.id !== lowest.id);
  return lowest;
}

/* ---------------- Bilim markazi (fix-9, F2) ---------------- */

/** Kvadrant darajasi: E=0, S=1, B=2, I=3. */
export function quadrantLevel(p: Player): 0 | 1 | 2 | 3 {
  return p.quadrant === "E" ? 0 : p.quadrant === "S" ? 1 : p.quadrant === "B" ? 2 : 3;
}

export interface KnowledgeActionDef {
  id: string;
  /** narxi (so'm) */
  cost: number;
  /** cooldown (oy) */
  cooldown: number;
  /** +1 bilim ehtimoli (1 = kafolat) */
  chance: number;
  /** biznes seminar: kvadrant ≥ S bo'lsa shu ehtimol bilan +1 mijoz */
  clientChance?: number;
}

export const KNOWLEDGE_ACTIONS: KnowledgeActionDef[] = [
  { id: "book", cost: 500_000, cooldown: 2, chance: 1 },
  { id: "webinar", cost: 800_000, cooldown: 1, chance: 0.6 },
  { id: "course", cost: 1_500_000, cooldown: 2, chance: 1 },
  { id: "seminar", cost: 3_000_000, cooldown: 3, chance: 1, clientChance: 0.5 },
];

export function knowledgeActionById(id: string): KnowledgeActionDef | undefined {
  return KNOWLEDGE_ACTIONS.find((a) => a.id === id);
}

export interface ActionGate {
  ok: boolean;
  /** rad sababi (UI'da tugma ostida ko'rsatiladi) */
  reason?: string;
  /** cooldown tugashiga qolgan oylar (reason === cooldown bo'lganda) */
  monthsLeft?: number;
}

/** Bilim harakati gate'i: cooldown, naqd, bilim chegarasi (5). */
export function knowledgeActionGate(s: GameState, p: Player, actionId: string): ActionGate {
  const def = knowledgeActionById(actionId);
  if (!def) return { ok: false, reason: "unknown" };
  if (p.knowledge >= KNOWLEDGE_MAX) return { ok: false, reason: "cap" };
  const last = p.knowledgeActions[actionId];
  if (typeof last === "number") {
    const left = def.cooldown - (s.month - last);
    if (left > 0) return { ok: false, reason: "cooldown", monthsLeft: left };
  }
  if (p.cash < def.cost) return { ok: false, reason: "cash" };
  return { ok: true };
}

export interface KnowledgeActionResult {
  ok: boolean;
  /** toast uchun qisqa xabar */
  message: string;
  /** qo'shilgan bilim (0 yoki 1) */
  gained: number;
  /** seminar networking orqali qo'shilgan mijoz (bo'lsa) */
  client: Client | null;
}

/**
 * Bilim markazi harakatini bajarish: cooldown/naqd/cap tekshiriladi,
 * narx yechiladi, bilim (ehtimol bilan) oshadi, cooldown yoziladi, log qo'shiladi.
 */
export function useKnowledgeAction(
  s: GameState,
  playerId: number,
  actionId: string,
  rand: () => number = Math.random
): KnowledgeActionResult {
  const p = s.players.find((x) => x.id === playerId);
  const fail = (message: string): KnowledgeActionResult => ({ ok: false, message, gained: 0, client: null });
  if (!p) return fail("O'yinchi topilmadi");
  const def = knowledgeActionById(actionId);
  if (!def) return fail("Noma'lum harakat");
  const gate = knowledgeActionGate(s, p, actionId);
  if (!gate.ok) {
    return fail(
      gate.reason === "cap"
        ? "Maksimal bilim darajasi"
        : gate.reason === "cooldown"
          ? `${gate.monthsLeft} oydan keyin yana`
          : "Naqd pul yetarli emas"
    );
  }
  p.cash -= def.cost;
  p.knowledgeActions[actionId] = s.month;
  let gained = 0;
  let client: Client | null = null;
  let message: string;
  if (rand() < def.chance) {
    gained = gainKnowledge(p, 1);
    message = gained > 0 ? `+1 bilim (hozir: ${p.knowledge}/${KNOWLEDGE_MAX})` : "Bilim darajasi maksimalda";
  } else {
    message = "Vaqt ketdi — bilim oshmadi 😕";
  }
  // biznes seminar networking: S/B/I kvadrantda 50% +1 mijoz
  if (def.clientChance && quadrantLevel(p) >= 1 && rand() < def.clientChance) {
    client = addOneClient(p, rand, 500_000, 1_000_000);
  }
  addLog(
    s,
    "work",
    `${p.name}: Bilim markazi (${actionId}) — −${formatUZSCompact(def.cost)}, ${message}${client ? `; yangi mijoz: ${client.name}` : ""}`,
    gained > 0 || client ? "good" : "neutral"
  );
  return { ok: true, message, gained, client };
}

/* ---------------- Mijoz topish markazi (fix-9, F3) ---------------- */

export interface ClientActionDef {
  id: string;
  /** bazaviy narx (so'm); perClient=true bo'lsa × mavjud mijozlar soni */
  cost: number;
  /** narx har bir mavjud mijoz uchun (referal dasturi) */
  perClient?: boolean;
  /** cooldown (oy) */
  cooldown: number;
  /** kamida 1 mijoz talab qiladi */
  requiresClients?: boolean;
}

export const CLIENT_ACTIONS: ClientActionDef[] = [
  { id: "instagram", cost: 2_000_000, cooldown: 1 },
  { id: "telegram", cost: 1_200_000, cooldown: 1 },
  { id: "referal", cost: 800_000, perClient: true, cooldown: 2, requiresClients: true },
  { id: "networking", cost: 3_000_000, cooldown: 2 },
  { id: "promo", cost: 1_500_000, cooldown: 3 },
];

export function clientActionById(id: string): ClientActionDef | undefined {
  return CLIENT_ACTIONS.find((a) => a.id === id);
}

/** Kanal narxi (referal: 800 ming × mavjud mijozlar soni). */
export function clientActionCost(p: Player, def: ClientActionDef): number {
  return def.perClient ? def.cost * p.clients.length : def.cost;
}

/** Mijoz kanali gate'i: kvadrant (S/B/I), mijoz talabi, cooldown, naqd. */
export function clientActionGate(s: GameState, p: Player, actionId: string): ActionGate {
  const def = clientActionById(actionId);
  if (!def) return { ok: false, reason: "unknown" };
  if (quadrantLevel(p) < 1) return { ok: false, reason: "quadrant" };
  if (def.requiresClients && p.clients.length === 0) return { ok: false, reason: "no-clients" };
  const last = p.clientActions[actionId];
  if (typeof last === "number") {
    const left = def.cooldown - (s.month - last);
    if (left > 0) return { ok: false, reason: "cooldown", monthsLeft: left };
  }
  if (p.cash < clientActionCost(p, def)) return { ok: false, reason: "cash" };
  return { ok: true };
}

/** Bitta yangi mijoz yaratadi (noyob ism, fee diapazonida, tasodifiy sadoqat). */
export function addOneClient(
  p: Player,
  rand: () => number,
  feeMin: number,
  feeMax: number
): Client {
  const usedNames = new Set(p.clients.map((c) => c.name));
  const pool = CLIENT_NAMES.filter((n) => !usedNames.has(n));
  const name =
    pool.length > 0
      ? pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
      : `Mijoz ${p.clients.length + 1}`;
  const monthlyFee = Math.max(10_000, Math.round((feeMin + rand() * (feeMax - feeMin)) / 10_000) * 10_000);
  const client: Client = {
    id: `c${nextId()}`,
    name,
    monthlyFee,
    loyalty: CLIENT_LOYALTY_MIN + Math.floor(rand() * (CLIENT_LOYALTY_MAX - CLIENT_LOYALTY_MIN + 1)),
  };
  p.clients.push(client);
  return client;
}

export interface ClientActionResult {
  ok: boolean;
  /** toast uchun qisqa xabar */
  message: string;
  cost: number;
  added: Client[];
  /** menejersiz bandlik: faqat 3 tasi to'laydi (qolganlari navbatda) */
  overCap: boolean;
}

/**
 * Mijoz topish kanalini ishga tushirish: kvadrant/cooldown/naqd tekshiriladi,
 * narx yechiladi, ehtimollar rand orqali o'ynatiladi, natija log'lanadi.
 * Mijoz chegarasi (menejersiz 3 ta) saqlanadi — ortiqcha mijozlar ro'yxatga
 * qo'shiladi, lekin faqat eng yuqori to'lovli 3 tasi daromad keltiradi.
 */
export function useClientAction(
  s: GameState,
  playerId: number,
  actionId: string,
  rand: () => number = Math.random
): ClientActionResult {
  const p = s.players.find((x) => x.id === playerId);
  const fail = (message: string): ClientActionResult => ({ ok: false, message, cost: 0, added: [], overCap: false });
  if (!p) return fail("O'yinchi topilmadi");
  const def = clientActionById(actionId);
  if (!def) return fail("Noma'lum kanal");
  const gate = clientActionGate(s, p, actionId);
  if (!gate.ok) {
    return fail(
      gate.reason === "quadrant"
        ? "S kvadrantiga o'ting"
        : gate.reason === "no-clients"
          ? "Kamida 1 mijoz kerak"
          : gate.reason === "cooldown"
            ? `${gate.monthsLeft} oydan keyin yana`
            : "Naqd pul yetarli emas"
    );
  }
  const cost = clientActionCost(p, def);
  p.cash -= cost;
  p.clientActions[actionId] = s.month;
  const added: Client[] = [];
  let message: string;
  switch (def.id) {
    case "instagram": {
      if (rand() < 0.65) {
        added.push(addOneClient(p, rand, 800_000, 1_500_000));
        message = `+1 mijoz: ${added[0].name} — ${formatUZSCompact(added[0].monthlyFee)}/oy`;
      } else {
        message = "Reklama samara bermadi 😕";
      }
      break;
    }
    case "telegram": {
      if (rand() < 0.5) {
        added.push(addOneClient(p, rand, 500_000, 1_000_000));
        message = `+1 mijoz: ${added[0].name} — ${formatUZSCompact(added[0].monthlyFee)}/oy`;
      } else {
        message = "Targ'ibot samara bermadi 😕";
      }
      break;
    }
    case "referal": {
      // har mavjud mijoz 40% ehtimol bilan do'stini keltiradi (maks 3 yangi)
      const existing = p.clients.length;
      for (let i = 0; i < existing && added.length < 3; i++) {
        if (rand() < 0.4) added.push(addOneClient(p, rand, 600_000, 1_200_000));
      }
      message =
        added.length > 0
          ? `Referal: +${added.length} mijoz (${added.map((c) => c.name).join(", ")})`
          : "Hech kim tavsiya qilmadi 😕";
      break;
    }
    case "networking": {
      added.push(addOneClient(p, rand, 1_000_000, 2_000_000));
      if (rand() < 0.25) added.push(addOneClient(p, rand, 1_000_000, 2_000_000));
      message = `+${added.length} mijoz: ${added.map((c) => `${c.name} — ${formatUZSCompact(c.monthlyFee)}/oy`).join("; ")}`;
      break;
    }
    case "promo": {
      added.push(addOneClient(p, rand, 400_000, 800_000));
      added.push(addOneClient(p, rand, 400_000, 800_000));
      // chegirma mavjud mijozlar sadoqatini pasaytiradi (kamida 1 qoladi)
      for (const c of p.clients) {
        if (!added.includes(c)) c.loyalty = Math.max(CLIENT_LOYALTY_MIN, c.loyalty - 1);
      }
      message = `Aksiya: +2 mijoz (past narxda), mavjud mijozlar sadoqati −1`;
      break;
    }
    default:
      message = "Kanal ishga tushirildi";
  }
  const overCap = !p.hasManager && p.clients.length > CLIENT_CAP_NO_MANAGER;
  if (overCap && added.length > 0) message += ` · bandlik: faqat ${CLIENT_CAP_NO_MANAGER} tasi to'laydi`;
  addLog(
    s,
    "buy",
    `${p.name}: Mijoz topish (${actionId}) — −${formatUZSCompact(cost)}, ${message}`,
    added.length > 0 ? "good" : "bad"
  );
  return { ok: true, message, cost, added, overCap };
}

/* ---------------- Mijozga ish taklifi (fix-12) ---------------- */

/** Bir mijozga eng ko'p shuncha muvaffaqiyatli boost (har biri fee +20%). */
export const CLIENT_WORK_MAX_BOOSTS = 2;
/** Ish taklifining muvaffaqiyat ehtimoli. */
export const CLIENT_WORK_SUCCESS_CHANCE = 0.7;

/** Ish taklifi narxi: mijoz oylik to'lovining 20%-i (materiallar). */
export function clientWorkCost(c: Client): number {
  return Math.round(c.monthlyFee * 0.2);
}

export type ClientWorkGateReason = "unknown" | "max-boosts" | "cooldown" | "cash";

/** Ish taklifi gate'i: har mijozga oyda 1 marta, maks 2 boost, naqd yetarli bo'lishi kerak. */
export function clientWorkGate(
  s: GameState,
  p: Player,
  clientId: string
): { ok: boolean; reason?: ClientWorkGateReason } {
  const c = p.clients.find((x) => x.id === clientId);
  if (!c) return { ok: false, reason: "unknown" };
  const w = p.clientWork[clientId];
  if (w && w.boosts >= CLIENT_WORK_MAX_BOOSTS) return { ok: false, reason: "max-boosts" };
  if (w && s.month - w.lastMonth < 1) return { ok: false, reason: "cooldown" };
  if (p.cash < clientWorkCost(c)) return { ok: false, reason: "cash" };
  return { ok: true };
}

export interface ClientWorkResult {
  ok: boolean;
  message: string;
  cost: number;
  success?: boolean;
}

/**
 * "Ish taklifi": mijozga qo'shimcha loyiha taklif qilinadi.
 * Narx: fee × 20% (materiallar). Natija rand orqali:
 *  70% — loyiha muvaffaqiyatli: fee doimiy +20% (maks 2 boost);
 *  30% — mijoz norozi: sadoqat −1 (minimum CLIENT_LOYALTY_MIN).
 * Cooldown: har mijozga oyda 1 marta.
 */
export function offerClientWork(
  s: GameState,
  playerId: number,
  clientId: string,
  rand: () => number = Math.random
): ClientWorkResult {
  const fail = (message: string): ClientWorkResult => ({ ok: false, message, cost: 0 });
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return fail("O'yinchi topilmadi");
  const c = p.clients.find((x) => x.id === clientId);
  if (!c) return fail("Mijoz topilmadi");
  const gate = clientWorkGate(s, p, clientId);
  if (!gate.ok) {
    return fail(
      gate.reason === "max-boosts"
        ? "Bu mijozga maksimal boost berilgan"
        : gate.reason === "cooldown"
          ? "Bu oyda bu mijozga allaqachon taklif yuborilgan"
          : "Naqd pul yetarli emas"
    );
  }
  const cost = clientWorkCost(c);
  p.cash -= cost;
  const w = p.clientWork[clientId] ?? { lastMonth: 0, boosts: 0 };
  w.lastMonth = s.month;
  const success = rand() < CLIENT_WORK_SUCCESS_CHANCE;
  let message: string;
  if (success) {
    c.monthlyFee = Math.round(c.monthlyFee * 1.2);
    w.boosts += 1;
    message = `loyiha muvaffaqiyatli: ${c.name} to'lovi +20% → ${formatUZSCompact(c.monthlyFee)}/oy`;
  } else {
    c.loyalty = Math.max(CLIENT_LOYALTY_MIN, c.loyalty - 1);
    message = `mijoz norozi: ${c.name} sadoqati −1 (${c.loyalty})`;
  }
  p.clientWork[clientId] = w;
  addLog(s, "coins", `${p.name}: Ish taklifi (${c.name}) — −${formatUZSCompact(cost)}; ${message}`, success ? "good" : "bad");
  return { ok: true, message, cost, success };
}

export function passiveIncome(p: Player, opts?: FinanceOpts): number {
  const assetsSum = p.assets.reduce((sum, a) => {
    if (a.constructionLeft && a.constructionLeft > 0) return sum;
    if (opts?.forPayday && p.freezeBusinessTurns > 0 && a.kind === "business") return sum;
    return sum + assetCashflow(p, a, opts?.news);
  }, 0);
  // birja dividendlari ham passiv daromad (Asosiy aylanadan chiqishga hisoblanadi)
  const dividends = opts?.exchange ? portfolioDividends(p, opts.exchange) : 0;
  // S/B kvadrant: mijozlar to'lovlari ham passiv daromad
  const total = assetsSum + dividends + clientIncome(p);
  // C2 profil statistikasi: eng yuqori passiv daromad (FT oqimi bilan) kuzatiladi
  const withFt = total + p.ftCashflow;
  if (withFt > p.statMaxPassive) p.statMaxPassive = withFt;
  return total;
}

/** Maosh with the active life-event multiplier applied. Ishsizlikda 0. */
export function effectiveSalary(p: Player): number {
  if (p.unemployedMonths > 0) return 0;
  // fix-17 (R1): reja rejimida maosh ish kunlariga mutanosib (klassikda planSalaryScale=1)
  return Math.round(p.salary * p.salaryMultiplier * (p.planSalaryScale ?? 1));
}

export function baseExpenses(p: Player): number {
  const e = p.expenseParts;
  return e.taxes + e.housing + e.food + e.transport + e.other;
}

export function loanPayments(p: Player): number {
  let total = p.loans.reduce((s, l) => s + l.monthlyPayment, 0);
  if (p.loanPaymentMod && p.loanPaymentMod.monthsRemaining > 0) {
    total = Math.round(total * (1 + p.loanPaymentMod.pct / 100));
  }
  return total;
}

export function installmentPayments(p: Player): number {
  return p.installments.reduce((s, i) => s + i.monthlyPayment, 0);
}

/**
 * fix-15 (P4): bitta farzandning ta'lim xarajati (oyiga).
 * Maktab boshlanganda bog'cha to'xtaydi — edu maydoni almashinadi.
 */
export function childEduMonthly(c: ChildRecord): number {
  return CHILD_EDU_COSTS[c.edu] ?? 0;
}

/** fix-15 (P4): barcha farzandlarning ta'lim xarajatlari jami (childEduCost bucketi). */
export function childEduCost(p: Player): number {
  return p.children2.reduce((s, c) => s + childEduMonthly(c), 0);
}

export function totalExpenses(p: Player): number {
  // fix-15 (P4): CHILD_COST endi bazaviy farzand xarajati (800k/oy);
  // ta'lim tanlovlari (bog'cha/maktab) childEduCost orqali qo'shiladi
  return baseExpenses(p) + p.children * CHILD_COST + childEduCost(p) + loanPayments(p) + installmentPayments(p);
}

/* ---------------- fix-15 (P2): Qiyinlik darajasi ---------------- */

/**
 * Personaj qiyinligi moliyaviy holatdan: sof oqim ulushi (cf/maosh) +
 * zaxira oylari (jamg'arma / oylik chiqim).
 *  🟢 Oson — cf ≥ 15% va zaxira ≥ 3 oy
 *  🔴 Qiyin — cf < 8% yoki zaxira < 1 oy
 *  🟡 O'rta — qolgan holatlar
 */
export function professionDifficulty(prof: {
  salary: number;
  expenses: number;
  loanPayment: number;
  savings: number;
}): Difficulty {
  const cf = prof.salary - prof.expenses - prof.loanPayment;
  const cfPct = prof.salary > 0 ? cf / prof.salary : -1;
  const monthlyOut = prof.expenses + prof.loanPayment;
  const savingsMonths = monthlyOut > 0 ? prof.savings / monthlyOut : Infinity;
  if (cfPct < 0.08 || savingsMonths < 1) return "hard";
  if (cfPct >= 0.15 && savingsMonths >= 3) return "easy";
  return "medium";
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "🟢 Oson",
  medium: "🟡 O'rta",
  hard: "🔴 Qiyin",
};

/**
 * Qarz yuki: jami oylik kredit + bo'lib to'lash to'lovlari / jami oylik daromad.
 * 0 bo'lsa qarz yo'q; >1 bo'lsa to'lovlar daromaddan oshgan.
 */
export function debtLoad(p: Player, opts?: FinanceOpts): number {
  const income = effectiveSalary(p) + passiveIncome(p, opts);
  if (income <= 0) return loanPayments(p) + installmentPayments(p) > 0 ? Infinity : 0;
  return (loanPayments(p) + installmentPayments(p)) / income;
}

/** Bosqich 3 passiv daromad sharti: xarajatlardan 20% ko'p (A7). */
export function escapePassiveTarget(p: Player): number {
  return Math.round(totalExpenses(p) * ESCAPE_PASSIVE_MULT);
}

/**
 * Bosqichli erkinlik tizimi (Xavfsizlik → Mustaqillik → Erkinlik):
 *  1 🛡 Moliyaviy xavfsizlik — naqd ≥ 3× oylik xarajatlar
 *  2 ⚖️ Mustaqillik — passiv daromad ≥ oylik xarajatlar (xarajatlar > 0)
 *  3 🚀 Erkinlik (Erkinlik yo'li sharti) — passiv ≥ 1,2 × xarajatlar 2 ketma-ket oy
 *     kunida (escapeStreak ≥ 2) + kamida 2 aktiv + qarz yuki ≤ 50%
 */
/**
 * Bosqichli erkinlik tizimi (Xavfsizlik → Mustaqillik → Erkinlik):
 *  1 🛡 Moliyaviy xavfsizlik — naqd ≥ 3× oylik xarajatlar
 *  2 ⚖️ Mustaqillik — passiv daromad ≥ oylik xarajatlar (xarajatlar > 0)
 *  3 🚀 Erkinlik (Erkinlik yo'li sharti) — passiv ≥ 1,2 × xarajatlar + kamida
 *     2 aktiv + qarz yuki ≤ 50% + (2 ketma-ket oy kuni streak YOKI
 *     zaxira yo'li: naqd zaxira ≥ 3× oylik xarajat — B6)
 */
export function freedomStage(p: Player, opts?: FinanceOpts): 0 | 1 | 2 | 3 {
  const passive = passiveIncome(p, opts);
  const expenses = totalExpenses(p);
  const streakOk = p.escapeStreak >= streakNeeded(opts?.mode);
  const zaxiraOk = expenses > 0 && p.cash >= SAFETY_CASH_MULT * expenses;
  if (
    expenses > 0 &&
    passive >= expenses * ESCAPE_PASSIVE_MULT &&
    (streakOk || zaxiraOk) &&
    p.assets.length >= ESCAPE_MIN_ASSETS &&
    debtLoad(p, opts) <= ESCAPE_MAX_DEBT_LOAD
  ) {
    return 3;
  }
  if (expenses > 0 && passive >= expenses) return 2;
  if (p.cash >= SAFETY_CASH_MULT * expenses) return 1;
  return 0;
}

export interface EscapeChecklist {
  passiveOk: boolean;
  streak: number;
  streakNeeded: number;
  streakOk: boolean;
  /** zaxira yo'li (B6): naqd ≥ 3× oylik xarajat — streak o'rnida */
  zaxiraOk: boolean;
  streakOrZaxiraOk: boolean;
  assets: number;
  assetsNeeded: number;
  assetsOk: boolean;
  debtLoadPct: number;
  debtOk: boolean;
}

/** Bosqich 3 talablarining jonli holati (UI cheklisti uchun). */
export function escapeChecklist(p: Player, opts?: FinanceOpts): EscapeChecklist {
  const expenses = totalExpenses(p);
  const passiveOk = expenses > 0 && passiveIncome(p, opts) >= expenses * ESCAPE_PASSIVE_MULT;
  const needed = streakNeeded(opts?.mode);
  const streakOk = p.escapeStreak >= needed;
  const zaxiraOk = expenses > 0 && p.cash >= SAFETY_CASH_MULT * expenses;
  return {
    passiveOk,
    streak: Math.min(p.escapeStreak, needed),
    streakNeeded: needed,
    streakOk,
    zaxiraOk,
    streakOrZaxiraOk: streakOk || zaxiraOk,
    assets: p.assets.length,
    assetsNeeded: ESCAPE_MIN_ASSETS,
    assetsOk: p.assets.length >= ESCAPE_MIN_ASSETS,
    debtLoadPct: Math.round(debtLoad(p, opts) * 100),
    debtOk: debtLoad(p, opts) <= ESCAPE_MAX_DEBT_LOAD,
  };
}

/** Escape = Bosqich 3 (Erkinlik) barcha shartlari bajarilgan. */
export function canEscape(p: Player, news?: ActiveNews | null, exchange?: ExchangeState, mode?: GameMode): boolean {
  return !p.escaped && !p.bankrupt && freedomStage(p, { news, exchange, mode }) === 3;
}

/* ---------------- Kvadrant progressiyasi (B1) ---------------- */

/**
 * Kvadrant o'tishini tekshirish va bajarish (sakrash taqiqlangan — bir
 * chaqiriqda ko'pi bilan bitta qadam):
 *  E→S: kamida 1 biznes aktiv + bilim ≥ QUADRANT_S_MIN_KNOWLEDGE
 *  S→B: kamida QUADRANT_B_MIN_ASSETS aktiv + menejer yollangan
 *  B→I: birja portfeli ≥ QUADRANT_I_PORTFOLIO
 * Har o'tish +1 bilim beradi. Yangi kvadrant qaytariladi (o'zgarmasa null).
 */
export function maybeAdvanceQuadrant(p: Player, exchange?: ExchangeState): Quadrant | null {
  if (p.bankrupt || p.escaped) return null;
  if (p.quadrant === "E") {
    const hasBusiness = p.assets.some((a) => a.kind === "business");
    if (hasBusiness && p.knowledge >= QUADRANT_S_MIN_KNOWLEDGE) {
      p.quadrant = "S";
      gainKnowledge(p, 1);
      return "S";
    }
    return null;
  }
  if (p.quadrant === "S") {
    if (p.assets.length >= QUADRANT_B_MIN_ASSETS && p.hasManager) {
      p.quadrant = "B";
      gainKnowledge(p, 1);
      return "B";
    }
    return null;
  }
  if (p.quadrant === "B") {
    const pv = exchange
      ? portfolioValue(p, exchange)
      : p.portfolio.reduce((sum, h) => sum + h.qty * h.avgBuyPrice, 0);
    if (pv >= QUADRANT_I_PORTFOLIO) {
      p.quadrant = "I";
      gainKnowledge(p, 1);
      return "I";
    }
    return null;
  }
  return null;
}

export function monthlyCashflow(p: Player, opts?: FinanceOpts): number {
  let cf = effectiveSalary(p) + passiveIncome(p, opts) - totalExpenses(p);
  if (opts?.forPayday && p.taxFreeTurns > 0) cf += p.expenseParts.taxes;
  return cf;
}

/** FT monthly income injection used by bonus/payday cells. */
export function ftMonthlyIncome(p: Player, news?: ActiveNews | null): number {
  return monthlyCashflow(p, { news }) + p.ftCashflow;
}

/* ---------------- Kredit reytingi (credit score) ---------------- */

/** Reytingni delta ga o'zgartiradi (300–850 oralig'ida qisiladi). Yangi qiymat qaytariladi. */
export function adjustCreditScore(p: Player, delta: number): number {
  p.creditScore = Math.max(CREDIT_SCORE_MIN, Math.min(CREDIT_SCORE_MAX, Math.round(p.creditScore + delta)));
  // C2 profil statistikasi: reyting chegaralari kuzatiladi
  if (p.creditScore < p.statMinCredit) p.statMinCredit = p.creditScore;
  if (p.creditScore > p.statMaxCredit) p.statMaxCredit = p.creditScore;
  return p.creditScore;
}

/** Reyting zonasi: "good" 700+, "mid" 600–699, "bad" <600. */
export function creditScoreZone(score: number): "good" | "mid" | "bad" {
  if (score >= 700) return "good";
  if (score >= 600) return "mid";
  return "bad";
}

/**
 * Bitimni "kreditga olish" (bank qarzi) gate'i:
 * reyting ≥ 600 VA moliyalashtiriladigan aktiv garovga yaroqli (resalePercent ≥ 60).
 * null = ruxsat; "score" | "collateral" = rad sababi.
 */
export function dealLoanGate(p: Player, deal: DealCard): "score" | "collateral" | null {
  if (p.creditScore < SCORE_DEAL_MIN) return "score";
  if ((deal.resalePercent ?? 0) < COLLATERAL_MIN_RESALE) return "collateral";
  return null;
}

/** Jami oylik daromad (maosh + passiv) — qarz yuki limitlari uchun. */
export function monthlyIncome(p: Player, opts?: FinanceOpts): number {
  return effectiveSalary(p) + passiveIncome(p, opts);
}

/** Kredit taklifi uchun maksimal summa: bank limiti VA 6× oylik daromad. */
export function loanOfferCap(p: Player, offer: LoanOffer, opts?: FinanceOpts): number {
  const incomeCap = Math.floor(monthlyIncome(p, opts) * LOAN_INCOME_CAP_MULT);
  return Math.max(0, Math.min(offer.maxPrincipal, incomeCap));
}

export interface LoanOfferGateResult {
  /** null = taklif ochiq; aks holda rad sababi */
  gate: "score" | "business" | "cap" | null;
  minScore: number;
  cap: number;
}

/** Kredit taklifi gate'i: reyting, biznes talabi, daromad limiti. */
export function loanOfferGate(p: Player, offer: LoanOffer, opts?: FinanceOpts): LoanOfferGateResult {
  const minScore = offer.minScore ?? 0;
  const cap = loanOfferCap(p, offer, opts);
  if (p.creditScore < minScore) return { gate: "score", minScore, cap };
  if (offer.requiresBusiness && !p.assets.some((a) => a.kind === "business")) {
    return { gate: "business", minScore, cap };
  }
  if (cap < Math.min(...offer.amounts)) return { gate: "cap", minScore, cap };
  return { gate: null, minScore, cap };
}

/** Doodad krediti shartlari: annuitet 12 oy, 24%/yil (2%/oy). */
export function doodadCreditTerms(
  card: DoodadCard,
  cost: number
): { down: number; principal: number; monthlyPayment: number; months: number } {
  const down = card.credit?.down ?? 0;
  const principal = card.credit?.principal ?? cost;
  return {
    down,
    principal,
    monthlyPayment: annuityPayment(principal, DOODAD_CREDIT_MONTHLY_RATE, DOODAD_CREDIT_MONTHS),
    months: DOODAD_CREDIT_MONTHS,
  };
}

/** Doodad krediti gate'i: reyting ≥ 550 VA boshlang'ich to'lovga naqd yetishi. */
export function doodadCreditGate(p: Player, card: DoodadCard, cost: number): "score" | "down" | null {
  if (p.creditScore < SCORE_DOODAD_MIN) return "score";
  if (p.cash < doodadCreditTerms(card, cost).down) return "down";
  return null;
}

/* ---------------- Log ---------------- */

export function addLog(
  s: GameState,
  icon: string,
  text: string,
  tone: LogEntry["tone"] = "neutral"
) {
  s.log.unshift({ id: nextId(), round: s.round, icon, text, tone });
  if (s.log.length > 50) s.log.length = 50;
}

/**
 * fix-10 (F2): Bildirishnomalar markaziga element qo'shadi (eng yangisi birinchi, max 50).
 * Log ticker ham alohida yoziladi — bu faqat 🔔 panel uchun.
 */
export function notify(
  s: GameState,
  item: { icon: string; title: string; body: string; tone?: NotificationItem["tone"] }
) {
  s.notifications.unshift({
    id: nextId(),
    round: s.round,
    month: s.month,
    tone: "neutral",
    ...item,
  });
  if (s.notifications.length > 50) s.notifications.length = 50;
}

/* ---------------- Dice & movement ---------------- */

export function rollDice(count: 1 | 2): [number, number] {
  const a = 1 + Math.floor(Math.random() * 6);
  const b = count === 2 ? 1 + Math.floor(Math.random() * 6) : 0;
  return [a, b];
}

export function diceTotal(dice: [number, number], count: 1 | 2): number {
  return count === 2 ? dice[0] + dice[1] : dice[0];
}

/** Cells stepped onto when moving `steps` from `from` on a ring of `size`. */
export function movePath(from: number, steps: number, size: number): number[] {
  const path: number[] = [];
  for (let i = 1; i <= steps; i++) path.push((from + i) % size);
  return path;
}

/* ---------------- Payday ---------------- */

export interface PaydayResult {
  amount: number;
  notes: string[];
  /** avans olingan oyda ayirilgan maosh qismi (0 = ayirilmadi) — toast/log uchun */
  avansDeducted?: number;
}

/** Tick "bo'lib to'lash" plans by one month; drop finished ones. */
function tickInstallments(p: Player, notes: string[]) {
  if (p.installments.length === 0) return;
  for (const inst of p.installments) inst.remainingMonths -= 1;
  const finished = p.installments.filter((i) => i.remainingMonths <= 0);
  if (finished.length > 0) {
    p.installments = p.installments.filter((i) => i.remainingMonths > 0);
    notes.push(`Bo'lib to'lash yakunlandi: ${finished.map((f) => f.title).join(", ")}`);
  }
}

/**
 * Annuitet amortizatsiyasi — har oy kunida bir oy tick:
 * foiz = qoldiq × oylik stavka; asosiy qism = to'lov − foiz.
 * Muddat tugagan yoki qoldiq 0 bo'lgan kredit avtomatik yopiladi.
 */
function tickLoans(p: Player, notes: string[], month = 0) {
  if (p.loans.length === 0) return;
  const closed: Loan[] = [];
  for (const l of p.loans) {
    // fix-14 (T1): qarindoshlardan foizsiz qarz — oylik to'lov yo'q;
    // muddat yetganda to'liq summa avtomatik yechiladi.
    if (l.kind === "qarz") {
      l.remainingMonths -= 1;
      if (l.remainingMonths <= 0) {
        const late = p.cash < l.remainingBalance;
        p.cash -= l.remainingBalance;
        closed.push(l);
        if (late) {
          adjustCreditScore(p, SCORE_QARZ_LATE);
          p.qarzBlockedUntil = month > 0 ? month + QARZ_BLOCK_MONTHS : QARZ_BLOCK_MONTHS;
          notes.push(
            `⚠️ Qarzni vaqtida qaytarmadingiz — ishonch yo'qoldi (${formatUZSCompact(l.remainingBalance)} yechildi, reyting ${SCORE_QARZ_LATE}, ${QARZ_BLOCK_MONTHS} oyga yangi qarz bloklandi)`
          );
        } else {
          adjustCreditScore(p, SCORE_CLOSED);
          notes.push(`🎉 QARZ QAYTARILDI: ${l.name} — ${formatUZSCompact(l.remainingBalance)} vaqtida qaytarildi. Ishonch saqlandi!`);
        }
      }
      continue;
    }
    const interest = Math.round(l.remainingBalance * l.monthlyRate);
    const principalPart = Math.min(l.monthlyPayment - interest, l.remainingBalance);
    l.remainingBalance = Math.max(0, l.remainingBalance - principalPart);
    l.remainingMonths -= 1;
    if (l.remainingMonths <= 0 || l.remainingBalance <= 0) closed.push(l);
  }
  if (closed.length > 0) {
    p.loans = p.loans.filter((l) => !closed.includes(l));
    for (const l of closed) {
      if (l.kind === "qarz") continue; // qarz uchun log/reyting yuqorida allaqachon yozildi
      adjustCreditScore(p, SCORE_CLOSED);
      notes.push(
        `🎉 KREDIT TO'LIQ YOPILDI: ${l.name}. Oylik ${formatUZSCompact(l.monthlyPayment)} endi xarajatlardan olib tashlandi!`
      );
      notes.push(`📊 Kredit reytingi +${SCORE_CLOSED} (kredit to'liq yopildi)`);
    }
  }
}

export function applyPayday(
  p: Player,
  news?: ActiveNews | null,
  exchange?: ExchangeState,
  /** fix-14: joriy oy (qarz bloklash muddati uchun) */
  month = 0
): PaydayResult {
  const notes: string[] = [];
  const dividends = exchange ? portfolioDividends(p, exchange) : 0;
  let amount = monthlyCashflow(p, { forPayday: true, news, exchange });
  // Avans olingan oyda oy kunida maoshdan aynan avans sifatida berilgan qism
  // ayiriladi (passiv daromad va xarajat qismlari kamaymaydi — faqat maosh
  // komponenti). Summa avans olingan paytdagi qiymatdan olinadi: oy o'rtasida
  // kredit yopilsa/ochilsa ham avans + oy kuni = maosh (saqlanish qonuni).
  let avansDeducted = 0;
  if (p.avansTakenThisMonth) {
    const sal = effectiveSalary(p);
    const deducted = p.avansReceived;
    if (deducted > 0) {
      amount -= deducted;
      avansDeducted = deducted;
      notes.push(`Ish haqi (avans ayirilgan): ${formatUZSCompact(sal - deducted)}`);
    }
  }
  // ishsizlik: maosh 0 (effectiveSalary orqali), oy kunida hisoblagich kamayadi
  if (p.unemployedMonths > 0) {
    p.unemployedMonths -= 1;
    notes.push(
      p.unemployedMonths > 0
        ? `💼 Ishsizlik: yana ${p.unemployedMonths} oy maoshsiz`
        : "💼 Yangi ish topdingiz! Maosh tiklandi."
    );
  }
  if (dividends > 0) {
    notes.push(
      `Birja dividendlari: +${formatUZSCompact(dividends)}${p.dividendBoost && p.dividendBoost.monthsRemaining > 0 ? " (×" + p.dividendBoost.mult + " boost)" : ""}`
    );
  }
  if (news && newsById(news.id)) notes.push(`Bozor yangiligi faol: ${newsById(news.id)!.text}`);
  if (p.taxFreeTurns > 0) {
    notes.push("Soliq imtiyozi qo'llanildi");
    p.taxFreeTurns -= 1;
  }
  if (p.freezeBusinessTurns > 0) {
    notes.push("Bizneslar oqimsiz (elektr/gaz uzilishi)");
    p.freezeBusinessTurns -= 1;
  }
  // life-event salary multiplier countdown (null = doimiy, never expires)
  if (p.salaryMonths !== null && p.salaryMultiplier !== 1) {
    notes.push(
      p.salaryMultiplier > 1 ? "Vaqtinchalik maosh oshirimi qo'llanildi" : "Vaqtinchalik maosh kamayishi qo'llanildi"
    );
    p.salaryMonths -= 1;
    if (p.salaryMonths <= 0) {
      p.salaryMultiplier = 1;
      p.salaryMonths = null;
      notes.push("Maosh eski miqdoriga qaytdi");
    }
  }
  // temporary per-asset income modifiers countdown
  if (p.assetModifiers.length > 0) {
    for (const m of p.assetModifiers) m.monthsRemaining -= 1;
    const expired = p.assetModifiers.filter((m) => m.monthsRemaining <= 0).length;
    p.assetModifiers = p.assetModifiers.filter((m) => m.monthsRemaining > 0);
    if (expired > 0) notes.push("Aktiv daromadlaridagi vaqtinchalik o'zgarish tugadi");
  }
  // temporary loan-payment modifier countdown
  if (p.loanPaymentMod) {
    p.loanPaymentMod.monthsRemaining -= 1;
    if (p.loanPaymentMod.monthsRemaining <= 0) {
      p.loanPaymentMod = null;
      notes.push("Kredit to'lovlari eski miqdoriga qaytdi");
    }
  }
  // dividend boosti countdown (oy kunida kamayadi)
  if (p.dividendBoost) {
    p.dividendBoost.monthsRemaining -= 1;
    if (p.dividendBoost.monthsRemaining <= 0) {
      p.dividendBoost = null;
      notes.push("Dividend oshirimi tugadi");
    }
  }
  // portfel maslahatchisi muddati countdown
  if (p.marketAdviceMonths > 0) {
    p.marketAdviceMonths -= 1;
    if (p.marketAdviceMonths <= 0) notes.push("Portfel maslahatchisi muddati tugadi");
  }
  tickInstallments(p, notes);
  // Penya: majburiyatlarni qoplab bo'lmasa (naqd manfiyga ketadi), lekin yetishmovchilik
  // oylik kredit to'lovlarining 20% idan oshmasa — kredit to'lovlari kechiktiriladi:
  // har kredit qoldig'iga to'lovning 5% i qo'shiladi, reyting −30, to'lovlar bu oy o'tkaziladi.
  // 2 ketma-ket penya oyidan keyin (yoki katta yetishmovchilikda) — odatiy bankrotlik oqimi.
  const loanTotal = loanPayments(p);
  const shortfall = -amount;
  const penya =
    amount < 0 &&
    p.cash + amount < 0 &&
    p.loans.length > 0 &&
    loanTotal > 0 &&
    shortfall <= loanTotal * PENYA_MAX_SHORTFALL_PCT &&
    p.penyaStreak < PENYA_MAX_STREAK;
  if (penya) {
    let penyaTotal = 0;
    for (const l of p.loans) {
      const add = Math.round(l.monthlyPayment * PENYA_RATE);
      l.remainingBalance += add;
      penyaTotal += add;
    }
    amount += loanTotal; // kechiktirilgan to'lovlar bu oy naqd pulda qoladi
    p.penyaStreak += 1;
    adjustCreditScore(p, SCORE_PENYA);
    notes.push(`⚠️ Penya hisoblandi: +${formatUZSCompact(penyaTotal)} (kechiktirilgan to'lov)`);
    notes.push(`📊 Kredit reytingi ${SCORE_PENYA} (kechiktirilgan to'lov)`);
  } else {
    const hadLoans = p.loans.length > 0;
    tickLoans(p, notes, month);
    if (amount >= 0) {
      p.penyaStreak = 0;
      if (hadLoans) {
        adjustCreditScore(p, SCORE_ONTIME);
        notes.push(`📊 Kredit reytingi +${SCORE_ONTIME} (o'z vaqtida to'lov)`);
      }
    } else if (p.penyaStreak >= PENYA_MAX_STREAK) {
      p.penyaStreak = 0; // bankrotlik oqimi oldidan hisoblagich qayta boshlanadi
    }
  }
  p.cash += amount;
  // Erkinlik seriyasi: passiv daromad xarajatlarning 120%-ini ketma-ket qoplagan oy kunlari
  const expNow = totalExpenses(p);
  if (expNow > 0 && passiveIncome(p, { forPayday: true, news, exchange }) >= expNow * ESCAPE_PASSIVE_MULT) {
    p.escapeStreak += 1;
  } else {
    p.escapeStreak = 0;
  }
  return { amount, notes, avansDeducted };
}

/* ---------------- Deals ---------------- */

function dealTagMatches(tags: string[] | undefined, deal: DealCard): boolean {
  if (!tags || tags.length === 0) return true;
  return !!deal.tag && tags.includes(deal.tag);
}

/** Ability-adjusted full price (Davron: dala/chorva −15%; Ziyoda: risky −15%). */
export function adjustedPrice(p: Player, deal: DealCard): number {
  let price = deal.price;
  for (const m of abilityOf(p).modifiers) {
    if (m.type === "deal-price" && dealTagMatches(m.tags, deal) && (!m.riskyOnly || deal.risky)) {
      price = Math.round(price * (1 + m.pct / 100));
    }
  }
  return price;
}

/**
 * Ability/discount-adjusted down payment: hero deal-price modifiers scale the
 * down proportionally, then one-time discounts (ipoteka −20%, kupon −10%).
 */
export function adjustedDown(p: Player, deal: DealCard): number {
  let down = deal.down;
  for (const m of abilityOf(p).modifiers) {
    if (m.type === "deal-price" && dealTagMatches(m.tags, deal) && (!m.riskyOnly || deal.risky)) {
      down = Math.round(down * (1 + m.pct / 100));
    }
  }
  if (p.mortgageDiscount && deal.kind === "realestate") down = Math.round(down * 0.8);
  if (p.dealCoupon && p.dealCoupon.kinds.includes(deal.kind)) {
    down = Math.round(down * (1 - p.dealCoupon.pct / 100));
  }
  return Math.max(0, down);
}

/** Ability-adjusted monthly cashflow (Gulnoza/Jamshid/Nodira income bonuses). */
export function adjustedCashflow(p: Player, deal: DealCard): number {
  let cf = deal.grossIncome ?? deal.cashflow;
  for (const m of abilityOf(p).modifiers) {
    if (m.type === "deal-income" && dealTagMatches(m.tags, deal)) {
      cf = Math.round(cf * (1 + m.pct / 100));
    }
  }
  return cf;
}

/** Consume one-time purchase discounts that apply to this deal. */
function consumeDiscounts(p: Player, deal: DealCard) {
  if (p.mortgageDiscount && deal.kind === "realestate") p.mortgageDiscount = false;
  if (p.dealCoupon && p.dealCoupon.kinds.includes(deal.kind)) p.dealCoupon = null;
}

export interface BuyResult {
  asset: Asset;
  loan: Loan | null;
  bankLoan: Loan | null;
  paidCash: number;
}

/** Bitim ipotekasining (deal.loan) annuitet oylik to'lovi. */
export function dealLoanPayment(deal: DealCard): number {
  if (!deal.loan) return 0;
  return annuityPayment(deal.loan.principal, deal.loan.monthlyRate, deal.loan.months);
}

/** Bitimga bog'langan ipoteka kreditini to'liq Loan sifatida yaratadi. */
function makeDealLoan(assetId: string, deal: DealCard): Loan | null {
  if (!deal.loan) return null;
  return createLoan(`loan-${assetId}`, deal.loan.name, deal.loan.principal, deal.loan.monthlyRate, deal.loan.months);
}

/**
 * Buy a deal. If `useBankLoan`, the shortfall below the down payment is
 * financed by a bank loan at 30%/yil, 24 oy annuitet (game.md §3.3 Imkoniyat).
 */
export function buyDeal(p: Player, deal: DealCard, useBankLoan: boolean, marketIndex = 1): BuyResult {
  const down = adjustedDown(p, deal);
  consumeDiscounts(p, deal);
  const asset: Asset = {
    id: `a${nextId()}`,
    title: deal.title,
    kind: deal.kind,
    icon: deal.icon,
    price: adjustedPrice(p, deal),
    paid: down,
    monthlyCashflow: adjustedCashflow(p, deal),
    constructionLeft: deal.constructionTurns,
    tag: deal.tag,
    resalePercent: deal.resalePercent,
    liquidity: deal.liquidity,
    buyIndex: marketIndex,
    riskLevel: deal.riskLevel,
    risky: deal.risky,
  };
  let bankLoan: Loan | null = null;
  let paidCash = down;
  if (down > p.cash) {
    const shortfall = down - p.cash;
    if (!useBankLoan) throw new Error("Naqd pul yetarli emas");
    bankLoan = createLoan(
      `l${nextId()}`,
      `Bank qarzi (30%/yil, ${BANK_LOAN_MONTHS} oy)`,
      shortfall,
      LOAN_RATE_YEAR / 12,
      BANK_LOAN_MONTHS
    );
    p.loans.push(bankLoan);
    adjustCreditScore(p, SCORE_NEW_LOAN);
    paidCash = p.cash;
  }
  p.cash -= paidCash;
  const loan = makeDealLoan(asset.id, deal);
  if (loan) p.loans.push(loan);
  p.assets.push(asset);
  // B3: har yangi aktiv turi +1 bilim; B2: S/B kvadrant biznesi mijoz olib keladi
  knowledgeFromDeal(p, deal.kind);
  if (asset.kind === "business" && (p.quadrant === "S" || p.quadrant === "B")) {
    addClientsForAsset(p, asset);
  }
  return { asset, loan, bankLoan, paidCash };
}

export type BuyMethod = "cash" | "loan" | "installment";

export interface InstallmentQuote {
  down: number;
  financed: number;
  total: number;
  monthlyPayment: number;
  months: number;
}

/** Quote for a "bo'lib to'lash" plan: remaining price +10% split over 12 months. */
export function installmentQuote(p: Player, deal: DealCard): InstallmentQuote | null {
  const price = adjustedPrice(p, deal);
  if (price <= INSTALLMENT_MIN_PRICE) return null;
  const down = adjustedDown(p, deal);
  const financed = price - down;
  if (financed <= 0) return null;
  const total = Math.round(financed * (1 + INSTALLMENT_MARKUP));
  return {
    down,
    financed,
    total,
    monthlyPayment: Math.round(total / INSTALLMENT_MONTHS),
    months: INSTALLMENT_MONTHS,
  };
}

/**
 * Buy a deal "bo'lib to'lash": pay the down payment now, the remaining price
 * (+10% markup) is split into fixed monthly installments over 12 months.
 * The asset is acquired immediately and its cashflow starts right away.
 */
export function buyDealInstallment(p: Player, deal: DealCard, marketIndex = 1): BuyResult {
  const quote = installmentQuote(p, deal);
  if (!quote) throw new Error("Bo'lib to'lash bu bitimga mavjud emas");
  consumeDiscounts(p, deal);
  if (quote.down > p.cash) throw new Error("Naqd pul yetarli emas");
  const asset: Asset = {
    id: `a${nextId()}`,
    title: deal.title,
    kind: deal.kind,
    icon: deal.icon,
    price: adjustedPrice(p, deal),
    paid: quote.down,
    monthlyCashflow: adjustedCashflow(p, deal),
    constructionLeft: deal.constructionTurns,
    tag: deal.tag,
    resalePercent: deal.resalePercent,
    liquidity: deal.liquidity,
    buyIndex: marketIndex,
    riskLevel: deal.riskLevel,
    risky: deal.risky,
  };
  p.cash -= quote.down;
  const loan = makeDealLoan(asset.id, deal);
  if (loan) p.loans.push(loan);
  p.installments.push({
    id: `i${nextId()}`,
    title: deal.title,
    monthlyPayment: quote.monthlyPayment,
    remainingMonths: quote.months,
    totalMonths: quote.months,
    assetId: asset.id,
  });
  p.assets.push(asset);
  // B3: har yangi aktiv turi +1 bilim; B2: S/B kvadrant biznesi mijoz olib keladi
  knowledgeFromDeal(p, deal.kind);
  if (asset.kind === "business" && (p.quadrant === "S" || p.quadrant === "B")) {
    addClientsForAsset(p, asset);
  }
  return { asset, loan, bankLoan: null, paidCash: quote.down };
}

/** Sell an asset at `price`. Linked mortgage loan (kvartira) is closed first. */
/**
 * Bozor taklifi narxi: asset price × market factor × resalePercent,
 * plus Sarvar's "Ko'z quvvati" (+10% ko'chmas mulk takliflarida).
 */
export function marketOffer(p: Player, target: Asset, card: MarketCard): number {
  let offer = target.price * card.factor * ((target.resalePercent ?? 100) / 100);
  for (const m of abilityOf(p).modifiers) {
    if (m.type === "sale-price" && (!m.kinds || m.kinds.includes(target.kind))) {
      offer *= 1 + m.pct / 100;
    }
  }
  return Math.round(offer);
}

export function sellAsset(p: Player, assetId: string, price: number): number {
  const idx = p.assets.findIndex((a) => a.id === assetId);
  if (idx < 0) return 0;
  const linkedIdx = p.loans.findIndex((l) => l.id === `loan-${assetId}`);
  let loanPayoff = 0;
  if (linkedIdx >= 0) {
    loanPayoff = p.loans[linkedIdx].remainingBalance;
    p.loans.splice(linkedIdx, 1);
  }
  p.assets.splice(idx, 1);
  const net = Math.max(0, price - loanPayoff);
  p.cash += net;
  return net;
}

/** "Muddatidan oldin yopish" — qolgan qarz qoldig'i (remainingBalance) to'lanadi. */
export function payoffLoan(p: Player, loanId: string): boolean {
  const idx = p.loans.findIndex((l) => l.id === loanId);
  if (idx < 0 || p.cash < p.loans[idx].remainingBalance) return false;
  p.cash -= p.loans[idx].remainingBalance;
  p.loans.splice(idx, 1);
  adjustCreditScore(p, SCORE_CLOSED);
  return true;
}

/* ---------------- Istalgan payt sotish (A4) ---------------- */

/** Likvidlik darajasiga ko'ra sotish narx ko'paytiruvchisi (yo'qsa 3 → 0,93). */
export function liquidityFactor(a: Asset): number {
  return LIQUIDITY_FACTORS[a.liquidity ?? DEFAULT_LIQUIDITY] ?? LIQUIDITY_FACTORS[DEFAULT_LIQUIDITY];
}

/** Istalgan payt sotish narxi: bozor qiymati × resalePercent × likvidlik koeffitsiyenti. */
export function anytimeOffer(s: GameState, a: Asset): number {
  const mv = assetMarketValue(s, a);
  return Math.round(mv * ((a.resalePercent ?? 100) / 100) * liquidityFactor(a));
}

export interface AnytimeSale {
  net: number;
  marketValue: number;
  offer: number;
  title: string;
}

/**
 * Aktivni istalgan payt sotish: bozor qiymati × resale% × likvidlik.
 * Bog'langan ipoteka krediti qoldig'i ushlab qolinadi va kredit yopiladi.
 */
export function sellAssetAnytime(s: GameState, playerId: number, assetId: string): AnytimeSale | null {
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return null;
  const asset = p.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const offer = anytimeOffer(s, asset);
  const marketValue = assetMarketValue(s, asset);
  const net = sellAsset(p, assetId, offer);
  addLog(s, "sell", `${p.name}: Sotildi: +${formatUZSCompact(net)} so'm (bozor: ${formatUZSCompact(marketValue)})`, "good");
  return { net, marketValue, offer, title: asset.title };
}

/* ---------------- Kredit boshqaruvi (A5) ---------------- */

export interface PartialPaymentResult {
  paid: number;
  remainingBalance: number;
  remainingMonths: number;
  closed: boolean;
}

/**
 * "Qisman to'lov": qoldiq min(amount, balance) ga kamayadi, naqd yechiladi.
 * Oylik to'lov o'zgarmaydi — muddat annuitet teskari formula bilan qayta hisoblanadi
 * (kamida 1 oy). Qoldiq 0 ga tushsa kredit yopiladi.
 */
export function makePartialPayment(p: Player, loanId: string, amount: number): PartialPaymentResult | null {
  const loan = p.loans.find((l) => l.id === loanId);
  if (!loan) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (p.cash < amount) return null;
  const pay = Math.min(Math.round(amount), loan.remainingBalance);
  if (pay <= 0) return null;
  p.cash -= pay;
  loan.remainingBalance = Math.max(0, loan.remainingBalance - pay);
  if (loan.remainingBalance <= 0) {
    p.loans = p.loans.filter((l) => l.id !== loanId);
    adjustCreditScore(p, SCORE_CLOSED);
    return { paid: pay, remainingBalance: 0, remainingMonths: 0, closed: true };
  }
  // annuitet teskari: n = ln(PMT / (PMT − B·r)) / ln(1 + r)
  if (loan.monthlyRate <= 0) {
    loan.remainingMonths = Math.max(1, Math.ceil(loan.remainingBalance / loan.monthlyPayment));
  } else if (loan.monthlyPayment > loan.remainingBalance * loan.monthlyRate) {
    const n =
      Math.log(loan.monthlyPayment / (loan.monthlyPayment - loan.remainingBalance * loan.monthlyRate)) /
      Math.log(1 + loan.monthlyRate);
    loan.remainingMonths = Number.isFinite(n) ? Math.max(1, Math.round(n)) : loan.remainingMonths;
  }
  return { paid: pay, remainingBalance: loan.remainingBalance, remainingMonths: loan.remainingMonths, closed: false };
}

/**
 * "To'liq yopish": qoldiq qarz naqd puldan to'lanadi, kredit yopiladi,
 * reyting +SCORE_EARLY_PAYOFF. Naqd yetishmasa — false.
 */
export function closeLoanEarly(p: Player, loanId: string): boolean {
  const idx = p.loans.findIndex((l) => l.id === loanId);
  if (idx < 0) return false;
  const balance = p.loans[idx].remainingBalance;
  if (!(balance > 0) || p.cash < balance) return false;
  p.cash -= balance;
  p.loans.splice(idx, 1);
  adjustCreditScore(p, SCORE_EARLY_PAYOFF);
  return true;
}

/** "Muddatidan oldin yopish" — pay all remaining installment months at once. */
export function installmentPayoffAmount(p: Player, installmentId: string): number | null {
  const inst = p.installments.find((i) => i.id === installmentId);
  if (!inst) return null;
  return inst.monthlyPayment * inst.remainingMonths;
}

export function payoffInstallment(p: Player, installmentId: string): boolean {
  const amount = installmentPayoffAmount(p, installmentId);
  if (amount === null || p.cash < amount) return false;
  p.cash -= amount;
  p.installments = p.installments.filter((i) => i.id !== installmentId);
  return true;
}

/** Kredit takliflari: borrowing adds cash + an annuity loan liability. */
export function takeLoanOffer(
  p: Player,
  name: string,
  principal: number,
  monthlyRate: number,
  months: number
): Loan {
  const loan = createLoan(`l${nextId()}`, name, principal, monthlyRate, months);
  p.loans.push(loan);
  p.cash += principal;
  adjustCreditScore(p, SCORE_NEW_LOAN);
  return loan;
}

/* ---------------- Events (game.md §7.4) ---------------- */

/**
 * Hodisa kolodasi: cooldown (recent) + eligibility (requiresBusiness/requiresTag).
 * Agar filtrdan keyin hech narsa qolmasa, to'liq koloda qaytariladi.
 */
/** Qattiq eligibility shartlari (cooldown'dan tashqari barchasi) — C4 gate'lari bilan. */
function eventGateOk(c: EventCard, p: Player): boolean {
  return (
    (!c.requiresQuadrant || c.requiresQuadrant === p.quadrant) &&
    (!c.requiresQuadrants || c.requiresQuadrants.includes(p.quadrant)) &&
    (!c.requiresBusiness || p.assets.some((a) => a.kind === "business")) &&
    (!c.requiresTag ||
      p.assets.some((a) => a.tag === c.requiresTag) ||
      p.loans.some((l) => new RegExp(c.requiresTag!, "i").test(l.name))) &&
    (!c.requiresChildren || p.children > 0) &&
    (!c.requiresNegativeCash || p.cash < 0) &&
    (c.requiresMinScore === undefined || p.creditScore >= c.requiresMinScore) &&
    (!c.requiresLoans || p.loans.length > 0)
  );
}

export function eligibleEvents(p: Player, recent: string[]): EventCard[] {
  const pool = EVENT_CARDS.filter((c) => !recent.includes(c.id) && eventGateOk(c, p));
  if (pool.length > 0) return pool;
  // Fallback ham kvadrant gate'larini buzmasin: faqat umumiy hodisalar qaytadi.
  const gated = EVENT_CARDS.filter((c) => eventGateOk(c, p));
  const universal = gated.filter((c) => !c.requiresQuadrant && !c.requiresQuadrants);
  return universal.length > 0 ? universal : gated;
}

export function applyEvent(p: Player, card: EventCard, s?: GameState): string {
  const e = card.effect;
  switch (e.type) {
    case "inflation": {
      const k = 1 + e.pct / 100;
      p.expenseParts = {
        taxes: Math.round(p.expenseParts.taxes * k),
        housing: Math.round(p.expenseParts.housing * k),
        food: Math.round(p.expenseParts.food * k),
        transport: Math.round(p.expenseParts.transport * k),
        other: Math.round(p.expenseParts.other * k),
      };
      return `Xarajatlar +${e.pct}%`;
    }
    case "cash": {
      let amount = e.amount;
      if (amount < 0 && e.category) {
        const disc = expenseDiscountPct(p, e.category);
        if (disc < 0) amount = Math.round(amount * (1 + disc / 100));
      }
      p.cash += amount;
      return amount > 0 ? `+${formatUZSCompact(amount)}` : `−${formatUZSCompact(-amount)}`;
    }
    case "mortgage-discount":
      p.mortgageDiscount = true;
      return "Keyingi kvartira: −20% boshlang'ich to'lov";
    case "migration":
      // choice handled by UI/bots; this branch used only for decline
      return "Taklif rad etildi";
    case "freeze-business":
      p.freezeBusinessTurns += 1;
      return "Biznes oqimi 1 aylanaga 0";
    case "tax-free":
      p.taxFreeTurns += 1;
      return "Keyingi aylana soliq yo'q";
    case "harvest":
      if (p.professionId === "farmer") {
        p.cash += e.farmerAmount;
        return e.farmerAmount > 0
          ? `+${formatUZSCompact(e.farmerAmount)}`
          : `−${formatUZSCompact(-e.farmerAmount)}`;
      }
      return "Sizga ta'sir qilmadi";
    case "asset-value": {
      const targets = p.assets.filter((a) => a.kind === e.kind);
      if (targets.length === 0) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      let pct = e.pct;
      // Portfel maslahatchisi: salbiy hodisalar 50% yumshoq
      if (pct < 0 && p.marketAdviceMonths > 0) pct = Math.round(pct / 2);
      // Ziyoda "Xavf tahlili": salbiy bozor hodisalari 50% yumshoq
      if (pct < 0) {
        for (const m of abilityOf(p).modifiers) {
          if (m.type === "negative-event-soften") pct = Math.round(pct * (1 - m.pct / 100));
        }
      }
      const k = 1 + pct / 100;
      for (const a of targets) a.price = Math.round(a.price * k);
      return `Aktiv narxi ${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
    }
    case "cash-per-asset": {
      const count = p.assets.filter((a) => a.kind === e.kind).length;
      if (count === 0) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      const total = e.amount * count;
      p.cash += total;
      return total > 0 ? `+${formatUZSCompact(total)}` : `−${formatUZSCompact(-total)}`;
    }
    case "asset-income-pct": {
      const targets = p.assets.filter((a) => a.kind === e.kind && a.monthlyCashflow > 0);
      if (targets.length === 0) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      const k = 1 + e.pct / 100;
      for (const a of targets) a.monthlyCashflow = Math.round(a.monthlyCashflow * k);
      return `Oylik daromad ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}% (doimiy)`;
    }
    case "loan-payments": {
      if (p.loans.length === 0) return "Sizga ta'sir qilmadi (qarz yo'q)";
      p.loanPaymentMod = { pct: e.pct, monthsRemaining: e.months };
      return `Kredit to'lovlari ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}% · ${e.months} oy`;
    }
    case "field-cash": {
      if (!fieldMatches(p, e.fields)) return "Sizga ta'sir qilmadi";
      p.cash += e.amount;
      return e.amount > 0 ? `+${formatUZSCompact(e.amount)}` : `−${formatUZSCompact(-e.amount)}`;
    }
    case "field-cash-salary": {
      if (!fieldMatches(p, e.fields)) return "Sizga ta'sir qilmadi";
      p.cash += e.amount;
      applySalaryRaise(p, p.salary * (1 + e.salaryPct / 100));
      return `−${formatUZSCompact(-e.amount)}, maosh ${e.salaryPct > 0 ? "+" : "−"}${Math.abs(e.salaryPct)}% (doimiy)`;
    }
    case "field-tag-cash": {
      if (!fieldMatches(p, e.fields)) return "Sizga ta'sir qilmadi";
      if (!p.assets.some((a) => a.tag === e.tag)) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      p.cash += e.amount;
      return e.amount > 0 ? `+${formatUZSCompact(e.amount)}` : `−${formatUZSCompact(-e.amount)}`;
    }
    case "field-income-mod": {
      if (!fieldMatches(p, e.fields)) return "Sizga ta'sir qilmadi";
      const targets = p.assets.filter(
        (a) => (e.tag ? a.tag === e.tag : true) && (e.kind ? a.kind === e.kind : true) && a.monthlyCashflow > 0
      );
      if (targets.length === 0) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      const mult = 1 + e.pct / 100;
      for (const a of targets) {
        p.assetModifiers.push({ assetId: a.id, monthsRemaining: e.months, multiplier: mult });
      }
      return `Aktiv daromadi ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}% · ${e.months} oy`;
    }
    case "loan-offer": {
      const loan = takeLoanOffer(p, e.name, e.principal, e.monthlyRate, e.months);
      return `+${formatUZSCompact(e.principal)} naqd · −${formatUZSCompact(loan.monthlyPayment)}/oy qarz · Reyting ${SCORE_NEW_LOAN}`;
    }
    case "charity-block":
      p.charityBlockedTurns += e.months;
      return `Xayriya katakchasi ${e.months} aylanaga yopiq`;
    case "cash-chance": {
      const hit = Math.random() * 100 < e.chance;
      if (!hit) return "Omadingiz chiqdi — zarar yo'q";
      p.cash += e.amount;
      return e.amount > 0 ? `+${formatUZSCompact(e.amount)}` : `−${formatUZSCompact(-e.amount)}`;
    }
    case "analyst-badge":
      p.analystDealsLeft = Math.max(p.analystDealsLeft, e.deals);
      return `Keyingi ${e.deals} bitimda "tahliliy" ROI badge`;
    case "deal-coupon":
      p.dealCoupon = { pct: e.pct, kinds: e.kinds };
      return `Keyingi mos bitimda −${e.pct}% chegirma`;
    case "securities-move": {
      let pct = e.pct;
      // Portfel maslahatchisi: salbiy hodisalar 50% yumshoq
      if (pct < 0 && p.marketAdviceMonths > 0) pct = Math.round(pct / 2);
      // Ziyoda "Xavf tahlili": salbiy birja hodisalari 50% yumshoq
      if (pct < 0) {
        for (const m of abilityOf(p).modifiers) {
          if (m.type === "negative-event-soften") pct = Math.round(pct * (1 - m.pct / 100));
        }
      }
      if (s) movePrices(s, e.sectors, pct);
      const affected = p.portfolio.some((h) => {
        const sec = securityById(h.securityId);
        return !!sec && h.qty > 0 && e.sectors.includes(sec.sector);
      });
      const sign = pct > 0 ? "+" : "−";
      if (!affected) return `Bozor ${sign}${Math.abs(pct)}% — sizga ta'sir qilmadi (portfelda bunday qog'oz yo'q)`;
      return `Portfelingiz ${sign}${Math.abs(pct)}%`;
    }
    case "dividend-boost":
      if (p.portfolio.length === 0) return "Sizga ta'sir qilmadi (portfel bo'sh)";
      p.dividendBoost = { mult: e.mult, monthsRemaining: e.months };
      return `Dividendlar ×${e.mult} · ${e.months} oy`;
    case "ipo-offer": {
      const sec = securityById(e.securityId);
      if (!sec) return "IPO topilmadi";
      const marketPrice = s?.exchange.prices[sec.id] ?? sec.basePrice;
      const offerPrice = Math.round(marketPrice * (1 - e.discountPct / 100));
      if (!s) return "Bozor holati mavjud emas";
      const perUnit = offerPrice + tradeFee(offerPrice);
      const qty = Math.min(e.maxQty, Math.floor(p.cash / perUnit));
      if (qty <= 0) return "Naqd yetarli emas — IPO taklifi o'tkazib yuborildi";
      const res = buySecurity(p, s, sec.id, qty, offerPrice);
      if (!res) return "Naqd yetarli emas — IPO taklifi o'tkazib yuborildi";
      return `IPO: ${qty} ta ${sec.ticker} × ${formatUZSCompact(offerPrice)} (−${e.discountPct}%)`;
    }
    case "salary-pct": {
      let pct = e.pct;
      // Shifokor qobiliyati (tibbiyot chegirmasi): og'ir daromad keskinligi 50% yumshoq
      if (pct <= -50 && expenseDiscountPct(p, "tibbiyot") < 0) pct = Math.round(pct / 2);
      p.salaryMultiplier = 1 + pct / 100;
      p.salaryMonths = e.months;
      // doimiy maosh oshirimi — lifestyle inflation ham qo'llanadi (A7)
      if (e.months === null && pct > 0) scaleExpensesForRaise(p, pct / 100);
      const pctTxt = `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
      return e.months === null ? `Maosh ${pctTxt} (doimiy)` : `Maosh ${pctTxt} · ${e.months} oy`;
    }
    case "cash-salary": {
      const amount = Math.round(effectiveSalary(p) * e.mult);
      p.cash += amount;
      return amount >= 0 ? `+${formatUZSCompact(amount)}` : `−${formatUZSCompact(-amount)}`;
    }
    case "expense-part": {
      p.expenseParts[e.part] = Math.max(0, p.expenseParts[e.part] + e.amount);
      const sign = e.amount > 0 ? "+" : "−";
      return `Oylik xarajat ${sign}${formatUZSCompact(Math.abs(e.amount))} (doimiy)`;
    }
    case "asset-kind-income-mod": {
      const targets = p.assets.filter((a) => a.kind === e.kind && a.monthlyCashflow > 0);
      if (targets.length === 0) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      const mult = 1 + e.pct / 100;
      for (const a of targets) {
        p.assetModifiers.push({ assetId: a.id, monthsRemaining: e.months, multiplier: mult });
      }
      return `Aktiv daromadi ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}% · ${e.months} oy`;
    }
    case "temp-expense": {
      p.installments.push({
        id: `i${nextId()}`,
        title: e.title,
        monthlyPayment: e.amount,
        remainingMonths: e.months,
        totalMonths: e.months,
      });
      return `−${formatUZSCompact(e.amount)}/oy × ${e.months} oy`;
    }
    case "market-advice":
      p.marketAdviceMonths = Math.max(p.marketAdviceMonths, e.months);
      return `Keyingi ${e.months} oy salbiy bozor hodisalari 50% yumshoq`;
    case "portfolio-sell": {
      if (!s || p.portfolio.length === 0) return "Sizga ta'sir qilmadi (portfel bo'sh)";
      let total = 0;
      for (const h of [...p.portfolio]) {
        const qty = Math.floor((h.qty * e.pct) / 100);
        if (qty <= 0) continue;
        const res = sellSecurity(p, s, h.securityId, qty);
        if (res) total += res.total - res.fee;
      }
      return total > 0
        ? `Portfelning ${e.pct}% sotildi: +${formatUZSCompact(total)}`
        : "Sotish imkoni bo'lmadi (pozitsiyalar juda kichik)";
    }
    case "fx-swing": {
      const down = p.assets.filter((a) => a.monthlyCashflow > 0 && !!a.tag && e.downTags.includes(a.tag));
      const up = p.assets.filter((a) => a.monthlyCashflow > 0 && !!a.tag && e.upTags.includes(a.tag));
      for (const a of down) {
        p.assetModifiers.push({ assetId: a.id, monthsRemaining: e.months, multiplier: 1 - e.pct / 100 });
      }
      for (const a of up) {
        p.assetModifiers.push({ assetId: a.id, monthsRemaining: e.months, multiplier: 1 + e.pct / 100 });
      }
      const parts: string[] = [];
      if (down.length > 0) parts.push(`import bizneslar −${e.pct}% (${down.length} ta)`);
      if (up.length > 0) parts.push(`eksport/texnologiya +${e.pct}% (${up.length} ta)`);
      if (parts.length === 0) return "Sizga ta'sir qilmadi (bunday aktiv yo'q)";
      return `${parts.join(" · ")} · ${e.months} oy`;
    }
    case "asset-market-tax": {
      if (p.assets.length === 0) {
        p.cash -= e.min;
        return `−${formatUZSCompact(e.min)} (minimal jarima)`;
      }
      const value = s
        ? totalAssetMarketValue(s, p)
        : p.assets.reduce((sum, a) => sum + a.price, 0);
      const amount = Math.max(e.min, Math.round((value * e.pct) / 100));
      p.cash -= amount;
      return `Aktivlar qiymatining ${e.pct}%-i: −${formatUZSCompact(amount)}`;
    }
    case "refinance": {
      if (p.loans.length === 0) return "Sizga ta'sir qilmadi (qarz yo'q)";
      const before = p.loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
      for (const l of p.loans) {
        const newRate = Math.max(0, l.monthlyRate - e.rateDelta);
        l.monthlyRate = newRate;
        l.monthlyPayment = annuityPayment(l.remainingBalance, newRate, Math.max(1, l.remainingMonths));
      }
      const after = p.loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
      return `Stavkalar −${(e.rateDelta * 100).toFixed(1)}%/oy: oylik to'lov ${formatUZSCompact(before)} → ${formatUZSCompact(after)}`;
    }
    case "knowledge": {
      const gained = gainKnowledge(p, e.amount);
      return gained > 0 ? `Bilim darajasi +${gained} (hozir: ${p.knowledge}/${KNOWLEDGE_MAX})` : "Bilim darajasi maksimalda";
    }
    case "client-add": {
      if (!p.assets.some((a) => a.kind === "business")) return "Sizga ta'sir qilmadi (biznes aktiv yo'q)";
      const client: Client = {
        id: `c${nextId()}`,
        name: e.name,
        monthlyFee: e.monthlyFee,
        loyalty: Math.max(CLIENT_LOYALTY_MIN, Math.min(CLIENT_LOYALTY_MAX, e.loyalty)),
      };
      p.clients.push(client);
      return `Yangi mijoz: ${client.name} — +${formatUZSCompact(client.monthlyFee)}/oy`;
    }
    case "client-leave": {
      const left = clientLeave(p);
      if (!left) {
        return p.clients.length === 0
          ? "Sizga ta'sir qilmadi (mijozlar yo'q)"
          : "Menejeringiz mijozni ushlab qoldi";
      }
      return `Mijoz ketdi: ${left.name} — −${formatUZSCompact(left.monthlyFee)}/oy`;
    }
    case "nothing":
      return "Moliyaviy o'zgarish yo'q";
  }
}

/** Kasb maydoni mosligi (kasbga mos hodisalar uchun) — o'z personaj customField'i ham tekshiriladi. */
export function fieldMatches(p: Player, fields: ProfessionField[]): boolean {
  if (p.customField) return fields.includes(p.customField);
  const prof = PROFESSIONS.find((x) => x.id === p.professionId);
  if (prof) return fields.includes(prof.field);
  const hero = heroById(p.heroId);
  return !!hero && fields.includes(hero.field);
}

export function acceptMigration(p: Player): string {
  p.skipTurns += 2;
  p.cash += 15_000_000;
  return "+15 mln so'm, 2 aylana o'tkazib yuboriladi";
}

/* ---------------- Hayotiy hodisa (rare, after-payday) ---------------- */

/**
 * Hayotiy hodisa kolodasi: kvadrant cheklovi (lavozim ko'tarilishi faqat E)
 * + ishsizlikda maoshga bog'liq hodisalar (salary-pct) tushmaydi.
 */
export function eligibleLifeEvents(p: Player): LifeEventCard[] {
  const pool = LIFE_EVENTS.filter(
    (c) =>
      (!c.requiresQuadrant || c.requiresQuadrant === p.quadrant) &&
      !(p.unemployedMonths > 0 && c.effect.type === "salary-pct")
  );
  const universal = LIFE_EVENTS.filter(
    (c) => !c.requiresQuadrant && !(p.unemployedMonths > 0 && c.effect.type === "salary-pct")
  );
  return pool.length > 0 ? pool : universal;
}

export function applyLifeEvent(p: Player, card: LifeEventCard): string {
  const e = card.effect;
  switch (e.type) {
    case "cash": {
      let amount = e.amount;
      if (amount < 0 && e.category) {
        const disc = expenseDiscountPct(p, e.category);
        if (disc < 0) amount = Math.round(amount * (1 + disc / 100));
      }
      p.cash += amount;
      return amount > 0 ? `+${formatUZSCompact(amount)}` : `−${formatUZSCompact(-amount)}`;
    }
    case "salary-pct": {
      p.salaryMultiplier = 1 + e.pct / 100;
      p.salaryMonths = e.months;
      // doimiy maosh oshirimi — lifestyle inflation ham qo'llanadi (A7)
      if (e.months === null && e.pct > 0) scaleExpensesForRaise(p, e.pct / 100);
      const pct = `${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}%`;
      return e.months === null ? `Maosh ${pct} (doimiy)` : `Maosh ${pct} · ${e.months} oy`;
    }
    case "cash-profession": {
      let amount = p.professionId === e.professionId ? e.professionAmount : e.amount;
      if (amount < 0 && e.category) {
        const disc = expenseDiscountPct(p, e.category);
        if (disc < 0) amount = Math.round(amount * (1 + disc / 100));
      }
      p.cash += amount;
      return amount > 0 ? `+${formatUZSCompact(amount)}` : `−${formatUZSCompact(-amount)}`;
    }
    case "freeze-top-realestate": {
      const targets = p.assets.filter((a) => a.kind === "realestate" && a.monthlyCashflow > 0);
      if (targets.length === 0) return "Sizga ta'sir qilmadi (ko'chmas mulk yo'q)";
      const top = targets.sort((a, b) => b.price - a.price)[0];
      p.assetModifiers.push({ assetId: top.id, monthsRemaining: e.months, multiplier: 0 });
      return `«${top.title}» ijara daromadi ${e.months} oyga 0`;
    }
    case "cash-if-business": {
      if (!p.assets.some((a) => a.kind === "business")) return "Sizga ta'sir qilmadi (biznes aktiv yo'q)";
      p.cash += e.amount;
      return e.amount > 0 ? `+${formatUZSCompact(e.amount)}` : `−${formatUZSCompact(-e.amount)}`;
    }
    case "cash-if-tag": {
      const has = p.assets.some((a) => a.tag && e.tags.includes(a.tag));
      const isProf = e.orProfessionId !== undefined && p.professionId === e.orProfessionId;
      if (!has && !isProf) return "Sizga ta'sir qilmadi";
      p.cash += e.amount;
      return e.amount > 0 ? `+${formatUZSCompact(e.amount)}` : `−${formatUZSCompact(-e.amount)}`;
    }
  }
}

/* ---------------- Dam olish kuni (weekend) ---------------- */

export type WeekendChoice = "spend" | "free";

export function weekendSpendCost(p: Player, card: WeekendCard): number {
  const s = card.spend;
  if (p.children > 0 && s.costIfChildren !== undefined) return s.costIfChildren;
  return s.cost;
}

/**
 * Resolve a weekend choice. Paying for ≥3 distinct activities in one game
 * grants the one-time "Zaryad" bonus from a relative (sog'lom turmush).
 */
export function applyWeekend(p: Player, card: WeekendCard, choice: WeekendChoice): string {
  if (choice === "free") return card.free.note;
  const opt = card.spend;
  const parts: string[] = [];
  const cost = weekendSpendCost(p, card);
  if (cost > 0) {
    p.cash -= cost;
    parts.push(`−${formatUZSCompact(cost)}`);
  }
  if (opt.addInstallment) {
    const ai = opt.addInstallment;
    p.installments.push({
      id: `i${nextId()}`,
      title: card.title,
      monthlyPayment: ai.monthlyPayment,
      remainingMonths: ai.months,
      totalMonths: ai.months,
    });
    parts.push(`−${formatUZSCompact(ai.monthlyPayment)}/oy × ${ai.months} oy`);
  }
  parts.push(opt.note);
  // Zaryad meta-bonus for a healthy lifestyle
  if (!p.zaryadClaimed) {
    if (!p.weekendSpends.includes(card.id)) p.weekendSpends.push(card.id);
    if (p.weekendSpends.length >= ZARYAD_THRESHOLD) {
      p.zaryadClaimed = true;
      p.cash += ZARYAD_BONUS;
      parts.push(`Zaryad! Qarindoshingiz "sog'lom turmush" uchun +${formatUZSCompact(ZARYAD_BONUS)} hadya qildi`);
    }
  }
  return parts.join(" · ");
}

/* ---------------- Avans (oy o'rtasi, index 15) ---------------- */

/**
 * Avans summasi: 30% × max(0, effektiv maosh − oylik kredit to'lovlari).
 * Kredit to'lovlari avansdan oldin "ajratilgan" hisoblanadi — o'yinchi
 * kreditga ketadigan pulni erkin pul deb o'ylab qolmaydi (fix-12).
 * Kreditlar maoshni yutsa avans 0.
 */
export function avansAmount(p: Player): number {
  const base = Math.max(0, effectiveSalary(p) - loanPayments(p));
  return Math.round(base * AVANS_RATE);
}

/**
 * Avans: sof maoshning (maosh − kredit to'lovlari) 30%-i naqd beriladi.
 * Dividendlar/passiv/kredit tick'lari faqat Oy kun payday'da — bu yerda yo'q.
 * Ishsizlikda (effectiveSalary 0) avans yo'q. Kvadrant faqat matnni o'zgartiradi.
 * Olindi bo'lsa — bayroq qo'yiladi va summa avansReceived'da saqlanadi:
 * oy kunida maoshdan aynan shu qism ayiriladi (avans + payday = maosh, A1).
 */
export function applyAvans(p: Player): number {
  const amount = avansAmount(p);
  p.cash += amount;
  p.avansReceived = amount;
  if (amount > 0) p.avansTakenThisMonth = true;
  return amount;
}

/* ---------------- Oy kalendari ---------------- */

/** Kechiktirilgan xarajat qaytganda ma'lumot (toast uchun). */
export interface DeferredReturn {
  playerId: number;
  playerName: string;
  cardId: string;
  amount: number;
}

/** Aktiv turi uchun yangilik sektor biasi: faol sarlavha shu turni qamrasa pct/100. */
export function newsSectorBias(s: GameState, kind: AssetKind): number {
  const h = newsById(s.news?.id ?? null);
  if (!h) return 0;
  return h.kinds && h.kinds.includes(kind) ? h.pct / 100 : 0;
}

/**
 * Bozor indekslari drifti (har oy): idx × (1 + random(−4%, +6%) + yangilik biasi),
 * [0,5; 2,0] oralig'ida qisiladi.
 */
export function driftMarketIndices(s: GameState, rand: () => number = Math.random) {
  for (const kind of Object.keys(s.marketIndices) as AssetKind[]) {
    const drift = MARKET_DRIFT_MIN + rand() * (MARKET_DRIFT_MAX - MARKET_DRIFT_MIN);
    const next = s.marketIndices[kind] * (1 + drift + newsSectorBias(s, kind));
    s.marketIndices[kind] = Math.max(MARKET_INDEX_MIN, Math.min(MARKET_INDEX_MAX, next));
  }
}

/** Aktivning joriy bozor qiymati: narx × bozor indeksi. */
export function assetMarketValue(s: GameState, a: Asset): number {
  return Math.round(a.price * (s.marketIndices[a.kind] ?? 1));
}

/** O'yinchining barcha aktivlarining joriy bozor qiymati yig'indisi. */
export function totalAssetMarketValue(s: GameState, p: Player): number {
  return p.assets.reduce((sum, a) => sum + assetMarketValue(s, a), 0);
}

/** Maosh indeksatsiyasi qilingan o'yinchi ma'lumoti (toast/log uchun). */
export interface SalaryIndexation {
  playerId: number;
  playerName: string;
  oldSalary: number;
  newSalary: number;
}

/** fix-13c (Q3): aktiv riski voqeasi — "yomon oy" (1 oy daromad 0) yoki "inqiroz" (3 oy ×0,5). */
export interface RiskEvent {
  playerId: number;
  playerName: string;
  assetTitle: string;
  kind: "yomon" | "inqiroz";
  /** faqat yomon oy uchun sabab matni */
  reason?: string;
}

/** completeMonth natijasi: qaytgan kechiktirilgan xarajatlar + indeksatsiyalar + risk voqealari. */
export interface MonthResult {
  deferred: DeferredReturn[];
  indexed: SalaryIndexation[];
  risk: RiskEvent[];
}

/**
 * Oy tugadi: 0-katakdan (Oy kun) o'tilganda hisoblagich +1, avans bayroqlari
 * reset, bozor indekslari drifti, kechiktirilgan doodadlar qaytishi,
 * kvadrant o'tishlari tekshiruvi (B1) va har SALARY_INDEX_MONTHS oyda
 * E/S kvadrantlar maosh indeksatsiyasi +6% (B5, lifestyle inflation bilan).
 */
export function completeMonth(s: GameState, rand: () => number = Math.random): MonthResult {
  s.month += 1;
  addLog(s, "coins", "🗓 Oy tugadi! Yangi oy boshlandi.", "gold");
  driftMarketIndices(s);
  const deferred: DeferredReturn[] = [];
  const indexed: SalaryIndexation[] = [];
  const risk: RiskEvent[] = [];
  for (const p of s.players) {
    p.avansTakenThisMonth = false;
    p.avansReceived = 0;
    // fix-17 (R1): oy yakunida reja maosh koeffitsiyenti tiklanadi
    p.planSalaryScale = 1;
    // fix-18 (E): haftalik reja — yangi oy 1-haftadan boshlanadi
    p.planWeekIdx = 0;
    // fix-13b (M1): naqd zaxira 3× xarajatdan ortiq va ishlamay yotibmi — hisoblagich
    if (typeof p.idleCashMonths !== "number") p.idleCashMonths = 0;
    p.idleCashMonths =
      !p.bankrupt && !p.escaped && p.cash > 3 * totalExpenses(p) ? p.idleCashMonths + 1 : 0;
    // B1: kvadrant progressiyasi har oy tekshiriladi (sakrash yo'q)
    if (!p.bankrupt && !p.escaped) {
      const advanced = maybeAdvanceQuadrant(p, s.exchange);
      if (advanced) {
        addLog(s, "rocket", `${p.name}: ${advanced} kvadrantiga ko'tarildi! (+1 bilim)`, "gold");
      }
    }
    // fix-15 (P4): farzandlar hayot tsikli — 3 yosh bog'cha, 7 yosh maktab tanlovi
    queueChildMilestones(s, p);
    // kechiktirilgan doodadlar qaytishi
    const due = p.deferredDoodads.filter((d) => s.month - d.addedMonth >= DEFER_RETURN_MONTHS);
    if (due.length > 0) {
      p.deferredDoodads = p.deferredDoodads.filter((d) => s.month - d.addedMonth < DEFER_RETURN_MONTHS);
      for (const d of due) {
        const card = DOODAD_CARDS.find((c) => c.id === d.cardId);
        const base = card?.cost ?? 0;
        const amount = Math.round(base * (1 + DEFER_PRICE_MARKUP));
        p.cash -= amount;
        deferred.push({ playerId: p.id, playerName: p.name, cardId: d.cardId, amount });
        addLog(
          s,
          "event",
          `${p.name}: Kechiktirgan xarajati qaytdi: ${card?.title ?? d.cardId} — −${formatUZSCompact(amount)} (narx +12%)`,
          "bad"
        );
      }
    }
    // B5: maosh indeksatsiyasi — har 12 oyda +6% (faqat E/S, lifestyle inflation bilan)
    if (
      s.month % SALARY_INDEX_MONTHS === 0 &&
      !p.bankrupt &&
      !p.escaped &&
      (p.quadrant === "E" || p.quadrant === "S") &&
      p.salary > 0
    ) {
      const oldSalary = p.salary;
      applySalaryRaise(p, p.salary * (1 + SALARY_INDEX_PCT));
      indexed.push({ playerId: p.id, playerName: p.name, oldSalary, newSalary: p.salary });
      addLog(
        s,
        "work",
        `${p.name}: Maosh indeksatsiyasi +${Math.round(SALARY_INDEX_PCT * 100)}%: ${formatUZSCompact(oldSalary)} → ${formatUZSCompact(p.salary)}`,
        "good"
      );
    }
    // fix-13c (Q3): aktiv risklari — riskLevel ≥ 3 "yomon oy", risky "inqiroz"
    if (!p.bankrupt && !p.escaped) {
      let reasonIdx = (s.month + p.id) % RISK_BAD_REASONS.length;
      for (const a of p.assets) {
        if (a.constructionLeft && a.constructionLeft > 0) continue;
        if (a.monthlyCashflow <= 0) continue;
        // faol inqiroz/modifikator bor aktiv — yangi voqea qo'llanmaydi
        const busy = p.assetModifiers.some((m) => m.assetId === a.id && m.monthsRemaining > 0);
        if (busy) continue;
        const lvl = a.riskLevel ?? 0;
        if (lvl >= 3 && rand() < ((lvl - 2) * RISK_BAD_MONTH_PCT) / 100) {
          const reason = RISK_BAD_REASONS[reasonIdx % RISK_BAD_REASONS.length];
          reasonIdx += 1;
          p.assetModifiers.push({ assetId: a.id, monthsRemaining: 1, multiplier: 0 });
          risk.push({ playerId: p.id, playerName: p.name, assetTitle: a.title, kind: "yomon", reason });
          const text = `⚠️ ${p.name} — ${a.title}: bu oy tushum bo'lmadi (${reason})`;
          addLog(s, "event", text, "bad");
          notify(s, { icon: "⚠️", title: "Aktiv riski", body: text, tone: "bad" });
          continue;
        }
        if (a.risky && rand() < RISKY_CRISIS_CHANCE) {
          p.assetModifiers.push({ assetId: a.id, monthsRemaining: RISKY_CRISIS_MONTHS, multiplier: RISKY_CRISIS_MULT });
          risk.push({ playerId: p.id, playerName: p.name, assetTitle: a.title, kind: "inqiroz" });
          const text = `🚨 ${p.name} — ${a.title}: inqiroz! Daromad ${RISKY_CRISIS_MONTHS} oyga yarmiga tushdi`;
          addLog(s, "event", text, "bad");
          notify(s, { icon: "🚨", title: "Aktiv inqirozi", body: text, tone: "bad" });
        }
      }
    }
  }
  return { deferred, indexed, risk };
}

/** Asosiy doska katak indeksini oy kuniga o'girish: 0 → 1-kun ... 29 → 30-kun. */
export function dayOfMonth(position: number): number {
  return (position % RAT_CELLS.length) + 1;
}

/* ---------------- Dam olish kunida uy xarajati ---------------- */

export interface HomeExpense {
  title: string;
  amount: number;
}

/**
 * Dam olish katakchasiga tushganda 30% ehtimol bilan avtomatik uy xarajati
 * (tanlov kolodasi o'rniga): 150–600 ming so'm, modalsiz. null = odatiy koloda.
 */
export function rollHomeExpense(rand: () => number = Math.random): HomeExpense | null {
  if (rand() >= HOME_EXPENSE_CHANCE) return null;
  const title = HOME_EXPENSES[Math.min(HOME_EXPENSES.length - 1, Math.floor(rand() * HOME_EXPENSES.length))];
  const raw = HOME_EXPENSE_MIN + rand() * (HOME_EXPENSE_MAX - HOME_EXPENSE_MIN);
  const amount = Math.max(HOME_EXPENSE_MIN, Math.min(HOME_EXPENSE_MAX, Math.round(raw / 10_000) * 10_000));
  return { title, amount };
}

/** Uy xarajatini naqd puldan avtomatik ushlab qolish (manfiyga ketsa — oy kunida penya/bankrotlik). */
export function applyHomeExpense(p: Player, expense: HomeExpense) {
  p.cash -= expense.amount;
}

/* ---------------- Doodads (game.md §7.5) ---------------- */

export type DoodadMode = "cash" | "credit";

/**
 * "Keyinroq olaman" — doodad kechiktiriladi: naqd yechilmaydi, lekin
 * DEFER_RETURN_MONTHS oydan keyin narx ×(1+DEFER_PRICE_MARKUP) bilan qaytadi.
 * Limit: o'yin davomida MAX_DOODAD_DEFERS marta. false = limit tugagan.
 */
export function deferDoodad(p: Player, card: DoodadCard, month: number): boolean {
  if (p.deferCount >= MAX_DOODAD_DEFERS) return false;
  const existing = p.deferredDoodads.find((d) => d.cardId === card.id);
  if (existing) existing.count += 1;
  else {
    const entry: DeferredDoodad = { cardId: card.id, addedMonth: month, count: 1 };
    p.deferredDoodads.push(entry);
  }
  p.deferCount += 1;
  return true;
}

export function applyDoodad(p: Player, card: DoodadCard, mode: DoodadMode): string {
  // Qahramon qobiliyati: kategoriya chegirmasi (masalan, Aziza — ta'lim −20%)
  const disc = card.category ? expenseDiscountPct(p, card.category) : 0;
  const cost = disc < 0 ? Math.round(card.cost * (1 + disc / 100)) : card.cost;
  if (mode === "credit") {
    const t = doodadCreditTerms(card, cost);
    // annuitet kredit: 24%/yil, 12 oy; reyting ≥ 550 va boshlang'ich to'lov kerak
    if (p.creditScore >= SCORE_DOODAD_MIN && p.cash >= t.down) {
      p.cash -= t.down;
      p.loans.push(
        createLoan(`l${nextId()}`, `Iste'mol krediti (${card.title})`, t.principal, DOODAD_CREDIT_MONTHLY_RATE, DOODAD_CREDIT_MONTHS)
      );
      adjustCreditScore(p, SCORE_NEW_LOAN);
      return `Kreditga olindi: −${formatUZSCompact(t.monthlyPayment)}/oy × ${t.months} oy · Reyting ${SCORE_NEW_LOAN}`;
    }
  }
  if (p.cash >= cost) {
    p.cash -= cost;
    return `−${formatUZSCompact(cost)}`;
  }
  // auto-financed (game.md §3.3): forced loan
  const fl = card.forceLoan ?? {
    principal: cost,
    monthlyPayment: Math.max(200_000, Math.round(cost / 12)),
  };
  p.loans.push({
    id: `l${nextId()}`,
    name: `Iste'mol krediti (${card.title})`,
    principal: fl.principal,
    ...amortizeTerms(fl.principal, fl.monthlyPayment),
  });
  adjustCreditScore(p, SCORE_NEW_LOAN);
  return `Qarzga olindi: −${formatUZSCompact(fl.monthlyPayment)}/oy · Reyting ${SCORE_NEW_LOAN}`;
}

/* ---------------- Other cells ---------------- */

export function applyCharity(p: Player, accept: boolean): number {
  if (!accept || p.charityBlockedTurns > 0) return 0;
  const donation = Math.round(p.salary * 0.1);
  p.cash -= donation;
  p.charityTurns = 3;
  return donation;
}

export interface BabyResult {
  /** "gap" — fix-15 (P3): farzand oraliq 2 yildan (24 oy) kam, hodisa o'tkaziladi */
  kind: "baby" | "feast" | "gap";
  cost: number;
}

export function applyBaby(p: Player, month: number = BABY_MIN_GAP_MONTHS): BabyResult {
  if (p.children >= MAX_CHILDREN) {
    p.cash -= 1_000_000;
    return { kind: "feast", cost: 1_000_000 };
  }
  // fix-15 (P3): farzandlar oralig'i kamida 2 yil (24 oy)
  if (month - p.lastBabyMonth < BABY_MIN_GAP_MONTHS) {
    return { kind: "gap", cost: 0 };
  }
  p.children += 1;
  p.children2.push({ bornMonth: month, edu: "none" });
  p.lastBabyMonth = month;
  return { kind: "baby", cost: CHILD_COST };
}

/* ---------------- fix-15 (P4): Farzandlar hayot tsikli ---------------- */

/**
 * completeMonth ichida chaqiriladi: har bir farzandning yoshini tekshirib,
 * 3 yoshda bog'cha, 7 yoshda maktab tanlovini pendingChildEvent'ga qo'yadi.
 * Bir vaqtda bitta tanlov; keyingisi navbat kelganda ochiladi.
 */
function queueChildMilestones(s: GameState, p: Player): void {
  if (p.bankrupt || p.escaped) return;
  if (p.pendingChildEvent) return; // oldingi tanlov hal qilinmagan
  for (let i = 0; i < p.children2.length; i++) {
    const c = p.children2[i];
    const ageMonths = s.month - c.bornMonth;
    // bog'cha faqat 3–7 yosh oralig'ida taklif qilinadi (7 yoshda maktab ochiladi)
    if (!c.offeredKg && ageMonths >= KINDERGARTEN_AGE_MONTHS && ageMonths < SCHOOL_AGE_MONTHS && c.edu === "none") {
      c.offeredKg = true;
      p.pendingChildEvent = { childIndex: i, stage: "kg" };
      addLog(s, "baby", `${p.name}: farzandi 3 yoshga to'ldi — bog'cha tanlovi`, "neutral");
      notify(s, {
        icon: "🧒",
        title: "Farzand 3 yoshda",
        body: `${p.name}: farzandi 3 yoshga to'ldi — bog'cha tanlang`,
        tone: "gold",
      });
      return;
    }
    if (!c.offeredSchool && ageMonths >= SCHOOL_AGE_MONTHS && !isSchoolEdu(c.edu)) {
      c.offeredSchool = true;
      p.pendingChildEvent = { childIndex: i, stage: "school" };
      addLog(s, "baby", `${p.name}: farzandi 7 yoshga to'ldi — maktab tanlovi`, "neutral");
      notify(s, {
        icon: "🎒",
        title: "Farzand 7 yoshda",
        body: `${p.name}: farzandi 7 yoshga to'ldi — maktab tanlang`,
        tone: "gold",
      });
      return;
    }
  }
}

function isSchoolEdu(edu: ChildEdu): boolean {
  return edu === "sch-state" || edu === "sch-plus" || edu === "sch-private";
}

/** Bog'cha tanlovi variantlari (3 yosh). */
export const KINDERGARTEN_OPTIONS: { edu: ChildEdu; cost: number }[] = [
  { edu: "none", cost: 0 },
  { edu: "kg-state", cost: CHILD_EDU_COSTS["kg-state"] },
  { edu: "kg-private", cost: CHILD_EDU_COSTS["kg-private"] },
];

/** Maktab tanlovi variantlari (7 yosh) — bog'cha xarajati to'xtaydi. */
export const SCHOOL_OPTIONS: { edu: ChildEdu; cost: number }[] = [
  { edu: "sch-state", cost: CHILD_EDU_COSTS["sch-state"] },
  { edu: "sch-plus", cost: CHILD_EDU_COSTS["sch-plus"] },
  { edu: "sch-private", cost: CHILD_EDU_COSTS["sch-private"] },
];

/**
 * Farzand ta'limi tanlovini qo'llash (modal tanlovi). Maktab tanlanganda
 * bog'cha xarajati avtomatik to'xtaydi (edu almashinadi).
 */
export function resolveChildEvent(p: Player, edu: ChildEdu): void {
  const ev = p.pendingChildEvent;
  if (!ev) return;
  const c = p.children2[ev.childIndex];
  if (c) c.edu = edu;
  p.pendingChildEvent = null;
}

/** Botlar uchun avtomatik tanlov: davlat bog'chasi / davlat maktabi. */
export function autoResolveChildEvent(p: Player): void {
  const ev = p.pendingChildEvent;
  if (!ev) return;
  resolveChildEvent(p, ev.stage === "kg" ? "kg-state" : "sch-state");
}

export function applyDownsized(p: Player): number {
  const amount = totalExpenses(p);
  p.cash -= amount;
  p.skipTurns += 2;
  p.unemployedMonths = UNEMPLOYED_MONTHS; // 2 oy kun maosh 0
  return amount;
}

/* ---------------- Bankruptcy (game.md §6) ---------------- */

export function emergencyLoan(p: Player): Loan | null {
  if (p.usedEmergencyLoan) return null;
  const principal = -p.cash + 10_000_000;
  const loan = createLoan(
    `l${nextId()}`,
    `Shoshilinch qarz (40%/yil, ${EMERGENCY_LOAN_MONTHS} oy)`,
    principal,
    EMERGENCY_RATE_YEAR / 12,
    EMERGENCY_LOAN_MONTHS
  );
  p.loans.push(loan);
  p.cash += principal;
  p.usedEmergencyLoan = true;
  adjustCreditScore(p, SCORE_EMERGENCY);
  return loan;
}

/* fix-14 (T1): Qarindoshlardan foizsiz qarz ("qarz") ---------------- */

/** O'yinchi olishi mumkin bo'lgan maksimal qarz: 2 × oylik umumiy daromad. */
export function qarzMaxAmount(p: Player): number {
  return Math.round(monthlyIncome(p) * QARZ_INCOME_MULT);
}

/** Qarz olish mumkinmi — barcha shartlar (UI disable sabablari uchun ham). */
export function canTakeQarz(s: GameState, p: Player, amount: number, months: number): boolean {
  if (!QARZ_MONTHS.includes(months)) return false;
  if (p.loans.some((l) => l.kind === "qarz")) return false; // faqat bitta faol qarz
  if (s.month < (p.qarzBlockedUntil ?? 0)) return false; // kechiktirish jarayoni bloklagan
  if (amount < QARZ_MIN) return false;
  if (amount > qarzMaxAmount(p)) return false;
  return true;
}

/**
 * Qarindoshlardan foizsiz qarz olish: foiz 0%, oylik to'lov yo'q —
 * `months` oy o'tgach to'liq summa avtomatik yechiladi (tickLoans).
 * Shartlar bajarilmasa null qaytadi.
 */
export function takeQarz(s: GameState, playerId: number, amount: number, months: number): Loan | null {
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return null;
  amount = Math.round(amount);
  if (!canTakeQarz(s, p, amount, months)) return null;
  const loan: Loan = {
    id: `qarz-${nextId()}`,
    name: "Qarindoshlardan qarz (foizsiz)",
    principal: amount,
    monthlyPayment: 0,
    monthlyRate: 0,
    remainingMonths: months,
    remainingBalance: amount,
    totalMonths: months,
    kind: "qarz",
    dueMonth: s.month + months,
  };
  p.loans.push(loan);
  p.cash += amount;
  addLog(s, "work", `${p.name}: 🤝 Qarindoshlardan qarz olindi: +${formatUZSCompact(amount)} (${months} oy, foizsiz)`, "good");
  notify(s, {
    icon: "🤝",
    title: "Foizsiz qarz",
    body: `${p.name}: +${formatUZSCompact(amount)} — ${months} oyda qaytariladi`,
    tone: "good",
  });
  return loan;
}

/** Qarzni muddatidan oldin to'liq qaytarish (faqat to'liq summa). */
export function repayQarz(p: Player, loanId: string): boolean {
  const idx = p.loans.findIndex((l) => l.id === loanId && l.kind === "qarz");
  if (idx < 0) return false;
  const balance = p.loans[idx].remainingBalance;
  if (!(balance > 0) || p.cash < balance) return false;
  p.cash -= balance;
  p.loans.splice(idx, 1);
  return true;
}

/* fix-14 (T2): Shoshilinch sotuv realligi ---------------- */

/** Shoshilinch sotuv koeffitsiyenti — likvidlik darajasiga ko'ra (yo'qsa 3 → 0,85). */
export function urgencyFactor(a: Asset): number {
  return URGENCY_FACTORS[a.liquidity ?? DEFAULT_LIQUIDITY] ?? URGENCY_FACTORS[DEFAULT_LIQUIDITY];
}

export interface UrgentSaleQuote {
  marketValue: number;
  resalePct: number;
  urgency: number;
  /** 1 − urgency (UI: "Shoshilinch chegirma: −Z%") */
  urgencyDiscountPct: number;
  /** qo'lga tushadigan narx (ipoteka qoldig'i yechilishidan oldin) */
  price: number;
}

/** Shoshilinch sotuv narxi: bozor qiymati × resale% × shoshilinch koeffitsiyenti. */
export function urgentSaleQuote(s: GameState, asset: Asset): UrgentSaleQuote {
  const marketValue = assetMarketValue(s, asset);
  const resalePct = asset.resalePercent ?? 100;
  const urgency = urgencyFactor(asset);
  const price = Math.max(0, Math.round(marketValue * (resalePct / 100) * urgency));
  return { marketValue, resalePct, urgency, urgencyDiscountPct: Math.round((1 - urgency) * 100), price };
}

/** Shoshilinch sotuv: bozor qiymati × resale% × likvidlikka bog'liq shoshilinch koeffitsiyenti. */
export function forcedSell(s: GameState, p: Player, assetId: string): number {
  const asset = p.assets.find((a) => a.id === assetId);
  if (!asset) return 0;
  return sellAsset(p, assetId, urgentSaleQuote(s, asset).price);
}

/* ---------------- End of own turn upkeep ---------------- */

export function tickTurn(p: Player) {
  p.turnsPlayed += 1;
  if (p.charityTurns > 0) p.charityTurns -= 1;
  if (p.charityBlockedTurns > 0) p.charityBlockedTurns -= 1;
  for (const a of p.assets) {
    if (a.constructionLeft && a.constructionLeft > 0) a.constructionLeft -= 1;
  }
  // C3: orzu ushlab turish hisoblagichi — naqd manfiy bo'lsa pauza (orzu yo'qolmaydi)
  if (p.escaped && p.dreamBought && !p.bankrupt && p.cash >= 0) {
    p.dreamHeldMonths = Math.min(DREAM_HOLD_MONTHS, p.dreamHeldMonths + 1);
  }
}

/* ---------------- Erkinlik yo'li (game.md §5) ---------------- */

export function applyFTPayday(p: Player, month = 0): number {
  const amount = monthlyCashflow(p) * FT_PAYDAY_MULT;
  const notes: string[] = [];
  tickInstallments(p, notes);
  tickLoans(p, notes, month);
  p.cash += amount;
  // C3: orzu saqlash xarajati har FT oy kunida yechiladi (mehmonxona — sof daromad)
  if (p.dreamBought) {
    const dream = DREAMS.find((d) => d.id === p.dreamId);
    if (dream) {
      p.cash -= dreamMonthlyNet(dream);
      if (dream.creditPerMonth) adjustCreditScore(p, dream.creditPerMonth);
    }
  }
  return amount;
}

export function applyFTBonus(p: Player): number {
  const amount = ftMonthlyIncome(p);
  p.cash += amount;
  return amount;
}

export function applyFTAudit(p: Player): number {
  const amount = Math.round(Math.max(0, p.cash) * 0.1);
  p.cash -= amount;
  return amount;
}

export function buyFTDeal(p: Player, deal: { title: string; price: number; cashflow: number }): boolean {
  if (p.cash < deal.price) return false;
  p.cash -= deal.price;
  p.ftCashflow += deal.cashflow;
  p.assets.push({
    id: `ft${nextId()}`,
    title: deal.title,
    kind: "business",
    icon: "Rocket",
    price: deal.price,
    paid: deal.price,
    monthlyCashflow: 0,
  });
  return true;
}

/**
 * C3: orzuning sof oylik xarajati (upkeep − income).
 * Butik-mehmonxona: 3 mln upkeep − 8 mln daromad = −5 mln (sof daromad).
 */
export function dreamMonthlyNet(dream: Dream): number {
  return dream.upkeep - (dream.income ?? 0);
}

/**
 * C3: orzuni sotib olish — endi darhol g'alaba emas!
 * Orzu DREAM_HOLD_MONTHS oy (FT navbat) ushlab turilishi kerak.
 */
export function buyDream(p: Player, dream: Dream): boolean {
  if (p.cash < dream.price) return false;
  p.cash -= dream.price;
  p.dreamBought = true;
  p.dreamHeldMonths = 0;
  return true;
}

/** FT win check (b): qo'shimcha Erkinlik yo'li naqd oqimi ≥ 50 mln/oy. */
export function ftCashflowWin(p: Player): boolean {
  return p.ftCashflow >= FT_WIN_CASHFLOW;
}

/** FT win check (a): orzu sotib olinib, 3 oy ushlab turildi (C3). */
export function dreamHoldWin(p: Player): boolean {
  return p.dreamBought && p.dreamHeldMonths >= DREAM_HOLD_MONTHS;
}

/* ---------------- Turn order ---------------- */

export function activePlayers(s: GameState): Player[] {
  return s.players.filter((p) => !p.bankrupt);
}

export function advanceTurn(s: GameState) {
  const n = s.players.length;
  let idx = s.current;
  for (let i = 0; i < n; i++) {
    idx = (idx + 1) % n;
    if (idx === 0) s.round += 1;
    if (!s.players[idx].bankrupt) break;
  }
  s.current = idx;
}

export function ratCellAt(position: number) {
  return RAT_CELLS[position % RAT_CELLS.length];
}
