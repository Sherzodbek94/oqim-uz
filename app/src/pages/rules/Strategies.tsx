import { motion } from "framer-motion";
import { STRATEGIES } from "./data";
import { EASE, SectionHead } from "./ui";
import { cn } from "@/lib/utils";

/** §7 G'alaba strategiyalari — 2×2 tilt-on-hover cards. */
export default function Strategies() {
  return (
    <div>
      <SectionHead
        eyebrow="07 · STRATEGIYA"
        title="G'alaba strategiyalari"
        sub="Tajribali o'yinchilar qo'llaydigan to'rt odat."
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {STRATEGIES.map((s, i) => (
          <motion.div
            key={s.title}
            className="card transition-shadow duration-200 hover:shadow-lift"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
            whileHover={{ rotate: i % 2 === 0 ? -3 : 3, transition: { type: "spring", stiffness: 300, damping: 15 } }}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                i % 2 === 0 ? "bg-emerald-100 text-emerald-600" : "bg-gold-100 text-gold-600"
              )}
            >
              <s.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-h3 !text-xl">{s.title}</h3>
            <p className="mt-1.5 text-body-sm text-ink-600">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
