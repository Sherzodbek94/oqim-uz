import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  Footprints,
  Trophy,
  Zap,
  TrendingUp,
  Medal,
  HeartPulse,
  GraduationCap,
  Trash2,
  Play,
  Lock,
  Award,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { uz } from "@/lib/uz";
import { cn } from "@/lib/utils";
import { formatUZSCompact } from "@/lib/format";
import {
  clearProfile,
  computeAchievements,
  computeBotRivalry,
  computeStats,
  isUsta,
  loadProfile,
  type GameRecord,
} from "@/lib/profile";
import { PERSONALITY_LABELS } from "@/lib/game/data";
import { LESSON_CATEGORY_ICON, LESSONS } from "@/lib/game/mentor";
import { APP_VERSION } from "@/lib/version";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const ACH_ICONS: Record<string, LucideIcon> = {
  Footprints,
  Trophy,
  Zap,
  TrendingUp,
  Medal,
  HeartPulse,
  GraduationCap,
  Award,
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function resultOf(g: GameRecord): { emoji: string; label: string } {
  if (g.won) return { emoji: "🏆", label: uz.profile.resultWin };
  if (g.escapeMonth !== null) return { emoji: "💼", label: uz.profile.resultEscape };
  return { emoji: "💸", label: uz.profile.resultLoss };
}

/** /profil — o'yin tarixi, umumiy statistika va yutuqlar (C2). */
export default function Profile() {
  const [games, setGames] = useState<GameRecord[]>(() => loadProfile().games);
  const [lessons, setLessons] = useState<string[]>(() => loadProfile().lessons);
  const [confirming, setConfirming] = useState(false);

  const stats = useMemo(() => computeStats(games), [games]);
  const achievements = useMemo(() => computeAchievements(games), [games]);
  const rivalry = useMemo(() => computeBotRivalry(games), [games]);
  const usta = useMemo(() => isUsta(games), [games]);
  const recent = useMemo(() => [...games].reverse().slice(0, 10), [games]);

  const onClear = () => {
    clearProfile();
    setGames([]);
    setLessons([]);
    setConfirming(false);
  };

  const statCards = [
    { label: uz.profile.games, value: String(stats.games) },
    { label: uz.profile.winPct, value: `${stats.winPct}%` },
    {
      label: uz.profile.fastestEscape,
      value: stats.fastestEscape !== null ? uz.profile.fastestEscapeUnit(stats.fastestEscape) : "—",
    },
    {
      label: uz.profile.maxPassive,
      value: stats.maxPassive > 0 ? formatUZSCompact(stats.maxPassive) : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-10 md:py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <span className="chip bg-emerald-100 text-emerald-700">OQIM</span>
        <span className="ml-2 chip bg-gold-100 text-gold-600">v{APP_VERSION}</span>
        <h1 className="mt-4 text-display-lg">{uz.profile.title}</h1>
        <p className="mt-2 text-ink-600">{uz.profile.sub}</p>
      </motion.div>

      {games.length === 0 ? (
        <motion.div
          className="mt-10 rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        >
          <p className="text-ink-600">{uz.profile.empty}</p>
          <Link to="/game" className="btn-primary mt-5 inline-flex">
            <Play className="h-4 w-4" />
            {uz.profile.playNow}
          </Link>
        </motion.div>
      ) : (
        <>
          {/* 1. Umumiy statistika */}
          <motion.section
            className="mt-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            <h2 className="text-h2">{uz.profile.statsTitle}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {statCards.map((c) => (
                <div key={c.label} className="card-stat">
                  <p className="text-caption text-ink-400">{c.label}</p>
                  <p className="text-money-lg text-ink-900">{c.value}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* 2. So'nggi o'yinlar */}
          <motion.section
            className="mt-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          >
            <h2 className="text-h2">{uz.profile.recentTitle}</h2>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-sand-200 bg-white shadow-card">
              <table className="w-full min-w-[560px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-sand-200 text-caption text-ink-400">
                    <th className="px-5 py-3 font-medium">{uz.profile.thDate}</th>
                    <th className="px-5 py-3 font-medium">{uz.profile.thHero}</th>
                    <th className="px-5 py-3 font-medium">{uz.profile.thResult}</th>
                    <th className="px-5 py-3 font-medium">{uz.profile.thMonth}</th>
                    <th className="px-5 py-3 font-medium">{uz.profile.thQuadrant}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((g, i) => {
                    const r = resultOf(g);
                    return (
                      <tr key={`${g.date}-${i}`} className="border-b border-sand-100 last:border-0">
                        <td className="px-5 py-3 text-ink-600">{fmtDate(g.date)}</td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-ink-900">{g.heroName}</span>
                          <span className="block text-caption normal-case tracking-normal text-ink-400">
                            {g.profession}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="mr-1">{r.emoji}</span>
                          <span className="text-ink-600">{r.label}</span>
                        </td>
                        <td className="px-5 py-3 text-ink-600">{g.endMonth}</td>
                        <td className="px-5 py-3">
                          <span className="chip bg-sand-100 text-ink-600">
                            {g.quadrantStart}→{g.quadrantEnd}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* 2.5 Raqiblar (fix-13c, Q4): bot reytingi */}
          {rivalry.some((r) => r.wins + r.losses > 0) && (
            <motion.section
              className="mt-10"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-h2">Raqiblar</h2>
                {usta && (
                  <span className="chip bg-gold-100 text-gold-600">
                    🎖 Usta darajasi
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {rivalry.map((r, i) => {
                  const played = r.wins + r.losses;
                  const beaten = r.wins > 0;
                  return (
                    <motion.div
                      key={r.personality}
                      className={cn(
                        "rounded-3xl border p-5 text-center shadow-card",
                        played === 0
                          ? "border-sand-200 bg-white opacity-60"
                          : beaten
                            ? "border-emerald-600/30 bg-emerald-50"
                            : "border-sand-200 bg-white"
                      )}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.18 + i * 0.05, ease: EASE }}
                    >
                      <div
                        className={cn(
                          "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
                          beaten ? "bg-gradient-emerald text-white" : "bg-sand-100 text-ink-400"
                        )}
                      >
                        <Bot className="h-6 w-6" />
                      </div>
                      <p className="mt-3 font-display font-semibold text-ink-900">
                        {PERSONALITY_LABELS[r.personality] ?? r.personality}
                        {beaten && <span className="ml-1 text-emerald-600">✓</span>}
                      </p>
                      <p className="mt-1 text-caption normal-case tracking-normal text-ink-600">
                        {played === 0
                          ? "Hali uchrashmadingiz"
                          : `${r.wins} G · ${r.losses} M`}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
              {usta && (
                <p className="mt-3 text-body-sm text-gold-600">
                  🎖 Siz har uchala bot turini yengdingiz — Usta darajasi ochildi!
                </p>
              )}
            </motion.section>
          )}

          {/* 3. Yutuqlar */}
          <motion.section
            className="mt-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          >
            <h2 className="text-h2">{uz.profile.achievementsTitle}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {achievements.map((a, i) => {
                const Icon = ACH_ICONS[a.icon] ?? Trophy;
                return (
                  <motion.div
                    key={a.id}
                    className={cn(
                      "rounded-3xl border p-5 text-center shadow-card",
                      a.unlocked
                        ? "border-gold-500/40 bg-gold-100"
                        : "border-sand-200 bg-white opacity-60 grayscale"
                    )}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.05, ease: EASE }}
                  >
                    <div
                      className={cn(
                        "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
                        a.unlocked ? "bg-gradient-gold text-ink-900" : "bg-sand-100 text-ink-400"
                      )}
                    >
                      {a.unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <p className="mt-3 font-display font-semibold text-ink-900">{a.title}</p>
                    <p className="mt-1 text-caption normal-case tracking-normal text-ink-600">
                      {a.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* 4. Ma'lumotlarni tozalash */}
          <motion.section
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-clay-500/30 bg-clay-100 p-5">
                <p className="text-body-sm font-medium text-ink-900">{uz.profile.clearConfirm}</p>
                <button className="btn-secondary !px-4 !py-2" onClick={onClear}>
                  <Trash2 className="h-4 w-4" />
                  {uz.profile.clearYes}
                </button>
                <button className="btn-ghost !px-4 !py-2" onClick={() => setConfirming(false)}>
                  {uz.profile.clearCancel}
                </button>
              </div>
            ) : (
              <button className="btn-ghost text-clay-500" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" />
                {uz.profile.clearTitle}
              </button>
            )}
          </motion.section>
        </>
      )}

      {/* fix-13b (M1): umrbod darslar kolleksiyasi — o'yinlar sonidan qat'i nazar */}
      <motion.section
        className="mt-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
      >
        <h2 className="text-h2">{uz.profile.lessonsTitle}</h2>
        <p className="mt-1 text-body-sm text-ink-600">
          🎓 {uz.profile.lessonsProgress(lessons.length, LESSONS.length)}
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sand-200">
          <motion.div
            className="h-full rounded-full bg-gradient-gold"
            animate={{ width: `${Math.min(100, (lessons.length / LESSONS.length) * 100)}%` }}
            transition={{ duration: 0.8, ease: EASE }}
          />
        </div>
        {lessons.length === 0 ? (
          <p className="mt-4 text-body-sm text-ink-400">{uz.profile.lessonsEmpty}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {LESSONS.filter((l) => lessons.includes(l.id)).map((l, i) => (
              <motion.div
                key={l.id}
                className="rounded-3xl border border-emerald-600/20 bg-white p-4 shadow-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.04, ease: EASE }}
              >
                <span className="text-xl">{LESSON_CATEGORY_ICON[l.category]}</span>
                <p className="mt-2 font-display text-sm font-semibold text-ink-900">
                  {l.title} <span className="text-emerald-600">✓</span>
                </p>
                <p className="mt-1 text-caption normal-case tracking-normal text-ink-600">
                  {l.tip}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
