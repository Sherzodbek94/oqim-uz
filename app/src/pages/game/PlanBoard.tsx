/**
 * OQIM — fix-18 (E): "Reja rejimi" doskasi — HEFTALIK TUMAN.
 * 20 kunlik oy 4 haftaga bo'linadi (5 faol kundan). Bir vaqtda FAQAT joriy
 * hafta ochiq: o'yinchi 5 kunni rejalashtiradi, "▶️ Haftani bajarish" bosadi,
 * 5 kun ijro bo'ladi, keyin keyingi hafta ochiladi. Kelasi haftalar tuman
 * (blur/gradient) ostida "❓ Noma'lum hafta" siluetlari bilan yopiq.
 * Mobil-first: ≥44px touch target, ixcham setka.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { g } from "@/lib/game/strings";
import {
  DAYS_PER_WEEK,
  PLAN_DAYS,
  PLAN_TILES,
  WEEKS_PER_MONTH,
  autofillPlanWeek,
  makeEmptyPlan,
  planTileCounts,
  planWorkDays,
  validatePlanWeek,
  weekOfDay,
  weekStartDay,
  type PlanDay,
  type PlanTile,
} from "@/lib/game/plan";
import type { GameState } from "@/lib/game/types";

const TILE_STYLE: Record<PlanTile, string> = {
  work: "bg-emerald-100 text-emerald-700 border-emerald-600/40",
  knowledge: "bg-sky-100 text-sky-700 border-sky-600/40",
  client: "bg-[#7A5CA8]/15 text-[#7A5CA8] border-[#7A5CA8]/40",
  market: "bg-gold-100 text-gold-600 border-gold-500/50",
  event: "bg-clay-100 text-clay-600 border-clay-500/40",
  rest: "bg-sand-100 text-ink-600 border-sand-200",
};

export default function PlanBoard({
  state,
  canPlan,
  canAvans,
  avansHint,
  onAvans,
  onExecute,
}: {
  state: GameState;
  /** inson navbati, fazada rejalashtirish mumkin */
  canPlan: boolean;
  /** avans tugmasi faolmi (10-kundan keyin, hali olinmagan) */
  canAvans: boolean;
  /** avans tugmasi ostidagi izoh */
  avansHint: string | null;
  onAvans: () => void;
  onExecute: (days: PlanDay[]) => void;
}) {
  const plan = state.plan;
  const current = state.players[state.current];
  const committed = plan?.days[current.id];
  const executing = plan?.executing ?? -1;
  const isExecuting = executing >= 0;
  // joriy hafta: ijro paytida — ijro kuni bo'yicha, rejalashtirishda — o'yinchi holati
  const weekIdx = isExecuting ? weekOfDay(executing) : Math.min(WEEKS_PER_MONTH - 1, current.planWeekIdx ?? 0);
  const wStart = weekStartDay(weekIdx);

  const [draft, setDraft] = useState<PlanDay[]>(makeEmptyPlan);
  const [selected, setSelected] = useState<PlanTile>("work");

  // yangi navbat/oy/hafta boshlanishida qoralamani tiklaymiz:
  // o'tgan haftalarning plitkalari saqlanadi, joriy hafta bo'sh boshlanadi
  useEffect(() => {
    if (isExecuting) return;
    const base = makeEmptyPlan();
    if (committed) {
      for (let i = 0; i < PLAN_DAYS; i++) {
        if (i < wStart && committed[i]?.tile) base[i] = { tile: committed[i].tile, done: true };
      }
    }
    setDraft(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id, state.month, weekIdx, isExecuting]);

  if (!plan) return null;

  const days: PlanDay[] = isExecuting ? (committed ?? makeEmptyPlan()) : draft;
  const weekDays = days.slice(wStart, wStart + DAYS_PER_WEEK);
  const counts = planTileCounts(weekDays);
  const weekWorkDays = planWorkDays(weekDays);
  const monthWorkDays = planWorkDays(days);
  const weekFilled = weekDays.filter((d) => d.tile !== null).length;
  const editable = canPlan && !isExecuting;
  const lastWeek = weekIdx === WEEKS_PER_MONTH - 1;

  const tapDay = (i: number) => {
    if (!editable) return;
    setDraft((d) => {
      const next = d.map((x) => ({ ...x }));
      // band kunga yana bosish — olib tashlash; bo'sh kunga tanlangan plitka qo'yiladi
      next[i] = { tile: next[i].tile === selected ? null : selected, done: false };
      return next;
    });
  };

  const dayCard = (day: PlanDay, i: number) => {
    const isNow = isExecuting && i === executing;
    const style = day.tile ? TILE_STYLE[day.tile] : "border-dashed border-emerald-700/70 text-emerald-300/60";
    return (
      <motion.button
        key={i}
        type="button"
        disabled={!editable}
        onClick={() => tapDay(i)}
        whileTap={editable ? { scale: 0.94 } : undefined}
        animate={
          isNow
            ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0 0 rgba(217,164,65,0.55)", "0 0 0 8px rgba(217,164,65,0)", "0 0 0 0 rgba(217,164,65,0)"] }
            : { scale: 1 }
        }
        transition={isNow ? { duration: 0.9, repeat: Infinity } : { duration: 0.15 }}
        className={cn(
          "flex min-h-[56px] flex-col items-center justify-center rounded-xl border p-1 transition-colors",
          style,
          day.done && "opacity-60",
          isNow && "ring-2 ring-gold-500",
          editable ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"
        )}
      >
        <span className="text-[10px] font-semibold leading-none opacity-80">{g.plan.dayLabel(i + 1)}</span>
        <span className="mt-1 text-lg leading-none">
          {day.tile ? PLAN_TILES.find((t) => t.id === day.tile)!.icon : "·"}
        </span>
        {day.done && <span className="mt-0.5 text-[9px] font-bold text-emerald-600">✓</span>}
      </motion.button>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-900/60 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 p-4 shadow-card">
      {/* sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/60 pb-3">
        <div>
          <p className="text-[clamp(13px,3vw,15px)] font-bold text-emerald-50">
            {g.plan.monthTitle(state.month)} · {g.plan.weekTitle(weekIdx + 1, WEEKS_PER_MONTH)}
          </p>
          <p className="text-[11px] text-emerald-200/80">
            {isExecuting
              ? g.plan.executingDay(Math.min(executing + 1, PLAN_DAYS), PLAN_DAYS)
              : g.plan.weekPrompt}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-800/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
            {g.plan.filled(weekFilled, DAYS_PER_WEEK)}
          </span>
          <span className="rounded-full bg-gold-500/90 px-2.5 py-1 text-[10px] font-bold text-ink-900">
            {g.plan.weekSalaryNote(weekWorkDays)}
          </span>
        </div>
      </div>

      {/* o'tgan haftalar — ixcham bajarilgan qatorlar */}
      {Array.from({ length: weekIdx }, (_, w) => {
        const start = weekStartDay(w);
        const row = days.slice(start, start + DAYS_PER_WEEK);
        return (
          <div key={`past-${w}`} className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">
              {g.plan.weekDone(w + 1)}
            </p>
            <div className="mt-1 grid grid-cols-5 gap-2 opacity-70">
              {row.map((day, k) => (
                <div
                  key={k}
                  className={cn(
                    "flex min-h-[36px] items-center justify-center rounded-lg border text-sm",
                    day.tile ? TILE_STYLE[day.tile] : "border-dashed border-emerald-700/70"
                  )}
                >
                  {day.tile ? PLAN_TILES.find((t) => t.id === day.tile)!.icon : "·"}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* joriy hafta — 5 ta ochiq kun kartochkasi */}
      <motion.div
        key={`week-${weekIdx}`}
        initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 grid grid-cols-5 gap-2"
      >
        {weekDays.map((day, k) => dayCard(day, wStart + k))}
      </motion.div>

      {/* kelasi haftalar — tuman ostidagi siluetlar */}
      {Array.from({ length: WEEKS_PER_MONTH - 1 - weekIdx }, (_, k) => {
        const w = weekIdx + 1 + k;
        return (
          <div
            key={`fog-${w}`}
            className="pointer-events-none relative mt-3 select-none overflow-hidden rounded-2xl border border-emerald-800/50"
            aria-hidden
          >
            <div className="grid grid-cols-5 gap-2 p-2 blur-[3px] opacity-50">
              {Array.from({ length: DAYS_PER_WEEK }, (_, d) => (
                <div
                  key={d}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-800/50 text-lg text-emerald-300/70"
                >
                  ❓
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950/40 via-emerald-900/60 to-emerald-950/80">
              <span className="text-[11px] font-bold text-emerald-100">
                {g.plan.weekTitle(w + 1, WEEKS_PER_MONTH)} · {g.plan.unknownWeek}
              </span>
              <span className="text-[9px] text-emerald-200/70">{g.plan.unknownWeekHint}</span>
            </div>
          </div>
        );
      })}

      {/* plitkalar paneli */}
      {!isExecuting && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-emerald-200/80">
            {editable ? g.plan.tapDay : `${current.name} ${g.plan.botPlanning}`}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PLAN_TILES.map((t) => {
              const active = selected === t.id;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  disabled={!editable}
                  onClick={() => setSelected(t.id)}
                  whileTap={editable ? { scale: 0.95 } : undefined}
                  title={t.desc}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center rounded-xl border bg-white/95 px-1 py-1.5 transition-all",
                    active ? "border-emerald-600 ring-4 ring-emerald-100" : "border-sand-200",
                    !editable && "opacity-70"
                  )}
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="mt-1 text-[10px] font-semibold text-ink-900">{t.label}</span>
                  <span className="text-[9px] font-medium text-ink-500">×{counts[t.id]}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* amallar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editable && (
          <>
            <button
              type="button"
              className="btn-ghost min-h-[44px] flex-1 !bg-white/10 !text-emerald-100 hover:!bg-white/20"
              onClick={() => setDraft((d) => autofillPlanWeek(d, weekIdx))}
            >
              {g.plan.autofill}
            </button>
            <button
              type="button"
              disabled={!validatePlanWeek(days, weekIdx)}
              className={cn(
                "btn-primary min-h-[44px] flex-[2]",
                !validatePlanWeek(days, weekIdx) && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none"
              )}
              onClick={() => onExecute(days.map((d) => ({ ...d, done: false })))}
            >
              {lastWeek ? g.plan.runMonthEnd : g.plan.runWeek}
            </button>
          </>
        )}
        {/* oy bo'yicha ish kunlari (maosh mutanosibligi) */}
        {monthWorkDays > 0 && (
          <p className="w-full text-center text-[10px] text-emerald-200/70">
            {g.plan.salaryNote(monthWorkDays)}
          </p>
        )}
        {/* avans — 10-kundan keyin */}
        <div className="flex w-full flex-col">
          <button
            type="button"
            disabled={!canAvans}
            onClick={onAvans}
            className={cn(
              "btn-secondary min-h-[44px] w-full",
              !canAvans && "cursor-not-allowed opacity-40"
            )}
          >
            {g.plan.avans}
          </button>
          {avansHint && <p className="mt-1 text-center text-[10px] text-emerald-200/70">{avansHint}</p>}
        </div>
      </div>
    </div>
  );
}
