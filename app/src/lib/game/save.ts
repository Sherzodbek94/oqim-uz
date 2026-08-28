/**
 * OQIM (avvalgi Cashflow UZ) — persistence (design.md §10).
 * Keys: oqim-save-v1 (full game state; eski cfuz-save-v1 bir marta ko'chiriladi),
 * cfuz-best (best escape turn count), cfuz-settings (haptics, speed).
 */
import type { AssetKind, GameState } from "./types";
import { BEST_KEY, OLD_SAVE_KEY, SAVE_KEY, SETTINGS_KEY } from "./types";
import { makeExchangeState } from "./exchange";
import { amortizeTerms, makeMarketIndices } from "./engine";

export interface GameSettings {
  haptics: boolean;
  speed: "slow" | "normal" | "fast";
}

export const DEFAULT_SETTINGS: GameSettings = { haptics: false, speed: "normal" };

export function loadSave(): GameState | null {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      // C1 migratsiya: eski brend kalitidan bir marta o'qib, yangi kalitga yoziladi
      const legacy = localStorage.getItem(OLD_SAVE_KEY);
      if (legacy) {
        raw = legacy;
        try {
          localStorage.setItem(SAVE_KEY, legacy);
        } catch {
          /* storage full — keyingi safar yana eski kalitdan o'qiydi */
        }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // old-format saves (v1..v7) are dropped gracefully — a new game starts instead;
    // v8–v19 saqlanmalar v20 ga ko'tariladi (yangi maydonlar default qiymatlar bilan)
    const v = parsed.version as number;
    if (v < 8 || v > 20) return null;
    if (!Array.isArray(parsed.players)) return null;
    parsed.version = 20;
    // v15 (fix-13c, Q1): o'yin rejimi — eski saqlanmalar "classic"
    if (parsed.mode !== "tez") parsed.mode = "classic";
    // v18 (fix-16): o'yin uslubi — klassik saqlanmalar "classic" deb ko'tariladi, yo'l holati null
    if (parsed.boardMode !== "path" && parsed.boardMode !== "plan") parsed.boardMode = "classic";
    if (parsed.boardMode !== "path" || !parsed.path || !Array.isArray(parsed.path.nodes))
      parsed.path = null;
    // v19 (fix-17): reja rejimi holati — faqat plan rejimida saqlanadi
    if (parsed.boardMode !== "plan" || !parsed.plan || typeof parsed.plan.days !== "object")
      parsed.plan = null;
    // v12 (fix-10 F2): bildirishnomalar markazi — eski saqlanmalarda bo'sh massiv
    if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
    if (typeof parsed.month !== "number" || parsed.month < 1) parsed.month = 1;
    if (!Array.isArray(parsed.recentEvents)) parsed.recentEvents = [];
    if (!Array.isArray(parsed.recentNews)) parsed.recentNews = [];
    if (typeof parsed.newsCounter !== "number") parsed.newsCounter = 0;
    if (parsed.news === undefined) parsed.news = null;
    if (!parsed.exchange || typeof parsed.exchange.prices !== "object") parsed.exchange = makeExchangeState();
    else {
      // birja tarixi to'ldiriladi (eski/buzilgan qismlar uchun)
      const fresh = makeExchangeState();
      for (const id of Object.keys(fresh.prices)) {
        if (typeof parsed.exchange.prices[id] !== "number") parsed.exchange.prices[id] = fresh.prices[id];
        if (!Array.isArray(parsed.exchange.history?.[id])) {
          parsed.exchange.history = parsed.exchange.history ?? {};
          parsed.exchange.history[id] = [parsed.exchange.prices[id]];
        }
      }
    }
    // v9: bozor indekslari (eski saqlanmada yo'q — 1,0 dan boshlanadi)
    if (parsed.winPath !== "dream" && parsed.winPath !== "cashflow") parsed.winPath = null;
    if (!parsed.marketIndices || typeof parsed.marketIndices !== "object") {
      parsed.marketIndices = makeMarketIndices();
    } else {
      const fresh = makeMarketIndices();
      for (const k of Object.keys(fresh) as AssetKind[]) {
        if (typeof parsed.marketIndices[k] !== "number") parsed.marketIndices[k] = fresh[k];
      }
    }
    for (const p of parsed.players) {
      if (!Array.isArray(p.installments)) p.installments = [];
      if (!Array.isArray(p.assetModifiers)) p.assetModifiers = [];
      if (!Array.isArray(p.weekendSpends)) p.weekendSpends = [];
      if (typeof p.salaryMultiplier !== "number") p.salaryMultiplier = 1;
      if (p.salaryMonths !== null && typeof p.salaryMonths !== "number") p.salaryMonths = null;
      if (p.loanPaymentMod === undefined) p.loanPaymentMod = null;
      if (typeof p.zaryadClaimed !== "boolean") p.zaryadClaimed = false;
      if (p.heroId === undefined) p.heroId = null;
      if (p.customField === undefined) p.customField = null;
      if (typeof p.avatar !== "string") p.avatar = "/avatar-teacher.png";
      if (p.dealCoupon === undefined) p.dealCoupon = null;
      if (typeof p.analystDealsLeft !== "number") p.analystDealsLeft = 0;
      if (typeof p.charityBlockedTurns !== "number") p.charityBlockedTurns = 0;
      if (!Array.isArray(p.portfolio)) p.portfolio = [];
      if (p.dividendBoost === undefined) p.dividendBoost = null;
      if (typeof p.escapeStreak !== "number") p.escapeStreak = 0;
      if (typeof p.creditScore !== "number") p.creditScore = 650;
      if (typeof p.unemployedMonths !== "number") p.unemployedMonths = 0;
      if (typeof p.penyaStreak !== "number") p.penyaStreak = 0;
      if (typeof p.marketAdviceMonths !== "number") p.marketAdviceMonths = 0;
      // v9: avans bayrog'i, doodad kechiktirishlar, aktiv buyIndex
      if (typeof p.avansTakenThisMonth !== "boolean") p.avansTakenThisMonth = false;
      // v13 (fix-12): avans summasi + mijoz ish takliflari holati
      if (typeof p.avansReceived !== "number") p.avansReceived = 0;
      // v19 (fix-17): reja rejimi maosh koeffitsiyenti
      if (typeof p.planSalaryScale !== "number") p.planSalaryScale = 1;
      // v20 (fix-18): haftalik reja — joriy hafta indeksi
      if (typeof p.planWeekIdx !== "number") p.planWeekIdx = 0;
      if (!p.clientWork || typeof p.clientWork !== "object") p.clientWork = {};
      if (!Array.isArray(p.deferredDoodads)) p.deferredDoodads = [];
      if (typeof p.deferCount !== "number") p.deferCount = 0;
      for (const a of p.assets) {
        if (typeof a.buyIndex !== "number") a.buyIndex = 1;
      }
      if (p.quadrant !== "E" && p.quadrant !== "S" && p.quadrant !== "B" && p.quadrant !== "I")
        p.quadrant = "E";
      // v9 (Stage B): bilim darajasi, mijozlar, menejer
      if (typeof p.knowledge !== "number") p.knowledge = 1;
      if (!Array.isArray(p.knowledgeFromDeals)) p.knowledgeFromDeals = [];
      if (!Array.isArray(p.clients)) p.clients = [];
      if (typeof p.hasManager !== "boolean") p.hasManager = false;
      // v11 (fix-9): Bilim/Mijoz markazlari cooldown xaritalari
      if (!p.knowledgeActions || typeof p.knowledgeActions !== "object") p.knowledgeActions = {};
      if (!p.clientActions || typeof p.clientActions !== "object") p.clientActions = {};
      // v9 (Stage C): orzu ushlab turish + profil statistikasi
      if (typeof p.dreamBought !== "boolean") p.dreamBought = false;
      if (typeof p.dreamHeldMonths !== "number") p.dreamHeldMonths = 0;
      if (p.quadrantStart !== "E" && p.quadrantStart !== "S" && p.quadrantStart !== "B" && p.quadrantStart !== "I")
        p.quadrantStart = p.quadrant;
      if (typeof p.statMaxPassive !== "number") p.statMaxPassive = 0;
      if (typeof p.statMinCredit !== "number") p.statMinCredit = p.creditScore;
      if (typeof p.statMaxCredit !== "number") p.statMaxCredit = p.creditScore;
      if (typeof p.statBankruptcies !== "number") p.statBankruptcies = 0;
      // v14 (fix-13b, M1): Moliyaviy ustoz — darslar va yotgan naqd hisoblagichi
      if (!Array.isArray(p.lessonsSeen)) p.lessonsSeen = [];
      if (typeof p.idleCashMonths !== "number") p.idleCashMonths = 0;
      // v16 (fix-14): qarindoshlardan qarz bloklash muddati
      if (typeof p.qarzBlockedUntil !== "number") p.qarzBlockedUntil = 0;
      // v17 (fix-15): farzandlar yozuvi children:number → children2 (yoshlar 0–6 gacha tekis taqsimlanadi),
      // farzand oraliq hisoblagichi, qiyinlik darajasi, kutilayotgan ta'lim tanlovi
      if (!Array.isArray(p.children2)) {
        const n = typeof p.children === "number" ? p.children : 0;
        p.children2 = Array.from({ length: n }, (_, i) => {
          const ageYears = n <= 1 ? 0 : Math.round((i * 6) / (n - 1));
          return {
            bornMonth: Math.max(0, (parsed.month ?? 1) - ageYears * 12),
            edu: "none" as const,
          };
        });
      }
      if (typeof p.lastBabyMonth !== "number") p.lastBabyMonth = -24;
      if (p.difficulty !== "easy" && p.difficulty !== "medium" && p.difficulty !== "hard")
        p.difficulty = "medium";
      if (p.pendingChildEvent === undefined) p.pendingChildEvent = null;
      // annuitet maydonlari himoyaviy to'ldiriladi (buzilgan/qisman saqlanmalar)
      for (const l of p.loans) {
        if (typeof l.remainingBalance !== "number" || typeof l.remainingMonths !== "number") {
          Object.assign(l, amortizeTerms(l.principal, l.monthlyPayment));
        }
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export interface BestRecord {
  escapeTurns: number | null;
  wins: number;
}

export function loadBest(): BestRecord {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { escapeTurns: null, wins: 0 };
    const parsed = JSON.parse(raw) as Partial<BestRecord>;
    return {
      escapeTurns: typeof parsed.escapeTurns === "number" ? parsed.escapeTurns : null,
      wins: typeof parsed.wins === "number" ? parsed.wins : 0,
    };
  } catch {
    return { escapeTurns: null, wins: 0 };
  }
}

export function recordEscape(turns: number): void {
  const best = loadBest();
  if (best.escapeTurns === null || turns < best.escapeTurns) {
    best.escapeTurns = turns;
  }
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* ignore */
  }
}

export function recordWin(): void {
  const best = loadBest();
  best.wins += 1;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* ignore */
  }
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      haptics: !!parsed.haptics,
      speed:
        parsed.speed === "slow" || parsed.speed === "fast" ? parsed.speed : "normal",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Haptic feedback (design.md §8) — behind settings toggle, default off. */
export function vibrate(settings: GameSettings, ms = 30): void {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
