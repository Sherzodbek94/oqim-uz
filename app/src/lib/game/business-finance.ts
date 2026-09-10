import type { Asset } from "./types";
import type { BusinessModel } from "./business-economy";
import { defaultBusinessMarket } from "./business-market";

// O‘yin balansi: 14 mln sof oqim uchun turli aylanma va xarajat tarkibi.
// Bu bozor prognozi emas. Mavjud saqlovlar qayta hisoblanmaydi.
const MONTHLY_COSTS: Record<BusinessModel, NonNullable<Asset["operatingCostParts"]>> = {
  trade: { payroll: 6_000_000, rent: 4_000_000, supplies: 33_000_000, marketing: 2_000_000, other: 1_000_000 },
  production: { payroll: 10_000_000, rent: 4_000_000, supplies: 16_000_000, marketing: 1_000_000, other: 3_000_000 },
  service: { payroll: 8_000_000, rent: 3_000_000, supplies: 3_000_000, marketing: 1_000_000, other: 1_000_000 },
};

/**
 * Only initialize new assets. Never recalculate existing assets after hires/events.
 * `baseline` — bu profilning indekssiz nusxasi: keyingi oylik qayta hisoblar
 * (talab, bandlik, ta'minot narxi) aynan shu qiymatlardan boshlanadi.
 */
export function businessMonthlyFinance(model: BusinessModel, net: number): Pick<Asset, "monthlyRevenue" | "monthlyOperatingCosts" | "operatingCostParts" | "baseline" | "market"> {
  // Negative/zero-yield deals lack enough information to infer their turnover.
  if (!Number.isFinite(net) || net <= 0) return {};
  const costs = MONTHLY_COSTS[model];
  const scale = (value: number) => Math.round(value * net / 14_000_000);
  const operatingCostParts = { payroll: scale(costs.payroll), rent: scale(costs.rent), supplies: scale(costs.supplies), marketing: scale(costs.marketing), other: scale(costs.other) };
  const monthlyOperatingCosts = Object.values(operatingCostParts).reduce((sum, n) => sum + n, 0);
  const monthlyRevenue = net + monthlyOperatingCosts;
  return {
    operatingCostParts, monthlyOperatingCosts, monthlyRevenue,
    baseline: { revenue: monthlyRevenue, parts: { ...operatingCostParts } },
    market: defaultBusinessMarket(),
  };
}

export function businessSupplyLabel(model?: BusinessModel): string {
  return model === "trade" ? "Sotilgan tovar tannarxi" : model === "production" ? "Xomashyo va materiallar" : model === "service" ? "Xizmat materiallari va vositalari" : "Ta'minot va materiallar";
}
