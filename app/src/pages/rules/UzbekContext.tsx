import { motion } from "framer-motion";
import { CONTEXT_CARDS } from "./data";
import { EASE, SectionHead } from "./ui";

/** §10 O'zbekiston konteksti — 2-col grid of 6 context cards. */
export default function UzbekContext() {
  return (
    <div>
      <SectionHead
        eyebrow="10 · KONTEKST"
        title="Nima uchun o'zbekcha?"
        sub="Hodisalar, narxlar va imkoniyatlar — hammasi tanish hayotdan."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CONTEXT_CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            className="card flex items-start gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <c.icon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-h4 !text-base">{c.title}</h4>
              <p className="mt-1 text-body-sm text-ink-600">{c.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="mt-6 text-caption normal-case tracking-normal text-ink-400"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        O'yindagi barcha raqamlar 2024–2025 yil O'zbekiston bozorining o'rtacha ko'rsatkichlariga
        yaqinlashtirilgan.
      </motion.p>
    </div>
  );
}
