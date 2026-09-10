import type { Asset, EventEffect, Player, ProfessionField } from "./types";
import { MAX_FINISHED_UNITS, MAX_LINE_MONTHS, PRODUCTION_LINE_MONTHS, businessEconomy, businessModelForTag, businessOrderQuote, usesProductionLine } from "./business-economy";
import { businessMonthlyFinance } from "./business-finance";
import { MARKET_ACTIONS, driftBusinessMarket, ensureBusinessMarket, marketIndexLabel, recomputeBusinessMonth, recordUtilization } from "./business-market";
import type { BusinessMarketAction } from "./business-market";
import { formatUZSCompact } from "../format";

// O'yin balansining namunaviy qiymatlari; real bozor daromadi prognozi emas.
const profiles: Record<ProfessionField, { title: string; tag: string; employees: number }> = {
  talim: { title: "O'quv markazi", tag: "talim", employees: 4 },
  tibbiyot: { title: "Xususiy klinika", tag: "tibbiyot", employees: 4 },
  it: { title: "Dasturiy xizmatlar studiyasi", tag: "onlayn", employees: 3 },
  savdo: { title: "Savdo do'koni", tag: "savdo", employees: 3 },
  qishloq: { title: "Fermer xo'jaligi", tag: "dala", employees: 4 },
  xizmat: { title: "Xizmat ko'rsatish markazi", tag: "xizmat", employees: 3 },
  qurilish: { title: "Qurilish brigadasi", tag: "qurilish", employees: 5 },
  huquq: { title: "Yuridik xizmatlar byurosi", tag: "xizmat", employees: 3 },
  moliya: { title: "Buxgalteriya xizmatlari byurosi", tag: "xizmat", employees: 3 },
  transport: { title: "Transport korxonasi", tag: "avto", employees: 4 },
};

export function startingBusiness(id: string, field: ProfessionField): Asset {
  return {
    id, ...profiles[field], kind: "business", icon: "Store",
    businessModel: businessModelForTag(profiles[field].tag),
    price: 200_000_000, paid: 70_000_000,
    ...businessMonthlyFinance(businessModelForTag(profiles[field].tag), 14_000_000),
    monthlyCashflow: 14_000_000,
    resalePercent: 70, liquidity: 3, buyIndex: 1, riskLevel: 2,
  };
}

export const STOCK_UNIT_COST = 100_000;
export const ORDER_UNIT_PRICE = 180_000;
export function validBusinessOperations(value: unknown, asset?: Asset): boolean {
  if (!value || typeof value !== "object") return false;
  const op = value as NonNullable<Asset["operations"]>;
  if (![op.capacity, op.usedCapacity, op.stock, op.hires].every(Number.isInteger)) return false;
  const economy = businessEconomy(asset ?? {});
  if (op.capacity < economy.initialCapacity || op.capacity > economy.maxCapacity || op.capacity % 10 !== 0
    || op.usedCapacity < 0 || op.usedCapacity > op.capacity
    || op.stock < 0 || op.stock > 20 * economy.resourcePerUnit || op.hires < 0 || op.hires > 5) return false;
  const finished = op.finished ?? 0;
  if (!Number.isInteger(finished) || finished < 0 || finished > MAX_FINISHED_UNITS) return false;
  if (op.line !== undefined && op.line !== null) {
    if (typeof op.line !== "object" || op.line.units !== 20 || !Number.isInteger(op.line.monthsLeft)
      || op.line.monthsLeft < 1 || op.line.monthsLeft > MAX_LINE_MONTHS) return false;
  }
  // Faqat ishlab chiqarishda tayyor mahsulot ombori va liniya bo'ladi.
  if (asset?.businessModel && !usesProductionLine(asset) && (finished > 0 || op.line)) return false;
  return op.order === null || (!!op.order && typeof op.order === "object"
    && op.order.units === 20 && Number.isInteger(op.order.monthsLeft)
    && op.order.monthsLeft >= 1 && op.order.monthsLeft <= 3);
}
export function businessTarget(p: Player, assetId?: string): Asset | undefined {
  const active = p.assets.filter(a => a.kind === "business" && !(a.constructionLeft && a.constructionLeft > 0));
  if (assetId !== undefined) return active.find(a => a.id === assetId);
  const selected = active.find(a => a.id === p.managedBusinessId);
  if (selected) return selected;
  return active.find(a => a.operations?.order) ?? active[0];
}
export function selectBusiness(p: Player, assetId: string): boolean {
  if (p.quadrant !== "B" || p.bankrupt || p.escaped || !businessTarget(p, assetId)) return false;
  p.managedBusinessId = assetId;
  return true;
}
/**
 * Buyurtma zanjirining joriy bosqichi.
 * Savdo/xizmat: offer → (capacity) → procure → deliver.
 * Ishlab chiqarish: offer → procure → (capacity) → produce → line → deliver.
 */
export function businessStage(p: Player, assetId?: string): "offer" | "procure" | "produce" | "line" | "deliver" | "capacity" | null {
  const target = businessTarget(p, assetId);
  if (p.quadrant !== "B" || !target) return null;
  const op = target.operations;
  if (!op?.order) return "offer";
  const quote = businessOrderQuote(target);
  if (usesProductionLine(target)) {
    if ((op.finished ?? 0) >= quote.units) return "deliver";
    if (op.line) return "line";
    if (op.stock < quote.resources) return "procure";
    return op.capacity - op.usedCapacity < quote.capacity ? "capacity" : "produce";
  }
  if (op.capacity - op.usedCapacity < quote.capacity) return "capacity";
  return op.stock < quote.resources ? "procure" : "deliver";
}

/** Atomic commands: failed decisions do not spend money or partially change state. */
export function operateBusiness(p: Player, action: Extract<EventEffect, { type: "business-operation" }>["action"], assetId?: string): string {
  const a = businessTarget(p, assetId);
  if (p.quadrant !== "B" || !a) return "Faol biznes topilmadi";
  const quote = businessOrderQuote(a);
  const economy = quote.economy;
  const op = structuredClone(a.operations ?? { capacity: economy.initialCapacity, usedCapacity: 0, stock: 0, hires: 0, order: null, finished: 0, line: null });
  const line = usesProductionLine(a);
  let message = "";
  switch (action) {
    case "accept":
      if (op.order) return "Avval mavjud buyurtmani yakunlang";
      op.order = { units: 20, monthsLeft: 3 };
      message = `20 birlik buyurtma qabul qilindi: 3 oy. Tannarx ${formatUZSCompact(quote.stockCost + quote.executionCost)}, tushum ${formatUZSCompact(quote.revenue)}.`;
      break;
    case "restock": {
      if (!op.order) return "Avval buyurtma qabul qiling";
      const units = Math.max(0, quote.resources - op.stock);
      const cost = units * economy.unitCost;
      if (!units) return economy.resourcePerUnit ? "Zaxira yetarli" : "Xizmat uchun ombor xaridi kerak emas";
      if (p.cash < cost) return "Zaxira xaridiga naqd yetmaydi";
      p.cash -= cost;
      op.stock += units;
      a.price += cost;
      a.paid += cost;
      message = `${units} birlik zaxira olindi. Xarajat faqat bir marta naqd hisobdan yechildi.`;
      break;
    }
    case "produce": {
      if (!line) return "Bu biznesda alohida ishlab chiqarish liniyasi yo'q";
      if (!op.order) return "Avval buyurtma qabul qiling";
      if (op.line) return "Liniya band; joriy partiya tugashini kuting";
      if ((op.finished ?? 0) >= quote.units) return "Tayyor mahsulot allaqachon yetarli";
      if (p.freezeBusinessTurns > 0) return "Biznes vaqtincha to'xtagan; liniyani hozir yuklab bo'lmaydi";
      if (op.stock < quote.resources) return "Liniyaga beriladigan xomashyo yetmaydi";
      if (op.capacity - op.usedCapacity < quote.capacity) return "Bu oy quvvat yetmaydi; yangi oy yoki kengaytirishni kuting";
      op.stock -= quote.resources;
      op.usedCapacity += quote.capacity;
      op.line = { units: quote.units, monthsLeft: PRODUCTION_LINE_MONTHS };
      message = `${quote.resources} birlik xomashyo liniyaga berildi. ${PRODUCTION_LINE_MONTHS} oydan keyin ${quote.units} birlik tayyor mahsulot omborga tushadi; zaxira tannarxi aktivda qoladi.`;
      break;
    }
    case "deliver": {
      if (!op.order) return "Bajariladigan buyurtma yo'q";
      if (p.freezeBusinessTurns > 0) return "Biznes vaqtincha to'xtagan; buyurtmani hozir bajarib bo'lmaydi";
      if (line) {
        if ((op.finished ?? 0) < quote.units) return "Tayyor mahsulot yetmaydi; liniya tugashini kuting";
      } else {
        if (op.stock < quote.resources) return "Buyurtma uchun zaxira yetmaydi";
        if (op.capacity - op.usedCapacity < quote.capacity) return "Bu oy quvvat yetmaydi; yangi oy yoki kengaytirishni kuting";
      }
      if (p.cash < quote.executionCost) return "Buyurtmani bajarish xarajatiga naqd yetmaydi";
      if (line) {
        // Quvvat ishlab chiqarish paytida band bo'lgan; topshirish qo'shimcha quvvat olmaydi.
        op.finished = (op.finished ?? 0) - quote.units;
      } else {
        op.stock -= quote.resources;
        op.usedCapacity += quote.capacity;
      }
      op.order = null;
      p.cash += quote.revenue - quote.executionCost;
      a.price = Math.max(0, a.price - quote.stockCost);
      a.paid = Math.max(0, a.paid - quote.stockCost);
      message = `Buyurtma bajarildi: tushum +${formatUZSCompact(quote.revenue)}, bajarish xarajati −${formatUZSCompact(quote.executionCost)}. Zaxira tannarxidan keyin marja ${formatUZSCompact(quote.margin)}; oylik passiv daromad emas.`;
      break;
    }
    case "cancel":
      if (!op.order) return "Bekor qilinadigan buyurtma yo'q";
      op.order = null;
      message = "Buyurtma bekor qilindi. Olingan zaxira keyingi buyurtmaga saqlanadi; tushum berilmaydi.";
      break;
    case "hire":
      if (op.hires >= 5 || op.capacity >= economy.maxCapacity) return "Xodim yoki quvvat chegarasiga yetdingiz";
      if (p.cash < economy.hireCost) return "Xodim yollashga naqd yetmaydi";
      p.cash -= economy.hireCost;
      op.hires++;
      op.capacity = Math.min(economy.maxCapacity, op.capacity + economy.hireCapacity);
      a.employees = (a.employees ?? 0) + 1;
      if (a.baseline) {
        // Maosh bazaviy profilga qo'shiladi; joriy oy raqamlari shundan qayta hisoblanadi.
        a.baseline.parts.payroll += economy.salary;
        recomputeBusinessMonth(a);
      } else {
        if (a.monthlyOperatingCosts !== undefined) a.monthlyOperatingCosts += economy.salary;
        if (a.operatingCostParts) a.operatingCostParts.payroll += economy.salary;
        a.monthlyCashflow -= economy.salary;
      }
      message = `Xodim yollandi: −${formatUZSCompact(economy.hireCost)} hozir, −${formatUZSCompact(economy.salary)}/oy. Quvvat ${op.capacity} ${economy.capacityLabel}. Buyurtma kafolatlanmaydi.`;
      break;
    case "upgrade":
      if (op.capacity >= economy.maxCapacity) return "Quvvat chegarasiga yetdingiz";
      if (p.cash < economy.upgradeCost) return "Uskunaga naqd yetmaydi";
      p.cash -= economy.upgradeCost;
      a.price += economy.upgradeCost;
      a.paid += economy.upgradeCost;
      op.capacity = Math.min(economy.maxCapacity, op.capacity + economy.upgradeCapacity);
      message = `Jihoz yangilandi: −${formatUZSCompact(economy.upgradeCost)} naqd aktivga aylandi. Quvvat ${op.capacity} ${economy.capacityLabel}.`;
      break;
  }
  a.operations = op;
  return `${a.title}: ${message}`;
}

/**
 * Yangi oy: bandlik yozib olinadi va quvvat tiklanadi, ishlab chiqarish liniyasi
 * bir oy oldinga suriladi, buyurtma muddati kamayadi, so'ng bozor indekslari
 * driftlanib oylik tushum/xarajat qayta hisoblanadi.
 */
export function advanceBusinessMonth(p: Player, rand: () => number = Math.random): string[] {
  const notes: string[] = [];
  for (const a of p.assets) {
    if (a.kind !== "business") continue;
    const op = a.operations;
    if (op) {
      recordUtilization(a, op.usedCapacity, op.capacity);
      op.usedCapacity = 0;
      if (op.line && --op.line.monthsLeft <= 0) {
        op.finished = (op.finished ?? 0) + op.line.units;
        notes.push(`📊 ${a.title}: liniyadan ${op.line.units} birlik tayyor mahsulot omborga tushdi.`);
        op.line = null;
      }
      if (op.order && --op.order.monthsLeft <= 0) {
        op.order = null;
        notes.push(`⚠️ ${a.title}: buyurtma muddati tugadi; tushum yo'q, zaxira saqlanadi.`);
      }
    }
    // Qurilishdagi biznes hali ishlamaydi: bozor tarixi ham to'planmaydi.
    if (a.constructionLeft && a.constructionLeft > 0) continue;
    // Drift tasodifiy, shuning uchun jurnalga yozilmaydi: oldindan ko'rish (probe) va
    // haqiqiy holat bir xil matn bermaydi. Yangi indekslar hisobot panelida ko'rinadi.
    driftBusinessMarket(a, rand);
    recomputeBusinessMonth(a);
  }
  return notes;
}

/**
 * Sohaviy bozor qarori. Atomik: naqd yetmasa yoki nishon mos kelmasa holat
 * o'zgarmaydi. Narx va ta'sir faqat MARKET_ACTIONS jadvalidan olinadi.
 */
export function operateBusinessMarket(p: Player, action: BusinessMarketAction, assetId?: string): string {
  const a = businessTarget(p, assetId);
  if (p.quadrant !== "B" || !a) return "Faol biznes topilmadi";
  const rule = MARKET_ACTIONS[action];
  if (!rule) return "Noma'lum bozor qarori";
  const needsLine = action === "repair-line" || action === "delay-line";
  if (needsLine && !a.operations?.line) return "Faol ishlab chiqarish liniyasi yo'q";
  if (!needsLine && !a.baseline) return "Bu biznes uchun bozor modeli yo'q";
  if (p.cash < rule.cost) return "Bu qaror uchun naqd yetmaydi";
  p.cash -= rule.cost;
  let message = "";
  switch (action) {
    case "boost-demand": {
      const m = ensureBusinessMarket(a);
      m.demand = Math.min(1.25, m.demand * (1 + rule.pct / 100));
      m.demandBoostMonths = rule.months;
      message = `Marketingga −${formatUZSCompact(rule.cost)}. Talab ${marketIndexLabel(m.demand)} · ta'sir ${rule.months} oy.`;
      break;
    }
    case "lock-input": {
      const m = ensureBusinessMarket(a);
      m.priceLockMonths = rule.months;
      message = `Ta'minot shartnomasiga −${formatUZSCompact(rule.cost)}. Narx ${rule.months} oy ${marketIndexLabel(m.inputPrice)} darajada qulflandi.`;
      break;
    }
    case "raise-input": {
      const m = ensureBusinessMarket(a);
      m.inputPrice = Math.min(1.25, m.inputPrice * (1 + rule.pct / 100));
      message = `Ta'minot narxi ${marketIndexLabel(m.inputPrice)} bo'ldi; oylik xarajat oshdi.`;
      break;
    }
    case "repair-line":
      message = `Ta'mirga −${formatUZSCompact(rule.cost)}. Liniya jadval bo'yicha ishlaydi.`;
      break;
    case "delay-line":
      a.operations!.line!.monthsLeft += rule.months;
      message = `Liniya ${rule.months} oyga kechikdi; tayyor mahsulot keyinroq chiqadi.`;
      break;
  }
  recomputeBusinessMonth(a);
  return `${a.title}: ${message}`;
}
