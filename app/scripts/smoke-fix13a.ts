/**
 * OQIM — fix-13a smoke test (content sanity):
 *  K1: har bir kasbning oylik sof oqimi (maosh − xarajatlar − kredit to'lovi)
 *      musbat va maoshning 8–20% oralig'ida; ro'yxat ≤ 16 kasb.
 *  K2: har bir oqimli bitimning narx bo'yicha ROI 20–95%/yil bandida
 *      (depozit/obligatsiya/aksiya/valyuta, ipotekali va qurilish bitimlari bundan mustasno);
 *      biznes bitimlari 35–60%/yil, boshlang'ich to'lov ROI ≤ 90%/yil.
 *  K3: fix-13a da qo'shilgan yangi hodisalarning barchasida lessonText bor.
 *  Doodad: har bir kutilmagan xarajat ≤ 6× minimal maosh
 *      (canDecline mashinalar bundan mustasno).
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix13a.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix13a.mjs && node /tmp/smoke-fix13a.mjs
 */
import {
  BIG_DEALS,
  DOODAD_CARDS,
  EVENT_CARDS,
  PROFESSIONS,
  SMALL_DEALS,
} from "../src/lib/game/data";

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

/* ---------- K1: kasblar ---------- */
console.log("\nK1 — kasblar (2026 realiyasi)");
check("ro'yxat 16 tadan oshmaydi", PROFESSIONS.length <= 16, PROFESSIONS.length);
const ids = new Set<string>();
for (const p of PROFESSIONS) {
  check(`kasb id unikal: ${p.id}`, !ids.has(p.id));
  ids.add(p.id);
  const cf = p.salary - p.expenses - p.loanPayment;
  check(`${p.id}: sof oqim musbat`, cf > 0, { cf });
  const pct = cf / p.salary;
  check(
    `${p.id}: oqim maoshning 8–20% i`,
    pct >= 0.08 && pct <= 0.20,
    { pct: +(pct * 100).toFixed(1), cf, salary: p.salary },
  );
  const loansSum = p.loans.reduce((s, l) => s + l.monthlyPayment, 0);
  check(`${p.id}: loanPayment == qarzlar yig'indisi`, loansSum === p.loanPayment, { loansSum, p: p.loanPayment });
  check(`${p.id}: jamg'arma 2–4 oylik oqim`, p.savings >= 2 * cf && p.savings <= 4 * cf, { savings: p.savings, cf });
}

/* ---------- K2: bitimlar ROI ---------- */
console.log("\nK2 — bitimlar ROI");
const ALL_DEALS = SMALL_DEALS.concat(BIG_DEALS);
const EXEMPT_KINDS = new Set(["deposit", "bonds", "stock", "currency"]);
const dealIds = new Set<string>();
for (const d of ALL_DEALS) {
  check(`bitim id unikal: ${d.id}`, !dealIds.has(d.id));
  dealIds.add(d.id);
  const exempt = EXEMPT_KINDS.has(d.kind) || !!d.loan || !!d.constructionTurns;
  if (d.cashflow > 0 && !exempt) {
    const roiPrice = (d.cashflow * 12) / d.price;
    check(
      `${d.id}: narx ROI 20–95%/yil`,
      roiPrice >= 0.20 && roiPrice <= 0.95,
      { roi: +(roiPrice * 100).toFixed(1) },
    );
    if (d.kind === "business") {
      check(
        `${d.id}: biznes ROI 35–60%/yil`,
        roiPrice >= 0.35 && roiPrice <= 0.60,
        { roi: +(roiPrice * 100).toFixed(1) },
      );
      const roiDown = (d.cashflow * 12) / d.down;
      check(
        `${d.id}: boshlang'ich to'lov ROI ≤ 90%/yil`,
        roiDown <= 0.90,
        { roiDown: +(roiDown * 100).toFixed(1) },
      );
    }
  }
  check(`${d.id}: boshlang'ich to'lov ≤ narx`, d.down <= d.price, { down: d.down, price: d.price });
}
// yangi trend bitimlar mavjudligi
const NEW_DEALS = [
  "kofe-to-go",
  "dark-kitchen",
  "smm-agency",
  "online-courses",
  "auto-detailing",
  "kids-center",
  "express-delivery",
  "it-outsourcing",
  "franchise-fastfood",
  "agro-tissue",
];
for (const id of NEW_DEALS) {
  check(`yangi bitim mavjud: ${id}`, dealIds.has(id));
}

/* ---------- K3: yangi hodisalar ---------- */
console.log("\nK3 — mahalliy hodisalar");
const NEW_EVENTS = [
  "qudalar-kelishi",
  "qiz-tashlash",
  "oltin-togarak",
  "qurbon-hayit",
  "mahalla-hoshar",
  "farzand-1-sinf",
  "qoshni-qarz",
  "uzum-eksport",
  "yangi-yil-korporativ",
];
for (const id of NEW_EVENTS) {
  const e = EVENT_CARDS.find((c) => c.id === id);
  check(`hodisa mavjud: ${id}`, !!e);
  if (e) {
    const hasLesson =
      !!e.lessonText || (!!e.choices && e.choices.every((c) => !!c.lessonText));
    check(`${id}: lessonText bor`, hasLesson);
  }
}


/* ---------- Doodad cheklovi ---------- */
console.log("\nDoodad — o'lcham cheklovi");
const minSalary = Math.min(...PROFESSIONS.map((p) => p.salary));
const maxDoodad = 6 * minSalary;
for (const d of DOODAD_CARDS) {
  const isCar = d.canDecline && d.icon === "Car";
  if (isCar) continue;
  check(
    `${d.id}: ≤ 6× min maosh (${maxDoodad})`,
    d.cost <= maxDoodad,
    { cost: d.cost },
  );
}

/* ---------- Yakun ---------- */
if (failures > 0) {
  console.error(`\n${failures} ta tekshiruv FAIL`);
  process.exit(1);
}
console.log("\nBarcha tekshiruvlar o'tdi ✔");
