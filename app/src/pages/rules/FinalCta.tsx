import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import { EASE } from "./ui";

/** Final CTA band — emerald-700, headline word-split rise, gold button pulse. */
export default function FinalCta() {
  const words = "Tayyormisiz? Zar sizniki.".split(" ");

  return (
    <section className="relative overflow-hidden bg-emerald-700">
      {/* suzani pattern, white 12% */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] text-white"
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 py-20 text-center md:px-10 md:py-24">
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom">
              <motion.span
                className="inline-block"
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-20% 0px" }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
              >
                {w}
              </motion.span>
              {i < words.length - 1 ? "\u00A0" : ""}
            </span>
          ))}
        </h2>

        <motion.div
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
        >
          <Link to="/game" className="btn-gold animate-btn-pulse motion-reduce:animate-none">
            <Play className="h-4 w-4" />
            O'yinni boshlash
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Bosh sahifaga qaytish
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
