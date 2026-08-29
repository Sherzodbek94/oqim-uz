/**
 * OQIM — bot AI (game.md §8).
 * Personalities map to visible behavior:
 *  - Ehtiyotkor (cautious): declines deals ≥50% of cash, never takes loans
 *  - Muvozanat (balanced): buys what it can afford, sensible
 *  - Jasur (bold): buys aggressively, takes bank loans
 */
import type { DealCard, DoodadCard, EventCard, FTDeal, GameState, Player, WeekendCard } from "./types";
import { BANK_LOAN_MONTHS, INSTALLMENT_MIN_PRICE, LOAN_RATE_YEAR, SCORE_EMERGENCY } from "./types";
import {
  addLog,
  adjustedCashflow,
  adjustedDown,
  annuityPayment,
  dealKnowledgeLocked,
  dealLoanGate,
  dealLoanPayment,
  effectiveSalary,
  emergencyLoan,
  forcedSell,
  installmentPayments,
  installmentQuote,
  loanPayments,
  monthlyCashflow,
  passiveIncome,
  totalExpenses,
  weekendSpendCost,
  type BuyMethod,
  type WeekendChoice,
} from "./engine";
import { SECURITIES, buySecurity, securityById, sellSecurity } from "./exchange";
import { formatUZSCompact } from "./format";

export interface BotDecision {
  buy: boolean;
  method: BuyMethod;
}

/**
 * Annuitet krediti botga "sig'adimi": kreditdan keyingi naqd oqim musbat
 * VA qarz yuki chegarada (Muvozanat/Jasur ≤ 60%, Ehtiyotkor ≤ 40%).
 */
function botLoanAffordable(p: Player, newMonthlyPayment: number, newMonthlyIncome: number): boolean {
  const cfAfter = monthlyCashflow(p) + newMonthlyIncome - newMonthlyPayment;
  if (cfAfter <= 0) return false;
  const income = effectiveSalary(p) + passiveIncome(p) + newMonthlyIncome;
  if (income <= 0) return false;
  const limit = (p.personality ?? "balanced") === "cautious" ? 0.4 : 0.6;
  const load = (loanPayments(p) + installmentPayments(p) + newMonthlyPayment) / income;
  return load <= limit;
}

/**
 * Installment preference: Muvozanat/Jasur bots use "bo'lib to'lash" when cash
 * is short (paying the down payment would drain reserves) as long as the
 * cashflow stays positive. Ehtiyotkor never uses it.
 */
function tryInstallment(p: Player, deal: DealCard): BuyMethod | null {
  const quote = installmentQuote(p, deal);
  if (!quote) return null;
  if (deal.price <= INSTALLMENT_MIN_PRICE) return null;
  if (p.cash < quote.down) return null;
  // paying cash would leave less than ~1.5 months of expenses in reserve
  const cashShort = p.cash - quote.down < totalExpenses(p) * 1.5;
  if (!cashShort) return null;
  // cashflow must stay positive after the new monthly installment
  const cfAfter = monthlyCashflow(p) + adjustedCashflow(p, deal) - quote.monthlyPayment;
  if (cfAfter <= 0) return null;
  return "installment";
}

export function botDealDecision(p: Player, deal: DealCard): BotDecision {
  // B3: bilim talabiga yetmagan bitim bot uchun ham yopiq
  if (dealKnowledgeLocked(p, deal)) return { buy: false, method: "cash" };
  const down = adjustedDown(p, deal);
  const canAfford = p.cash >= down;
  const personality = p.personality ?? "balanced";
  // Zero-cashflow speculative assets only appeal to bolder bots
  const speculative = adjustedCashflow(p, deal) === 0;
  switch (personality) {
    case "cautious": {
      if (speculative) return { buy: false, method: "cash" };
      if (down >= p.cash * 0.5) return { buy: false, method: "cash" };
      return { buy: canAfford, method: "cash" };
    }
    case "bold": {
      if (canAfford) {
        const inst = tryInstallment(p, deal);
        if (inst) return { buy: true, method: inst };
        return { buy: true, method: "cash" };
      }
      // takes a loan if the shortfall is not crazy relative to cash AND the
      // annuity payment keeps cashflow positive with debt load ≤ 60%
      const shortfall = down - p.cash;
      // kredit reytingi ≥ 600 va aktiv garovga yaroqli bo'lishi shart
      if (p.cash > 0 && shortfall <= p.cash * 2 && dealLoanGate(p, deal) === null) {
        const newPayment =
          annuityPayment(shortfall, LOAN_RATE_YEAR / 12, BANK_LOAN_MONTHS) + dealLoanPayment(deal);
        if (botLoanAffordable(p, newPayment, adjustedCashflow(p, deal))) {
          return { buy: true, method: "loan" };
        }
      }
      return { buy: false, method: "cash" };
    }
    default: {
      if (speculative && down > p.cash * 0.3) return { buy: false, method: "cash" };
      if (!canAfford) return { buy: false, method: "cash" };
      const inst = tryInstallment(p, deal);
      if (inst) return { buy: true, method: inst };
      return { buy: true, method: "cash" };
    }
  }
}

export function botPickDealSize(p: Player): "small" | "big" {
  // bots pick big deals when they have meaningful cash reserves
  return p.cash >= 60_000_000 && Math.random() < 0.5 ? "big" : "small";
}

export function botCharityDecision(p: Player): boolean {
  if (p.charityBlockedTurns > 0) return false;
  const donation = Math.round(p.salary * 0.1);
  const personality = p.personality ?? "balanced";
  if (personality === "cautious") return p.cash >= donation * 30;
  if (personality === "bold") return p.cash >= donation * 5;
  return p.cash >= donation * 12;
}

/** Ikki tanlovli hodisa (dilemma): ehtiyotkor eng arzonini, jasur 50/50 tanlaydi. */
export function botDilemmaChoice(p: Player, card: EventCard): 0 | 1 {
  if (!card.choices) return 0;
  const personality = p.personality ?? "balanced";
  // Kredit taklifi: annuitet to'lovi byudjetga sig'masa, bot taklifni rad etadi
  const loanBad = (i: 0 | 1): boolean => {
    const e = card.choices![i].effect;
    if (e.type !== "loan-offer") return false;
    return !botLoanAffordable(p, annuityPayment(e.principal, e.monthlyRate, e.months), 0);
  };
  if (loanBad(0) && !loanBad(1)) return 1;
  if (loanBad(1) && !loanBad(0)) return 0;
  const cost = (i: 0 | 1): number => {
    const e = card.choices![i].effect;
    if (e.type === "cash") return e.amount;
    if (e.type === "cash-chance") return Math.round((e.amount * e.chance) / 100);
    // IPO taklifi — xavfli sarmoya: ehtiyotkor bot rad etishni afzal ko'radi
    if (e.type === "ipo-offer") return -1;
    return 0;
  };
  const affordable = (i: 0 | 1) => cost(i) >= 0 || p.cash >= -cost(i);
  if (!affordable(0) && affordable(1)) return 1;
  if (!affordable(1) && affordable(0)) return 0;
  const c0 = cost(0);
  const c1 = cost(1);
  if (personality === "cautious") return c0 >= c1 ? 0 : 1;
  return Math.random() < 0.5 ? 0 : 1;
}

export function botMigrationDecision(p: Player): boolean {
  // skipping 2 turns hurts escape progress; only bold bots with low passive income accept
  return (p.personality ?? "balanced") === "bold" && passiveIncome(p) < totalExpenses(p) * 0.5;
}

export function botDoodadMode(p: Player, card: DoodadCard): "cash" | "credit" {
  if (p.cash >= card.cost) return "cash";
  return "credit";
}

/** Ixtiyoriy doodad: Ehtiyotkor har doim rad etadi, Jasur 30%, Muvozanat 60%. */
export function botDoodadDecline(p: Player, card: DoodadCard): boolean {
  if (!card.canDecline) return false;
  const personality = p.personality ?? "balanced";
  if (personality === "cautious") return true;
  if (personality === "bold") return Math.random() < 0.3;
  return Math.random() < 0.6;
}

/**
 * Dam olish kuni: Ehtiyotkor odatda bepul variantni oladi, Jasur ko'pincha
 * to'laydi, Muvozanat 50/50. Bots never overspend: spend requires cash cover
 * (subscription option with no upfront cost is always affordable).
 */
export function botWeekendChoice(p: Player, card: WeekendCard): WeekendChoice {
  const cost = weekendSpendCost(p, card);
  const affordable = cost <= p.cash;
  if (!affordable) return "free";
  const personality = p.personality ?? "balanced";
  if (personality === "cautious") return Math.random() < 0.15 ? "spend" : "free";
  if (personality === "bold") return Math.random() < 0.7 ? "spend" : "free";
  return Math.random() < 0.5 ? "spend" : "free";
}

export function botFTDealDecision(p: Player, deal: FTDeal): boolean {
  const personality = p.personality ?? "balanced";
  if (p.cash < deal.price) return false;
  const rest = p.cash - deal.price;
  // keep a safety buffer unless bold
  const buffer = personality === "bold" ? 50_000_000 : 200_000_000;
  return rest >= buffer;
}

export function botSellDecision(): boolean {
  // market offers are above purchase price — bots always sell
  return true;
}

/* ---------------- Fond birjasi: bot savdosi ---------------- */

/**
 * Har oy kunidan keyin chaqiriladi (faqat botlar):
 *  - Muvozanat/Jasur: P/L > +40% bo'lgan pozitsiyani foydani qulflash uchun sotadi
 *  - Muvozanat: naqd > 3× oylik xarajat bo'lsa, 1-3 ta past-tebranishli qog'oz oladi
 *  - Jasur: yuqori tebranishli qog'ozlarni afzal ko'radi
 *  - Ehtiyotkor: faqat obligatsiya/oltin
 * Barcha harakatlar Jurnalga yoziladi.
 */
export function botTradeExchange(p: Player, s: GameState): void {
  const personality = p.personality ?? "balanced";
  const expenses = totalExpenses(p);

  // foydani qulflash: P/L > +40% (Ehtiyotkor sotmaydi — uzoq ushlab turadi)
  if (personality !== "cautious") {
    for (const h of [...p.portfolio]) {
      const sec = securityById(h.securityId);
      if (!sec) continue;
      const price = s.exchange.prices[h.securityId] ?? sec.basePrice;
      if (h.avgBuyPrice > 0 && price >= h.avgBuyPrice * 1.4) {
        const res = sellSecurity(p, s, h.securityId, h.qty);
        if (res) {
          addLog(
            s,
            "sell",
            `${p.name}: ${h.qty} ta ${sec.ticker} sotdi (+${formatUZSCompact(res.total - res.fee)}) — foyda qulflandi`,
            "good"
          );
        }
      }
    }
  }

  // sotib olish
  let pool = SECURITIES;
  let cashGate = 3;
  if (personality === "cautious") {
    pool = SECURITIES.filter((x) => x.sector === "obligatsiya" || x.sector === "oltin");
  } else if (personality === "bold") {
    pool = [...SECURITIES].sort((a, b) => b.volatility - a.volatility);
    cashGate = 2;
  } else {
    pool = [...SECURITIES].sort((a, b) => a.volatility - b.volatility);
  }
  if (p.cash <= expenses * cashGate) return;
  const qtyWanted = 1 + Math.floor(Math.random() * 3); // 1-3 dona
  const reserve = personality === "bold" ? expenses * 0.5 : expenses;
  for (const sec of pool) {
    const price = s.exchange.prices[sec.id] ?? sec.basePrice;
    const affordableQty = Math.min(qtyWanted, Math.floor((p.cash - reserve) / (price * 1.005)));
    if (affordableQty <= 0) continue;
    const res = buySecurity(p, s, sec.id, affordableQty);
    if (res) {
      addLog(
        s,
        "buy",
        `${p.name}: ${res.qty} ta ${sec.ticker} sotib oldi (−${formatUZSCompact(res.total + res.fee)})`,
        "neutral"
      );
    }
    return; // bir oy kunida bitta xarid
  }
}

/** Bankruptcy self-rescue for bots: sell everything at urgent-sale price, then emergency loan. */
export function botRescue(p: Player, s: GameState): void {
  // avval birja portfelini joriy narxda sotadi
  while (p.cash < 0 && p.portfolio.length > 0) {
    const h = p.portfolio[0];
    sellSecurity(p, s, h.securityId, h.qty);
  }
  while (p.cash < 0 && p.assets.length > 0) {
    forcedSell(s, p, p.assets[0].id);
  }
  if (p.cash < 0 && !p.usedEmergencyLoan) {
    emergencyLoan(p);
    addLog(s, "work", `${p.name}: 📊 Kredit reytingi ${SCORE_EMERGENCY} (shoshilinch qarz)`, "bad");
  }
}

/* ---------------- fix-16 (X4): yo'l xaritasi rejimi ---------------- */

import type { PathNode } from "./path";

/**
 * Yo'l xaritasida botning tugun tanlovi — shaxsiyat heuristikasi:
 *  - Ehtiyotkor (cautious): xavfsiz tugunlarni afzal ko'radi, payday/avans/charity yo'nalishli
 *  - Jasur (bold): riskli tugunlar va bitimlar sari intiladi
 *  - Muvozanat (balanced): muvozanatli — o'rtacha xavf, aralash turlar
 * `options` — joriy pozitsiyadan yetib bo'ladigan tugunlar (kamida 1 ta).
 */
export function botPathChoice<T extends { data: PathNode }>(
  p: Player,
  options: T[],
  rand: () => number = Math.random
): T {
  if (options.length === 1) return options[0];
  const personality = p.personality ?? "balanced";
  const riskScore = { safe: 0, mid: 1, risky: 2 } as const;
  const score = (n: PathNode): number => {
    const r = riskScore[n.risk];
    let s = rand() * 0.8; // kichik tasodifiylik
    if (personality === "cautious") {
      s += (2 - r) * 2; // xavfsizroq = yaxshiroq
      if (n.type === "payday" || n.type === "avans" || n.type === "charity" || n.type === "rest") s += 1.5;
      if (n.type === "doodad" && n.risk === "risky") s -= 2;
    } else if (personality === "bold") {
      s += r * 2; // riskliroq = yaxshiroq
      if (n.type === "deal") s += 1.5;
      if (n.type === "rest") s -= 1.5;
    } else {
      s += 1.5 - Math.abs(r - 1); // o'rtacha xavf afzal
      if (n.type === "payday" || n.type === "avans") s += 1;
      if (n.type === "deal") s += 0.5;
    }
    return s;
  };
  return options.reduce((best, cur) => (score(cur.data) > score(best.data) ? cur : best));
}
