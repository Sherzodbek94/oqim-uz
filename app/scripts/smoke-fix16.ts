/**
 * OQIM — fix-16 smoke test: "🌿 Yo'l xaritasi" rejimi.
 *  X1 Generatsiya invariantlari: har qatlam 2–3 tugun; har 8-qatlam to'liq payday;
 *     har oyning 4-qatlamida avans; o'lik tugun yo'q; barcha tugunlar yetib boriladigan.
 *  X1 Tuman: ko'rinadigan qatlam chuqurligi = 1 + floor(bilim/2).
 *  X1 choosePathNode: yetib bo'lmaydigan tugun rad etiladi, yetib boriladigan qabul qilinadi.
 *  X1 Tugun turi → rezolyutsiya mapping (nodeCell mantiqining dvigatel tomoni).
 *  X1 Payday tugun tanlanganda oy +1 (completeMonth ishlaydi).
 *  X2 GameState.boardMode: makeGame default "classic", "path" da path holati yaratiladi.
 *  X4 Bot tanlovi: shaxsiyat heuristikasi — Ehtiyotkor xavfsiz, Jasur riskli yo'nalish.
 *  X5 Save v18: klassik saqlanma boardMode:"classic"/path:null ga ko'tariladi.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix16.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix16.mjs && node /tmp/smoke-fix16.mjs
 */
import { SAVE_KEY, type GameState, type Player } from "@/lib/game/types";
import { applyPayday, completeMonth, makeGame, makePlayer } from "@/lib/game/engine";
import {
  PATH_LAYERS,
  canChoosePathNode,
  choosePathNode,
  fogDepth,
  generatePath,
  isAvansLayer,
  isPaydayLayer,
  pathMonth,
  reachableNodes,
  regeneratePath,
  type PathState,
} from "@/lib/game/path";
import { botPathChoice } from "@/lib/game/bots";
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

/** Deterministik tasodif (mulberry32). */
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

/** BFS: startdan barcha tugunlar yetib boriladimi + o'lik tugun bormi. */
function bfsReachable(path: PathState): { reached: number; total: number; deadEnds: number } {
  const seen = new Set<string>();
  let frontier = path.nodes[0].map((_, i) => ({ layer: 0, node: i }));
  for (const f of frontier) seen.add(`${f.layer}-${f.node}`);
  while (frontier.length) {
    const next: { layer: number; node: number }[] = [];
    for (const f of frontier) {
      for (const l of path.nodes[f.layer][f.node].links) {
        const key = `${f.layer + 1}-${l}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push({ layer: f.layer + 1, node: l });
        }
      }
    }
    frontier = next;
  }
  const total = path.nodes.reduce((a, r) => a + r.length, 0);
  let deadEnds = 0;
  for (let l = 0; l < path.nodes.length - 1; l++) {
    for (const n of path.nodes[l]) if (n.links.length === 0) deadEnds++;
  }
  return { reached: seen.size, total, deadEnds };
}

/* ---------- X1: generatsiya invariantlari (10 turli seed) ---------- */
for (let seed = 1; seed <= 10; seed++) {
  const path = generatePath(seeded(seed * 977));
  check(`X1 s${seed}: ${PATH_LAYERS} qatlam`, path.nodes.length === PATH_LAYERS, path.nodes.length);
  check(
    `X1 s${seed}: har qatlam 2–3 tugun`,
    path.nodes.every((r) => r.length >= 2 && r.length <= 3)
  );
  check(
    `X1 s${seed}: har 8-qatlam — HAR BIR tugun payday`,
    path.nodes.every((r, l) => !isPaydayLayer(l) || r.every((n) => n.type === "payday"))
  );
  check(
    `X1 s${seed}: payday faqat 8-qatlamlarda`,
    path.nodes.every((r, l) => isPaydayLayer(l) || r.every((n) => n.type !== "payday"))
  );
  check(
    `X1 s${seed}: har oy 4-qatlamida kamida 1 avans`,
    path.nodes.every((r, l) => !isAvansLayer(l) || r.some((n) => n.type === "avans"))
  );
  const b = bfsReachable(path);
  check(`X1 s${seed}: o'lik tugun yo'q`, b.deadEnds === 0, b.deadEnds);
  check(`X1 s${seed}: barcha tugunlar yetib boriladi`, b.reached === b.total, `${b.reached}/${b.total}`);
  check(
    `X1 s${seed}: bog'lar faqat keyingi qatlamga`,
    path.nodes.every((r, l) =>
      r.every((n) => n.links.every((x) => l + 1 < path.nodes.length && x >= 0 && x < path.nodes[l + 1].length))
    )
  );
  check(`X1 s${seed}: oy raqami to'g'ri`, pathMonth(0) === 1 && pathMonth(7) === 1 && pathMonth(8) === 2);
}

/* ---------- X1: tuman chuqurligi ---------- */
{
  check("X1 fog: bilim 0 → 1 qatlam", fogDepth(0) === 1);
  check("X1 fog: bilim 1 → 1 qatlam", fogDepth(1) === 1);
  check("X1 fog: bilim 2 → 2 qatlam", fogDepth(2) === 2);
  check("X1 fog: bilim 5 → 3 qatlam", fogDepth(5) === 3);
  check("X1 fog: bilim 10 → 6 qatlam", fogDepth(10) === 6);
  check("X1 fog: salbiy bilim himoyalangan", fogDepth(-3) === 1);
}

/* ---------- X1: choosePathNode validatsiyasi ---------- */
{
  const path = generatePath(seeded(42));
  // startdan faqat 0-qatlam tugunlari
  check("X1 choose: 1-qatlam startdan rad etiladi", choosePathNode(path, 0, 1, 0) === null);
  check("X1 choose: state o'zgarmadi", path.steps === 0 && path.positions[0] === undefined);
  const first = choosePathNode(path, 0, 0, 0);
  check("X1 choose: 0-qatlam qabul qilinadi", first !== null && path.positions[0].layer === 0);
  check("X1 choose: steps oshdi", path.steps === 1);
  // bog'lanmagan tugun rad etiladi
  const linked = path.nodes[0][0].links;
  const unlinked = path.nodes[1].map((_, i) => i).filter((i) => !linked.includes(i));
  if (unlinked.length > 0) {
    check("X1 choose: bog'lanmagan tugun rad etiladi", choosePathNode(path, 0, 1, unlinked[0]) === null);
  }
  const ok2 = choosePathNode(path, 0, 1, linked[0]);
  check("X1 choose: bog'langan tugun qabul qilinadi", ok2 !== null && path.positions[0].node === linked[0]);
  // boshqa o'yinchi mustaqil pozitsiya
  check("X1 choose: 2-o'yinchi startdan boshlaydi", canChoosePathNode(path, 1, 0, 1));
  // canChoose ≡ choose (mutatsiyasiz tekshiruv)
  check("X1 canChoose: haqiqiy holatga mos", canChoosePathNode(path, 0, 2, path.nodes[1][linked[0]].links[0] ?? -1));
  check(
    "X1 canChoose: orqaga yurish rad etiladi",
    !canChoosePathNode(path, 0, 0, 0)
  );
  // regeneratePath: yangi xarita + steps saqlanadi
  const before = path.steps;
  regeneratePath(path, seeded(7));
  check("X1 regenerate: steps saqlanadi, pozitsiyalar tozalanadi", path.steps === before && Object.keys(path.positions).length === 0);
  check("X1 regenerate: yangi xarita yuriladi", choosePathNode(path, 0, 0, 0) !== null);
}

/* ---------- X1: tugun turi → rezolyutsiya mapping (payday oy chegarasi) ---------- */
{
  const path = generatePath(seeded(123));
  const st = makeGame([mk()], "path");
  const pl = st.players[0];
  const monthBefore = st.month;
  // payday tugunini topib tanlaymiz (0..7 qatlamlar orasidan yurib boramiz)
  let guard = 0;
  let hitPayday = false;
  while (guard++ < PATH_LAYERS && !hitPayday) {
    const pos = path.positions[pl.id] ?? { layer: -1, node: 0 };
    const opts = reachableNodes(path, pos);
    if (opts.length === 0) break;
    const paydayOpt = opts.find((o) => o.data.type === "payday") ?? opts[0];
    const node = choosePathNode(path, pl.id, paydayOpt.layer, paydayOpt.node)!;
    if (node.type === "payday") {
      // Game.tsx'dagi kabi: applyPayday + completeMonth
      applyPayday(pl, st.news, st.exchange, st.month);
      completeMonth(st);
      hitPayday = true;
    }
  }
  check("X1 payday tuguniga yetib borindi", hitPayday);
  check("X1 payday tugun oy chegarasini oshirdi (+1 oy)", st.month === monthBefore + 1, `${monthBefore}→${st.month}`);
}

/* ---------- X2: boardMode GameState'da ---------- */
{
  const classic = makeGame([mk()]);
  check("X2: default boardMode classic", classic.boardMode === "classic");
  check("X2: classic da path null", classic.path === null);
  const pathGame = makeGame([mk()], "path");
  check("X2: path rejimida path holati yaratiladi", pathGame.path !== null && pathGame.path.nodes.length === PATH_LAYERS);
  check("X2: versiya 20 (fix-18)", pathGame.version === 20);
}

/* ---------- X4: bot shaxsiyat heuristikasi ---------- */
{
  const cautious = mk(1, "cautious");
  const bold = mk(2, "bold");
  // sun'iy variantlar: safe rest vs risky deal
  const mkOpt = (risk: "safe" | "mid" | "risky", type: "rest" | "deal") => ({
    layer: 0,
    node: 0,
    data: { id: `${type}-${risk}`, layer: 0, type, risk, links: [] },
  });
  let cautiousSafe = 0;
  let boldRisky = 0;
  for (let i = 0; i < 60; i++) {
    const opts = [mkOpt("safe", "rest"), mkOpt("risky", "deal")];
    if (botPathChoice(cautious, opts, seeded(i + 1)).data.risk === "safe") cautiousSafe++;
    if (botPathChoice(bold, opts, seeded(i + 500)).data.risk === "risky") boldRisky++;
  }
  check("X4: Ehtiyotkor xavfsiz tugunni afzal ko'radi (>80%)", cautiousSafe / 60 > 0.8, cautiousSafe);
  check("X4: Jasur riskli tugunni afzal ko'radi (>80%)", boldRisky / 60 > 0.8, boldRisky);
  const single = mkOpt("mid", "deal");
  check("X4: yagona variant qaytariladi", botPathChoice(cautious, [single]).data.id === single.data.id);
}

/* ---------- X5: save v18 migratsiyasi ---------- */
{
  const legacy = JSON.parse(JSON.stringify(makeGame([mk()]))) as GameState;
  (legacy as unknown as { version: number }).version = 17;
  delete (legacy as unknown as Record<string, unknown>).boardMode;
  delete (legacy as unknown as Record<string, unknown>).path;
  store[SAVE_KEY] = JSON.stringify(legacy);
  const loaded = loadSave();
  check("X5: v17 klassik saqlanma v20 ga ko'tarildi (fix-18)", loaded?.version === 20, loaded?.version);
  check("X5: klassik saqlanmaga boardMode=classic", loaded?.boardMode === "classic");
  check("X5: klassik saqlanmada path null", loaded?.path === null);
  // path saqlanma saqlanadi
  const pg = makeGame([mk()], "path");
  choosePathNode(pg.path!, 0, 0, 0);
  store[SAVE_KEY] = JSON.stringify(pg);
  const loaded2 = loadSave();
  check("X5: path saqlanma o'qiladi", loaded2?.boardMode === "path" && loaded2.path?.steps === 1);
}

/* ---------- klassik rejim tegmagan (sanity) ---------- */
{
  const st = makeGame([mk()]);
  check("Klassik: ekran ratrace, phase idle", st.screen === "ratrace" && st.phase === "idle");
  check("Klassik: diceCount 1", st.diceCount === 1);
}

console.log(failures === 0 ? "\nALL OK (fix-16)" : `\n${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
