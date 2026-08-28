import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ListOrdered, X } from "lucide-react";
import { TOC } from "./data";
import { EASE } from "./ui";
import { cn } from "@/lib/utils";

/** Desktop sticky TOC with scrollspy — emerald text + sliding 3px left bar. */
export function TocDesktop({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav aria-label="Mundarija" className="sticky top-24 hidden lg:block">
      <p className="text-caption text-ink-400">Mundarija</p>
      <ul className="mt-4 space-y-1">
        {TOC.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="relative">
              {isActive && (
                <motion.span
                  layoutId="toc-bar"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-emerald-600"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "block w-full rounded-lg py-1.5 pl-4 pr-2 text-left text-body-sm transition-colors",
                  isActive ? "font-semibold text-emerald-600" : "text-ink-600 hover:text-ink-900"
                )}
              >
                <span className="mr-2 font-money text-xs text-ink-400">{item.num}</span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile sticky top pill `Mundarija` opening a bottom-sheet list. */
export function TocMobile({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = TOC.find((t) => t.id === active);

  const go = (id: string) => {
    setOpen(false);
    // wait for the sheet to start closing, then scroll
    setTimeout(() => onNavigate(id), 80);
  };

  return (
    <>
      <div className="sticky top-16 z-40 -mx-6 border-b border-sand-200 bg-sand-50/90 px-6 py-2 backdrop-blur md:-mx-10 md:px-10 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-full border border-sand-200 bg-white px-4 py-2.5 shadow-card"
        >
          <span className="flex items-center gap-2 text-body-sm font-semibold text-ink-900">
            <ListOrdered className="h-4 w-4 text-emerald-600" />
            Mundarija
          </span>
          <span className="text-caption normal-case tracking-normal text-ink-400">
            {current ? `${current.num} · ${current.label}` : ""}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70] bg-ink-900/35 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: EASE }}
              className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-modal lg:hidden"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-sand-200" />
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-h3">Mundarija</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost !p-2"
                  aria-label="Yopish"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="mt-4 space-y-1 pb-4">
                {TOC.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i + 0.08, duration: 0.3, ease: EASE }}
                  >
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-colors",
                        active === item.id
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-ink-900 hover:bg-sand-100"
                      )}
                    >
                      <span className="font-money text-xs text-ink-400">{item.num}</span>
                      {item.label}
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
