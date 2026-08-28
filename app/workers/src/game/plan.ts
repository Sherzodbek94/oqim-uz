/**
 * OQIM — fix-17 (R1): "Reja rejimi" (oylik vaqt-planner).
 * Zar va tasodifiy katak o'rniga: o'yinchi oyning 20 faol kuniga harakat
 * plitkalarini (Ish, Bilim, Mijoz, Bozor, Hodisa, Dam olish) joylashtirib,
 * o'z oyini strategik rejalashtiradi. Maosh ish kunlari soniga mutanosib
 * tushadi (planSalaryScale orqali), payday mavjud applyPayday mexanikasi bilan.
 */

import type { GameState, Player } from "./types";
import { addOneClient, addLog, gainKnowledge, quadrantLevel } from "./engine";
import { formatUZSCompact } from "./format";

/* ---------------- turlar ---------------- */

/** Plitka turi — bitta plitka = bitta faol kun. */
export type PlanTile = "work" | "knowledge" | "client" | "market" | "event" | "rest";

export interface PlanDay {
  /** null = hali plitka qo'yilmagan (rejalashtirish jarayonida) */
  tile: PlanTile | null;
  /** kun bajarildi (oy ijrosi davomida) */
  done: boolean;
}

export interface PlanState {
  /** har bir o'yinchi (playerId) uchun joriy oy rejasi (20 kun) */
  days: Record<number, PlanDay[]>;
  /** ijro jarayonida joriy kun indeksi (-1 = rejalashtirish / ijro tugagan) */
  executing: number;
}

/** Oy = 20 faol kun (dam olish kunlari avtomatik). */
export const PLAN_DAYS = 20;

/** fix-18 (E): oy 4 haftaga bo'linadi — bir vaqtda faqat joriy hafta ochiq. */
export const WEEKS_PER_MONTH = 4;
export const DAYS_PER_WEEK = 5;

/** Kun indeksining haftasi (0–3). */
export function weekOfDay(dayIdx: number): number {
  return Math.min(WEEKS_PER_MONTH - 1, Math.floor(dayIdx / DAYS_PER_WEEK));
}

/** Haftaning birinchi kuni (absolyut indeks). */
export function weekStartDay(weekIdx: number): number {
  return weekIdx * DAYS_PER_WEEK;
}

/** Joriy hafta segmenti to'liq to'ldirilganmi (oldingi haftalar bajarilgan deb olinadi)? */
export function validatePlanWeek(days: PlanDay[], weekIdx: number): boolean {
  if (days.length !== PLAN_DAYS || weekIdx < 0 || weekIdx >= WEEKS_PER_MONTH) return false;
  const start = weekStartDay(weekIdx);
  for (let i = start; i < start + DAYS_PER_WEEK; i++) {
    if (days[i].tile === null) return false;
  }
  return true;
}

/** Bo'sh kunlarni FAQAT joriy haftada "Dam olish" bilan to'ldiradi. */
export function autofillPlanWeek(days: PlanDay[], weekIdx: number): PlanDay[] {
  const start = weekStartDay(weekIdx);
  return days.map((d, i) =>
    i >= start && i < start + DAYS_PER_WEEK && d.tile === null ? { ...d, tile: "rest" as PlanTile } : d
  );
}

/** Avans shu kundan (1-asoslangan) keyin olinadi. */
export const PLAN_AVANS_DAY = 10;

export const PLAN_TILES: { id: PlanTile; icon: string; label: string; desc: string }[] = [
  { id: "work", icon: "💼", label: "Ish", desc: "Maoshning 1/20 qismi ishlanadi" },
  { id: "knowledge", icon: "📚", label: "Bilim", desc: "Kichik bilim harakati (kitob/maqola)" },
  { id: "client", icon: "🤝", label: "Mijoz", desc: "Yangi mijoz topishga urinish" },
  { id: "market", icon: "🛍", label: "Bozor", desc: "Bitim kartasi ochiladi" },
  { id: "event", icon: "🎉", label: "Hodisa", desc: "Tasodifiy hodisa kuni" },
  { id: "rest", icon: "🌿", label: "Dam olish", desc: "Tinch kun — yaxshi kayfiyat" },
];

export function planTileInfo(tile: PlanTile) {
  return PLAN_TILES.find((t) => t.id === tile)!;
}

/* ---------------- reja boshqaruvi ---------------- */

/** Bo'sh 20 kunlik reja (hammasi null). */
export function makeEmptyPlan(): PlanDay[] {
  return Array.from({ length: PLAN_DAYS }, () => ({ tile: null, done: false }));
}

export function makePlanState(): PlanState {
  return { days: {}, executing: -1 };
}

/** Reja to'liq to'ldirilganmi (har bir kunga plitka qo'yilgan)? */
export function validatePlan(days: PlanDay[]): boolean {
  return days.length === PLAN_DAYS && days.every((d) => d.tile !== null);
}

/** Bo'sh kunlarni "Dam olish" bilan to'ldiradi (avto-to'ldirish). */
export function autofillPlan(days: PlanDay[]): PlanDay[] {
  return days.map((d) => (d.tile === null ? { ...d, tile: "rest" as PlanTile } : d));
}

/** Rejadagi ish kunlari soni. */
export function planWorkDays(days: PlanDay[]): number {
  return days.filter((d) => d.tile === "work").length;
}

/** Maosh koeffitsiyenti: ish kunlari / 20. */
export function planSalaryScale(days: PlanDay[]): number {
  return planWorkDays(days) / PLAN_DAYS;
}

/** Plitka turi bo'yicha sonlar (UI panel uchun). */
export function planTileCounts(days: PlanDay[]): Record<PlanTile, number> {
  const counts: Record<PlanTile, number> = { work: 0, knowledge: 0, client: 0, market: 0, event: 0, rest: 0 };
  for (const d of days) if (d.tile) counts[d.tile] += 1;
  return counts;
}

/* ---------------- bot rejasi ---------------- */

/**
 * Bot rejasi — shaxsiyatga qarab plitka taqsimoti:
 * ehtiyotkor — ko'proq Ish/Dam olish; tavakkalchi — ko'proq Bozor/Mijoz/Hodisa.
 * Natija aralashtirilib qaytariladi (tasodifiy kun tartibi).
 */
export function generateBotPlan(player: Player, rand: () => number = Math.random): PlanDay[] {
  const personality = player.personality ?? "balanced";
  const table: Record<PlanTile, number> =
    personality === "cautious"
      ? { work: 14, knowledge: 2, client: 1, market: 0, event: 1, rest: 2 }
      : personality === "bold"
        ? { work: 9, knowledge: 2, client: 2, market: 4, event: 2, rest: 1 }
        : { work: 12, knowledge: 2, client: 1, market: 2, event: 1, rest: 2 };
  // mijoz plitkasi faqat S/B/I kvadrantda mazmunli — E da Ish ga almashtiriladi
  if (quadrantLevel(player) < 1 && table.client > 0) {
    table.work += table.client;
    table.client = 0;
  }
  const tiles: PlanTile[] = [];
  for (const t of Object.keys(table) as PlanTile[]) {
    for (let i = 0; i < table[t]; i++) tiles.push(t);
  }
  // himoya: 20 dan kam/ortiq bo'lmasin
  while (tiles.length < PLAN_DAYS) tiles.push("rest");
  tiles.length = PLAN_DAYS;
  // Fisher–Yates aralashtirish
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles.map((tile) => ({ tile, done: false }));
}

/* ---------------- kun effektlari (modalsiz plitkalar) ---------------- */

/**
 * 📚 Bilim kuni: kichik bilim harakati — bepul maqola/podkast (50% +1 bilim)
 * yoki arzon kitob (−300 ming, 80% +1 bilim). Natija matni qaytariladi.
 */
export function executeKnowledgeDay(s: GameState, p: Player, rand: () => number = Math.random): string {
  const paid = rand() < 0.4 && p.cash >= 300_000;
  if (paid) p.cash -= 300_000;
  const chance = paid ? 0.8 : 0.5;
  if (rand() < chance) {
    const gained = gainKnowledge(p, 1);
    const msg = gained > 0 ? `+1 bilim (hozir: ${p.knowledge}/5)` : "Bilim darajasi maksimalda";
    const text = paid
      ? `📚 Kitob o'qidi (−${formatUZSCompact(300_000)}) — ${msg}`
      : `📚 Maqola o'qidi (bepul) — ${msg}`;
    addLog(s, "work", `${p.name}: ${text}`, gained > 0 ? "good" : "neutral");
    return text;
  }
  const text = paid
    ? `📚 Kitob o'qidi (−${formatUZSCompact(300_000)}) — vaqt ketdi, bilim oshmadi`
    : "📚 Maqola o'qidi (bepul) — bilim oshmadi";
  addLog(s, "work", `${p.name}: ${text}`, "neutral");
  return text;
}

/**
 * 🤝 Mijoz kuni: S/B/I kvadrantda kichik marketing (−200 ming) bilan
 * 40% ehtimolga yangi mijoz. E kvadrantda — faqat maslahat.
 */
export function executeClientDay(s: GameState, p: Player, rand: () => number = Math.random): string {
  if (quadrantLevel(p) < 1) {
    const text = "🤝 Mijoz qidirildi, lekin avval S kvadrantiga o'tish kerak";
    addLog(s, "work", `${p.name}: ${text}`, "neutral");
    return text;
  }
  const cost = 200_000;
  const paid = p.cash >= cost;
  if (paid) p.cash -= cost;
  if (paid && rand() < 0.4) {
    const client = addOneClient(p, rand, 400_000, 900_000);
    const text = `🤝 Yangi mijoz: ${client.name} — ${formatUZSCompact(client.monthlyFee)}/oy (−${formatUZSCompact(cost)} marketing)`;
    addLog(s, "work", `${p.name}: ${text}`, "good");
    return text;
  }
  const text = paid
    ? `🤝 Targ'ibot samara bermadi (−${formatUZSCompact(cost)})`
    : "🤝 Mijoz qidirildi — naqd pul yetarli emas";
  addLog(s, "work", `${p.name}: ${text}`, "neutral");
  return text;
}
