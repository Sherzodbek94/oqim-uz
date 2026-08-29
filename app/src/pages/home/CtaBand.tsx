import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import { uz } from "@/lib/uz";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface StarP {
  id: number;
  x: number;
}

/** 5 gold star particles float up occasionally (spawn every 3s, fade over 4s, ≤5 live) */
function StarParticles() {
  const [stars, setStars] = useState<StarP[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const spawn = setInterval(() => {
      setStars((s) => {
        const next = [...s, { id: ++id, x: 8 + Math.random() * 84 }];
        return next.slice(-5);
      });
    }, 3000);
    const sweep = setInterval(() => {
      setStars((s) => s.slice(-5));
    }, 4200);
    return () => {
      clearInterval(spawn);
      clearInterval(sweep);
    };
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((s) => (
        <motion.img
          key={s.id}
          src="/star-8.svg"
          alt=""
          className="absolute bottom-4 h-5 w-5 text-gold-500"
          style={{ left: `${s.x}%`, color: "#D9A441" }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -260, opacity: [0, 1, 0] }}
          transition={{ duration: 4, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-emerald-700 py-20 md:py-28">
      {/* dreams strip blended at top edge */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 bg-cover bg-center opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{ backgroundImage: "url(/dreams-strip.png)" }}
      />
      {/* white suzani pattern at 8% */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] text-white"
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />
      <StarParticles />
      <div className="relative mx-auto max-w-[1200px] px-6 text-center md:px-10">
        <motion.h2
          className="text-display-lg !text-white"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {uz.home.cta.title}
        </motion.h2>
        <motion.p
          className="mx-auto mt-4 max-w-lg text-white/80"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        >
          {uz.home.cta.sub}
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
        >
          <Link to="/game" className="btn-gold animate-btn-pulse !px-8 !py-4 !text-base">
            <Dices className="h-5 w-5" />
            {uz.home.cta.start}
          </Link>
          <Link
            to="/rules"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/50 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {uz.home.cta.rules}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
