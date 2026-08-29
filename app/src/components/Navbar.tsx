import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Play, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { uz } from "@/lib/uz";
import { OLD_SAVE_KEY, SAVE_KEY } from "@/lib/game/types";
import ModeSelector from "./ModeSelector";

/**
 * Navbar (design.md §9.1) — home + rules pages only.
 * Sticky 64px, white/80 backdrop-blur, 1px bottom border sand-200.
 * Shows `Davom etish ●` chip when a save exists in localStorage.
 */

const links = [
  { to: "/", label: uz.nav.home },
  { to: "/game", label: uz.nav.game },
  { to: "/rules", label: uz.nav.rules },
  { to: "/profil", label: uz.nav.profile, icon: true },
];

function hasSave(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      (!!localStorage.getItem(SAVE_KEY) || !!localStorage.getItem(OLD_SAVE_KEY))
    );
  } catch {
    return false;
  }
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setSaved(hasSave()), [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-50 h-16 border-b transition-all duration-200",
        scrolled
          ? "border-sand-200 bg-white/80 backdrop-blur"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6 md:px-10">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/oqim-logo.png" alt="OQIM" className="h-8 w-8 rounded" />
          <span className="font-display text-lg font-bold text-ink-900">
            OQ<span className="text-emerald-600">IM</span>
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Asosiy">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "relative px-4 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-emerald-600" : "text-ink-600 hover:text-ink-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {l.icon && <User className="mr-1 inline-block h-4 w-4 align-[-2px]" />}
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-4 -bottom-0.5 h-[3px] rounded-full bg-emerald-600"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden items-center gap-3 md:flex">
          {saved && (
            <Link
              to="/game"
              className="chip bg-emerald-100 text-emerald-700 normal-case tracking-normal"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              {uz.nav.resume}
            </Link>
          )}
          <button onClick={() => setModeOpen(true)} className="btn-primary !px-5 !py-2.5">
            <Play className="h-4 w-4" />
            {uz.nav.play}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="btn-ghost !p-2 md:hidden"
          onClick={() => setOpen(true)}
          aria-label={uz.nav.menu}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-sand-50 md:hidden"
          >
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-[0.06] text-emerald-600"
              style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
            />
            <div className="flex h-16 items-center justify-between px-6">
              <span className="font-display text-lg font-bold text-ink-900">
                OQ<span className="text-emerald-600">IM</span>
              </span>
              <button className="btn-ghost !p-2" onClick={() => setOpen(false)} aria-label={uz.nav.close}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-2 px-6 pt-8" aria-label="Mobil">
              {links.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.06 * i + 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-2xl px-4 py-3 font-display text-2xl font-semibold",
                        isActive ? "bg-emerald-100 text-emerald-700" : "text-ink-900"
                      )
                    }
                  >
                    {l.icon && <User className="mr-2 inline-block h-5 w-5 align-[-3px]" />}
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="pt-4"
              >
                <button onClick={() => { setOpen(false); setModeOpen(true); }} className="btn-primary w-full">
                  <Play className="h-4 w-4" />
                  {uz.nav.play}
                </button>
                {saved && (
                  <Link to="/game" className="chip mt-4 bg-emerald-100 text-emerald-700 normal-case tracking-normal">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                    {uz.nav.resume}
                  </Link>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      <ModeSelector open={modeOpen} onClose={() => setModeOpen(false)} />
    </motion.header>
  );
}
