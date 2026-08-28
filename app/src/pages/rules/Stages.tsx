import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { STEPS } from "./data";
import { EASE, SectionHead, StarBullet, Term } from "./ui";

/** §3 O'yin bosqichlari — vertical timeline, line draws with scroll scrub. */
export default function Stages() {
  const lineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 75%", "end 55%"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <div>
      <SectionHead
        eyebrow="03 · BOSQICHLAR"
        title="O'yin bosqichlari"
        sub="Bitta navbat — oltita oddiy harakat. Bularning hammasini o'yin avtomatik kuzatadi."
      />

      <div ref={lineRef} className="relative mt-10 pl-10 md:pl-14">
        {/* track + progress line */}
        <div className="absolute bottom-2 left-[15px] top-2 w-0.5 rounded-full bg-sand-200 md:left-[23px]" />
        <motion.div
          className="absolute bottom-2 left-[15px] top-2 w-0.5 origin-top rounded-full bg-emerald-600 md:left-[23px]"
          style={{ scaleY }}
        />

        <ol className="space-y-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              {/* node */}
              <motion.span
                className="absolute -left-10 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-600 bg-white shadow-card md:-left-14 md:h-12 md:w-12"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <StarBullet className="h-4 w-4 md:h-5 md:w-5" />
              </motion.span>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
              >
                <div className="flex items-center gap-3">
                  <span className="chip bg-emerald-100 font-money text-emerald-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-h3 !text-xl">{step.title}</h3>
                </div>
                <p className="mt-2 max-w-[68ch] text-body-sm text-ink-600">
                  {i === 3 ? (
                    <>
                      Har harakat moliyaviy hisobotингizni o'zgartiradi.{" "}
                      <Term
                        label="Naqd oqim"
                        tip="Oylik daromad minus oylik xarajatlar — oy oxirida qoladigan pul."
                      />{" "}
                      musbat bo'lib qolsin!
                    </>
                  ) : (
                    step.body
                  )}
                </p>
              </motion.div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
