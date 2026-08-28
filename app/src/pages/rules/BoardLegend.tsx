import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CELLS, type CellExample, type CellLegend } from "./data";
import { EASE, SectionHead } from "./ui";
import { cn } from "@/lib/utils";

/** Read-only example card shown in the legend popover (game card anatomy). */
function ExampleCard({ cell, example }: { cell: CellLegend; example: CellExample }) {
  return (
    <div className="w-64 rounded-2xl border border-sand-200 bg-white p-4 text-left shadow-modal">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cell.color}1A`, color: cell.color }}
        >
          <cell.icon className="h-4 w-4" />
        </span>
        <span className={cn("chip", cell.chipCls)}>{cell.name}</span>
      </div>
      <h4 className="mt-3 font-display text-base font-semibold text-ink-900">{example.title}</h4>
      <div className="mt-2 space-y-1.5">
        {example.lines.map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-body-sm text-ink-400">{l.label}</span>
            <span
              className={cn(
                "text-money-sm",
                l.tone === "pos" && "text-emerald-600",
                l.tone === "neg" && "text-clay-500",
                !l.tone && "text-ink-900"
              )}
            >
              {l.value}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-dashed border-sand-200 pt-2 text-caption normal-case tracking-normal text-ink-400">
        {example.note}
      </p>
    </div>
  );
}

function LegendCard({
  cell,
  index,
  active,
  onActivate,
  onDeactivate,
}: {
  cell: CellLegend;
  index: number;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  // pick a stable random example per activation cycle
  const example = useMemo(
    () => cell.examples[Math.floor(Math.random() * cell.examples.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: EASE }}
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
    >
      <button
        type="button"
        onClick={() => (active ? onDeactivate() : onActivate())}
        onFocus={onActivate}
        onBlur={onDeactivate}
        aria-expanded={active}
        className={cn(
          "block w-full rounded-2xl border bg-white p-5 text-left shadow-card transition-all duration-200 ease-out-expo",
          active
            ? "-translate-y-1 shadow-lift"
            : "border-sand-200 hover:-translate-y-1 hover:shadow-lift"
        )}
        style={{ borderColor: active ? cell.color : undefined }}
      >
        {/* mini board cell */}
        <div className="flex items-center justify-between">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-token"
            style={{ backgroundColor: cell.color }}
          >
            <cell.icon className="h-5 w-5" />
          </span>
          <span className={cn("chip", cell.chipCls)}>{cell.freq}</span>
        </div>
        <h3 className="mt-3 text-h4 !text-base">{cell.name}</h3>
        <p className="mt-1 text-body-sm text-ink-600">{cell.desc}</p>
      </button>

      {/* popover */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="absolute bottom-full left-1/2 z-40 mb-3 -translate-x-1/2"
          >
            <ExampleCard cell={cell} example={example} />
            <div className="mx-auto h-3 w-3 -translate-y-1.5 rotate-45 border-b border-r border-sand-200 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** §2 Doska va kataklar — interactive cell legend (2 cols mobile, 4 desktop). */
export default function BoardLegend() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  return (
    <div>
      <SectionHead
        eyebrow="02 · DOSKA"
        title="Doska va kataklar"
        sub="Kundalik aylana doskasi 30 katakdan iborat — har bir katak oyning bir kuni: 1-kun Oy kun (oylik), 16-kun esa Avans. Har bir katak ustiga keling — o'sha koloddan namuna karta ko'rasiz."
      />
      <div className="mt-8 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
        {CELLS.map((cell, i) => (
          <LegendCard
            key={cell.key}
            cell={cell}
            index={i}
            active={activeKey === cell.key}
            onActivate={() => setActiveKey(cell.key)}
            onDeactivate={() => setActiveKey((k) => (k === cell.key ? null : k))}
          />
        ))}
      </div>
    </div>
  );
}
