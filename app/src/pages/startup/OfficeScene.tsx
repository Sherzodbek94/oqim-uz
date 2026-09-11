/**
 * Izometrik ofis sahnasi — SVG placeholder (brend palitrasi).
 * Keyinchalik Higgsfield renderlari (assets/office/level<n>.png) bilan almashtiriladi.
 */
import type { OfficeLevel } from "@/lib/startup/types";

const G = "#24604A", GD = "#1B4A38", GOLD = "#D9A441", CREAM = "#FBF8F2", SAGE = "#9DB8A6", BEIGE = "#EAE1CF";

const DESKS: Record<OfficeLevel, [number, number][]> = {
  0: [[150, 105]],
  1: [[110, 110], [170, 90], [200, 125]],
  2: [[90, 115], [140, 95], [190, 115], [150, 135], [230, 100], [110, 140]],
  3: [[70, 120], [110, 100], [150, 80], [190, 100], [230, 120], [150, 140], [110, 140], [190, 140], [270, 110], [150, 110]],
  4: [[70, 120], [110, 100], [150, 80], [190, 100], [230, 120], [150, 140], [110, 140], [190, 140], [270, 110], [150, 110], [90, 90], [250, 90]],
};

export function Flower({ size = 18, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="12" cy="5" rx="2.6" ry="4.2" fill={color} transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill={GD} />
    </svg>
  );
}

export default function OfficeScene({ level, staffCount, morale, className }: { level: OfficeLevel; staffCount: number; morale: number; className?: string }) {
  const desks = DESKS[level].slice(0, Math.max(1, Math.min(DESKS[level].length, staffCount + 1)));
  const face = morale >= 50 ? "M22 -2 Q26 1 30 -2" : morale >= 30 ? "M22 -1 L30 -1" : "M22 0 Q26 -3 30 0";
  return (
    <svg viewBox="0 0 342 200" className={className} role="img" aria-label="Ofis ko'rinishi">
      <defs>
        <linearGradient id="oq-floor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3ECDD" /><stop offset="1" stopColor="#E4D8BE" />
        </linearGradient>
      </defs>
      <path d="M171 30 L320 105 L171 180 L22 105 Z" fill="url(#oq-floor)" />
      <path d="M22 105 L22 118 L171 193 L171 180 Z" fill="#CDBE9E" />
      <path d="M320 105 L320 118 L171 193 L171 180 Z" fill="#B9A886" />
      <path d="M22 105 L22 40 L171 -35 L171 30 Z" fill={G} opacity="0.92" />
      <path d="M320 105 L320 40 L171 -35 L171 30 Z" fill={GD} opacity="0.92" />
      <rect x="60" y="52" width="40" height="30" rx="3" fill={CREAM} transform="skewY(-26.5)" opacity="0.9" />
      <rect x="215" y="-42" width="46" height="34" rx="3" fill={CREAM} transform="skewY(26.5)" opacity="0.9" />
      <polyline points="222,-32 232,-38 242,-30 254,-44" fill="none" stroke={GOLD} strokeWidth="2.5" transform="skewY(26.5)" />
      <g transform="translate(150 6)"><Flower size={30} /></g>
      {desks.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 10 L26 -3 L52 10 L26 23 Z" fill={BEIGE} />
          <path d="M0 10 L0 16 L26 29 L26 23 Z" fill="#CBB999" />
          <path d="M52 10 L52 16 L26 29 L26 23 Z" fill="#B8A484" />
          <rect x="18" y="-6" width="16" height="11" rx="2" fill={GD} />
          <rect x="20" y="-4" width="12" height="7" rx="1" fill={SAGE} />
          <circle cx="26" cy="-16" r="6" fill="#F1C9A6" />
          <path d="M18 -4 Q26 -12 34 -4 Z" fill={i === 0 ? GOLD : G} />
          <path d={face} transform="translate(0 -14) scale(0.5)" fill="none" stroke={GD} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
      <g transform="translate(270 120)">
        <rect x="6" y="14" width="10" height="16" rx="2" fill="#B8A484" />
        <circle cx="11" cy="8" r="11" fill={SAGE} />
        <circle cx="4" cy="14" r="7" fill={G} />
      </g>
    </svg>
  );
}
