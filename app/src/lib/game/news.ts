/**
 * OQIM (avvalgi Cashflow UZ) — Bozor yangiliklari lentasi (market news ticker).
 * Every NEWS_EVERY_TURNS turns a new headline is drawn; while active, the
 * matching asset class income gets a +10%/−10% modifier (see engine).
 */
import type { Asset, AssetKind, GameState, Sector } from "./types";
import { NEWS_COOLDOWN, NEWS_DURATION, NEWS_EVERY_TURNS } from "./types";

export interface NewsHeadline {
  id: string;
  text: string;
  /** +10 / −10 income modifier while active */
  pct: number;
  /** affected asset kinds (bo'sh = faqat teglar bo'yicha) */
  kinds?: AssetKind[];
  /** affected content tags */
  tags?: string[];
  /** birja sektorlari — faol sarlavha shu sektorlarga ±5% sectorBias beradi */
  sectors?: Sector[];
  /** short label for the effect chip (aktiv sinfi) */
  targetLabel: string;
}

export const NEWS_HEADLINES: NewsHeadline[] = [
  {
    id: "rent-up",
    text: "Toshkentda ijara narxlari oshmoqda",
    pct: 10,
    kinds: ["realestate"],
    targetLabel: "Ko'chmas mulk",
  },
  {
    id: "rent-down",
    text: "Yangi uylar topshirildi — ijara bosimi kamaydi",
    pct: -10,
    kinds: ["realestate"],
    targetLabel: "Ko'chmas mulk",
  },
  {
    id: "import-up",
    text: "Import tovarlar qimmatlashdi",
    pct: -10,
    tags: ["savdo"],
    targetLabel: "Savdo bizneslari",
  },
  {
    id: "marketplace-boom",
    text: "Onlayn savdo hajmi keskin oshdi",
    pct: 10,
    tags: ["onlayn", "savdo"],
    targetLabel: "Onlayn biznes",
  },
  {
    id: "deposit-up",
    text: "Depozit stavkalari ko'tarildi",
    pct: 10,
    kinds: ["deposit"],
    targetLabel: "Depozitlar",
  },
  {
    id: "deposit-down",
    text: "Markaziy bank stavkani pasaytirdi",
    pct: -10,
    kinds: ["deposit", "bonds"],
    targetLabel: "Depozitlar",
  },
  {
    id: "stocks-down",
    text: "Birjada tushkunlik hukm surmoqda",
    pct: -10,
    kinds: ["stock"],
    sectors: ["bank", "sanoat", "telekom", "energetika", "qishloq", "texnologiya"],
    targetLabel: "Aksiyalar",
  },
  {
    id: "stocks-up",
    text: "Birjada ralli — investorlar faollashdi",
    pct: 10,
    kinds: ["stock"],
    sectors: ["bank", "sanoat", "telekom", "energetika", "qishloq", "texnologiya"],
    targetLabel: "Aksiyalar",
  },
  {
    id: "gold-up",
    text: "Oltin va valyuta qadrga kirdi",
    pct: 10,
    kinds: ["currency"],
    sectors: ["oltin"],
    targetLabel: "Oltin/valyuta",
  },
  {
    id: "currency-down",
    text: "So'm mustahkamlandi — valyuta arzonlashdi",
    pct: -10,
    kinds: ["currency"],
    sectors: ["oltin"],
    targetLabel: "Oltin/valyuta",
  },
  {
    id: "tourism",
    text: "Turizm mavsumi boshlandi — kafe va choyxonalar gavjum",
    pct: 10,
    tags: ["restoran"],
    targetLabel: "Restoran biznesi",
  },
  {
    id: "construction-boom",
    text: "Qurilish bumi davom etmoqda",
    pct: 10,
    tags: ["qurilish"],
    targetLabel: "Qurilish",
  },
  {
    id: "feed-price",
    text: "Yem-xashak narxi oshdi",
    pct: -10,
    tags: ["chorva"],
    targetLabel: "Chorvachilik",
  },
  {
    id: "auto-market",
    text: "Avto bozori jonlandi — avtobizneslar band",
    pct: 10,
    tags: ["avto"],
    targetLabel: "Avto biznes",
  },
];

export function newsById(id: string | null | undefined): NewsHeadline | null {
  if (!id) return null;
  return NEWS_HEADLINES.find((n) => n.id === id) ?? null;
}

/** Does this headline affect the given asset? */
export function newsMatches(h: NewsHeadline, a: Asset): boolean {
  if (h.kinds && h.kinds.includes(a.kind)) return true;
  if (h.tags && a.tag && h.tags.includes(a.tag)) return true;
  return false;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * News lifecycle — call once per turn end (mutates draft GameState).
 * Returns the newly drawn headline (for log/toast), or null.
 */
export function tickNews(s: GameState): NewsHeadline | null {
  s.newsCounter += 1;
  if (s.news) {
    s.news.turnsLeft -= 1;
    if (s.news.turnsLeft <= 0) s.news = null;
  }
  if (s.newsCounter % NEWS_EVERY_TURNS !== 0 || s.news !== null) return null;
  const pool = NEWS_HEADLINES.filter((h) => !s.recentNews.includes(h.id));
  const headline = pick(pool.length > 0 ? pool : NEWS_HEADLINES);
  s.news = { id: headline.id, turnsLeft: NEWS_DURATION };
  s.recentNews.push(headline.id);
  if (s.recentNews.length > NEWS_COOLDOWN) s.recentNews.shift();
  return headline;
}
