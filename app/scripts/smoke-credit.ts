/**
 * OQIM (avvalgi Cashflow UZ) — fix-6 smoke: kredit reytingi, garov, penya, ishsizlik, kvadrant, doodad krediti.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-credit.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-credit.mjs && node /tmp/smoke-credit.mjs
 */
import {
  adjustCreditScore,
  annuityPayment,
  applyDoodad,
  applyDownsized,
  applyEvent,
  applyPayday,
  createLoan,
  dealLoanGate,
  doodadCreditGate,
  doodadCreditTerms,
  effectiveSalary,
  eligibleEvents,
  eligibleLifeEvents,
  emergencyLoan,
  loanOfferCap,
  loanOfferGate,
  makePlayer,
  payoffLoan,
  takeLoanOffer,
} from "../src/lib/game/engine";
import { DOODAD_CARDS, LOAN_OFFERS } from "../src/lib/game/data";
import { customLoanPayment, customToProfession } from "../src/lib/game/heroes";
import {
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  DOODAD_CREDIT_MONTHLY_RATE,
  PENYA_RATE,
  type DealCard,
  type Player,
  type Profession,
  type Quadrant,
} from "../src/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

function prof(over: Partial<Profession> = {}): Profession {
  return {
    id: "t",
    name: "Testchi",
    flavor: "",
    avatar: "",
    field: "xizmat",
    salary: 4_000_000,
    expenses: 2_000_000,
    loanPayment: 0,
    savings: 5_000_000,
    loans: [],
    ...over,
  };
}

function player(p: Profession, quadrant: Quadrant = "E", cash?: number): Player {
  const pl = makePlayer(0, "Test", p, {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
    quadrant,
  });
  if (cash !== undefined) pl.cash = cash;
  return pl;
}

/* ---------- 1. Forma: annuitet avto-hisob ---------- */
{
  const loan = { name: "Ipoteka", principal: 100_000_000, annualRatePct: 24, months: 120 };
  const expected = annuityPayment(100_000_000, 0.24 / 12, 120);
  check("forma oylik to'lov = annuityPayment", customLoanPayment(loan) === expected);
  check(
    "forma to'lov 0 agar stavka/muddat yo'q",
    customLoanPayment({ ...loan, annualRatePct: 0 }) === 0 &&
      customLoanPayment({ ...loan, months: 0 }) === 0
  );
  const p = player(
    customToProfession({
      professionName: "Dasturchi",
      salary: 10_000_000,
      expenses: { housing: 2_000_000, food: 1_000_000, transport: 500_000, education: 300_000, other: 200_000 },
      cash: 5_000_000,
      loans: [loan],
    })
  );
  check(
    "custom qarz haqiqiy annuitet kredit sifatida kiradi",
    p.loans.length === 1 &&
      p.loans[0].monthlyPayment === expected &&
      p.loans[0].remainingMonths === 120 &&
      p.loans[0].remainingBalance === 100_000_000
  );
  check("custom qarzli personaj reytingi 600 dan boshlanadi", p.creditScore === 600);
  const parts = p.expenseParts;
  check(
    "xarajat taqsimoti jamisi = kiritilgan jami (soliq 20% ichida)",
    parts.taxes + parts.housing + parts.food + parts.transport + parts.other === 4_000_000 &&
      parts.taxes === 800_000
  );
}

/* ---------- 2. Reyting dinamikasi ---------- */
{
  // o'z vaqtida to'lov: +3
  const p = player(prof(), "E", 50_000_000);
  takeLoanOffer(p, "Test", 5_000_000, 0.01, 12); // −5
  const s0 = p.creditScore;
  applyPayday(p);
  check("o'z vaqtida to'lov +3", p.creditScore === Math.min(850, s0 + 3), p.creditScore);
  // kredit yopilganda +15 (oy kunida avtomatik yopiladi; +3 o'z vaqtida to'lov ham qo'shiladi)
  const p2 = player(prof(), "E", 100_000_000);
  p2.loans.push(createLoan("x", "Qisqa", 1_000_000, 0.01, 1));
  const s1 = p2.creditScore;
  const r2 = applyPayday(p2);
  check(
    "kredit to'liq yopilganda +15 (+3 on-time)",
    p2.creditScore === s1 + 18 && p2.loans.length === 0,
    p2.creditScore
  );
  check("yopilish eslatmasi log uchun", r2.notes.some((n) => n.includes("+15")));
  // muddatidan oldin yopish +15
  const p3 = player(prof(), "E", 100_000_000);
  const l3 = takeLoanOffer(p3, "Test", 2_000_000, 0.01, 12);
  const s2 = p3.creditScore;
  payoffLoan(p3, l3.id);
  check("payoffLoan +15", p3.creditScore === s2 + 15);
  // shoshilinch qarz −20
  const p4 = player(prof(), "E", 0);
  const s3 = p4.creditScore;
  emergencyLoan(p4);
  check("shoshilinch qarz −20", p4.creditScore === s3 - 20);
  // yangi kredit −5
  const p5 = player(prof(), "E", 0);
  const s4 = p5.creditScore;
  takeLoanOffer(p5, "Test", 1_000_000, 0.01, 12);
  check("yangi kredit −5", p5.creditScore === s4 - 5);
  // clamp 300–850
  const p6 = player(prof(), "E");
  p6.creditScore = 400;
  adjustCreditScore(p6, -150);
  check("bankrotlik −150, pastki clamp 300", p6.creditScore === 300, p6.creditScore);
  adjustCreditScore(p6, 1000);
  check("yuqori clamp 850", p6.creditScore === CREDIT_SCORE_MAX);
  p6.creditScore = 310;
  adjustCreditScore(p6, -50);
  check("clamp CREDIT_SCORE_MIN", p6.creditScore === CREDIT_SCORE_MIN);
}

/* ---------- 3. Garov + reyting gate'lari ---------- */
{
  const deal = (resalePercent: number | undefined) => ({ resalePercent }) as DealCard;
  const p = player(prof());
  p.creditScore = 650;
  check("deal loan: reyting OK + garov OK → ruxsat", dealLoanGate(p, deal(80)) === null);
  check("deal loan: resale 30% → garov yaroqsiz", dealLoanGate(p, deal(30)) === "collateral");
  check("deal loan: resale yo'q → garov yaroqsiz", dealLoanGate(p, deal(undefined)) === "collateral");
  p.creditScore = 599;
  check("deal loan: reyting <600 → score", dealLoanGate(p, deal(80)) === "score");

  const consumer = LOAN_OFFERS.find((o) => o.id === "consumer")!;
  const business = LOAN_OFFERS.find((o) => o.id === "business")!;
  const rich = player(prof({ salary: 10_000_000 }));
  check("iste'mol: reyting 650 → ochiq", loanOfferGate(rich, consumer).gate === null);
  rich.creditScore = 500;
  check("iste'mol: reyting 500 < 550 → yopiq", loanOfferGate(rich, consumer).gate === "score");
  const noBiz = player(prof({ salary: 30_000_000 }));
  check("subsidiya: biznes yo'q → business gate", loanOfferGate(noBiz, business).gate === "business");
  // 6× oylik daromad limiti
  const lowIncome = player(prof({ salary: 1_000_000, expenses: 100_000 }));
  const cap = loanOfferCap(lowIncome, consumer);
  check("6× daromad limiti", cap === 6_000_000, cap);
  const g1 = loanOfferGate(lowIncome, consumer);
  check("limit ichidagi summa ochiq (5 mln ≤ 6 mln)", g1.gate === null && g1.cap === 6_000_000);
  const tiny = player(prof({ salary: 400_000, expenses: 100_000 }));
  check("limit juda past → cap gate", loanOfferGate(tiny, consumer).gate === "cap");
}

/* ---------- 4. Penya mexanikasi ---------- */
{
  // salary 3 mln, xarajat 2 mln → C = 1 mln; kredit 30 mln @1.8%/oy 36 oy → ~1.14 mln/oy
  // amount = 3 − 2 − 1.14 = −0.14 mln; yetishmovchilik 140k ≤ 20% × 1140k = 228k → penya
  const p = player(prof({ salary: 3_000_000, expenses: 2_000_000 }), "E", 0);
  const loan = takeLoanOffer(p, "Katta kredit", 30_000_000, 0.018, 36);
  p.cash = 0;
  const loanTotal = loan.monthlyPayment;
  const score0 = p.creditScore;
  const bal0 = loan.remainingBalance;
  const r1 = applyPayday(p);
  const penyaAdd = Math.round(loanTotal * PENYA_RATE);
  check("penya eslatmasi", r1.notes.some((n) => n.startsWith("⚠️ Penya hisoblandi")), r1.notes);
  check(
    "penya: qoldiq +5% to'lov",
    p.loans[0].remainingBalance === bal0 + penyaAdd,
    { bal: p.loans[0].remainingBalance, expected: bal0 + penyaAdd }
  );
  check("penya: kredit amortizatsiya qilinmadi", p.loans[0].remainingMonths === 36);
  check("penya: reyting −30", p.creditScore === score0 - 30, p.creditScore);
  check("penya: naqd manfiy emas (to'lovlar o'tkazildi)", p.cash >= 0, p.cash);
  check("penya streak = 1", p.penyaStreak === 1);
  // ikkinchi ketma-ket oy — yana penya
  p.cash = 0;
  const r2 = applyPayday(p);
  check("2-oy ham penya", r2.notes.some((n) => n.startsWith("⚠️")) && p.penyaStreak === 2);
  // uchinchi ketma-ket oy — penya yo'q, bankrotlik yo'li
  p.cash = 0;
  const r3 = applyPayday(p);
  check("3-oy penya yo'q (bankrotlik oqimi)", !r3.notes.some((n) => n.startsWith("⚠️")), r3.notes);
  check("3-oy kredit normal amortizatsiya qilindi", p.loans[0].remainingMonths === 35);
  check("3-oy naqd manfiyga ketdi", p.cash < 0, p.cash);
  // katta yetishmovchilik → darhol bankrotlik yo'li (penya yo'q)
  const big = player(prof({ salary: 1_000_000, expenses: 3_000_000 }), "E", 0);
  takeLoanOffer(big, "Kredit", 30_000_000, 0.018, 36);
  big.cash = 0;
  const rb = applyPayday(big);
  check("katta yetishmovchilikda penya qo'llanmaydi", !rb.notes.some((n) => n.startsWith("⚠️")), rb.notes);
}

/* ---------- 5. Ishdan bo'shatildi: maosh 2 oy kun 0 ---------- */
{
  const p = player(prof({ salary: 5_000_000, expenses: 1_000_000 }), "E", 100_000_000);
  applyDownsized(p);
  check("downsized → unemployedMonths 2", p.unemployedMonths === 2);
  check("ishsizlikda effectiveSalary 0", effectiveSalary(p) === 0);
  const r1 = applyPayday(p);
  check("1-oy kun: maosh kirmadi", r1.amount < 0 && p.unemployedMonths === 1, r1.amount);
  check("ishsizlikda maosh 0 qoladi", effectiveSalary(p) === 0);
  const r2 = applyPayday(p);
  check("2-oy kun: maosh kirmadi", r2.amount < 0 && p.unemployedMonths === 0, r2.amount);
  check("ish tiklandi eslatmasi", r2.notes.some((n) => n.includes("Yangi ish topdingiz")), r2.notes);
  check("3-oydan maosh tiklangan", effectiveSalary(p) === 5_000_000);
  // ishsizlikda salary-pct hayotiy hodisalar (lavozim ko'tarilishi) tushmaydi
  const p2 = player(prof(), "E");
  p2.unemployedMonths = 1;
  const pool = eligibleLifeEvents(p2);
  check(
    "ishsizlikda maosh hodisalari bloklangan",
    pool.every((c) => c.effect.type !== "salary-pct"),
    pool.map((c) => c.id)
  );
}

/* ---------- 6. Kvadrant gating ---------- */
{
  const e = player(prof(), "E");
  const s = player(prof(), "S");
  const lifeS = eligibleLifeEvents(s);
  check(
    "S hech qachon lavozim ko'tarilishi/qayta tuzilish olmaydi",
    lifeS.every((c) => c.id !== "promotion" && c.id !== "restructure")
  );
  const lifeE = eligibleLifeEvents(e);
  check("E lavozim ko'tarilishini oladi", lifeE.some((c) => c.id === "promotion"));
  const evE = eligibleEvents(e, []);
  const evS = eligibleEvents(s, []);
  check(
    "E hodisalari faqat E ga",
    evE.some((c) => c.id === "e-annual-bonus") && evS.every((c) => !c.id.startsWith("e-"))
  );
  check(
    "S hodisalari faqat S ga",
    evS.some((c) => c.id === "s-client-lost") && evE.every((c) => !c.id.startsWith("s-"))
  );
  const b = player(prof(), "B");
  const i = player(prof(), "I");
  check(
    "B hodisalari faqat B ga",
    eligibleEvents(b, []).some((c) => c.id === "b-supplier-price") &&
      eligibleEvents(i, []).every((c) => !c.id.startsWith("b-"))
  );
  check(
    "I hodisalari faqat I ga",
    eligibleEvents(i, []).some((c) => c.id === "i-volatility") &&
      eligibleEvents(e, []).every((c) => !c.id.startsWith("i-"))
  );
  // kvadrant hodisasi effekti ishlaydi (E yillik mukofot = +1 maosh)
  const bonusCard = evE.find((c) => c.id === "e-annual-bonus")!;
  const cashB = e.cash;
  const res = applyEvent(e, bonusCard);
  check("yillik mukofot +1 maosh", e.cash === cashB + effectiveSalary(e) && effectiveSalary(e) > 0, res);
}

/* ---------- 7. Doodad 3-tanlov krediti ---------- */
{
  const card = DOODAD_CARDS.find((c) => c.credit)!;
  const terms = doodadCreditTerms(card, card.cost);
  const expectedMonthly = annuityPayment(card.credit!.principal, DOODAD_CREDIT_MONTHLY_RATE, 12);
  check(
    "doodad annuitet 12 oy 2%/oy",
    terms.monthlyPayment === expectedMonthly && terms.months === 12,
    { got: terms.monthlyPayment, expected: expectedMonthly }
  );
  // kredit yo'lida: annuitet kredit yaratiladi, reyting −5
  const p = player(prof(), "E", 10_000_000);
  const s0 = p.creditScore;
  const cash0 = p.cash;
  const res = applyDoodad(p, card, "credit");
  check(
    "doodad kredit: annuitet loan + down yechiladi",
    p.loans.length === 1 &&
      p.loans[0].monthlyPayment === expectedMonthly &&
      p.cash === cash0 - card.credit!.down,
    res
  );
  check("doodad kredit: reyting −5", p.creditScore === s0 - 5);
  // reyting < 550 → kredit yo'q, naqd yo'lga tushadi
  const low = player(prof(), "E", 10_000_000);
  low.creditScore = 540;
  check("reyting <550 → doodad kredit gate", doodadCreditGate(low, card, card.cost) === "score");
  const lowCash0 = low.cash;
  applyDoodad(low, card, "credit");
  check("reyting past bo'lsa naqd to'lovga qaytadi", low.loans.length === 0 && low.cash === lowCash0 - card.cost);
  // naqd ham yetmasa, reyting ham past → majburiy kredit (eski oqim)
  const broke = player(prof(), "E", 100_000);
  broke.creditScore = 400;
  const resF = applyDoodad(broke, card, "credit");
  check("majburiy kredit saqlanadi", broke.loans.length === 1 && resF.includes("Qarzga olindi"), resF);
}

/* ---------- Xulosa ---------- */
if (failures > 0) {
  console.error(`\n${failures} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS");
