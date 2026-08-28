/**
 * OQIM — fix-12 smoke test:
 *  P1 avans = 30% × max(0, maosh − oylik kredit to'lovlari); avans + payday = maosh (saqlanish),
 *     shu jumladan kreditlar maoshdan katta bo'lgan holat (avans 0);
 *  P2 to'lovlar auditi: closeLoanEarly/makePartialPayment naqd deltalari aynan remainingBalance
 *     ga teng, qo'shaloq yechilish yo'q, manfiy drift yo'q (foydalanuvchi ssenariysi:
 *     51 mln naqd, avtokredit 90 mln @23%/3oy + mikroqarz);
 *  P4 mijozga ish taklifi: narx fee×20%, 70% fee+20% (maks 2 boost), 30% sadoqat −1,
 *     cooldown 1 oy.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix12.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix12.mjs && node /tmp/smoke-fix12.mjs
 */
import {
  CLIENT_WORK_MAX_BOOSTS,
  applyAvans,
  applyPayday,
  avansAmount,
  clientWorkCost,
  closeLoanEarly,
  createLoan,
  effectiveSalary,
  loanPayments,
  makeGame,
  makePartialPayment,
  makePlayer,
  offerClientWork,
  splitExpenses,
  takeLoanOffer,
} from "@/lib/game/engine";
import { AVANS_RATE, type Player } from "@/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

import { PROFESSIONS } from "@/lib/game/data";
function mk(): Player {
  const p = makePlayer(0, "Test", PROFESSIONS[0], {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
  });
  p.loans = [];
  p.installments = [];
  p.assets = [];
  p.expenseParts = splitExpenses(1_000_000);
  p.cash = 0;
  return p;
}

/* ---------- P1. Avans sof maoshdan ---------- */
{
  // kreditsiz: eski formula bilan bir xil
  const p = mk();
  p.salary = 10_000_000;
  check("P1: kreditsiz avans = 30% maosh", applyAvans(p) === 3_000_000, applyAvans(mk()));

  // kreditli: 75 mln maosh, 52 mln kredit to'lovlari → avans = 30% × 23 mln = 6,9 mln
  const q = mk();
  q.salary = 75_000_000;
  q.loans = [createLoan("l1", "Avtokredit", 90_000_000, 0.23 / 12, 3)];
  q.loans.push(createLoan("l2", "Mikroqarz", 50_000_000, 0.03, 3));
  const loans = loanPayments(q);
  const expected = Math.round(Math.max(0, 75_000_000 - loans) * AVANS_RATE);
  check("P1: avans = 30% × (maosh − kreditlar)", avansAmount(q) === expected, { loans, expected });
  check("P1: avans 30%×maoshdan kichik", avansAmount(q) < Math.round(75_000_000 * AVANS_RATE));

  // kreditlar maoshni yutadi → avans 0, naqd o'zgarmaydi, bayroq qo'yilmaydi
  const z = mk();
  z.salary = 20_000_000;
  z.loans = [createLoan("l1", "Katta kredit", 90_000_000, 0.23 / 12, 3)];
  const zBefore = z.cash;
  const zAmt = applyAvans(z);
  check("P1: kreditlar maoshni yutsa avans 0", zAmt === 0 && z.cash === zBefore && !z.avansTakenThisMonth, {
    zAmt,
    loanPay: loanPayments(z),
  });

  // Saqlanish: avans + payday maosh qismi = maosh (bir nechta kombinatsiya)
  const combos: Array<[number, Array<[number, number, number]>]> = [
    [10_000_000, []],
    [75_000_000, [[90_000_000, 0.23 / 12, 3]]],
    [75_000_000, [[90_000_000, 0.23 / 12, 3], [50_000_000, 0.03, 3]]],
    [30_000_000, [[90_000_000, 0.23 / 12, 3]]], // kreditlar > maosh
    [12_345_678, [[20_000_000, 0.02, 12]]],
  ];
  for (const [salary, loanDefs] of combos) {
    const pl = mk();
    pl.salary = salary;
    pl.loans = loanDefs.map(([pr, r, m], i) => createLoan(`l${i}`, `K${i}`, pr, r, m));
    const sal = effectiveSalary(pl);
    const avans = applyAvans(pl);
    const before = pl.cash;
    const res = applyPayday(pl);
    // payday amount = sal − avans + passiv(0) − xarajatlar − kredit to'lovlari
    const cashDelta = pl.cash - before;
    // saqlanish: avans + (maosh − ayirish) = maosh  ⟺  ayirish = avans
    check(
      `P1 saqlanish: avans+payday maosh qismi=maosh (sal=${salary}, loans=${loanDefs.length})`,
      res.avansDeducted === avans && avans + (sal - res.avansDeducted!) === sal,
      { avans, deducted: res.avansDeducted, sal, cashDelta }
    );
  }

  // oy o'rtasida kredit yopilsa ham payday aynan avansReceived'ni ayiradi
  const m = mk();
  m.salary = 50_000_000;
  m.loans = [createLoan("l1", "K", 20_000_000, 0.02, 12)];
  const av = applyAvans(m);
  m.cash += 100_000_000;
  closeLoanEarly(m, "l1"); // kredit yopildi — lekin avans oshirmaydi/qaytarilmaydi
  const rr = applyPayday(m);
  check("P1: payday aynan avansReceived ayiradi (kredit yopilgach ham)", rr.avansDeducted === av, {
    av,
    deducted: rr.avansDeducted,
  });
}

/* ---------- P2. To'lovlar auditi (foydalanuvchi ssenariysi) ---------- */
{
  const p = mk();
  p.salary = 51_000_000;
  p.cash = 51_000_000;
  // qoldiqlar 51 mln naqdga sig'ishi kerak (to'liq yopish ssenariysi)
  const auto = takeLoanOffer(p, "Avtokredit", 45_000_000, 0.23 / 12, 3);
  const micro = takeLoanOffer(p, "Mikroqarz", 20_000_000, 0.03, 12);
  p.cash = 51_000_000; // faqat qoldiqlarni tekshiramiz — boshlang'ich naqdni qaytaramiz

  // 1 oy tick o'tkazamiz (foiz/to'lov) — qoldiqlar real holatga keladi
  applyPayday(p); // bu yerda p.cash o'zgaradi — qayta tiklaymiz, muhimi qoldiq
  const balAuto = p.loans.find((l) => l.id === auto.id)!.remainingBalance;
  const balMicro = p.loans.find((l) => l.id === micro.id)!.remainingBalance;
  p.cash = 51_000_000;

  const c0 = p.cash;
  const ok1 = closeLoanEarly(p, auto.id);
  const d1 = c0 - p.cash;
  check("P2: avtokredit yopish deltasi == remainingBalance", ok1 && d1 === balAuto, { d1, balAuto });
  check("P2: avtokredit ro'yxatdan o'chdi", !p.loans.some((l) => l.id === auto.id));

  const c1 = p.cash;
  const ok2 = closeLoanEarly(p, micro.id);
  const d2 = c1 - p.cash;
  check("P2: mikroqarz yopish deltasi == remainingBalance", ok2 && d2 === balMicro, { d2, balMicro });
  check("P2: barcha kreditlar yopildi", p.loans.length === 0);
  check(
    "P2: qoldiq = 51 mln − balAuto − balMicro (qo‘shaloq yechilish yo‘q)",
    p.cash === 51_000_000 - balAuto - balMicro,
    { cash: p.cash, balAuto, balMicro }
  );
  console.log(
    `AUDIT foydalanuvchi ssenariysi: 51 000 000 − ${balAuto.toLocaleString()} (avtokredit qoldig'i) − ${balMicro.toLocaleString()} (mikroqarz qoldig'i) = ${p.cash.toLocaleString()} so'm`
  );

  // qayta yopish mumkin emas (double-charge himoyasi)
  check("P2: yopilgan kreditni qayta yopib bo'lmaydi", closeLoanEarly(p, auto.id) === false);

  // makePartialPayment: balansdan oshmaydi
  const q = mk();
  q.cash = 100_000_000;
  const l = takeLoanOffer(q, "Test", 10_000_000, 0.02, 12);
  q.cash = 100_000_000;
  const bal = l.remainingBalance;
  const r1 = makePartialPayment(q, l.id, bal + 5_000_000);
  check("P2: qisman to'lov balansdan oshmaydi", r1 !== null && r1.paid === bal && r1.closed, r1);
  check("P2: naqd aynan balansga kamaydi", q.cash === 100_000_000 - bal, q.cash);
  check("P2: balans yopilgach kredit o'chadi", q.loans.length === 0);

  // makePartialPayment: naqddan oshsa — rad (null), hech narsa o'zgarmaydi
  const w = mk();
  w.cash = 1_000_000;
  const l2 = takeLoanOffer(w, "T2", 10_000_000, 0.02, 12);
  w.cash = 1_000_000;
  const r2 = makePartialPayment(w, l2.id, 5_000_000);
  check("P2: naqd yetishmasa qisman to'lov rad etiladi", r2 === null && w.cash === 1_000_000 && w.loans.length === 1, r2);
  // noto'g'ri summalar
  check("P2: 0/manfiy/NaN summa rad etiladi",
    makePartialPayment(w, l2.id, 0) === null &&
    makePartialPayment(w, l2.id, -100) === null &&
    makePartialPayment(w, l2.id, NaN) === null);
  // qisman to'lov qoldiqni aniq kamaytiradi
  const r3 = makePartialPayment(w, l2.id, 500_000);
  check("P2: qisman to'lov qoldiqni aniq kamaytiradi",
    r3 !== null && r3.paid === 500_000 && l2.remainingBalance === 10_000_000 - 500_000 && w.cash === 500_000, r3);
}

/* ---------- P4. Mijozga ish taklifi ---------- */
{
  const p = mk();
  p.quadrant = "S";
  p.cash = 10_000_000;
  p.clients = [{ id: "c1", name: "Anvar", monthlyFee: 1_000_000, loyalty: 3 }];
  p.clientWork = {};
  const s = makeGame([p]);
  s.month = 5;

  check("P4: ish taklifi narxi fee × 20%", clientWorkCost(p.clients[0]) === 200_000);

  // muvaffaqiyat (rand < 0.7): fee +20%, boosts 1, naqd −200k
  const r1 = offerClientWork(s, p.id, "c1", () => 0.1);
  check("P4: muvaffaqiyat — fee +20%", r1.ok && r1.success === true && p.clients[0].monthlyFee === 1_200_000, r1);
  check("P4: narx yechildi", p.cash === 9_800_000, p.cash);
  check("P4: boost qayd etildi", p.clientWork["c1"].boosts === 1 && p.clientWork["c1"].lastMonth === 5);

  // cooldown: shu oyda yana bo'lmaydi, naqd yechilmaydi
  const r2 = offerClientWork(s, p.id, "c1", () => 0.1);
  check("P4: cooldown 1 oy", !r2.ok && p.cash === 9_800_000, r2);

  // keyingi oy: yana mumkin; 2-boost
  s.month = 6;
  const r3 = offerClientWork(s, p.id, "c1", () => 0.1);
  check("P4: 2-boost (maks)", r3.ok && p.clients[0].monthlyFee === Math.round(1_200_000 * 1.2), r3);

  // maks boostdan keyin blok
  s.month = 7;
  const r4 = offerClientWork(s, p.id, "c1", () => 0.1);
  check("P4: maks boostdan keyin rad", !r4.ok && p.clientWork["c1"].boosts === CLIENT_WORK_MAX_BOOSTS, r4);

  // norozilik (rand >= 0.7): sadoqat −1 (min 1)
  const q = mk();
  q.quadrant = "S";
  q.cash = 10_000_000;
  q.clients = [{ id: "c9", name: "Bek", monthlyFee: 500_000, loyalty: 1 }];
  q.clientWork = {};
  const s2 = makeGame([q]);
  s2.month = 3;
  const r5 = offerClientWork(s2, q.id, "c9", () => 0.99);
  check("P4: norozilik — sadoqat 1 dan pastga tushmaydi", r5.ok && r5.success === false && q.clients[0].loyalty === 1, r5);
  check("P4: norozilikda fee o'zgarmaydi", q.clients[0].monthlyFee === 500_000);

  const t = mk();
  t.quadrant = "S";
  t.cash = 10_000_000;
  t.clients = [{ id: "c2", name: "Dilnoza", monthlyFee: 500_000, loyalty: 4 }];
  t.clientWork = {};
  const s3 = makeGame([t]);
  const r6 = offerClientWork(s3, t.id, "c2", () => 0.99);
  check("P4: norozilik — sadoqat −1", r6.ok && t.clients[0].loyalty === 3, r6);

  // naqd yetishmasa rad
  t.cash = 50_000;
  s3.month += 1;
  const r7 = offerClientWork(s3, t.id, "c2", () => 0.1);
  check("P4: naqd yetishmasa rad", !r7.ok && t.cash === 50_000, r7);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
