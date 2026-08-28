import { cn } from "@/lib/utils";

/**
 * PlayerToken (design.md §9.11, fix-9: "raised game-piece" uslubi)
 * Doiraviy gradient pionka: yuqoridan yorug'lik, pastki qirra soyali,
 * oq halqa + yumshoq drop shadow, glyph = ismning birinchi harfi (Bricolage 700).
 */
export const PLAYER_COLORS = ["#2E7D5F", "#D9A441", "#41788F", "#C9744C"] as const;
export type PlayerColorIndex = 0 | 1 | 2 | 3;

/** Hex rangni ochiq/quyuq ohangga o'zgartiradi (amount −1..1). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    return Math.round(Math.min(255, Math.max(0, v + (t - v) * p)));
  };
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function PlayerToken({
  name,
  colorIndex = 0,
  size = 28,
  active = false,
  className,
}: {
  name: string;
  colorIndex?: PlayerColorIndex;
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  return (
    <span
      title={name}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-white transition-transform duration-300 ease-piece-bounce",
        active && "scale-110",
        className
      )}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%, ${shade(color, 0.38)} 0%, ${color} 55%, ${shade(color, -0.28)} 100%)`,
        boxShadow: `0 ${Math.max(2, size * 0.08)}px ${Math.max(5, size * 0.2)}px rgba(30,45,42,.35), inset 0 ${Math.max(
          1,
          size * 0.05
        )}px ${Math.max(2, size * 0.08)}px rgba(255,255,255,.35), inset 0 -${Math.max(2, size * 0.06)}px 0 rgba(0,0,0,.22)`,
        fontSize: size * 0.5,
        lineHeight: 1,
        textShadow: "0 1px 2px rgba(0,0,0,.35)",
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
