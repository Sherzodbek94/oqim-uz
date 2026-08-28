import { useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play, BookOpen, Coins, Home as HomeIcon, Rocket } from "lucide-react";
import Dice from "@/components/Dice";
import { uz } from "@/lib/uz";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Gold hand-drawn underline that draws itself on load */
function GoldUnderline() {
  return (
    <svg viewBox="0 0 300 14" className="mt-1 h-3 w-full" aria-hidden>
      <motion.path
        d="M4 10 C 60 4, 150 3, 296 8"
        fill="none"
        stroke="#D9A441"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}

/** Word-split rise for the H1 */
function SplitWords({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + i * 0.06, ease: EASE }}
          >
            {w}
          </motion.span>
          {i < text.split(" ").length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}

/** Counting stat tile */
function StatTile({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const [n, setN] = useState(0);
  return (
    <motion.div
      className="card-stat"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      onAnimationComplete={() => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 900);
          setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }}
    >
      <div className="text-money-lg text-emerald-600">
        {n}
        {suffix}
      </div>
      <div className="mt-1 text-caption text-ink-400">{label}</div>
    </motion.div>
  );
}

export default function Hero({ onToast, onOpenMode }: { onToast: (msg: string) => void; onOpenMode: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 18 });

  const [dice, setDice] = useState<[number, number]>([3, 5]);
  const [rolling, setRolling] = useState(false);

  const rollDice = () => {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      const next: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      setDice(next);
      setRolling(false);
      onToast(uz.home.luckToast(next[0] + next[1]));
    }, 900);
  };

  const chips = [
    { icon: Coins, text: "Passiv daromad +2 300 000", cls: "left-[-12px] top-6 bg-emerald-100 text-emerald-700", delay: 0.8 },
    { icon: HomeIcon, text: "Toshkent kvartirasi sotib olindi", cls: "bottom-16 right-[-8px] bg-sky-100 text-sky-700", delay: 0.95 },
    { icon: Rocket, text: "Erkinlik yo'liga xush kelibsiz!", cls: "left-[-16px] bottom-40 bg-gold-100 text-gold-600", delay: 1.1 },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* suzani pattern layer, 6% opacity, slow pan */}
      <div
        aria-hidden
        className="animate-pattern-pan pointer-events-none absolute -inset-[480px] opacity-[0.06] text-emerald-600 motion-reduce:animate-none"
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 pb-16 pt-14 md:px-10 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <motion.img
              src="/oqim-logo.png"
              alt="OQIM"
              className="mb-4 h-14 w-14 rounded-2xl shadow-card"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            />
            <motion.span
              className="chip bg-emerald-100 text-emerald-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {uz.home.eyebrow}
            </motion.span>
            {/* fix-16 (X5): yangi rejim eslatmasi */}
            <motion.span
              className="chip ml-2 bg-gold-100 text-gold-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              ✨ Yangi rejim: 🌿 Yo'l xaritasi
            </motion.span>
            <h1 className="mt-5 text-display-xl">
              <SplitWords text={uz.home.heroTitleA} delay={0.1} />
              <br />
              <SplitWords text={uz.home.heroTitleB} delay={0.25} />
              <br />
              <span className="relative inline-block">
                <SplitWords text={uz.home.heroTitleC} delay={0.4} />
                <span className="absolute inset-x-0 -bottom-1">
                  <GoldUnderline />
                </span>
              </span>
            </h1>
            <motion.p
              className="mt-6 max-w-[520px] text-ink-600"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease: EASE }}
            >
              {uz.home.heroSub}
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
            >
              <button onClick={onOpenMode} className="btn-primary !px-7 !py-3.5 !text-base">
                <Play className="h-5 w-5" />
                {uz.common.start}
              </button>
              <Link to="/rules" className="btn-secondary !px-7 !py-3.5 !text-base">
                <BookOpen className="h-5 w-5" />
                {uz.common.learnRules}
              </Link>
            </motion.div>
            <motion.p
              className="mt-5 text-body-sm text-ink-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
            >
              ✦ {uz.home.trust}
            </motion.p>
          </div>

          {/* Artwork */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="relative mx-auto w-full max-w-[560px]"
            style={{ perspective: 1200 }}
          >
            <motion.div
              ref={frameRef}
              onMouseMove={(e) => {
                const r = frameRef.current?.getBoundingClientRect();
                if (!r) return;
                mx.set((e.clientX - r.left) / r.width - 0.5);
                my.set((e.clientY - r.top) / r.height - 0.5);
              }}
              onMouseLeave={() => {
                mx.set(0);
                my.set(0);
              }}
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="relative rounded-3xl border border-sand-200 bg-white p-3 shadow-lift"
            >
              <img
                src="/hero-board.png"
                alt="OQIM o'yin doskasi — Toshkent usti zarlar va tangalar bilan"
                className="w-full rounded-2xl"
                draggable={false}
              />
              {/* floating chips */}
              {chips.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16, delay: c.delay }}
                  className={`absolute ${c.cls}`}
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 1.3 }}
                    className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-card"
                  >
                    <c.icon className="h-4 w-4" />
                    <span className="whitespace-nowrap">{c.text}</span>
                  </motion.div>
                </motion.div>
              ))}
              {/* decorative mini dice pinned at bottom edge */}
              <button
                onClick={rollDice}
                className="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 p-2 shadow-lift backdrop-blur transition-transform hover:scale-105"
                aria-label="Zarlarni tashlash (dekorativ)"
              >
                <Dice values={dice} rolling={rolling} size={44} />
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <div className="mt-20 grid grid-cols-2 gap-4 md:grid-cols-4">
          {uz.home.stats.map((s, i) => (
            <StatTile key={s.label} value={s.value} suffix={s.suffix} label={s.label} delay={0.9 + i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}
