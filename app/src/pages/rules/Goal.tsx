import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Calculator, Timer, Users } from "lucide-react";
import CashflowGauge from "@/components/CashflowGauge";
import { EASE, SectionHead, Term } from "./ui";

const FORMULA = ["PASSIV", "DAROMAD", "≥", "OYLIK", "XARAJATLAR"];

const MINIS = [
  { icon: Calculator, title: "Kalkulyator kerak emas", body: "Hisobot avtomatik yuritiladi." },
  { icon: Timer, title: "Vaqt chegarasi yo'q", body: "O'z tempingizda o'ynang." },
  { icon: Users, title: "Yolg'iz yoki botlar bilan", body: "2–4 o'yinchi." },
];

/** §1 Maqsad — lead, formula card with gauge, 3 mini-cards. */
export default function Goal() {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: "-25% 0px" });

  return (
    <div>
      <SectionHead eyebrow="01 · MAQSAD" title="O'yin nima haqida?" />
      <motion.p
        className="mt-6 max-w-[68ch] text-ink-600"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        OQIM — moliyaviy savodxonlik o'yini. Siz
        "Kundalik aylana" — maoshdan maoshga yashash siklida — boshlaysiz. Maqsad:{" "}
        <Term
          label="passiv daromad"
          tip="Ishlamasdan keladigan daromad: ijara, depozit foizi, divident."
        />
        ingizni oylik xarajatlaringizdan yuqori qilish. Shunda Erkinlik yo'li ochiladi.
      </motion.p>

      {/* Formula card */}
      <div ref={cardRef}>
        <motion.div
          className="mt-8 rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-900 md:text-4xl">
            {FORMULA.map((w, i) => (
              <motion.span
                key={i}
                className={
                  w === "≥"
                    ? "mx-1 inline-block text-emerald-600"
                    : w === "PASSIV" || w === "DAROMAD"
                      ? "inline-block text-emerald-600"
                      : "inline-block"
                }
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.15 + i * 0.1, ease: EASE }}
              >
                {w}
                {i < FORMULA.length - 1 ? "\u00A0" : ""}
              </motion.span>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <CashflowGauge passiveIncome={inView ? 5_500_000 : 0} expenses={5_500_000} size={140} />
          </div>
          <p className="mt-4 text-body-sm text-ink-400">Bu shart bajarilganda g'alaba yaqin.</p>
        </motion.div>
      </div>

      {/* Mini cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {MINIS.map((m, i) => (
          <motion.div
            key={m.title}
            className="card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <m.icon className="h-5 w-5" />
            </span>
            <h4 className="mt-3 text-h4 !text-base">{m.title}</h4>
            <p className="mt-1 text-body-sm text-ink-600">{m.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
