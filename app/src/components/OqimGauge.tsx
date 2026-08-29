import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * OqimGauge / ProgressRing (design.md §9.8)
 * SVG ring: track sand-200; progress = share of expenses covered by passive income.
 * <100% -> clay→gold gradient stroke; >=100% -> emerald gradient + celebratory pulse.
 * Center: % in money-lg + caption.
 */
export default function OqimGauge({
  passiveIncome,
  expenses,
  size = 120,
  strokeWidth = 10,
  className,
  caption = "Passiv daromad / Xarajatlar",
}: {
  passiveIncome: number;
  expenses: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  caption?: string;
}) {
  const gid = useId();
  const pct = expenses > 0 ? Math.max(0, Math.min(1, passiveIncome / expenses)) : 1;
  const reached = expenses > 0 && passiveIncome >= expenses;

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setAnimated(pct);
      return;
    }
    const start = performance.now();
    const from = animated;
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      setAnimated(from + (pct - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - animated);
  const shown = Math.round(animated * 100);

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className={cn(reached && "animate-gauge-pulse")}>
          <defs>
            <linearGradient id={`${gid}-progress`} x1="0" y1="0" x2="1" y2="1">
              {reached ? (
                <>
                  <stop offset="0%" stopColor="#2E7D5F" />
                  <stop offset="100%" stopColor="#24604A" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#C9744C" />
                  <stop offset="100%" stopColor="#D9A441" />
                </>
              )}
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#EAE1CF"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gid}-progress)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-money-lg", reached ? "text-emerald-600" : "text-ink-900")}>
            {shown}%
          </span>
        </div>
      </div>
      <span className="text-caption text-center text-ink-400">{caption}</span>
    </div>
  );
}
