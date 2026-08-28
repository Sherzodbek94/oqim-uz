/**
 * OQIM — fix-14 smoke:
 *  T1: qarindoshlardan foizsiz qarz (gate'lar, 0% foiz, muddatda avto-yechish,
 *      kechikish → reyting −40 + 12 oy blok, erta to'liq qaytarish).
 *  T2: shoshilinch sotuv modeli (urgencyFactor likvidlik bo'yicha,
 *      narx = bozor × resale% × urgency, taqsimot matematikasi).
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix14.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix14.mjs && node /tmp/smoke-fix14.mjs
 */
import {
  applyPayday,
  canTakeQarz,
  forcedSell,
  makeGame,
  makePlayer,
  monthlyIncome,
  qarzMaxAmount,
  repayQarz,
  takeQarz,
  urgencyFactor,
  urgentSaleQuote,
} from "../src/lib/game/engine";
import {
  QARZ_BLOCK_MONTHS,
  QARZ_INCOME_MULT,
  QARZ_MIN,
  SCORE_CLOSED,
  SCORE_QARZ_LATE,
  type Asset,
  type Player,
  type Profession,
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
  } as Profession;
}

function mkPlayer(p: Profession = prof(), cash?: number): Player {
  const pl = makePlayer(0, "Test", p, {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
  });
  if (cash !== undefined) pl.cash = cash;
  return pl;
}

function mkAsset(over: Partial<Asset> = {}): Asset {
  return {
    id: `a${Math.random().toString(36).slice(2, 8)}`,
    title: "Test aktiv",
    kind: "business",
    icon: "store",
    price: 10_000_000,
    paid: 10_000_000,
    monthlyCashflow: 0,
    ...over,
  };
}

/* ================= T1: Foizsiz qarz ================= */
{
  const p = mkPlayer(prof(), 0);
  const s = makeGame([p]);
  // daromad: maosh 4 mln → maks qarz 8 mln
  check("T1: maks qarz = 2 × oylik daromad", qarzMaxAmount(p) === 4_000_000 * QARZ_INCOME_MULT, qarzMaxAmount(p));

  check("T1 gate: 2× daromaddan ortiq summa rad etiladi", takeQarz(s, 0, 8_000_001, 6) === null);
  check("T1 gate: minimaldan kam summa rad etiladi", takeQarz(s, 0, QARZ_MIN - 1, 6) === null);
  check("T1 gate: noto'g'ri muddat (5 oy) rad etiladi", takeQarz(s, 0, 1_000_000, 5) === null);
  check("T1: aynan maksimal summa ruxsat etiladi", canTakeQarz(s, p, 8_000_000, 6));

  const loan = takeQarz(s, 0, 2_000_000, 3);
  check("T1: qarz olindi", loan !== null);
  check("T1: naqd +2 mln", p.cash === 2_000_000, p.cash);
  check("T1: kind=qarz, foiz 0, oylik to'lov 0", loan!.kind === "qarz" && loan!.monthlyRate === 0 && loan!.monthlyPayment === 0);
  check("T1: dueMonth = joriy oy + muddat", loan!.dueMonth === s.month + 3, loan!.dueMonth);
  check("T1: log + bildirishnoma yozildi", s.log.some((l) => l.text.includes("qarz olindi")) && s.notifications.length > 0);

  check("T1 gate: faol qarz bor — ikkinchisi rad etiladi", takeQarz(s, 0, 1_000_000, 6) === null);

  // 0% foiz: 2 oy payday — qoldiq o'zgarmaydi, qarz yopilmaydi
  applyPayday(p, null, undefined, 1);
  applyPayday(p, null, undefined, 2);
  const l2 = p.loans.find((l) => l.kind === "qarz")!;
  check("T1: 2 oydan keyin ham qoldiq = principal (foizsiz)", l2.remainingBalance === 2_000_000, l2.remainingBalance);
  check("T1: qarz oylik xarajat qo'shmaydi", monthlyIncome(p) === 4_000_000);

  // erta to'liq qaytarish
  p.cash = 5_000_000;
  const repaid = repayQarz(p, l2.id);
  check("T1: erta qaytarish ishlaydi (to'liq summa)", repaid && !p.loans.some((l) => l.kind === "qarz"));
  check("T1: jami qaytarilgan = principal (0% foiz isboti)", p.cash === 5_000_000 - 2_000_000, p.cash);
  check("T1: qaytarilgach yana olish mumkin", canTakeQarz(s, p, 1_000_000, 6));

  // muddatida avtomatik yechish (vaqtida)
  const p2 = mkPlayer(prof(), 0);
  const s2 = makeGame([p2]);
  takeQarz(s2, 0, 1_000_000, 3);
  const scoreBefore = p2.creditScore;
  applyPayday(p2, null, undefined, 1);
  applyPayday(p2, null, undefined, 2);
  const cashBefore = p2.cash;
  const res = applyPayday(p2, null, undefined, 3); // 3-oy: muddat tugaydi
  check("T1: due oyda qarz yopiladi", !p2.loans.some((l) => l.kind === "qarz"));
  check(
    "T1: to'liq principal avto-yechiladi (cash = oldingi + payday − principal)",
    p2.cash === cashBefore + res.amount - 1_000_000,
    { cash: p2.cash, cashBefore, amount: res.amount }
  );
  check("T1: vaqtida qaytarish — ijobiy reyting (+SCORE_CLOSED)", p2.creditScore === scoreBefore + SCORE_CLOSED + 2 * 2 || p2.creditScore > scoreBefore, { scoreBefore, now: p2.creditScore });
  check("T1: vaqtida qaytarish log'i", res.notes.some((n) => n.includes("QARZ QAYTARILDI")), res.notes);
  check("T1: blok yo'q", p2.qarzBlockedUntil === 0);

  // kechikish: due oyda naqd yetarli emas → obro' zarari
  const p3 = mkPlayer(prof(), 0);
  const s3 = makeGame([p3]);
  takeQarz(s3, 0, 2_000_000, 3);
  applyPayday(p3, null, undefined, 1);
  applyPayday(p3, null, undefined, 2);
  p3.cash = 1_000_000; // yetarli emas
  p3.salary = 0; // payday daromadi qoplamasin
  const score3 = p3.creditScore;
  const res3 = applyPayday(p3, null, undefined, 3);
  check("T1: kechikishda ham qarz yopiladi (summa yechildi)", !p3.loans.some((l) => l.kind === "qarz"));
  check("T1: kechikish → reyting −40", p3.creditScore === score3 + SCORE_QARZ_LATE, { score3, now: p3.creditScore });
  check(
    "T1: kechikish → 12 oy blok (qarzBlockedUntil = 3 + 12)",
    p3.qarzBlockedUntil === 3 + QARZ_BLOCK_MONTHS,
    p3.qarzBlockedUntil
  );
  check("T1: kechikish log'i (ishonch yo'qoldi)", res3.notes.some((n) => n.includes("ishonch yo'qoldi")), res3.notes);
  check("T1 gate: blok davomida yangi qarz rad etiladi", !canTakeQarz(s3, p3, 1_000_000, 6) && takeQarz(s3, 0, 1_000_000, 6) === null);
  s3.month = 3 + QARZ_BLOCK_MONTHS;
  p3.salary = 4_000_000; // daromad tiklangan (blok tugagach limit qayta hisoblanadi)
  check("T1 gate: blok tugagach yana olish mumkin", canTakeQarz(s3, p3, 1_000_000, 6));
}

/* ================= T2: Shoshilinch sotuv ================= */
{
  const p = mkPlayer(prof());
  const s = makeGame([p]);

  check("T2: urgencyFactor likvidlik 1 → 0,70", urgencyFactor(mkAsset({ liquidity: 1 })) === 0.7);
  check("T2: urgencyFactor likvidlik 3 → 0,85", urgencyFactor(mkAsset({ liquidity: 3 })) === 0.85);
  check("T2: urgencyFactor likvidlik 5 → 0,95", urgencyFactor(mkAsset({ liquidity: 5 })) === 0.95);
  check("T2: likvidlik yo'q → default 3 (0,85)", urgencyFactor(mkAsset({ liquidity: undefined })) === 0.85);

  // narx = bozor × resale% × urgency (indeks 1,0)
  const a1 = mkAsset({ liquidity: 1, resalePercent: 80, price: 10_000_000 });
  const q1 = urgentSaleQuote(s, a1);
  check("T2: bozor qiymati = narx × indeks", q1.marketValue === 10_000_000, q1.marketValue);
  check("T2: narx = 10 mln × 80% × 0,70 = 5,6 mln", q1.price === 5_600_000, q1.price);
  check("T2: taqsimot — resalePct 80", q1.resalePct === 80);
  check("T2: taqsimot — shoshilinch chegirma 30%", q1.urgencyDiscountPct === 30, q1.urgencyDiscountPct);

  // bozor indeksi ta'siri
  s.marketIndices.business = 1.2;
  const a2 = mkAsset({ liquidity: 5, price: 10_000_000 }); // resale yo'q → 100%
  const q2 = urgentSaleQuote(s, a2);
  check("T2: indeks 1,2 → bozor 12 mln", q2.marketValue === 12_000_000, q2.marketValue);
  check("T2: 12 mln × 100% × 0,95 = 11,4 mln", q2.price === 11_400_000, q2.price);
  s.marketIndices.business = 1;

  // hech qachon manfiy emas
  const q3 = urgentSaleQuote(s, mkAsset({ liquidity: 1, resalePercent: 0, price: 100 }));
  check("T2: narx hech qachon 0 dan past emas", q3.price === 0, q3.price);

  // forcedSell integratsiyasi: narx taqsimotga teng, aktiv o'chadi, naqd qo'shiladi
  const a4 = mkAsset({ id: "sellme", liquidity: 2, resalePercent: 90, price: 10_000_000 });
  p.assets.push(a4);
  const expected = Math.round(10_000_000 * 0.9 * 0.78);
  const cash0 = p.cash;
  const got = forcedSell(s, p, "sellme");
  check("T2: forcedSell = bozor × resale × urgency", got === expected, { got, expected });
  check("T2: naqd +narx, aktiv o'chirildi", p.cash === cash0 + expected && !p.assets.some((a) => a.id === "sellme"));
  check("T2: mavjud bo'lmagan aktiv → 0", forcedSell(s, p, "yoq") === 0);

  // taqdimot matematikasi: bozor × resale/100 × urgency aniq formula (turli likvidlik)
  for (const [liq, f] of [[1, 0.7], [3, 0.85], [5, 0.95]] as const) {
    const ax = mkAsset({ liquidity: liq, resalePercent: 75, price: 8_000_000 });
    const qx = urgentSaleQuote(s, ax);
    check(
      `T2: formula aniq (likvidlik ${liq})`,
      qx.price === Math.round(qx.marketValue * 0.75 * f) && qx.urgency === f,
      { price: qx.price, f }
    );
  }
}

console.log(failures === 0 ? "\nALL OK (fix-14)" : `\n${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
