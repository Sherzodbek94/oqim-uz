import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Fade-up reveal on scroll into view (15% viewport margin), per global pattern. */
export function Reveal({
  children,
  delay = 0,
  y = 30,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Section header: eyebrow + H2 fade-up 30px at 15% viewport. */
export function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-[68ch]">
      <Reveal>
        <span className="chip bg-emerald-100 text-emerald-700">{eyebrow}</span>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-4 text-h2">{title}</h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.14}>
          <p className="mt-3 text-ink-600">{sub}</p>
        </Reveal>
      )}
    </div>
  );
}

/**
 * Inline financial term with dotted underline + hover/focus tooltip
 * (design.md §9.10 tooltip: ink-900 bg, white body-sm, 6px radius).
 */
export function Term({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="group/term relative inline-block">
      <button
        type="button"
        className="cursor-help border-b border-dotted border-emerald-600 font-medium text-ink-900"
        aria-label={tip}
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-md bg-ink-900 px-3 py-2 text-left text-body-sm text-white opacity-0 shadow-lift transition-opacity duration-150 group-hover/term:opacity-100 group-focus-within/term:opacity-100"
      >
        {tip}
      </span>
    </span>
  );
}

/** 8-point star bullet Erkinlik yo'li sahifasida ishlatiladi + timeline glyph. */
export function StarBullet({ className }: { className?: string }) {
  return <img src="/star-8.svg" alt="" aria-hidden className={cn("h-4 w-4", className)} />;
}

/** Gold numbered pin badge for the annotated statement mock. */
export function Pin({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-gold font-money text-xs font-bold text-ink-900 shadow-token",
        className
      )}
    >
      {n}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion (design.md §9.10) — plus→minus rotation 200ms,             */
/* body height spring 300ms, one item open at a time.                  */
/* ------------------------------------------------------------------ */

export interface AccordionItem {
  id: string;
  header: ReactNode;
  body: ReactNode;
}

export function Accordion({
  items,
  openId,
  onOpen,
  className,
}: {
  items: AccordionItem[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white shadow-card", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} id={item.id} className="scroll-mt-28">
            <button
              type="button"
              onClick={() => onOpen(open ? null : item.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-sand-50 md:px-6"
            >
              <span className="flex items-center gap-3">{item.header}</span>
              <motion.span
                animate={{ rotate: open ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                  open ? "bg-emerald-600 text-white" : "bg-sand-100 text-ink-600"
                )}
              >
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pl-[52px] pr-6 text-body-sm text-ink-600">{item.body}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
