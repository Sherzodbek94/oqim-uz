import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Dice (design.md §9.6) — two 3D CSS cubes.
 * White faces, ink-900 pips, rounded faces, shadow-token.
 * States: idle (gentle breathing tilt), rolling (tumble), result (glow ring in player color).
 * `size`: 64 default, 44 compact for the game top bar.
 */

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

/** Final cube rotation so that `face` points forward. */
const FACE_ROT: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(-90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(90deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

function DieFace({ value, size, transform }: { value: number; size: number; transform: string }) {
  const half = size / 2;
  return (
    <div
      className="absolute rounded-2xl border border-sand-200 bg-white"
      style={{
        width: size,
        height: size,
        transform: `${transform} translateZ(${half}px)`,
        backfaceVisibility: "hidden",
      }}
    >
      {PIPS[value].map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-ink-900"
          style={{
            width: size * 0.16,
            height: size * 0.16,
            left: size / 2 + x * size * 0.26 - size * 0.08,
            top: size / 2 + y * size * 0.26 - size * 0.08,
          }}
        />
      ))}
    </div>
  );
}

function Die({
  value,
  size,
  rolling,
  glowColor,
  delay = 0,
}: {
  value: number;
  size: number;
  rolling: boolean;
  glowColor?: string;
  delay?: number;
}) {
  const faceTransforms = [
    "", // 1 front
    "rotateY(90deg)", // 2 right
    "rotateX(90deg)", // 3 top
    "rotateX(-90deg)", // 4 bottom
    "rotateY(-90deg)", // 5 left
    "rotateY(180deg)", // 6 back
  ];
  return (
    <div
      className={cn("relative", !rolling && "animate-die-idle")}
      style={{
        width: size,
        height: size,
        perspective: size * 6,
        filter: glowColor ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
      }}
    >
      <div
        className={cn("absolute inset-0 shadow-token rounded-2xl", rolling && "animate-die-tumble")}
        style={{
          transformStyle: "preserve-3d",
          transform: rolling ? undefined : FACE_ROT[value],
          transition: rolling ? undefined : "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          animationDelay: `${delay}ms`,
        }}
      >
        {faceTransforms.map((t, i) => (
          <DieFace key={i} value={(i + 1) as 1 | 2 | 3 | 4 | 5 | 6} size={size} transform={t} />
        ))}
      </div>
    </div>
  );
}

export default function Dice({
  values = [1, 1],
  rolling = false,
  size = 64,
  playerColor,
  className,
}: {
  values?: [number, number];
  rolling?: boolean;
  size?: number;
  playerColor?: string;
  className?: string;
}) {
  const v = useMemo<[number, number]>(
    () => [Math.min(6, Math.max(1, values[0])), Math.min(6, Math.max(1, values[1]))],
    [values]
  );
  return (
    <div className={cn("inline-flex items-center gap-3", className)} role="img" aria-label={`Zarlar: ${v[0]} va ${v[1]}`}>
      <Die value={v[0]} size={size} rolling={rolling} glowColor={playerColor} />
      <Die value={v[1]} size={size} rolling={rolling} glowColor={playerColor} delay={120} />
    </div>
  );
}
