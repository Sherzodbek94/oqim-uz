import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, LockOpen, ArrowRight, Star } from "lucide-react";
import OqimGauge from "@/components/OqimGauge";
import { uz } from "@/lib/uz";
import { formatUZSCompact } from "@/lib/format";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const cellCycle: (keyof typeof uz.cells)[] = [
  "payday", "opportunity", "doodad", "market", "event", "charity", "opportunity", "baby",
];
const cellColors: Record<keyof typeof uz.cells, string> = {
  opportunity: "#2E7D5F",
  market: "#41788F",
  event: "#7A5CA8",
  charity: "#C9744C",
  doodad: "#C24E4E",
  payday: "#D9A441",
  baby: "#7FA05A",
  downsized: "#5A6B70",
};

function RingCells({
  count, radius, center, size, colors, gold,
}: {
  count: number; radius: number; center: number; size: number; colors?: string[]; gold?: boolean;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = center + radius * Math.cos(a) - size / 2;
        const y = center + radius * Math.sin(a) - size / 2;
        const col = gold ? "#D9A441" : colors![i % colors!.length];
        return (
          <motion.rect
            key={i}
            x={x} y={y} width={size} height={size} rx={size * 0.3}
            fill={col}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: gold ? 0.55 : 0.95 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.04, duration: 0.3, ease: EASE }}
            style={{ originX: `${x + size / 2}px`, originY: `${y + size / 2}px` }}
          />
        );
      })}
    </>
  );
}

export default function Rings({ onToast }: { onToast: (msg: string) => void }) {
  const [passive, setPassive] = useState(0); // 0..30 mln
  const [escaped, setEscaped] = useState(false);
  const [burst, setBurst] = useState(0);
  const expenses = 8_000_000;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!escaped && passive >= expenses) {
      setEscaped(true);
      setBurst((b) => b + 1);
      onToast(uz.home.rings.congrats);
    }
    if (escaped && passive < expenses) setEscaped(false);
  }, [passive, escaped, onToast]);

  const C = 210; // svg half
  const rA = 150, rB = 150;

  return (
    <section className="relative bg-sand-100 py-16 md:py-24">
      {/* suzani divider on top, emerald 10% */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-6 text-emerald-600 opacity-10"
        style={{ backgroundImage: "url(/border-suzani.svg)", backgroundRepeat: "repeat-x", backgroundSize: "480px 24px" }}
      />
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <h2 className="text-h2">{uz.home.rings.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-600">{uz.home.rings.sub}</p>
        </motion.div>

        <div ref={wrapRef} className="relative mt-12 flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-4">
          {/* Ring A — Kundalik aylana */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="card relative !p-4"
          >
            <svg viewBox="0 0 420 420" className="h-[320px] w-[320px] md:h-[420px] md:w-[420px]">
              <motion.circle
                cx={C} cy={C} r={rA} fill="none" stroke="#DDEEE3" strokeWidth="26"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <RingCells count={30} radius={rA} center={C} size={20} colors={cellCycle.map((k) => cellColors[k])} />
              <text x={C} y={C - 6} textAnchor="middle" fontFamily="'Bricolage Grotesque', sans-serif" fontWeight="700" fontSize="26" fill="#1E2D2A">
                {uz.home.rings.ratRace}
              </text>
              <text x={C} y={C + 20} textAnchor="middle" fontSize="13" fill="#8A9992">
                {uz.home.rings.ratRaceCaption}
              </text>
            </svg>
            {/* escaping token */}
            <motion.div
              className="absolute left-1/2 top-1/2 z-10 h-7 w-7 rounded-full bg-emerald-600 shadow-token ring-2 ring-white"
              animate={
                escaped
                  ? { x: [0, 120, 300], y: [-rA + 40, -230, -60], scale: [1, 1.15, 1] }
                  : { x: 0, y: -rA + 40 }
              }
              transition={{ duration: 0.9, ease: EASE, times: [0, 0.5, 1] }}
              style={{ translateX: "-50%", translateY: "-50%" }}
            />
          </motion.div>

          {/* Arrow connector */}
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="text-gold-500 max-lg:rotate-90"
          >
            <ArrowRight className="h-10 w-10" />
          </motion.div>

          {/* Ring B — Erkinlik yo'li */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="card relative !p-4"
          >
            <svg viewBox="0 0 420 420" className="h-[320px] w-[320px] md:h-[420px] md:w-[420px]">
              <motion.circle
                cx={C} cy={C} r={rB} fill="none" stroke="#F7ECD2" strokeWidth="30"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <RingCells count={16} radius={rB} center={C} size={24} gold />
              {/* 3 dream star cells */}
              {[0, 5, 11].map((i) => {
                const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
                const x = C + rB * Math.cos(a), y = C + rB * Math.sin(a);
                return (
                  <g key={i} transform={`translate(${x - 13} ${y - 13})`}>
                    <image href="/star-8.svg" width="26" height="26" color="#B98428" style={{ color: "#B98428" }} />
                  </g>
                );
              })}
              <text x={C} y={C - 24} textAnchor="middle" fontFamily="'Bricolage Grotesque', sans-serif" fontWeight="700" fontSize="26" fill="#1E2D2A">
                {uz.home.rings.fastTrack}
              </text>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="mt-6 flex flex-col items-center gap-1">
                <motion.span
                  animate={escaped ? { scale: [1, 1.4, 1], rotate: [0, -8, 0] } : {}}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${escaped ? "bg-gold-500 text-white" : "bg-gold-100 text-gold-600"}`}
                >
                  {escaped ? <LockOpen className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                </motion.span>
                <span className="text-caption max-w-[150px] text-center text-ink-400">
                  {uz.home.rings.fastTrackCaption}
                </span>
              </div>
            </div>
            {/* gold burst particles */}
            <AnimatePresence>
              {burst > 0 && (
                <div key={burst} className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i / 12) * Math.PI * 2;
                    return (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-gold-500"
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ x: Math.cos(a) * 130, y: Math.sin(a) * 130, opacity: 0, scale: 0.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Escape condition scrubber */}
        <div className="mx-auto mt-10 max-w-xl">
          <div className="card flex flex-col items-center gap-6 !p-6 md:flex-row">
            <OqimGauge passiveIncome={passive} expenses={expenses} caption={uz.home.rings.exitCondition} />
            <div className="w-full flex-1">
              <div className="flex items-center justify-between text-body-sm">
                <span className="font-medium text-ink-900">{uz.home.rings.yourPassive}</span>
                <span className="text-money-sm text-emerald-600">{formatUZSCompact(passive)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={30_000_000}
                step={500_000}
                value={passive}
                onChange={(e) => setPassive(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-600"
                aria-label={uz.home.rings.yourPassive}
              />
              <div className="mt-1 flex items-center justify-between text-body-sm text-ink-400">
                <span>{uz.home.rings.expensesFixed}</span>
                <span className="text-money-sm">{formatUZSCompact(expenses)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-caption text-gold-600">
                <Star className="h-3.5 w-3.5" />
                <span>{uz.home.rings.dream} × 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
