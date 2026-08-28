import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EASE, SectionHead, StarBullet } from "./ui";
import { DREAM_HOLD_RULE, DREAM_UPKEEP } from "./data";
import { formatUZSCompact } from "@/lib/format";

const BULLETS = [
  "Orzungizni sotib oling va uni 3 oy ushlab turing — g'alaba!",
  "Yoki +50 mln/oy qo'shimcha oqim yig'ing",
  "Har orzuning oylik saqlash xarajati (upkeep) bor — FT oy kunida yechiladi",
  "Soliq auditi katakchasidan ehtiyot bo'ling (naqdning 10%i)",
];

/** §8 Fast Track — gold-tinted band, star bullets, dreams strip parallax. */
export default function FastTrackSection() {
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <div className="rounded-3xl bg-gold-100 p-6 md:p-10">
      <SectionHead eyebrow="08 · ERKINLIK YO'LI" title="Erkinlik yo'li qoidalari" />

      <motion.p
        className="mt-5 max-w-[68ch] text-ink-900"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Erkinlik yo'li — katta o'yinchilar maydoni. Yirik bizneslar 500 mln dan boshlanadi, lekin
        oqimlari ham katta: +20–80 mln/oy.
      </motion.p>

      <ul className="mt-5 space-y-3">
        {BULLETS.map((b, i) => (
          <motion.li
            key={b}
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
              className="mt-0.5 shrink-0"
            >
              <StarBullet className="h-5 w-5" />
            </motion.span>
            <span className="font-medium text-ink-900">{b}</span>
          </motion.li>
        ))}
      </ul>

      {/* C3: orzular upkeep jadvali + 3-oy qoidasi */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <div className="overflow-x-auto rounded-3xl border border-gold-500/30 bg-white shadow-card">
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead>
              <tr className="border-b border-sand-200 text-caption text-ink-400">
                <th className="px-5 py-3 font-medium">Orzu</th>
                <th className="px-5 py-3 font-medium">Narx</th>
                <th className="px-5 py-3 font-medium">Oylik (upkeep)</th>
                <th className="px-5 py-3 font-medium">Izoh</th>
              </tr>
            </thead>
            <tbody>
              {DREAM_UPKEEP.map((d) => (
                <tr key={d.title} className="border-b border-sand-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink-900">{d.title}</td>
                  <td className="px-5 py-3 text-ink-600">{formatUZSCompact(d.price)}</td>
                  <td
                    className={
                      d.monthly > 0
                        ? "px-5 py-3 text-clay-500"
                        : d.monthly < 0
                          ? "px-5 py-3 text-emerald-600"
                          : "px-5 py-3 text-ink-400"
                    }
                  >
                    {d.monthly > 0 ? `−${formatUZSCompact(d.monthly)}` : d.monthly < 0 ? `+${formatUZSCompact(-d.monthly)}` : "0"}
                  </td>
                  <td className="px-5 py-3 text-ink-600">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[68ch] text-body-sm text-ink-900">
          ⏳ <strong>3-oy qoidasi:</strong> {DREAM_HOLD_RULE}
        </p>
      </motion.div>

      <motion.div
        ref={imgRef}
        className="mt-8 overflow-hidden rounded-3xl shadow-card"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <motion.img
          src="/dreams-strip.png"
          alt="Erkinlik yo'li orzulari: kutubxona, oilaviy hovli, dunyo bo'ylab sayohat, xayriya maktabi, butik-mehmonxona"
          className="h-48 w-full scale-110 object-cover md:h-64"
          style={{ y }}
          loading="lazy"
        />
      </motion.div>
    </div>
  );
}
