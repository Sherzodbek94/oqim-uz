/**
 * UZS currency formatting (design.md §3.3)
 * - Full format: `3 500 000 so'm` (space thousands separator, no decimals)
 * - Compact: `3,5 mln so'm`, `550 mln so'm`, `1,2 mlrd so'm` (comma decimal separator)
 * - Deltas: `+2 300 000` / `−4 000 000` (true minus sign U+2212)
 */

const MINUS = "\u2212";

/** Space-separated thousands, no decimals. `3500000` -> `3 500 000` */
export function formatNumber(n: number): string {
  const rounded = Math.round(Math.abs(n));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Full format: `3 500 000 so'm` */
export function formatUZS(n: number): string {
  const sign = n < 0 ? MINUS : "";
  return `${sign}${formatNumber(n)} so'm`;
}

/** Compact format for cards/chips/board: `3,5 mln so'm`, `1,2 mlrd so'm` */
export function formatUZSCompact(n: number): string {
  const sign = n < 0 ? MINUS : "";
  const abs = Math.abs(n);
  const comma = (v: number) =>
    (Math.round(v * 10) / 10).toString().replace(".", ",");
  if (abs >= 1_000_000_000) return `${sign}${comma(abs / 1_000_000_000)} mlrd so'm`;
  if (abs >= 1_000_000) return `${sign}${comma(abs / 1_000_000)} mln so'm`;
  if (abs >= 1_000) return `${sign}${comma(abs / 1_000)} ming so'm`;
  return `${sign}${formatNumber(abs)} so'm`;
}

/** Signed delta without currency suffix: `+2 300 000` / `−4 000 000` */
export function formatDelta(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`;
  if (n < 0) return `${MINUS}${formatNumber(n)}`;
  return "0";
}

/** Signed delta with currency: `+2 300 000 so'm` */
export function formatDeltaUZS(n: number): string {
  if (n > 0) return `+${formatNumber(n)} so'm`;
  if (n < 0) return `${MINUS}${formatNumber(n)} so'm`;
  return `0 so'm`;
}

/** Per-month suffix: `2 300 000 so'm/oy` parts — suffix rendered separately in UI */
export const PER_MONTH = "/oy";
