import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Info, MousePointerClick } from "lucide-react";
import CashflowGauge from "@/components/CashflowGauge";
import MoneyDisplay from "@/components/MoneyDisplay";
import { formatUZS } from "@/lib/format";
import { ANNOTATIONS, STATEMENT, type ZoneId } from "./data";
import { EASE, Pin, SectionHead } from "./ui";
import { cn } from "@/lib/utils";

function Zone({
  id,
  active,
  onHover,
  className,
  children,
}: {
  id: ZoneId;
  active: ZoneId | null;
  onHover: (z: ZoneId | null) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "rounded-xl transition-all duration-300",
        active === id &&
          "shadow-[0_0_0_2px_#2E7D5F,0_0_18px_rgba(46,125,95,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone?: "pos" | "neg" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <span className="text-body-sm text-ink-600">{label}</span>
      <span
        className={cn(
          "text-money-sm",
          tone === "pos" && "text-emerald-600",
          tone === "neg" && "text-clay-500",
          !tone && "text-ink-900"
        )}
      >
        {formatUZS(value)}
      </span>
    </div>
  );
}

/** §4 Moliyaviy hisobot — annotated mock + scripted demo transaction. */
export default function StatementSection() {
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);
  const [demo, setDemo] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  // scripted demo fires once when ~60% of the section has scrolled into view
  const demoTrigger = useInView(sectionRef, { once: true, margin: "-45% 0px" });

  useEffect(() => {
    if (!demoTrigger) return;
    const id = setTimeout(() => setDemo(true), 700);
    return () => clearTimeout(id);
  }, [demoTrigger]);

  const passive = demo ? STATEMENT.passiveAfter : STATEMENT.passiveBase;
  const totalIncome = STATEMENT.salary + passive;
  const cashflow = totalIncome - STATEMENT.expensesTotal;

  return (
    <div ref={sectionRef}>
      <SectionHead
        eyebrow="04 · HISOBOT"
        title="Moliyaviy hisobot"
        sub="O'yindagi eng muhim panel. Bank xodimi misolida har bir zonani ko'rib chiqamiz — izohlar ustiga keling yoki hisobot zonasini bosing."
      />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_300px]">
        {/* Statement mock — slides in from left */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.65, ease: EASE }}
          className="overflow-x-auto rounded-3xl border border-sand-200 bg-white shadow-card"
        >
          <div className="min-w-[480px]">
            {/* header */}
            <div
              className="border-b border-sand-200 px-6 pb-4 pt-5"
              style={{
                backgroundImage: "url(/border-suzani.svg)",
                backgroundRepeat: "repeat-x",
                backgroundPosition: "bottom",
                backgroundSize: "480px 24px",
              }}
            >
              <p className="text-caption text-ink-400">Moliyaviy hisobot</p>
              <h3 className="mt-1 text-h3 !text-xl">{STATEMENT.profession}</h3>
            </div>

            <div className="space-y-4 p-4 md:p-6">
              {/* DAROMAD */}
              <Zone id="income" active={activeZone} onHover={setActiveZone}>
                <div className="px-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Pin n={1} />
                    <span className="text-caption text-ink-400">Daromad</span>
                  </div>
                </div>
                <Row label="Maosh" value={STATEMENT.salary} />
                <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <span className="text-body-sm text-ink-600">Depozit foizi (passiv)</span>
                  <MoneyDisplay value={passive} size="sm" className="text-emerald-600" showCoin={false} />
                </div>
                <div className="mx-3 mt-1 flex items-baseline justify-between gap-3 rounded-lg bg-emerald-100 px-3 py-2">
                  <span className="text-body-sm font-semibold text-ink-900">Jami daromad</span>
                  <MoneyDisplay value={totalIncome} size="md" className="!text-base text-emerald-700" showCoin={false} />
                </div>
              </Zone>

              {/* XARAJATLAR */}
              <Zone id="expenses" active={activeZone} onHover={setActiveZone}>
                <div className="px-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Pin n={2} />
                    <span className="text-caption text-ink-400">Xarajatlar</span>
                  </div>
                </div>
                {STATEMENT.expenseRows.map((r) => (
                  <Row key={r.label} label={r.label} value={r.value} />
                ))}
                <div className="mx-3 mt-1 flex items-baseline justify-between gap-3 rounded-lg bg-clay-100 px-3 py-2">
                  <span className="text-body-sm font-semibold text-ink-900">Jami xarajatlar</span>
                  <span className="text-money !text-base text-clay-600">
                    {formatUZS(STATEMENT.expensesTotal)}
                  </span>
                </div>
              </Zone>

              {/* OQIM + GAUGE */}
              <div className="flex flex-wrap items-center gap-4">
                <Zone id="cashflow" active={activeZone} onHover={setActiveZone} className="flex-1">
                  <motion.div
                    className="rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-3"
                    animate={demo ? { backgroundColor: ["#EFF6F1", "#DDEEE3", "#EFF6F1"] } : {}}
                    transition={{ duration: 0.9 }}
                  >
                    <div className="flex items-center gap-2">
                      <Pin n={3} />
                      <span className="text-caption text-emerald-700">Oylik naqd oqim</span>
                    </div>
                    <MoneyDisplay
                      value={cashflow}
                      size="lg"
                      prefix="+"
                      className="mt-1 text-emerald-600"
                    />
                  </motion.div>
                </Zone>
                <Zone id="gauge" active={activeZone} onHover={setActiveZone} className="p-2">
                  <div className="flex flex-col items-center gap-1">
                    <Pin n={6} />
                    <CashflowGauge passiveIncome={passive} expenses={STATEMENT.expensesTotal} size={110} />
                  </div>
                </Zone>
              </div>

              {/* AKTIVLAR */}
              <Zone id="assets" active={activeZone} onHover={setActiveZone}>
                <div className="px-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Pin n={4} />
                    <span className="text-caption text-ink-400">Aktivlar</span>
                  </div>
                </div>
                {STATEMENT.assets.map((a) => (
                  <div key={a.label} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                    <span className="text-body-sm text-ink-600">{a.label}</span>
                    <span className="text-right">
                      <span className="block text-money-sm text-ink-900">{formatUZS(a.value)}</span>
                      <span className="block text-money-sm text-emerald-600">{a.flow}</span>
                    </span>
                  </div>
                ))}
                <AnimatePresence>
                  {demo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, x: -24 }}
                      animate={{ opacity: 1, height: "auto", x: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="mx-2 flex items-baseline justify-between gap-3 rounded-lg bg-emerald-100 px-3 py-1.5">
                        <span className="text-body-sm font-medium text-emerald-700">
                          {STATEMENT.deal.label}
                          <span className="chip ml-2 bg-emerald-600 text-white">yangi</span>
                        </span>
                        <span className="text-right">
                          <span className="block text-money-sm text-ink-900">
                            {formatUZS(STATEMENT.deal.value)}
                          </span>
                          <span className="block text-money-sm text-emerald-600">
                            {STATEMENT.deal.flow}
                          </span>
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Zone>

              {/* PASSIVLAR */}
              <Zone id="liabilities" active={activeZone} onHover={setActiveZone}>
                <div className="px-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Pin n={5} />
                    <span className="text-caption text-ink-400">Passivlar</span>
                  </div>
                </div>
                {STATEMENT.liabilities.map((l) => (
                  <div key={l.label} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                    <span className="text-body-sm text-ink-600">{l.label}</span>
                    <span className="text-right">
                      <span className="block text-money-sm text-ink-900">{formatUZS(l.value)}</span>
                      <span className="block text-money-sm text-clay-500">{l.flow}</span>
                    </span>
                  </div>
                ))}
              </Zone>
            </div>
          </div>
        </motion.div>

        {/* Annotations */}
        <div className="space-y-3">
          {ANNOTATIONS.map((a, i) => (
            <motion.button
              key={a.pin}
              type="button"
              onMouseEnter={() => setActiveZone(a.zone)}
              onMouseLeave={() => setActiveZone(null)}
              onFocus={() => setActiveZone(a.zone)}
              onBlur={() => setActiveZone(null)}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
              className={cn(
                "block w-full rounded-2xl border bg-white p-4 text-left shadow-card transition-all duration-200",
                activeZone === a.zone ? "border-emerald-600 shadow-lift" : "border-sand-200"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Pin n={a.pin} />
                <h4 className="text-h4 !text-base">{a.title}</h4>
              </div>
              <p className="mt-1.5 text-body-sm text-ink-600">{a.body}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Callout */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mt-8 flex items-start gap-3 rounded-2xl border border-sky-600/20 bg-sky-100 p-5"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p className="text-body-sm text-ink-900">
          <span className="font-semibold">Maslahat:</span> hisobot panelidagi har bir raqam ustiga
          bosing — qayerdan kelganini ko'rsatadi.
          <MousePointerClick className="ml-2 inline h-4 w-4 text-sky-600" />
        </p>
      </motion.div>
    </div>
  );
}
