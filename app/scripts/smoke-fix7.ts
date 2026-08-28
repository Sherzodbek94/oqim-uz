/**
 * OQIM (avvalgi Cashflow UZ) — fix-7 smoke test:
 *  Stage A: A1 avans/payday 30+70, A2 0-xarajat eksployti, A3 bozor indekslari,
 *  A4 istalgan payt sotish, A5 kredit boshqaruvi, A6 doodad kechiktirish,
 *  A7 lifestyle inflation + erkinlik ×1,2.
 *  Stage B: B1 kvadrant progressiyasi, B2 mijozlar tizimi, B3 bilim darajasi,
 *  B5 maosh indeksatsiyasi, B6 zaxira yo'li bilan escape.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix7.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix7.mjs && node /tmp/smoke-fix7.mjs
 */
import {
  anytimeOffer,
  applyAvans,
  applyEvent,
  applyFTPayday,
  applyPayday,
  applySalaryRaise,
  assetMarketValue,
  buyDeal,
  buyDream,
  clientIncome,
  clientLeave,
  closeLoanEarly,
  completeMonth,
  createLoan,
  dealKnowledgeLocked,
  deferDoodad,
  dreamHoldWin,
  dreamMonthlyNet,
  driftMarketIndices,
  effectiveClients,
  eligibleEvents,
  freedomStage,
  gainKnowledge,
  hireManager,
  knowledgeFromDeal,
  makeGame,
  makePartialPayment,
  makePlayer,
  managerCost,
  maybeAdvanceQuadrant,
  newsSectorBias,
  passiveIncome,
  sellAssetAnytime,
  splitExpenses,
  tickTurn,
  totalExpenses,
} from "../src/lib/game/engine";
import { customLowExpensesWarning, validateCustomProfile } from "../src/lib/game/heroes";
import { BIG_DEALS, DOODAD_CARDS, DREAMS, EVENT_CARDS, PROFESSIONS, SMALL_DEALS } from "../src/lib/game/data";
import { clearSave, loadSave, saveGame } from "../src/lib/game/save";
import {
  AVANS_RATE,
  CLIENT_CAP_NO_MANAGER,
  DREAM_HOLD_MONTHS,
  KNOWLEDGE_MAX,
  MARKET_INDEX_MAX,
  MARKET_INDEX_MIN,
  MAX_DOODAD_DEFERS,
  OLD_SAVE_KEY,
  QUADRANT_S_MIN_KNOWLEDGE,
  SALARY_INDEX_PCT,
  SAVE_KEY,
  type EventCard,
  type Player,
} from "../src/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

/** Toza test o'yinchisi: 10 mln maosh, 1 mln xarajat, qarzsiz. */
function testPlayer(): Player {
  const p = makePlayer(0, "Test", PROFESSIONS[0], {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
  });
  p.loans = [];
  p.installments = [];
  p.assets = [];
  p.salary = 10_000_000;
  p.expenseParts = splitExpenses(1_000_000);
  p.cash = 0;
  return p;
}

/* ---------- A1. Avans 30% + payday 70% = 100% maosh (130% bug tuzatildi) ---------- */
{
  const p = testPlayer();
  const s = makeGame([p]);
  const avans = applyAvans(p);
  check("avans = 30% maosh", avans === Math.round(10_000_000 * AVANS_RATE), avans);
  check("avans bayrog'i qo'yildi", p.avansTakenThisMonth === true);

  const r1 = applyPayday(p);
  // to'liq oqim 10 − 1 = 9 mln; avans ayirilgach 9 − 3 = 6 mln
  check("payday avans ayirilgan holda", r1.amount === 6_000_000, r1.amount);
  check("avansDeducted = 3 mln", r1.avansDeducted === 3_000_000, r1.avansDeducted);
  check(
    "30% + 70% = 100% maosh (130% yo'q)",
    avans + (r1.amount + 1_000_000) === 10_000_000,
    { avans, payday: r1.amount }
  );
  check(
    "log matni: 'Ish haqi (avans ayirilgan)'",
    r1.notes.some((n) => n.startsWith("Ish haqi (avans ayirilgan): 7")),
    r1.notes
  );

  // oy tugaganda bayroq reset — keyingi payday to'liq
  completeMonth(s);
  check("bayroq oy tugaganda reset", p.avansTakenThisMonth === false);
  const r2 = applyPayday(p);
  check("keyingi payday to'liq oqim", r2.amount === 9_000_000, r2.amount);
  check("keyingi paydayda ayirish yo'q", (r2.avansDeducted ?? 0) === 0);

  // avanssiz payday hech narsa ayirmaydi
  const q = testPlayer();
  const r3 = applyPayday(q);
  check("avanssiz payday o'zgarmaydi", r3.amount === 9_000_000 && (r3.avansDeducted ?? 0) === 0);
}

/* ---------- A2. 0-xarajat eksployti ---------- */
{
  const base = {
    professionName: "Shifokor",
    salary: 5_000_000,
    expenses: { housing: 0, food: 0, transport: 0, education: 0, other: 0 },
    cash: 1_000_000,
    loans: [] as { name: string; principal: number; annualRatePct: number; months: number }[],
  };
  const err = validateCustomProfile(base);
  check("0 xarajat rad etiladi (≤0 eksployt-guard)", err !== null, err);
  check("xatolik o'zbekcha (0 dan katta)", !!err && err.includes("0 dan katta"), err);
  check(
    "30% chegarada qabul qilinadi",
    validateCustomProfile({ ...base, expenses: { ...base.expenses, housing: 1_500_000 } }) === null
  );
  check(
    "29% ham qabul qilinadi (yumshoq ogohlantirish, blok emas)",
    validateCustomProfile({ ...base, expenses: { ...base.expenses, housing: 1_450_000 } }) === null
  );
  check(
    "maosh × 3 dan oshsa rad etiladi (absurd)",
    validateCustomProfile({ ...base, expenses: { ...base.expenses, housing: 15_000_001 } }) !== null
  );
  check(
    "maosh × 3 ga teng bo'lsa qabul qilinadi",
    validateCustomProfile({ ...base, expenses: { ...base.expenses, housing: 15_000_000 } }) === null
  );
  // fix-8 holati: 75 mln maosh, 20,5 mln xarajat (<30%), qarz to'lovlari ~52,2 mln —
  // qarzlar 5 xarajat maydonidan alohida, validatsiya o'tkazishi kerak (oqim +2,38 mln)
  const lowExp = {
    professionName: "Dasturchi",
    salary: 75_000_000,
    expenses: { housing: 8_000_000, food: 6_000_000, transport: 2_500_000, education: 2_000_000, other: 2_000_000 },
    cash: 5_000_000,
    loans: [{ name: "Ipoteka", principal: 1_900_000_000, annualRatePct: 24, months: 60 }],
  };
  check(
    "fix-8: past xarajat + katta qarz to'lovlari → o'yin boshlanadi",
    validateCustomProfile(lowExp) === null,
    validateCustomProfile(lowExp)
  );
  check(
    "fix-8: past xarajat → yumshoq ogohlantirish ko'rsatiladi",
    customLowExpensesWarning(lowExp) !== null,
    customLowExpensesWarning(lowExp)
  );
  check(
    "30%+ xarajat → ogohlantirish yo'q",
    customLowExpensesWarning({ ...base, expenses: { ...base.expenses, housing: 1_500_000 } }) === null
  );

  // engine himoyasi: xarajatlar 0 bo'lsa Bosqich 3 berilmaydi
  const p = testPlayer();
  p.expenseParts = { taxes: 0, housing: 0, food: 0, transport: 0, other: 0 };
  p.cash = 100_000_000;
  p.escapeStreak = 9;
  p.assets.push(
    { id: "z1", title: "Z1", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 5_000_000 },
    { id: "z2", title: "Z2", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 5_000_000 }
  );
  check("xarajatlar 0 → freedomStage ≠ 3", freedomStage(p) !== 3, freedomStage(p));
}

/* ---------- A3. Bozor indekslari ---------- */
{
  const p = testPlayer();
  const s = makeGame([p]);
  check("indekslar 1,0 dan boshlanadi", Object.values(s.marketIndices).every((v) => v === 1));

  // 500 drift: har doim clamp ichida
  let inClamp = true;
  for (let i = 0; i < 500; i++) {
    driftMarketIndices(s);
    for (const v of Object.values(s.marketIndices)) {
      if (v < MARKET_INDEX_MIN || v > MARKET_INDEX_MAX) inClamp = false;
    }
  }
  check("500 drift: clamp [0,5; 2,0] saqlanadi", inClamp, s.marketIndices);

  // qirra holatlari: pastki/yuqori clamp
  s.marketIndices.business = 0.5;
  driftMarketIndices(s, () => 0); // minimal drift −4%
  check("pastki clamp 0,5", s.marketIndices.business >= MARKET_INDEX_MIN, s.marketIndices.business);
  s.marketIndices.business = 2.0;
  s.news = null;
  driftMarketIndices(s, () => 1); // maksimal drift +6%
  check("yuqori clamp 2,0", s.marketIndices.business <= MARKET_INDEX_MAX, s.marketIndices.business);

  // yangilik biasi: 'rent-up' faqat realestate'ga +0,1
  s.news = { id: "rent-up", turnsLeft: 3 };
  check("yangilik biasi realestate +0,1", newsSectorBias(s, "realestate") === 0.1);
  check("yangilik biasi biznesga 0", newsSectorBias(s, "business") === 0);
  s.marketIndices.realestate = 1;
  driftMarketIndices(s, () => 0.5); // baza drift +1% → 1 × 1,01 × (1+0... kutilma: 1*(1+0.01+0.1)
  check(
    "bias driftga qo'shiladi",
    Math.abs(s.marketIndices.realestate - 1 * (1 + 0.01 + 0.1)) < 1e-9,
    s.marketIndices.realestate
  );
  s.news = null;

  // buyIndex sotib olishda saqlanadi
  const deal = SMALL_DEALS.find((d) => d.resalePercent !== undefined) ?? SMALL_DEALS[0];
  p.cash = 1_000_000_000;
  const res = buyDeal(p, deal, false, 1.25);
  check("buyIndex saqlandi", res.asset.buyIndex === 1.25, res.asset.buyIndex);
  check("likvidlik bitimdan ko'chdi", res.asset.liquidity === deal.liquidity);

  // bozor qiymati = narx × indeks
  s.marketIndices[res.asset.kind] = 1.5;
  check(
    "bozor qiymati = narx × indeks",
    assetMarketValue(s, res.asset) === Math.round(res.asset.price * 1.5),
    assetMarketValue(s, res.asset)
  );
}

/* ---------- A4. Istalgan payt sotish ---------- */
{
  const p = testPlayer();
  const s = makeGame([p]);
  p.cash = 0;
  // likvidlik 1 → 0,80; resalePercent 100; indeks 1,2
  p.assets.push({
    id: "a1", title: "Choyxona", kind: "business", icon: "Store",
    price: 10_000_000, paid: 10_000_000, monthlyCashflow: 500_000,
    resalePercent: 100, liquidity: 1, buyIndex: 1,
  });
  s.marketIndices.business = 1.2;
  const offer = anytimeOffer(s, p.assets[0]);
  check("offer = 10 mln × 1,2 × 1,0 × 0,80", offer === 9_600_000, offer);

  // bog'langan kredit qoldig'i ushlab qolinadi va yopiladi
  p.loans.push({
    id: "loan-a1", name: "Ipoteka", principal: 5_000_000, monthlyPayment: 300_000,
    monthlyRate: 0.01, remainingMonths: 20, remainingBalance: 4_000_000, totalMonths: 24,
  });
  const sale = sellAssetAnytime(s, p.id, "a1");
  check("sotuv natijasi qaytdi", sale !== null);
  check("naqd = offer − kredit qoldig'i", p.cash === 9_600_000 - 4_000_000, p.cash);
  check("aktiv o'chirildi", p.assets.length === 0);
  check("bog'langan kredit yopildi", p.loans.length === 0);
  check("log: 'Sotildi: +X so'm (bozor: Y)'", s.log.some((l) => l.text.includes("Sotildi: +") && l.text.includes("bozor:")), s.log[0]?.text);

  // likvidlik yo'q → default 3 (0,93)
  p.assets.push({
    id: "a2", title: "Do'kon", kind: "business", icon: "Store",
    price: 10_000_000, paid: 10_000_000, monthlyCashflow: 0,
  });
  s.marketIndices.business = 1;
  check("default likvidlik 3 → ×0,93", anytimeOffer(s, p.assets[0]) === 9_300_000, anytimeOffer(s, p.assets[0]));
  // resalePercent 80 ham qo'llanadi
  p.assets[0].resalePercent = 80;
  check("resalePercent 80 qo'llanadi", anytimeOffer(s, p.assets[0]) === Math.round(10_000_000 * 0.8 * 0.93));
  // mavjud bo'lmagan aktiv → null
  check("mavjud bo'lmagan aktiv → null", sellAssetAnytime(s, p.id, "yoq") === null);
}

/* ---------- A5. Kredit boshqaruvi ---------- */
{
  const p = testPlayer();
  const loan = createLoan("l1", "Test krediti", 1_000_000, 0.018, 36);
  p.loans.push(loan);
  p.cash = 500_000;

  // qisman to'lov: qoldiq −100k, oylik o'zgarmaydi, muddat qisqaradi
  const res = makePartialPayment(p, "l1", 100_000);
  check("qisman to'lov qaytdi", res !== null && res.paid === 100_000);
  check("qoldiq 900 000", p.loans[0].remainingBalance === 900_000, p.loans[0].remainingBalance);
  check("naqd yechildi", p.cash === 400_000, p.cash);
  check("oylik to'lov o'zgarmadi", p.loans[0].monthlyPayment === loan.monthlyPayment);
  check(
    "muddat qayta hisoblandi (1..35)",
    p.loans[0].remainingMonths >= 1 && p.loans[0].remainingMonths < 36,
    p.loans[0].remainingMonths
  );
  check("yopilmadi", res !== null && res.closed === false);

  // guard: naqd yetarli emas / manfiy / NaN
  check("naqd yetishmasa null", makePartialPayment(p, "l1", 1_000_000) === null);
  check("manfiy summa null", makePartialPayment(p, "l1", -5) === null);
  check("NaN summa null", makePartialPayment(p, "l1", Number.NaN) === null);
  check("noma'lum kredit null", makePartialPayment(p, "yoq", 100) === null);
  check("guard'lar holatni buzmadi", p.cash === 400_000 && p.loans[0].remainingBalance === 900_000);

  // balansdan katta qisman to'lov → kredit yopiladi
  p.cash = 1_000_000;
  const full = makePartialPayment(p, "l1", 900_000);
  check("to'lov balansga qisqaradi", full !== null && full.paid === 900_000 && full.closed === true);
  check("kredit yopildi", p.loans.length === 0);
  check("qisman to'lovda naqd = min(summa, balans)", p.cash === 100_000, p.cash);

  // to'liq yopish: +5 reyting
  p.loans.push(createLoan("l2", "Yopiladigan", 500_000, 0.01, 12));
  p.cash = 600_000;
  const s0 = p.creditScore;
  check("to'liq yopish true", closeLoanEarly(p, "l2") === true);
  check("reyting +5", p.creditScore === Math.min(850, s0 + 5), { before: s0, after: p.creditScore });
  check("kredit o'chirildi", p.loans.length === 0);
  check("naqd qoldiq yechildi", p.cash === 600_000 - 500_000, p.cash);
  check("naqd yetishmasa false", closeLoanEarly(p, "l2") === false);
}

/* ---------- A6. Doodad "Keyinroq olaman" ---------- */
{
  const p = testPlayer();
  const s = makeGame([p]); // month = 1
  const card = DOODAD_CARDS[0];
  p.cash = 1_000_000;

  check("1-kechiktirish true", deferDoodad(p, card, s.month) === true);
  check("naqd yechilmadi", p.cash === 1_000_000);
  check("deferCount = 1", p.deferCount === 1);
  check("ro'yxatda 1 element", p.deferredDoodads.length === 1 && p.deferredDoodads[0].addedMonth === 1);

  // 2 oy o'tdi — hali qaytmaydi
  completeMonth(s); // month 2
  const r2 = completeMonth(s); // month 3
  check("2 oydan keyin hali qaytmaydi", r2.deferred.length === 0 && p.deferredDoodads.length === 1);

  // 3 oy to'lgach qaytadi, narx ×1,12
  const r3 = completeMonth(s); // month 4
  const expected = Math.round(card.cost * 1.12);
  check("3 oydan keyin qaytdi", r3.deferred.length === 1 && r3.deferred[0].cardId === card.id, r3.deferred);
  check("narx ×1,12 yechildi", p.cash === 1_000_000 - expected, { cash: p.cash, expected });
  check("ro'yxat tozalandi", p.deferredDoodads.length === 0);
  check("qaytish log'ga yozildi", s.log.some((l) => l.text.includes("qaytdi")), s.log[0]?.text);

  // limit: jami 2 kechiktirish
  const card2 = DOODAD_CARDS[1] ?? card;
  check("2-kechiktirish true", deferDoodad(p, card2, s.month) === true);
  check("deferCount = 2", p.deferCount === MAX_DOODAD_DEFERS);
  check("3-kechiktirish rad etiladi (limit)", deferDoodad(p, card, s.month) === false);
}

/* ---------- A7. Lifestyle inflation + erkinlik ×1,2 ---------- */
{
  const p = testPlayer(); // maosh 10 mln, xarajat 1 mln
  applySalaryRaise(p, 12_000_000); // +20%
  check("maosh 12 mln", p.salary === 12_000_000);
  // xarajatlar ×(1 + 0,4×0,2) = ×1,08
  check(
    "xarajatlar ×1,08 (lifestyle inflation)",
    Math.abs(totalExpenses(p) - 1_080_000) <= 4,
    totalExpenses(p)
  );
  // maosh kamayishi xarajatlarni o'zgartirmaydi
  const expBefore = totalExpenses(p);
  applySalaryRaise(p, 11_000_000);
  check("maosh kamayishida xarajat o'zgarmaydi", totalExpenses(p) === expBefore);

  // erkinlik: passiv ≥ 1,2 × xarajatlar
  const q = testPlayer(); // xarajat 1 mln
  q.escapeStreak = 5;
  q.assets.push(
    { id: "e1", title: "E1", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 600_000 },
    { id: "e2", title: "E2", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 590_000 }
  ); // passiv 1,19 mln < 1,2 mln
  check("passiv 1,19× → Bosqich 3 emas", freedomStage(q) !== 3, freedomStage(q));
  q.assets[1].monthlyCashflow = 600_000; // passiv 1,2 mln = 1,2 × 1 mln
  check("passiv 1,2× → Bosqich 3", freedomStage(q) === 3, freedomStage(q));
}

/* ================= STAGE B ================= */

/* ---------- B1. Kvadrant progressiyasi E→S→B→I ---------- */
{
  const p = testPlayer(); // E, bilim 1
  p.assets.push(
    { id: "b1", title: "B1", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 100_000 },
    { id: "b2", title: "B2", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 100_000 },
    { id: "b3", title: "B3", kind: "realestate", icon: "Home", price: 1, paid: 1, monthlyCashflow: 100_000 }
  );
  p.hasManager = true;
  p.portfolio.push({ securityId: "dqg", qty: 2_000, avgBuyPrice: 100_000 }); // 200 mln
  check(
    "E → B/I sakrab bo'lmaydi (bilim < 2)",
    maybeAdvanceQuadrant(p) === null && p.quadrant === "E"
  );

  gainKnowledge(p, 1); // bilim 2
  const adv1 = maybeAdvanceQuadrant(p);
  check(
    "E→S: biznes aktiv + bilim ≥ 2 (+1 bilim)",
    adv1 === "S" && p.quadrant === "S" && p.knowledge === QUADRANT_S_MIN_KNOWLEDGE + 1,
    p.knowledge
  );

  const adv2 = maybeAdvanceQuadrant(p);
  check("S→B: 2+ aktiv + menejer (+1 bilim)", adv2 === "B" && p.quadrant === "B" && p.knowledge === 4);

  const adv3 = maybeAdvanceQuadrant(p);
  check("B→I: portfel ≥ 100 mln", adv3 === "I" && p.quadrant === "I");

  // S→B menejersiz ishlamaydi
  const q = testPlayer();
  q.quadrant = "S";
  q.assets.push(
    { id: "q1", title: "Q1", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 1 },
    { id: "q2", title: "Q2", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 1 }
  );
  check("S→B menejersiz — o'tmaydi", maybeAdvanceQuadrant(q) === null && q.quadrant === "S");
  q.hasManager = true;
  check("S→B menejer bilan", maybeAdvanceQuadrant(q) === "B");

  // B→I portfelsiz ishlamaydi
  const r = testPlayer();
  r.quadrant = "B";
  check("B→I portfelsiz — o'tmaydi", maybeAdvanceQuadrant(r) === null && r.quadrant === "B");
}

/* ---------- B2. Mijozlar tizimi ---------- */
{
  const p = testPlayer(); // xarajat 1 mln
  p.quadrant = "S";
  p.cash = 1_000_000_000;
  const deal = SMALL_DEALS.find((d) => d.id === "choyxona")!;
  const cf = deal.cashflow;
  buyDeal(p, deal, false);
  const n = p.clients.length;
  check("biznes sotib olish 1–3 mijoz qo'shadi", n >= 1 && n <= 3, n);
  check(
    "mijoz to'lovlari oqimning 8–15%-i",
    p.clients.every((c) => c.monthlyFee >= Math.round(cf * 0.08) && c.monthlyFee <= Math.round(cf * 0.15)),
    p.clients.map((c) => c.monthlyFee)
  );

  // menejersiz faol mijozlar ≤ 3
  for (let i = p.clients.length; i < 5; i++)
    p.clients.push({ id: `x${i}`, name: `X${i}`, monthlyFee: 100_000 * (i + 1), loyalty: 3 });
  check("menejersiz faol mijozlar ≤ 3", effectiveClients(p).length === CLIENT_CAP_NO_MANAGER);
  const top3 = [...p.clients].sort((a, b) => b.monthlyFee - a.monthlyFee).slice(0, CLIENT_CAP_NO_MANAGER);
  const expectedClientIncome = top3.reduce((s, c) => s + c.monthlyFee, 0);
  check("clientIncome faqat faol mijozlar", clientIncome(p) === expectedClientIncome, clientIncome(p));
  const assetsSum = p.assets.reduce((s, a) => s + a.monthlyCashflow, 0);
  check(
    "clientIncome passiveIncome'ga kiradi",
    passiveIncome(p) === assetsSum + expectedClientIncome,
    passiveIncome(p)
  );

  // menejer: narx 2× xarajatlar, cheklov olinadi
  const cost = managerCost(p);
  check("menejer narxi 2× xarajatlar", cost === 2 * totalExpenses(p), cost);
  const cashBefore = p.cash;
  check("menejer yollandi", hireManager(p) && p.hasManager && p.cash === cashBefore - cost);
  check("menejer bilan cheklov yo'q", effectiveClients(p).length === p.clients.length);
  check("qayta yollab bo'lmaydi", !hireManager(p));

  // mijoz ketishi: menejersiz eng past sadoqatli ketadi
  const r = testPlayer();
  r.clients.push(
    { id: "lo", name: "Past", monthlyFee: 1, loyalty: 2 },
    { id: "hi", name: "Yuqori", monthlyFee: 1, loyalty: 5 }
  );
  const left = clientLeave(r, () => 0.5);
  check(
    "eng past sadoqatli mijoz ketadi",
    left?.id === "lo" && r.clients.length === 1 && r.clients[0].id === "hi"
  );

  // menejer bilan 50% ushlab qolish (deterministik rand)
  const m = testPlayer();
  m.hasManager = true;
  m.clients.push({ id: "lo", name: "Past", monthlyFee: 1, loyalty: 2 });
  check("menejer mijozni ushlab qoldi (rand<0,5)", clientLeave(m, () => 0.1) === null && m.clients.length === 1);
  check(
    "menejer ushlab qola olmadi (rand≥0,5)",
    clientLeave(m, () => 0.9)?.id === "lo" && m.clients.length === 0
  );
}

/* ---------- B3. Bilim darajasi ---------- */
{
  const p = testPlayer();
  gainKnowledge(p, 10);
  check(`bilim ${KNOWLEDGE_MAX} dan oshmaydi`, p.knowledge === KNOWLEDGE_MAX, p.knowledge);

  const lockedDeal = BIG_DEALS.find((d) => d.minKnowledge !== undefined)!;
  const q = testPlayer(); // bilim 1
  check("minKnowledge'dan past — bitim bloklangan", dealKnowledgeLocked(q, lockedDeal));
  q.knowledge = lockedDeal.minKnowledge!;
  check("talabga yetdi — bitim ochiq", !dealKnowledgeLocked(q, lockedDeal));
  check("minKnowledge'siz bitim doim ochiq", !dealKnowledgeLocked(q, SMALL_DEALS[0]));

  const r = testPlayer(); // bilim 1
  check("yangi aktiv turi +1 bilim", knowledgeFromDeal(r, "business") && r.knowledge === 2);
  check("bir turdan ikki marta berilmaydi", !knowledgeFromDeal(r, "business") && r.knowledge === 2);
  check("boshqa tur yana +1", knowledgeFromDeal(r, "realestate") && r.knowledge === 3);
}

/* ---------- B5. Maosh indeksatsiyasi ---------- */
{
  const p = testPlayer(); // maosh 10 mln, xarajat 1 mln
  const s = makeGame([p]);
  let indexed: ReturnType<typeof completeMonth>["indexed"] = [];
  for (let i = 0; i < 11; i++) indexed = completeMonth(s).indexed; // oy 2..12
  check("12-oyda indeksatsiya", indexed.length === 1, s.month);
  check("maosh +6%", p.salary === Math.round(10_000_000 * (1 + SALARY_INDEX_PCT)), p.salary);
  // xarajatlar ×(1 + 0,4×0,06) = ×1,024
  check(
    "xarajatlar ham o'sdi (lifestyle inflation)",
    Math.abs(totalExpenses(p) - 1_024_000) <= 4,
    totalExpenses(p)
  );
  check(
    "indexed bayrog'i to'g'ri",
    indexed[0].oldSalary === 10_000_000 && indexed[0].newSalary === p.salary
  );

  // B kvadrant indeksatsiya qilinmaydi
  const b = testPlayer();
  b.quadrant = "B";
  const s2 = makeGame([b]);
  let idx2: typeof indexed = [];
  for (let i = 0; i < 11; i++) idx2 = completeMonth(s2).indexed;
  check("B kvadrant indeksatsiyasiz", idx2.length === 0 && b.salary === 10_000_000);
}

/* ---------- B6. Zaxira yo'li bilan escape ---------- */
{
  const p = testPlayer(); // xarajat 1 mln
  p.assets.push(
    { id: "z1", title: "Z1", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 600_000 },
    { id: "z2", title: "Z2", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 600_000 }
  ); // passiv 1,2 mln = 1,2 × 1 mln
  p.escapeStreak = 0;
  p.cash = 3_000_000; // ≥ 3× oylik xarajat
  check("zaxira yo'li: streaksiz Bosqich 3", freedomStage(p) === 3, freedomStage(p));

  p.cash = 2_999_999;
  check("zaxira < 3× va streak yo'q → Bosqich 3 emas", freedomStage(p) !== 3, freedomStage(p));

  p.cash = 0;
  p.escapeStreak = 2;
  check("streak yo'li hali ham ishlaydi", freedomStage(p) === 3, freedomStage(p));
}

/* ================= STAGE C ================= */

/* ---------- C3. Orzu upkeep + 3 oy ushlab turish g'alabasi ---------- */
{
  const hovli = DREAMS.find((d) => d.id === "hovli")!;
  const hotel = DREAMS.find((d) => d.id === "hotel")!;
  const school = DREAMS.find((d) => d.id === "school")!;
  const yacht = DREAMS.find((d) => d.id === "yacht")!;

  check("hovli upkeep 2 mln/oy", hovli.upkeep === 2_000_000 && dreamMonthlyNet(hovli) === 2_000_000);
  check("mehmonxona sof +5 mln/oy (orzu + biznes)", dreamMonthlyNet(hotel) === -5_000_000, dreamMonthlyNet(hotel));
  check("yaxta upkeep 0 (bir martalik)", yacht.upkeep === 0 && dreamMonthlyNet(yacht) === 0);
  check("maktab upkeep 3 mln + reyting bonusi", school.upkeep === 3_000_000 && school.creditPerMonth === 10);

  // sotib olish: darhol g'alaba emas, flag qo'yiladi
  const p = testPlayer();
  p.dreamId = "hovli";
  p.cash = 500_000_000;
  check("orzu sotib olindi", buyDream(p, hovli) === true);
  check("naqd yechildi", p.cash === 500_000_000 - hovli.price, p.cash);
  check("dreamBought flag", p.dreamBought === true && p.dreamHeldMonths === 0);
  check("darhol g'alaba emas", !dreamHoldWin(p));

  // FT oy kunida upkeep yechiladi
  p.escaped = true;
  const cfAmount = applyFTPayday(structuredClone(p)); // probe — kutiladigan miqdor
  const before = p.cash;
  applyFTPayday(p);
  check(
    "FT oy kunida hovli upkeep (−2 mln) yechiladi",
    p.cash === before + cfAmount - 2_000_000,
    { cash: p.cash, expected: before + cfAmount - 2_000_000 }
  );

  // mehmonxona: sof +5 mln qo'shiladi
  const h = testPlayer();
  h.escaped = true;
  h.dreamId = "hotel";
  h.cash = 2_100_000_000;
  buyDream(h, hotel);
  const hAmount = applyFTPayday(structuredClone(h));
  const hBefore = h.cash;
  applyFTPayday(h);
  check(
    "mehmonxona FT oy kunida sof +5 mln beradi",
    h.cash === hBefore + hAmount + 5_000_000,
    { cash: h.cash, expected: hBefore + hAmount + 5_000_000 }
  );

  // maktab: har oy +10 reyting (850 cap adjustCreditScore'da)
  const sc = testPlayer();
  sc.escaped = true;
  sc.dreamId = "school";
  sc.cash = 900_000_000;
  sc.creditScore = 800;
  buyDream(sc, school);
  applyFTPayday(sc);
  check("maktab: +10 kredit reytingi/oy", sc.creditScore === 810, sc.creditScore);

  // 3 oy ushlab turish → g'alaba; manfiy naqd — pauza
  const w = testPlayer();
  w.escaped = true;
  w.cash = 500_000_000;
  buyDream(w, hovli);
  tickTurn(w);
  check("1/3 ushlab turildi", w.dreamHeldMonths === 1 && !dreamHoldWin(w));
  w.cash = -100; // manfiy — pauza (orzu yo'qolmaydi)
  tickTurn(w);
  check("manfiy naqd: hisoblagich pauza, orzu saqlanadi", w.dreamHeldMonths === 1 && w.dreamBought);
  w.cash = 10_000_000;
  tickTurn(w);
  check("2/3", w.dreamHeldMonths === 2 && !dreamHoldWin(w));
  tickTurn(w);
  check("3/3 → g'alaba", w.dreamHeldMonths === DREAM_HOLD_MONTHS && dreamHoldWin(w));

  // escape qilmagan o'yinchi uchun hisoblagich ishlamaydi
  const rr = testPlayer();
  rr.cash = 500_000_000;
  buyDream(rr, hovli); // nazariy holat
  tickTurn(rr);
  check("escape qilinmagan bo'lsa hisoblagich oshmаydi", rr.dreamHeldMonths === 0);
}

/* ---------- C4. Yangi real hodisalar (6 ta) ---------- */
{
  const byId = (id: string) => EVENT_CARDS.find((c) => c.id === id)!;
  const applyChoice = (p: Player, card: EventCard, idx: 0 | 1) => {
    const ch = card.choices![idx];
    const r1 = applyEvent(p, { ...card, effect: ch.effect });
    const r2 = ch.effect2 ? applyEvent(p, { ...card, effect: ch.effect2! }) : null;
    return { r1, r2 };
  };

  // 1) Farzand maktabi — farzandli o'yinchi, kurs tanlovi +1 bilim
  const p1 = testPlayer();
  p1.children = 1;
  p1.cash = 10_000_000;
  const farzand = byId("farzand-maktabi");
  check("farzand-maktabi: farzandliga ochiq", eligibleEvents(p1, []).some((c) => c.id === "farzand-maktabi"));
  const noChild = testPlayer();
  check("farzand-maktabi: farzandsiz yopiq", !eligibleEvents(noChild, []).some((c) => c.id === "farzand-maktabi"));
  const knBefore = p1.knowledge;
  const ch1 = applyChoice(p1, farzand, 1); // xususiy kurs
  check("kurs: −2 mln", p1.cash === 8_000_000, p1.cash);
  check("kurs: +1 bilim (farzandi bilan birga o'rgandi)", p1.knowledge === knBefore + 1, ch1);
  const p1b = testPlayer();
  p1b.children = 2;
  p1b.cash = 10_000_000;
  applyChoice(p1b, farzand, 0);
  check("oddiy: −1,2 mln", p1b.cash === 8_800_000, p1b.cash);

  // 2) Qarindosh to'yi bosimi — E/S, rad etish 0 so'm
  const p2 = testPlayer();
  p2.quadrant = "S";
  p2.cash = 5_000_000;
  const toy = byId("toy-bosimi");
  check("to'y bosimi: S kvadrantga ochiq", eligibleEvents(p2, []).some((c) => c.id === "toy-bosimi"));
  p2.quadrant = "B";
  check("to'y bosimi: B kvadrantga yopiq", !eligibleEvents(p2, []).some((c) => c.id === "toy-bosimi"));
  applyChoice(p2, toy, 1); // rad etish
  check("rad etish: 0 so'm", p2.cash === 5_000_000, p2.cash);
  applyChoice(p2, toy, 0);
  check("borish: −1,5 mln", p2.cash === 3_500_000, p2.cash);

  // 3) So'm kursi tebranishi — import −10%, eksport/texnologiya +10% (6 oy)
  const p3 = testPlayer();
  p3.assets.push(
    { id: "imp", title: "Import do'kon", kind: "business", icon: "Store", price: 1, paid: 1, monthlyCashflow: 1_000_000, tag: "savdo" },
    { id: "exp", title: "Onlayn xizmat", kind: "business", icon: "Send", price: 1, paid: 1, monthlyCashflow: 1_000_000, tag: "onlayn" }
  );
  const r3 = applyEvent(p3, byId("som-kursi"));
  const impMod = p3.assetModifiers.find((m) => m.assetId === "imp");
  const expMod = p3.assetModifiers.find((m) => m.assetId === "exp");
  check("fx: import −10% (6 oy)", !!impMod && impMod.multiplier === 0.9 && impMod.monthsRemaining === 6, p3.assetModifiers);
  check("fx: eksport +10% (6 oy)", !!expMod && expMod.multiplier === 1.1 && expMod.monthsRemaining === 6);
  check("fx: natija matni qaytdi", r3.includes("import") && r3.includes("eksport"), r3);
  const p3b = testPlayer();
  check("fx: aktivsiz no-op", applyEvent(p3b, byId("som-kursi")).includes("ta'sir qilmadi"));

  // 4) Soliq tekshiruvi — B kvadrant, aktivlar qiymatining 2%-i (min 1 mln)
  const p4 = testPlayer();
  p4.quadrant = "B";
  p4.cash = 100_000_000;
  p4.assets.push({ id: "b1", title: "B1", kind: "business", icon: "Store", price: 1_000_000_000, paid: 1, monthlyCashflow: 1 });
  check("soliq: faqat B kvadrant", eligibleEvents(p4, []).some((c) => c.id === "soliq-tekshiruvi"));
  const p4e = testPlayer();
  check("soliq: E kvadrantga yopiq", !eligibleEvents(p4e, []).some((c) => c.id === "soliq-tekshiruvi"));
  applyEvent(p4, byId("soliq-tekshiruvi"));
  check("soliq: −2% bozor qiymati (20 mln)", p4.cash === 80_000_000, p4.cash);
  const p4b = testPlayer();
  p4b.quadrant = "B";
  p4b.cash = 10_000_000;
  p4b.assets.push({ id: "b2", title: "B2", kind: "business", icon: "Store", price: 10_000_000, paid: 1, monthlyCashflow: 1 });
  applyEvent(p4b, byId("soliq-tekshiruvi"));
  check("soliq: minimal 1 mln", p4b.cash === 9_000_000, p4b.cash);

  // 5) Kredit refinansiya — reyting ≥ 700 + qarz bor; to'lov kamayadi
  const p5 = testPlayer();
  p5.creditScore = 720;
  p5.loans.push(createLoan("rf1", "Ipoteka", 100_000_000, 0.018, 120));
  check("refinansiya: reyting ≥ 700 + qarz", eligibleEvents(p5, []).some((c) => c.id === "kredit-refinansiya"));
  const p5low = testPlayer();
  p5low.creditScore = 650;
  p5low.loans.push(createLoan("rf2", "Ipoteka", 1_000_000, 0.018, 12));
  check("refinansiya: reyting < 700 yopiq", !eligibleEvents(p5low, []).some((c) => c.id === "kredit-refinansiya"));
  const p5no = testPlayer();
  p5no.creditScore = 800;
  check("refinansiya: qarzsiz yopiq", !eligibleEvents(p5no, []).some((c) => c.id === "kredit-refinansiya"));
  const before5 = p5.loans[0].monthlyPayment;
  const monthsBefore = p5.loans[0].remainingMonths;
  applyChoice(p5, byId("kredit-refinansiya"), 0);
  check("refinansiya: oylik to'lov kamaydi", p5.loans[0].monthlyPayment < before5, { before: before5, after: p5.loans[0].monthlyPayment });
  check("refinansiya: stavka −0,3%/oy", Math.abs(p5.loans[0].monthlyRate - 0.015) < 1e-9, p5.loans[0].monthlyRate);
  check("refinansiya: muddat saqlandi", p5.loans[0].remainingMonths === monthsBefore);
  const p5d = testPlayer();
  p5d.creditScore = 750;
  p5d.loans.push(createLoan("rf3", "K", 10_000_000, 0.02, 24));
  const beforeD = p5d.loans[0].monthlyPayment;
  applyChoice(p5d, byId("kredit-refinansiya"), 1); // rad etish
  check("refinansiya rad etish: o'zgarish yo'q", p5d.loans[0].monthlyPayment === beforeD);

  // 6) Mahalla yordami — naqd < 0 bo'lganda +3 mln
  const p6 = testPlayer();
  p6.cash = -2_000_000;
  check("mahalla: naqd manfiy bo'lsa ochiq", eligibleEvents(p6, []).some((c) => c.id === "mahalla-yordami"));
  const p6pos = testPlayer();
  p6pos.cash = 100;
  check("mahalla: naqd musbat bo'lsa yopiq", !eligibleEvents(p6pos, []).some((c) => c.id === "mahalla-yordami"));
  applyEvent(p6, byId("mahalla-yordami"));
  check("mahalla: +3 mln yordam", p6.cash === 1_000_000, p6.cash);

  // barcha 6 hodisa lessonText'ga ega (yoki tanlovlar lessonText'ga)
  for (const id of ["farzand-maktabi", "toy-bosimi", "som-kursi", "soliq-tekshiruvi", "kredit-refinansiya", "mahalla-yordami"]) {
    const c = byId(id);
    const ok = c.choices ? c.choices.every((ch) => !!ch.lessonText) : !!c.lessonText;
    check(`lessonText: ${id}`, ok);
  }
}

/* ---------- C1. Saqlanma kaliti migratsiyasi (cfuz-save-v1 → oqim-save-v1) ---------- */
{
  // localStorage stub (node muhiti)
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = mock as unknown as Storage;

  const p = testPlayer();
  const s = makeGame([p]);

  // faqat eski kalitda saqlanma bor → yangi kalitga ko'chadi
  store.set(OLD_SAVE_KEY, JSON.stringify(s));
  const loaded = loadSave();
  check("eski kalitdan o'qildi", loaded !== null);
  check("yangi kalitga ko'chirildi", store.has(SAVE_KEY), [...store.keys()]);
  check("eski kalit fallback sifatida qoladi", store.has(OLD_SAVE_KEY));
  check("Stage C maydonlari to'ldirildi", loaded !== null && loaded.winPath === null && loaded.players[0].dreamBought === false);

  // yangi kalit ustuvor — eski kalit e'tiborga olinmaydi
  store.clear();
  const sNew = makeGame([p]);
  sNew.month = 7;
  const sOld = makeGame([p]);
  sOld.month = 3;
  saveGame(sNew); // SAVE_KEY ga yozadi
  store.set(OLD_SAVE_KEY, JSON.stringify(sOld));
  const loaded2 = loadSave();
  check("yangi kalit ustuvor", loaded2 !== null && loaded2.month === 7, loaded2?.month);

  // clearSave faqat yangi kalitni o'chiradi — eski fallback yana o'qiladi
  clearSave();
  check("clearSave: yangi kalit o'chdi", !store.has(SAVE_KEY));
  const loaded3 = loadSave();
  check("clearSave'dan keyin eski kalit bir marta fallback", loaded3 !== null && loaded3.month === 3, loaded3?.month);

  delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
