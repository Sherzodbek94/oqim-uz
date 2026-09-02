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
          className="fixed bottom-6 right-4 z-[70] w-[min(340px,calc(100vw-2rem))]"
        >
          <div className="overflow-hidden rounded-2xl border border-gold-500/40 bg-white shadow-lift">
            <div className="bg-gold-100 px-4 py-2.5">
              <p className="font-display text-sm font-bold text-ink-900">
                {uz.app.whatsNewTitle(entry.v)}
              </p>
              <p className="text-caption normal-case tracking-normal text-ink-600">
                {uz.app.whatsNewSub}
              </p>
            </div>
            <ul className="space-y-1.5 px-4 py-3">
              {entry.points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-body-sm text-ink-600">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <div className="px-4 pb-3">
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
