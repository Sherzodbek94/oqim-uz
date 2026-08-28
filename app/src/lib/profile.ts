/**
 * OQIM — profil statistikasi (C2).
 * localStorage `oqim-profile-v1`: tugagan o'yinlar yozuvi + yutuqlar (achievements).
 */
import { passiveIncome } from "./game/engine";
import { PROFESSIONS } from "./game/data";
import { heroById } from "./game/heroes";
import { PROFILE_KEY, type GameMode, type GameState, type Player, type Quadrant } from "./game/types";

export interface GameRecord {
  /** ISO sana */
  date: string;
  heroName: string;
  profession: string;
  quadrantStart: Quadrant;
  quadrantEnd: Quadrant;
  /** fix-15 (P2): o'yin qiyinlik darajasi */
  difficulty: Player["difficulty"];
  won: boolean;
  /** fix-13c (Q1): o'yin rejimi */
  mode?: GameMode;
  /** Rat Race'dan chiqilgan oy (round) — chiqilmagan bo'lsa null */
  escapeMonth: number | null;
  endMonth: number;
  winPath: "dream" | "cashflow" | null;
  maxPassive: number;
  minCredit: number;
  maxCredit: number;
  bankruptcies: number;
  /** erishilgan eng yuqori bilim darajasi (bilim faqat o'sadi) */
  maxKnowledge: number;
  /** fix-13c (Q4): o'yindagi botlarning xarakterlari (personality) */
  bots?: string[];
  /** fix-13c (Q4): inson ulardan oldin chiqqan botlar (yengilgan raqiblar) */
  beatenBots?: string[];
}

export interface ProfileData {
  games: GameRecord[];
  /** fix-13b (M1): umrbod o'zlashtirilgan dars id'lari (barcha o'yinlar bo'ylab) */
  lessons: string[];
}

export function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { games: [], lessons: [] };
    const parsed = JSON.parse(raw) as Partial<ProfileData>;
    if (!Array.isArray(parsed.games)) return { games: [], lessons: [] };
    return {
      games: parsed.games as GameRecord[],
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch {
    return { games: [], lessons: [] };
  }
}

/** fix-13b (M1): yangi o'zlashtirilgan dars id'larini umrbod kolleksiyaga yozish. */
export function recordLessons(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    const data = loadProfile();
    const set = new Set(data.lessons);
    for (const id of ids) set.add(id);
    data.lessons = [...set];
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function recordGame(rec: GameRecord): void {
  try {
    const data = loadProfile();
    data.games.push(rec);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

/** O'yin tugaganda inson o'yinchi uchun yozuv tuzish. */
export function buildRecord(s: GameState, p: Player): GameRecord {
  const hero = heroById(p.heroId);
  const prof = PROFESSIONS.find((x) => x.id === p.professionId);
  // fix-13c (Q4): bot reyting — inson qaysi botlardan oldin Kundalik aylanadan chiqdi.
  // Agar bot birinchi chiqqan bo'lsa (bot-win), inson escapeTurn=null → hech kim yengilmagan.
  const bots = s.players.filter((b) => b.isBot && b.personality !== null);
  const beatenBots =
    p.escapeTurn !== null
      ? bots
          .filter((b) => b.escapeTurn === null || p.escapeTurn! <= b.escapeTurn)
          .map((b) => b.personality!)
      : [];
  return {
    date: new Date().toISOString(),
    heroName: p.name,
    profession: hero ? hero.professionName : (prof?.name ?? p.professionId),
    quadrantStart: p.quadrantStart,
    quadrantEnd: p.quadrant,
    difficulty: p.difficulty,
    won: s.endVariant === "win" && s.winnerId === p.id,
    mode: s.mode ?? "classic",
    escapeMonth: p.escapeTurn,
    endMonth: s.month,
    winPath: s.endVariant === "win" && s.winnerId === p.id ? s.winPath : null,
    // yakuniy o'lchov ham hisobga olinadi (statMaxPassive eng yuqori nuqtani saqlaydi)
    maxPassive: Math.max(p.statMaxPassive, passiveIncome(p) + p.ftCashflow),
    minCredit: Math.min(p.statMinCredit, p.creditScore),
    maxCredit: Math.max(p.statMaxCredit, p.creditScore),
    bankruptcies: p.statBankruptcies + (p.bankrupt ? 1 : 0),
    maxKnowledge: p.knowledge,
    bots: bots.map((b) => b.personality!),
    beatenBots,
  };
}

/* ---------------- Umumiy statistika ---------------- */

export interface ProfileStats {
  games: number;
  wins: number;
  winPct: number;
  /** eng tez escape (oy) — hech kim chiqmagan bo'lsa null */
  fastestEscape: number | null;
  maxPassive: number;
}

export function computeStats(games: GameRecord[]): ProfileStats {
  const wins = games.filter((g) => g.won).length;
  const escapes = games.map((g) => g.escapeMonth).filter((m): m is number => m !== null);
  return {
    games: games.length,
    wins,
    winPct: games.length > 0 ? Math.round((wins / games.length) * 100) : 0,
    fastestEscape: escapes.length > 0 ? Math.min(...escapes) : null,
    maxPassive: games.reduce((mx, g) => Math.max(mx, g.maxPassive), 0),
  };
}

/* ---------------- Bot reytingi (fix-13c, Q4) ---------------- */

export const BOT_PERSONALITIES = ["cautious", "balanced", "bold"] as const;

export interface BotRivalry {
  personality: string;
  /** inson shu xarakterli botni yenggan o'yinlar soni */
  wins: number;
  /** shu xarakterli bot qatnashgan, lekin inson yenga olmagan o'yinlar */
  losses: number;
}

/** Har bot xarakteri bo'yicha insonning G/M (g'alaba/mag'lubiyat) hisobi. */
export function computeBotRivalry(games: GameRecord[]): BotRivalry[] {
  return BOT_PERSONALITIES.map((pers) => {
    let wins = 0;
    let losses = 0;
    for (const g of games) {
      const bots = g.bots ?? [];
      if (!bots.includes(pers)) continue;
      if ((g.beatenBots ?? []).includes(pers)) wins += 1;
      else losses += 1;
    }
    return { personality: pers, wins, losses };
  });
}

/** "🎖 Usta": har uchala bot xarakteri kamida bir marta yengilgan. */
export function isUsta(games: GameRecord[]): boolean {
  return BOT_PERSONALITIES.every((pers) =>
    games.some((g) => (g.beatenBots ?? []).includes(pers))
  );
}

/* ---------------- Yutuqlar (achievements) ---------------- */

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  /** lucide icon nomi */
  icon: string;
  unlocked: boolean;
}

export function computeAchievements(games: GameRecord[]): Achievement[] {
  const wins = games.filter((g) => g.won);
  const tirikQoldi = games.some((g, i) => g.won && i > 0 && games[i - 1].bankruptcies > 0);
  return [
    {
      id: "ilk-qadam",
      title: "Ilk qadam",
      desc: "Birinchi o'yinni yakunlash",
      icon: "Footprints",
      unlocked: games.length >= 1,
    },
    {
      id: "erkinlik",
      title: "Erkinlik!",
      desc: "Birinchi g'alaba",
      icon: "Trophy",
      unlocked: wins.length >= 1,
    },
    {
      id: "tezkor",
      title: "Tezkor",
      desc: "15 oy ichida Kundalik aylanadan chiqish",
      icon: "Zap",
      unlocked: games.some((g) => g.escapeMonth !== null && g.escapeMonth <= 15),
    },
    {
      id: "investor",
      title: "Investor",
      desc: "I kvadrantida g'alaba qozonish",
      icon: "TrendingUp",
      unlocked: wins.some((g) => g.quadrantEnd === "I"),
    },
    {
      id: "barqaror",
      title: "Barqaror",
      desc: "3 marta g'alaba qozonish",
      icon: "Medal",
      unlocked: wins.length >= 3,
    },
    {
      id: "tirik-qoldi",
      title: "Tirik qoldi",
      desc: "Bankrotlikdan keyingi o'yinda g'alaba",
      icon: "HeartPulse",
      unlocked: tirikQoldi,
    },
    {
      id: "usta",
      title: "Usta",
      desc: "Har uchala bot turini kamida bir marta yengish",
      icon: "Award",
      unlocked: isUsta(games),
    },
    {
      id: "bilimdon",
      title: "Bilimdon",
      desc: "Bilim darajasini 5 ga yetkazish",
      icon: "GraduationCap",
      unlocked: games.some((g) => g.maxKnowledge >= 5),
    },
  ];
}
