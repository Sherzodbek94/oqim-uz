/**
 * OQIM — fix-18 smoke test: ikki rejim qayta loyihasi.
 *  E1 Haftalik reja validatsiyasi: 5 kunlik segment, boshqa haftalar ta'sir qilmaydi.
 *  E2 Hafta ketma-ketligi: weekOfDay/weekStartDay to'g'ri, autofillPlanWeek faqat joriy haftani to'ldiradi.
 *  E3 planSalaryScale haftalik segmentlar bo'yicha to'g'ri (kumulyativ) hisoblanadi.
 *  E4 Bot rejasi hali ham 20 kunlik to'liq va valid (generateBotPlan o'zgarmagan).
 *  G1 Path dvijogi regression: generatePath/choosePathNode/fogDepth o'zgarmagan.
 *  S1 Save migratsiya: v19 → v20 (planWeekIdx default 0), yangi o'yin version 20.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix18.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix18.cjs --format=cjs && node /tmp/smoke-fix18.cjs
 */
import { SAVE_KEY, type GameState, type Player } from "@/lib/game/types";
import { completeMonth, makeGame, makePlayer } from "@/lib/game/engine";
import {
  DAYS_PER_WEEK,
  PLAN_DAYS,
  WEEKS_PER_MONTH,
  autofillPlanWeek,
  generateBotPlan,
  makeEmptyPlan,
  planSalaryScale,
  planWorkDays,
  validatePlan,
  validatePlanWeek,
  weekOfDay,
  weekStartDay,
  type PlanDay,
  type PlanTile,
} from "@/lib/game/plan";
import {
  PATH_LAYERS,
  choosePathNode,
  fogDepth,
  generatePath,
  reachableNodes,
} from "@/lib/game/path";
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

/* ---------- E1: haftalik validatsiya ---------- */
{
  check("E1 konstantalar: 4 hafta × 5 kun = 20", WEEKS_PER_MONTH * DAYS_PER_WEEK === PLAN_DAYS);
  const empty = makeEmptyPlan();
  check("E1 bo'sh reja: 1-hafta valid emas", !validatePlanWeek(empty, 0));
  const week1 = empty.map((d, i) => (i < DAYS_PER_WEEK ? { tile: "work" as PlanTile, done: false } : d));
  check("E1 5 kun to'ldirilgan 1-hafta valid", validatePlanWeek(week1, 0));
  check("E1 1-hafta to'liq, lekin 2-hafta valid emas", !validatePlanWeek(week1, 1));
  check("E1 4/5 kun valid emas", !validatePlanWeek(week1.map((d, i) => (i === 4 ? { tile: null, done: false } : d)), 0));
  // 2-hafta segmenti: 5..9 indekslar
  const week2 = planOf(10);
  check("E1 2-hafta segmenti valid", validatePlanWeek(week2, 1));
  const week2broken = week2.map((d, i) => (i === 7 ? { tile: null, done: false } : d));
  check("E1 2-haftada bitta bo'sh kun — valid emas", !validatePlanWeek(week2broken, 1));
  check("E1 noto'g'ri hafta indeksi rad etiladi", !validatePlanWeek(week2, 4) && !validatePlanWeek(week2, -1));
  // o'tgan hafta null bo'lsa ham joriy hafta validatsiyasi mustaqil
  const onlyWeek3 = makeEmptyPlan().map((d, i) =>
    i >= 10 && i < 15 ? { tile: "work" as PlanTile, done: false } : d
  );
  check("E1 3-hafta mustaqil valid (oldingi haftalar bo'sh bo'lsa ham)", validatePlanWeek(onlyWeek3, 2));
  // butun oy validatsiyasi o'zgarmagan
  check("E1 to'liq 20 kun hali ham validatePlan'dan o'tadi", validatePlan(planOf(12)));
}

/* ---------- E2: hafta ketma-ketligi ---------- */
{
  check("E2 weekOfDay chegaralari", weekOfDay(0) === 0 && weekOfDay(4) === 0 && weekOfDay(5) === 1 && weekOfDay(19) === 3);
  check("E2 weekStartDay", weekStartDay(0) === 0 && weekStartDay(1) === 5 && weekStartDay(3) === 15);
  const base = makeEmptyPlan();
  // 1-hafta bajarilgan (done), 2-hafta bo'sh
  for (let i = 0; i < 5; i++) base[i] = { tile: "work", done: true };
  const filled = autofillPlanWeek(base, 1);
  check("E2 autofill faqat 2-haftani to'ldiradi", filled.slice(5, 10).every((d) => d.tile === "rest"));
  check("E2 autofill o'tgan haftaga tegmaydi", filled.slice(0, 5).every((d) => d.tile === "work" && d.done));
  check("E2 autofill kelasi haftalarga tegmaydi", filled.slice(10).every((d) => d.tile === null));
}

/* ---------- E3: planSalaryScale haftalik kumulyativ ---------- */
{
  // ssenariy: 1-hafta 3 ish kuni, 2-hafta 2 ish kuni → hozircha 5/20 = 0.25
  const days = makeEmptyPlan();
  for (let i = 0; i < 3; i++) days[i] = { tile: "work", done: true };
  for (let i = 3; i < 5; i++) days[i] = { tile: "rest", done: true };
  for (let i = 5; i < 7; i++) days[i] = { tile: "work", done: false };
  for (let i = 7; i < 10; i++) days[i] = { tile: "knowledge", done: false };
  check("E3 kumulyativ ish kunlari", planWorkDays(days) === 5);
  check("E3 kumulyativ scale 5/20", planSalaryScale(days) === 5 / 20);
  // to'liq oy: 12 ish kuni
  const full = planOf(12);
  check("E3 to'liq oy scale 12/20", planSalaryScale(full) === 12 / 20);
  // haftalar kesimida ham to'g'ri
  let wsum = 0;
  for (let w = 0; w < WEEKS_PER_MONTH; w++) {
    wsum += planWorkDays(full.slice(weekStartDay(w), weekStartDay(w) + DAYS_PER_WEEK));
  }
  check("E3 haftalik ish kunlari yig'indisi = oylik", wsum === planWorkDays(full));
  // completeMonth: planWeekIdx reset
  const g = makeGame([mk(0)], "plan", "classic");
  g.players[0].planWeekIdx = 2;
  completeMonth(g, seeded(1));
  check("E3 oy yakunida planWeekIdx 0 ga qaytariladi", g.players[0].planWeekIdx === 0);
}

/* ---------- E4: bot rejasi o'zgarmagan ---------- */
{
  for (const personality of ["cautious", "balanced", "bold"] as const) {
    const bot = mk(1, personality);
    const plan = generateBotPlan(bot, seeded(7));
    check(`E4 bot rejasi 20 kunlik valid (${personality})`, validatePlan(plan) && plan.length === PLAN_DAYS);
  }
  const cautious = generateBotPlan(mk(1, "cautious"), seeded(3));
  const bold = generateBotPlan(mk(2, "bold"), seeded(3));
  check("E4 ehtiyotkor bot ko'proq ishlaydi", planWorkDays(cautious) > planWorkDays(bold));
}

/* ---------- G1: path dvijogi regression ---------- */
{
  for (const seed of [1, 2, 3]) {
    const rand = seeded(seed * 1000 + 7);
    const path = generatePath(rand);
    check(`G1 s${seed}: ${PATH_LAYERS} qatlam`, path.nodes.length === PATH_LAYERS);
    check(`G1 s${seed}: har qatlam 2–3 tugun`, path.nodes.every((r) => r.length >= 2 && r.length <= 3));
    // barcha tugunlar yetib boriladi (BFS)
    let frontier = reachableNodes(path, { layer: -1, node: 0 });
    const seen = new Set<string>(frontier.map((r) => `${r.layer}-${r.node}`));
    while (frontier.length) {
      const next: typeof frontier = [];
      for (const f of frontier) {
        for (const l of path.nodes[f.layer][f.node].links) {
          const key = `${f.layer + 1}-${l}`;
          if (!seen.has(key)) {
            seen.add(key);
            next.push({ layer: f.layer + 1, node: l, data: path.nodes[f.layer + 1][l] });
          }
        }
      }
      frontier = next;
    }
    const total = path.nodes.reduce((a, r) => a + r.length, 0);
    check(`G1 s${seed}: barcha tugunlar yetib boriladi`, seen.size === total, `${seen.size}/${total}`);
    // choosePathNode: startdan faqat 0-qatlam
    check(`G1 s${seed}: 1-qatlam startdan rad etiladi`, choosePathNode(path, 0, 1, 0) === null);
    const first = choosePathNode(path, 0, 0, 0);
    check(`G1 s${seed}: 0-qatlam tanlanadi`, first !== null && path.positions[0].layer === 0 && path.steps === 1);
  }
  check("G1 fogDepth o'zgarmagan", fogDepth(0) === 1 && fogDepth(2) === 2 && fogDepth(5) === 3 && fogDepth(-3) === 1);
}

/* ---------- S1: save migratsiya v19 → v20 ---------- */
{
  const g = makeGame([mk(0), mk(1, "cautious")], "plan", "classic") as unknown as { version: number };
  g.version = 19; // eski saqlanma
  for (const p of (g as unknown as GameState).players) {
    delete (p as Partial<Player>).planWeekIdx;
  }
  store[SAVE_KEY] = JSON.stringify(g);
  const loaded = loadSave();
  check("S1 v19 saqlanma yuklanadi", loaded !== null);
  check("S1 versiya 20 ga ko'tarildi", loaded?.version === 20);
  check("S1 planWeekIdx default 0", loaded?.players.every((p) => p.planWeekIdx === 0) ?? false);
  check("S1 plan rejimi saqlanadi", loaded?.boardMode === "plan" && loaded.plan !== null);
  // yangi o'yin to'g'ridan-to'g'ri v20
  const fresh = makeGame([mk(0)], "classic", "classic");
  check("S1 yangi o'yin version 20", fresh.version === 20);
  check("S1 yangi o'yinchi planWeekIdx 0", fresh.players[0].planWeekIdx === 0);
}

console.log(failures === 0 ? "\n✅ smoke-fix18: barcha tekshiruvlar o'tdi" : `\n❌ smoke-fix18: ${failures} ta xato`);
process.exit(failures === 0 ? 0 : 1);
