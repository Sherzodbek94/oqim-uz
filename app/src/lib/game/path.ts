/**
 * OQIM — fix-16 (X1): "Yo'l xaritasi" rejimi (Slay-the-Spire-uslubi shoxlangan yo'l).
 * Klassik 30 kataklik doska o'rniga: ~40 qatlamli vertikal xarita, har qatlamda
 * 2–3 tugun, o'yinchi oldinga bog'langan tugunlardan birini tanlaydi.
 *
 * Oy strukturasi: har 8 qatlam = 1 oy. 8-qatlam (layer%8===7) — to'liq "Ish haqi"
 * (payday) qatlami: o'sha qatlamning HAR BIR tuguni payday (oy chegarasi).
 * Har oyning 4-qatlami (layer%8===3) — kamida bitta "Avans" tuguni.
 *
 * Tuman (fog): ko'rinadigan qatlamlar = joriy + (1 + floor(bilim/2)) —
 * bilim "oldinni ko'rish" metaforasi.
 */

export type PathNodeType =
  | "deal"
  | "event"
  | "doodad"
  | "market"
  | "charity"
  | "payday"
  | "avans"
  | "weekend"
  | "exchange"
  | "rest";

export type PathRisk = "safe" | "mid" | "risky";

export interface PathNode {
  id: string;
  layer: number;
  type: PathNodeType;
  risk: PathRisk;
  /** keyingi qatlamdagi bog'langan tugun indekslari */
  links: number[];
}

export interface PathPos {
  layer: number;
  node: number;
}

export interface PathState {
  nodes: PathNode[][];
  /** joriy (faol) o'yinchi pozitsiyasi — layer -1 = start (xaritadan oldin) */
  current: PathPos;
  /** jami tanlangan tugunlar soni */
  steps: number;
  /** har bir o'yinchi (playerId) uchun pozitsiya */
  positions: Record<number, PathPos>;
}

export const PATH_LAYERS = 40;
/** 8 qatlam = 1 oy; 8-qatlam — ish haqi, 4-qatlam — avans. */
export const PATH_MONTH_LAYERS = 8;
export const PATH_AVANS_OFFSET = 3;

/** Qatlam oy chegarasimi (payday qatlami)? */
export function isPaydayLayer(layer: number): boolean {
  return layer % PATH_MONTH_LAYERS === PATH_MONTH_LAYERS - 1;
}

/** Qatlam avans qatlami (oyning 4-qatlami)mi? */
export function isAvansLayer(layer: number): boolean {
  return layer % PATH_MONTH_LAYERS === PATH_AVANS_OFFSET;
}

/** Qatlam qaysi oyga tegishli (1 dan boshlab). */
export function pathMonth(layer: number): number {
  return Math.floor(layer / PATH_MONTH_LAYERS) + 1;
}

/* ---------------- generatsiya ---------------- */

/** Oddiy tugun turlari taqsimoti — klassik doska "his"iga yaqin. */
const TYPE_TABLE: { type: PathNodeType; w: number }[] = [
  { type: "deal", w: 0.3 },
  { type: "event", w: 0.15 },
  { type: "doodad", w: 0.15 },
  { type: "market", w: 0.08 },
  { type: "charity", w: 0.08 },
  { type: "weekend", w: 0.12 },
  { type: "exchange", w: 0.06 },
  { type: "rest", w: 0.06 },
];

function pickType(rand: () => number): PathNodeType {
  let r = rand();
  for (const t of TYPE_TABLE) {
    if (r < t.w) return t.type;
    r -= t.w;
  }
  return "deal";
}

function pickRisk(rand: () => number): PathRisk {
  const r = rand();
  return r < 0.25 ? "safe" : r < 0.75 ? "mid" : "risky";
}

/**
 * Xarita generatsiyasi: PATH_LAYERS qatlam, har qatlamda 2–3 tugun.
 * Bog'lanish: har tugun keyingi qatlamdagi 1–2 tugunga ulanadi; har bir
 * keyingi tugunning kamida bitta kiruvchi bog'i bor (o'lik tugun yo'q).
 */
export function generatePath(rand: () => number = Math.random): PathState {
  const nodes: PathNode[][] = [];
  for (let layer = 0; layer < PATH_LAYERS; layer++) {
    const count = 2 + Math.floor(rand() * 2); // 2–3
    const row: PathNode[] = [];
    for (let i = 0; i < count; i++) {
      let type: PathNodeType;
      let risk: PathRisk;
      if (isPaydayLayer(layer)) {
        type = "payday"; // oy chegarasi — HAR BIR tugun payday
        risk = "safe";
      } else if (isAvansLayer(layer) && i === 0) {
        type = "avans"; // oyning 4-qatlamida kamida bitta avans
        risk = "safe";
      } else {
        type = pickType(rand);
        risk = pickRisk(rand);
      }
      row.push({ id: `n${layer}-${i}`, layer, type, risk, links: [] });
    }
    nodes.push(row);
  }
  // bog'lanishlar (oxirgi qatlamdan tashqari)
  for (let layer = 0; layer < PATH_LAYERS - 1; layer++) {
    const cur = nodes[layer];
    const next = nodes[layer + 1];
    const incoming = new Array<boolean>(next.length).fill(false);
    for (let i = 0; i < cur.length; i++) {
      // eng yaqin keyingi tugun indeksi
      const base = Math.round((i * (next.length - 1)) / Math.max(1, cur.length - 1));
      const links = new Set<number>([base]);
      if (rand() < 0.55) {
        const alt = base + (rand() < 0.5 ? -1 : 1);
        if (alt >= 0 && alt < next.length) links.add(alt);
      }
      for (const l of links) {
        cur[i].links.push(l);
        incoming[l] = true;
      }
      cur[i].links.sort((a, b) => a - b);
    }
    // kiruvchi bog'isiz qolgan tugunlarni eng yaqin oldingi tugunga ulaymiz
    for (let j = 0; j < next.length; j++) {
      if (incoming[j]) continue;
      const from = Math.round((j * (cur.length - 1)) / Math.max(1, next.length - 1));
      if (!cur[from].links.includes(j)) {
        cur[from].links.push(j);
        cur[from].links.sort((a, b) => a - b);
      }
    }
  }
  return {
    nodes,
    current: { layer: -1, node: 0 },
    steps: 0,
    positions: {},
  };
}

/* ---------------- tuman (fog) ---------------- */

/** Ko'rinadigan qatlam chuqurligi: 1 + floor(bilim/2). */
export function fogDepth(knowledge: number): number {
  return 1 + Math.floor(Math.max(0, knowledge) / 2);
}

/** Shu bilim darajasida ko'rinadigan eng uzoq qatlam (shu qatlamgacha OCHIQ). */
export function visibleUntilLayer(pos: PathPos, knowledge: number): number {
  return pos.layer + fogDepth(knowledge);
}

/* ---------------- yurish ---------------- */

/** Xarita tugaganida yangisini generatsiya qiladi (steps saqlanadi). */
export function regeneratePath(path: PathState, rand: () => number = Math.random): void {
  const fresh = generatePath(rand);
  path.nodes = fresh.nodes;
  path.current = fresh.current;
  path.positions = {};
}

/** Pozitsiyadan chiqish mumkin bo'lgan tugunlar (keyingi qatlam, bog'langanlar). */
export function reachableNodes(path: PathState, pos: PathPos): { layer: number; node: number; data: PathNode }[] {
  const nextLayer = pos.layer + 1;
  if (nextLayer >= path.nodes.length) return [];
  if (pos.layer < 0) {
    // start — 0-qatlamning barcha tugunlari ochiq
    return path.nodes[0].map((data, node) => ({ layer: 0, node, data }));
  }
  const cur = path.nodes[pos.layer]?.[pos.node];
  if (!cur) return [];
  return cur.links
    .filter((n) => n >= 0 && n < path.nodes[nextLayer].length)
    .map((n) => ({ layer: nextLayer, node: n, data: path.nodes[nextLayer][n] }));
}

/** Tanlov mumkinmi (yolg'iz tekshiruv — mutatsiyasiz)? */
export function canChoosePathNode(path: PathState, playerId: number, layer: number, nodeIdx: number): boolean {
  const pos = path.positions[playerId] ?? { layer: -1, node: 0 };
  return reachableNodes(path, pos).some((r) => r.layer === layer && r.node === nodeIdx);
}

/**
 * Tugun tanlash: yetib bo'ladiganligini tekshiradi, o'yinchi pozitsiyasini
 * suradi, steps ni oshiradi. Muvaffaqiyatsiz — null (state o'zgarmaydi).
 */
export function choosePathNode(
  path: PathState,
  playerId: number,
  layer: number,
  nodeIdx: number
): PathNode | null {
  if (!canChoosePathNode(path, playerId, layer, nodeIdx)) return null;
  const node = path.nodes[layer][nodeIdx];
  const pos = { layer, node: nodeIdx };
  path.positions[playerId] = pos;
  path.current = pos;
  path.steps += 1;
  return node;
}
