/**
 * OQIM — Bildirishnomalar markazi (fix-10, F2).
 * Header'dagi 🔔 qo'ng'iroqcha (o'qilmagan badge bilan) + slide-in panel:
 * desktopda o'ng drawer, mobilda bottom sheet. Elementlar eng-yangi birinchi.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import type { NotificationItem } from "@/lib/game/types";
import { g } from "@/lib/game/strings";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<NotificationItem["tone"], { bar: string; iconBg: string }> = {
  neutral: { bar: "bg-sand-200", iconBg: "bg-sand-100" },
  good: { bar: "bg-emerald-500", iconBg: "bg-emerald-100" },
  bad: { bar: "bg-clay-500", iconBg: "bg-clay-100" },
  gold: { bar: "bg-gold-500", iconBg: "bg-gold-100" },
};

export default function NotificationsCenter({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [lastReadId, setLastReadId] = useState(0);
  const [shake, setShake] = useState(false);
  const prevLatestRef = useRef<number | null>(null);
  /* desktop: o'ngdan slide-in drawer; mobil: bottom sheet */
  const [isDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  const panelAnim = isDesktop
    ? { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  const latestId = items[0]?.id ?? 0;
  const unread = items.filter((n) => n.id > lastReadId).length;

  /* yangi bildirishnoma — qo'ng'iroqcha bir marta silkinadi */
  useEffect(() => {
    if (prevLatestRef.current === null) {
      prevLatestRef.current = latestId;
      return;
    }
    if (latestId !== prevLatestRef.current) {
      prevLatestRef.current = latestId;
      if (!open) {
        setShake(true);
        const t = setTimeout(() => setShake(false), 600);
        return () => clearTimeout(t);
      }
    }
  }, [latestId, open]);

  const openPanel = () => {
    setOpen(true);
    setLastReadId(latestId);
  };

  return (
    <>
      <motion.button
        className="btn-ghost relative !p-2"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={g.notif.title}
        title={g.notif.title}
        animate={shake ? { rotate: [0, -14, 12, -8, 6, 0] } : { rotate: 0 }}
        transition={{ duration: 0.55 }}
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-white shadow-token"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop (mobil) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[65] bg-ink-900/40"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-label={g.notif.title}
              initial={panelAnim.initial}
              animate={panelAnim.animate}
              exit={panelAnim.exit}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className={cn(
                "fixed inset-x-0 bottom-0 z-[70] flex max-h-[72dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-modal",
                /* desktop: o'ng drawer */
                "lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-14 lg:h-[calc(100dvh-56px)] lg:max-h-none lg:w-[380px] lg:rounded-none lg:border-l lg:border-sand-200"
              )}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-sand-200 px-4 py-3">
                <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                  <Bell className="h-4 w-4 text-emerald-600" />
                  {g.notif.title}
                </h2>
                <button
                  className="btn-ghost !p-2"
                  onClick={() => setOpen(false)}
                  aria-label={g.shell.close}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100">
                      <Bell className="h-5 w-5 text-ink-400" />
                    </span>
                    <p className="text-body-sm font-medium text-ink-600">{g.notif.empty}</p>
                    <p className="max-w-[240px] text-caption normal-case tracking-normal text-ink-400">
                      {g.notif.emptyHint}
                    </p>
                  </div>
                ) : (
                  <motion.ul
                    className="flex flex-col gap-2"
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.045 } } }}
                  >
                    {items.map((n) => {
                      const tone = TONE_STYLES[n.tone];
                      return (
                        <motion.li
                          key={n.id}
                          variants={{
                            hidden: { opacity: 0, y: 12 },
                            show: { opacity: 1, y: 0 },
                          }}
                          transition={{ duration: 0.25 }}
                          className="relative flex gap-3 overflow-hidden rounded-2xl border border-sand-200 bg-white p-3"
                        >
                          <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base",
                              tone.iconBg
                            )}
                          >
                            {n.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-body-sm font-semibold text-ink-900">{n.title}</p>
                              <span className="chip shrink-0 bg-sand-100 !px-2 !py-0.5 text-ink-500">
                                {g.notif.dayChip(n.round)}
                              </span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-line text-body-sm text-ink-600">
                              {n.body}
                            </p>
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
