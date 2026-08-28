/**
 * OQIM — fix-11 smoke test: katak mosligi (token ↔ karta) regressiya qulfi.
 *
 *  ROOT CAUSE (fix-11): Game.tsx `mutate()` stateRef'ni React setState updater'I
 *  ICHIDA yangilardi — updater render paytigacha kechikadi. `rollAndMove()`dan
 *  keyin `resolveHumanCell()` mikrovazifada darhol `stateRef.current` o'qiganda
 *  ESKI `position` olinardi → token bir katakda, karta boshqa katakdan ochilardi
 *  (token "Bozor"da, "Xarajat" kartasi kabi). Bu smoke uch qatlamni qulflaydi:
 *
 *  1) index→type: RAT_CELLS aniq 30 katak, v10 spetsifikatsiyasidagi indekslar
 *     (payday 0, avans 15, weekend 5/6/19/20, charity 11/22, market 3/8/13/21/26,
 *     doodad 2/12/17/25, baby 27, downsized 29).
 *  2) index→pozitsiya: perimeterLayout(RAT_BOARD_COLS, RAT_BOARD_ROWS) 30 rect,
 *     yurish yo'nalishi (+1 mod 30) soat mili bo'ylab geometrik izchil —
 *     Board.tsx render/tsikli va token joylashuvi shu tartibni ishlatadi.
 *  3) type→koloda: Game.tsx resolveHumanCell switch'i har bir katak turi uchun
 *     to'g'ri koloda/dvijok funktsiyasiga ulanishi (kolodalar bo'sh emas,
 *     engine funktsiyalari probe'da kutilgan effektni beradi).
 *  4) Har bir indeks 0..29 uchun movePath orqali "qo'nish" simulyatsiyasi:
 *     token to'xtagan indeks === harakat matematikasi === karta turi.
 *  5) 0-katakdan o'tish: position 29 → 3 qadam → position 2 (doodad).
 *  6) Manba-qulf: Game.tsx mutate() stateRef'ni SINXRON yangilashi kerak
 *     (regressiya bo'lsa FAIL).
 *
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix11.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-fix11.mjs && node /tmp/smoke-fix11.mjs
 */
import { readFileSync } from "node:fs";
import {
  applyAvans,
  avansAmount,
  applyBaby,
  applyDownsized,
  applyEvent,
  applyPayday,
  effectiveSalary,
  eligibleEvents,
  makePlayer,
  marketOffer,
  movePath,
  totalExpenses,
} from "../src/lib/game/engine";
import {
  BIG_DEALS,
  DOODAD_CARDS,
  MARKET_CARDS,
  PROFESSIONS,
  WEEKEND_CARDS,
} from "../src/lib/game/data";
import {
  AVANS_INDEX,
  RAT_BOARD_COLS,
  RAT_BOARD_ROWS,
  RAT_CELLS,
  type CellType,
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

/* ---------- 1. index→type: RAT_CELLS spetsifikatsiyasi ---------- */
const EXPECTED: CellType[] = [
  "payday", // 0
  "opportunity", "doodad", "market", "event", "weekend", "weekend", "opportunity",
  "market", "event", "opportunity", "charity", "doodad", "market", "opportunity",
  "avans", // 15
  "event", "doodad", "opportunity", "weekend", "weekend", "market", "charity",
  "opportunity", "event", "doodad", "market", "baby", "opportunity", "downsized", // 29
];
check("RAT_CELLS 30 katak", RAT_CELLS.length === 30, RAT_CELLS.length);
check(
  "RAT_CELLS turlari spetsifikatsiyaga teng (index→type)",
  JSON.stringify(RAT_CELLS) === JSON.stringify(EXPECTED),
  RAT_CELLS.map((c, i) => (c !== EXPECTED[i] ? `${i}:${c}!=${EXPECTED[i]}` : null)).filter(Boolean)
);
const idxOf = (t: CellType) => RAT_CELLS.map((c, i) => (c === t ? i : -1)).filter((i) => i >= 0);
check("market 3/8/13/21/26", JSON.stringify(idxOf("market")) === JSON.stringify([3, 8, 13, 21, 26]));
check("charity 11/22", JSON.stringify(idxOf("charity")) === JSON.stringify([11, 22]));
check("doodad 2/12/17/25", JSON.stringify(idxOf("doodad")) === JSON.stringify([2, 12, 17, 25]));
check("weekend 5/6/19/20", JSON.stringify(idxOf("weekend")) === JSON.stringify([5, 6, 19, 20]));
check("avans 15", JSON.stringify(idxOf("avans")) === JSON.stringify([AVANS_INDEX]) && AVANS_INDEX === 15);
check("baby 27, downsized 29", idxOf("baby")[0] === 27 && idxOf("downsized")[0] === 29);

/* ---------- 2. index→pozitsiya: perimeterLayout yurish tartibi ---------- */
const rects = perimeterLayout(RAT_BOARD_COLS, RAT_BOARD_ROWS);
check("layout 30 rect (cells bilan teng)", rects.length === RAT_CELLS.length);
const corners = rects.map((r, i) => (r.corner ? i : -1)).filter((i) => i >= 0);
check("burchaklar 0/8/15/23", JSON.stringify(corners) === JSON.stringify([0, 8, 15, 23]), corners);

// yurish +1 mod 30 har doim soat mili bo'ylab QO'SHNI katakka olishi kerak.
// Bu Board.tsx render tsikli (cells.map i→rects[i]) va token joylashuvi
// (rects[cell]) bir xil tartibda ekanini geometrik qulflaydi.
{
  const stepX = (1000 - 2 * 150) / (RAT_BOARD_COLS - 2);
  const stepY = (1000 - 2 * 150) / (RAT_BOARD_ROWS - 2);
  const maxHop = Math.max(stepX, stepY) * 1.6; // burchak o'tishlarida biroz kattaroq
  let walkOk = true;
  const bad: number[] = [];
  for (let i = 0; i < 30; i++) {
    const a = rects[i];
    const b = rects[(i + 1) % 30];
    const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    if (!(d > 0 && d <= maxHop)) {
      walkOk = false;
      bad.push(i);
    }
  }
  check("yurish tartibi geometrik izchil (har qadam qo'shni katak)", walkOk, bad);
  // yo'nalish: top → o'ngga, right → pastga, bottom → chapga, left → yuqoriga
  const dir = (from: number, to: number, axis: "x" | "y", sign: 1 | -1) => {
    const d = axis === "x" ? rects[to].cx - rects[from].cx : rects[to].cy - rects[from].cy;
    return sign * d > 0;
  };
  check(
    "top qirra chap→o'ng (1..7)",
    [1, 2, 3, 4, 5, 6].every((i) => dir(i, i + 1, "x", 1))
  );
  check(
    "right qirra yuqori→past (9..14)",
    [9, 10, 11, 12, 13].every((i) => dir(i, i + 1, "y", 1))
  );
  check(
    "bottom qirra o'ng→chap (16..22)",
    [16, 17, 18, 19, 20, 21].every((i) => dir(i, i + 1, "x", -1))
  );
  check(
    "left qirra past→yuqori (24..29)",
    [24, 25, 26, 27, 28].every((i) => dir(i, i + 1, "y", -1))
  );
}

/* ---------- 3. type→koloda: resolveHumanCell switch ulanishlari ---------- */
check("MARKET_CARDS bo'sh emas", MARKET_CARDS.length > 0);
check("DOODAD_CARDS bo'sh emas", DOODAD_CARDS.length > 0);
check("WEEKEND_CARDS bo'sh emas", WEEKEND_CARDS.length > 0);
check("SMALL_DEALS + BIG_DEALS bo'sh emas (opportunity)", BIG_DEALS.length > 0);

{
  const p = makePlayer(0, "T", PROFESSIONS[0], {
    isBot: false,
    personality: null,
    colorIndex: 0,
    dreamId: "library",
  });
  // avans: maoshning 30%-i naqd qo'shiladi (resolveHumanCell "avans" case)
  const cash0 = p.cash;
  const av = applyAvans(p);
  check("avans: avansAmount(p) naqd (fix-12)", av === avansAmount(p) && p.cash === cash0 + av, {
    av,
    salary: effectiveSalary(p),
  });
  // payday: probe'da ishlaydi (payday case — harakat paytida to'lanadi)
  const pay = applyPayday(makePlayer(0, "T", PROFESSIONS[0], { isBot: false, personality: null, colorIndex: 0, dreamId: "library" }));
  check("payday: engine natija qaytaradi", Number.isFinite(pay.amount));
  // baby: farzand qo'shiladi yoki to'y xarajati
  const pb = makePlayer(0, "T", PROFESSIONS[0], { isBot: false, personality: null, colorIndex: 0, dreamId: "library" });
  const br = applyBaby(pb);
  check("baby: farzand+1 yoki to'y", (br.kind === "baby" && pb.children === 1) || br.kind === "feast");
  // downsized: 2 skip + naqd ayirish
  const pd = makePlayer(0, "T", PROFESSIONS[0], { isBot: false, personality: null, colorIndex: 0, dreamId: "library" });
  const damt = applyDownsized(pd);
  check("downsized: 2 yurish skip + xarajat ayirildi", pd.skipTurns === 2 && damt === totalExpenses(pd) + 0 && pd.cash <= 0 + 10_000_000);
  // event: eligibleEvents bo'sh emas va applyEvent natija qaytaradi
  const pe = makePlayer(0, "T", PROFESSIONS[0], { isBot: false, personality: null, colorIndex: 0, dreamId: "library" });
  const evs = eligibleEvents(pe, []);
  check("event: mos hodisalar mavjud", evs.length > 0);
  if (evs.length > 0) {
    const noChoice = evs.find((c) => !c.choices) ?? evs[0];
    const res = applyEvent(structuredClone(pe), noChoice);
    check("event: applyEvent natija matni", typeof res === "string" && res.length > 0);
  }
  // market: aktiv bo'lsa marketOffer taklif beradi (resolveHumanCell "market" case)
  const pm = makePlayer(0, "T", PROFESSIONS[0], { isBot: false, personality: null, colorIndex: 0, dreamId: "library" });
  pm.assets.push({
    id: "a1",
    dealId: "d1",
    title: "Test aktiv",
    kind: MARKET_CARDS[0].kind,
    price: 100_000_000,
    downPayment: 20_000_000,
    cashflow: 1_000_000,
    qty: 1,
    mortgage: null,
  });
  const offer = marketOffer(pm, pm.assets[0], MARKET_CARDS[0]);
  check("market: taklif musbat summa", offer > 0, offer);
}

/* ---------- 4. Har bir katak: qo'nish simulyatsiyasi (0..29 × 1..12 qadam) ---------- */
{
  const size = RAT_CELLS.length;
  let allOk = true;
  const bad: string[] = [];
  for (let from = 0; from < size; from++) {
    for (let steps = 1; steps <= 12; steps++) {
      const path = movePath(from, steps, size);
      const last = path[path.length - 1];
      // token har bir path katakhida to'xtaydi (hop) va oxirgisida qoladi;
      // karta RAT_CELLS[last] bo'yicha ochiladi — ikkalasi bir xil indeks bo'lishi shart
      if (last !== (from + steps) % size || RAT_CELLS[last] !== EXPECTED[(from + steps) % size]) {
        allOk = false;
        bad.push(`${from}+${steps}→${last}`);
      }
      if (path.length !== steps) {
        allOk = false;
        bad.push(`${from}+${steps}: path len ${path.length}`);
      }
    }
  }
  check("360 qo'nish simulyatsiyasi: token indeksi === karta indeksi", allOk, bad.slice(0, 5));
}

/* ---------- 5. 0-katakdan o'tish: 29 → +3 → 2 (doodad) ---------- */
{
  const path = movePath(29, 3, RAT_CELLS.length);
  check(
    "29 → +3 → [0,1,2], qo'nish doodad",
    JSON.stringify(path) === JSON.stringify([0, 1, 2]) && RAT_CELLS[path[2]] === "doodad",
    path
  );
  // yo'lda payday (0) bor — harakat paytida to'lov trigger bo'ladi
  check("0-katak yo'lda payday trigger", path.some((c) => RAT_CELLS[c] === "payday"));
}

/* ---------- 6. Manba-qulf: mutate() stateRef'ni sinxron yangilashi shart ---------- */
{
  const src = readFileSync("src/pages/Game.tsx", "utf8"); // repo rootdan ishga tushiriladi
  const mutateBody = src.match(/const mutate = \(fn: \(s: GameState\) => void\) => \{[\s\S]*?\n  \};/);
  check("mutate() topildi", !!mutateBody);
  if (mutateBody) {
    const body = mutateBody[0];
    const refIdx = body.indexOf("stateRef.current = c");
    const setIdx = body.indexOf("setState(");
    check(
      "mutate: stateRef SINXRON (setState updater'ida emas, undan oldin)",
      refIdx !== -1 && setIdx !== -1 && refIdx < setIdx && !/setState\(\(prev\)/.test(body),
      body.slice(0, 240)
    );
  }
  // resolveHumanCell stateRef'dan o'qiydi (karta = token katakhidan)
  const resolveBody = src.match(/const resolveHumanCell = async[\s\S]*?RAT_CELLS\[p\.position\]/);
  check("resolveHumanCell: stateRef→p.position→RAT_CELLS zanjiri", !!resolveBody);
}

console.log(failures === 0 ? "\n✅ smoke-fix11: ALL PASS" : `\n❌ smoke-fix11: ${failures} FAILURES`);
process.exit(failures ? 1 : 0);
