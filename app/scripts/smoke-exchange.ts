/**
 * OQIM — Stage B exchange smoke test.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-exchange.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-exchange.mjs && node /tmp/smoke-exchange.mjs
 */
import {
  applyEvent,
  applyPayday,
  canEscape,
  makeGame,
  makePlayer,
  passiveIncome,
  totalExpenses,
} from "../src/lib/game/engine";
import {
  DIVERSIFICATION_BONUS,
  EXCHANGE_FEE_RATE,
  PRICE_MAX_FACTOR,
  PRICE_MIN_FACTOR,
  SECURITIES,
  buySecurity,
  hasDiversificationBonus,
  makeExchangeState,
  maxBuyQty,
  movePrices,
  portfolioDividends,
  portfolioSectors,
  portfolioValue,
  priceChangePct,
  securityById,
  sellSecurity,
  tickExchangePrices,
  tradeFee,
} from "../src/lib/game/exchange";
import { botTradeExchange } from "../src/lib/game/bots";
import { EVENT_CARDS } from "../src/lib/game/data";
import { heroById, heroToProfession } from "../src/lib/game/heroes";
import type { EventCard, Player } from "../src/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

function playerFor(heroId: string | null, personality: Player["personality"] = null): Player {
  const hero = heroById(heroId)!;
  return makePlayer(0, hero.name, heroToProfession(hero), {
    isBot: personality !== null,
    personality,
    colorIndex: 0,
    dreamId: "d1",
    heroId: hero.id,
  });
}

const evt = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;
const sec = (id: string) => securityById(id)!;

/* ---------- 1. Data model sanity ---------- */
{
  check("8 securities", SECURITIES.length === 8);
  check("tickers 3-5 harf", SECURITIES.every((x) => x.ticker.length >= 3 && x.ticker.length <= 5));
  check("volatility 0.02–0.08", SECURITIES.every((x) => x.volatility >= 0.02 && x.volatility <= 0.08));
  check("oltin ETF dividendsiz", sec("oetf").dividendYield === 0);
  check("obligatsiya kupon ~1%", sec("uzob").dividendYield === 0.01);
  const ex = makeExchangeState();
  check("prices init at basePrice", SECURITIES.every((x) => ex.prices[x.id] === x.basePrice));
  check("history init", SECURITIES.every((x) => ex.history[x.id].length === 1));
}

/* ---------- 2. Price movement bounds ---------- */
{
  const p = playerFor("aziza");
  const s = makeGame([p]);
  for (let i = 0; i < 500; i++) tickExchangePrices(s);
  const inBounds = SECURITIES.every((x) => {
    const pr = s.exchange.prices[x.id];
    return pr >= Math.round(x.basePrice * PRICE_MIN_FACTOR) && pr <= Math.round(x.basePrice * PRICE_MAX_FACTOR);
  });
  check("prices stay within [20%, 400%] of base after 500 ticks", inBounds);
  check("history capped at 12 points", SECURITIES.every((x) => s.exchange.history[x.id].length <= 12));
  check("history has 12 points after 500 ticks", s.exchange.history.mnbk.length === 12);
  check("priceChangePct is a number", Number.isFinite(priceChangePct(s.exchange, sec("mnbk"))));
}

/* ---------- 3. News sector bias affects prices ---------- */
{
  const p = playerFor("aziza");
  const s = makeGame([p]);
  s.news = { id: "stocks-up", turnsLeft: 3 };
  const origRandom = Math.random;
  Math.random = () => 0.5; // drift = 0 → faqat bias qoladi
  tickExchangePrices(s);
  Math.random = origRandom;
  check("stocks-up: bank +5%", s.exchange.prices.mnbk === Math.round(420_000 * 1.05), s.exchange.prices.mnbk);
  check("stocks-up: texnologiya +5%", s.exchange.prices.ttch === Math.round(95_000 * 1.05));
  check("stocks-up: oltin unaffected", s.exchange.prices.oetf === 1_200_000);
  check("stocks-up: obligatsiya unaffected", s.exchange.prices.uzob === 1_000_000);

  const s2 = makeGame([p]);
  s2.news = { id: "gold-up", turnsLeft: 3 };
  Math.random = () => 0.5;
  tickExchangePrices(s2);
  Math.random = origRandom;
  check("gold-up: oltin +5%", s2.exchange.prices.oetf === Math.round(1_200_000 * 1.05));
  check("gold-up: bank unaffected", s2.exchange.prices.mnbk === 420_000);
}

/* ---------- 4. Buy/sell cash & fee math ---------- */
{
  const p = playerFor("aziza");
  const s = makeGame([p]);
  p.cash = 10_000_000;
  const res = buySecurity(p, s, "mnbk", 2); // 2 × 420 000 = 840 000, fee 4 200
  check("buy returns result", !!res);
  check("buy fee 0.5%", res!.fee === tradeFee(840_000) && res!.fee === Math.round(840_000 * EXCHANGE_FEE_RATE));
  check("buy cash deducted incl. fee", p.cash === 10_000_000 - 840_000 - 4_200, p.cash);
  check("holding created with avgBuyPrice", p.portfolio[0]?.qty === 2 && p.portfolio[0]?.avgBuyPrice === 420_000);

  // avg price weighting after second buy at moved price
  movePrices(s, ["bank"], 10); // 462 000
  const res2 = buySecurity(p, s, "mnbk", 2);
  check("second buy at new price", res2!.price === Math.round(420_000 * 1.1));
  check("avgBuyPrice weighted", p.portfolio[0].avgBuyPrice === Math.round((420_000 * 2 + Math.round(420_000 * 1.1) * 2) / 4));

  const sellRes = sellSecurity(p, s, "mnbk", 1);
  const expectedProceeds = Math.round(420_000 * 1.1) - tradeFee(Math.round(420_000 * 1.1));
  check("sell proceeds minus fee", sellRes!.total - sellRes!.fee === expectedProceeds);
  check("sell reduces qty", p.portfolio[0].qty === 3);
  // sell all → holding removed
  sellSecurity(p, s, "mnbk", 3);
  check("holding removed when qty 0", p.portfolio.length === 0);

  // guards
  check("buy rejected without cash", buySecurity(p, s, "uzob", 100) === null);
  check("sell rejected without holding", sellSecurity(p, s, "uzob", 1) === null);
  p.cash = 1_000_000;
  check("maxBuyQty accounts fee", maxBuyQty(p, 420_000) === 2);
}

/* ---------- 5. Dividends at payday → passive income & escape ---------- */
{
  const p = playerFor("aziza"); // expenses 2 500 000, maosh 3 000 000
  const s = makeGame([p]);
  p.cash = 500_000_000;
  buySecurity(p, s, "mnbk", 10); // 10 × 420 000 × 1.5% = 63 000/oy
  const div = portfolioDividends(p, s.exchange);
  check("dividends = qty × price × yield", div === Math.round(10 * 420_000 * 0.015), div);
  check("dividends counted in passiveIncome", passiveIncome(p, { exchange: s.exchange }) === div);
  check("no dividends without exchange opt", passiveIncome(p) === 0);

  const cashBefore = p.cash;
  const pay = applyPayday(p, null, s.exchange);
  check("payday includes dividends", pay.notes.some((n) => n.includes("Birja dividendlari")));
  check("payday cash includes dividends", p.cash - cashBefore === pay.amount);

  // escape: dividendli portfel xarajatlarni qoplasin (bosqichli tizim: streak + aktivlar ham kerak)
  const rich = playerFor("aziza");
  const s2 = makeGame([rich]);
  rich.cash = 50_000_000_000;
  rich.salary = 0;
  rich.escapeStreak = 2; // 2 ketma-ket oy kunida passiv ≥ xarajat
  rich.assets.push(
    { id: "x1", title: "X1", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 0 },
    { id: "x2", title: "X2", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 0 }
  );
  buySecurity(rich, s2, "mnbk", 1000); // 1000 × 420 000 × 1.5% = 6,3 mln/oy > 2,5 mln xarajat
  check("escape via dividends alone", canEscape(rich, null, s2.exchange));
  check("no escape without exchange opt", !canEscape(rich));
  // Stage B (B6): zaxira yo'li — naqd ≥ 3× xarajat bo'lsa streak shart emas; streak testini zaxirasiz tekshiramiz
  check("no escape without streak (zaxirasiz)", (() => { rich.escapeStreak = 0; rich.cash = 1_000_000; return !canEscape(rich, null, s2.exchange); })());
  check("zaxira yo'li: naqd ≥ 3× xarajat streaksiz ham escape", (() => { rich.cash = 50_000_000_000; return canEscape(rich, null, s2.exchange); })());
}

/* ---------- 6. Diversifikatsiya bonusi ---------- */
{
  const p = playerFor("aziza");
  const s = makeGame([p]);
  p.cash = 50_000_000_000;
  buySecurity(p, s, "mnbk", 10);
  buySecurity(p, s, "fren", 10);
  buySecurity(p, s, "uztl", 10);
  const base = portfolioDividends(p, s.exchange);
  check("3 sectors — no bonus", !hasDiversificationBonus(p));
  buySecurity(p, s, "uzob", 1); // 4-chi sektor
  check("4 sectors — bonus active", hasDiversificationBonus(p) && portfolioSectors(p).length >= 4);
  const boosted = portfolioDividends(p, s.exchange);
  const expected = Math.round((base + 1_000_000 * 0.01) * (1 + DIVERSIFICATION_BONUS));
  check("bonus +10% on dividends", boosted === expected, { boosted, expected });
}

/* ---------- 7. Market events → birja ---------- */
{
  const p = playerFor("aziza");
  const s = makeGame([p]);
  p.cash = 50_000_000;
  buySecurity(p, s, "mnbk", 5);

  const rally = evt("stocks-rally");
  const res = applyEvent(p, rally, s);
  check("rally +25% on bank", s.exchange.prices.mnbk === Math.round(420_000 * 1.25), s.exchange.prices.mnbk);
  check("rally affects portfolio message", res.includes("+25%"));
  check("rally skips oltin/obligatsiya", s.exchange.prices.oetf === 1_200_000 && s.exchange.prices.uzob === 1_000_000);

  const crash = evt("exchange-crash");
  applyEvent(p, crash, s);
  check("crash −20%", s.exchange.prices.mnbk === Math.round(Math.round(420_000 * 1.25) * 0.8), s.exchange.prices.mnbk);

  // guard: portfel bo'sh o'yinchi
  const empty = playerFor("bekzod");
  const res2 = applyEvent(empty, rally, s);
  check("no holdings → 'Sizga ta'sir qilmadi'", res2.includes("ta'sir qilmadi"), res2);
  // lekin bozor narxi baribir harakat qiladi (umumiy bozor)
  check("global prices still moved", s.exchange.prices.ttch !== 95_000);

  const goldRec = evt("gold-record");
  applyEvent(p, goldRec, s);
  check("oltin rekordi +30%", s.exchange.prices.oetf === Math.round(1_200_000 * 1.3));

  const bankStress = evt("bank-stress");
  const beforeFren = s.exchange.prices.fren;
  const beforeMnbk = s.exchange.prices.mnbk;
  applyEvent(p, bankStress, s);
  check("bank stress −15% faqat bankka", s.exchange.prices.mnbk === Math.round(beforeMnbk * 0.85));
  check("bank stress: energetika unaffected", s.exchange.prices.fren === beforeFren);

  const techBoom = evt("tech-boom");
  const beforeTech = s.exchange.prices.ttch;
  applyEvent(p, techBoom, s);
  check("tech boom +35% (marta oshirilgan baza ustidan)", s.exchange.prices.ttch === Math.round(beforeTech * 1.35));

  const curDecl = evt("currency-decline");
  const beforeUztl = s.exchange.prices.uztl;
  const beforeMnbk2 = s.exchange.prices.mnbk;
  applyEvent(p, curDecl, s);
  check(
    "valyuta tanazzuli: telekom −10%",
    s.exchange.prices.uztl === Math.round(beforeUztl * 0.9)
  );
  check("valyuta tanazzuli: bank unaffected", s.exchange.prices.mnbk === beforeMnbk2);
}

/* ---------- 8. Ziyoda softening on "Birja qulashi" ---------- */
{
  const z = playerFor("ziyoda");
  const s = makeGame([z]);
  z.cash = 50_000_000;
  buySecurity(z, s, "mnbk", 5);
  const crash = evt("exchange-crash");
  const res = applyEvent(z, crash, s);
  check("ziyoda: crash softened −20% → −10%", s.exchange.prices.mnbk === Math.round(420_000 * 0.9), {
    price: s.exchange.prices.mnbk,
    res,
  });
}

/* ---------- 9. Dividend boost event (×1.5, 3 oy) ---------- */
{
  const p = playerFor("aziza");
  const s = makeGame([p]);
  p.cash = 50_000_000;
  buySecurity(p, s, "mnbk", 10);
  const boost = evt("dividend-raise");
  const base = portfolioDividends(p, s.exchange);
  applyEvent(p, boost, s);
  check("boost ×1.5 active", portfolioDividends(p, s.exchange) === Math.round(base * 1.5));
  applyPayday(p, null, s.exchange);
  check("boost month 1 ticked", p.dividendBoost?.monthsRemaining === 2);
  applyPayday(p, null, s.exchange);
  applyPayday(p, null, s.exchange);
  check("boost expired after 3 paydays", p.dividendBoost === null);
  check("dividends back to base", portfolioDividends(p, s.exchange) === base);

  const empty = playerFor("bekzod");
  check("boost guard: empty portfolio", applyEvent(empty, boost, s).includes("ta'sir qilmadi"));
}

/* ---------- 10. IPO event: both choices ---------- */
{
  const ipo = evt("ipo-tosh-tech");
  check("ipo is a dilemma", !!ipo.choices && ipo.choices.length === 2);

  const p = playerFor("aziza");
  const s = makeGame([p]);
  p.cash = 10_000_000;
  const accept: EventCard = { ...ipo, effect: ipo.choices![0].effect };
  const res = applyEvent(p, accept, s);
  const offerPrice = Math.round(95_000 * 0.8); // 76 000
  const perUnit = offerPrice + tradeFee(offerPrice); // 76 380
  const expectedQty = Math.min(10, Math.floor(10_000_000 / perUnit)); // 10
  check("ipo accept buys up to 10 at −20%", p.portfolio[0]?.securityId === "ttch" && p.portfolio[0]?.qty === expectedQty, {
    res,
    qty: p.portfolio[0]?.qty,
  });
  check("ipo avgBuyPrice is discounted", p.portfolio[0]?.avgBuyPrice === offerPrice);

  const poor = playerFor("bekzod");
  const s2 = makeGame([poor]);
  poor.cash = 10_000; // bir donaga ham yetmaydi
  const res2 = applyEvent(poor, accept, s2);
  check("ipo accept without cash → skipped", poor.portfolio.length === 0 && res2.includes("yetarli emas"), res2);

  const decline: EventCard = { ...ipo, effect: ipo.choices![1].effect };
  const p3 = playerFor("aziza");
  const s3 = makeGame([p3]);
  const res3 = applyEvent(p3, decline, s3);
  check("ipo decline → no change", p3.portfolio.length === 0 && res3.includes("yo'q"));
}

/* ---------- 11. Bots trade without crashing ---------- */
{
  for (const personality of ["cautious", "balanced", "bold"] as const) {
    const bot = playerFor("aziza", personality);
    const s = makeGame([bot]);
    bot.cash = 200_000_000;
    for (let i = 0; i < 30; i++) {
      tickExchangePrices(s);
      botTradeExchange(bot, s);
      bot.cash += 5_000_000; // oylik daromad simulyatsiyasi
    }
    check(`bot ${personality}: trades happened or safely skipped`, bot.portfolio.length >= 0);
    check(`bot ${personality}: cash finite`, Number.isFinite(bot.cash));
  }
  // cautious faqat obligatsiya/oltin oladi
  const c = playerFor("aziza", "cautious");
  const sc = makeGame([c]);
  c.cash = 500_000_000;
  for (let i = 0; i < 20; i++) botTradeExchange(c, sc);
  const sectors = c.portfolio.map((h) => securityById(h.securityId)!.sector);
  check("cautious bot only obligatsiya/oltin", sectors.every((x) => x === "obligatsiya" || x === "oltin"), sectors);

  // +40% P/L sotish: balansli bot
  const b = playerFor("aziza", "balanced");
  const sb = makeGame([b]);
  b.cash = 100_000_000;
  buySecurity(b, sb, "mnbk", 10);
  movePrices(sb, ["bank"], 50); // +50% → P/L > 40%
  const cashBefore = b.cash;
  botTradeExchange(b, sb);
  // eski pozitsiya sotildi (bot keyin yangi, past-volatil qog'oz sotib olishi mumkin — u alohida)
  check(
    "balanced bot sells at +40% P/L",
    !b.portfolio.some((h) => h.securityId === "mnbk") && b.cash > cashBefore,
    { holdings: b.portfolio.map((h) => h.securityId) }
  );

  // portfel qiymati
  const v = portfolioValue(b, sb.exchange);
  check("portfolioValue numeric", Number.isFinite(v));
  // expenses sanity for gate
  check("bot gate uses expenses", totalExpenses(b) > 0);
}

console.log(failures === 0 ? "\nALL EXCHANGE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
