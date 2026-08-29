/**
 * OQIM — oy kalendari (30 katak) smoke test.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-calendar.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-calendar.mjs && node /tmp/smoke-calendar.mjs
 */
import {
  applyAvans,
  applyHomeExpense,
  canEscape,
  completeMonth,
  dayOfMonth,
  effectiveSalary,
  makeGame,
  makePlayer,
  movePath,
  rollHomeExpense,
} from "../src/lib/game/engine";
import { HOME_EXPENSES } from "../src/lib/game/data";
import { heroById, heroToProfession } from "../src/lib/game/heroes";
import { perimeterLayout } from "../src/pages/game/Board";
import {
  AVANS_INDEX,
  AVANS_RATE,
  FT_CELLS,
  HOME_EXPENSE_MAX,
  HOME_EXPENSE_MIN,
  RAT_BOARD_COLS,
  RAT_BOARD_ROWS,
  RAT_CELLS,
  type Player,
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

function playerFor(quadrant: Quadrant = "E"): Player {
  const hero = heroById("aziza")!;
  return makePlayer(0, hero.name, heroToProfession(hero), {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
    heroId: hero.id,
    quadrant,
  });
}

/* ---------- 1. RAT_CELLS: 30 katak, taqsimot ---------- */
{
  check("30 katak", RAT_CELLS.length === 30, RAT_CELLS.length);
  check("index 0 = payday (Oy kun)", RAT_CELLS[0] === "payday");
  check("index 15 = avans", RAT_CELLS[AVANS_INDEX] === "avans");
  const count = (t: string) => RAT_CELLS.filter((c) => c === t).length;
  check("payday ×1", count("payday") === 1);
  check("avans ×1", count("avans") === 1);
  check("weekend ×4", count("weekend") === 4);
  check("opportunity ×6-7", count("opportunity") >= 6 && count("opportunity") <= 7, count("opportunity"));
  check("doodad ×4", count("doodad") === 4);
  check("market ×4-5", count("market") >= 4 && count("market") <= 5, count("market"));
  check("event ×4", count("event") === 4);
  check("charity ×2", count("charity") === 2);
  check("baby ×1", count("baby") === 1);
  check("downsized ×1", count("downsized") === 1);
  // ketma-ket bir xil katak faqat dam olish juftliklarida (5-6, 19-20)
  const adj: number[] = [];
  for (let i = 0; i < 30; i++) {
    if (RAT_CELLS[i] === RAT_CELLS[(i + 1) % 30] && RAT_CELLS[i] !== "weekend") adj.push(i);
  }
  check("bir xil katak yonma-yon emas (weekend juftlikdan tashqari)", adj.length === 0, adj);
}

/* ---------- 2. Layout: 9×8 perimetr, burchaklar 0/8/15/23 ---------- */
{
  const rects = perimeterLayout(RAT_BOARD_COLS, RAT_BOARD_ROWS);
  check("layout 30 rect", rects.length === 30);
  const inBounds = rects.every(
    (r) =>
      r.x >= 0 && r.y >= 0 && r.x + r.w <= 1000 && r.y + r.h <= 1000 && r.w > 0 && r.h > 0 &&
      Number.isFinite(r.cx) && Number.isFinite(r.cy)
  );
  check("barcha rect viewBox ichida", inBounds, rects.filter((r) => r.x < 0 || r.y < 0 || r.x + r.w > 1000 || r.y + r.h > 1000));
  const corners = rects.map((r, i) => (r.corner ? i : -1)).filter((i) => i >= 0);
  check("burchaklar 0/8/15/23", JSON.stringify(corners) === JSON.stringify([0, 8, 15, 23]), corners);
  check("index 0 burchak (Oy kun)", rects[0].corner === true);
  check("index 15 burchak (Avans)", rects[15].corner === true);
  check("barcha side qiymatlari to'g'ri", rects.every((r) => ["top", "right", "bottom", "left"].includes(r.side)));
  // token fan-out uchun markazlar mavjud va noyob
  const centers = new Set(rects.map((r) => `${Math.round(r.cx)},${Math.round(r.cy)}`));
  check("30 ta noyob katak markazi (fan-out bazasi)", centers.size === 30);
  // Erkinlik yo'li o'zgarishsiz: 5×5 → 16 katak, burchaklar 0/4/8/12
  const ft = perimeterLayout(5, 5);
  const ftCorners = ft.map((r, i) => (r.corner ? i : -1)).filter((i) => i >= 0);
  check("FT 16 katak, burchaklar 0/4/8/12", ft.length === 16 && JSON.stringify(ftCorners) === JSON.stringify([0, 4, 8, 12]), ftCorners);
}

/* ---------- 3. Kun mapping: position → oy kuni ---------- */
{
  check("0 → 1-kun", dayOfMonth(0) === 1);
  check("29 → 30-kun", dayOfMonth(29) === 30);
  check("15 → 16-kun (Avans kuni)", dayOfMonth(AVANS_INDEX) === 16);
  // shanba/yakshanba patterni: kun%7 6 yoki 0
  const weekendIdx = [5, 6, 19, 20];
  check(
    "weekend katakchalari 5/6/19/20",
    weekendIdx.every((i) => RAT_CELLS[i] === "weekend")
  );
  check(
    "weekend kunlari kun%7 ∈ {6,0}",
    weekendIdx.every((i) => {
      const d = dayOfMonth(i);
      return d % 7 === 6 || d % 7 === 0;
    }),
    weekendIdx.map(dayOfMonth)
  );
}

/* ---------- 4. Avans: aniq 30% effektiv maosh ---------- */
{
  const p = playerFor("E");
  const sal = effectiveSalary(p);
  const before = p.cash;
  const amount = applyAvans(p);
  check("avans = 30% maosh", amount === Math.round(sal * AVANS_RATE), { sal, amount });
  check("avans naqd qo'shildi", p.cash === before + amount);

  // ishsizlikda avans yo'q (0)
  const u = playerFor("E");
  u.unemployedMonths = 2;
  const uBefore = u.cash;
  check("ishsizlikda avans 0", applyAvans(u) === 0 && u.cash === uBefore);

  // kvadrant matematikani o'zgartirmaydi
  const amounts = (["E", "S", "B", "I"] as Quadrant[]).map((q) => applyAvans(playerFor(q)));
  check("kvadrantlar bir xil matematika", amounts.every((a) => a === amounts[0]), amounts);

  // vaqtinchalik maosh multiplikatori ham hisobga olinadi (effectiveSalary)
  const m = playerFor("E");
  m.salaryMultiplier = 1.2;
  check("maosh multiplikatori bilan 30%", applyAvans(m) === Math.round(effectiveSalary(m) * AVANS_RATE));
}

/* ---------- 5. Oy tugadi: 0-katakdan o'tish → month +1 ---------- */
{
  const p = playerFor("E");
  const s = makeGame([p]);
  check("boshlang'ich oy = 1", s.month === 1);
  // 26-katakdan 6 qadam: 27,28,29,0,1,2 — 0-katakdan o'tadi (aylana tugadi)
  const path = movePath(26, 6, RAT_CELLS.length);
  check("aylana yo'li 0-katakdan o'tadi", path.includes(0), path);
  if (path.includes(0)) completeMonth(s);
  check("oy hisoblagichi 2", s.month === 2);
  check("jurnalda 'Oy tugadi'", s.log.some((l) => l.text.includes("Oy tugadi")));
  // o'tmagan yo'l — oy o'zgarmaydi
  const short = movePath(3, 4, RAT_CELLS.length);
  check("qisqa yo'l 0-katakdan o'tmaydi", !short.includes(0), short);
}

/* ---------- 6. Uy xarajati: 30% tarmoq, 150–600 ming ---------- */
{
  check("70% — uy xarajati yo'q", rollHomeExpense(() => 0.5) === null);
  // trigged: chance <0.3, title index 0, min summa
  const seq = [0.1, 0, 0];
  let i = 0;
  const exp = rollHomeExpense(() => seq[i++ % seq.length]);
  check("30% — uy xarajati tushadi", exp !== null);
  check("nom ro'yxatdan", !!exp && HOME_EXPENSES.includes(exp.title), exp?.title);
  check("min summa 150 000", !!exp && exp.amount === HOME_EXPENSE_MIN, exp?.amount);
  // max chegarada 600 000 dan oshmaydi
  const seqMax = [0.1, 0.999, 0.999];
  let j = 0;
  const expMax = rollHomeExpense(() => seqMax[j++ % seqMax.length]);
  check(
    "max summa ≤ 600 000",
    !!expMax && expMax.amount <= HOME_EXPENSE_MAX && expMax.amount >= HOME_EXPENSE_MIN,
    expMax?.amount
  );
  // tasodifiy namunalar oraliquda va 10 mingga karrali
  let allInRange = true;
  for (let k = 0; k < 200; k++) {
    const e = rollHomeExpense(() => 0.1); // har doim trigger
    if (!e) continue;
    if (e.amount < HOME_EXPENSE_MIN || e.amount > HOME_EXPENSE_MAX || e.amount % 10_000 !== 0) allInRange = false;
  }
  check("200 namuna: 150–600 ming, 10 mingga karrali", allInRange);
  // naqd puldan yechiladi
  const p = playerFor("E");
  const before = p.cash;
  const e2 = rollHomeExpense(() => 0.1)!;
  applyHomeExpense(p, e2);
  check("uy xarajati naqd yechildi", p.cash === before - e2.amount);
}

/* ---------- 7. Escape / Erkinlik yo'li o'zgarishsiz ---------- */
{
  const p = playerFor("E");
  check("escape shartlari saqlangan (dastlab chiqib bo'lmaydi)", !canEscape(p));
  check("FT 16 katak", FT_CELLS.length === 16);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
