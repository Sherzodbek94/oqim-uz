import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatUZS } from "@/lib/format";

/**
 * MoneyDisplay (design.md §9.7)
 * JetBrains Mono tabular figures; value changes animate with a 700ms count tween.
 * Large sizes include a tiny coin-glyph at 0.9em.
 */
type Size = "lg" | "md" | "sm";

const sizeClass: Record<Size, string> = {
  lg: "text-money-lg",
  md: "text-money",
  sm: "text-money-sm",
};

export default function MoneyDisplay({
  value,
  size = "md",
  className,
  showCoin,
  prefix,
}: {
  value: number;
  size?: Size;
  className?: string;
  showCoin?: boolean;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const coin = showCoin ?? size === "lg";

  return (
    <span className={cn("inline-flex items-baseline gap-[0.35em]", sizeClass[size], className)}>
      {coin && (
        <img
          src="/coin-glyph.svg"
          alt=""
          aria-hidden
          style={{ width: "0.9em", height: "0.9em", transform: "translateY(0.1em)" }}
        />
      )}
      {prefix && <span>{prefix}</span>}
      <span>{formatUZS(display)}</span>
    </span>
  );
}
