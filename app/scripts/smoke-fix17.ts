/**
 * OQIM — fix-17 smoke test: "🗓 Reja rejimi" (oylik vaqt-planner).
 *  R1 makeGame plan rejimida yaratiladi (boardMode:"plan", plan holati, path null).
 *  R1 Reja validatsiyasi: bo'sh reja rad etiladi, to'liq reja o'tadi, avto-to'ldirish valid qiladi.
 *  R1 Maosh ish kunlariga mutanosib: planSalaryScale payday miqdoriga ta'sir qiladi.
 *  R1 Avans mexanikasi buzilmagan: 30% sof (koeffitsiyentli) maosh, payday'da ayiriladi, oy yakunida reset.
 *  R1 Bot rejasi: shaxsiyatga qarab generatsiya, valid, E kvadrantda mijoz plitkasi yo'q.
 *  R2 Save v18→v19 migratsiya: planSalaryScale default 1, boardMode/plan normalizatsiya.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix17.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix17.cjs --format=cjs && node /tmp/smoke-fix17.cjs
 */
import { SAVE_KEY, type GameState, type Player } from "@/lib/game/types";
import {
  applyAvans,
  applyPayday,
  avansAmount,
  completeMonth,
  effectiveSalary,
  makeGame,
  makePlayer,
} from "@/lib/game/engine";
import {
  PLAN_DAYS,
  autofillPlan,
  generateBotPlan,
  makeEmptyPlan,
  planSalaryScale,
  planWorkDays,
  validatePlan,
  type PlanDay,
  type PlanTile,
} from "@/lib/game/plan";
import { PROFESSIONS } from "@/lib/game/data";
import { loadSave } from "@/lib/game/save";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

/* localStorage stub (node muhiti) */
const store: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => void (store[k] = v),
  removeItem: (k: string) => void delete store[k],
  clear: () => void Object.keys(store).forEach((k) => delete store[k]),
  key: () => null,
  get length() {
    return Object.keys(store).length;
  },
} as Storage;

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mk(id = 0, personality: Player["personality"] = null): Player {
  const p = makePlayer(id, "Test", PROFESSIONS[0], {
    isBot: id > 0,
    personality,
    colorIndex: (id % 4) as 0 | 1 | 2 | 3,
    dreamId: "d1",
  });
  p.loans = [];
  p.installments = [];
  return p;
}

function planOf(work: number, fill: PlanTile = "rest"): PlanDay[] {
  return Array.from({ length: PLAN_DAYS }, (_, i) => ({ tile: i < work ? ("work" as PlanTile) : fill, done: false }));
}

/* ---------- R1: makeGame plan rejimi ---------- */
{
  const g = makeGame([mk(0), mk(1, "balanced")], "plan", "classic");
  check("R1 boardMode=plan", g.boardMode === "plan");
  check("R1 plan holati yaratilgan", g.plan !== null && typeof g.plan.days === "object");
  check("R1 path null", g.path === null);
  check("R1 version 20 (fix-18)", g.version === 20);
  check("R1 planSalaryScale default 1", g.players.every((p) => p.planSalaryScale === 1));
}

/* ---------- R1: validatsiya ---------- */
{
  const empty = makeEmptyPlan();
  check("R1 bo'sh reja valid emas", !validatePlan(empty));
  const partial = empty.map((d, i) => (i < 19 ? { tile: "work" as PlanTile, done: false } : d));
  check("R1 19/20 kun valid emas", !validatePlan(partial));
  const full = planOf(12);
  check("R1 to'liq reja valid", validatePlan(full));
  const filled = autofillPlan(partial);
  check("R1 avto-to'ldirish valid qiladi", validatePlan(filled) && filled[19].tile === "rest");
  check("R1 ish kunlari sanaladi", planWorkDays(full) === 12);
  check("R1 maosh koeffitsiyenti", planSalaryScale(full) === 12 / 20);
}

/* ---------- R1: maosh ish kunlariga mutanosib ---------- */
{
  const fullTime = mk(0);
  const halfTime = mk(0);
  halfTime.planSalaryScale = planSalaryScale(planOf(10)); // 10/20 = 0.5
  check("R1 effectiveSalary mutanosib", effectiveSalary(halfTime) === Math.round(fullTime.salary * 0.5),
    { a: effectiveSalary(halfTime), b: Math.round(fullTime.salary * 0.5) });
  const r1 = applyPayday(fullTime);
  const r2 = applyPayday(halfTime);
  const expectedDelta = effectiveSalary(fullTime) - effectiveSalary(halfTime);
  check("R1 payday farqi = maosh farqi", r1.amount - r2.amount === expectedDelta, {
    d: r1.amount - r2.amount,
    e: expectedDelta,
  });
  check("R1 yarim ish haqi to'liqdan kam", r2.amount < r1.amount);
}

/* ---------- R1: avans mexanikasi ---------- */
{
  const p = mk(0);
  p.planSalaryScale = 0.5;
  const avans = avansAmount(p);
  check("R1 avans koeffitsiyentli maoshdan", avans === Math.round(effectiveSalary(p) * 0.3), {
    avans,
    expected: Math.round(effectiveSalary(p) * 0.3),
  });
  const got = applyAvans(p);
  check("R1 avans naqd qo'shildi va bayroq", got === avans && p.avansTakenThisMonth && p.avansReceived === avans);
  const cashBefore = p.cash;
  const res = applyPayday(p);
  check("R1 payday'da avans ayirildi", res.notes.some((n) => n.startsWith("Ish haqi (avans ayirilgan)")));
  // saqlanish qonuni: avans + payday = avanssiz payday (boshqa komponentlar teng)
  const q = mk(0);
  q.planSalaryScale = 0.5;
  const resNoAvans = applyPayday(q);
  check("R1 avans + payday = avanssiz payday", res.amount + avans === resNoAvans.amount, {
    got: res.amount + avans,
    expected: resNoAvans.amount,
  });
  check("R1 payday naqd qo'shildi", p.cash - cashBefore === res.amount);
  const g = makeGame([p], "plan", "classic");
  g.players[0].planSalaryScale = 0.5;
  g.players[0].avansTakenThisMonth = true;
  completeMonth(g, seeded(1));
  check("R1 oy yakunida scale va avans reset", g.players[0].planSalaryScale === 1 && !g.players[0].avansTakenThisMonth && g.players[0].avansReceived === 0);
  check("R1 oy +1", g.month === 2);
}

/* ---------- R1: bot rejasi ---------- */
{
  for (const personality of ["cautious", "balanced", "bold"] as const) {
    const bot = mk(1, personality);
    const plan = generateBotPlan(bot, seeded(7));
    check(`R1 bot rejasi valid (${personality})`, validatePlan(plan) && plan.length === PLAN_DAYS);
  }
  const cautious = generateBotPlan(mk(1, "cautious"), seeded(3));
  const bold = generateBotPlan(mk(2, "bold"), seeded(3));
  check(
    "R1 ehtiyotkor bot ko'proq ishlaydi",
    planWorkDays(cautious) > planWorkDays(bold),
    { c: planWorkDays(cautious), b: planWorkDays(bold) }
  );
  const eQuad = generateBotPlan(mk(1, "bold"), seeded(5)); // default kvadrant E
  check("R1 E kvadrant botda mijoz plitkasi yo'q", eQuad.every((d) => d.tile !== "client"));
  const sQuadBot = mk(1, "bold");
  sQuadBot.quadrant = "S";
  const sPlans = Array.from({ length: 5 }, (_, i) => generateBotPlan(sQuadBot, seeded(10 + i)));
  check("R1 S kvadrant botda mijoz plitkasi bor", sPlans.some((pl) => pl.some((d) => d.tile === "client")));
}

/* ---------- R2: save v18 → v19 migratsiya ---------- */
{
  const g = makeGame([mk(0), mk(1, "cautious")], "classic", "classic") as unknown as { version: number; plan: unknown };
  g.version = 18; // eski saqlanma
  g.plan = undefined;
  for (const p of (g as unknown as GameState).players) {
    delete (p as Partial<Player>).planSalaryScale;
  }
  store[SAVE_KEY] = JSON.stringify(g);
  const loaded = loadSave();
  check("R2 v18 saqlanma yuklanadi", loaded !== null);
  check("R2 versiya 20 ga ko'tarildi (fix-18)", loaded?.version === 20);
  check("R2 planSalaryScale default 1", loaded?.players.every((p) => p.planSalaryScale === 1) ?? false);
  check("R2 boardMode classic", loaded?.boardMode === "classic");
  check("R2 plan null", loaded?.plan === null);

  // plan rejimidagi saqlanma saqlanadi
  const gp = makeGame([mk(0)], "plan", "classic");
  gp.plan!.days[0] = planOf(10);
  gp.plan!.executing = 3;
  store[SAVE_KEY] = JSON.stringify(gp);
  const loadedPlan = loadSave();
  check("R2 plan rejimi saqlanadi", loadedPlan?.boardMode === "plan" && loadedPlan.plan !== null);
  check("R2 plan kunlari saqlanadi", (loadedPlan?.plan?.days[0]?.length ?? 0) === PLAN_DAYS);

  // kelajak versiya rad etiladi
  const future = JSON.parse(JSON.stringify(gp)) as { version: number };
  future.version = 21;
  store[SAVE_KEY] = JSON.stringify(future);
  check("R2 v21 (kelajak) rad etiladi", loadSave() === null);
}

console.log(failures === 0 ? "\nBARCHA TESTLAR O'TDI ✅" : `\n${failures} TA TEST XATO ❌`);
process.exit(failures === 0 ? 0 : 1);
