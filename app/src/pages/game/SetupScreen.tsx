/**
 * OQIM (avvalgi Cashflow UZ) — SETUP screen (game.md §2).
 * 4 steps inside one tall card: Kvadrant (Kiyosaki questionnaire), Qahramon
 * (3 hero cards flip-pick OR custom character form), Raqiblar (0–3 bots with
 * random heroes), Orzu (dream pick).
 * Steps slide-x 300ms.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bot, Play, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUZS, formatUZSCompact } from "@/lib/format";
import MoneyDisplay from "@/components/MoneyDisplay";
import { g } from "@/lib/game/strings";
import { professionDifficulty } from "@/lib/game/engine";
import { BOT_NAMES, DREAMS, PERSONALITY_LABELS, PROFESSIONS } from "@/lib/game/data";
import {
  HEROES,
  customExpensesTotal,
  customLoanPayment,
  customLowExpensesWarning,
  customToProfession,
  fieldFromProfessionName,
  heroToProfession,
  validateCustomProfile,
  type CustomProfileInput,
} from "@/lib/game/heroes";
import type { BoardMode, BotPersonality, Difficulty, Dream, GameMode, Hero, Profession, Quadrant } from "@/lib/game/types";

export interface BotSpec {
  name: string;
  profession: Profession;
  personality: BotPersonality;
  heroId: string;
}

export interface SetupResult {
  playerName: string;
  profession: Profession;
  heroId: string | null;
  customField: ReturnType<typeof fieldFromProfessionName>;
  quadrant: Quadrant;
  bots: BotSpec[];
  dream: Dream;
  /** fix-15 (P2): yakuniy qiyinlik darajasi */
  difficulty: Difficulty;
  /** fix-15 (P2): qo'lda override — boshlang'ich shartlar moslashtiriladi */
  difficultyManual: boolean;
  /** fix-16 (X2): o'yin uslubi */
  boardMode: BoardMode;
  /** fix-13c (Q1): o'yin rejimi */
  mode: GameMode;
}

const QUADRANTS: Quadrant[] = ["E", "S", "B", "I"];
const QUADRANT_CLASS: Record<Quadrant, string> = {
  E: "bg-sky-100 text-sky-700",
  S: "bg-gold-100 text-gold-600",
  B: "bg-emerald-100 text-emerald-700",
  I: "bg-clay-100 text-clay-600",
};

const PERSONALITIES: BotPersonality[] = ["cautious", "balanced", "bold"];
const PERSONALITY_CLASS: Record<BotPersonality, string> = {
  cautious: "bg-sky-100 text-sky-700",
  balanced: "bg-emerald-100 text-emerald-700",
  bold: "bg-clay-100 text-clay-600",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- shared bits ---------- */

function FinRow({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "info" | "big" }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-200/70 py-1.5 last:border-0">
      <span className="text-body-sm text-ink-600">{label}</span>
      <span
        className={cn(
          tone === "big" ? "text-money" : "text-money-sm",
          tone === "good" && "text-emerald-600",
          tone === "bad" && "text-clay-500",
          tone === "info" && "text-sky-600",
          (!tone || tone === "big") && "text-ink-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-caption text-ink-400">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-body-sm text-ink-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
      />
    </label>
  );
}

/* ---------- Step 1a: personaj katalogi (fix-15, P1) ---------- */

/** Katalog kartasi: qahramon yoki kasb — ikkalasi ham Profession ko'rinishida. */
interface CatalogEntry {
  key: string;
  kind: "hero" | "profession";
  hero: Hero | null;
  prof: Profession;
  difficulty: Difficulty;
}

const DIFF_BADGE_CLASS: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-gold-100 text-gold-600",
  hard: "bg-clay-100 text-clay-600",
};

function CatalogCard({
  entry,
  selected,
  onSelect,
}: {
  entry: CatalogEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const { prof, hero } = entry;
  const cashflow = prof.salary - prof.expenses - prof.loanPayment;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "card-game-piece relative flex flex-col !p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift",
        selected && "!border-emerald-600 ring-4 ring-emerald-600/40"
      )}
    >
      <div className="flex items-center gap-2">
        <img src={prof.avatar} alt="" className="h-10 w-10 rounded-full object-cover shadow-token" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body-sm font-bold text-ink-900">{hero ? hero.name : prof.name}</h3>
          <p className="truncate text-caption normal-case text-ink-400">{hero ? hero.professionName : prof.name}</p>
        </div>
        <span className={cn("chip shrink-0 !text-[10px]", DIFF_BADGE_CLASS[entry.difficulty])}>
          {g.difficulty[entry.difficulty]}
        </span>
      </div>
      {hero && (
        <div className="mt-2 rounded-xl bg-emerald-50 p-2">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <Sparkles className="h-3 w-3" />
            {hero.ability.name}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-emerald-800">{hero.ability.desc}</p>
        </div>
      )}
      <div className="mt-2 text-[11px]">
        <FinRow label={g.setup.salary} value={formatUZSCompact(prof.salary)} tone="good" />
        <FinRow
          label={g.setup.cashflow}
          value={`${cashflow >= 0 ? "+" : "−"}${formatUZSCompact(Math.abs(cashflow))}`}
          tone={cashflow >= 0 ? undefined : "bad"}
        />
        <FinRow label={g.setup.savings} value={formatUZSCompact(prof.savings)} tone="info" />
        {prof.loanPayment > 0 && (
          <FinRow label={g.setup.creditRow} value={formatUZSCompact(prof.loanPayment)} tone="bad" />
        )}
      </div>
      {selected && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -8 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="absolute right-2 top-2 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold tracking-wide text-white shadow-token"
        >
          TANLANDI
        </motion.span>
      )}
    </button>
  );
}

/* ---------- Main setup screen ---------- */

interface CustomFormState {
  professionName: string;
  salary: string;
  expHousing: string;
  expFood: string;
  expTransport: string;
  expEducation: string;
  expOther: string;
  cash: string;
  mortgageRem: string;
  mortgageRate: string;
  mortgageMonths: string;
  autoRem: string;
  autoRate: string;
  autoMonths: string;
  cardRem: string;
  cardRate: string;
  cardMonths: string;
}

const EMPTY_CUSTOM: CustomFormState = {
  professionName: "",
  salary: "",
  expHousing: "",
  expFood: "",
  expTransport: "",
  expEducation: "",
  expOther: "",
  cash: "",
  mortgageRem: "",
  mortgageRate: "",
  mortgageMonths: "",
  autoRem: "",
  autoRate: "",
  autoMonths: "",
  cardRem: "",
  cardRate: "",
  cardMonths: "",
};

/** So'rovnoma javoblaridan kvadrant aniqlash (ko'p ovoz; durangda birinchisi). */
function quadrantFromAnswers(answers: (Quadrant | null)[]): Quadrant | null {
  if (answers.some((a) => a === null)) return null;
  const counts: Record<Quadrant, number> = { E: 0, S: 0, B: 0, I: 0 };
  for (const a of answers) if (a) counts[a] += 1;
  let best: Quadrant = "E";
  for (const q of QUADRANTS) if (counts[q] > counts[best]) best = q;
  return best;
}

export default function SetupScreen({ onComplete }: { onComplete: (r: SetupResult) => void }) {
  const [step, setStep] = useState(0);
  // kvadrant so'rovnomasi
  const [answers, setAnswers] = useState<(Quadrant | null)[]>([null, null, null]);
  const [quadrantOverride, setQuadrantOverride] = useState<Quadrant | null>(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"hero" | "custom">("hero");
  // fix-15 (P1): katalog tanlovi — CatalogEntry.key yoki null
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "hero" | "profession">("all");
  const [diffFilter, setDiffFilter] = useState<"all" | Difficulty>("all");
  // fix-15 (P2): qiyinlik — "auto" (tavsiya etilgan) yoki qo'lda override
  const [diffMode, setDiffMode] = useState<"auto" | "manual">("auto");
  const [manualDiff, setManualDiff] = useState<Difficulty>("medium");
  const [custom, setCustom] = useState<CustomFormState>(EMPTY_CUSTOM);
  const [customQuadrant, setCustomQuadrant] = useState<Quadrant | null>(null);
  const [botCount, setBotCount] = useState(1);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [bots, setBots] = useState<BotSpec[]>([]);
  const [dreamId, setDreamId] = useState<string | null>(null);
  // fix-16 (X2): o'yin uslubi — klassik doska yoki yo'l xaritasi
  const [boardMode, setBoardMode] = useState<BoardMode>("classic");

  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

  const quizResult = quadrantFromAnswers(answers);
  const quadrant: Quadrant | null = quadrantOverride ?? customQuadrant ?? quizResult;

  // fix-15 (P1): to'liq katalog — barcha qahramonlar + barcha kasblar
  const catalog = useMemo<CatalogEntry[]>(() => {
    const heroes: CatalogEntry[] = HEROES.map((h) => {
      const prof = heroToProfession(h);
      return { key: `hero-${h.id}`, kind: "hero", hero: h, prof, difficulty: professionDifficulty(prof) };
    });
    const profs: CatalogEntry[] = PROFESSIONS.map((p) => ({
      key: `prof-${p.id}`,
      kind: "profession",
      hero: null,
      prof: p,
      difficulty: professionDifficulty(p),
    }));
    return [...heroes, ...profs];
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((e) => {
      if (typeFilter !== "all" && e.kind !== typeFilter) return false;
      if (diffFilter !== "all" && e.difficulty !== diffFilter) return false;
      if (q) {
        const hay = `${e.hero?.name ?? ""} ${e.prof.name} ${e.prof.flavor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog, search, typeFilter, diffFilter]);

  const pickedEntry = catalog.find((e) => e.key === pickedKey) ?? null;

  const customInput: CustomProfileInput = {
    professionName: custom.professionName,
    salary: num(custom.salary),
    expenses: {
      housing: num(custom.expHousing),
      food: num(custom.expFood),
      transport: num(custom.expTransport),
      education: num(custom.expEducation),
      other: num(custom.expOther),
    },
    cash: num(custom.cash),
    loans: [
      {
        name: g.setup.customLoanMortgage,
        principal: num(custom.mortgageRem),
        annualRatePct: num(custom.mortgageRate),
        months: num(custom.mortgageMonths),
      },
      {
        name: g.setup.customLoanAuto,
        principal: num(custom.autoRem),
        annualRatePct: num(custom.autoRate),
        months: num(custom.autoMonths),
      },
      {
        name: g.setup.customLoanCard,
        principal: num(custom.cardRem),
        annualRatePct: num(custom.cardRate),
        months: num(custom.cardMonths),
      },
    ],
  };
  const customError = validateCustomProfile(customInput);
  // yumshoq ogohlantirish: past xarajatlar o'yin boshlashni bloklamaydi
  const customWarning = customError === null ? customLowExpensesWarning(customInput) : null;
  const customField = fieldFromProfessionName(custom.professionName);
  const customExpTotal = customExpensesTotal(customInput.expenses);
  const customMonthlyFlow =
    num(custom.salary) -
    customExpTotal -
    customInput.loans.reduce((s, l) => s + customLoanPayment(l), 0);

  const botPool = useMemo(() => {
    const names = shuffle(BOT_NAMES);
    const heroes = shuffle(HEROES);
    return [0, 1, 2].map((i) => {
      const hero = heroes[i];
      return {
        name: names[i],
        profession: heroToProfession(hero),
        personality: "balanced" as BotPersonality,
        heroId: hero.id,
      };
    });
  }, []);

  const shownBots: BotSpec[] = Array.from({ length: botCount }, (_, i) => bots[i] ?? botPool[i]);

  const cyclePersonality = (i: number) => {
    const cur = shownBots[i];
    const next = PERSONALITIES[(PERSONALITIES.indexOf(cur.personality) + 1) % PERSONALITIES.length];
    const updated = shownBots.map((b, j) => (j === i ? { ...b, personality: next } : b));
    setBots(updated);
  };

  const dream = DREAMS.find((d) => d.id === dreamId) ?? null;
  const canNext0 = quadrant !== null;
  const canNext1 =
    name.trim().length >= 2 && (mode === "hero" ? pickedEntry !== null : customError === null);
  const canFinish = dream !== null;
  const effectiveQuadrant: Quadrant =
    mode === "custom" ? customQuadrant ?? quadrant ?? "E" : quadrant ?? "E";

  // fix-15 (P2): tavsiya etilgan qiyinlik — tanlangan personaj moliyasidan
  const recommendedDifficulty: Difficulty =
    mode === "hero"
      ? pickedEntry?.difficulty ?? "medium"
      : customError === null
        ? professionDifficulty(customToProfession(customInput))
        : "medium";
  const finalDifficulty: Difficulty = diffMode === "auto" ? recommendedDifficulty : manualDiff;

  // fix-15 (P2): qiyinlik qatori (hero va custom rejimda bir xil)
  const difficultyRow = (
    <div className="mt-4 rounded-2xl border border-sand-200 bg-sand-100/60 p-3">
      <p className="text-caption font-semibold uppercase tracking-wide text-ink-400">
        {g.setup.difficultyTitle}
      </p>
      <div className="mt-2 grid gap-1.5">
        <button
          onClick={() => setDiffMode("auto")}
          className={cn(
            "rounded-xl border px-3 py-2 text-left transition-all",
            diffMode === "auto"
              ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30"
              : "border-sand-200 bg-white hover:border-emerald-300"
          )}
        >
          <span className="flex items-center justify-between text-body-sm font-semibold text-ink-900">
            {g.setup.diffRecommended}
            <span className={cn("chip", DIFF_BADGE_CLASS[recommendedDifficulty])}>
              {g.difficulty[recommendedDifficulty]}
            </span>
          </span>
          <span className="text-caption text-ink-400">{g.setup.diffRecommendedHint}</span>
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDiffMode("manual");
                setManualDiff(d);
              }}
              className={cn(
                "rounded-xl border px-2 py-2 text-center transition-all",
                diffMode === "manual" && manualDiff === d
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30"
                  : "border-sand-200 bg-white hover:border-emerald-300"
              )}
            >
              <span className={cn("chip", DIFF_BADGE_CLASS[d])}>{g.difficulty[d]}</span>
              {d !== "medium" && (
                <span className="mt-1 block text-[10px] leading-tight text-ink-400">
                  {d === "easy" ? g.setup.diffEasyHint : g.setup.diffHardHint}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const finish = () => {
    if (!canFinish || !canNext1 || !canNext0) return;
    if (mode === "hero" && pickedEntry) {
      const hero = pickedEntry.hero;
      // avoid bot duplicate hero
      const filtered = shownBots.map((b) => {
        if (!hero || b.heroId !== hero.id) return b;
        const alt = HEROES.find((h) => h.id !== hero.id && !shownBots.some((x) => x.heroId === h.id));
        return alt ? { ...b, profession: heroToProfession(alt), heroId: alt.id } : b;
      });
      onComplete({
        playerName: name.trim(),
        profession: pickedEntry.prof,
        heroId: hero ? hero.id : null,
        customField: hero ? null : pickedEntry.prof.field,
        quadrant: effectiveQuadrant,
        bots: filtered,
        dream,
        difficulty: finalDifficulty,
        difficultyManual: diffMode === "manual",
        boardMode,
        // fix-17 (R5): tez rejim (2 zar) faqat klassik doskada ishlaydi
        mode: boardMode === "plan" ? "classic" : gameMode,
      });
    } else {
      onComplete({
        playerName: name.trim(),
        profession: customToProfession(customInput),
        heroId: null,
        customField,
        quadrant: effectiveQuadrant,
        bots: shownBots,
        dream,
        difficulty: finalDifficulty,
        difficultyManual: diffMode === "manual",
        boardMode,
        // fix-17 (R5): tez rejim (2 zar) faqat klassik doskada ishlaydi
        mode: boardMode === "plan" ? "classic" : gameMode,
      });
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-gradient-hero px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] text-emerald-600"
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />
      <div className="relative w-full max-w-[720px]">
        <h1 className="text-center text-display-lg">{g.setup.title}</h1>

        {/* stepper */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {g.setup.steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  i < step && "bg-emerald-600 text-white",
                  i === step && "bg-emerald-600 text-white ring-4 ring-emerald-100",
                  i > step && "bg-sand-200 text-ink-400"
                )}
              >
                {i + 1}
              </span>
              <span className={cn("text-body-sm", i === step ? "font-semibold text-ink-900" : "text-ink-400")}>
                {s}
              </span>
              {i < g.setup.steps.length - 1 && <span className="h-px w-6 bg-sand-200" />}
            </div>
          ))}
        </div>

        <div className="card mt-6 overflow-hidden !rounded-3xl !p-6 md:!p-8">
          <AnimatePresence mode="wait" initial={false}>
            {/* STEP 0 — Kvadrant so'rovnomasi */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="text-h3">{g.quadrant.title}</h3>
                <p className="mt-1 text-caption text-ink-400">{g.quadrant.sub}</p>

                <div className="mt-4 space-y-4">
                  {g.quadrant.questions.map((qq, qi) => (
                    <div key={qi}>
                      <p className="text-body-sm font-semibold text-ink-800">
                        {qi + 1}. {qq.q}
                      </p>
                      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                        {qq.options.map((opt) => {
                          const active = answers[qi] === opt.q;
                          return (
                            <button
                              key={opt.label}
                              onClick={() =>
                                setAnswers((a) => a.map((v, j) => (j === qi ? (opt.q as Quadrant) : v)))
                              }
                              className={cn(
                                "rounded-xl border px-3 py-2 text-left text-body-sm transition-all",
                                active
                                  ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-800 ring-2 ring-emerald-600/30"
                                  : "border-sand-200 bg-white text-ink-600 hover:border-emerald-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* natija + qo'lda tanlash */}
                {(quizResult || quadrantOverride) && (
                  <div className="mt-4 rounded-2xl border border-gold-300 bg-gold-50 p-4">
                    <p className="text-body-sm font-bold text-ink-900">
                      {g.quadrant.result(g.quadrant.names[quadrant ?? "E"])}
                    </p>
                    <p className="mt-1 text-body-sm leading-relaxed text-ink-600">
                      {g.quadrant.desc[quadrant ?? "E"]}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-ink-400">
                  {g.quadrant.override}
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {QUADRANTS.map((q) => {
                    const active = quadrant === q;
                    return (
                      <button
                        key={q}
                        onClick={() => {
                          setQuadrantOverride(q);
                          setCustomQuadrant(null);
                        }}
                        className={cn(
                          "rounded-xl border px-2 py-2 text-center transition-all",
                          active
                            ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30"
                            : "border-sand-200 bg-white hover:border-emerald-300"
                        )}
                      >
                        <span className={cn("chip", QUADRANT_CLASS[q])}>{q}</span>
                        <p className="mt-1 text-[11px] font-semibold leading-tight text-ink-700">
                          {g.quadrant.names[q].slice(4)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col items-center gap-2">
                  <button
                    className={cn("btn-primary", !canNext0 && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none")}
                    disabled={!canNext0}
                    onClick={() => setStep(1)}
                  >
                    {g.setup.next}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 1 — Qahramon / O'z personaj */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <label className="block text-caption text-ink-400">{g.setup.yourName}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={g.setup.namePlaceholder}
                  maxLength={16}
                  className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-body-sm text-ink-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
                />

                {/* mode toggle */}
                <div className="mt-4 inline-flex w-full rounded-full bg-sand-100 p-1">
                  {(["hero", "custom"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "relative h-10 flex-1 rounded-full px-2 text-center text-body-sm font-semibold transition-colors",
                        mode === m ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
                      )}
                    >
                      {mode === m && (
                        <motion.span
                          layoutId="setup-mode"
                          className="absolute inset-0 rounded-full bg-white shadow-card"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative">{m === "hero" ? g.setup.heroMode : g.setup.customMode}</span>
                    </button>
                  ))}
                </div>

                {mode === "hero" ? (
                  <div className="mt-5">
                    <p className="text-center text-caption text-ink-400">{g.setup.heroPickSub}</p>

                    {/* fix-15 (P1): qidirish + filtr chiplari */}
                    <div className="relative mt-3">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={g.setup.catalogSearch}
                        className="w-full rounded-xl border border-sand-200 bg-white py-2.5 pl-9 pr-3 text-body-sm text-ink-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(
                        [
                          ["all", g.setup.filterAll],
                          ["hero", g.setup.filterHeroes],
                          ["profession", g.setup.filterProfessions],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          onClick={() => setTypeFilter(v)}
                          className={cn(
                            "chip transition-all",
                            typeFilter === v
                              ? "bg-emerald-600 text-white"
                              : "bg-sand-100 text-ink-500 hover:bg-sand-200"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                      <span className="mx-1 w-px self-stretch bg-sand-200" />
                      {(["all", "easy", "medium", "hard"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setDiffFilter(v)}
                          className={cn(
                            "chip transition-all",
                            diffFilter === v
                              ? "bg-emerald-600 text-white"
                              : "bg-sand-100 text-ink-500 hover:bg-sand-200"
                          )}
                        >
                          {v === "all" ? g.setup.difficultyTitle : g.difficulty[v]}
                        </button>
                      ))}
                    </div>

                    {/* kartochkalar panjarasi (scroll) */}
                    <div className="mt-3 grid max-h-[380px] grid-cols-2 gap-2.5 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-3">
                      {filteredCatalog.map((e) => (
                        <CatalogCard
                          key={e.key}
                          entry={e}
                          selected={pickedKey === e.key}
                          onSelect={() => setPickedKey(e.key)}
                        />
                      ))}
                      {filteredCatalog.length === 0 && (
                        <p className="col-span-full py-8 text-center text-body-sm text-ink-400">
                          {g.setup.catalogEmpty}
                        </p>
                      )}
                    </div>

                    {/* fix-15 (P2): qiyinlik qatori — tanlangandan keyin */}
                    {pickedEntry && difficultyRow}
                  </div>
                ) : (
                  <div className="mt-5">
                    <h3 className="text-h3">{g.setup.customTitle}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-caption text-ink-400">{g.setup.customProfession}</span>
                        <input
                          value={custom.professionName}
                          onChange={(e) => setCustom({ ...custom, professionName: e.target.value })}
                          placeholder={g.setup.customProfessionPlaceholder}
                          maxLength={24}
                          className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-body-sm text-ink-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
                        />
                        {customField && (
                          <span className="chip mt-1.5 bg-emerald-100 text-emerald-700">
                            {customField}
                          </span>
                        )}
                      </label>
                      <NumInput label={g.setup.customSalary} value={custom.salary} onChange={(v) => setCustom({ ...custom, salary: v })} />
                      <NumInput label={g.setup.customCash} value={custom.cash} onChange={(v) => setCustom({ ...custom, cash: v })} />
                      <div className="flex items-end pb-1">
                        <FinRow
                          label={g.setup.customFlow}
                          value={`${customMonthlyFlow >= 0 ? "+" : "−"}${formatUZS(Math.abs(customMonthlyFlow))}`}
                          tone={customMonthlyFlow >= 0 ? "good" : "bad"}
                        />
                      </div>
                    </div>

                    {/* xarajatlar taqsimoti */}
                    <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-ink-400">
                      Oylik xarajatlar
                    </p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <NumInput label={g.setup.customExpHousing} value={custom.expHousing} onChange={(v) => setCustom({ ...custom, expHousing: v })} />
                      <NumInput label={g.setup.customExpFood} value={custom.expFood} onChange={(v) => setCustom({ ...custom, expFood: v })} />
                      <NumInput label={g.setup.customExpTransport} value={custom.expTransport} onChange={(v) => setCustom({ ...custom, expTransport: v })} />
                      <NumInput label={g.setup.customExpEducation} value={custom.expEducation} onChange={(v) => setCustom({ ...custom, expEducation: v })} />
                      <NumInput label={g.setup.customExpOther} value={custom.expOther} onChange={(v) => setCustom({ ...custom, expOther: v })} />
                      <div className="flex items-center justify-between rounded-xl bg-sand-100/70 px-4 py-2.5">
                        <span className="text-body-sm font-semibold text-ink-700">{g.setup.customExpTotal}</span>
                        <span className="inline-flex items-baseline gap-1 text-clay-600">
                          <MoneyDisplay value={customExpTotal} size="sm" showCoin={false} />
                          <span className="text-caption text-ink-400">/oy</span>
                        </span>
                      </div>
                    </div>

                    {/* kvadrant (so'rovnomadan olingan, o'zgartirish mumkin) */}
                    <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-ink-400">
                      {g.setup.customQuadrant}
                    </p>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                      {QUADRANTS.map((q) => {
                        const active = (customQuadrant ?? quadrant) === q;
                        return (
                          <button
                            key={q}
                            onClick={() => setCustomQuadrant(q)}
                            className={cn(
                              "rounded-xl border px-2 py-1.5 text-center transition-all",
                              active
                                ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30"
                                : "border-sand-200 bg-white hover:border-emerald-300"
                            )}
                          >
                            <span className={cn("chip", QUADRANT_CLASS[q])}>{q}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-ink-400">
                      {g.setup.customLoans}
                    </p>
                    <div className="mt-2 grid gap-3">
                      {(
                        [
                          [g.setup.customLoanMortgage, "mortgageRem", "mortgageRate", "mortgageMonths"],
                          [g.setup.customLoanAuto, "autoRem", "autoRate", "autoMonths"],
                          [g.setup.customLoanCard, "cardRem", "cardRate", "cardMonths"],
                        ] as const
                      ).map(([label, remKey, rateKey, monthsKey], li) => {
                        const loan = customInput.loans[li];
                        const monthly = customLoanPayment(loan);
                        const needsTerms = loan.principal > 0 && monthly === 0;
                        return (
                          <div key={remKey} className="rounded-xl bg-sand-100/70 p-2.5">
                            <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-4">
                              <span className="pb-2 text-body-sm font-semibold text-ink-700">{label}</span>
                              <NumInput label={g.setup.customLoanRemaining} value={custom[remKey]} onChange={(v) => setCustom({ ...custom, [remKey]: v })} />
                              <NumInput label={g.setup.customLoanRate} value={custom[rateKey]} onChange={(v) => setCustom({ ...custom, [rateKey]: v })} />
                              <NumInput label={g.setup.customLoanMonths} value={custom[monthsKey]} onChange={(v) => setCustom({ ...custom, [monthsKey]: v })} />
                            </div>
                            {monthly > 0 && (
                              <p className="mt-1.5 text-caption font-semibold text-emerald-700">
                                {g.setup.customLoanComputed(formatUZSCompact(monthly))}
                              </p>
                            )}
                            {needsTerms && (
                              <p className="mt-1.5 text-caption font-semibold text-clay-600">
                                {g.setup.customLoanHint}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {customError && (
                      <p className="mt-3 rounded-xl bg-clay-100 px-3 py-2 text-body-sm text-clay-600">{customError}</p>
                    )}
                    {customWarning && (
                      <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-body-sm text-amber-700">{customWarning}</p>
                    )}
                    {/* fix-15 (P2): qiyinlik qatori */}
                    {customError === null && difficultyRow}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button className="btn-ghost" onClick={() => setStep(0)}>
                    <ArrowLeft className="h-4 w-4" />
                    {g.setup.back}
                  </button>
                  <button className={cn("btn-primary", !canNext1 && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none")} disabled={!canNext1} onClick={() => setStep(2)}>
                    {g.setup.next}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Raqiblar */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="text-h3">{g.setup.rivals}</h3>

                {/* fix-13c (Q1): o'yin rejimi */}
                <p className="mt-3 text-caption font-semibold uppercase tracking-wide text-ink-400">
                  O'yin rejimi
                </p>
                <div className="mt-1.5 inline-flex w-full rounded-full bg-sand-100 p-1">
                  {(
                    [
                      { id: "classic", label: "🐢 Oddiy", hint: "30–45 daq" },
                      { id: "tez", label: "⚡ Tez", hint: "15–20 daq" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setGameMode(m.id)}
                      className={cn(
                        "relative h-10 flex-1 rounded-full px-2 text-center text-body-sm font-semibold transition-colors",
                        gameMode === m.id ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
                      )}
                    >
                      {gameMode === m.id && (
                        <motion.span
                          layoutId="game-mode"
                          className="absolute inset-0 rounded-full bg-white shadow-card"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative">
                        {m.label} <span className="text-[10px] font-normal">({m.hint})</span>
                      </span>
                    </button>
                  ))}
                </div>
                {gameMode === "tez" && (
                  <p className="mt-1.5 text-caption text-emerald-700">
                    ⚡ Tez rejim: har yurishda 2 zar, boshlang'ich naqd ×1,5, erkinlik uchun 1 oy streak.
                  </p>
                )}

                <p className="mt-4 text-caption text-ink-400">{g.setup.botCountLabel(botCount)}</p>
                <div className="mt-2 inline-flex rounded-full bg-sand-100 p-1">
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBotCount(n)}
                      className={cn(
                        "relative h-9 rounded-full px-3 text-sm font-semibold transition-colors",
                        botCount === n ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
                      )}
                    >
                      {botCount === n && (
                        <motion.span
                          layoutId="bot-count"
                          className="absolute inset-0 rounded-full bg-white shadow-card"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative">{n === 0 ? g.setup.solo : n}</span>
                    </button>
                  ))}
                </div>
                {botCount > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <AnimatePresence initial={false}>
                      {shownBots.map((b, i) => (
                        <motion.div
                          key={b.name}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ delay: i * 0.1, type: "spring", stiffness: 320, damping: 22 }}
                          className="card-game-piece !p-4 text-center"
                        >
                          <div className="absolute inset-x-0 top-0 h-[3px] bg-gold-500" />
                          <img src={b.profession.avatar} alt="" className="mx-auto h-14 w-14 rounded-full object-cover shadow-token" />
                          <p className="mt-2 flex items-center justify-center gap-1 font-semibold text-ink-900">
                            <Bot className="h-3.5 w-3.5 text-ink-400" />
                            {b.name}
                          </p>
                          <p className="text-caption normal-case text-ink-400">{b.profession.name}</p>
                          <p className="mt-1 text-[10px] leading-tight text-emerald-700">
                            {HEROES.find((h) => h.id === b.heroId)?.ability.name}
                          </p>
                          <button
                            className={cn("chip mt-2", PERSONALITY_CLASS[b.personality])}
                            onClick={() => cyclePersonality(i)}
                          >
                            {PERSONALITY_LABELS[b.personality]}
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-sand-300 bg-sand-100/60 p-6 text-center">
                    <p className="text-body-sm font-semibold text-ink-700">{g.setup.solo}</p>
                    <p className="mt-1 text-caption text-ink-400">
                      Faqat siz va sizning moliyaviy rejalaringiz — raqibsiz to'liq o'yin.
                    </p>
                  </div>
                )}
                <div className="mt-6 flex items-center justify-between">
                  <button className="btn-ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" />
                    {g.setup.back}
                  </button>
                  <button className="btn-primary" onClick={() => setStep(3)}>
                    {g.setup.next}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Orzu */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="text-h3">{g.setup.yourDream}</h3>
                <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
                  {DREAMS.map((d) => {
                    const selected = dreamId === d.id;
                    return (
                      <motion.button
                        key={d.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDreamId(d.id)}
                        className={cn(
                          "relative w-44 shrink-0 snap-center overflow-hidden rounded-2xl border bg-gold-100 text-left shadow-card transition-all",
                          selected ? "border-gold-500 ring-4 ring-gold-500/50" : "border-sand-200 hover:-translate-y-1 hover:shadow-lift"
                        )}
                      >
                        <div
                          className="h-24 w-full"
                          style={{
                            backgroundImage: "url(/dreams-strip.png)",
                            backgroundSize: "500% 100%",
                            backgroundPosition: `${(d.stripX / 4) * 100}% 50%`,
                          }}
                        />
                        <div className="p-3">
                          <p className="text-body-sm font-semibold text-ink-900">{d.title}</p>
                          <p className="mt-0.5 line-clamp-3 min-h-[3.6em] text-[11px] leading-snug text-ink-500">{d.desc}</p>
                          <p className="text-money-sm text-gold-600">{formatUZSCompact(d.price)}</p>
                        </div>
                        {selected && (
                          <motion.span
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: -8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="absolute right-2 top-2 rounded-lg bg-gold-500 px-2 py-1 text-[10px] font-bold tracking-wide text-ink-900 shadow-token"
                          >
                            {g.setup.dreamStamp}
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {/* fix-16 (X2): O'yin uslubi tanlovi */}
                <h3 className="text-h3 mt-6">{g.setup.boardModeTitle}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      { key: "classic" as BoardMode, title: g.setup.boardClassic, desc: g.setup.boardClassicDesc, badge: null as string | null },
                      { key: "path" as BoardMode, title: g.setup.boardPath, desc: g.setup.boardPathDesc, badge: null as string | null },
                      { key: "plan" as BoardMode, title: g.setup.boardPlan, desc: g.setup.boardPlanDesc, badge: g.setup.badgeNew },
                    ]
                  ).map((opt) => {
                    const selected = boardMode === opt.key;
                    return (
                      <motion.button
                        key={opt.key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setBoardMode(opt.key)}
                        className={cn(
                          "relative min-h-[72px] rounded-2xl border bg-white p-3 text-left shadow-card transition-all",
                          selected ? "border-emerald-600 ring-4 ring-emerald-100" : "border-sand-200 hover:-translate-y-0.5 hover:shadow-lift"
                        )}
                      >
                        {opt.badge && (
                          <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                            {opt.badge}
                          </span>
                        )}
                        <p className="text-body-sm font-semibold text-ink-900">{opt.title}</p>
                        <p className="mt-1 text-[11px] leading-snug text-ink-500">{opt.desc}</p>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <button className="btn-ghost" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4" />
                    {g.setup.back}
                  </button>
                  <button
                    className={cn("btn-primary", !canFinish && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none")}
                    disabled={!canFinish}
                    onClick={finish}
                  >
                    <Play className="h-4 w-4" />
                    {g.setup.start}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
