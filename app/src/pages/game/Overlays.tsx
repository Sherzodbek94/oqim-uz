/**
 * OQIM (avvalgi Cashflow UZ) — full-screen overlays & ceremonies (game.md §1, §3.4, §5, §6).
 * Continue-or-new modal, escape ceremony, win/end screen, bankruptcy flow,
 * settings drawer.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { HelpCircle, Landmark, LogOut, RotateCcw, Settings, Store, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUZS, formatUZSCompact } from "@/lib/format";
import { g } from "@/lib/game/strings";
import { PROFESSIONS } from "@/lib/game/data";
import { heroById } from "@/lib/game/heroes";
import { canTakeQarz, passiveIncome, qarzMaxAmount } from "@/lib/game/engine";
import { QARZ_MIN, QARZ_MONTHS } from "@/lib/game/types";
import { LESSON_BY_ID, LESSON_CATEGORY_ICON } from "@/lib/game/mentor";
import type { GameSettings } from "@/lib/game/save";
import type { GameState, Player } from "@/lib/game/types";

const CONFETTI_COLORS = ["#2E7D5F", "#D9A441", "#F4EEE1", "#24604A", "#B98428"];

export function fireConfetti(durationMs = 2500) {
  const end = Date.now() + durationMs;
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Headline with char-split rise (design.md §7.2.6). */
function SplitHeadline({ text, className }: { text: string; className?: string }) {
  return (
    <h1 className={cn("text-display-xl", className)} aria-label={text}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </h1>
  );
}

/* ---------------- Continue / New game modal (game.md §1) ---------------- */

export function ContinueModal({
  save,
  onResume,
  onNew,
}: {
  save: GameState;
  onResume: () => void;
  onNew: () => void;
}) {
  const human = save.players.find((p) => !p.isBot) ?? save.players[0];
  const prof = PROFESSIONS.find((x) => x.id === human.professionId);
  const resumeHero = heroById(human.heroId);
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/35 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-modal"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <h3 className="text-h3">{g.resume.title}</h3>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sand-100 p-4">
          <img src={human.avatar ?? prof?.avatar ?? "/avatar-teacher.png"} alt="" className="h-12 w-12 rounded-full object-cover shadow-token" />
          <div className="flex-1">
            <p className="font-semibold text-ink-900">
              {human.name} · {resumeHero ? resumeHero.professionName : (prof?.name ?? human.professionId)}
            </p>
            <p className="text-body-sm text-ink-600">
              {g.resume.turn(save.round)} · <span className="text-money-sm">{formatUZS(human.cash)}</span>
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <button className="btn-primary w-full" onClick={onResume}>
            {g.resume.resume}
          </button>
          <button
            className="btn-secondary w-full !border-clay-500/40 !text-clay-500 hover:!border-clay-500 hover:!text-clay-600"
            onClick={onNew}
          >
            {g.resume.newGame}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Escape ceremony (game.md §3.4) ---------------- */

export function EscapeCeremony({ onGo }: { onGo: () => void }) {
  useEffect(() => {
    fireConfetti(1500);
  }, []);
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-emerald-50/95 px-6 text-center backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] text-emerald-600"
        style={{ backgroundImage: "url(/pattern-suzani.svg)", backgroundSize: "240px" }}
      />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-emerald text-white shadow-lift"
      >
        <Trophy className="h-10 w-10" />
      </motion.div>
      <div className="mt-6">
        <SplitHeadline text={g.escape.headline} className="text-emerald-700" />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-3 text-h4 text-ink-600"
      >
        {g.escape.sub}
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="btn-gold mt-8 !px-8 !py-4 !text-base"
        onClick={onGo}
      >
        {g.escape.cta}
      </motion.button>
    </motion.div>
  );
}

/* ---------------- G'alaba kartasi (fix-13c, Q2) ---------------- */

interface ShareCardInfo {
  won: boolean;
  name: string;
  /** qahramon emojisi (kartada avatar o'rnida) */
  emoji: string;
  /** escape oyi (round) — chiqilmagan bo'lsa null */
  escapeMonth: number | null;
  endMonth: number;
  passive: number;
  quadrantStart: string;
  quadrantEnd: string;
  date: string;
}

/** Qahramon/kasb uchun oddiy emoji (karta avatar o'rnida). */
function shareEmoji(p: Player): string {
  if (p.heroId) return "🦸";
  return "🧑‍💼";
}

/** Suzani yulduzi — canvas'da 8 qirrali yulduz chizadi. */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** G'alaba kartasini Canvas API bilan PNG'ga render qilib yuklab oladi. */
function downloadSharePng(info: ShareCardInfo) {
  const W = 800;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // fon: zumrad gradient (bankrotlik — xira kulrang)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (info.won) {
    bg.addColorStop(0, "#1d5c45");
    bg.addColorStop(0.55, "#2E7D5F");
    bg.addColorStop(1, "#24604A");
  } else {
    bg.addColorStop(0, "#5A6B70");
    bg.addColorStop(1, "#3d4a4e");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // oltin ramka
  ctx.strokeStyle = "#D9A441";
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = "rgba(217,164,65,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  // burchak yulduzlari + markaziy katta yulduz
  drawStar(ctx, 90, 90, 26, "#D9A441");
  drawStar(ctx, W - 90, 90, 26, "#D9A441");
  drawStar(ctx, 90, H - 90, 26, "#D9A441");
  drawStar(ctx, W - 90, H - 90, 26, "#D9A441");
  drawStar(ctx, W / 2, 210, 64, info.won ? "#D9A441" : "#9aa5a9");

  ctx.textAlign = "center";

  // OQIM logotipi
  ctx.fillStyle = "#F4EEE1";
  ctx.font = "700 44px Georgia, serif";
  ctx.fillText("OQIM", W / 2, 110);
  ctx.fillStyle = "rgba(244,238,225,0.75)";
  ctx.font = "400 22px Georgia, serif";
  ctx.fillText("moliyaviy erkinlik o'yini", W / 2, 145);

  // avatar emojisi + ism
  ctx.font = "96px serif";
  ctx.fillText(info.emoji, W / 2, 360);
  ctx.fillStyle = "#F4EEE1";
  ctx.font = "700 52px Georgia, serif";
  ctx.fillText(info.name, W / 2, 440);

  // asosiy sarlavha
  ctx.fillStyle = info.won ? "#D9A441" : "#F4EEE1";
  ctx.font = "700 40px Georgia, serif";
  const headline = info.won
    ? `${info.escapeMonth ?? info.endMonth} oyda Kundalik aylanadan chiqdi!`
    : `${info.endMonth} oy kurashdi — keyingi safar albatta!`;
  ctx.fillText(headline, W / 2, 520);

  // statistika qatorlari
  ctx.fillStyle = "rgba(244,238,225,0.92)";
  ctx.font = "400 30px Georgia, serif";
  const lines = [
    `Passiv daromad: ${formatUZSCompact(info.passive)} / oy`,
    `Kvadrant yo'li: ${info.quadrantStart} → ${info.quadrantEnd}`,
    `Sana: ${info.date}`,
  ];
  lines.forEach((t, i) => ctx.fillText(t, W / 2, 610 + i * 56));

  // pastki imzo
  ctx.fillStyle = "rgba(244,238,225,0.6)";
  ctx.font = "italic 24px Georgia, serif";
  ctx.fillText("oqim.uz — o'ynang va erkinga chiqing", W / 2, H - 80);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "oqim-galaba.png";
  a.click();
}

/** Nusxalanadigan o'zbekcha share matni. */
function shareText(info: ShareCardInfo): string {
  const head = info.won
    ? `🏆 ${info.name} ${info.escapeMonth ?? info.endMonth} oyda Kundalik aylanadan chiqdi!`
    : `💪 ${info.name} ${info.endMonth} oy kurashdi — keyingi safar albatta!`;
  return [
    head,
    `💰 Passiv daromad: ${formatUZSCompact(info.passive)} / oy`,
    `🧭 Kvadrant yo'li: ${info.quadrantStart} → ${info.quadrantEnd}`,
    `📅 Sana: ${info.date}`,
    ``,
    `OQIM — moliyaviy erkinlik o'yini. Siz ham sinab ko'ring!`,
  ].join("\n");
}

function ShareCard({ info }: { info: ShareCardInfo }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const text = shareText(info);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API yo'q — textarea fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.25 }}
      className="relative z-10 mt-6 w-full max-w-md"
    >
      {/* karta */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border-4 p-6 text-center shadow-lift",
          info.won
            ? "border-gold-500 bg-gradient-to-br from-emerald-800 via-emerald-600 to-emerald-800"
            : "border-sand-300 bg-gradient-to-br from-slate-500 to-slate-700"
        )}
      >
        <span className={cn("text-4xl", info.won ? "text-gold-500" : "text-sand-200")}>✦</span>
        <p className="font-display text-xl font-bold tracking-[0.2em] text-sand-100">OQIM</p>
        <p className="mt-3 text-5xl">{info.emoji}</p>
        <p className="mt-2 font-display text-2xl font-bold text-sand-100">{info.name}</p>
        <p className={cn("mt-2 font-display text-lg font-bold", info.won ? "text-gold-400" : "text-sand-100")}>
          {info.won
            ? `${info.escapeMonth ?? info.endMonth} oyda Kundalik aylanadan chiqdi!`
            : `${info.endMonth} oy kurashdi — keyingi safar albatta!`}
        </p>
        <div className="mt-3 space-y-1 text-body-sm text-sand-100/90">
          <p>💰 Passiv daromad: {formatUZSCompact(info.passive)} / oy</p>
          <p>🧭 Kvadrant yo'li: {info.quadrantStart} → {info.quadrantEnd}</p>
          <p>📅 {info.date}</p>
        </div>
        <span className={cn("absolute left-3 top-3 text-xl", info.won ? "text-gold-500" : "text-sand-300")}>✦</span>
        <span className={cn("absolute right-3 top-3 text-xl", info.won ? "text-gold-500" : "text-sand-300")}>✦</span>
        <span className={cn("absolute bottom-3 left-3 text-xl", info.won ? "text-gold-500" : "text-sand-300")}>✦</span>
        <span className={cn("absolute bottom-3 right-3 text-xl", info.won ? "text-gold-500" : "text-sand-300")}>✦</span>
      </div>
      {/* tugmalar */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button className="btn-secondary !px-4 !py-2" onClick={onCopy}>
          {copied ? "✅ Nusxalandi!" : "📋 Matnni nusxalash"}
        </button>
        <button className="btn-secondary !px-4 !py-2" onClick={() => downloadSharePng(info)}>
          🖼 Rasm sifatida yuklab olish
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------- Win / End screen (game.md §5, §6) ---------------- */

export function EndScreen({
  state,
  winner,
  onNewGame,
}: {
  state: GameState;
  winner: Player | null;
  onNewGame: () => void;
}) {
  const humanWin = state.endVariant === "win";
  useEffect(() => {
    if (humanWin) fireConfetti(2500);
  }, [humanWin]);
  const shown = winner ?? state.players[0];
  const prof = PROFESSIONS.find((x) => x.id === shown.professionId);
  const shownHero = heroById(shown.heroId);
  const solo = state.players.filter((p) => !p.isBot).length === 1 && state.players.length === 1;

  const stats = [
    { label: g.end.rounds, value: String(state.round) },
    { label: g.end.assetsBought, value: String(shown.assets.length) },
    {
      label: g.end.totalPassive,
      value: formatUZSCompact(passiveIncome(shown) + shown.ftCashflow),
    },
    { label: g.end.escapeRound, value: shown.escapeTurn !== null ? String(shown.escapeTurn) : "—" },
  ];

  return (
    <motion.div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-sand-50 px-6 py-12 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* dreams backdrop band */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-44 w-full opacity-90"
        style={{
          backgroundImage: "url(/dreams-strip.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />
      <motion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.2 }}
        className="relative z-10 mt-16 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-gold text-ink-900 shadow-lift"
      >
        <Trophy className="h-12 w-12" />
      </motion.div>
      <div className="relative z-10 mt-6">
        <SplitHeadline text={humanWin ? g.end.winTitle : g.end.bankruptTitle} />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 mt-2 text-h4 text-ink-600"
      >
        {humanWin ? g.end.winSub(shown.name) : g.end.botWinSub(shown.name)}
      </motion.p>
      {/* fix-13c (Q1): o'yin rejimi */}
      <span className={cn("relative z-10 mt-2 chip", state.mode === "tez" ? "bg-amber-100 text-amber-700" : "bg-sand-100 text-ink-500")}>
        {state.mode === "tez" ? "⚡ Tez rejim" : "🐢 Oddiy rejim"}
      </span>
      {humanWin && state.winPath === "dream" && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 }}
          className="relative z-10 mt-3 chip bg-gold-100 text-gold-600"
        >
          🏆 {g.end.dreamWinNote}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.95 }}
        className="card-game-piece relative z-10 mt-6 flex items-center gap-3 !p-4"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gold-500" />
        <img src={shown.avatar ?? prof?.avatar ?? "/avatar-teacher.png"} alt="" className="h-12 w-12 rounded-full object-cover shadow-token" />
        <div className="text-left">
          <p className="font-semibold text-ink-900">{shown.name}</p>
          <p className="text-body-sm text-ink-600">
            {shownHero ? shownHero.professionName : (prof?.name ?? shown.professionId)}
            {shownHero ? ` · ${shownHero.ability.name}` : ""}
          </p>
          {solo && <p className="text-caption normal-case text-ink-400">{g.hero.soloStats}</p>}
        </div>
      </motion.div>

      {/* fix-13c (Q2): ulashish kartasi — g'alaba va bankrotlik (xira variant) */}
      <ShareCard
        info={{
          won: humanWin,
          name: shown.name,
          emoji: shareEmoji(shown),
          escapeMonth: shown.escapeTurn,
          endMonth: state.month,
          passive: passiveIncome(shown) + shown.ftCashflow,
          quadrantStart: shown.quadrantStart,
          quadrantEnd: shown.quadrant,
          date: new Date().toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }),
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="relative z-10 mt-6 grid w-full max-w-md grid-cols-2 gap-3"
      >
        {stats.map((s) => (
          <div key={s.label} className="card-stat">
            <p className="text-caption text-ink-400">{s.label}</p>
            <p className="text-money-lg text-ink-900">{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* fix-13b (M1): bu o'yinda o'zlashtirilgan darslar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 mt-6 w-full max-w-md"
      >
        <p className="text-caption font-semibold uppercase tracking-wide text-ink-400">
          🎓 {g.end.lessonsTitle}
        </p>
        {(shown.lessonsSeen ?? []).length === 0 ? (
          <p className="mt-2 text-body-sm text-ink-400">{g.end.noLessons}</p>
        ) : (
          <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1 text-left">
            {(shown.lessonsSeen ?? []).map((id) => {
              const l = LESSON_BY_ID[id];
              if (!l) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-card"
                >
                  <span className="shrink-0 text-base">{LESSON_CATEGORY_ICON[l.category]}</span>
                  <span className="flex-1 text-body-sm font-medium text-ink-900">{l.title}</span>
                  <span className="text-emerald-600">✓</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="relative z-10 mt-8 flex flex-wrap justify-center gap-3"
      >
        <button className="btn-gold" onClick={onNewGame}>
          {g.end.newGame}
        </button>
        <Link to="/" className="btn-ghost">
          {g.end.home}
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Bankruptcy (game.md §6) ---------------- */

export function BankruptcyModal({
  state,
  player,
  onSell,
  onLoan,
  onQarz,
}: {
  state: GameState;
  player: Player;
  onSell: () => void;
  onLoan: () => void;
  onQarz: (amount: number, months: number) => void;
}) {
  // fix-14 (T1): qarindoshlardan foizsiz qarz — birinchi (eng arzon) variant
  const maxQarz = qarzMaxAmount(player);
  const minQarz = Math.min(QARZ_MIN, maxQarz);
  const deficit = Math.max(QARZ_MIN, -player.cash);
  const [amount, setAmount] = useState(() => Math.min(maxQarz, Math.max(minQarz, deficit)));
  const [months, setMonths] = useState<number>(6);
  const hasActiveQarz = player.loans.some((l) => l.kind === "qarz");
  const blocked = state.month < (player.qarzBlockedUntil ?? 0);
  const canQarz = canTakeQarz(state, player, amount, months);
  const qarzReason = hasActiveQarz
    ? g.bankruptcy.qarzActive
    : blocked
      ? g.bankruptcy.qarzBlocked(player.qarzBlockedUntil)
      : maxQarz < QARZ_MIN
        ? g.bankruptcy.qarzTooSmall
        : null;
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/35 backdrop-blur-sm lg:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-modal lg:rounded-3xl"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-100 text-clay-500">
          <Landmark className="h-7 w-7" />
        </div>
        <h3 className="mt-3 text-center text-h3">{g.bankruptcy.title}</h3>
        <p className="mt-1 text-center text-body-sm text-ink-600">{g.bankruptcy.body}</p>
        <p className="mt-2 text-center text-money text-clay-500">{formatUZS(player.cash)}</p>
        <div className="mt-5 space-y-3">
          {/* 1-variant: qarindoshlardan foizsiz qarz */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-body-sm font-semibold text-ink-900">{g.bankruptcy.qarz}</p>
            <p className="mt-0.5 text-caption text-ink-500">{g.bankruptcy.qarzHint}</p>
            {qarzReason ? (
              <p className="mt-2 text-caption text-clay-500">{qarzReason}</p>
            ) : (
              <>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-caption text-ink-600">
                    <span>{g.bankruptcy.qarzAmount}</span>
                    <span className="font-semibold text-ink-900">{formatUZSCompact(amount)}</span>
                  </div>
                  <input
                    type="range"
                    min={minQarz}
                    max={maxQarz}
                    step={100_000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full accent-emerald-600"
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-caption text-ink-600">{g.bankruptcy.qarzTerm}:</span>
                  {QARZ_MONTHS.map((m) => (
                    <button
                      key={m}
                      className={cn(
                        "min-h-[32px] rounded-full px-3 text-[11px] font-semibold transition-colors",
                        months === m ? "bg-emerald-600 text-white" : "bg-sand-100 text-ink-600 hover:bg-sand-200"
                      )}
                      onClick={() => setMonths(m)}
                    >
                      {g.bankruptcy.qarzMonths(m)}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-caption text-ink-400">{g.bankruptcy.qarzDueInfo(state.month + months)}</p>
                <button
                  className={cn("btn-primary mt-2 w-full", !canQarz && "cursor-not-allowed opacity-50")}
                  disabled={!canQarz}
                  onClick={() => onQarz(amount, months)}
                >
                  {g.bankruptcy.qarzTake(formatUZSCompact(amount))}
                </button>
              </>
            )}
          </div>
          {/* 2-variant: bank shoshilinch qarzi */}
          <button
            className={cn("btn-secondary w-full", player.usedEmergencyLoan && "cursor-not-allowed opacity-50")}
            disabled={player.usedEmergencyLoan}
            title={player.usedEmergencyLoan ? g.bankruptcy.loanUsed : undefined}
            onClick={onLoan}
          >
            <Landmark className="h-4 w-4" />
            {g.bankruptcy.emergencyLoan}
          </button>
          {/* 3-variant: aktivlarni shoshilinch sotish */}
          {player.assets.length > 0 && (
            <button className="btn-danger w-full" onClick={onSell}>
              <Store className="h-4 w-4" />
              {g.bankruptcy.sellAssets}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function BankruptFinalModal({
  player,
  canSpectate,
  onSpectate,
  onNewGame,
}: {
  player: Player;
  canSpectate: boolean;
  onSpectate: () => void;
  onNewGame: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/45 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-modal"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sand-200 text-ink-400 grayscale"
        >
          <RotateCcw className="h-8 w-8" />
        </motion.div>
        <h3 className="mt-4 text-h3">{g.bankruptcy.finalTitle}</h3>
        <p className="mt-2 text-body-sm italic text-ink-400">{g.bankruptcy.finalBody}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="card-stat !p-3">
            <p className="text-caption text-ink-400">{g.end.rounds}</p>
            <p className="text-money text-ink-900">{player.turnsPlayed}</p>
          </div>
          <div className="card-stat !p-3">
            <p className="text-caption text-ink-400">{g.end.assetsBought}</p>
            <p className="text-money text-ink-900">{player.assets.length}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {canSpectate && (
            <button className="btn-secondary w-full" onClick={onSpectate}>
              {g.bankruptcy.spectate}
            </button>
          )}
          <button className="btn-primary w-full" onClick={onNewGame}>
            {g.bankruptcy.newGame}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Settings drawer (game.md §1 GameShell) ---------------- */

export function SettingsDrawer({
  open,
  settings,
  onSettings,
  onSaveExit,
  onRestart,
  onClose,
}: {
  open: boolean;
  settings: GameSettings;
  onSettings: (s: GameSettings) => void;
  onSaveExit: () => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const speeds: { id: GameSettings["speed"]; label: string }[] = [
    { id: "slow", label: g.shell.slow },
    { id: "normal", label: g.shell.normal },
    { id: "fast", label: g.shell.fast },
  ];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[75] bg-ink-900/35 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[76] flex w-full max-w-xs flex-col bg-white shadow-modal"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
              <h3 className="flex items-center gap-2 text-h4">
                <Settings className="h-5 w-5 text-ink-400" />
                {g.shell.settings}
              </h3>
              <button className="btn-ghost !p-2" onClick={onClose} aria-label={g.shell.close}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <p className="text-caption text-ink-400">{g.shell.haptics}</p>
                <button
                  role="switch"
                  aria-checked={settings.haptics}
                  onClick={() => onSettings({ ...settings, haptics: !settings.haptics })}
                  className={cn(
                    "mt-2 flex h-7 w-12 items-center rounded-full p-1 transition-colors",
                    settings.haptics ? "justify-end bg-emerald-600" : "justify-start bg-sand-200"
                  )}
                >
                  <motion.span layout className="h-5 w-5 rounded-full bg-white shadow-card" />
                </button>
              </div>
              <div>
                <p className="text-caption text-ink-400">{g.shell.speed}</p>
                <div className="mt-2 flex rounded-full bg-sand-100 p-1">
                  {speeds.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSettings({ ...settings, speed: s.id })}
                      className={cn(
                        "relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
                        settings.speed === s.id ? "text-ink-900" : "text-ink-400"
                      )}
                    >
                      {settings.speed === s.id && (
                        <motion.span
                          layoutId="speed-pill"
                          className="absolute inset-0 rounded-full bg-white shadow-card"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <a
                href="/rules"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full"
              >
                <HelpCircle className="h-4 w-4" />
                {g.shell.rules}
              </a>
            </div>
            <div className="space-y-2 border-t border-sand-200 p-5">
              <button className="btn-secondary w-full" onClick={onSaveExit}>
                <LogOut className="h-4 w-4" />
                {g.shell.saveAndExit}
              </button>
              <button className="btn-danger w-full" onClick={onRestart}>
                <RotateCcw className="h-4 w-4" />
                {g.shell.restart}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
