import type { Asset } from "./types";
import type { BusinessModel } from "./business-economy";

/**
 * Biznesning oylik aylanmasi endi statik emas: talab, o'tgan oydagi bandlik va
 * ta'minot narxi har oy tushum va xarajatni qayta hisoblaydi.
 *
 * O'yin ssenariysi — bozor prognozi emas. `baseline` yo'q aktivlar (eski
 * saqlovlar) hech qachon qayta hisoblanmaydi va avvalgi raqamlarini saqlaydi.
 */

export type BusinessMarket = NonNullable<Asset["market"]>;
export type BusinessBaseline = NonNullable<Asset["baseline"]>;
export type BusinessMarketAction = Extract<import("./types").EventEffect, { type: "business-market" }>["action"];

export const DEMAND_MIN = 0.75;
export const DEMAND_MAX = 1.25;
export const INPUT_PRICE_MIN = 0.8;
export const INPUT_PRICE_MAX = 1.25;
/** Oylik tasodifiy qadam va 1,0 ga qaytarish kuchi (o'rtacha qiymatga qaytish). */
export const DRIFT_STEP = 0.05;
export const MEAN_PULL = 0.25;
/** To'liq bandlikda bazaviy hajmga qo'shiladigan ulush (takroriy mijozlar). */
export const UTILIZATION_BONUS = 0.05;
export const VOLUME_MIN = 0.7;
export const VOLUME_MAX = 1.35;

/** Sohaviy bozor qarorlarining narxi va ta'siri. Server ham shu jadvaldan oladi. */
export const MARKET_ACTIONS: Record<BusinessMarketAction, { cost: number; pct: number; months: number }> = {
  "boost-demand": { cost: 3_000_000, pct: 10, months: 3 },
  "lock-input": { cost: 4_000_000, pct: 0, months: 3 },
  "raise-input": { cost: 0, pct: 9, months: 0 },
  "repair-line": { cost: 2_500_000, pct: 0, months: 0 },
  "delay-line": { cost: 0, pct: 0, months: 1 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function defaultBusinessMarket(): BusinessMarket {
  return { demand: 1, inputPrice: 1, utilization: 0, priceLockMonths: 0, demandBoostMonths: 0 };
}

/** O'qish uchun: holat yo'q bo'lsa neytral (1,0) indekslar qaytadi. */
export function businessMarket(a: Pick<Asset, "market">): BusinessMarket {
  return a.market ?? defaultBusinessMarket();
}

/** Yozish uchun: holatni birinchi murojaatda yaratadi. */
export function ensureBusinessMarket(a: Asset): BusinessMarket {
  a.market ??= defaultBusinessMarket();
  return a.market;
}

/**
 * Ta'minot xarajatining sotuv hajmiga bog'liq ulushi. Savdo va ishlab
 * chiqarishda tannarx to'liq hajmga ergashadi; xizmatda yarmi doimiy.
 */
export function variableSupplyShare(model?: BusinessModel): number {
  return model === "service" ? 0.5 : 1;
}

/** Bazaviy hajmga nisbatan joriy oy hajmi: talab × bandlik ustamasi. */
export function businessVolume(a: Pick<Asset, "market">): number {
  const m = businessMarket(a);
  return clamp(m.demand * (1 + UTILIZATION_BONUS * m.utilization), VOLUME_MIN, VOLUME_MAX);
}

export interface BusinessOutlook {
  revenue: number;
  parts: BusinessBaseline["parts"];
  costs: number;
  net: number;
  volume: number;
  demand: number;
  inputPrice: number;
  utilization: number;
}

/** Joriy oy uchun hisoblangan profil; `baseline` bo'lmasa null (eski saqlov). */
export function businessOutlook(a: Pick<Asset, "baseline" | "market" | "businessModel">): BusinessOutlook | null {
  const base = a.baseline;
  if (!base) return null;
  const m = businessMarket(a);
  const volume = businessVolume(a);
  const share = variableSupplyShare(a.businessModel);
  const parts = {
    payroll: base.parts.payroll,
    rent: base.parts.rent,
    supplies: Math.round(base.parts.supplies * (share * volume + (1 - share)) * m.inputPrice),
    marketing: base.parts.marketing,
    other: base.parts.other,
  };
  const revenue = Math.round(base.revenue * volume);
  const costs = parts.payroll + parts.rent + parts.supplies + parts.marketing + parts.other;
  return { revenue, parts, costs, net: revenue - costs, volume, demand: m.demand, inputPrice: m.inputPrice, utilization: m.utilization };
}

/**
 * Aktivning oylik raqamlarini bazaviy profil va bozor holatidan qayta hisoblaydi.
 * Neytral indekslarda natija bazaviy qiymatlarga aynan teng.
 */
export function recomputeBusinessMonth(a: Asset): void {
  const outlook = businessOutlook(a);
  if (!outlook) return;
  a.monthlyRevenue = outlook.revenue;
  a.operatingCostParts = outlook.parts;
  a.monthlyOperatingCosts = outlook.costs;
  a.monthlyCashflow = outlook.net;
}

/**
 * Oylik drift: tasodifiy qadam + 1,0 ga qaytish. Marketing ta'siri davom
 * etayotgan oylarda talab qaytarilmaydi; ta'minot shartnomasi qulflangan
 * oylarda narx umuman o'zgarmaydi.
 */
export function driftBusinessMarket(a: Asset, rand: () => number = Math.random): void {
  if (!a.baseline) return;
  const m = ensureBusinessMarket(a);
  const step = () => (rand() * 2 - 1) * DRIFT_STEP;
  if (m.demandBoostMonths > 0) {
    m.demandBoostMonths -= 1;
    m.demand = clamp(m.demand + step(), DEMAND_MIN, DEMAND_MAX);
  } else {
    m.demand = clamp(m.demand + step() + (1 - m.demand) * MEAN_PULL, DEMAND_MIN, DEMAND_MAX);
  }
  if (m.priceLockMonths > 0) {
    m.priceLockMonths -= 1;
  } else {
    m.inputPrice = clamp(m.inputPrice + step() + (1 - m.inputPrice) * MEAN_PULL, INPUT_PRICE_MIN, INPUT_PRICE_MAX);
  }
}

/** O'tgan oydagi bandlik ulushi (0–1) keyingi oy hajmiga ta'sir qiladi. */
export function recordUtilization(a: Asset, usedCapacity: number, capacity: number): void {
  if (!a.baseline) return;
  const used = capacity > 0 ? clamp(usedCapacity / capacity, 0, 1) : 0;
  ensureBusinessMarket(a).utilization = Math.round(used * 100) / 100;
}

export function marketIndexLabel(value: number): string {
  const pct = Math.round((value - 1) * 100);
  return pct === 0 ? "o'rtacha" : `${pct > 0 ? "+" : ""}${pct}%`;
}

/** Saqlanmalar uchun: bozor holati va bazaviy profil shakli tekshiruvi. */
export function validBusinessMarket(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const m = value as BusinessMarket;
  return (
    Number.isFinite(m.demand) && m.demand >= DEMAND_MIN && m.demand <= DEMAND_MAX &&
    Number.isFinite(m.inputPrice) && m.inputPrice >= INPUT_PRICE_MIN && m.inputPrice <= INPUT_PRICE_MAX &&
    Number.isFinite(m.utilization) && m.utilization >= 0 && m.utilization <= 1 &&
    Number.isInteger(m.priceLockMonths) && m.priceLockMonths >= 0 && m.priceLockMonths <= 12 &&
    Number.isInteger(m.demandBoostMonths) && m.demandBoostMonths >= 0 && m.demandBoostMonths <= 12
  );
}

export function validBusinessBaseline(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const b = value as BusinessBaseline;
  if (!Number.isFinite(b.revenue) || b.revenue < 0) return false;
  if (!b.parts || typeof b.parts !== "object") return false;
  const keys: (keyof BusinessBaseline["parts"])[] = ["payroll", "rent", "supplies", "marketing", "other"];
  return keys.every(key => Number.isFinite(b.parts[key]) && b.parts[key] >= 0);
}
