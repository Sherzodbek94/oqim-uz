import { motion } from "framer-motion";
import { Route } from "lucide-react";
import { EASE, SectionHead } from "./ui";

const CHIPS = ["Tanlov asosida", "Tuman (fog)", "Bilim radiusi: 1 + ⌊bilim/2⌋", "Har 8-qatlam: Ish haqi"];

/** fix-16 (X5): §13 Yo'l xaritasi uslubi — klassik doskaga muqobil rejim. */
export default function PathMode() {
  return (
    <div>
      <SectionHead eyebrow="13 · YANGI REJIM" title="Yo'l xaritasi uslubi" />
      <motion.div
        className="mt-8 rounded-3xl border border-emerald-600/30 bg-emerald-50 p-6 shadow-card md:p-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Route className="h-5 w-5" />
          </span>
          <h3 className="text-h3">Zar o'rniga — o'z tanlovingiz.</h3>
        </div>
        <p className="mt-4 max-w-[68ch] text-ink-600">
          Sozlashda «🌿 Yo'l xaritasi» uslubini tanlasangiz, zar va 30 kataklik doska o'rniga
          shoxlangan yo'l xaritasi ochiladi: har qatlamda 2–3 tugun va siz faqat bog'langan
          tugunlardan birini tanlaysiz. Tugun turlari klassik kataklar bilan bir xil ishlaydi —
          bitim, hodisa, bozor, xarajat va boshqalar. Har 8-qatlam «Ish haqi» qatlami (oy chegarasi),
          har oyning 4-qatlamida esa «Avans» tuguni bor.
        </p>
        <p className="mt-3 max-w-[68ch] text-ink-600">
          Oldingiz tuman bilan qoplangan: faqat keyingi <strong>1 + ⌊bilim/2⌋</strong> qatlam
          ko'rinadi — bilim darajangiz qancha baland bo'lsa, shuncha uzoqni oldindan ko'rasiz.
          Tugun halqasi rangi xavf darajasini bildiradi: zumrad — xavfsiz, oltin — o'rtacha,
          loy — riskli (riskli tugunlarda bitimlar kattaroq, xarajatlar ham kattaroq).
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <span key={c} className="chip bg-white text-emerald-700 shadow-card">
              {c}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
