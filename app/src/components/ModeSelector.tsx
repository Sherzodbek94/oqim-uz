/**
 * Bitta o'yin kirish nuqtasi — yakka o'ynash yoki onlayn jamoaviy o'ynash tanlash.
 * Home page'dagi asosiy "O'ynash" tugmasi bilan ochiladi.
 */
import { useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Play, Users, Globe, X, Bot, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { uz } from "@/lib/uz";

interface ModeSelectorProps {
  open: boolean;
  onClose: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const modes = [
  {
    id: "single",
    title: "Yakka o'ynash",
    desc: "Botlar bilan yoki o'zingiz mashq qiling. Saqlangan o'yinni davom ettiring.",
    icon: Play,
    badge: Bot,
    badgeText: "Botlar bilan",
    to: "/game",
    primary: true,
  },
  {
    id: "online",
    title: "Jamoaviy o'ynash",
    desc: "2–4 kishi xona kodi bilan onlayn. Navbat taymeri va real-time multiplayer.",
    icon: Users,
    badge: Wifi,
    badgeText: "Onlayn",
    to: "/onlayn",
    primary: false,
  },
] as const;

export default function ModeSelector({ open, onClose }: ModeSelectorProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative w-full max-w-2xl rounded-3xl border border-sand-200 bg-white p-6 shadow-lift md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-400 transition-colors hover:bg-sand-100"
          aria-label={uz.nav.close}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Globe className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-h2 font-bold text-ink-900">O'yin rejimi</h2>
          <p className="mt-1 text-body-sm text-ink-600">
            Qaysi usulda o'ynashni xohlaysiz? Ikkalasi ham bir saytda — alohida havolalar kerak emas.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {modes.map((m) => {
            const Icon = m.icon;
            const Badge = m.badge;
            return (
              <Link
                key={m.id}
                to={m.to}
                onClick={onClose}
                className={cn(
                  "group relative flex flex-col rounded-2xl border p-5 transition-all hover:shadow-card",
                  m.primary
                    ? "border-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                    : "border-sand-200 bg-white hover:border-emerald-300 hover:bg-sand-50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      m.primary ? "bg-emerald-600 text-white" : "bg-sand-100 text-emerald-700"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      m.primary ? "bg-emerald-200 text-emerald-800" : "bg-sky-100 text-sky-700"
                    )}
                  >
                    <Badge className="h-3 w-3" /> {m.badgeText}
                  </span>
                </div>
                <h3 className={cn("mt-4 font-display text-lg font-bold", m.primary ? "text-emerald-900" : "text-ink-900")}>
                  {m.title}
                </h3>
                <p className={cn("mt-1 text-body-sm", m.primary ? "text-emerald-700" : "text-ink-600")}>
                  {m.desc}
                </p>
                <span
                  className={cn(
                    "mt-4 inline-flex items-center gap-1 text-sm font-semibold",
                    m.primary ? "text-emerald-700" : "text-emerald-600"
                  )}
                >
                  Boshlash <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-5 text-center text-caption text-ink-400">
          Keyinchalik istalgan vaqt menusdan boshqa rejimga o'tishingiz mumkin.
        </p>
      </motion.div>
    </motion.div>
  );
}
