import { useState } from "react";
import { Outlet } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { uz } from "@/lib/uz";
import { markVersionSeen, readLastVersion, whatsNewFor, type ChangelogEntry } from "@/lib/version";

/**
 * Shared layout for content pages (home + rules). Pattern B: nested routes.
 * Navbar is `sticky top-0 z-50` in normal flow, so no offset bookkeeping is
 * needed here (react-dev.md "Navbar positioning contract").
 * The game page (/game) is NOT wrapped — it has its own top bar.
 */
export default function Layout() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-sand-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsNewPanel />
    </div>
  );
}

/**
 * fix-13b (M2): bir martalik "Yangi versiya" paneli — localStorage dagi
 * oqim-last-version APP_VERSION dan kichik bo'lsa chiqadi, yopilgach yoziladi.
 *
 * TELEFONDA U ASOSIY TUGMANI TO'SARDI. Panel `w-[min(340px,…)]` bilan
 * o'ng pastda turardi va 459 px enli ekranda x 103–443 oralig'ini egallardi;
 * bosh sahifadagi «O'yinni boshlash» esa x 24–237, y 632–684 da. Ya'ni
 * birinchi tashrif buyurgan odam CTA ni bosolmasdi — bosish paneldagi
 * ro'yxatga tushardi va HECH NARSA bo'lmasdi. Panel ko'rinib turgani uchun
 * sabab ham tushunarsiz edi.
 *
 * Yechim geometriyani "tuzatish" emas: CTA joyi sahifadan sahifaga
 * o'zgaradi, shuning uchun panelni undan qochirib bo'lmaydi. O'rniga
 * telefonda panel PAST CHEKKAGA yopishadi va faqat sarlavha bilan yopish
 * tugmasini ko'rsatadi — o'zgarishlar ro'yxati `sm:` dan boshlab ochiladi.
 * Shu bilan u ~80 px balandlikdagi tor tasmaga aylanadi va sahifaning
 * harakat qismini band qilmaydi.
 */
function WhatsNewPanel() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(() =>
    whatsNewFor(readLastVersion())
  );

  const close = () => {
    markVersionSeen();
    setEntry(null);
  };

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:bottom-6 sm:right-4 sm:w-[min(340px,calc(100vw-2rem))]"
        >
          <div className="overflow-hidden rounded-2xl border border-gold-500/40 bg-white shadow-lift">
            {/*
              Telefonda sarlavha va yopish tugmasi BIR QATORDA — tasma qancha
              past bo'lsa, doimiy band qilingan chiziq shuncha tor bo'ladi.
              `sm:` dan boshlab eski ustunli kartochka qaytadi.
            */}
            <div className="flex items-center gap-3 bg-gold-100 px-4 py-2.5 sm:block">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-ink-900 sm:whitespace-normal">
                  {uz.app.whatsNewTitle(entry.v)}
                </p>
                <p className="truncate text-caption normal-case tracking-normal text-ink-600 sm:whitespace-normal">
                  {uz.app.whatsNewSub}
                </p>
              </div>
              <button className="btn-primary flex-none !py-1.5 !text-sm sm:hidden" onClick={close}>
                {uz.app.whatsNewClose}
              </button>
            </div>
            {/* Ro'yxat va keng yopish tugmasi — faqat kengroq ekranda. */}
            <ul className="hidden space-y-1.5 px-4 py-3 sm:block">
              {entry.points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-body-sm text-ink-600">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <div className="hidden px-4 pb-3 sm:block">
              <button className="btn-primary w-full !py-1.5 !text-sm" onClick={close}>
                {uz.app.whatsNewClose}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
