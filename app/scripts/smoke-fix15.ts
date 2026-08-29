/**
 * OQIM — fix-15 smoke test:
 *  P1 Katalog integriteti: barcha kasblar (PROFESSIONS) va qahramonlar (HEROES)
 *     to'liq maydonlarga ega (katalog kartalari uchun).
 *  P2 Qiyinlik: professionDifficulty bucketlari (🟢/🟡/🔴) + makePlayer
 *     boshlang'ich naqd/maosh modifikatorlari (Oson ×1,3; Qiyin ×0,8 va ×0,95).
 *  P3 Farzand oraliq: 24 oydan oldin blok, 24+ oyda ruxsat; MAX_CHILDREN to'y.
 *  P4 Farzand hayot tsikli: tug'ilish → 3 yosh bog'cha tanlovi (childEduCost),
 *     7 yosh maktab bog'chani almashtiradi; totalExpenses childEduCost'ni o'z
 *     ichiga oladi; save v14→v17 migratsiyasi (children → children2, 0–6 yosh).
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix15.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix15.mjs && node /tmp/smoke-fix15.mjs
 */
import {
  BABY_MIN_GAP_MONTHS,
  CHILD_COST,
  CHILD_EDU_COSTS,
  MAX_CHILDREN,
  type GameState,
  type Player,
} from "@/lib/game/types";
import {
  applyBaby,
  baseExpenses,
  childEduCost,
  childEduMonthly,
  completeMonth,
  makeGame,
  makePlayer,
  professionDifficulty,
  resolveChildEvent,
  totalExpenses,
} from "@/lib/game/engine";
import { HEROES, heroToProfession } from "@/lib/game/heroes";
import { PROFESSIONS } from "@/lib/game/data";
import { loadSave } from "@/lib/game/save";
import { SAVE_KEY } from "@/lib/game/types";

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

function mk(): Player {
  const p = makePlayer(0, "Test", PROFESSIONS[0], {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
  });
  p.loans = [];
  p.installments = [];
  return p;
}

/* ---------- P1. Katalog integriteti ---------- */
{
  check("P1: kasblar mavjud (≥10)", PROFESSIONS.length >= 10, PROFESSIONS.length);
  const fields = new Set<string>();
  let ok = true;
  for (const pr of PROFESSIONS) {
    fields.add(pr.field);
    if (
      !pr.id ||
      !pr.name ||
      !pr.avatar ||
      !pr.field ||
      typeof pr.flavor !== "string" ||
      !(pr.salary > 0) ||
      !(pr.expenses > 0) ||
      !(pr.savings >= 0) ||
      !(pr.loanPayment >= 0) ||
      !Array.isArray(pr.loans)
    ) {
      ok = false;
      console.error("  buzilgan kasb:", pr.id);
    }
  }
  check("P1: barcha kasblarda majburiy maydonlar", ok);
  check("P1: kasb id'lari unikal", new Set(PROFESSIONS.map((p) => p.id)).size === PROFESSIONS.length);
  check("P1: qahramonlar mavjud (≥8)", HEROES.length >= 8, HEROES.length);
  let hok = true;
  for (const h of HEROES) {
    const prof = heroToProfession(h);
    if (!h.id || !h.name || !h.avatar || !h.ability?.name || !h.ability?.desc || !(prof.salary > 0)) hok = false;
  }
  check("P1: barcha qahramonlarda qobiliyat + moliya", hok);
}

/* ---------- P2. Qiyinlik darajasi ---------- */
{
  // 🟢 Oson: cf ≥15% va zaxira ≥3 oy
  const easy = professionDifficulty({ salary: 10_000_000, expenses: 5_000_000, loanPayment: 0, savings: 20_000_000 });
  check("P2: 🟢 Oson (cf 50%, zaxira 4 oy)", easy === "easy", easy);
  // 🟡 O'rta: cf 12%, zaxira 2 oy
  const mid = professionDifficulty({ salary: 10_000_000, expenses: 7_600_000, loanPayment: 1_200_000, savings: 17_600_000 });
  check("P2: 🟡 O'rta (cf 12%, zaxira 2 oy)", mid === "medium", mid);
  // 🔴 Qiyin: cf < 8%
  const hardCf = professionDifficulty({ salary: 10_000_000, expenses: 8_000_000, loanPayment: 1_500_000, savings: 100_000_000 });
  check("P2: 🔴 Qiyin (cf 5%, zaxira katta bo'lsa ham)", hardCf === "hard", hardCf);
  // 🔴 Qiyin: zaxira < 1 oy
  const hardSav = professionDifficulty({ salary: 10_000_000, expenses: 5_000_000, loanPayment: 0, savings: 2_000_000 });
  check("P2: 🔴 Qiyin (zaxira 0,4 oy)", hardSav === "hard", hardSav);

  // makePlayer modifikatorlari
  const prof = PROFESSIONS[0];
  const base = makePlayer(0, "B", prof, { isBot: false, personality: null, colorIndex: 0, dreamId: "d1" });
  const ez = makePlayer(0, "E", prof, { isBot: false, personality: null, colorIndex: 0, dreamId: "d1", difficulty: "easy", startCashMult: 1.3 });
  const hd = makePlayer(0, "H", prof, { isBot: false, personality: null, colorIndex: 0, dreamId: "d1", difficulty: "hard", startCashMult: 0.8, salaryMult: 0.95 });
  check("P2: Oson — boshlang'ich naqd +30%", ez.cash === Math.round(prof.savings * 1.3), ez.cash);
  check("P2: Oson — maosh o'zgarmagan", ez.salary === prof.salary, ez.salary);
  check("P2: Qiyin — boshlang'ich naqd −20%", hd.cash === Math.round(prof.savings * 0.8), hd.cash);
  check("P2: Qiyin — maosh −5% (past stavka)", hd.salary === Math.round(prof.salary * 0.95), hd.salary);
  check("P2: default — modifikatorsiz", base.cash === prof.savings && base.salary === prof.salary);
  check("P2: difficulty Player'da saqlanadi", ez.difficulty === "easy" && hd.difficulty === "hard" && base.difficulty === "medium");
}

/* ---------- P3. Farzand oraliq 2–3 yil (min 24 oy) ---------- */
{
  const p = mk();
  const r1 = applyBaby(p, 1);
  check("P3: birinchi farzand tug'ildi", r1.kind === "baby" && p.children === 1 && p.children2.length === 1, r1.kind);
  check("P3: lastBabyMonth yangilandi", p.lastBabyMonth === 1, p.lastBabyMonth);
  const r2 = applyBaby(p, 12);
  check("P3: 11 oy o'tgach bloklangan (gap)", r2.kind === "gap" && p.children === 1, r2.kind);
  const r3 = applyBaby(p, 1 + BABY_MIN_GAP_MONTHS - 1);
  check("P3: 23 oyda ham bloklangan", r3.kind === "gap", r3.kind);
  const r4 = applyBaby(p, 1 + BABY_MIN_GAP_MONTHS);
  check("P3: 24 oyda ruxsat", r4.kind === "baby" && p.children === 2, r4.kind);
  // MAX_CHILDREN: to'y
  p.children = MAX_CHILDREN;
  const r5 = applyBaby(p, 500);
  check("P3: MAX_CHILDREN'da to'y (−1 mln)", r5.kind === "feast" && r5.cost === 1_000_000, r5.kind);
}

/* ---------- P4. Farzandlar hayot tsikli ---------- */
{
  const p = mk();
  p.children = 1;
  p.children2 = [{ bornMonth: 0, edu: "none" }];
  const s: GameState = makeGame([p]);
  s.month = 35;

  const exp0 = totalExpenses(p);
  check("P4: boshlang'ich xarajat = bazaviy + bola 800k", exp0 === p.expenseParts.taxes + p.expenseParts.housing + p.expenseParts.food + p.expenseParts.transport + p.expenseParts.other + CHILD_COST, exp0);

  completeMonth(s); // month 36 → 3 yosh
  check("P4: 3 yoshda bog'cha tanlovi navbatda", p.pendingChildEvent?.stage === "kg" && p.pendingChildEvent?.childIndex === 0, p.pendingChildEvent);
  check("P4: 3 yosh bildirishnomasi", s.notifications.some((n) => n.title.includes("3 yosh")), s.notifications[0]?.title);
  check("P4: offeredKg belgilandi (bir martalik)", p.children2[0].offeredKg === true);

  resolveChildEvent(p, "kg-state");
  check("P4: bog'cha tanlovi qo'llandi", p.pendingChildEvent === null && p.children2[0].edu === "kg-state");
  check("P4: childEduCost = 400k", childEduCost(p) === 400_000, childEduCost(p));
  // izoh: month 36 maosh indeksatsiyasini ham ishga tushirdi — baseExpenses'dan hisoblaymiz
  check(
    "P4: totalExpenses childEduCost'ni o'z ichiga oladi",
    totalExpenses(p) === baseExpenses(p) + CHILD_COST + 400_000,
    totalExpenses(p)
  );

  // keyingi oylar: bog'cha takroran taklif qilinmaydi
  s.month = 40;
  completeMonth(s);
  check("P4: bog'cha taklif qilinmaydi (bir martalik)", p.pendingChildEvent === null, p.pendingChildEvent);

  // 7 yosh — maktab
  s.month = 83;
  completeMonth(s); // month 84
  check("P4: 7 yoshda maktab tanlovi navbatda", p.pendingChildEvent?.stage === "school", p.pendingChildEvent);
  check("P4: 7 yosh bildirishnomasi", s.notifications.some((n) => n.title.includes("7 yosh")));
  resolveChildEvent(p, "sch-plus");
  check("P4: maktab tanlovi qo'llandi", p.children2[0].edu === "sch-plus");
  check(
    "P4: bog'cha xarajati to'xtadi, maktab (+800k) almashtirdi",
    childEduCost(p) === 800_000 && childEduMonthly(p.children2[0]) === CHILD_EDU_COSTS["sch-plus"],
    childEduCost(p)
  );
  check("P4: totalExpenses = bazaviy + bola + maktab", totalExpenses(p) === baseExpenses(p) + CHILD_COST + 800_000, totalExpenses(p));

  // xususiy bog'cha narxi
  check("P4: kg-private 1,2 mln", CHILD_EDU_COSTS["kg-private"] === 1_200_000);
  check("P4: sch-private 2,5 mln", CHILD_EDU_COSTS["sch-private"] === 2_500_000);
}

/* ---------- P4. Save migratsiyasi v14 → v17 (children → children2) ---------- */
{
  const p = mk();
  p.children = 2;
  const legacy = JSON.parse(JSON.stringify(makeGame([p]))) as Record<string, unknown>;
  legacy.version = 14;
  legacy.month = 100;
  const pl = (legacy.players as Record<string, unknown>[])[0];
  delete pl.children2;
  delete pl.lastBabyMonth;
  delete pl.pendingChildEvent;
  delete pl.difficulty;
  pl.children = 2;
  store[SAVE_KEY] = JSON.stringify(legacy);
  const loaded = loadSave();
  check("P4: eski saqlanma yuklandi", loaded !== null);
  check("P4: versiya 20 ga ko'tarildi (fix-18: v20)", loaded?.version === 20, loaded?.version);
  const lp = loaded!.players[0];
  check("P4: children2 tiklandi (2 bola)", Array.isArray(lp.children2) && lp.children2.length === 2, lp.children2?.length);
  // yoshlar 0–6 tekis: 2 bola → 0 va 6 yosh → bornMonth 100 va 28
  check(
    "P4: yoshlar 0–6 tekis taqsimlangan",
    lp.children2[0].bornMonth === 100 && lp.children2[1].bornMonth === 28,
    lp.children2.map((c) => c.bornMonth)
  );
  check("P4: migratsiyada edu 'none'", lp.children2.every((c) => c.edu === "none"));
  check("P4: lastBabyMonth default", lp.lastBabyMonth === -24, lp.lastBabyMonth);
  check("P4: difficulty default 'medium'", lp.difficulty === "medium", lp.difficulty);
  check("P4: pendingChildEvent default null", lp.pendingChildEvent === null);
  // migratsiyadan keyin hayot tsikli ishlaydi: 6 yoshli bola (bornMonth 28) 7 yoshga 112-oyda to'ladi
  const s2 = loaded!;
  s2.month = 111;
  completeMonth(s2); // month 112 → 2-bola 84 oylik
  check("P4: migratsiyadan keyin 7 yosh maktab taklifi", lp.pendingChildEvent?.stage === "school" && lp.pendingChildEvent.childIndex === 1, lp.pendingChildEvent);
}

console.log(failures === 0 ? "\nALL OK (fix-15)" : `\n${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
