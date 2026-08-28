import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowDown, Play } from "lucide-react";
import { EASE } from "./ui";

/**
 * Hero band (rules.md): gradient-hero + pattern-suzani 6%, eyebrow, H1,
 * sub, CTA row (primary → /game, ghost → smooth-scroll to §6).
 */
export default function Hero({ onScrollToConcepts }: { onScrollToConcepts: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div
        aria-hidden
        className="animate-pattern-pan pointer-events-none absolute -inset-[480px] opacity-[0.06] text-emerald-600 motion-reduce:animate-none"
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 pb-14 pt-14 md:px-10 md:pb-20 md:pt-20">
        <motion.span
          className="chip bg-emerald-100 text-emerald-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          QOIDALAR VA O'QUV BO'LIMI
        </motion.span>
        <motion.h1
          className="mt-5 max-w-2xl text-display-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        >
          Qanday o'ynash kerak?
        </motion.h1>
        <motion.p
          className="mt-4 max-w-xl text-ink-600"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease: EASE }}
        >
          15 daqiqada o'rganing — umrbod foydasini ko'ring. Chapda mundarija, o'ngda esa hamma
          narsa bor.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34, ease: EASE }}
        >
          <Link to="/game" className="btn-primary">
            <Play className="h-4 w-4" />
            Hozir o'ynash
          </Link>
          <button type="button" onClick={onScrollToConcepts} className="btn-ghost">
            Moliyaviy tushunchalarga o'tish
            <ArrowDown className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
