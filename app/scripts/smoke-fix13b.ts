/**
 * OQIM — fix-13b smoke test:
 *  M1 Moliyaviy ustoz: qarz yuki (>60%) darsi, yotgan naqd (2 oy) darsi, birinchi aktiv,
 *     diversifikatsiya (3 bir xil tur), bir-o'yin-dedupe, bir vaqtda bir nechta dars (navbat),
 *     completeMonth idleCashMonths hisoblagichi;
 *  M2 versiya: whatsNewFor mantiq + localStorage roundtrip (readLastVersion/markVersionSeen);
 *  Save v14 migratsiyasi: lessonsSeen / idleCashMonths defaultlari.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix13b.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix13b.mjs && node /tmp/smoke-fix13b.mjs
 */
import {
  createLoan,
  debtLoad,
  makeGame,
  makePlayer,
  splitExpenses,
  completeMonth,
  totalExpenses,
} from "@/lib/game/engine";
import { checkMentor, LESSON_BY_ID, LESSONS } from "@/lib/game/mentor";
import { PROFESSIONS } from "@/lib/game/data";
import { APP_CHANGELOG, APP_VERSION, VERSION_KEY, markVersionSeen, readLastVersion, whatsNewFor } from "@/lib/version";
import { loadSave } from "@/lib/game/save";
import type { Asset, GameState, Player } from "@/lib/game/types";

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
  p.assets = [];
  p.portfolio = [];
  p.expenseParts = splitExpenses(1_000_000);
  p.salary = 5_000_000;
  p.cash = 0;
  return p;
}

function mkState(p: Player): GameState {
  const s = makeGame([p]);
  return s;
}

function mkAsset(kind: Asset["kind"], n: number): Asset {
  return {
    id: `a-${kind}-${n}`,
    title: `Test aktiv ${n}`,
    kind,
    icon: "briefcase",
    price: 1_000_000,
    paid: 1_000_000,
    monthlyCashflow: 100_000,
  };
}

/* ---------- M1.1 Qarz yuki > 60% → "qarz-qarmogi" ---------- */
{
  const p = mk();
  // maosh 5 mln; kredit to'lovi ~4 mln/oy → debtLoad > 60%
  p.loans = [createLoan("l1", "Katta kredit", 100_000_000, 0.03, 36)];
  check("M1: debtLoad > 60% sintetik holat", debtLoad(p) > 0.6, debtLoad(p));
  const s = mkState(p);
  const fired = checkMentor(s, p, { kind: "month" });
  check(
    "M1: debtLoad>60% → qarz-qarmogi darsi",
    fired.some((l) => l.id === "qarz-qarmogi"),
    fired.map((l) => l.id)
  );
  check("M1: 🎓 bildirishnoma yozildi", s.notifications.some((n) => n.icon === "🎓"));
}

/* ---------- M1.2 Yotgan naqd 2 oy → "pul-yotirmasi" ---------- */
{
  const p = mk();
  p.cash = 10_000_000; // > 3× 1 mln xarajat
  p.idleCashMonths = 2;
  const s = mkState(p);
  const fired = checkMentor(s, p, { kind: "month" });
  check(
    "M1: idleCashMonths>=2 → pul-yotirmasi darsi",
    fired.some((l) => l.id === "pul-yotirmasi"),
    fired.map((l) => l.id)
  );
  // 1 oyda chiqmaydi
  const q = mk();
  q.cash = 10_000_000;
  q.idleCashMonths = 1;
  const fired1 = checkMentor(mkState(q), q, { kind: "month" });
  check("M1: idleCashMonths=1 → pul-yotirmasi chiqmaydi", !fired1.some((l) => l.id === "pul-yotirmasi"));
}

/* ---------- M1.3 Birinchi aktiv → "aktiv-passiv" ---------- */
{
  const p = mk();
  p.assets = [mkAsset("business", 1)];
  const fired = checkMentor(mkState(p), p, { kind: "buy-asset" });
  check("M1: 1-aktiv → aktiv-passiv", fired.some((l) => l.id === "aktiv-passiv"), fired.map((l) => l.id));
  check("M1: 1-aktivda roi-cashflow chiqmaydi", !fired.some((l) => l.id === "roi-cashflow"));
}

/* ---------- M1.4 Diversifikatsiya — 3 bir xil tur ---------- */
{
  const p = mk();
  p.assets = [mkAsset("realestate", 1), mkAsset("realestate", 2), mkAsset("realestate", 3)];
  const fired = checkMentor(mkState(p), p, { kind: "buy-asset" });
  check(
    "M1: 3 bir xil tur → diversifikatsiya",
    fired.some((l) => l.id === "diversifikatsiya"),
    fired.map((l) => l.id)
  );
  // 2 bir xil + 1 boshqa — chiqmaydi
  const q = mk();
  q.assets = [mkAsset("realestate", 1), mkAsset("realestate", 2), mkAsset("stock", 3)];
  const fq = checkMentor(mkState(q), q, { kind: "buy-asset" });
  check("M1: 2+1 turda diversifikatsiya chiqmaydi", !fq.some((l) => l.id === "diversifikatsiya"));
}

/* ---------- M1.5 Bir o'yinda bir marta (dedupe) ---------- */
{
  const p = mk();
  p.assets = [mkAsset("business", 1)];
  const s = mkState(p);
  const first = checkMentor(s, p, { kind: "buy-asset" });
  const second = checkMentor(s, p, { kind: "buy-asset" });
  check("M1: birinchi chaqiriq dars qaytaradi", first.length > 0);
  check("M1: ikkinchi chaqiriq bo'sh (dedupe)", second.length === 0, second.map((l) => l.id));
  check("M1: lessonsSeen to'ldirildi", p.lessonsSeen.includes("aktiv-passiv"));
}

/* ---------- M1.6 Navbat: bir kontekstda bir nechta dars, takrorlarsiz ---------- */
{
  const p = mk();
  p.cash = 100_000; // < 1× xarajat → zaxira-jamg'arma
  p.loans = [
    createLoan("l1", "Kredit A", 50_000_000, 0.03, 36),
    createLoan("l2", "Kredit B", 50_000_000, 0.03, 36),
  ];
  p.idleCashMonths = 0;
  const s = mkState(p);
  const fired = checkMentor(s, p, { kind: "month" });
  const ids = fired.map((l) => l.id);
  check("M1: month ctx bir nechta dars (navbat manbasi)", ids.length >= 2, ids);
  check("M1: qarz-qonchasi (2+ kredit) kirdi", ids.includes("qarz-qonchasi"), ids);
  check("M1: zaxira-jamg'arma (naqd<xarajat) kirdi", ids.includes("zaxira-jamg'arma"), ids);
  check("M1: id'lar takrorlanmaydi", new Set(ids).size === ids.length, ids);
  // har biri alohida dars obyekti
  check("M1: barcha darslar kutubxonadan", fired.every((l) => LESSON_BY_ID[l.id] === l));
}

/* ---------- M1.7 completeMonth idleCashMonths hisoblagichi ---------- */
{
  const p = mk();
  p.cash = 10_000_000; // > 3 × totalExpenses
  const s = mkState(p);
  check("M1: sintetik cash > 3× xarajat", p.cash > 3 * totalExpenses(p));
  completeMonth(s);
  check("M1: 1-oydan keyin idleCashMonths=1", p.idleCashMonths === 1, p.idleCashMonths);
  completeMonth(s);
  check("M1: 2-oydan keyin idleCashMonths=2", p.idleCashMonths === 2, p.idleCashMonths);
  p.cash = 100; // kamlik — hisoblagich nollanadi
  completeMonth(s);
  check("M1: naqd kamayganda hisoblagich 0", p.idleCashMonths === 0, p.idleCashMonths);
}

/* ---------- M2.1 Versiya aniqlash mantiq'i ---------- */
{
  check("M2: APP_VERSION=17", APP_VERSION === 17);
  check("M2: changelog v1..v17 to'liq", APP_CHANGELOG.length === 17 && APP_CHANGELOG[16].v === 17);
  check("M2: har yozuvda point bor", APP_CHANGELOG.every((e) => e.points.length > 0));
  const entry = whatsNewFor(0);
  check("M2: yangi foydalanuvchi (0) → v17 paneli", entry?.v === 17, entry);
  check("M2: eski versiya (12) → v17 paneli", whatsNewFor(12)?.v === 17);
  check("M2: joriy versiya (17) → panel yo'q", whatsNewFor(17) === null);
  // kelajak reliz ssenariysi
  check("M2: current 17 bo'lsa 17 ko'rdi → null", whatsNewFor(17, 17) === null);

  // localStorage roundtrip
  delete store[VERSION_KEY];
  check("M2: localStorage bo'sh → 0", readLastVersion() === 0);
  markVersionSeen();
  check("M2: markVersionSeen → APP_VERSION", readLastVersion() === APP_VERSION, store[VERSION_KEY]);
  check("M2: belgilangach whatsNewFor null", whatsNewFor(readLastVersion()) === null);
}

/* ---------- M3. Save v14 migratsiyasi ---------- */
{
  const p = mk();
  const s = makeGame([p]);
  // v13 saqlanma simulyatsiyasi: yangi maydonlarsiz
  const legacy = JSON.parse(JSON.stringify(s)) as GameState & { players: (Player & { lessonsSeen?: string[]; idleCashMonths?: number })[] };
  (legacy as unknown as { version: number }).version = 13;
  delete legacy.players[0].lessonsSeen;
  delete legacy.players[0].idleCashMonths;
  store["oqim-save-v1"] = JSON.stringify(legacy);
  const loaded = loadSave();
  check("M3: v13 saqlanma yuklandi", loaded !== null);
  check("M3: versiya 19 ga ko'tarildi (fix-17: v19)", (loaded as unknown as { version: number }).version === 19);
  check("M3: lessonsSeen default []", Array.isArray(loaded?.players[0].lessonsSeen));
  check("M3: idleCashMonths default 0", loaded?.players[0].idleCashMonths === 0);
  check("M3: lessonsSeen bilan mentor ishlaydi", checkMentor(loaded!, loaded!.players[0], { kind: "avans" }).some((l) => l.id === "avans-xatar"));
}

/* ---------- M1.8 Kutubxona sifati ---------- */
{
  // fix-14: +2 dars ("urgent-sale", "foizsiz-qarz") — 25 → 27
  check("M1: ~24 dars (27 ta, fix-14: +urgent-sale/foizsiz-qarz)", LESSONS.length === 27, LESSONS.length);
  const cats = new Set(LESSONS.map((l) => l.category));
  check(
    "M1: 6 kategoriya to'liq",
    ["qarz", "aktiv", "xarajat", "bilim", "strategiya", "xavf"].every((c) => cats.has(c as never))
  );
  check("M1: id'lar unikal", new Set(LESSONS.map((l) => l.id)).size === LESSONS.length);
}

console.log(failures === 0 ? "\nALL OK (fix-13b)" : `\n${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
