import type { Asset, EventCard } from "./types";
import { businessMarket, businessOutlook, marketIndexLabel } from "./business-market";
import { formatUZSCompact } from "../format";

export type BusinessModel = "trade" | "production" | "service";
export interface BusinessEconomy {
  name: string;
  resource: string;
  capacityLabel: string;
  resourcePerUnit: number;
  capacityPerUnit: number;
  unitCost: number;
  unitPrice: number;
  executionCost: number;
  initialCapacity: number;
  maxCapacity: number;
  hireCost: number;
  salary: number;
  hireCapacity: number;
  upgradeCost: number;
  upgradeCapacity: number;
}

// O'yin ssenariylari. Real bozor narxlari yoki daromad kafolati emas.
export const BUSINESS_ECONOMIES: Record<BusinessModel | "legacy", BusinessEconomy> = {
  legacy: { name: "Avvalgi biznes modeli", resource: "Zaxira", capacityLabel: "birlik",
    resourcePerUnit: 1, capacityPerUnit: 1, unitCost: 100_000, unitPrice: 180_000, executionCost: 0,
    initialCapacity: 20, maxCapacity: 100, hireCost: 1_000_000, salary: 1_000_000, hireCapacity: 10, upgradeCost: 5_000_000, upgradeCapacity: 10 },
  trade: { name: "Savdo", resource: "Tayyor tovar", capacityLabel: "savdo birligi",
    resourcePerUnit: 1, capacityPerUnit: 1, unitCost: 200_000, unitPrice: 280_000, executionCost: 0,
    initialCapacity: 20, maxCapacity: 100, hireCost: 1_000_000, salary: 1_000_000, hireCapacity: 10, upgradeCost: 5_000_000, upgradeCapacity: 10 },
  production: { name: "Ishlab chiqarish", resource: "Xomashyo", capacityLabel: "quvvat birligi",
    resourcePerUnit: 2, capacityPerUnit: 2, unitCost: 75_000, unitPrice: 300_000, executionCost: 0,
    initialCapacity: 40, maxCapacity: 200, hireCost: 1_500_000, salary: 1_500_000, hireCapacity: 20, upgradeCost: 8_000_000, upgradeCapacity: 20 },
  service: { name: "Xizmat", resource: "Ombor talab qilinmaydi", capacityLabel: "ish soati",
    resourcePerUnit: 0, capacityPerUnit: 2, unitCost: 0, unitPrice: 140_000, executionCost: 60_000,
    initialCapacity: 40, maxCapacity: 120, hireCost: 2_000_000, salary: 2_000_000, hireCapacity: 10, upgradeCost: 4_000_000, upgradeCapacity: 10 },
};

/** Ishlab chiqarish liniyasi shuncha oy ishlaydi; keyin tayyor mahsulot omborga tushadi. */
export const PRODUCTION_LINE_MONTHS = 1;
/** Uzilish hodisasi liniyani ko'pi bilan shu darajagacha cho'zishi mumkin. */
export const MAX_LINE_MONTHS = PRODUCTION_LINE_MONTHS + 1;
/** Tayyor mahsulot ombori chegarasi: bir buyurtmadan ortiq zaxira yig'ilmaydi. */
export const MAX_FINISHED_UNITS = 40;

/** Faqat ishlab chiqarishda xomashyo alohida liniyada tayyor mahsulotga aylanadi. */
export function usesProductionLine(a: Pick<Asset, "businessModel">): boolean {
  return a.businessModel === "production";
}

export function businessModelForTag(tag?: string): BusinessModel {
  if (["dala", "chorva", "qurilish", "restoran", "ishlab-chiqarish"].includes(tag ?? "")) return "production";
  if (tag === "savdo") return "trade";
  return "service";
}
export function businessEconomy(a: Pick<Asset, "businessModel">): BusinessEconomy {
  return BUSINESS_ECONOMIES[a.businessModel ?? "legacy"];
}
export function businessOrderQuote(a: Asset) {
  const economy = businessEconomy(a);
  const units = a.operations?.order?.units ?? 20;
  const resources = units * economy.resourcePerUnit;
  const stockCost = resources * economy.unitCost;
  const executionCost = units * economy.executionCost;
  const revenue = units * economy.unitPrice;
  return { economy, units, resources, stockCost, executionCost, revenue,
    procurementCost: Math.max(0, resources - (a.operations?.stock ?? 0)) * economy.unitCost,
    capacity: units * economy.capacityPerUnit, margin: revenue - stockCost - executionCost };
}

/** Buyurtma zanjiri amallari — bu kartalarning tavsifi kotirovka bilan almashtiriladi. */
const ORDER_ACTIONS = ["accept", "restock", "produce", "deliver", "cancel"];

/** Biznesning joriy bozor holati: talab, ta'minot narxi, bandlik va sof oqim. */
export function businessStatusNote(a: Asset): string {
  const outlook = businessOutlook(a);
  if (!outlook) return "";
  const m = businessMarket(a);
  return `Bozor holati: talab ${marketIndexLabel(m.demand)}, ta'minot narxi ${marketIndexLabel(m.inputPrice)}, o'tgan oy bandligi ${Math.round(m.utilization * 100)}% · bazaviy sof oqim ${formatUZSCompact(outlook.net)}/oy.`;
}

export function describeBusinessCard(card: EventCard, a: Asset): EventCard {
  if (!card.businessStage) return card;
  const q = businessOrderQuote(a);
  const e = q.economy;
  const details = `${e.name}: ${q.units} buyurtma birligi · ${q.capacity} ${e.capacityLabel}. Tushum ${formatUZSCompact(q.revenue)}, zaxira tannarxi ${formatUZSCompact(q.stockCost)}, bajarish xarajati ${formatUZSCompact(q.executionCost)}. Marja ${formatUZSCompact(q.margin)}; doimiy oylik xarajatlar alohida.`;
  const line = usesProductionLine(a);
  const chain = e.resourcePerUnit === 0
    ? " Ombor xaridi kerak emas; bajarish xarajati uchun naqd zaxira kerak."
    : line
      ? ` ${e.resource}: ${q.resources} birlik kerak. Xomashyo liniyaga beriladi va ${PRODUCTION_LINE_MONTHS} oydan keyin tayyor mahsulot omboriga tushadi.`
      : ` ${e.resource}: ${q.resources} birlik kerak; ombordagi tovar to'g'ridan-to'g'ri topshiriladi.`;
  const status = businessStatusNote(a);
  const orderChain = card.choices?.some(c => c.effect.type === "business-operation" && ORDER_ACTIONS.includes(c.effect.action));
  const desc = orderChain ? `${details}${chain} ${status}`.trimEnd() : `${card.desc} ${status}`.trimEnd();
  return {...card, desc,
    choices: card.choices?.map(c => {
      if (c.effect.type !== "business-operation") return c;
      const hints = {
        accept: `3 oy muddat · hozir tushum yo'q · jami tannarx ${formatUZSCompact(q.stockCost + q.executionCost)}`,
        restock: `${e.resource} · yetishmagan zaxira uchun −${formatUZSCompact(q.procurementCost)}`,
        produce: `${q.resources} ${e.resource.toLowerCase()} → liniya · ${q.capacity} ${e.capacityLabel} band · ${PRODUCTION_LINE_MONTHS} oy`,
        deliver: line
          ? `+${formatUZSCompact(q.revenue)} tushum · tayyor mahsulotdan ${q.units} birlik`
          : `+${formatUZSCompact(q.revenue)} tushum · −${formatUZSCompact(q.executionCost)} bajarish xarajati · ${q.capacity} ${e.capacityLabel}`,
        cancel: "Tushum yo'q; sotib olingan zaxira saqlanadi",
        hire: `−${formatUZSCompact(e.hireCost)} hozir · −${formatUZSCompact(e.salary)}/oy · quvvat +${e.hireCapacity}`,
        upgrade: `−${formatUZSCompact(e.upgradeCost)} · quvvat +${e.upgradeCapacity} (maksimal ${e.maxCapacity})`,
      };
      return {...c, hint: hints[c.effect.action]};
    }) as EventCard["choices"]};
}
