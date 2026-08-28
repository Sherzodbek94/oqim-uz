import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { EASE, SectionHead } from "./ui";

const CHIPS = ["Aktiv sotuvi: 50% narx", "Shoshilinch qarz: 1 marta", "Spektator rejimi: mavjud"];

/** §9 Bankrotlik — clay-tinted callout, shakes in once (wallet-shake motif). */
export default function Bankruptcy() {
  return (
    <div>
      <SectionHead eyebrow="09 · XAVF" title="Bankrotlik" />
      <motion.div
        className="mt-8 rounded-3xl border border-clay-500/30 bg-clay-100 p-6 shadow-card md:p-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0, x: [0, -2, 2, -2, 2, 0] }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h3 className="text-h3">Bankrotlik — tugatish emas, saboq.</h3>
        </div>
        <p className="mt-4 max-w-[68ch] text-ink-600">
          Naqd pulingiz noldan pastga tushsa, avval aktivlarni yarim narxda sotishingiz yoki bir
          martalik shoshilinch qarz (40%/yil) olishingiz mumkin. Hammasi tugasa — o'yin siz uchun
          tugaydi, lekin saboq qoladi: zaxira va qarz intizomi.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <span key={c} className="chip bg-white text-clay-600 shadow-card">
              {c}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
