import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import CashflowGauge from "@/components/CashflowGauge";
import { uz } from "@/lib/uz";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Step 1 visual: 3 mini profession cards fan out, center lifts */
function ProfessionsFan({ active }: { active: boolean }) {
  const cards = [
    { src: "/avatar-taxi.png", rot: -10, x: -46 },
    { src: "/avatar-teacher.png", rot: 0, x: 0 },
    { src: "/avatar-programmer.png", rot: 10, x: 46 },
  ];
  return (
    <div className="relative flex h-40 items-end justify-center">
      {cards.map((c, i) => (
        <motion.img
          key={c.src}
          src={c.src}
          alt=""
          className="h-28 w-28 rounded-2xl border border-sand-200 bg-white object-cover p-1 shadow-card"
          style={{ zIndex: i === 1 ? 2 : 1 }}
          animate={{
            rotate: active ? c.rot : 0,
            x: active ? c.x : 0,
            y: active && i === 1 ? -14 : 0,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

/** Step 2 visual: mini board ring (8 cells), token hops around as progress advances */
const RING_COLORS = ["#D9A441", "#2E7D5F", "#41788F", "#C9744C", "#7A5CA8", "#C24E4E", "#2E7D5F", "#D9A441"];
function MiniRing({ progress }: { progress: number }) {
  const R = 64;
  const idx = Math.min(7, Math.floor(progress * 8));
  const angle = (idx / 8) * Math.PI * 2 - Math.PI / 2;
  return (
    <svg viewBox="0 0 180 180" className="mx-auto h-40 w-40">
      {RING_COLORS.map((c, i) => {
        const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
        const x0 = 90 + R * Math.cos(a0), y0 = 90 + R * Math.sin(a0);
        const x1 = 90 + R * Math.cos(a1), y1 = 90 + R * Math.sin(a1);
        return (
          <path
            key={i}
            d={`M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`}
            stroke={c}
            strokeWidth="16"
            fill="none"
            strokeLinecap="butt"
            opacity={0.9}
          />
        );
      })}
      <circle cx="90" cy="90" r="34" fill="#EFF6F1" />
      <motion.g
        animate={{ x: 90 + R * Math.cos(angle) - 10, y: 90 + R * Math.sin(angle) - 10 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
      >
        <circle cx="10" cy="10" r="10" fill="#2E7D5F" stroke="#fff" strokeWidth="3" />
      </motion.g>
    </svg>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start center", "end center"] });
  const railFill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const [progress, setProgress] = useState(0);
  useEffect(() => scrollYProgress.on("change", (v) => setProgress(v)), [scrollYProgress]);

  const gaugeRef = useRef<HTMLDivElement>(null);
  const gaugeInView = useInView(gaugeRef, { once: true, margin: "-20% 0px" });
  const [gaugeVal, setGaugeVal] = useState(2_720_000); // 34% of 8 mln
  useEffect(() => {
    if (gaugeInView) setGaugeVal(8_000_000);
  }, [gaugeInView]);

  const stepIdx = Math.min(2, Math.floor(progress * 3));

  const visuals = [
    <ProfessionsFan key="v0" active={stepIdx === 0} />,
    <MiniRing key="v1" progress={Math.min(0.999, Math.max(0, (progress - 1 / 3) * 3))} />,
    <div key="v2" ref={gaugeRef} className="flex h-40 items-center justify-center">
      <CashflowGauge passiveIncome={gaugeVal} expenses={8_000_000} size={140} />
    </div>,
  ];

  return (
    <section ref={sectionRef} className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          {/* Sticky left column */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="text-caption text-emerald-600">{uz.home.how.eyebrow}</span>
            <h2 className="mt-2 text-h2">{uz.home.how.title}</h2>
            {/* progress rail */}
            <div className="relative mt-8 flex flex-col gap-10 pl-6">
              <div className="absolute bottom-2 left-[9px] top-2 w-[3px] rounded bg-sand-200">
                <motion.div className="w-full rounded bg-emerald-600" style={{ height: railFill }} />
              </div>
              {uz.home.how.steps.map((s, i) => (
                <div key={s.num} className="flex items-center gap-4">
                  <span
                    className={`relative z-10 -ml-6 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                      i <= stepIdx ? "border-emerald-600 bg-emerald-600" : "border-sand-200 bg-white"
                    }`}
                  >
                    {i <= stepIdx && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span
                    className={`font-display text-lg font-semibold transition-colors duration-300 ${
                      i === stepIdx ? "text-ink-900" : "text-ink-400"
                    }`}
                  >
                    {s.num} — {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step panels */}
          <div className="space-y-8">
            {uz.home.how.steps.map((s, i) => (
              <motion.article
                key={s.num}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="card !p-8"
              >
                <motion.span
                  className="font-display text-6xl font-bold text-emerald-100"
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  {s.num}
                </motion.span>
                <h3 className="mt-2 text-h3">{s.title}</h3>
                <p className="mt-2 text-body-sm text-ink-600">{s.body}</p>
                <div className="mt-6 rounded-2xl bg-sand-50 p-4">{visuals[i]}</div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
