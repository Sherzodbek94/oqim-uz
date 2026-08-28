import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Wallet, Receipt, PiggyBank } from "lucide-react";
import { professions } from "./data";
import { uz } from "@/lib/uz";
import { formatUZSCompact, formatDelta } from "@/lib/format";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function ProfessionCard({ p, index }: { p: (typeof professions)[number]; index: number }) {
  const cashflow = p.salary - p.expenses;
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      className="card-game-piece group w-[280px] shrink-0 snap-start !p-0 transition-transform duration-200 hover:-translate-y-1.5"
    >
      <div className="h-[3px] w-full bg-emerald-600" />
      <div className="p-5">
        <div className="relative">
          <img
            src={p.avatar}
            alt={p.name}
            className="h-24 w-24 rounded-full object-cover shadow-card transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute -right-2 -top-2 rotate-[8deg] rounded-lg border-2 border-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {uz.home.professions.stamp}
          </span>
        </div>
        <h3 className="mt-4 text-h3 !text-[20px]">{p.name}</h3>
        <p className="mt-1 text-body-sm text-ink-400">{p.flavor}</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-body-sm text-ink-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              {uz.common.salary}
            </span>
            <span className="text-money-sm text-emerald-600">+{formatDelta(p.salary)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-body-sm text-ink-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay-100 text-clay-500">
                <Receipt className="h-3.5 w-3.5" />
              </span>
              {uz.common.expenses}
            </span>
            <span className="text-money-sm text-clay-500">{formatDelta(-p.expenses)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-body-sm text-ink-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <PiggyBank className="h-3.5 w-3.5" />
              </span>
              {uz.common.savings}
            </span>
            <span className="text-money-sm text-sky-600">{formatUZSCompact(p.savings)}</span>
          </div>
        </div>
        <div className="mt-4 border-t border-sand-200 pt-3">
          <div className="text-caption text-ink-400">{uz.common.monthlyCashflow}</div>
          <div className={`text-money-lg ${cashflow >= 0 ? "text-emerald-600" : "text-clay-500"}`}>
            {formatDelta(cashflow)}
            <span className="ml-1 text-body-sm font-normal text-ink-400">{uz.common.perMonth}</span>
          </div>
          <div className="mt-1 text-caption text-ink-400">
            {uz.common.debts}: {formatUZSCompact(p.debts)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Professions() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => trackRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h2 className="text-h2">{uz.home.professions.title}</h2>
            <p className="mt-3 max-w-xl text-ink-600">{uz.home.professions.sub}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary !rounded-full !p-3" onClick={() => scrollBy(-400)} aria-label="Oldingi">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="btn-secondary !rounded-full !p-3" onClick={() => scrollBy(400)} aria-label="Keyingi">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </div>
      {/* carousel with edge fade masks */}
      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 pt-2 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {professions.map((p, i) => (
            <ProfessionCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
