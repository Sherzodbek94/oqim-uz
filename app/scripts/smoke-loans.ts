/**
 * OQIM — Stage C smoke test: annuitet kredit tizimi + bosqichli erkinlik.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-loans.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-loans.mjs && node /tmp/smoke-loans.mjs
 */
import {
  amortizeTerms,
  annuityPayment,
  applyPayday,
  buyDeal,
  canEscape,
  createLoan,
  debtLoad,
  dealLoanPayment,
  escapeChecklist,
  freedomStage,
  makePlayer,
  passiveIncome,
  payoffLoan,
  splitExpenses,
  takeLoanOffer,
  totalExpenses,
} from "../src/lib/game/engine";
import { BIG_DEALS, LOAN_OFFERS, PROFESSIONS, SMALL_DEALS } from "../src/lib/game/data";
import { BANK_LOAN_MONTHS, LOAN_RATE_YEAR, type Player } from "../src/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}
const within = (got: number, want: number, tol = 0.02) => Math.abs(got - want) / want <= tol;

/** Toza test o'yinchisi: kasb qarzlarisiz, boshqariladigan maosh/xarajat. */
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
  p.salary = 0;
  p.expenseParts = splitExpenses(1_000_000); // 1 mln/oy bazaviy xarajat
  p.cash = 0;
  return p;
}

/* ---------- 1. Annuitet formula qiymatlari ---------- */
{
  check("annuity 1mln @1.8%/oy 36oy ≈ 38 000", within(annuityPayment(1_000_000, 0.018, 36), 38_000), annuityPayment(1_000_000, 0.018, 36));
  check("annuity 1mln @1%/oy 60oy ≈ 22 200", within(annuityPayment(1_000_000, 0.01, 60), 22_200), annuityPayment(1_000_000, 0.01, 60));
  check("annuity 1mln @2.5%/oy 24oy ≈ 55 900", within(annuityPayment(1_000_000, 0.025, 24), 55_900), annuityPayment(1_000_000, 0.025, 24));
  check("annuity r=0 → P/n", annuityPayment(1_200_000, 0, 12) === 100_000);
}

/* ---------- 2. LOAN_OFFERS annuitet orqali ---------- */
{
  const consumer = LOAN_OFFERS.find((o) => o.id === "consumer")!;
  const biz = LOAN_OFFERS.find((o) => o.id === "business")!;
  check(
    "iste'mol: 10mln ≈ 380 ming/oy",
    within(annuityPayment(10_000_000, consumer.monthlyRate, consumer.months), 380_000),
    annuityPayment(10_000_000, consumer.monthlyRate, consumer.months)
  );
  check(
    "subsidiya: 50mln ≈ 1,11 mln/oy",
    within(annuityPayment(50_000_000, biz.monthlyRate, biz.months), 1_112_000),
    annuityPayment(50_000_000, biz.monthlyRate, biz.months)
  );
  check("subsidiya requiresBusiness saqlangan", biz.requiresBusiness === true);
}

/* ---------- 3. To'liq amortizatsiya: kredit aynan N oy kunida yopiladi ---------- */
{
  const p = testPlayer();
  p.cash = 100_000_000; // to'lov qoplanishi kafolatli
  const loan = takeLoanOffer(p, "Test krediti", 1_000_000, 0.018, 36);
  check("loan fields backfilled", loan.remainingMonths === 36 && loan.remainingBalance === 1_000_000 && loan.totalMonths === 36);

  // mustaqil jadval bilan solishtirish
  let expectedBalance = 1_000_000;
  let paidPrincipal = 0;
  for (let m = 1; m <= 35; m++) {
    applyPayday(p);
    const interest = Math.round(expectedBalance * 0.018);
    const principalPart = loan.monthlyPayment - interest;
    expectedBalance -= principalPart;
    paidPrincipal += principalPart;
    check(
      `month ${m}: balance matches schedule`,
      p.loans.length === 1 && Math.abs(p.loans[0].remainingBalance - expectedBalance) <= 1,
      { got: p.loans[0]?.remainingBalance, expectedBalance }
    );
    if (m === 35) check("35 paydays: loan still open", p.loans.length === 1 && p.loans[0].remainingMonths === 1);
  }
  const res = applyPayday(p);
  check("36th payday: loan auto-closed", p.loans.length === 0);
  check(
    "closure celebration note",
    res.notes.some((n) => n.includes("KREDIT TO'LIQ YOPILDI") && n.includes("Test krediti")),
    res.notes
  );
  check("principal fully amortized", Math.abs(paidPrincipal + Math.min(loan.monthlyPayment - Math.round(expectedBalance * 0.018), expectedBalance) - 1_000_000) <= 2);
}

/* ---------- 4. Foiz/asosiy qism yig'indisi to'lovga teng ---------- */
{
  const p = testPlayer();
  p.cash = 50_000_000;
  takeLoanOffer(p, "Split", 10_000_000, 0.025, 24);
  const l = p.loans[0];
  let ok = true;
  let totalPrincipal = 0;
  let months = 0;
  while (p.loans.length > 0 && ok && months < 30) {
    const balBefore = l.remainingBalance;
    const interest = Math.round(balBefore * l.monthlyRate);
    applyPayday(p);
    const principalPart = balBefore - (p.loans[0]?.remainingBalance ?? 0);
    totalPrincipal += principalPart;
    months++;
    // har oyda: interest + principalPart === monthlyPayment (oxirgi oy kichikroq)
    if (principalPart < balBefore && interest + principalPart !== l.monthlyPayment) ok = false;
  }
  check("interest+principal split sums to payment each month", ok);
  check("loan closed in exactly 24 months", months === 24, months);
  check("principal parts sum to original principal", totalPrincipal === 10_000_000, totalPrincipal);
}

/* ---------- 5. Muddatidan oldin yopish = remainingBalance ---------- */
{
  const p = testPlayer();
  p.cash = 50_000_000;
  const loan = takeLoanOffer(p, "Early", 5_000_000, 0.03, 24);
  for (let i = 0; i < 6; i++) applyPayday(p);
  const balance = p.loans[0].remainingBalance;
  check("balance amortized below principal", balance < 5_000_000 && balance > 0, balance);
  p.cash = 20_000_000;
  const before = p.cash;
  check("payoffLoan succeeds", payoffLoan(p, loan.id) === true);
  check("payoff charged remainingBalance", before - p.cash === balance, { before, after: p.cash, balance });
  check("loan removed after payoff", p.loans.length === 0);
}

/* ---------- 6. escapeStreak: ko'tariladi, reset bo'ladi, escape'ni gate qiladi ---------- */
{
  const p = testPlayer(); // xarajat 1 mln
  p.assets.push(
    { id: "a1", title: "A1", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 600_000 },
    { id: "a2", title: "A2", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 600_000 }
  ); // passiv 1,2 mln ≥ 1 mln
  applyPayday(p);
  check("streak 1 after first covered payday", p.escapeStreak === 1, p.escapeStreak);
  applyPayday(p);
  check("streak 2 after second covered payday", p.escapeStreak === 2);
  check("canEscape at streak 2 (2 assets, no debt)", canEscape(p) === true);
  // passiv tushib qolsa — reset
  p.assets[1].monthlyCashflow = 100_000; // passiv 0,7 mln < 1 mln
  applyPayday(p);
  check("streak resets to 0 on uncovered payday", p.escapeStreak === 0);
  check("canEscape false after reset", canEscape(p) === false);
}

/* ---------- 7. freedomStage o'tishlari ---------- */
{
  const p = testPlayer(); // passiv 0, xarajat 1 mln, naqd 0
  check("stage 0: nothing", freedomStage(p) === 0);
  p.cash = 3_000_000; // 3× xarajat
  check("stage 1: cash ≥ 3× expenses", freedomStage(p) === 1);
  p.assets.push(
    { id: "b1", title: "B1", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 600_000 },
    { id: "b2", title: "B2", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 600_000 }
  ); // passiv 1,2 mln ≥ xarajat
  // Stage B (B6): zaxira yo'li o'chiq bo'lsa (naqd 3× + passiv 1,2×) darhol Bosqich 3 bo'lardi —
  // Bosqich 2 ni toza tekshirish uchun zaxirani chegaradan pastga tushiramiz
  p.cash = 2_999_999;
  check("stage 2: passive ≥ expenses", freedomStage(p) === 2);
  p.escapeStreak = 2;
  check("stage 3: streak 2 + 2 assets + debt ≤ 50%", freedomStage(p) === 3);
  check("canEscape at stage 3", canEscape(p) === true);
  p.escaped = true;
  check("escaped player can't re-escape", canEscape(p) === false);
  p.escaped = false;
  p.bankrupt = true;
  check("bankrupt player can't escape", canEscape(p) === false);
}

/* ---------- 8. Qarz yuki va aktivlar gate'lari ---------- */
{
  const p = testPlayer();
  p.assets.push(
    { id: "c1", title: "C1", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 1_500_000 },
    { id: "c2", title: "C2", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 1_500_000 }
  ); // passiv 3 mln, xarajat 1 mln → mustaqillik
  // katta kredit: 2 mln/oy to'lov → passiv(3) ≥ xarajat(1+2=3) ✓, lekin yuk = 2/3 ≈ 67%
  p.loans.push({
    id: "big", name: "Katta qarz", principal: 30_000_000, monthlyPayment: 2_000_000,
    monthlyRate: 0.01, remainingMonths: 24, remainingBalance: 30_000_000, totalMonths: 24,
  });
  p.escapeStreak = 5;
  check("debtLoad ≈ 67%", Math.round(debtLoad(p) * 100) === 67, debtLoad(p));
  check("debt load > 50% blocks stage 3", freedomStage(p) === 2, freedomStage(p));
  check("debt load blocks escape", canEscape(p) === false);
  const chk = escapeChecklist(p);
  check("checklist: streak ok, assets ok, debt NOT ok", chk.streakOk && chk.assetsOk && !chk.debtOk && chk.debtLoadPct === 67);
  p.cash = 100_000_000;
  payoffLoan(p, "big");
  check("after payoff: escape unlocked", canEscape(p) === true);

  // faqat 1 aktiv — bloklaydi
  const q = testPlayer();
  q.assets.push({ id: "solo", title: "Yagona", kind: "business", icon: "Store", price: 10e6, paid: 10e6, monthlyCashflow: 5_000_000 });
  q.escapeStreak = 9;
  check("single asset blocks stage 3", freedomStage(q) === 2 && !canEscape(q));
  check("checklist assets 1/2", escapeChecklist(q).assets === 1 && !escapeChecklist(q).assetsOk);
}

/* ---------- 9. Bank qarzi (deal down-payment shortfall) — annuitet 30%/yil, 24 oy ---------- */
{
  const p = testPlayer();
  const deal = BIG_DEALS.find((d) => d.id === "sewing")!; // down 100 mln, ipotekasiz
  p.cash = 40_000_000; // shortfall 60 mln
  const res = buyDeal(p, deal, true);
  const expected = annuityPayment(60_000_000, LOAN_RATE_YEAR / 12, BANK_LOAN_MONTHS);
  check("bank loan created for shortfall", !!res.bankLoan && res.bankLoan.principal === 60_000_000);
  check(
    "bank loan is annuity 30%/yil 24oy",
    !!res.bankLoan &&
      res.bankLoan.monthlyPayment === expected &&
      res.bankLoan.remainingMonths === BANK_LOAN_MONTHS &&
      res.bankLoan.name.includes("24 oy"),
    res.bankLoan
  );
  check("bank loan closes after 24 paydays", (() => {
    for (let i = 0; i < BANK_LOAN_MONTHS; i++) applyPayday(p);
    return !p.loans.some((l) => l.id === res.bankLoan!.id);
  })());
}

/* ---------- 10. Ipotekali bitimlar: musbat sof oqim saqlangan ---------- */
{
  const withLoan = SMALL_DEALS.concat(BIG_DEALS).filter((d) => d.loan);
  check("at least one mortgage deal exists", withLoan.length >= 1);
  for (const d of withLoan) {
    const net = (d.grossIncome ?? d.cashflow) - dealLoanPayment(d);
    check(`deal ${d.id}: net cashflow positive`, net > 0, { net, pmt: dealLoanPayment(d) });
    check(`deal ${d.id}: principal = price − down`, d.loan!.principal === d.price - d.down);
  }
  const apt = withLoan.find((d) => d.id === "apt")!;
  const aptNet = apt.grossIncome! - dealLoanPayment(apt);
  check(
    "apt: net ≈ +2,1 mln/oy (1,5–3 mln oralig'i)",
    aptNet >= 1_500_000 && aptNet <= 3_000_000,
    aptNet
  );
  check("apt: mortgage 22%/yil, 180 oy", apt.loan!.months === 180 && within(apt.loan!.monthlyRate, 0.22 / 12, 0.001));
  check("apt: PMT ≈ 8,39 mln", within(dealLoanPayment(apt), 8_385_000), dealLoanPayment(apt));
}

/* ---------- 11. amortizeTerms: meros qarzlar ---------- */
{
  const t = amortizeTerms(4_000_000, 300_000); // o'qituvchi iste'mol krediti
  check("legacy loan keeps payment", t.monthlyPayment === 300_000);
  check("legacy loan gets sane term (10..24 oy)", t.remainingMonths >= 10 && t.remainingMonths <= 24, t.remainingMonths);
  check("legacy loan balance = principal", t.remainingBalance === 4_000_000);
  const doomed = amortizeTerms(1_000_000, 10_000); // to'lov foizni qoplamaydi
  check("non-amortizing payment re-priced to 60oy annuity", doomed.remainingMonths === 60 && doomed.monthlyPayment > 10_000);
  const fixed = amortizeTerms(4_200_000, 350_000, 12); // doodad: foizsiz bo'lib to'lash kabi
  check("doodad 12-month plan stays 12 months", fixed.remainingMonths === 12 && fixed.monthlyPayment === 350_000);
}

/* ---------- 12. Kasb boshlang'ich qarzlari amortizatsiya shartlari bilan ---------- */
{
  const p = makePlayer(1, "O'qituvchi", PROFESSIONS[0], {
    isBot: false, personality: null, colorIndex: 0, dreamId: "d1",
  });
  const l = p.loans[0];
  check(
    "profession loan has annuity terms",
    l.remainingMonths > 0 && l.totalMonths === l.remainingMonths && l.remainingBalance === l.principal && l.monthlyPayment === 500_000,
    l
  );
  check("escapeStreak starts at 0", p.escapeStreak === 0);
  check("createLoan computes annuity payment", createLoan("t", "T", 1_000_000, 0.025, 24).monthlyPayment === annuityPayment(1_000_000, 0.025, 24));
  // passiv daromad hali ham to'g'ri hisoblanadi
  check("passive income helper intact", passiveIncome(p) === 0 && totalExpenses(p) > 0);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
