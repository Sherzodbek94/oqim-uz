import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Check } from "lucide-react";
import { ESCAPE } from "./data";
import { EASE, SectionHead, Term } from "./ui";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX = 6_000_000;

/** §5 Chiqish formulasi — stat tiles + scroll-scrubbed bars + ESCAPE stamp. */
export default function EscapeMath() {
  const [stage, setStage] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start 85%", "end 45%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const s = v < 0.3 ? 0 : v < 0.55 ? 1 : v < 0.8 ? 2 : 3;
    setStage(s);
  });

  const passive = ESCAPE.stages[stage].passive;
  const escaped = passive >= ESCAPE.expenses;
  const clayH = (ESCAPE.expenses / MAX) * 100;
  const emH = (passive / MAX) * 100;

  return (
    <div>
      <SectionHead eyebrow="05 · CHIQISH" title="Chiqish formulasi" />

      {/* worked example stat tiles */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <motion.div
          className="card-stat"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="text-caption text-ink-400">Xarajatlar</div>
          <div className="mt-1 text-money-lg text-clay-500">5 500 000</div>
          <div className="text-body-sm text-ink-400">/oy</div>
        </motion.div>
        <motion.div
          className="card-stat"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.45, delay: 0.08, ease: EASE }}
        >
          <div className="text-caption text-ink-400">Passiv daromad</div>
          <div className="mt-1 text-money-lg text-emerald-600">6 000 000</div>
          <div className="text-body-sm text-ink-400">/oy</div>
        </motion.div>
        <motion.div
          className="card-stat !border-emerald-600/40 !bg-emerald-50"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.45, delay: 0.16, ease: EASE }}
        >
          <div className="text-caption text-emerald-700">Natija</div>
          <div className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-emerald-600">
            CHIQDINGIZ
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-4 w-4" />
            </span>
          </div>
        </motion.div>
      </div>

      <motion.p
        className="mt-6 max-w-[68ch] text-ink-600"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Maosh bu katakdan chiqarmaydi — faqat{" "}
        <Term label="aktivlar" tip="Cho'ntakka pul oqizadigan mulklar: depozit, ijara, biznes." />{" "}
        chiqaradi. Maoshingiz qancha katta bo'lmasin, xarajatlaringiz ham oshsa, aylana davom
        etadi ("oltin qafas").
      </motion.p>

      {/* before/after bar diagram */}
      <motion.div
        ref={cardRef}
        className="relative mt-8 rounded-3xl border border-sand-200 bg-white p-6 shadow-card md:p-8"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <p className="text-caption text-ink-400">Passiv daromad xarajatlarni qoplaguncha</p>

        <div className="mt-6 flex h-56 items-end justify-center gap-10 md:h-64 md:gap-16">
          {/* clay bar — expenses, fixed */}
          <div className="flex h-full w-24 flex-col justify-end md:w-32">
            <div className="mb-2 text-center text-money-sm text-clay-500">
              {formatNumber(ESCAPE.expenses)}
            </div>
            <motion.div
              className="w-full rounded-t-xl bg-clay-500"
              initial={{ height: 0 }}
              whileInView={{ height: `${clayH}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
            />
            <div className="mt-2 text-center text-caption text-ink-400">Xarajatlar</div>
          </div>

          {/* emerald bar — passive, grows in 3 stages with scroll */}
          <div className="flex h-full w-24 flex-col justify-end md:w-32">
            <div className="mb-2 flex flex-col items-center gap-1">
              <div className="text-center text-money-sm text-emerald-600">
                {formatNumber(passive)}
              </div>
              <div className="h-6">
                {ESCAPE.stages[stage].label && (
                  <motion.span
                    key={stage}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="chip bg-emerald-100 text-emerald-700"
                  >
                    {ESCAPE.stages[stage].label}
                  </motion.span>
                )}
              </div>
            </div>
            <motion.div
              className={cn(
                "w-full rounded-t-xl transition-shadow duration-300",
                escaped ? "bg-gradient-emerald shadow-[0_0_24px_rgba(217,164,65,0.5)]" : "bg-emerald-600"
              )}
              animate={{ height: `${emH}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
            <div className="mt-2 text-center text-caption text-ink-400">Passiv daromad</div>
          </div>
        </div>

        {/* ESCAPE stamp */}
        {escaped && (
          <motion.div
            initial={{ scale: 1.3, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1, x: [0, -2, 2, -2, 0] }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-none absolute right-6 top-6 rounded-lg border-4 border-gold-500 bg-gold-100/90 px-5 py-2 font-display text-2xl font-bold tracking-[0.08em] text-gold-600 shadow-lift md:right-10"
          >
            ESCAPE
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
