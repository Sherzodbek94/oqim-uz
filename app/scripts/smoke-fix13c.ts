/**
 * OQIM — fix-13c smoke test:
 *  Q1 Tez rejim: 2-zar diapazoni (2..12), boshlang'ich naqd ×1,5, streak 1 escape,
 *     classic rejim o'zgarmagan (1 zar, streak 2), makeGame mode default;
 *  Q3 Aktiv risklari: yomon oy (forced rand → cashflow 0, 1 oy), inqiroz (×0,5, 3 oy),
 *     modifikatorlarning tugashi, sabablar rotatsiyasi;
 *  Q4 Bot reyting: beatenBots yozuvi (bot birinchi chiqsa — yengilmagan), Usta yutug'i;
 *  Save v15 migratsiyasi: mode default "classic".
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix13c.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix13c.mjs && node /tmp/smoke-fix13c.mjs
 */
import {
  applyPayday,
  assetCashflow,
  canEscape,
  completeMonth,
  diceTotal,
  freedomStage,
  makeGame,
  makePlayer,
  passiveIncome,
  rollDice,
  splitExpenses,
  streakNeeded,
} from "@/lib/game/engine";
import { loadSave } from "@/lib/game/save";
import { buildRecord, computeAchievements, computeBotRivalry, isUsta, type GameRecord } from "@/lib/profile";
import { PROFESSIONS } from "@/lib/game/data";
import { SAVE_KEY, TEZ_CASH_MULT, type Asset, type GameState, type Player } from "@/lib/game/types";

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

function mk(name = "Test"): Player {
  const p = makePlayer(0, name, PROFESSIONS[0], {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
  });
  p.loans = [];
  p.installments = [];
  p.assets = [];
  p.portfolio = [];
  p.clients = [];
  p.expenseParts = splitExpenses(1_000_000);
  p.salary = 5_000_000;
  p.cash = 100_000_000;
  return p;
}

function mkAsset(over: Partial<Asset>): Asset {
  return {
    id: over.id ?? "a1",
    title: over.title ?? "Test biznes",
    kind: "business",
    icon: "🏪",
    price: 10_000_000,
    paid: 10_000_000,
    monthlyCashflow: 2_000_000,
    ...over,
  };
}

/* ================= Q1 — Tez rejim ================= */

// (a) 2 zar diapazoni
let minSum = 99;
let maxSum = -1;
for (let i = 0; i < 500; i++) {
  const d = rollDice(2);
  const t = diceTotal(d, 2);
  minSum = Math.min(minSum, t);
  maxSum = Math.max(maxSum, t);
  if (d[0] < 1 || d[0] > 6 || d[1] < 1 || d[1] > 6) check("zar chegaradan chiqdi", false, d);
}
check("Q1: 2 zar yig'indisi 2..12 ichida", minSum >= 2 && maxSum <= 12, { minSum, maxSum });
check("Q1: 2 zar diapazoni to'liq qamrab olindi", minSum === 2 && maxSum === 12, { minSum, maxSum });
check("Q1: 1 zar rejimida ikkinchi zar 0", rollDice(1)[1] === 0);

// (b) boshlang'ich naqd ×1,5
const prof = PROFESSIONS[0];
const classicP = makePlayer(0, "A", prof, { isBot: false, personality: null, colorIndex: 0, dreamId: "d1" });
const tezP = makePlayer(1, "B", prof, {
  isBot: false,
  personality: null,
  colorIndex: 1,
  dreamId: "d1",
  cashMult: TEZ_CASH_MULT,
});
check("Q1: tez boshlang'ich naqd ×1,5", tezP.cash === Math.round(prof.savings * 1.5), { tezP: tezP.cash, base: prof.savings });
check("Q1: classic naqd o'zgarmagan", classicP.cash === prof.savings);

// (c) streak talabi
check("Q1: streakNeeded classic = 2", streakNeeded("classic") === 2);
check("Q1: streakNeeded tez = 1", streakNeeded("tez") === 1);
check("Q1: streakNeeded default (undefined) = 2", streakNeeded() === 2);

const esc = mk();
esc.cash = 1_000_000; // zaxira yo'li yopiq — faqat streak orqali
esc.assets = [mkAsset({ id: "a1" }), mkAsset({ id: "a2", title: "Ikkinchi" })];
esc.escapeStreak = 1;
check(
  "Q1: tez rejimda streak 1 → Bosqich 3",
  freedomStage(esc, { mode: "tez" }) === 3 && canEscape(esc, null, undefined, "tez"),
  freedomStage(esc, { mode: "tez" })
);
check("Q1: classic rejimda streak 1 → Bosqich 3 emas", freedomStage(esc) !== 3, freedomStage(esc));
esc.escapeStreak = 2;
check("Q1: classic rejimda streak 2 → Bosqich 3", freedomStage(esc) === 3);

// makeGame mode
check("Q1: makeGame default mode classic", makeGame([classicP]).mode === "classic");
check("Q1: makeGame tez mode", makeGame([tezP], "classic", "tez").mode === "tez");
check("Q1: makeGame version 20", makeGame([classicP]).version === 20);

/* ================= Q3 — Aktiv risklari ================= */

const rp = mk();
const riskAsset = mkAsset({ id: "r1", title: "Restoran", riskLevel: 4 });
const safeAsset = mkAsset({ id: "s1", title: "Depozit" });
rp.assets = [riskAsset, safeAsset];
const rs: GameState = makeGame([rp]);
rs.players = [rp];
const forcedRand = () => 0; // har doim "tushadi"
const mres = completeMonth(rs, forcedRand);
check(
  "Q3: yomon oy voqeasi ro'yxatda",
  mres.risk.some((e) => e.kind === "yomon" && e.assetTitle === "Restoran"),
  mres.risk
);
check(
  "Q3: past riskli aktiv tegmadi",
  !mres.risk.some((e) => e.assetTitle === "Depozit")
);
check(
  "Q3: yomon oy modifikatori (0 × 1 oy)",
  rp.assetModifiers.some((m) => m.assetId === "r1" && m.multiplier === 0 && m.monthsRemaining === 1),
  rp.assetModifiers
);
check("Q3: yomon oyda cashflow 0", assetCashflow(rp, riskAsset) === 0, assetCashflow(rp, riskAsset));
check("Q3: sabab matni mavjud", !!mres.risk.find((e) => e.kind === "yomon")?.reason, mres.risk);
check(
  "Q3: bildirishnoma yozildi",
  rs.notifications.some((n) => n.title === "Aktiv riski" && n.body.includes("Restoran")),
  rs.notifications
);
check(
  "Q3: hech qachon tushmaydigan rand → voqea yo'q",
  (() => {
    const p2 = mk("Sokin");
    p2.assets = [mkAsset({ id: "r9", riskLevel: 5, risky: true })];
    const s2 = makeGame([p2]);
    s2.players = [p2];
    return completeMonth(s2, () => 0.9999).risk.length === 0;
  })()
);

// inqiroz: risky aktiv, riskLevel yo'q
const cp = mk("Riskli");
const crisisAsset = mkAsset({ id: "c1", title: "Kriptoferma", risky: true });
cp.assets = [crisisAsset];
const cs: GameState = makeGame([cp]);
cs.players = [cp];
const cres = completeMonth(cs, forcedRand);
check("Q3: inqiroz voqeasi", cres.risk.some((e) => e.kind === "inqiroz" && e.assetTitle === "Kriptoferma"), cres.risk);
check(
  "Q3: inqiroz modifikatori (×0,5 × 3 oy)",
  cp.assetModifiers.some((m) => m.assetId === "c1" && m.multiplier === 0.5 && m.monthsRemaining === 3),
  cp.assetModifiers
);
check(
  "Q3: inqirozda cashflow yarmiga tushdi",
  assetCashflow(cp, crisisAsset) === Math.round(2_000_000 * 0.5),
  assetCashflow(cp, crisisAsset)
);

// inqiroz muddati: 3 oy kun davomida yarim, keyin tiklanadi
cp.salary = 0;
cp.expenseParts = splitExpenses(0);
cp.cash = 10_000_000;
const halved = Math.round(2_000_000 * 0.5);
for (let oy = 1; oy <= 3; oy++) {
  check(`Q3: inqiroz ${oy}-oyda faol`, passiveIncome(cp) === halved, passiveIncome(cp));
  applyPayday(cp, null, undefined);
}
check("Q3: inqiroz 3 oydan keyin tugadi", passiveIncome(cp) === 2_000_000, passiveIncome(cp));

// yomon oy 1 oyda tugaydi
rp.salary = 0;
rp.expenseParts = splitExpenses(0);
applyPayday(rp, null, undefined);
check("Q3: yomon oy modifikatori 1 oyda tugadi", assetCashflow(rp, riskAsset) === 2_000_000, assetCashflow(rp, riskAsset));

/* ================= Q4 — Bot reyting ================= */

function mkBot(id: number, personality: "cautious" | "balanced" | "bold"): Player {
  const b = makePlayer(id, `Bot${id}`, PROFESSIONS[1], {
    isBot: true,
    personality,
    colorIndex: (id % 4) as 0 | 1 | 2 | 3,
    dreamId: "d1",
  });
  return b;
}

const human = mk("Inson");
const botA = mkBot(1, "cautious");
const botB = mkBot(2, "bold");
const gs = makeGame([human, botA, botB]);
human.escapeTurn = 5;
botA.escapeTurn = null; // hech chiqmagan → yengilgan
botB.escapeTurn = 3; // insondan oldin chiqqan → yengilmagan (bot win)
const rec = buildRecord(gs, human);
check("Q4: bots ro'yxati yozildi", rec.bots?.join(",") === "cautious,bold", rec.bots);
check("Q4: beatenBots faqat oldindan chiqilmagan bot", rec.beatenBots?.join(",") === "cautious", rec.beatenBots);

// bot-win holati: inson umuman chiqmagan → hech kim yengilmagan
const human2 = mk("Yutqazgan");
const botC = mkBot(1, "balanced");
const gs2 = makeGame([human2, botC]);
botC.escapeTurn = 4;
const rec2 = buildRecord(gs2, human2);
check("Q4: bot birinchi chiqsa — beatenBots bo'sh", (rec2.beatenBots ?? []).length === 0, rec2.beatenBots);

// Usta yutug'i: 3 xarakterning har biri kamida bir marta yengilgan
const g = (beaten: string[], bots = beaten): GameRecord => ({
  date: "2025-01-01",
  heroName: "T",
  profession: "T",
  quadrantStart: "E",
  quadrantEnd: "E",
  won: true,
  escapeMonth: 10,
  endMonth: 12,
  winPath: "cashflow",
  maxPassive: 0,
  minCredit: 650,
  maxCredit: 650,
  bankruptcies: 0,
  maxKnowledge: 1,
  bots,
  beatenBots: beaten,
});
const partial = [g(["cautious"]), g(["bold"])];
check("Q4: 2/3 yengilganda Usta yo'q", !isUsta(partial));
const full = [...partial, g(["balanced"])];
check("Q4: 3/3 yengilganda Usta", isUsta(full));
const ach = computeAchievements(full);
check(
  "Q4: Usta yutug'i ochildi",
  ach.some((a) => a.id === "usta" && a.unlocked),
  ach.find((a) => a.id === "usta")
);
check(
  "Q4: Usta yutug'i yopiqligicha qoladi (2/3)",
  !computeAchievements(partial).find((a) => a.id === "usta")!.unlocked
);

// rivalry hisobi
const rivalry = computeBotRivalry([g(["cautious"]), g([], ["cautious"]), g(["bold"])]);
check(
  "Q4: cautious 1G/1M",
  rivalry.find((r) => r.personality === "cautious")?.wins === 1 &&
    rivalry.find((r) => r.personality === "cautious")?.losses === 1,
  rivalry
);
check("Q4: balanced 0/0 (uchrashmagan)", (() => { const r = rivalry.find((x) => x.personality === "balanced")!; return r.wins === 0 && r.losses === 0; })());

/* ================= Save v15 migratsiyasi ================= */

const oldSave = JSON.parse(JSON.stringify(makeGame([mk("Eski")]))) as Record<string, unknown>;
oldSave.version = 14;
delete oldSave.mode;
store[SAVE_KEY] = JSON.stringify(oldSave);
const loaded = loadSave();
check("v15: eski saqlanma yuklanadi", loaded !== null);
check("v15: mode default classic", loaded?.mode === "classic", loaded?.mode);
check("v15: version 20 ga ko'tarildi", loaded?.version === 20);

console.log(failures === 0 ? "\nALL OK (smoke-fix13c)" : `\n${failures} FAILURES`);
if (failures > 0) process.exit(1);
