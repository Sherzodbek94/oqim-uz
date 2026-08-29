/**
 * OQIM — Fond birjasi (securities exchange).
 * 8 ta qimmatli qog'oz, jonli narxlar (har oy kunida tebranadi), dividendlar,
 * 0.5% komissiya bilan savdo, bozor hodisalari integratsiyasi va diversifikatsiya bonusi.
 */
import type { ExchangeState, GameState, Holding, Player, Sector } from "./types";
import { newsById } from "./news";

/* ---------------- Data model ---------------- */

export interface Security {
  id: string;
  /** 3-5 harfli ticker (masalan, "MNBK") */
  ticker: string;
  name: string;
  sector: Sector;
  /** bazaviy narx (UZS) — o'yin shu narxdan boshlanadi */
  basePrice: number;
  /** oylik tebranish amplitudasi (0.02–0.08) */
  volatility: number;
  /** oylik dividend, narxga nisbatan (0.015 = 1.5%/oy); 0 = dividendsiz */
  dividendYield: number;
  description: string;
}

export const SECURITIES: Security[] = [
  {
    id: "uzgm",
    ticker: "UZGM",
    name: "O'zgidrometallurgiya",
    sector: "sanoat",
    basePrice: 850_000,
    volatility: 0.07,
    dividendYield: 0.008,
    description: "Metallurgiya giganti — eksportga bog'liq, yuqori tebranishli aksiya.",
  },
  {
    id: "mnbk",
    ticker: "MNBK",
    name: "Milliy Bank",
    sector: "bank",
    basePrice: 420_000,
    volatility: 0.03,
    dividendYield: 0.015,
    description: "Yirik tijorat banki — barqaror dividend to'lovchi \"ko'k chip\".",
  },
  {
    id: "uztl",
    ticker: "UZTL",
    name: "UzTelekom",
    sector: "telekom",
    basePrice: 310_000,
    volatility: 0.04,
    dividendYield: 0.01,
    description: "Aloqa operatori — abonent bazasi katta, o'sish o'rtacha.",
  },
  {
    id: "fren",
    ticker: "FREN",
    name: "Farg'ona Energetika",
    sector: "energetika",
    basePrice: 260_000,
    volatility: 0.035,
    dividendYield: 0.012,
    description: "Viloyat elektr tarmog'i — kommunal talab barqaror.",
  },
  {
    id: "oetf",
    ticker: "OETF",
    name: "Oltin ETF",
    sector: "oltin",
    basePrice: 1_200_000,
    volatility: 0.02,
    dividendYield: 0,
    description: "Oltin narxidagi fond — past tebranish, dividend yo'q, himoya aktivi.",
  },
  {
    id: "agsh",
    ticker: "AGSH",
    name: "Agrosanoat Holdingi",
    sector: "qishloq",
    basePrice: 180_000,
    volatility: 0.05,
    dividendYield: 0.006,
    description: "Qishloq xo'jaligi klasterlari — hosil va ob-havoga sezgir.",
  },
  {
    id: "ttch",
    ticker: "TTCH",
    name: "Toshkent Tech",
    sector: "texnologiya",
    basePrice: 95_000,
    volatility: 0.08,
    dividendYield: 0,
    description: "Yosh IT-kompaniya IPOsi — juda yuqori tebranish, katta umid.",
  },
  {
    id: "uzob",
    ticker: "UZOB",
    name: "Davlat obligatsiyasi",
    sector: "obligatsiya",
    basePrice: 1_000_000,
    volatility: 0.02,
    dividendYield: 0.01,
    description: "Davlat qarz qog'ozi — minimal tebranish, barqaror ~1%/oy kupon.",
  },
];

export function securityById(id: string): Security | null {
  return SECURITIES.find((s) => s.id === id) ?? null;
}

/** "Aksiyalar" — bozor hodisalari ta'sir qiladigan sektorlar (oltin ETF va obligatsiya kirmaydi). */
export const EQUITY_SECTORS: Sector[] = ["bank", "sanoat", "telekom", "energetika", "qishloq", "texnologiya"];

/* ---------------- Constants ---------------- */

/** Savdo komissiyasi (har bir yo'nalishda). */
export const EXCHANGE_FEE_RATE = 0.005;
/** Narx koridori: bazaning 20%–400% i. */
export const PRICE_MIN_FACTOR = 0.2;
export const PRICE_MAX_FACTOR = 4;
/** Mini chart uchun saqlanadigan narx nuqtalari soni. */
export const HISTORY_LENGTH = 12;
/** Faol yangilik sarlavhasi mos sektor uchun sectorBias. */
export const NEWS_SECTOR_BIAS = 0.05;
/** Diversifikatsiya bonusi: ≥4 turli sektor → dividendlar +10%. */
export const DIVERSIFICATION_MIN_SECTORS = 4;
export const DIVERSIFICATION_BONUS = 0.1;
/** "Dividend to'lovlari oshdi" hodisasi standart ko'paytiruvchisi. */
export const DIVIDEND_BOOST_MULT = 1.5;

export function makeExchangeState(): ExchangeState {
  const prices: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  for (const sec of SECURITIES) {
    prices[sec.id] = sec.basePrice;
    history[sec.id] = [sec.basePrice];
  }
  return { prices, history };
}

/* ---------------- Price engine ---------------- */

export function clampPrice(sec: Security, price: number): number {
  return Math.min(
    Math.round(sec.basePrice * PRICE_MAX_FACTOR),
    Math.max(Math.round(sec.basePrice * PRICE_MIN_FACTOR), Math.round(price))
  );
}

function pushHistory(s: GameState, securityId: string, price: number) {
  const h = s.exchange.history[securityId] ?? (s.exchange.history[securityId] = []);
  h.push(price);
  if (h.length > HISTORY_LENGTH) h.splice(0, h.length - HISTORY_LENGTH);
}

/** Bozor hodisasi: shu sektorlardagi narxlar darhol ±pct (tarix ham yangilanadi). */
export function movePrices(s: GameState, sectors: Sector[], pct: number): void {
  const k = 1 + pct / 100;
  for (const sec of SECURITIES) {
    if (!sectors.includes(sec.sector)) continue;
    const next = clampPrice(sec, s.exchange.prices[sec.id] * k);
    s.exchange.prices[sec.id] = next;
    pushHistory(s, sec.id, next);
  }
}

/**
 * Oy kuni tick'i: har bir narx `× (1 + random(−vol, +vol) + sectorBias)`.
 * sectorBias — faol yangilik sarlavhasi mos sektor uchun ±0.05.
 */
export function tickExchangePrices(s: GameState): void {
  const headline = newsById(s.news?.id ?? null);
  for (const sec of SECURITIES) {
    let bias = 0;
    if (headline?.sectors?.includes(sec.sector)) {
      bias = headline.pct > 0 ? NEWS_SECTOR_BIAS : -NEWS_SECTOR_BIAS;
    }
    const drift = (Math.random() * 2 - 1) * sec.volatility;
    const next = clampPrice(sec, s.exchange.prices[sec.id] * (1 + drift + bias));
    s.exchange.prices[sec.id] = next;
    pushHistory(s, sec.id, next);
  }
}

/** Oxirgi oy kunidan beri o'zgarish, % (tarixning oldingi nuqtasiga nisbatan). */
export function priceChangePct(s: ExchangeState, sec: Security): number {
  const h = s.history[sec.id] ?? [sec.basePrice];
  const prev = h.length >= 2 ? h[h.length - 2] : sec.basePrice;
  const cur = s.prices[sec.id] ?? sec.basePrice;
  if (prev <= 0) return 0;
  return ((cur - prev) / prev) * 100;
}

/* ---------------- Dividends ---------------- */

/** Faol dividend ko'paytiruvchisi (hodisa boosti). */
export function dividendMult(p: Player): number {
  return p.dividendBoost && p.dividendBoost.monthsRemaining > 0 ? p.dividendBoost.mult : 1;
}

/** Portfelda nechta turli sektor bor. */
export function portfolioSectors(p: Player): Sector[] {
  const set = new Set<Sector>();
  for (const h of p.portfolio) {
    if (h.qty <= 0) continue;
    const sec = securityById(h.securityId);
    if (sec) set.add(sec.sector);
  }
  return [...set];
}

export function hasDiversificationBonus(p: Player): boolean {
  return portfolioSectors(p).length >= DIVERSIFICATION_MIN_SECTORS;
}

/**
 * Oylik dividend daromadi: Σ qty × joriy narx × dividendYield × boost,
 * ≥4 sektor ushlab turilsa +10% diversifikatsiya bonusi.
 * Passiv daromadga qo'shiladi (Asosiy aylanadan chiqish hisobida qatnashadi).
 */
export function portfolioDividends(p: Player, ex: ExchangeState): number {
  let sum = 0;
  const mult = dividendMult(p);
  for (const h of p.portfolio) {
    if (h.qty <= 0) continue;
    const sec = securityById(h.securityId);
    if (!sec || sec.dividendYield <= 0) continue;
    sum += h.qty * (ex.prices[sec.id] ?? sec.basePrice) * sec.dividendYield;
  }
  sum *= mult;
  if (sum > 0 && hasDiversificationBonus(p)) sum *= 1 + DIVERSIFICATION_BONUS;
  return Math.round(sum);
}

/** Portfelning joriy bozor qiymati. */
export function portfolioValue(p: Player, ex: ExchangeState): number {
  return p.portfolio.reduce((sum, h) => {
    const sec = securityById(h.securityId);
    return sum + h.qty * (ex.prices[h.securityId] ?? sec?.basePrice ?? 0);
  }, 0);
}

/* ---------------- Trading ---------------- */

export function tradeFee(total: number): number {
  return Math.round(total * EXCHANGE_FEE_RATE);
}

export interface TradeResult {
  qty: number;
  price: number;
  total: number;
  fee: number;
}

/** Maksimal sotib olish mumkin bo'lgan miqdor (naqd + komissiya hisobga olingan). */
export function maxBuyQty(p: Player, price: number): number {
  return Math.max(0, Math.floor(p.cash / (price * (1 + EXCHANGE_FEE_RATE))));
}

/**
 * Sotib olish: jami = qty × narx, komissiya 0.5% ustaga.
 * `priceOverride` — IPO chegirmasi kabi maxsus narx uchun.
 */
export function buySecurity(
  p: Player,
  s: GameState,
  securityId: string,
  qty: number,
  priceOverride?: number
): TradeResult | null {
  const sec = securityById(securityId);
  if (!sec || qty <= 0) return null;
  const price = priceOverride ?? s.exchange.prices[securityId] ?? sec.basePrice;
  const total = qty * price;
  const fee = tradeFee(total);
  if (p.cash < total + fee) return null;
  p.cash -= total + fee;
  const existing = p.portfolio.find((h) => h.securityId === securityId);
  if (existing) {
    const newQty = existing.qty + qty;
    existing.avgBuyPrice = Math.round((existing.avgBuyPrice * existing.qty + total) / newQty);
    existing.qty = newQty;
  } else {
    const holding: Holding = { securityId, qty, avgBuyPrice: price };
    p.portfolio.push(holding);
  }
  return { qty, price, total, fee };
}

/** Sotish: tushum = qty × narx − 0.5% komissiya. */
export function sellSecurity(p: Player, s: GameState, securityId: string, qty: number): TradeResult | null {
  const sec = securityById(securityId);
  const holding = p.portfolio.find((h) => h.securityId === securityId);
  if (!sec || !holding || qty <= 0 || qty > holding.qty) return null;
  const price = s.exchange.prices[securityId] ?? sec.basePrice;
  const total = qty * price;
  const fee = tradeFee(total);
  p.cash += total - fee;
  holding.qty -= qty;
  if (holding.qty <= 0) p.portfolio = p.portfolio.filter((h) => h.securityId !== securityId);
  return { qty, price, total, fee };
}
