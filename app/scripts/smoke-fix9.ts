/**
 * OQIM — fix-9 smoke test:
 *  F1: perimeterLayout/burchaklar saqlangan (vizual overhaul mexanikani buzmaydi).
 *  F2: Bilim olish markazi — narx/bilim/cooldown, cap 5, cooldown bloklaydi,
 *      naqd yetishmasa rad, vebinar ehtimoli (deterministic rand), seminar networking.
 *  F3: Mijoz topish markazi — kanal narxi/cooldown, deterministic rand bilan
 *      mijoz + fee diapazoni, referal ≥1 mijoz talabi, cap semantikasi
 *      (menejersiz 3 faol), menejer cheklovni oladi, E kvadrant bloklangan.
 *  Saqlanma: v9→v11 migratsiya (yangi cooldown xaritalari default {}).
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix9.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix9.mjs && node /tmp/smoke-fix9.mjs
 */
import {
  addOneClient,
  clientActionCost,
  clientActionGate,
  clientActionById,
  clientIncome,
  completeMonth,
  effectiveClients,
  hireManager,
  knowledgeActionGate,
  makeGame,
  makePlayer,
  quadrantLevel,
  splitExpenses,
  useClientAction,
  useKnowledgeAction,
} from "../src/lib/game/engine";
import { PROFESSIONS } from "../src/lib/game/data";
import { clearSave, loadSave, saveGame } from "../src/lib/game/save";
import {
  CLIENT_CAP_NO_MANAGER,
  KNOWLEDGE_MAX,
  RAT_CELLS,
  SAVE_KEY,
  type Client,
  type Player,
} from "../src/lib/game/types";
import { perimeterLayout } from "../src/pages/game/Board";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

/** Toza test o'yinchisi: 10 mln maosh, 1 mln xarajat, qarzsiz. */
function testPlayer(): Player {
  const p = makePlayer(0, "Test", PROFESSIONS[0], {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "d1",
  });
  p.loans = [];
  p.installments = [];
  p.assets = [];
  p.salary = 10_000_000;
  p.expenseParts = splitExpenses(1_000_000);
  p.cash = 0;
  return p;
}

/** Deterministic rand: berilgan qiymatlar ketma-ket qaytariladi. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/* ---------- F1. Perimeter mexanikasi saqlangan ---------- */
{
  const rects = perimeterLayout(9, 8);
  check("F1: 30 katak (9×8 perimetr)", rects.length === 30 && RAT_CELLS.length === 30);
  const corners = rects.map((r, i) => (r.corner ? i : -1)).filter((i) => i >= 0);
  check("F1: burchaklar 0/8/15/23", corners.join(",") === "0,8,15,23", corners);
  const ft = perimeterLayout(5, 5);
  check("F1: Erkinlik yo'li 16 katak", ft.length === 16);
}

/* ---------- F2. Bilim olish markazi ---------- */
{
  const p = testPlayer();
  p.cash = 20_000_000;
  const s = makeGame([p]);

  // Kitob o'qish: −500 ming, +1 bilim, cooldown yoziladi
  const k0 = p.knowledge;
  const r1 = useKnowledgeAction(s, p.id, "book", seq(0));
  check("F2: kitob ok", r1.ok && r1.gained === 1, r1);
  check("F2: kitob narxi yechildi", p.cash === 19_500_000, p.cash);
  check("F2: bilim +1", p.knowledge === k0 + 1, p.knowledge);
  check("F2: kitob cooldown yozildi", p.knowledgeActions.book === s.month, p.knowledgeActions);

  // cooldown: darhol takror bloklanadi ("2 oydan keyin yana")
  const g1 = knowledgeActionGate(s, p, "book");
  check("F2: cooldown bloklaydi", !g1.ok && g1.reason === "cooldown" && g1.monthsLeft === 2, g1);
  const r2 = useKnowledgeAction(s, p.id, "book", seq(0));
  check("F2: cooldown'da rad + naqd o'zgarmaydi", !r2.ok && p.cash === 19_500_000, r2);
  check("F2: cooldown xabari o'zbekcha", r2.message.includes("oydan keyin yana"), r2.message);

  // 2 oy o'tgach yana ruxsat
  completeMonth(s);
  const gMid = knowledgeActionGate(s, p, "book");
  check("F2: 1 oy o'tgach hali cooldown", !gMid.ok && gMid.monthsLeft === 1, gMid);
  completeMonth(s);
  check("F2: 2 oy o'tgach ruxsat", knowledgeActionGate(s, p, "book").ok);
  const r3 = useKnowledgeAction(s, p.id, "book", seq(0));
  check("F2: qayta kitob +1 bilim", r3.ok && r3.gained === 1, r3);

  // Vebinar: rand < 0.6 → +1; rand ≥ 0.6 → "vaqt ketdi" (narx baribir yechiladi)
  const r4 = useKnowledgeAction(s, p.id, "webinar", seq(0.1));
  check("F2: vebinar muvaffaqiyat (+1)", r4.ok && r4.gained === 1, r4);
  const cashBefore = p.cash;
  completeMonth(s);
  const r5 = useKnowledgeAction(s, p.id, "webinar", seq(0.99));
  check("F2: vebinar o'tmadi — vaqt ketdi", r5.ok && r5.gained === 0 && r5.message.includes("Vaqt ketdi"), r5);
  check("F2: o'tmagan vebinar ham pul yechadi", p.cash === cashBefore - 800_000, p.cash);

  // Onlayn kurs: kafolatlangan +1
  const r6 = useKnowledgeAction(s, p.id, "course", seq(0.99));
  check("F2: kurs kafolatlangan (rand=0.99 ham +1)", r6.ok && r6.gained === 1, r6);

  // Cap 5: maksimal darajada rad
  p.knowledge = KNOWLEDGE_MAX;
  const gCap = knowledgeActionGate(s, p, "course");
  check("F2: cap 5 — 'Maksimal bilim darajasi'", !gCap.ok && gCap.reason === "cap", gCap);
  const r7 = useKnowledgeAction(s, p.id, "course", seq(0));
  check("F2: cap'da harakat rad etiladi", !r7.ok && r7.message === "Maksimal bilim darajasi", r7);

  // Naqd yetishmasa rad
  p.knowledge = 1;
  p.cash = 100_000;
  p.knowledgeActions = {};
  const gCash = knowledgeActionGate(s, p, "book");
  check("F2: naqd yetarli emas — gate", !gCash.ok && gCash.reason === "cash", gCash);
  const r8 = useKnowledgeAction(s, p.id, "book", seq(0));
  check("F2: naqd yetarli emas — rad", !r8.ok && p.cash === 100_000, r8);

  // Biznes seminar: kvadrant ≥ S bo'lsa 50% +1 mijoz (networking)
  p.cash = 20_000_000;
  p.quadrant = "S";
  const r9 = useKnowledgeAction(s, p.id, "seminar", seq(0, 0.1, 0.5, 0.5, 0.5));
  check("F2: seminar +1 bilim", r9.ok && r9.gained === 1, r9);
  check("F2: seminar networking +1 mijoz", r9.client !== null && p.clients.length === 1, r9.client);
  // E kvadrantda networking mijoz bermaydi
  const pE = testPlayer();
  pE.cash = 20_000_000;
  pE.quadrant = "E";
  const sE = makeGame([pE]);
  const r10 = useKnowledgeAction(sE, pE.id, "seminar", seq(0, 0));
  check("F2: E kvadrantda seminar mijozsiz", r10.ok && r10.client === null && pE.clients.length === 0, r10);
}

/* ---------- F3. Mijoz topish markazi ---------- */
{
  const p = testPlayer();
  p.cash = 50_000_000;
  p.quadrant = "S";
  const s = makeGame([p]);

  // E kvadrant bloklangan
  const pE = testPlayer();
  pE.cash = 50_000_000;
  const sE = makeGame([pE]);
  const gE = clientActionGate(sE, pE, "instagram");
  check("F3: E kvadrant bloklangan ('S kvadrantiga o'ting')", !gE.ok && gE.reason === "quadrant", gE);
  check("F3: quadrantLevel E=0/S=1", quadrantLevel(pE) === 0 && quadrantLevel(p) === 1);

  // Instagram: rand 0 → 65% success, fee 0,8–1,5 mln
  const r1 = useClientAction(s, p.id, "instagram", seq(0, 0, 0, 0));
  check("F3: instagram +1 mijoz", r1.ok && r1.added.length === 1 && p.clients.length === 1, r1);
  check(
    "F3: instagram fee diapazonda",
    r1.added[0].monthlyFee >= 800_000 && r1.added[0].monthlyFee <= 1_500_000,
    r1.added[0].monthlyFee
  );
  check("F3: instagram narxi −2 mln", p.cash === 48_000_000, p.cash);
  check("F3: toast matni mijoz nomi bilan", r1.message.startsWith("+1 mijoz:"), r1.message);

  // cooldown: 1 oy
  const g1 = clientActionGate(s, p, "instagram");
  check("F3: instagram cooldown", !g1.ok && g1.reason === "cooldown" && g1.monthsLeft === 1, g1);

  // Instagram fail: rand 0.99 → samara bermadi, pul yechiladi
  completeMonth(s);
  const cashBefore = p.cash;
  const r2 = useClientAction(s, p.id, "instagram", seq(0.99));
  check("F3: instagram fail — 'samara bermadi'", r2.ok && r2.added.length === 0 && r2.message.includes("samara bermadi"), r2);
  check("F3: fail ham pul yechadi", p.cash === cashBefore - 2_000_000, p.cash);

  // Telegram: 50% success, fee 0,5–1 mln
  const r3 = useClientAction(s, p.id, "telegram", seq(0.4, 0.5, 0.5, 0.5));
  check(
    "F3: telegram +1 mijoz (0,5–1 mln)",
    r3.added.length === 1 && r3.added[0].monthlyFee >= 500_000 && r3.added[0].monthlyFee <= 1_000_000,
    r3.added[0]?.monthlyFee
  );

  // Referal: ≥1 mijoz talab qilinadi
  const p0 = testPlayer();
  p0.cash = 50_000_000;
  p0.quadrant = "S";
  const s0 = makeGame([p0]);
  const gRef0 = clientActionGate(s0, p0, "referal");
  check("F3: referal mijozsiz bloklangan", !gRef0.ok && gRef0.reason === "no-clients", gRef0);
  // narx = 800 ming × mijozlar soni
  const refDef = clientActionById("referal")!;
  check("F3: referal narxi × mijozlar", clientActionCost(p, refDef) === 800_000 * p.clients.length, {
    cost: clientActionCost(p, refDef),
    n: p.clients.length,
  });
  // har mijoz 40% — 2 mijoz bor, ikkalasi ham keltiradi (rand 0)
  const clientsBefore = p.clients.length;
  const r4 = useClientAction(s, p.id, "referal", seq(0, 0, 0, 0, 0, 0, 0, 0));
  check("F3: referal +2 yangi mijoz", r4.added.length === 2 && p.clients.length === clientsBefore + 2, r4.added.length);
  check("F3: referal narxi yechildi", r4.cost === 800_000 * clientsBefore, r4.cost);

  // Networking: kafolatlangan +1 (fee 1–2 mln); rand 0.1 → 25% bonus ham
  const p2 = testPlayer();
  p2.cash = 50_000_000;
  p2.quadrant = "B";
  const s2 = makeGame([p2]);
  const r5 = useClientAction(s2, p2.id, "networking", seq(0.5, 0.5, 0.1, 0.1, 0.5, 0.5));
  check("F3: networking kafolatlangan +1 (+25% bonus)", r5.added.length === 2, r5.added.length);
  check(
    "F3: networking fee 1–2 mln",
    r5.added.every((c: Client) => c.monthlyFee >= 1_000_000 && c.monthlyFee <= 2_000_000),
    r5.added.map((c: Client) => c.monthlyFee)
  );
  // rand 0.99 → bonus yo'q, lekin 1 ta baribir
  const p3 = testPlayer();
  p3.cash = 50_000_000;
  p3.quadrant = "B";
  const s3 = makeGame([p3]);
  const r6 = useClientAction(s3, p3.id, "networking", seq(0.5, 0.5, 0.99));
  check("F3: networking bonus o'tmadi — 1 mijoz", r6.added.length === 1, r6.added.length);

  // Promo: +2 mijoz (0,4–0,8 mln), mavjud mijozlar sadoqati −1 (kamida 1)
  const before = p3.clients.map((c) => ({ id: c.id, loyalty: c.loyalty }));
  const r7 = useClientAction(s3, p3.id, "promo", seq(0, 0, 0, 0, 0));
  check("F3: promo +2 mijoz", r7.added.length === 2 && p3.clients.length === before.length + 2, r7);
  check(
    "F3: promo fee 0,4–0,8 mln",
    r7.added.every((c: Client) => c.monthlyFee >= 400_000 && c.monthlyFee <= 800_000),
    r7.added.map((c: Client) => c.monthlyFee)
  );
  const old = p3.clients.find((c) => c.id === before[0].id)!;
  check(
    "F3: promo sadoqat −1 (min 1)",
    old.loyalty === Math.max(1, before[0].loyalty - 1),
    { before: before[0].loyalty, after: old.loyalty }
  );

  // Cap semantikasi: menejersiz faqat 3 tasi to'laydi (yuqori feeli)
  const p4 = testPlayer();
  p4.cash = 50_000_000;
  p4.quadrant = "S";
  const s4 = makeGame([p4]);
  // 5 mijoz qo'shamiz (addOneClient orqali)
  for (let i = 0; i < 5; i++) addOneClient(p4, seq(0, 0.99 - i * 0.2, 0), 500_000 + i * 100_000, 500_000 + i * 100_000);
  check("F3: 5 mijoz ro'yxatda", p4.clients.length === 5);
  check("F3: menejersiz faol = 3", effectiveClients(p4).length === CLIENT_CAP_NO_MANAGER);
  const incomeCapped = clientIncome(p4);
  const top3 = [...p4.clients].sort((a, b) => b.monthlyFee - a.monthlyFee).slice(0, 3);
  check("F3: faqat top-3 to'laydi", incomeCapped === top3.reduce((x, c) => x + c.monthlyFee, 0), incomeCapped);
  // overCap bayrog'i: capdan oshganda xabarda "bandlik" qayd qilinadi
  const r8 = useClientAction(s4, p4.id, "instagram", seq(0, 0, 0, 0));
  check("F3: capdan oshsa 'bandlik' eslatmasi", r8.overCap && r8.message.includes("bandlik"), r8.message);
  // menejer cheklovni oladi
  p4.cash = 500_000_000;
  check("F3: menejer yollandi", hireManager(p4));
  check("F3: menejer bilan barchasi faol", effectiveClients(p4).length === p4.clients.length);
  const r9 = useClientAction(s4, p4.id, "telegram", seq(0, 0, 0, 0));
  check("F3: menejer bilan overCap yo'q", r9.ok && !r9.overCap, r9);

  // Naqd yetishmasa rad
  const p5 = testPlayer();
  p5.cash = 100_000;
  p5.quadrant = "S";
  const s5 = makeGame([p5]);
  const r10 = useClientAction(s5, p5.id, "instagram", seq(0));
  check("F3: naqd yetarli emas — rad", !r10.ok && p5.cash === 100_000, r10);
}

/* ---------- Saqlanma migratsiyasi v9 → v11 ---------- */
{
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = mock as unknown as Storage;

  const p = testPlayer();
  const s = makeGame([p]);
  // v9 saqlanmani taqlid qilamiz: yangi maydonlarsiz, version 9
  const legacy = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  legacy.version = 9;
  const lp = (legacy.players as Record<string, unknown>[])[0];
  delete lp.knowledgeActions;
  delete lp.clientActions;
  store.set(SAVE_KEY, JSON.stringify(legacy));
  const loaded = loadSave();
  check("migratsiya: v9 saqlanma o'qildi", loaded !== null);
  check("migratsiya: version 20 ga ko'tarildi (fix-18: v20)", loaded !== null && loaded.version === 20, loaded?.version);
  check(
    "migratsiya: notifications default [] (v12)",
    loaded !== null && Array.isArray(loaded.notifications) && loaded.notifications.length === 0
  );
  check(
    "migratsiya: cooldown xaritalari default {}",
    loaded !== null &&
      typeof loaded.players[0].knowledgeActions === "object" &&
      Object.keys(loaded.players[0].knowledgeActions).length === 0 &&
      typeof loaded.players[0].clientActions === "object",
    loaded?.players[0].knowledgeActions
  );
  // yangi o'yin saqlanishi v11 sifatida yoziladi va o'qiladi
  clearSave();
  const s2 = makeGame([testPlayer()]);
  s2.players[0].cash = 99_000_000;
  useKnowledgeAction(s2, s2.players[0].id, "book", seq(0));
  saveGame(s2);
  const loaded2 = loadSave();
  check(
    "saqlanma: knowledgeActions persist",
    loaded2 !== null && loaded2.players[0].knowledgeActions.book === s2.month,
    loaded2?.players[0].knowledgeActions
  );
  // juda eski (v7) saqlanma rad etiladi
  clearSave();
  const old7 = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  old7.version = 7;
  store.set(SAVE_KEY, JSON.stringify(old7));
  check("migratsiya: v7 saqlanma rad etiladi", loadSave() === null);

  delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
