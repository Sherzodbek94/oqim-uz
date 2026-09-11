/**
 * OQIM: Startap Imperiyasi — turlar (GDD v1.0 §4–§6).
 * Barcha mablag'lar so'mda, butun son. Oy — o'yinning bitta aylanasi.
 */

export const STARTUP_SAVE_KEY = "oqim-startup-v1";
export const STARTUP_VERSION = 1;

export type RoleId =
  | "junior" | "middle" | "senior" | "designer" | "smm"
  | "sales" | "accountant" | "hr" | "office";

export type RoleKind = "dev" | "design" | "marketing" | "sales" | "support";

export interface RoleSpec {
  id: RoleId;
  name: string;
  kind: RoleKind;
  salaryMin: number;
  salaryMax: number;
  skill: number;          // 0–100 boshlang'ich ko'nikma
  skillLabel: string;     // "Kod", "Dizayn", "Marketing", "Sotuv", "—"
  desc: string;
}

export interface Employee {
  id: string;
  name: string;
  role: RoleId;
  salary: number;
  skill: number;
  morale: number;         // 0–100
  hiredMonth: number;
  talent?: boolean;       // "Talant keldi" hodisasidan
}

export interface Candidate {
  id: string;
  name: string;
  role: RoleId;
  salary: number;
  skill: number;
  talent?: boolean;
}

export type ProductId = "tgbot" | "webstudio" | "mobile" | "saas" | "export";
export type Monetization = "ads" | "subscription" | "license";

export interface ProductSpec {
  id: ProductId;
  name: string;
  unlockCost: number;
  revMin: number;         // oylik daromad potensiali (sifat 0)
  revMax: number;         // (sifat 100)
  needDevs: number;       // asoschi ham hisobga kiradi
  needDesigner: boolean;
  needSmm: boolean;
  needSales: boolean;
  desc: string;
}

export type OfficeLevel = 0 | 1 | 2 | 3 | 4;

export interface OfficeSpec {
  level: OfficeLevel;
  name: string;
  rent: number;
  morale: number;
  minCash: number;
  minStaff: number;
  needItPark: boolean;
  desc: string;
}

export type EquipmentId = "desks" | "internet" | "generator" | "server";

export interface EquipmentSpec {
  id: EquipmentId;
  name: string;
  cost: number;
  perEmployee?: boolean;
  desc: string;
}

export type TaxRegime = "simple" | "itpark" | "shadow";

export type MarketingChannel = "targeted" | "blogger" | "event" | "seo";

export interface MarketingSpec {
  id: MarketingChannel;
  name: string;
  cost: number;
  oneTime: boolean;
  desc: string;
}

export type LoanSource = "friends" | "micro" | "bank" | "angel";

export interface Loan {
  id: string;
  source: LoanSource;
  principal: number;      // qolgan asosiy qarz
  apr: number;            // yillik foiz (0–1)
  monthly: number;        // oylik to'lov (annuitet); friends uchun 0, muddat oxirida
  monthsLeft: number;
  takenMonth: number;
}

export type SprintKind = "feature" | "bugfix" | "techdebt" | "none";

export type EventKind = "loss" | "risk" | "luck" | "mixed" | "neutral";

export interface EventChoice {
  id: string;
  label: string;
  sub: string;
  cost?: number;          // naqd sarf (musbat = to'lov)
  requires?: EquipmentId | "accountant" | "hr" | "office";
}

export interface EventCard {
  id: string;
  title: string;
  kind: EventKind;
  text: string;
  weight: number;
  minMonth?: number;
  choices?: EventChoice[];
}

/** Bir oyda amalga oshiriladigan vaqtinchalik ta'sirlar */
export interface Modifier {
  id: string;
  label: string;
  costMult?: number;      // xarajatlar ko'paytmasi
  revMult?: number;       // daromad ko'paytmasi
  qualityMult?: number;   // sprint samaradorligi
  usersMult?: number;     // foydalanuvchi o'sishi
  until: number;          // qaysi oygacha (shu oy ham)
}

export interface MonthReport {
  month: number;
  revenue: number;
  payroll: number;
  rent: number;
  marketing: number;
  tax: number;
  interest: number;
  loanPayments: number;
  other: number;          // hodisa xarajat/daromadlari, jihoz
  net: number;            // naqd o'zgarishi
  cashAfter: number;
  usersAfter: number;
  qualityAfter: number;
  moraleAfter: number;
  event?: { id: string; title: string; kind: EventKind; choice?: string; effect: string };
  notes: string[];
}

export type StartupPhase = "setup" | "decide" | "event" | "report" | "won" | "lost";

export interface StartupState {
  version: number;
  seed: number;
  rngState: number;
  companyName: string;
  founderName: string;
  phase: StartupPhase;
  month: number;                 // 1 dan boshlanadi
  cash: number;
  reserve: number;               // zaxira (kelajakda)
  product: ProductId;
  unlocked: ProductId[];
  quality: number;               // 0–100
  users: number;
  usersGrowth: number;           // so'nggi oy o'sishi (%)
  monetization: Monetization;
  reputation: number;            // 0–100 brend obro'si
  staff: Employee[];
  candidates: Candidate[];
  office: OfficeLevel;
  equipment: EquipmentId[];
  deskSets: number;
  tax: TaxRegime;
  itPark: boolean;
  loans: Loan[];
  modifiers: Modifier[];
  // joriy oy qarorlari
  sprint: SprintKind;
  marketing: MarketingChannel[];
  // hodisalar
  pendingEvent: EventCard | null;
  recentEvents: string[];
  eventsSeen: number;
  // tarix
  reports: MonthReport[];
  log: string[];
  bestValuation: number;
  stageReached: number;          // 0..4 (yo'l xaritasi)
  lostReason?: string;
}
