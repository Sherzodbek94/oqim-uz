import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import Hero from "./home/Hero";
import HowItWorks from "./home/HowItWorks";
import Rings from "./home/Rings";
import Professions from "./home/Professions";
import Investments from "./home/Investments";
import EventsMarquee from "./home/EventsMarquee";
import Academy from "./home/Academy";
import CtaBand from "./home/CtaBand";

/**
 * Bosh sahifa `/` (home.md) — marketing landing with scroll storytelling.
 * Lenis smooth scroll enabled (disabled under prefers-reduced-motion).
 */
export default function Home() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11 });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <Hero onToast={showToast} />
      <HowItWorks />
      <Rings onToast={showToast} />
      <Professions />
      <Investments />
      <EventsMarquee />
      <Academy />
      <CtaBand />

      {/* Toast (§9.10): bottom-center pill, slide-up 250ms, auto-dismiss 3.5s */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-emerald-600 px-5 py-2.5 text-body-sm font-medium text-white shadow-lift"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
