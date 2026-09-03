/**
 * OQIM — StatementPanel (game.md §4).
 * White panel with suzani header strip; tabs: Hisobot · Aktivlar · Jurnal;
 * players strip on top; live row flashes + delta floaters; OqimGauge.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Apple,
  Banknote,
  BookOpen,
  Building2,
  CalendarClock,
  ChefHat,
  Car,
  Check,
  Coffee,
  Coins,
  DollarSign,
  Factory,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  Home,
  Landmark,
  Lock,
  Package,
  Palmtree,
  Paintbrush,
  Plane,
  Rocket,
  Scissors,
  Send,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Stethoscope,
  Store,
  Sun,
  TabletSmartphone,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  WashingMachine,
  Watch,
  Wheat,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import OqimGauge from "@/components/OqimGauge";
import MoneyDisplay from "@/components/MoneyDisplay";
import { PLAYER_COLORS } from "@/components/PlayerToken";
import { cn } from "@/lib/utils";
import { formatDelta, formatUZSCompact, formatUZS } from "@/lib/format";
import { g } from "@/lib/game/strings";
import {
  anytimeOffer,
  assetCashflow,
  assetMarketValue,
  urgentSaleQuote,
  childEduMonthly,
  clientIncome,
  clientWorkCost,
  CLIENT_WORK_MAX_BOOSTS,
  creditScoreZone,
  debtLoad,
  effectiveClients,
  effectiveSalary,
  escapeChecklist,
  freedomStage,
  installmentPayoffAmount,
  loanPayments,
  managerCost,
  monthlyCashflow,
  passiveIncome,
  quadrantLevel,
  totalAssetMarketValue,
  totalExpenses,
} from "@/lib/game/engine";
import { CHILD_COST, KNOWLEDGE_MAX, type Quadrant } from "@/lib/game/types";
import type { ActiveNews, ExchangeState, GameMode, GameState, Player } from "@/lib/game/types";
import { abilityOf } from "@/lib/game/heroes";
import { LESSON_CATEGORY_ICON, LESSONS } from "@/lib/game/mentor";
import { PROFESSIONS, DREAMS } from "@/lib/game/data";
import {
  dividendMult,
  hasDiversificationBonus,
  portfolioDividends,
  portfolioSectors,
  portfolioValue,
  securityById,
} from "@/lib/game/exchange";

const ICONS: Record<string, LucideIcon> = {
  Home,
  Coffee,
  Scissors,
  ShoppingBasket,
  Send,
  Landmark,
  TrendingUp,
  DollarSign,
  Car,
  Sofa,
  Smartphone,
  Rocket,
  Store,
  Sparkles,
  Zap,
  Banknote,
  Apple,
  Building2,
  CalendarClock,
  ChefHat,
  Coins,
  Factory,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  Package,
  Paintbrush,
  Palmtree,
  Plane,
  Sprout,
  Stethoscope,
  Sun,
  TabletSmartphone,
  Truck,
  WashingMachine,
  Watch,
  Wheat,
  Wind,
};

function iconOf(name: string): LucideIcon {
  return ICONS[name] ?? Banknote;
}

/* Row with value-change flash + floating delta chip (game.md §4.1) */
function Row({
  label,
  value,
  tone = "neutral",
  bold,
  suffix,
}: {
  label: string;
  value: number;
  tone?: "neutral" | "good" | "bad" | "info";
  bold?: boolean;
  suffix?: string;
}) {
  const [delta, setDelta] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setDelta(value - prev.current);
      setFlash(true);
      prev.current = value;
      const t = setTimeout(() => {
        setDelta(null);
        setFlash(false);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [value]);
  const color =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-clay-500"
        : tone === "info"
          ? "text-sky-600"
          : "text-ink-900";
  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-between rounded-xl px-3 py-1.5",
        bold && "bg-sand-100/70"
      )}
      animate={{
        backgroundColor: flash
          ? delta && delta > 0
            ? "rgba(239,246,241,1)"
            : "rgba(246,228,215,1)"
          : "rgba(255,255,255,0)",
      }}
      transition={{ duration: 0.8 }}
    >
      <span className={cn("text-body-sm", bold ? "font-semibold text-ink-900" : "text-ink-600")}>
        {label}
      </span>
      <span className={cn("flex items-baseline gap-1", bold && "font-semibold")}>
        <MoneyDisplay value={value} size="sm" className={color} showCoin={false} />
        {suffix && <span className="text-caption text-ink-400">{suffix}</span>}
      </span>
      <AnimatePresence>
        {delta !== null && delta !== 0 && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -14 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={cn(
              "pointer-events-none absolute right-2 top-0 text-money-sm",
              delta > 0 ? "text-emerald-600" : "text-clay-500"
            )}
          >
            {formatDelta(delta)}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionHeader({ title, tone }: { title: string; tone: "good" | "bad" | "gold" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "bad"
        ? "bg-clay-100 text-clay-600"
        : "bg-gold-100 text-gold-600";
  return <div className={cn("rounded-xl px-3 py-1.5 text-caption", cls)}>{title}</div>;
}

/* ---------------- Erkinlik yo'li (bosqichli tizim) ---------------- */

const STAGE_ICONS = ["🛡", "⚖️", "🚀"] as const;

function FreedomPath({ p, news, exchange, mode }: { p: Player; news: ActiveNews | null; exchange: ExchangeState; mode?: GameMode }) {
  const stage = freedomStage(p, { news, exchange, mode });
  const chk = escapeChecklist(p, { news, exchange, mode });
  const stages = [
    { name: g.statement.stage1, hint: g.statement.stage1Hint },
    { name: g.statement.stage2, hint: g.statement.stage2Hint },
    { name: g.statement.stage3, hint: g.statement.stage3Hint },
  ];
  const items = [
    { ok: chk.streakOrZaxiraOk, label: g.statement.chkStreak(chk.streak, chk.streakNeeded) },
    { ok: chk.zaxiraOk, label: g.statement.chkZaxira },
    { ok: chk.assetsOk, label: g.statement.chkAssets(chk.assets, chk.assetsNeeded) },
    { ok: chk.debtOk, label: g.statement.chkDebt(chk.debtLoadPct) },
  ];
  return (
    <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3">
      <p className="text-caption font-semibold uppercase tracking-wide text-ink-600">
        {g.statement.freedomTitle}
      </p>
      <div className="mt-2 flex items-start">
        {stages.map((s, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = stage >= 3 || stage > n;
          const current = stage === n;
          return (
            <div key={n} className="flex flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                    done && "bg-emerald-600 text-white",
                    current && "bg-gold-500 text-ink-900 ring-2 ring-gold-500/50",
                    !done && !current && "bg-sand-200 text-ink-400"
                  )}
                  title={s.hint}
                >
                  {done ? <Check className="h-4 w-4" /> : current ? STAGE_ICONS[i] : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-semibold leading-tight",
                    done ? "text-emerald-700" : current ? "text-ink-900" : "text-ink-400"
                  )}
                >
                  {s.name}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className={cn("mt-4 h-0.5 w-6 shrink-0 rounded-full", stage > n ? "bg-emerald-500" : "bg-sand-200")} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-1 border-t border-sand-200 pt-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5 text-caption">
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                it.ok ? "bg-emerald-100 text-emerald-700" : "bg-clay-100 text-clay-500"
              )}
            >
              {it.ok ? "✓" : "✗"}
            </span>
            <span className={it.ok ? "text-ink-600" : "text-ink-500"}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Kvadrant yo'li (B1: E→S→B→I) ---------------- */

const QUADRANT_ORDER: Quadrant[] = ["E", "S", "B", "I"];

function QuadrantPath({ p, onOpenKnowledge }: { p: Player; onOpenKnowledge?: () => void }) {
  const hints: Record<Quadrant, string> = {
    E: g.statement.quadrantHintS,
    S: g.statement.quadrantHintB,
    B: g.statement.quadrantHintI,
    I: "",
  };
  const current = QUADRANT_ORDER.indexOf(p.quadrant);
  return (
    <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wide text-ink-600">
          {g.statement.quadrantTitle}
        </p>
        <span className="flex items-center gap-1.5">
          <span
            className="chip bg-sky-100 text-sky-700"
            title={g.statement.knowledgeHint}
          >
            <GraduationCap className="h-3 w-3" />
            {g.statement.knowledgeChip(p.knowledge, KNOWLEDGE_MAX)}
          </span>
          {onOpenKnowledge && (
            <button
              className="chip bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
              title={g.actions.knowledgeTitle}
              onClick={onOpenKnowledge}
            >
              <BookOpen className="h-3 w-3" />
              {g.statement.openKnowledge}
            </button>
          )}
        </span>
      </div>
      <div className="mt-2 flex items-start">
        {QUADRANT_ORDER.map((q, i) => {
          const done = i < current;
          const active = i === current;
          const name = g.quadrant.names[q] ?? q;
          return (
            <div key={q} className="flex flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    done && "bg-emerald-600 text-white",
                    active && "bg-sky-600 text-white ring-2 ring-sky-600/40",
                    !done && !active && "bg-sand-200 text-ink-400"
                  )}
                  title={name}
                >
                  {done ? <Check className="h-4 w-4" /> : q}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-semibold leading-tight",
                    done ? "text-emerald-700" : active ? "text-ink-900" : "text-ink-400"
                  )}
                >
                  {name.split(" — ")[1] ?? name}
                </span>
              </div>
              {i < QUADRANT_ORDER.length - 1 && (
                <div className={cn("mt-4 h-0.5 w-6 shrink-0 rounded-full", i < current ? "bg-emerald-500" : "bg-sand-200")} />
              )}
            </div>
          );
        })}
      </div>
      {p.quadrant !== "I" && (
        <p className="mt-2 border-t border-sand-200 pt-2 text-caption text-ink-500">
          {hints[p.quadrant]}
        </p>
      )}
    </div>
  );
}

/* ---------------- Mijozlar bloki (B2) ---------------- */

function ClientsBlock({
  p,
  month,
  readOnly,
  onHireManager,
  onOfferWork,
}: {
  p: Player;
  month: number;
  readOnly?: boolean;
  onHireManager?: () => void;
  /** fix-12: mijozga ish taklifi */
  onOfferWork?: (clientId: string) => void;
}) {
  if (quadrantLevel(p) < 1 && p.clients.length === 0) return null;
  const active = effectiveClients(p);
  const income = clientIncome(p);
  const cost = managerCost(p);
  const canHire = !p.hasManager && !readOnly && !!onHireManager;
  return (
    <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wide text-ink-600">
          {g.statement.clientsTitle}
        </p>
        {income > 0 && (
          <span className="text-money-sm text-emerald-600">
            +{formatUZSCompact(income)}
            {g.statement.perMonth}
          </span>
        )}
      </div>
      {p.clients.length === 0 ? (
        <div className="mt-2">
          <p className="text-caption text-ink-400">{g.statement.clientsEmpty}</p>
          <p className="mt-1 text-caption font-semibold text-emerald-700">{g.statement.clientsEmptyHint}</p>
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {active.map((c) => {
            const w = p.clientWork[c.id];
            const boosts = w?.boosts ?? 0;
            const wCost = clientWorkCost(c);
            const maxed = boosts >= CLIENT_WORK_MAX_BOOSTS;
            const onCooldown = !!w && month - w.lastMonth < 1;
            const noCash = p.cash < wCost;
            const disabled = readOnly || !onOfferWork || maxed || onCooldown || noCash;
            const reason = maxed
              ? g.statement.workMaxBoosts
              : onCooldown
                ? g.statement.workCooldown
                : noCash
                  ? g.toasts.notEnoughCash
                  : null;
            return (
              <div key={c.id} className="rounded-xl bg-white px-3 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-ink-600">
                    <Users className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-money-sm text-emerald-600">+{formatUZSCompact(c.monthlyFee)}</span>
                </div>
                {onOfferWork && !readOnly && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-ink-400">
                      {g.statement.workBoosts(boosts, CLIENT_WORK_MAX_BOOSTS)}
                    </span>
                    <button
                      className={cn(
                        "min-h-[36px] shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                        disabled
                          ? "cursor-not-allowed bg-sand-200 text-ink-400"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                      )}
                      disabled={disabled}
                      title={reason ?? `${g.statement.workOfferTitle} · −${formatUZSCompact(wCost)}`}
                      onClick={() => onOfferWork(c.id)}
                    >
                      {reason ?? `${g.statement.workOffer} −${formatUZSCompact(wCost)}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!p.hasManager && p.clients.length > active.length && (
            <p className="text-caption text-clay-500">
              {g.statement.clientCapNote(active.length)} ({p.clients.length - active.length} ta kutilmoqda)
            </p>
          )}
        </div>
      )}
      <div className="mt-2 border-t border-sand-200 pt-2">
        {p.hasManager ? (
          <p className="flex items-center gap-1.5 text-caption font-semibold text-emerald-700">
            <UserCog className="h-3.5 w-3.5" />
            {g.statement.managerHired}
          </p>
        ) : (
          <button
            className={cn(
              "w-full rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              canHire && p.cash >= cost
                ? "bg-sky-600 text-white hover:bg-sky-700"
                : "cursor-not-allowed bg-sand-200 text-ink-400"
            )}
            disabled={!canHire || p.cash < cost}
            title={g.statement.hireManagerHint}
            onClick={() => onHireManager?.()}
          >
            {g.statement.hireManagerCost(formatUZSCompact(cost))}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Hisobot tab ---------------- */

function ReportTab({
  p,
  news,
  exchange,
  month,
  mode,
  readOnly,
  onHireManager,
  onOpenKnowledge,
  onOfferWork,
}: {
  p: Player;
  news: ActiveNews | null;
  exchange: ExchangeState;
  month: number;
  /** fix-13c (Q1): o'yin rejimi (erkinlik streak talabi uchun) */
  mode?: GameMode;
  readOnly?: boolean;
  onHireManager?: () => void;
  /** fix-9 (F2): "Bilim olish" markazini ochish */
  onOpenKnowledge?: () => void;
  /** fix-12: mijozga ish taklifi */
  onOfferWork?: (clientId: string) => void;
}) {
  const passive = passiveIncome(p, { news, exchange });
  const expenses = totalExpenses(p);
  const cf = monthlyCashflow(p, { news, exchange });
  const ability = abilityOf(p);
  const dividends = portfolioDividends(p, exchange);
  const loadPct = Math.round(debtLoad(p, { news, exchange }) * 100);
  const clientsIncome = clientIncome(p);
  return (
    <div className="space-y-3">
      {!p.escaped && <FreedomPath p={p} news={news} exchange={exchange} mode={mode} />}
      {!p.escaped && <QuadrantPath p={p} onOpenKnowledge={readOnly ? undefined : onOpenKnowledge} />}
      <div className="rounded-xl bg-emerald-50 px-3 py-2" title={ability.desc}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{ability.name}</p>
        <p className="text-[11px] leading-snug text-emerald-800">{ability.desc}</p>
      </div>
      <ClientsBlock p={p} month={month} readOnly={readOnly} onHireManager={onHireManager} onOfferWork={onOfferWork} />
      <div className="flex justify-center py-1">
        <OqimGauge
          passiveIncome={passive}
          expenses={expenses}
          caption={`${g.statement.gaugeCaption} · ${formatUZSCompact(passive)} / ${formatUZSCompact(expenses)}`}
        />
      </div>

      <div className="card-stat flex items-center justify-between !p-3">
        <span className="text-caption text-ink-400">{g.statement.cashTitle}</span>
        <MoneyDisplay value={p.cash} size="lg" className="text-ink-900" />
      </div>

      {/* Kredit reytingi: yashil 700+, sariq 600–699, qizil <600 */}
      <div className="card-stat flex items-center justify-between !p-3">
        <span className="text-caption text-ink-400">{g.credit.title}</span>
        {(() => {
          const zone = creditScoreZone(p.creditScore);
          return (
            <span
              className={cn(
                "chip",
                zone === "good" && "bg-emerald-100 text-emerald-700",
                zone === "mid" && "bg-gold-100 text-gold-600",
                zone === "bad" && "bg-clay-100 text-clay-600"
              )}
            >
              {p.creditScore} ·{" "}
              {zone === "good" ? g.credit.zoneGood : zone === "mid" ? g.credit.zoneMid : g.credit.zoneBad}
            </span>
          );
        })()}
      </div>

      <div className="space-y-0.5">
        <SectionHeader title={g.statement.income} tone="good" />
        <Row
          label={
            p.unemployedMonths > 0
              ? g.statement.unemployedRow(p.unemployedMonths)
              : p.salaryMultiplier !== 1
                ? `${g.statement.salaryByQuadrant[p.quadrant] ?? g.statement.salaryRow} (×${p.salaryMultiplier.toFixed(1)})`
                : (g.statement.salaryByQuadrant[p.quadrant] ?? g.statement.salaryRow)
          }
          value={effectiveSalary(p)}
          tone={p.unemployedMonths > 0 ? "bad" : "good"}
        />
        {effectiveSalary(p) > 0 && (
          <p className="px-3 pb-1 text-[11px] leading-snug text-ink-400">{g.statement.avansHint}</p>
        )}
        {p.assets
          .filter((a) => a.monthlyCashflow > 0)
          .map((a) => (
            <Row
              key={a.id}
              label={a.constructionLeft ? `${a.title} (${g.deal.construction})` : a.title}
              value={assetCashflow(p, a, news)}
              tone="good"
            />
          ))}
        {p.ftCashflow > 0 && (
          <Row label={g.statement.ftCashflowRow} value={p.ftCashflow} tone="good" />
        )}
        {clientsIncome > 0 && (
          <Row label={g.statement.clientsTitle} value={clientsIncome} tone="good" />
        )}
        {dividends > 0 && (
          <Row
            label={
              dividendMult(p) > 1
                ? `${g.exchange.dividendsRow} (×${p.dividendBoost!.mult})`
                : g.exchange.dividendsRow
            }
            value={dividends}
            tone="good"
          />
        )}
        <Row label={g.statement.totalIncome} value={effectiveSalary(p) + passive + p.ftCashflow} tone="good" bold />
      </div>

      <div className="space-y-0.5">
        <SectionHeader title={g.statement.expensesTitle} tone="bad" />
        <Row label={g.statement.taxes} value={p.expenseParts.taxes} tone="bad" />
        <Row label={g.statement.housing} value={p.expenseParts.housing} tone="bad" />
        <Row label={g.statement.food} value={p.expenseParts.food} tone="bad" />
        <Row label={g.statement.transport} value={p.expenseParts.transport} tone="bad" />
        {p.children > 0 && (
          // fix-15 (P4): bazaviy farzand xarajati CHILD_COST (800k) + ta'lim tanlovi alohida qatorlarda
          <Row label={`${g.statement.children} ×${p.children}`} value={p.children * CHILD_COST} tone="bad" />
        )}
        {/* fix-15 (P4): har bir farzand — yoshi, ta'lim holati, oylik ta'lim xarajati */}
        {p.children2.map((c, i) => {
          const ageYears = Math.max(0, Math.floor((month - c.bornMonth) / 12));
          const eduCost = childEduMonthly(c);
          return (
            <Row
              key={`child-${i}`}
              label={`👶 ${i + 1}-bola · ${g.childEdu.ageYears(ageYears)} · ${g.childEdu.eduLabels[c.edu]}`}
              value={eduCost}
              tone={eduCost > 0 ? "bad" : undefined}
            />
          );
        })}
        <Row label={g.statement.loanPaymentsRow} value={loanPayments(p)} tone="bad" />
        {p.installments.map((i) => (
          <Row
            key={i.id}
            label={`${g.statement.installmentRow}: ${i.title} (${g.statement.monthsLeft(i.remainingMonths)})`}
            value={i.monthlyPayment}
            tone="bad"
          />
        ))}
        <Row label={g.statement.other} value={p.expenseParts.other} tone="bad" />
        <Row label={g.statement.totalExpenses} value={expenses} tone="bad" bold />
        <div className="flex items-center justify-between rounded-xl px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-body-sm text-ink-600">
            {g.statement.debtLoad}
            {loadPct > 60 && <AlertTriangle className="h-3.5 w-3.5 text-clay-600" />}
          </span>
          <span
            className={cn(
              "text-money-sm font-semibold",
              loadPct <= 40 ? "text-emerald-600" : loadPct <= 60 ? "text-clay-500" : "text-clay-600"
            )}
          >
            {loadPct}%
            {loadPct > 60 && (
              <span className="ml-1.5 text-caption font-bold text-clay-600">{g.statement.debtLoadDanger}</span>
            )}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between rounded-2xl px-4 py-3",
          cf >= 0 ? "bg-emerald-100" : "bg-clay-100"
        )}
      >
        <span className="text-caption text-ink-600">{g.statement.cashflowTitle}</span>
        <MoneyDisplay
          value={cf}
          size="lg"
          className={cf >= 0 ? "text-emerald-700" : "text-clay-600"}
          showCoin={false}
        />
      </div>
      <p className="text-right text-caption text-ink-400">
        {formatUZS(cf)} {g.statement.perMonth}
      </p>
    </div>
  );
}

/* ---------------- Aktivlar tab ---------------- */

function AssetsTab({
  p,
  state,
  forcedSell,
  onForcedSell,
  onPayoff,
  onPayoffInstallment,
  onSellAsset,
  onPartialPay,
  readOnly,
}: {
  p: Player;
  state: GameState;
  forcedSell?: boolean;
  onForcedSell?: (assetId: string) => void;
  onPayoff?: (loanId: string) => void;
  onPayoffInstallment?: (installmentId: string) => void;
  /** istalgan payt sotish (A4) */
  onSellAsset?: (assetId: string) => void;
  /** qisman to'lov (A5) */
  onPartialPay?: (loanId: string, amount: number) => void;
  readOnly?: boolean;
}) {
  // inline tasdiqlash (window.confirm emas): qaysi aktiv sotish kutilmoqda
  const [confirmSellId, setConfirmSellId] = useState<string | null>(null);
  // qisman to'lov inputi: qaysi kredit ochiq + summa matni
  const [partialLoanId, setPartialLoanId] = useState<string | null>(null);
  const [partialText, setPartialText] = useState("");
  return (
    <div className="space-y-4">
      {forcedSell && (
        <div className="rounded-xl bg-clay-100 px-3 py-2 text-body-sm text-clay-600">
          {g.statement.forcedSellHint}
        </div>
      )}
      <div>
        <SectionHeader title={g.statement.assetsTitle} tone="good" />
        {p.assets.length > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-sand-100 px-3 py-1.5">
            <span className="text-caption text-ink-400">{g.statement.marketValue}</span>
            <MoneyDisplay value={totalAssetMarketValue(state, p)} size="sm" className="text-ink-900" showCoin={false} />
          </div>
        )}
        <div className="mt-2 space-y-2">
          {p.assets.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-sand-200 p-4 text-center text-body-sm text-ink-400">
              {g.statement.emptyAssets}
            </div>
          )}
          <AnimatePresence initial={false}>
            {p.assets.map((a) => {
              const Icon = iconOf(a.icon);
              const mv = assetMarketValue(state, a);
              // trend: joriy indeks vs sotib olingandagi indeks
              const up = (state.marketIndices[a.kind] ?? 1) >= (a.buyIndex ?? 1);
              const offer = anytimeOffer(state, a);
              // fix-14 (T2): shoshilinch sotuv narxining to'liq taqsimoti (o'rgatuvchi ko'rinish)
              const urgent = forcedSell ? urgentSaleQuote(state, a) : null;
              const confirming = confirmSellId === a.id;
              return (
                <motion.div
                  key={a.id}
                  layout="position"
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="rounded-xl border border-sand-200 bg-white p-3"
                >
                  {/* fix-12: 2 qatorli ixcham karta — 1-qator: ikona + nom + trend */}
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink-900">{a.title}</p>
                    <span
                      className={cn("shrink-0 text-body-sm font-bold", up ? "text-emerald-600" : "text-clay-500")}
                      title={`${g.statement.marketValue}: ${formatUZSCompact(mv)} (${g.statement.buyPrice}: ${formatUZSCompact(a.price)})`}
                    >
                      {up ? "▲" : "▼"}
                    </span>
                  </div>
                  {/* 2-qator: mono raqamlar (oqim | bozor qiymati) + Sotish tugmasi */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                      {a.monthlyCashflow > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          +{formatUZSCompact(a.constructionLeft ? 0 : a.monthlyCashflow)}
                          {g.statement.perMonth}
                        </span>
                      )}
                      <span className={cn("text-[11px]", up ? "text-emerald-600" : "text-clay-500")}>
                        {g.statement.marketValue}: {formatUZSCompact(mv)}
                      </span>
                      <span className="text-[11px] text-ink-400">
                        {g.statement.buyPrice}: {formatUZSCompact(a.price)}
                      </span>
                    </div>
                    {forcedSell && !readOnly && urgent && (
                      <button
                        className="btn-danger !min-h-[36px] shrink-0 !px-3 !py-1.5 !text-xs"
                        title={g.statement.urgentBreakdown(
                          formatUZSCompact(urgent.marketValue),
                          urgent.resalePct,
                          urgent.urgencyDiscountPct,
                          formatUZSCompact(urgent.price)
                        )}
                        onClick={() => onForcedSell?.(a.id)}
                      >
                        {g.statement.sellForced} +{formatUZSCompact(urgent.price)}
                      </button>
                    )}
                    {!forcedSell && !readOnly && onSellAsset && !confirming && (
                      <button
                        className="min-h-[36px] shrink-0 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-semibold text-clay-600 transition-colors hover:bg-clay-500 hover:text-white"
                        title={`${g.statement.marketValue}: ${formatUZSCompact(mv)} → +${formatUZSCompact(offer)}`}
                        onClick={() => setConfirmSellId(a.id)}
                      >
                        {g.statement.sellAnytime}
                      </button>
                    )}
                  </div>
                  {forcedSell && !readOnly && urgent && (
                    <p className="mt-1.5 rounded-lg bg-clay-100/60 px-2 py-1 text-[11px] leading-snug text-clay-600">
                      {g.statement.urgentBreakdown(
                        formatUZSCompact(urgent.marketValue),
                        urgent.resalePct,
                        urgent.urgencyDiscountPct,
                        formatUZSCompact(urgent.price)
                      )}
                    </p>
                  )}
                  {confirming && !forcedSell && !readOnly && onSellAsset && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-clay-100/60 px-3 py-2">
                      <span className="flex-1 text-caption text-clay-600">
                        {g.statement.sellConfirm} +{formatUZSCompact(offer)}
                      </span>
                      <button
                        className="rounded-full bg-clay-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-clay-600"
                        onClick={() => {
                          setConfirmSellId(null);
                          onSellAsset(a.id);
                        }}
                      >
                        {g.statement.sellConfirmYes}
                      </button>
                      <button
                        className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-ink-600 transition-colors hover:bg-sand-200"
                        onClick={() => setConfirmSellId(null)}
                      >
                        {g.statement.sellCancel}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <SectionHeader title={g.statement.liabilitiesTitle} tone="bad" />
        <div className="mt-2 space-y-2">
          {p.loans.length === 0 && p.installments.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-sand-200 p-4 text-center text-body-sm text-ink-400">
              {g.statement.emptyLoans}
            </div>
          )}
          <AnimatePresence initial={false}>
            {p.installments.map((i) => {
              const payoffAmt = installmentPayoffAmount(p, i.id) ?? 0;
              return (
                <motion.div
                  key={i.id}
                  layout="position"
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex flex-wrap items-center gap-2.5 rounded-xl border border-gold-500/40 bg-gold-100/40 p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-ink-900">
                      {g.statement.installmentRow}: {i.title}
                    </p>
                    <p className="text-caption text-ink-400">{g.statement.monthsLeft(i.remainingMonths)}</p>
                  </div>
                  <span className="text-money-sm text-clay-500">
                    −{formatUZSCompact(i.monthlyPayment)}
                    {g.statement.perMonth}
                  </span>
                  {!readOnly && !forcedSell && onPayoffInstallment && (
                    <button
                      className={cn(
                        "min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        p.cash >= payoffAmt
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "cursor-not-allowed bg-sand-200 text-ink-400"
                      )}
                      disabled={p.cash < payoffAmt}
                      title={`${g.loans.earlyPayoff}: ${formatUZSCompact(payoffAmt)}`}
                      onClick={() => onPayoffInstallment(i.id)}
                    >
                      {g.statement.payOff}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {p.loans.map((l) => {
              const isQarz = l.kind === "qarz";
              const progress =
                l.principal > 0
                  ? Math.min(100, Math.round(((l.principal - l.remainingBalance) / l.principal) * 100))
                  : 0;
              const canFull = p.cash >= l.remainingBalance && l.remainingBalance > 0;
              const partialOpen = partialLoanId === l.id;
              const parsed = Math.floor(Number(partialText) || 0);
              const canPartial = parsed > 0 && p.cash >= parsed && l.remainingBalance > 0;
              return (
                <motion.div
                  key={l.id}
                  layout="position"
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="rounded-xl border border-sand-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-500">
                      <Landmark className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-ink-900">{l.name}</p>
                      <p className="text-caption text-ink-400">
                        {isQarz
                          ? `${g.statement.qarzFree} · ${g.statement.qarzDue(l.dueMonth ?? 0)}`
                          : `${g.statement.principal}: ${formatUZSCompact(l.remainingBalance)} · ${g.statement.monthsLeft(l.remainingMonths)}`}
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand-200" title={`${g.statement.paidOff}: ${progress}%`}>
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <span className="text-money-sm text-clay-500">
                      {isQarz ? (
                        <>{formatUZSCompact(l.remainingBalance)}</>
                      ) : (
                        <>
                          −{formatUZSCompact(l.monthlyPayment)}
                          {g.statement.perMonth}
                        </>
                      )}
                    </span>
                  </div>
                  {/* fix-14 (T1): qarz — faqat to'liq qaytarish tugmasi */}
                  {isQarz && !readOnly && !forcedSell && onPayoff && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        className={cn(
                          "min-h-[36px] rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                          canFull
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "cursor-not-allowed bg-sand-200 text-ink-400"
                        )}
                        disabled={!canFull}
                        title={`${g.statement.qarzRepay}: ${formatUZSCompact(l.remainingBalance)}`}
                        onClick={() => onPayoff(l.id)}
                      >
                        {g.statement.qarzRepay}
                      </button>
                    </div>
                  )}
                  {/* Kredit boshqaruvi: Grafik / Qisman / To'liq yopish (A5) — alohida oqim qatori, tor ekranda o'raladi */}
                  {!isQarz && !readOnly && !forcedSell && (onPayoff || onPartialPay) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        className="min-h-[36px] cursor-not-allowed rounded-full bg-sand-100 px-3 py-1.5 text-[11px] font-semibold text-ink-400"
                        disabled
                        title={g.statement.loanSchedule}
                      >
                        {g.statement.loanSchedule}
                      </button>
                      {onPartialPay && (
                        <button
                          className={cn(
                            "min-h-[36px] rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                            l.remainingBalance > 0
                              ? "bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white"
                              : "cursor-not-allowed bg-sand-200 text-ink-400"
                          )}
                          disabled={l.remainingBalance <= 0}
                          onClick={() => {
                            setPartialLoanId(partialOpen ? null : l.id);
                            setPartialText("");
                          }}
                        >
                          {g.statement.loanPartial}
                        </button>
                      )}
                      {onPayoff && (
                        <button
                          className={cn(
                            "min-h-[36px] rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                            canFull
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "cursor-not-allowed bg-sand-200 text-ink-400"
                          )}
                          disabled={!canFull}
                          title={`${g.loans.earlyPayoff}: ${formatUZSCompact(l.remainingBalance)}`}
                          onClick={() => onPayoff(l.id)}
                        >
                          {g.statement.payOff}
                        </button>
                      )}
                    </div>
                  )}
                  {partialOpen && onPartialPay && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={Math.min(p.cash, l.remainingBalance)}
                        value={partialText}
                        onChange={(e) => setPartialText(e.target.value)}
                        placeholder={g.statement.partialAmount}
                        className="min-h-[36px] w-28 rounded-lg border border-sand-200 bg-sand-50 px-2 py-1.5 text-money-sm text-ink-900 outline-none focus:border-sky-600"
                      />
                      <button
                        className={cn(
                          "min-h-[36px] rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                          canPartial
                            ? "bg-sky-600 text-white hover:bg-sky-700"
                            : "cursor-not-allowed bg-sand-200 text-ink-400"
                        )}
                        disabled={!canPartial}
                        title={!canPartial ? g.toasts.notEnoughCash : undefined}
                        onClick={() => {
                          onPartialPay(l.id, parsed);
                          setPartialLoanId(null);
                          setPartialText("");
                        }}
                      >
                        {g.statement.partialApply}
                      </button>
                      <span className="text-caption text-ink-400">
                        {formatUZSCompact(Math.min(parsed || 0, l.remainingBalance))}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Portfel tab (fond birjasi) ---------------- */

function PortfolioTab({ p, exchange }: { p: Player; exchange: ExchangeState }) {
  const rows = p.portfolio
    .filter((h) => h.qty > 0)
    .map((h) => {
      const sec = securityById(h.securityId);
      const price = exchange.prices[h.securityId] ?? sec?.basePrice ?? 0;
      const value = h.qty * price;
      const invested = h.qty * h.avgBuyPrice;
      const pl = value - invested;
      const plPct = invested > 0 ? (pl / invested) * 100 : 0;
      return { h, sec, price, value, pl, plPct };
    });
  const total = portfolioValue(p, exchange);
  const dividends = portfolioDividends(p, exchange);
  const sectors = portfolioSectors(p);
  return (
    <div className="space-y-4">
      <div>
        <SectionHeader title={g.exchange.portfolio} tone="gold" />
        <div className="mt-2 space-y-2">
          {rows.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-sand-200 p-4 text-center text-body-sm text-ink-400">
              {g.exchange.emptyPortfolio}
            </div>
          )}
          <AnimatePresence initial={false}>
            {rows.map(({ h, sec, price, value, pl, plPct }) => (
              <motion.div
                key={h.securityId}
                layout="position"
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="rounded-xl border border-sand-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-ink-900">
                      <span className="text-money-sm font-bold">{sec?.ticker}</span> · {sec?.name}
                    </p>
                    <p className="text-caption text-ink-400">
                      {h.qty} × {formatUZSCompact(h.avgBuyPrice)} → {formatUZSCompact(price)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <MoneyDisplay value={value} size="sm" className="text-ink-900" showCoin={false} />
                    <p className={cn("text-money-sm", pl >= 0 ? "text-emerald-600" : "text-clay-500")}>
                      {pl >= 0 ? "+" : "−"}
                      {formatUZSCompact(Math.abs(pl))} ({plPct >= 0 ? "+" : "−"}
                      {Math.abs(plPct).toFixed(1).replace(".", ",")}%)
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="card-stat flex items-center justify-between !p-3">
            <span className="text-caption text-ink-400">{g.exchange.portfolioValue}</span>
            <MoneyDisplay value={total} size="md" className="text-ink-900" showCoin={false} />
          </div>
          {dividends > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
              <span className="text-caption text-emerald-700">{g.exchange.dividendsRow}</span>
              <MoneyDisplay value={dividends} size="sm" className="text-emerald-700" showCoin={false} />
            </div>
          )}
          {hasDiversificationBonus(p) ? (
            <div className="rounded-xl border border-gold-500/40 bg-gold-100/60 px-3 py-2">
              <p className="text-caption font-semibold text-gold-600">{g.exchange.diversification}</p>
              <p className="text-[11px] text-ink-600">
                {sectors.length} sektor: {sectors.map((s) => g.exchange.sectors[s]).join(", ")}
              </p>
            </div>
          ) : (
            <p className="text-caption text-ink-400">{g.exchange.diversificationHint}</p>
          )}
          {p.dividendBoost && p.dividendBoost.monthsRemaining > 0 && (
            <div className="rounded-xl bg-emerald-100 px-3 py-2 text-caption font-semibold text-emerald-700">
              {g.exchange.boostActive(p.dividendBoost.mult, p.dividendBoost.monthsRemaining)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Jurnal tab ---------------- */

const LOG_ICONS: Record<string, LucideIcon> = {
  dice: Banknote,
  coins: Banknote,
  buy: TrendingUp,
  sell: Store,
  event: Zap,
  baby: Sparkles,
  work: Landmark,
  rocket: Rocket,
};

function LogTab({ state }: { state: GameState }) {
  return (
    <div className="space-y-2">
      {state.log.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-sand-200 p-4 text-center text-body-sm text-ink-400">
          {g.statement.emptyLog}
        </div>
      )}
      <AnimatePresence initial={false}>
        {state.log.map((e) => {
          const Icon = LOG_ICONS[e.icon] ?? Sparkles;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-start gap-2.5 rounded-xl bg-sand-50 px-3 py-2"
            >
              <span
                className={cn(
                  "chip shrink-0 !px-2 !py-0.5",
                  e.tone === "good" && "bg-emerald-100 text-emerald-700",
                  e.tone === "bad" && "bg-clay-100 text-clay-600",
                  e.tone === "gold" && "bg-gold-100 text-gold-600",
                  e.tone === "neutral" && "bg-sand-100 text-ink-600"
                )}
              >
                {e.round}
              </span>
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
              <p className="text-body-sm text-ink-600">{e.text}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Players strip ---------------- */

function PlayerChip({
  p,
  active,
  onClick,
}: {
  p: Player;
  active: boolean;
  onClick?: () => void;
}) {
  const prof = PROFESSIONS.find((x) => x.id === p.professionId);
  const avatar = p.avatar ?? prof?.avatar ?? "/avatar-teacher.png";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-3 transition-all",
        active ? "border-gold-500 ring-2 ring-gold-500/60" : "border-sand-200 hover:border-emerald-600/40",
        p.bankrupt && "opacity-60 grayscale"
      )}
    >
      <img
        src={avatar}
        alt=""
        className="h-8 w-8 rounded-full object-cover"
        style={{ boxShadow: `0 0 0 2px ${PLAYER_COLORS[p.colorIndex]}` }}
      />
      <span className="text-left">
        <span className={cn("block text-xs font-semibold leading-tight", p.bankrupt ? "text-ink-400 line-through" : "text-ink-900")}>
          {p.name}
        </span>
        <span className="block text-money-sm leading-tight text-ink-600">
          {formatUZSCompact(p.cash)}
        </span>
      </span>
      {active && (
        <span className="chip absolute -top-2.5 left-1/2 -translate-x-1/2 animate-btn-pulse bg-gold-500 !px-2 !py-0 !text-[9px] text-ink-900">
          {g.statement.navbat}
        </span>
      )}
      {p.escaped && !p.bankrupt && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-ink-900 shadow-token">
          <Rocket className="h-3 w-3" />
        </span>
      )}
      {p.bankrupt && (
        <span className="chip absolute -bottom-2 left-1/2 -translate-x-1/2 bg-clay-500 !px-2 !py-0 !text-[9px] text-white">
          {g.statement.bankruptBadge}
        </span>
      )}
    </button>
  );
}

/* ---------------- Darslar tab (fix-13b, M1) ---------------- */

function LessonsTab({ p }: { p: Player }) {
  const seen = new Set(p.lessonsSeen ?? []);
  return (
    <div className="space-y-2">
      <p className="text-caption normal-case tracking-normal text-ink-400">
        🎓 {g.mentor.learnedCount(seen.size, LESSONS.length)}
      </p>
      {seen.size === 0 && (
        <div className="rounded-xl border-2 border-dashed border-sand-200 p-4 text-center text-body-sm text-ink-400">
          {g.mentor.emptyLessons}
        </div>
      )}
      {LESSONS.map((l) => {
        const got = seen.has(l.id);
        return (
          <div
            key={l.id}
            className={cn(
              "flex items-start gap-2.5 rounded-xl px-3 py-2",
              got ? "bg-emerald-50" : "bg-sand-50 opacity-50"
            )}
          >
            <span className="shrink-0 text-base">{LESSON_CATEGORY_ICON[l.category]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-medium text-ink-900">
                {l.title}
                {got && <span className="ml-1.5 text-emerald-600">✓</span>}
              </p>
              {got && (
                <p className="mt-0.5 text-caption normal-case tracking-normal text-ink-600">
                  {l.body}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Panel ---------------- */

const TABS = [
  { id: "report", label: g.statement.tabReport },
  { id: "assets", label: g.statement.tabAssets },
  { id: "portfolio", label: g.exchange.portfolio },
  { id: "lessons", label: g.statement.tabLessons },
  { id: "log", label: g.statement.tabLog },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function StatementPanel({
  state,
  humanId,
  forcedSell,
  onForcedSell,
  onPayoff,
  onPayoffInstallment,
  onSellAsset,
  onPartialPay,
  onHireManager,
  onOpenKnowledge,
  onOfferWork,
}: {
  state: GameState;
  humanId: number;
  forcedSell: boolean;
  onForcedSell: (assetId: string) => void;
  onPayoff: (loanId: string) => void;
  onPayoffInstallment?: (installmentId: string) => void;
  onSellAsset?: (assetId: string) => void;
  onPartialPay?: (loanId: string, amount: number) => void;
  /** menejer yollash (B2) — faqat inson o'yinchiga */
  onHireManager?: () => void;
  /** fix-9 (F2): "Bilim olish" markazini ochish — faqat inson o'yinchiga */
  onOpenKnowledge?: () => void;
  /** fix-12: mijozga ish taklifi — faqat inson o'yinchiga */
  onOfferWork?: (clientId: string) => void;
}) {
  const [tab, setTab] = useState<TabId>("report");
  const [peekBot, setPeekBot] = useState<number | null>(null);
  // Forced sale is a view constraint, not an effect-driven state transition.
  // Deriving the active tab avoids a cascading render when the flag changes.
  const activeTab: TabId = forcedSell ? "assets" : tab;

  const human = state.players.find((p) => p.id === humanId) ?? state.players[0];
  const shown = peekBot !== null ? state.players.find((p) => p.id === peekBot) ?? human : human;
  const dream = DREAMS.find((d) => d.id === shown.dreamId);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* suzani header strip */}
      <div
        aria-hidden
        className="h-5 w-full shrink-0 text-emerald-600 opacity-10"
        style={{
          backgroundImage: "url(/border-suzani.svg)",
          backgroundRepeat: "repeat-x",
          backgroundSize: "480px 24px",
        }}
      />
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <h3 className="text-h4">{g.statement.title}</h3>
        {peekBot !== null && (
          <button className="btn-ghost !px-2 !py-1 !text-xs" onClick={() => setPeekBot(null)}>
            ← {human.name}
          </button>
        )}
      </div>

      {/* players strip */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3">
        {state.players.map((p) => (
          <PlayerChip
            key={p.id}
            p={p}
            active={state.players[state.current]?.id === p.id}
            onClick={() => setPeekBot(p.id === humanId ? null : p.id)}
          />
        ))}
      </div>

      {/* tabs */}
      <div className="mx-4 mb-3 flex rounded-full bg-sand-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
              activeTab === t.id ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
            )}
          >
            {activeTab === t.id && (
              <motion.span
                layoutId="stmt-tab"
                className="absolute inset-0 rounded-full bg-white shadow-card"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {activeTab === "report" && (
          <>
            {shown.escaped && dream && (
              <div className="mb-3 rounded-xl bg-gold-100 p-3">
                <p className="text-caption text-gold-600">{g.statement.gaugeFT}</p>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white">
                  <motion.div
                    className="h-full rounded-full bg-gradient-gold"
                    animate={{ width: `${Math.min(100, (shown.cash / dream.price) * 100)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-1 text-money-sm text-ink-600">
                  {formatUZSCompact(shown.cash)} / {formatUZSCompact(dream.price)}
                </p>
              </div>
            )}
            <ReportTab
              p={shown}
              news={state.news}
              exchange={state.exchange}
              month={state.month}
              mode={state.mode}
              readOnly={peekBot !== null}
              onHireManager={peekBot === null ? onHireManager : undefined}
              onOpenKnowledge={peekBot === null ? onOpenKnowledge : undefined}
              onOfferWork={peekBot === null ? onOfferWork : undefined}
            />
          </>
        )}
        {activeTab === "assets" && (
          <AssetsTab
            p={shown}
            state={state}
            forcedSell={forcedSell && peekBot === null}
            onForcedSell={onForcedSell}
            onPayoff={peekBot === null ? onPayoff : undefined}
            onPayoffInstallment={peekBot === null ? onPayoffInstallment : undefined}
            onSellAsset={peekBot === null ? onSellAsset : undefined}
            onPartialPay={peekBot === null ? onPartialPay : undefined}
            readOnly={peekBot !== null}
          />
        )}
        {activeTab === "portfolio" && <PortfolioTab p={shown} exchange={state.exchange} />}
        {activeTab === "lessons" && <LessonsTab p={shown} />}
        {activeTab === "log" && <LogTab state={state} />}
      </div>
    </div>
  );
}
