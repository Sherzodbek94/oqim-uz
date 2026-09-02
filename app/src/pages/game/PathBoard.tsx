/**
 * OQIM — fix-18 (G): "⛰️ Hayot cho'qqisi" (fix-16 yo'l xaritasi dvijogining
 * vizual qayta loyihasi). Dvijok o'zgarmagan: 40 qatlam, 2–3 tugun, fogDepth,
 * choosePathNode. O'zgarish — metafora: pastdan yuqoriga tog ko'tarilishi.
 * 40 qatlam 4 bosqichga bo'linadi va kvadrant zonalariga bog'langan:
 * 1–10 🌱 BOSHLASH (E), 11–20 🏠 O'SISH (S), 21–30 🏪 QURISH (B),
 * 31–40 🏭 MEROS (I); 40-qatlam = 🚩 CHO'QQI (moliyaviy erkinlik).
 * Kvadrant qulfi VIZUAL ko'rsatkich (🔒) — tanlov bloklanmaydi (balans xavfsiz).
 * Mobil-first: bitta barmoqli vertikal skroll, ≥44px touch target.
 */
import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Coffee,
  Coins,
  Flag,
  HandCoins,
  HeartHandshake,
  Lightbulb,
  Lock,
  Palmtree,
  ShoppingBag,
  Store,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import PlayerToken, { PLAYER_COLORS } from "@/components/PlayerToken";
import { cn } from "@/lib/utils";
import { g } from "@/lib/game/strings";
import {
  PATH_LAYERS,
  isPaydayLayer,
  pathMonth,
  reachableNodes,
  visibleUntilLayer,
  type PathNodeType,
  type PathPos,
  type PathRisk,
} from "@/lib/game/path";
import { quadrantLevel } from "@/lib/game/engine";
import type { GameState, Player } from "@/lib/game/types";

const NODE_ICONS: Record<PathNodeType, LucideIcon> = {
  deal: Lightbulb,
  event: Zap,
  doodad: ShoppingBag,
  market: Store,
  charity: HeartHandshake,
  payday: Coins,
  avans: HandCoins,
  weekend: Palmtree,
  exchange: TrendingUp,
  rest: Coffee,
};

const RISK_RING: Record<PathRisk, string> = {
  safe: "ring-emerald-500/70",
  mid: "ring-gold-500/70",
  risky: "ring-clay-500/80",
};

const TYPE_BG: Record<PathNodeType, string> = {
  deal: "bg-emerald-100 text-emerald-700",
  event: "bg-[#7A5CA8]/15 text-[#7A5CA8]",
  doodad: "bg-[#C24E4E]/15 text-[#C24E4E]",
  market: "bg-sky-100 text-sky-700",
  charity: "bg-clay-100 text-clay-600",
  payday: "bg-gold-100 text-gold-600",
  avans: "bg-gold-100 text-gold-600",
  weekend: "bg-[#4E8D7C]/15 text-[#4E8D7C]",
  exchange: "bg-emerald-100 text-emerald-700",
  rest: "bg-sand-100 text-ink-500",
};

const ROW_H = 84;
const ZONE_LAYERS = 10; // 40 qatlam = 4 zona × 10 qatlam

/** Qatlam → bosqich (zona) indeksi: 0=E, 1=S, 2=B, 3=I. */
function zoneOfLayer(layer: number): number {
  return Math.min(3, Math.floor(layer / ZONE_LAYERS));
}

/** Zona fon gradientlari (pastdan yuqoriga: qishloq → oltin cho'qqi). */
const ZONE_BG = [
  "linear-gradient(to top, rgba(120,113,80,0.20), rgba(16,122,87,0.14))", // 🌱 BOSHLASH — doshli yo'l, qishloq
  "linear-gradient(to top, rgba(16,122,87,0.14), rgba(14,116,144,0.16))", // 🏠 O'SISH
  "linear-gradient(to top, rgba(14,116,144,0.16), rgba(217,164,65,0.14))", // 🏪 QURISH
  "linear-gradient(to top, rgba(217,164,65,0.14), rgba(217,164,65,0.30))", // 🏭 MEROS — oltin cho'qqi
];

/** Tugun markazining gorizontal koordinatasi (0–100 %). */
function nodeX(idx: number, count: number): number {
  return ((idx + 0.5) / count) * 100;
}

export default function PathBoard({
  state,
  canPick,
  onPick,
}: {
  state: GameState;
  canPick: boolean;
  onPick: (layer: number, node: number) => void;
}) {
  const path = state.path;
  const human: Player = state.players.find((p) => !p.isBot) ?? state.players[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  const layers = path?.nodes.length ?? PATH_LAYERS;
  const totalH = layers * ROW_H + 60;

  /** Pastdan yuqoriga: 0-qatlam eng pastda, 40-qatlam (cho'qqi) eng yuqorida. */
  const nodeY = (layer: number): number => totalH - (layer * ROW_H + ROW_H / 2 + 28);

  const humanPos = useMemo<PathPos>(
    () => path?.positions[human.id] ?? { layer: -1, node: 0 },
    [path, human.id]
  );
  const fogLimit = path ? visibleUntilLayer(humanPos, human.knowledge) : -1;
  const humanZone = quadrantLevel(human); // 0..3 — kvadrant progressiyasi (vizual qulf)
  const reachable = useMemo(() => {
    if (!path) return new Set<string>();
    return new Set(reachableNodes(path, humanPos).map((r) => `${r.layer}-${r.node}`));
  }, [path, humanPos]);

  // joriy tugunga avto-skroll
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [humanPos.layer, humanPos.node]);

  if (!path) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-900/60 bg-gradient-to-b from-gold-100/30 via-emerald-900 to-emerald-950 shadow-card">
      <div className="border-b border-emerald-800/60 px-4 py-2 text-center">
        <span className="text-[clamp(11px,2.6vw,13px)] font-semibold tracking-wide text-emerald-100">
          {g.setup.boardPath}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="relative max-h-[68dvh] overflow-y-auto overscroll-contain px-2 pb-6 touch-pan-y lg:max-h-[calc(100dvh-160px)]"
      >
        <div className="relative mx-auto w-full max-w-[520px]" style={{ height: totalH }}>
          {/* zona fon lentalari (pastdan yuqoriga ko'tarilish hissi) */}
          {ZONE_BG.map((bg, z) => {
            const topY = nodeY(Math.min(layers - 1, z * ZONE_LAYERS + ZONE_LAYERS - 1)) - ROW_H / 2;
            const botY = nodeY(z * ZONE_LAYERS) + ROW_H / 2;
            return (
              <div
                key={`zone-${z}`}
                className="pointer-events-none absolute inset-x-0 rounded-2xl"
                style={{ top: topY, height: botY - topY, background: bg }}
              />
            );
          })}

          {/* 🚩 CHO'QQI banneri — eng yuqori nuqta */}
          <div
            className="pointer-events-none absolute inset-x-0 flex justify-center"
            style={{ top: nodeY(layers - 1) - ROW_H / 2 - 22 }}
          >
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-bold tracking-wide text-ink-900 shadow-token"
            >
              <Flag className="h-3 w-3" />
              {g.path.summit}
            </motion.span>
          </div>

          {/* bosqich bannerlari — har zona chegarasida */}
          {g.path.stages.map((stage, z) => {
            const boundaryLayer = z * ZONE_LAYERS; // zona shu qatlamdan boshlanadi
            if (boundaryLayer >= layers) return null;
            const locked = humanZone < z; // vizual qulf (tanlov bloklanmaydi)
            return (
              <div
                key={`stage-${z}`}
                className="pointer-events-none absolute inset-x-0 flex justify-center"
                style={{ top: nodeY(boundaryLayer) + ROW_H / 2 - 10 }}
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide shadow-token",
                    locked ? "bg-emerald-950/80 text-emerald-300/80 ring-1 ring-emerald-700/60" : "bg-emerald-600/90 text-white"
                  )}
                >
                  {locked && <Lock className="h-3 w-3" />}
                  {stage.icon} {stage.name} · {stage.zone}
                  {locked && <span className="font-medium">— {g.path.zoneLocked}</span>}
                </span>
              </div>
            );
          })}

          {/* SVG bog'lovchilar */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 100 ${totalH}`}
            preserveAspectRatio="none"
          >
            {path.nodes.map((row, layer) =>
              row.flatMap((n, i) =>
                n.links.map((l) => {
                  const x1 = nodeX(i, row.length);
                  const y1 = nodeY(layer);
                  const x2 = nodeX(l, path.nodes[layer + 1].length);
                  const y2 = nodeY(layer + 1);
                  const fogged = layer + 1 > fogLimit;
                  return (
                    <line
                      key={`${n.id}-${l}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={fogged ? "rgba(167,243,208,0.12)" : "rgba(167,243,208,0.45)"}
                      strokeWidth={fogged ? 0.8 : 1.4}
                      strokeDasharray={fogged ? "2 2" : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })
              )
            )}
          </svg>

          {/* qatlamalar */}
          {path.nodes.map((row, layer) => {
            const paydayRow = isPaydayLayer(layer);
            const fogged = layer > fogLimit;
            const zoneLocked = humanZone < zoneOfLayer(layer); // faqat vizual
            return (
              <div key={layer}>
                {paydayRow && (
                  <div
                    className="pointer-events-none absolute inset-x-0 flex items-center justify-center"
                    style={{ top: nodeY(layer) + ROW_H / 2 - 10 }}
                  >
                    <span className="rounded-full bg-gold-500/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-ink-900 shadow-token">
                      {g.path.monthPayday(pathMonth(layer))}
                    </span>
                  </div>
                )}
                {row.map((n, i) => {
                  const Icon = NODE_ICONS[n.type];
                  const isReachable = canPick && reachable.has(`${layer}-${i}`);
                  const isCurrent = humanPos.layer === layer && humanPos.node === i;
                  return (
                    <div
                      key={n.id}
                      ref={isCurrent ? currentRef : undefined}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${nodeX(i, row.length)}%`, top: nodeY(layer) }}
                    >
                      {fogged ? (
                        // tuman — uzoq qatlamlar bulut ichida
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800/60 text-emerald-300/70 ring-2 ring-emerald-700/50 blur-[1px]"
                          title={g.path.fogLabel}
                        >
                          <span className="text-sm font-bold">?</span>
                        </div>
                      ) : (
                        <motion.button
                          type="button"
                          disabled={!isReachable}
                          onClick={() => isReachable && onPick(layer, i)}
                          animate={
                            isReachable
                              ? { scale: [1, 1.12, 1], boxShadow: ["0 0 0 0 rgba(217,164,65,0.55)", "0 0 0 8px rgba(217,164,65,0)", "0 0 0 0 rgba(217,164,65,0)"] }
                              : { scale: 1 }
                          }
                          transition={isReachable ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
                          whileTap={isReachable ? { scale: 0.92 } : undefined}
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-full ring-2 transition-shadow",
                            TYPE_BG[n.type],
                            RISK_RING[n.risk],
                            isCurrent && "ring-4 ring-white/80",
                            isReachable ? "cursor-pointer" : "opacity-80",
                            zoneLocked && !isCurrent && "opacity-50 grayscale-[0.4]"
                          )}
                          title={zoneLocked ? `🔒 ${g.path.zoneLocked}` : undefined}
                        >
                          {zoneLocked && !isReachable ? <Lock className="h-4 w-4 opacity-70" /> : <Icon className="h-5 w-5" />}
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* o'yinchi tokenlari — joriy pozitsiyada pulsli halqa */}
          {state.players
            .filter((p) => !p.bankrupt)
            .map((p, order) => {
              const pos = path.positions[p.id];
              const layer = pos?.layer ?? -1;
              const row = layer >= 0 ? path.nodes[layer] : null;
              const x = row && pos ? nodeX(pos.node, row.length) : nodeX(order, state.players.length);
              const y = row && pos ? nodeY(layer) : totalH - 14; // start — tog etagida
              const isHumanToken = p.id === human.id;
              return (
                <motion.div
                  key={p.id}
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  initial={false}
                  animate={{ left: `${x + (order % 2 === 0 ? -4 : 4)}%`, top: y + (order < 2 ? -16 : 16) }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                >
                  {isHumanToken && (
                    <motion.span
                      className="absolute left-1/2 top-1/2 -z-10 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-gold-400/80"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0.15, 0.8] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      title={g.path.youAreHere}
                    />
                  )}
                  <PlayerToken
                    name={p.name}
                    colorIndex={p.colorIndex}
                    size={22}
                    active={state.players[state.current].id === p.id}
                  />
                </motion.div>
              );
            })}
        </div>
      </div>
      {/* afsona (legend) */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-emerald-800/60 px-3 py-2">
        {(["safe", "mid", "risky"] as PathRisk[]).map((r) => (
          <span key={r} className={cn("flex items-center gap-1 text-[10px] font-medium text-emerald-100/80")}>
            <span className={cn("h-2.5 w-2.5 rounded-full ring-2", RISK_RING[r], "bg-emerald-900")} />
            {r === "safe" ? "Xavfsiz" : r === "mid" ? "O'rtacha" : "Riskli"}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-100/80">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-800/80 text-[9px] text-emerald-300">?</span>
          {g.path.fogLabel}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-100/80">
          <Lock className="h-3 w-3" />
          {g.path.zoneLocked}
        </span>
        <span className="text-[10px] font-medium text-emerald-100/60" style={{ color: PLAYER_COLORS[human.colorIndex] }}>
          ● {human.name}
        </span>
      </div>
    </div>
  );
}
