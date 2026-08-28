import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { BookOpen, Check } from "lucide-react";
import MoneyDisplay from "@/components/MoneyDisplay";
import { uz } from "@/lib/uz";
import { formatDelta } from "@/lib/format";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Mini Financial Statement mock with a live ticking cashflow number */
function StatementMock() {
  const [cashflow, setCashflow] = useState(2_300_000);
  useEffect(() => {
    const id = setInterval(() => {
      setCashflow((v) => (v === 2_300_000 ? 3_100_000 : 2_300_000));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const rows = [
    { label: uz.common.salary, value: "+3 500 000", tint: "bg-emerald-50 text-emerald-700" },
    { label: uz.common.passiveIncome, value: "+2 300 000", tint: "bg-emerald-100 text-emerald-700" },
    { label: uz.common.expenses, value: "−2 900 000", tint: "bg-clay-100 text-clay-500" },
  ];
  return (
    <div className="card relative !p-5">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-6 rounded-t-2xl text-emerald-600 opacity-10"
        style={{ backgroundImage: "url(/border-suzani.svg)", backgroundRepeat: "repeat-x", backgroundSize: "480px 24px" }}
      />
      <div className="text-caption mt-2 text-ink-400">Moliyaviy hisobot</div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between rounded-xl px-3 py-2 ${r.tint}`}>
            <span className="text-body-sm font-medium">{r.label}</span>
            <span className="text-money-sm">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-sand-200 pt-3">
        <span className="text-caption text-ink-400">{uz.common.monthlyCashflow}</span>
        <MoneyDisplay value={cashflow} size="lg" className="text-emerald-600" />
      </div>
    </div>
  );
}

export default function Academy() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 md:px-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="text-caption text-emerald-600">{uz.home.academy.eyebrow}</span>
          <h2 className="mt-2 text-h2">{uz.home.academy.title}</h2>
          <p className="mt-4 text-ink-600">{uz.home.academy.body}</p>
          <ul className="mt-6 space-y-3">
            {uz.home.academy.checklist.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.15, ease: EASE }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="text-ink-900">{item}</span>
              </motion.li>
            ))}
          </ul>
          <Link to="/rules" className="btn-secondary mt-8">
            <BookOpen className="h-4 w-4" />
            {uz.common.rulesAndGlossary}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <StatementMock />
          <p className="mt-3 text-center text-caption text-ink-400">
            {formatDelta(2_300_000)} so'm → +3 100 000 so'm
          </p>
        </motion.div>
      </div>
    </section>
  );
}
