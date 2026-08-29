/**
 * OQIM — perimeter board (Monopoly-style).
 * Asosiy doska: 30 katak on a 9×8 rectangular perimeter (2×(9+8)−4), corners at
 * indices 0 / 8 / 15 / 23 (0 = Oy kun, 15 = Avans).
 * Erkinlik yo'li: 16 katak on a 5×5 square perimeter.
 * Both laid out around the perimeter of a 1000×1000 viewBox. Corners are larger.
 * Tokens walk ON the cells with hop-by-hop springs (arc + landing squash).
 *
 * fix-9 (F1): hero-board uslubi — to'qin zumrad ramka + oltin ichki chiziq,
 * iliq ivory markaz paneli (suzani yulduzi + OQIM wordmark), yumshoq
 * to'ldirilgan kafel katakchalar (qisqa o'zbekcha nomlar, tooltip bilan),
 * ko'tartirilgan pionka tokenlar.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Baby,
  Briefcase,
  Coins,
  HandCoins,
  HeartHandshake,
  Palmtree,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import PlayerToken from "@/components/PlayerToken";
import { cn } from "@/lib/utils";
import {
  CELL_CAPTIONS,
  CELL_COLORS,
  CELL_FULL,
  FT_CELL_CAPTIONS,
  FT_CELL_COLORS,
  FT_CELL_FULL,
  FT_CELLS,
  RAT_BOARD_COLS,
  RAT_BOARD_ROWS,
  RAT_CELLS,
  type CellType,
  type FTCellType,
  type Player,
} from "@/lib/game/types";

const CELL_ICONS: Record<CellType, LucideIcon> = {
  payday: Coins,
  avans: HandCoins,
  opportunity: Sparkles,
  market: Store,
  event: Zap,
  charity: HeartHandshake,
  doodad: ShoppingBag,
  baby: Baby,
  downsized: Briefcase,
  weekend: Palmtree,
};

const FT_CELL_ICONS: Record<FTCellType, LucideIcon> = {
  bonus: Coins,
  business: TrendingUp,
  dream: Sparkles,
  charity: HeartHandshake,
  audit: Briefcase,
};

const BOARD = 1000;
/** corner cell size (slightly larger than edge cells) */
const CORNER = 150;
/** edge cell thickness (track band is CORNER wide; edge cells centered in it) */
const EDGE = 124;
const EDGE_OFF = (CORNER - EDGE) / 2;
const GAP = 6;

/** Hero uslubi: burchak kafellari to'qin zumrad + oltin halqa. */
const CORNER_FILL = "#24604A";
const GOLD = "#D9A441";
const GOLD_DEEP = "#B98428";
const WARM_BORDER = "#EFE5D0";

type Side = "top" | "right" | "bottom" | "left";

export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  side: Side;
  corner: boolean;
}

/**
 * Rectangular perimeter layout, clockwise from the top-left corner (index 0).
 * cols × rows grid ring: n = 2×(cols+rows)−4 cells; corners at indices
 * 0 (TL), cols−1 (TR), cols+rows−2 (BR), 2×cols+rows−3 (BL).
 * 9×8 → 30 cells (corners 0/8/15/23); 5×5 → 16 cells (corners 0/4/8/12).
 */
export function perimeterLayout(cols: number, rows: number): CellRect[] {
  const n = 2 * cols + 2 * rows - 4;
  const span = BOARD - 2 * CORNER;
  const stepX = span / (cols - 2);
  const stepY = span / (rows - 2);
  const tr = cols - 1; // TR corner index
  const br = cols + rows - 2; // BR corner index
  const bl = 2 * cols + rows - 3; // BL corner index
  const rects: CellRect[] = [];
  const mk = (x: number, y: number, w: number, h: number, side: Side, corner: boolean): CellRect => ({
    x,
    y,
    w,
    h,
    cx: x + w / 2,
    cy: y + h / 2,
    side,
    corner,
  });
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      rects.push(mk(0, 0, CORNER, CORNER, "top", true)); // TL
    } else if (i === tr) {
      rects.push(mk(BOARD - CORNER, 0, CORNER, CORNER, "right", true)); // TR
    } else if (i === br) {
      rects.push(mk(BOARD - CORNER, BOARD - CORNER, CORNER, CORNER, "bottom", true)); // BR
    } else if (i === bl) {
      rects.push(mk(0, BOARD - CORNER, CORNER, CORNER, "left", true)); // BL
    } else if (i < tr) {
      // top edge, left → right
      const x = CORNER + (i - 1) * stepX;
      rects.push(mk(x + GAP / 2, EDGE_OFF, stepX - GAP, EDGE, "top", false));
    } else if (i < br) {
      // right edge, top → bottom
      const j = i - tr; // 1..rows-2
      const y = CORNER + (j - 1) * stepY;
      rects.push(mk(BOARD - CORNER + EDGE_OFF, y + GAP / 2, EDGE, stepY - GAP, "right", false));
    } else if (i < bl) {
      // bottom edge, right → left
      const j = i - br; // 1..cols-2
      const x = BOARD - CORNER - j * stepX;
      rects.push(mk(x + GAP / 2, BOARD - CORNER + EDGE_OFF, stepX - GAP, EDGE, "bottom", false));
    } else {
      // left edge, bottom → top
      const j = i - bl; // 1..rows-2
      const y = BOARD - CORNER - j * stepY;
      rects.push(mk(EDGE_OFF, y + GAP / 2, EDGE, stepY - GAP, "left", false));
    }
  }
  return rects;
}

export interface BoardPlayer {
  player: Player;
  /** displayed cell index (animates hop-by-hop) */
  cell: number;
}

/** Katak nomi uchun shrift o'lchami (1000-space) — uzun nomlar kichikroq. */
function captionSize(name: string, corner: boolean): number {
  if (corner) return name.length > 7 ? 17 : 20;
  if (name.length > 7) return 13.5;
  if (name.length > 5) return 15.5;
  return 17.5;
}

export default function Board({
  track,
  players,
  flashCells,
  hub,
  botBubble,
  activePlayerId,
  dreamGlowCell,
}: {
  track: "rat" | "fast";
  players: BoardPlayer[];
  flashCells: Set<number>;
  hub: ReactNode;
  botBubble?: { playerId: number; icon: "roll" | "coins" | "buy" } | null;
  activePlayerId?: number;
  dreamGlowCell?: number | null;
}) {
  const cells = track === "rat" ? RAT_CELLS : FT_CELLS;
  const fast = track === "fast";
  const rects = fast
    ? perimeterLayout(5, 5)
    : perimeterLayout(RAT_BOARD_COLS, RAT_BOARD_ROWS);

  // measured pixel width → scale factor for the 1000-space overlay
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / BOARD));
    ro.observe(el);
    setScale(el.clientWidth / BOARD);
    return () => ro.disconnect();
  }, []);

  // token fan-out when several players share a cell
  const groups = new Map<number, BoardPlayer[]>();
  for (const bp of players) {
    const list = groups.get(bp.cell) ?? [];
    list.push(bp);
    groups.set(bp.cell, list);
  }

  return (
    <div
      className="rounded-[28px] p-2 sm:p-2.5"
      style={{
        background: "linear-gradient(150deg, #2E7D5F 0%, #24604A 45%, #1B4636 100%)",
        boxShadow: "0 3px 6px rgba(30,45,42,.08), 0 20px 48px rgba(30,45,42,.18)",
      }}
    >
    <div
      ref={wrapRef}
      className="relative aspect-square w-full select-none overflow-hidden rounded-[20px]"
      style={{
        backgroundImage: "url(/board-texture.png)",
        backgroundSize: "512px",
        // oltin ichki ramka chizig'i (hero doska qirrasi)
        boxShadow: `inset 0 0 0 2px ${GOLD}, inset 0 0 0 5px rgba(27,70,54,.55)`,
      }}
    >
      {/* felt vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: fast
            ? "radial-gradient(circle, #F7ECD2 0%, #F4EEE1 70%)"
            : "radial-gradient(circle, #EFF6F1 0%, #F4EEE1 70%)",
        }}
      />
      {/* suzani seasoning */}
      <div
        aria-hidden
        className={cn("absolute inset-0", fast ? "opacity-[0.08] text-gold-600" : "opacity-[0.05] text-emerald-600")}
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />

      <svg viewBox={`0 0 ${BOARD} ${BOARD}`} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="cell-hi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id="hub-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor={fast ? "#F7ECD2" : "#F4EEE1"} />
          </linearGradient>
        </defs>
        {/* center hub panel — iliq ivory */}
        <motion.rect
          x={CORNER + 26}
          y={CORNER + 26}
          width={BOARD - 2 * (CORNER + 26)}
          height={BOARD - 2 * (CORNER + 26)}
          rx={36}
          fill="url(#hub-grad)"
          stroke={fast ? GOLD : "#E2D6BC"}
          strokeWidth={fast ? 3.5 : 3}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ transformBox: "view-box", transformOrigin: "500px 500px" }}
        />
        {cells.map((cell, i) => {
          const r = rects[i];
          const color = fast
            ? FT_CELL_COLORS[cell as FTCellType]
            : CELL_COLORS[cell as CellType];
          const flashing = flashCells.has(i);
          const fill = r.corner ? CORNER_FILL : color;
          return (
            <g key={i}>
              <motion.rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={r.corner ? 22 : 12}
                fill={fill}
                stroke={r.corner ? GOLD : WARM_BORDER}
                strokeWidth={r.corner ? 4 : 1.5}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.018, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ transformBox: "view-box", transformOrigin: `${r.cx}px ${r.cy}px` }}
              />
              {/* burchaklarda ichki oltin nozik chiziq (hero corner ring) */}
              {r.corner && (
                <rect
                  x={r.x + 9}
                  y={r.y + 9}
                  width={r.w - 18}
                  height={r.h - 18}
                  rx={15}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth={1.2}
                  opacity={0.55}
                  pointerEvents="none"
                />
              )}
              {/* FT orzu katagi: oltin halqa */}
              {fast && cell === "dream" && !r.corner && (
                <rect
                  x={r.x + 3}
                  y={r.y + 3}
                  width={r.w - 6}
                  height={r.h - 6}
                  rx={10}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  pointerEvents="none"
                />
              )}
              {/* yumshoq ichki soya (inner shadow) */}
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={r.corner ? 22 : 12}
                fill="url(#cell-hi)"
                pointerEvents="none"
              />
              {flashing && (
                <motion.rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={r.corner ? 22 : 12}
                  fill="#FFFFFF"
                  initial={{ opacity: 0.55 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* markaz brend bloki: suzani yulduzi + OQIM wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[17.8%] flex flex-col items-center"
      >
        <span
          className="hidden aspect-square w-[clamp(30px,4vw,52px)] sm:block"
          style={{
            backgroundColor: GOLD,
            WebkitMask: "url(/star-8.svg) center / contain no-repeat",
            mask: "url(/star-8.svg) center / contain no-repeat",
            filter: "drop-shadow(0 2px 4px rgba(185,132,40,.35))",
          }}
        />
        <span
          className="mt-0.5 font-display font-bold leading-none tracking-tight sm:mt-1.5"
          style={{
            color: fast ? GOLD_DEEP : "#24604A",
            fontSize: "clamp(1rem, 3.6vw, 2.6rem)",
          }}
        >
          OQIM
        </span>
        <span
          className="mt-0.5 font-sans font-semibold uppercase sm:mt-1"
          style={{
            color: fast ? GOLD_DEEP : "#8A9992",
            fontSize: "clamp(0.42rem, 1vw, 0.72rem)",
            letterSpacing: "0.32em",
          }}
        >
          {fast ? "ERKINLIK YO'LI" : "KUNDALIK AYLANA"}
        </span>
      </div>

      {/* 1000-space overlay (icons, captions, tokens) */}
      {scale > 0 && (
        <div
          className="absolute left-0 top-0"
          style={{ width: BOARD, height: BOARD, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        >
          {cells.map((cell, i) => {
            const r = rects[i];
            const caption = fast
              ? FT_CELL_CAPTIONS[cell as FTCellType]
              : CELL_CAPTIONS[cell as CellType];
            const full = fast
              ? FT_CELL_FULL[cell as FTCellType]
              : CELL_FULL[cell as CellType];
            const Icon = fast
              ? FT_CELL_ICONS[cell as FTCellType]
              : CELL_ICONS[cell as CellType];
            const isDreamGlow = fast && dreamGlowCell === i;
            const iconSize = r.corner ? 40 : 28;
            // burchaklar: oltin ikon + krem matn; oddiy kafellar: oq
            const fg = r.corner ? GOLD : "#FFFFFF";
            const textFg = r.corner ? "#F7ECD2" : "#FFFFFF";
            return (
              <div
                key={i}
                title={full}
                className="absolute flex cursor-default flex-col items-center"
                style={{ left: r.cx, top: r.cy, transform: "translate(-50%, -50%)" }}
              >
                {fast && cell === "dream" ? (
                  <motion.span
                    className={cn("block h-8 w-8", isDreamGlow && "drop-shadow-[0_0_10px_rgba(217,164,65,0.9)]")}
                    animate={isDreamGlow ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={isDreamGlow ? { repeat: Infinity, duration: 2 } : { duration: 0.2 }}
                    style={{
                      backgroundColor: fg,
                      WebkitMask: "url(/star-8.svg) center / contain no-repeat",
                      mask: "url(/star-8.svg) center / contain no-repeat",
                    }}
                  />
                ) : (
                  <Icon
                    style={{ color: fg, width: iconSize, height: iconSize, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.25))" }}
                    strokeWidth={2}
                  />
                )}
                <span
                  className="mt-0.5 whitespace-nowrap font-sans font-semibold"
                  style={{
                    color: textFg,
                    fontSize: captionSize(caption, r.corner),
                    letterSpacing: "0.02em",
                    textShadow: "0 1px 2px rgba(0,0,0,.3)",
                  }}
                >
                  {caption}
                </span>
              </div>
            );
          })}

          {/* walking tokens (on top of the cells, fan-out when sharing) */}
          {[...groups.entries()].map(([cell, list]) => {
            const r = rects[cell];
            const horizontal = r.side === "top" || r.side === "bottom";
            return list.map((bp, j) => {
              const off = (j - (list.length - 1) / 2) * 56;
              const x = r.cx + (horizontal ? off : 0);
              const y = r.cy + (horizontal ? 0 : off);
              const active = bp.player.id === activePlayerId;
              return (
                <motion.div
                  key={bp.player.id}
                  className="absolute"
                  style={{ left: 0, top: 0, zIndex: active ? 20 : 10 }}
                  initial={{ x, y, scale: 0 }}
                  animate={{ x, y, scale: 1 }}
                  transition={{
                    x: { type: "spring", stiffness: 380, damping: 24 },
                    y: { type: "spring", stiffness: 380, damping: 24 },
                    scale: { type: "spring", stiffness: 300, damping: 18 },
                  }}
                >
                  {/* hop arc: re-mounts each cell → jumps up, squashes on landing */}
                  <motion.div
                    key={bp.cell}
                    initial={{ y: -34, scaleY: 1.12, scaleX: 0.94 }}
                    animate={{ y: 0, scaleY: 1, scaleX: 1 }}
                    transition={{ type: "spring", stiffness: 460, damping: 15 }}
                  >
                    <div style={{ transform: "translate(-50%, -50%)" }} className="relative">
                      {/* faol o'yinchi pionkasi: muloyim bobbing */}
                      <motion.span
                        className="block"
                        animate={active ? { y: [0, -7, 0] } : { y: 0 }}
                        transition={active ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.2 }}
                      >
                        <PlayerToken
                          name={bp.player.name}
                          colorIndex={bp.player.colorIndex}
                          size={52}
                          active={active}
                          className={cn(bp.player.bankrupt && "grayscale opacity-50")}
                        />
                      </motion.span>
                      {bp.player.charityTurns > 0 && (
                        <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-clay-500 text-[13px] font-bold text-white shadow-token">
                          2
                        </span>
                      )}
                      {bp.player.skipTurns > 0 && (
                        <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#5A6B70] text-[13px] font-bold text-white shadow-token">
                          {bp.player.skipTurns}
                        </span>
                      )}
                      {botBubble && botBubble.playerId === bp.player.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="absolute -top-16 left-1/2 flex h-11 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-card"
                        >
                          {botBubble.icon === "roll" && (
                            <span className="flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:120ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:240ms]" />
                            </span>
                          )}
                          {botBubble.icon === "coins" && <Coins className="h-5 w-5 text-gold-500" />}
                          {botBubble.icon === "buy" && <TrendingUp className="h-5 w-5 text-emerald-600" />}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            });
          })}
        </div>
      )}

      {/* hub content (real CSS pixels, centered) — fix-10: positioning wrapper alohida,
          chunki framer-motion inline transform Tailwind translate'ni ezardi (hub o'ngga siljardi) */}
      <div className="absolute left-1/2 top-1/2 w-[52%] max-w-[340px] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {hub}
        </motion.div>
      </div>
    </div>
    </div>
  );
}
