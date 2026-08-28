/**
 * OQIM (avvalgi Cashflow UZ) — Stage A engine smoke test.
 * Run: ./node_modules/.bin/esbuild scripts/smoke.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke.mjs && node /tmp/smoke.mjs
 */
import {
  adjustedCashflow,
  adjustedDown,
  adjustedPrice,
  advanceTurn,
  applyEvent,
  applyLifeEvent,
  assetCashflow,
  buyDeal,
  canEscape,
  eligibleEvents,
  makeGame,
  makePlayer,
  marketOffer,
  passiveIncome,
  tickTurn,
} from "../src/lib/game/engine";
import { BIG_DEALS, EVENT_CARDS, LIFE_EVENTS, MARKET_CARDS, SMALL_DEALS } from "../src/lib/game/data";
import {
  customToProfession,
  fieldFromProfessionName,
  heroById,
  heroToProfession,
  validateCustomProfile,
} from "../src/lib/game/heroes";
import { NEWS_HEADLINES, newsById, tickNews } from "../src/lib/game/news";
import { EVENT_COOLDOWN, type EventCard, type Player } from "../src/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const deal = (id: string) => SMALL_DEALS.concat(BIG_DEALS).find((d) => d.id === id)!;
const evt = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;

function playerFor(heroId: string | null): Player {
  const hero = heroById(heroId)!;
  return makePlayer(0, hero.name, heroToProfession(hero), {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
    heroId: hero.id,
  });
}

/* ---------- 1. Ability price/income modifiers ---------- */
{
  const davron = playerFor("davron"); // Yer baxti: dala/chorva −15%
  const veg = deal("veggies"); // tag "dala"
  check("davron deal-price −15% (dala)", adjustedPrice(davron, veg) === Math.round(veg.price * 0.85));
  check("davron down −15%", adjustedDown(davron, veg) === Math.round(veg.down * 0.85));

  const aziza = playerFor("aziza"); // unrelated
  check("aziza no price change", adjustedPrice(aziza, veg) === veg.price);

  const jamshid = playerFor("jamshid"); // onlayn +20%
  const tg = deal("tg-shop");
  check("jamshid income +20% (onlayn)", adjustedCashflow(jamshid, tg) === Math.round(tg.cashflow * 1.2));

  const nodira = playerFor("nodira"); // restoran +25%
  const choy = deal("choyxona");
  check("nodira income +25% (restoran)", adjustedCashflow(nodira, choy) === Math.round(choy.cashflow * 1.25));

  const gulnoza = playerFor("gulnoza"); // xizmat +15%
  const barber = deal("barber");
  check("gulnoza income +15% (xizmat)", adjustedCashflow(gulnoza, barber) === Math.round(barber.cashflow * 1.15));

  const ziyoda = playerFor("ziyoda"); // risky −15%
  const crypto = deal("crypto");
  check("crypto marked risky", crypto.risky === true);
  check("ziyoda risky price −15%", adjustedPrice(ziyoda, crypto) === Math.round(crypto.price * 0.85));
  check("ziyoda non-risky unchanged", adjustedPrice(ziyoda, veg) === veg.price);

  const sarvar = playerFor("sarvar"); // realestate sale +10%
  sarvar.assets.push({
    id: "t1", title: "Kvartira", kind: "realestate", icon: "Home",
    price: 100_000_000, paid: 50_000_000, monthlyCashflow: 1_000_000,
  });
  const mkt = MARKET_CARDS.find((m) => m.kind === "realestate")!;
  const baseOffer = marketOffer(aziza, sarvar.assets[0], mkt);
  const sarvarOffer = marketOffer(sarvar, sarvar.assets[0], mkt);
  check("sarvar market offer +10%", sarvarOffer === Math.round(baseOffer * 1.1), { baseOffer, sarvarOffer });

  // resalePercent applies for ported assets
  const farm = sarvar.assets[0];
  farm.resalePercent = 50;
  const discounted = marketOffer(aziza, farm, mkt);
  check("resalePercent halves offer", discounted === Math.round(farm.price * mkt.factor * 0.5), { discounted });

  // Aziza: ta'lim xarajati −20%
  const book = evt("finance-book");
  const cashBefore = aziza.cash;
  applyEvent(aziza, book);
  check("aziza education −20%", aziza.cash - cashBefore === Math.round(-300_000 * 0.8));

  // Bekzod: tibbiyot −30% (life event + dilemma)
  const bekzod = playerFor("bekzod");
  const health = LIFE_EVENTS.find((l) => l.id === "health")!;
  const cashB = bekzod.cash;
  applyLifeEvent(bekzod, health);
  // doctor professionId no longer matches (hero-bekzod) → base −10mln, then −30%
  check("bekzod medical −30%", bekzod.cash - cashB === Math.round(-10_000_000 * 0.7), bekzod.cash - cashB);
}

/* ---------- 2. Custom character + field keyword mapping ---------- */
{
  check("field: shifokor→tibbiyot", fieldFromProfessionName("Shifokor") === "tibbiyot");
  check("field: dasturchi→it", fieldFromProfessionName("Dasturchi") === "it");
  check("field: o'qituvchi→talim", fieldFromProfessionName("O'qituvchi") === "talim");
  check("field: haydovchi→transport", fieldFromProfessionName("Taksi haydovchi") === "transport");
  check("field: advokat→huquq", fieldFromProfessionName("Advokat") === "huquq");
  check("field: bankir→moliya", fieldFromProfessionName("Bankir") === "moliya");
  check("field: unknown→null", fieldFromProfessionName("Kelbosang") === null);

  const input = {
    professionName: "Shifokor",
    salary: 8_000_000,
    expenses: { housing: 2_000_000, food: 1_500_000, transport: 500_000, education: 500_000, other: 500_000 },
    cash: 10_000_000,
    loans: [
      { name: "Ipoteka", principal: 100_000_000, annualRatePct: 21, months: 180 },
      { name: "Avto krediti", principal: 0, annualRatePct: 0, months: 0 },
      { name: "Kredit karta", principal: 0, annualRatePct: 0, months: 0 },
    ],
  };
  check("valid custom profile", validateCustomProfile(input) === null);
  check("reject salary 0", validateCustomProfile({ ...input, salary: 0 }) !== null);
  check(
    "reject expenses > salary × 3 (absurd)",
    validateCustomProfile({
      ...input,
      expenses: { housing: 25_000_000, food: 0, transport: 0, education: 0, other: 0 },
    }) !== null
  );
  check(
    "allow low expenses (<30% maosh, yumshoq ogohlantirish)",
    validateCustomProfile({
      ...input,
      expenses: { housing: 1_000_000, food: 500_000, transport: 200_000, education: 100_000, other: 100_000 },
    }) === null
  );
  check(
    "reject expenses ≤ 0 (eksployt-guard)",
    validateCustomProfile({
      ...input,
      expenses: { housing: 0, food: 0, transport: 0, education: 0, other: 0 },
    }) !== null
  );
  check(
    "reject loan without rate/months",
    validateCustomProfile({
      ...input,
      loans: [{ name: "Ipoteka", principal: 5_000_000, annualRatePct: 0, months: 0 }],
    }) !== null
  );

  const prof = customToProfession(input);
  const p = makePlayer(0, "Test", prof, {
    isBot: false, personality: null, colorIndex: 0, dreamId: "d1",
    heroId: null, customField: fieldFromProfessionName(input.professionName),
  });
  check("custom cash", p.cash === 10_000_000);
  check("custom loan created", p.loans.length === 1 && p.loans[0].principal === 100_000_000);
  check("custom field applied", p.customField === "tibbiyot");
  // profession-field event applies via customField
  const fieldEvt = EVENT_CARDS.find((e) => e.effect.type === "field-cash" && e.effect.fields.includes("tibbiyot"));
  if (fieldEvt) {
    const before = p.cash;
    const res = applyEvent(p, fieldEvt);
    check("custom field-cash event applies", p.cash !== before, res);
  }
}

/* ---------- 3. Solo mode (0 bots) full turn loop ---------- */
{
  const solo = makePlayer(0, "Solo", heroToProfession(heroById("aziza")!), {
    isBot: false, personality: null, colorIndex: 0, dreamId: "d1", heroId: "aziza",
  });
  const s = makeGame([solo]);
  check("solo: one player", s.players.length === 1);
  for (let i = 0; i < 8; i++) {
    const p = s.players[s.current];
    check(`solo turn ${i}: current is human`, !p.isBot && p.id === 0);
    tickTurn(p);
    tickNews(s);
    if (s.phase !== "game-over") s.phase = "idle";
    advanceTurn(s);
  }
  check("solo: rounds advanced", s.round >= 8, s.round);
  check("solo: news drawn at least once", s.recentNews.length >= 1);
}

/* ---------- 4. 2-choice event resolution: both paths ---------- */
{
  const meros = evt("meros");
  check("meros has 2 choices", !!meros.choices && meros.choices.length === 2);
  const p1 = playerFor("aziza");
  const b1 = p1.cash;
  applyEvent(p1, { ...meros, effect: meros.choices![0].effect } as EventCard);
  check("meros invest path +50mln", p1.cash - b1 === 50_000_000);
  check("meros invest drawMarket flag", meros.choices![0].drawMarket === true);
  const p2 = playerFor("aziza");
  applyEvent(p2, { ...meros, effect: meros.choices![1].effect } as EventCard);
  check("meros cash path +50mln", p2.cash === b1 + 50_000_000);

  const toy = evt("toyxona");
  const p3 = playerFor("aziza");
  applyEvent(p3, { ...toy, effect: toy.choices![1].effect } as EventCard);
  check("toyxona decline → charity blocked 3", p3.charityBlockedTurns === 3);

  const micro = evt("loan-offer-micro");
  const p4 = playerFor("aziza");
  const c4 = p4.cash;
  applyEvent(p4, { ...micro, effect: micro.choices![0].effect } as EventCard);
  // annuitet (3%/oy, 24 oy): ~295 237 so'm/oy (±2%)
  const microLoan = p4.loans.find((l) => l.principal === 5_000_000);
  check(
    "mikrokredit: +5mln cash + annuity loan",
    p4.cash - c4 === 5_000_000 &&
      !!microLoan &&
      Math.abs(microLoan.monthlyPayment - 295_237) / 295_237 <= 0.02 &&
      microLoan.remainingMonths === 24,
    microLoan
  );

  const course = evt("invest-course");
  const p5 = playerFor("aziza");
  applyEvent(p5, { ...course, effect: course.choices![0].effect } as EventCard);
  applyEvent(p5, { ...course, effect: course.choices![0].effect2! } as EventCard);
  check("invest course: analyst badge 5", p5.analystDealsLeft === 5);

  const coupon = evt("loan-offer-mortgage");
  const p6 = playerFor("aziza");
  applyEvent(p6, { ...coupon, effect: coupon.choices![0].effect } as EventCard);
  check("ipoteka kupon 10%", p6.dealCoupon?.pct === 10);
  const aptDeal = deal("apt");
  const downWithCoupon = adjustedDown(p6, aptDeal);
  check("coupon applies to kvartira", downWithCoupon === Math.round(aptDeal.down * 0.9), downWithCoupon);
  const before = p6.cash;
  if (p6.cash < downWithCoupon) p6.cash = downWithCoupon; else void before;
  buyDeal(p6, aptDeal, false);
  check("coupon consumed after purchase", p6.dealCoupon === null);
}

/* ---------- 5. Cooldown blocks repeat ---------- */
{
  const p = playerFor("aziza");
  const recent = EVENT_CARDS.slice(0, EVENT_COOLDOWN).map((c) => c.id);
  const pool = eligibleEvents(p, recent);
  check("cooldown excludes recent ids", pool.every((c) => !recent.includes(c.id)));
  const allRecent = EVENT_CARDS.map((c) => c.id);
  const fallback = eligibleEvents(p, allRecent);
  check(
    "fallback when everything on cooldown (kvadrant filtri saqlanadi)",
    fallback.length > 0 && fallback.every((c) => !c.requiresQuadrant || c.requiresQuadrant === p.quadrant)
  );
  // eligibility: avtokredit only with avto asset/loan
  const noAuto = eligibleEvents(p, []);
  check("avtokredit hidden without avto", !noAuto.some((c) => c.id === "loan-offer-auto"));
  p.loans.push({
    id: "x", name: "Avto krediti", principal: 10, monthlyPayment: 1,
    monthlyRate: 0.015, remainingMonths: 12, remainingBalance: 10, totalMonths: 12,
  });
  const withAuto = eligibleEvents(p, []);
  check("avtokredit shown with avto loan", withAuto.some((c) => c.id === "loan-offer-auto"));
}

/* ---------- 6. News ticker modifier applies/expires ---------- */
{
  const p = playerFor("aziza");
  p.assets.push({
    id: "dep", title: "Depozit", kind: "deposit", icon: "PiggyBank",
    price: 30_000_000, paid: 30_000_000, monthlyCashflow: 1_000_000,
  });
  const h = NEWS_HEADLINES.find((n) => n.id === "deposit-up")!;
  const news = { id: h.id, turnsLeft: 3 };
  check("news +10% on deposit", assetCashflow(p, p.assets[0], news) === 1_100_000);
  check("passiveIncome includes news", passiveIncome(p, { news }) === 1_100_000);
  check("no news → no modifier", assetCashflow(p, p.assets[0], null) === 1_000_000);

  // Ziyoda softens negative headlines by 50%
  const z = playerFor("ziyoda");
  z.assets.push({
    id: "st", title: "Aksiyalar", kind: "stock", icon: "TrendingUp",
    price: 10_000_000, paid: 10_000_000, monthlyCashflow: 1_000_000,
  });
  const down = { id: "stocks-down", turnsLeft: 3 };
  const normal = playerFor("aziza");
  normal.assets.push({ ...z.assets[0], id: "st2" });
  check("negative news −10% (normal)", assetCashflow(normal, normal.assets[0], down) === 900_000);
  check("ziyoda softened −5%", assetCashflow(z, z.assets[0], down) === 950_000);

  // expiry via tickNews
  const solo2 = makeGame([p]);
  solo2.news = { id: "deposit-up", turnsLeft: 1 };
  solo2.newsCounter = 2; // next tick → counter 3 → would draw, but expiry happens first
  tickNews(solo2);
  check("news expires when turnsLeft hits 0", solo2.news === null || solo2.news.id !== "deposit-up" || solo2.news.turnsLeft === 3);
  check("headline lookup", newsById("deposit-up")?.pct === 10);
  check("12+ headlines", NEWS_HEADLINES.length >= 12);
}

/* ---------- escape still works ---------- */
{
  const p = playerFor("aziza");
  check("not escapable initially", !canEscape(p));
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
