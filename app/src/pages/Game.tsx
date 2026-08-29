/**
 * OQIM — /game route (game.md).
 * Four screen states in one route: SETUP → ASOSIY → ERKINLIK → END.
 * Owns the turn state machine, bot runner, autosave and all overlays.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Dices, Gauge, Handshake, HelpCircle, Landmark, Rocket, Settings, TrendingUp, Wallet } from "lucide-react";
import Dice from "@/components/Dice";
import MoneyDisplay from "@/components/MoneyDisplay";
import { PLAYER_COLORS } from "@/components/PlayerToken";
import { cn } from "@/lib/utils";
import { formatUZSCompact } from "@/lib/format";
import { g } from "@/lib/game/strings";
import {
  BIG_DEALS,
  DOODAD_CARDS,
  DREAMS,
  FT_DEALS,
  MARKET_CARDS,
  SMALL_DEALS,
  WEEKEND_CARDS,
} from "@/lib/game/data";
import { SCORE_BANKRUPTCY, SCORE_DEAL_MIN, TEZ_CASH_MULT } from "@/lib/game/types";
import type { Quadrant } from "@/lib/game/types";
import {
  acceptMigration,
  activePlayers,
  addLog,
  notify,
  offerClientWork,
  adjustCreditScore,
  advanceTurn,
  applyAvans,
  applyBaby,
  applyCharity,
  applyDoodad,
  applyDownsized,
  applyEvent,
  applyFTAudit,
  applyFTBonus,
  applyFTPayday,
  applyHomeExpense,
  applyLifeEvent,
  applyPayday,
  takeQarz,
  applyWeekend,
  autoResolveChildEvent,
  resolveChildEvent,
  buyDeal,
  buyDealInstallment,
  buyDream,
  buyFTDeal,
  canEscape,
  closeLoanEarly,
  completeMonth,
  dayOfMonth,
  dealKnowledgeLocked,
  dealLoanGate,
  deferDoodad,
  diceTotal,
  dreamHoldWin,
  effectiveSalary,
  dreamMonthlyNet,
  eligibleEvents,
  eligibleLifeEvents,
  emergencyLoan,
  forcedSell,
  ftCashflowWin,
  ftMonthlyIncome,
  hireManager,
  makeGame,
  makePlayer,
  makePartialPayment,
  managerCost,
  marketOffer,
  maybeAdvanceQuadrant,
  monthlyCashflow,
  movePath,
  passiveIncome,
  adjustedDown,
  payoffInstallment,
  rollDice,
  rollHomeExpense,
  sellAsset,
  sellAssetAnytime,
  takeLoanOffer,
  tickTurn,
  totalExpenses,
  quadrantLevel,
  useClientAction,
  useKnowledgeAction,
} from "@/lib/game/engine";
import {
  botCharityDecision,
  botDealDecision,
  botDilemmaChoice,
  botDoodadDecline,
  botDoodadMode,
  botFTDealDecision,
  botMigrationDecision,
  botPickDealSize,
  botRescue,
  botTradeExchange,
  botWeekendChoice,
  botPathChoice,
} from "@/lib/game/bots";
import { tickNews } from "@/lib/game/news";
import {
  buySecurity,
  portfolioDividends,
  securityById,
  sellSecurity,
  tickExchangePrices,
} from "@/lib/game/exchange";
import {
  clearSave,
  loadSave,
  loadSettings,
  recordEscape,
  recordWin,
  saveGame,
  saveSettings,
  vibrate,
  type GameSettings,
} from "@/lib/game/save";
import { buildRecord, recordGame, recordLessons } from "@/lib/profile";
import { checkMentor, type Lesson, type MentorContext } from "@/lib/game/mentor";
import { AVANS_INDEX, CHILD_EDU_COSTS, DREAM_HOLD_MONTHS, FT_CELLS, LIFE_EVENT_CHANCE, RAT_CELLS, EVENT_COOLDOWN, type CellType, type EventCard, type GameState, type Player } from "@/lib/game/types";
import { canChoosePathNode, choosePathNode, reachableNodes, regeneratePath, type PathNodeType, type PathRisk } from "@/lib/game/path";
import {
  DAYS_PER_WEEK,
  PLAN_AVANS_DAY,
  PLAN_DAYS,
  WEEKS_PER_MONTH,
  executeClientDay,
  executeKnowledgeDay,
  generateBotPlan,
  planSalaryScale,
  planWorkDays,
  validatePlanWeek,
  weekStartDay,
  type PlanDay,
} from "@/lib/game/plan";
import Board from "./game/Board";
import PathBoard from "./game/PathBoard";
import PlanBoard from "./game/PlanBoard";
import NotificationsCenter from "@/components/Notifications";
import StatementPanel from "./game/StatementPanel";
import SetupScreen, { type SetupResult } from "./game/SetupScreen";
import CardModals, { type ModalHandlers, type ModalState } from "./game/CardModals";
import { ClientsCenterModal, KnowledgeCenterModal } from "./game/ActionsModals";
import {
  BankruptFinalModal,
  BankruptcyModal,
  ContinueModal,
  EndScreen,
  EscapeCeremony,
  SettingsDrawer,
} from "./game/Overlays";

type Entry = "loading" | "choice" | "setup" | "playing";

interface Toast {
  id: number;
  text: string;
  tone: "good" | "bad" | "neutral" | "gold";
}

const SPEED_FACTOR: Record<GameSettings["speed"], number> = {
  slow: 0.7,
  normal: 1.4,
  fast: 2,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* fix-10 (F1): hub ichidagi yangiliklar tickeri olib tashlandi —
   sarlavhalar endi 🔔 Bildirishnomalar markazida (F2), log esa pastki panelda qoladi. */

export default function Game() {
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry>("loading");
  const [pendingSave, setPendingSave] = useState<GameState | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [escapeOverlay, setEscapeOverlay] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [bankFinal, setBankFinal] = useState(false);
  const [forcedSellMode, setForcedSellMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const settingsRef = useRef(settings);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flashCells, setFlashCells] = useState<Set<number>>(new Set());
  const [bubble, setBubble] = useState<{ playerId: number; icon: "roll" | "coins" | "buy" } | null>(null);
  const [banner, setBanner] = useState<{ text: string; color: string } | null>(null);
  const [displayCells, setDisplayCells] = useState<Record<number, number>>({});
  const [rolling, setRolling] = useState(false);
  const [shake, setShake] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rollChip, setRollChip] = useState<number | null>(null);
  /** fix-9: Bilim olish / Mijoz topish markazlari */
  const [actionsModal, setActionsModal] = useState<"knowledge" | "clients" | null>(null);
  /** fix-13b (M1): Moliyaviy ustoz — navbatdagi dars kartasi (bir vaqtda max 1) */
  const [mentorCard, setMentorCard] = useState<Lesson | null>(null);
  const mentorQueueRef = useRef<Lesson[]>([]);
  const mentorCardRef = useRef<Lesson | null>(null);

  const genRef = useRef(0);
  const awaiterRef = useRef<(() => void) | null>(null);
  /** C2: profil yozuvi bir marta yozilsin */
  const recordedRef = useRef(false);
  const toastId = useRef(0);

  /* ---------- helpers ---------- */

  const mutate = (fn: (s: GameState) => void) => {
    const prev = stateRef.current;
    if (!prev) return;
    const c = structuredClone(prev);
    fn(c);
    stateRef.current = c;
    setState(c);
  };

  const wait = (ms: number) =>
    new Promise<void>((r) => setTimeout(r, ms / SPEED_FACTOR[settingsRef.current.speed]));

  const waitForUser = () =>
    new Promise<void>((res) => {
      awaiterRef.current = res;
    });

  const userDone = () => {
    awaiterRef.current?.();
    awaiterRef.current = null;
  };

  const pushToast = (text: string, tone: Toast["tone"] = "neutral") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  /* fix-13b (M1): mentor kartasi navbati — keyingi darsni ko'rsatish */
  const showNextMentor = () => {
    const next = mentorQueueRef.current.shift() ?? null;
    mentorCardRef.current = next;
    setMentorCard(next);
  };

  /** fix-13b (M1): harakatdan keyin mentor tekshiruvi (faqat inson o'yinchiga). */
  const mentorCtx = (ctx: MentorContext) => {
    let fired: Lesson[] = [];
    mutate((st) => {
      const cur = st.players[st.current];
      if (!cur || cur.isBot || st.spectating || cur.bankrupt) return;
      fired = checkMentor(st, cur, ctx);
    });
    if (fired.length > 0) {
      recordLessons(fired.map((l) => l.id));
      mentorQueueRef.current.push(...fired);
      if (mentorCardRef.current === null) showNextMentor();
    }
  };

  const flashCell = (i: number) => {
    setFlashCells((s) => new Set(s).add(i));
    setTimeout(() => {
      setFlashCells((s) => {
        const n = new Set(s);
        n.delete(i);
        return n;
      });
    }, 550);
  };

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

  /* ---------- entry: save detection ---------- */

  useEffect(() => {
    const save = loadSave();
    if (save && save.phase !== "game-over" && save.screen !== "end") {
      setPendingSave(save);
      setEntry("choice");
    } else {
      setEntry("setup");
    }
  }, []);

  /* autosave after every resolved turn (game.md §1) */
  useEffect(() => {
    if (state && entry === "playing" && state.screen !== "end") saveGame(state);
  }, [state, entry]);

  /* sync displayed token cells when idle */
  useEffect(() => {
    if (!state) return;
    if (state.phase === "moving" || state.phase === "rolling") return;
    setDisplayCells((dc) => {
      const next = { ...dc };
      for (const p of state.players) next[p.id] = p.escaped ? p.ftPosition : p.position;
      return next;
    });
  }, [state]);

  /* ---------- game lifecycle ---------- */

  const startNewGame = (setup: SetupResult) => {
    // fix-15 (P2): qo'lda qiyinlik override — boshlang'ich shartlar moslashtiriladi
    const diffMods =
      setup.difficultyManual && setup.difficulty === "easy"
        ? { startCashMult: 1.3 }
        : setup.difficultyManual && setup.difficulty === "hard"
          ? { startCashMult: 0.8, salaryMult: 0.95 }
          : {};
    // fix-13c (Q1): tez rejim — boshlang'ich naqd ×1,5
    const cashMult = setup.mode === "tez" ? TEZ_CASH_MULT : 1;
    const human = makePlayer(0, setup.playerName, setup.profession, {
      isBot: false,
      personality: null,
      colorIndex: 0,
      dreamId: setup.dream.id,
      heroId: setup.heroId,
      customField: setup.customField,
      quadrant: setup.quadrant,
      difficulty: setup.difficulty,
      ...diffMods,
      cashMult,
    });
    const botQuadrants: Quadrant[] = ["E", "S", "B", "I"];
    const bots = setup.bots.map((b, i) =>
      makePlayer(i + 1, b.name, b.profession, {
        isBot: true,
        personality: b.personality,
        colorIndex: ((i + 1) % 4) as 0 | 1 | 2 | 3,
        dreamId: DREAMS[(i + 1) % DREAMS.length].id,
        heroId: b.heroId,
        quadrant: botQuadrants[Math.floor(Math.random() * botQuadrants.length)],
        cashMult,
      })
    );
    const s = makeGame([human, ...bots], setup.boardMode ?? "classic", setup.mode);
    if (setup.mode === "tez") {
      addLog(s, "rocket", "⚡ Tez rejim: 2 zar, boshlang'ich naqd ×1,5, erkinlik uchun 1 oy streak.", "gold");
    }
    addLog(s, "rocket", `O'yin boshlandi — omad!`, "gold");
    genRef.current++;
    recordedRef.current = false;
    mentorQueueRef.current = [];
    mentorCardRef.current = null;
    setMentorCard(null);
    stateRef.current = s;
    setState(s);
    setDisplayCells(Object.fromEntries(s.players.map((p) => [p.id, 0])));
    setEntry("playing");
    const gen = genRef.current;
    setTimeout(() => {
      if (gen === genRef.current) void beginTurn();
    }, 1500);
  };

  const resumeGame = (save: GameState) => {
    const s = structuredClone(save);
    s.phase = "idle";
    // fix-17/18: ijro jarayonida saqlangan reja — joriy hafta qayta rejalashtiriladi
    if (s.boardMode === "plan" && s.plan && s.plan.executing >= 0) {
      const cur = s.players[s.current];
      const wIdx = Math.min(3, cur.planWeekIdx ?? 0);
      const wStart = wIdx * 5;
      const days = s.plan.days[cur.id];
      if (days) {
        // o'tgan haftalarning bajarilgan kunlari saqlanadi, joriy hafta tozalanadi
        for (let i = wStart; i < Math.min(days.length, wStart + 5); i++) {
          days[i] = { tile: null, done: false };
        }
        cur.planSalaryScale = planWorkDays(days) / 20;
      } else {
        cur.planSalaryScale = 1;
      }
      s.plan.executing = -1;
    }
    genRef.current++;
    stateRef.current = s;
    setState(s);
    setDisplayCells(
      Object.fromEntries(s.players.map((p) => [p.id, p.escaped ? p.ftPosition : p.position]))
    );
    setEntry("playing");
    const gen = genRef.current;
    setTimeout(() => {
      if (gen === genRef.current) void beginTurn();
    }, 800);
  };

  const resetToSetup = () => {
    genRef.current++;
    awaiterRef.current = null;
    recordedRef.current = false;
    mentorQueueRef.current = [];
    mentorCardRef.current = null;
    setMentorCard(null);
    clearSave();
    setState(null);
    stateRef.current = null;
    setModal(null);
    setEscapeOverlay(false);
    setBankModal(false);
    setBankFinal(false);
    setForcedSellMode(false);
    setPendingSave(null);
    setEntry("setup");
  };

  const endGame = (variant: GameState["endVariant"], winnerId: number | null, winPath: GameState["winPath"] = null) => {
    genRef.current++;
    mutate((st) => {
      st.endVariant = variant;
      st.winnerId = winnerId;
      st.winPath = winPath;
      st.screen = "end";
      st.phase = "game-over";
    });
    clearSave();
    // C2: inson o'yinchining natijasini profilga yozish (bir marta)
    const s = stateRef.current;
    const humanPl = s?.players.find((p) => !p.isBot);
    if (s && humanPl && !recordedRef.current) {
      recordedRef.current = true;
      recordGame(buildRecord(s, humanPl));
    }
    if (variant === "win") {
      recordWin();
      vibrate(settingsRef.current, 60);
    }
  };

  /* ---------- turn machine ---------- */

  const currentPlayer = (): Player | null => {
    const s = stateRef.current;
    return s ? s.players[s.current] : null;
  };

  /** Hodisa chizish: cooldown (oxirgi EVENT_COOLDOWN) + eligibility filtri. */
  const drawEventCard = (p: Player): EventCard => {
    return pick(eligibleEvents(p, stateRef.current?.recentEvents ?? []));
  };

  /** Hodisa natija probe'i: real birja narxlarini qo'ymasdan matn olish uchun klonlangan state. */
  const probeGame = (): GameState => {
    const s = stateRef.current!;
    return { ...s, exchange: structuredClone(s.exchange) };
  };

  /** Meros-investitsiya kabi dilemma: natija modalidan keyin bozor taklifi ochiladi. */
  const pendingMarketRef = useRef(false);

  const beginTurn = async () => {
    const gen = genRef.current;
    const s = stateRef.current;
    if (!s || s.phase === "game-over") return;
    const p = s.players[s.current];
    if (p.bankrupt) return endTurnAndNext(gen);
    setBanner({
      text: p.isBot || s.spectating ? g.turn.botTurn(p.name) : g.turn.yourTurn,
      color: PLAYER_COLORS[p.colorIndex],
    });
    setTimeout(() => setBanner(null), 2600);

    if (p.skipTurns > 0) {
      mutate((st) => {
        st.players[st.current].skipTurns -= 1;
        addLog(st, "work", g.turn.skipped(p.name), "bad");
      });
      pushToast(g.turn.skipped(p.name), "bad");
      await wait(1100);
      if (gen !== genRef.current) return;
      return endTurnAndNext(gen);
    }

    if (p.isBot || s.spectating) {
      await wait(700);
      if (gen !== genRef.current) return;
      return botTurn(gen);
    }
    // fix-15 (P4): farzand 3/7 yoshga to'lgan — ta'lim tanlovi modali navbat boshida
    if (p.pendingChildEvent) {
      setModal({ kind: "child-edu" });
      return;
    }
    // fix-16: yo'l xaritasi tugagan bo'lsa — yangi xarita generatsiya qilinadi
    if (s.boardMode === "path" && s.path && !p.escaped) {
      const pos = s.path.positions[p.id] ?? { layer: -1, node: 0 };
      if (reachableNodes(s.path, pos).length === 0) {
        mutate((st) => {
          regeneratePath(st.path!);
        });
      }
    }
    mutate((st) => {
      st.phase = "idle";
    });
  };

  /** fix-16: Oy kun to'lovi + oy yakunlash — klassik katak va yo'l xaritasi payday tuguni uchun umumiy. */
  const runPaydayCell = (fast: boolean, pid: number): void => {
        // compute via probe for toast text
        const probe = structuredClone(stateRef.current!.players[stateRef.current!.current]);
        const curNews = stateRef.current!.news;
        const curExchange = stateRef.current!.exchange;
        const paydayRes = fast ? null : applyPayday(probe, curNews, curExchange, stateRef.current!.month);
        const amount = fast ? applyFTPayday(probe, stateRef.current!.month) : paydayRes!.amount;
        // logga yoziladigan eslatmalar: 🎉 kredit yopildi, 📊 reyting, ⚠️ penya, 💼 ishsizlik
        const closedNotes = (paydayRes?.notes ?? []).filter((n) => /^[🎉📊⚠️💼]/u.test(n));
        // avans olingan oyda maosh 70% ga qisqaradi (A1)
        const avansNote = (paydayRes?.notes ?? []).find((n) => n.startsWith("Ish haqi (avans ayirilgan)"));
        let deferredReturns: { playerName: string; amount: number }[] = [];
        let indexedList: { playerName: string; newSalary: number }[] = [];
        let riskEvents: { playerName: string; assetTitle: string; kind: "yomon" | "inqiroz"; reason?: string }[] = [];
        mutate((st) => {
          const pl = st.players[st.current];
          if (fast) {
            applyFTPayday(pl, st.month);
            addLog(st, "coins", `${pl.name}: ${g.ft.payday("+" + formatUZSCompact(amount))}`, "gold");
            notify(st, {
              icon: "💰",
              title: g.notif.payday,
              body: `${pl.name}: ${g.ft.payday("+" + formatUZSCompact(amount))}`,
              tone: "gold",
            });
            // C3: orzu saqlash xarajati / sof daromadi log'ga yoziladi
            if (pl.dreamBought) {
              const held = DREAMS.find((d) => d.id === pl.dreamId);
              if (held) {
                const net = dreamMonthlyNet(held);
                if (net > 0) {
                  addLog(st, "coins", `${pl.name}: ${g.ft.dreamUpkeepLog(held.title, formatUZSCompact(net))}`, "bad");
                  notify(st, { icon: "✨", title: g.notif.dream, body: `${pl.name}: ${g.ft.dreamUpkeepLog(held.title, formatUZSCompact(net))}`, tone: "bad" });
                } else if (net < 0) {
                  addLog(st, "coins", `${pl.name}: ${g.ft.dreamIncomeLog(held.title, formatUZSCompact(-net))}`, "good");
                  notify(st, { icon: "✨", title: g.notif.dream, body: `${pl.name}: ${g.ft.dreamIncomeLog(held.title, formatUZSCompact(-net))}`, tone: "good" });
                }
              }
            }
          } else {
            const div = portfolioDividends(pl, st.exchange);
            applyPayday(pl, st.news, st.exchange, st.month);
            const monthRes = completeMonth(st); // 🗓 0-katakdan o'tish = oy tugadi
            deferredReturns = monthRes.deferred;
            indexedList = monthRes.indexed;
            riskEvents = monthRes.risk;
            addLog(
              st,
              "coins",
              `${pl.name}: ${amount >= 0 ? g.payday.toast("+" + formatUZSCompact(amount)) : g.payday.negative("−" + formatUZSCompact(-amount))}`,
              amount >= 0 ? "good" : "bad"
            );
            notify(st, {
              icon: "💰",
              title: g.notif.payday,
              body: `${pl.name}: ${amount >= 0 ? g.payday.toast("+" + formatUZSCompact(amount)) : g.payday.negative("−" + formatUZSCompact(-amount))}`,
              tone: amount >= 0 ? "good" : "bad",
            });
            if (avansNote) {
              addLog(st, "coins", `${pl.name}: ${avansNote}`, "neutral");
              notify(st, { icon: "💸", title: g.notif.avans, body: `${pl.name}: ${avansNote}` });
            }
            for (const note of closedNotes) {
              const tone = note.startsWith("⚠️") ? "bad" : note.startsWith("📊") ? "neutral" : "gold";
              addLog(st, note.startsWith("📊") ? "work" : "rocket", `${pl.name}: ${note}`, tone);
              // 🎉 kredit yopildi — bildirishnomaga ham
              if (note.startsWith("🎉"))
                notify(st, { icon: "🎉", title: g.notif.loanClosed, body: `${pl.name}: ${note.slice(2).trim()}`, tone: "gold" });
            }
            if (div > 0) {
              addLog(st, "coins", `${pl.name}: ${g.exchange.dividendsLog(formatUZSCompact(div))}`, "gold");
            }
            // birja: narxlar har oy kunida harakatlanadi; botlar savdo qiladi
            tickExchangePrices(st);
            if (pl.isBot || st.spectating) botTradeExchange(pl, st);
          }
        });
        // Payday natijalarini bitta jamlanma toastga yig'ish (#10)
        const summaryLines: string[] = [];
        const hasBadEvent =
          deferredReturns.length > 0 ||
          riskEvents.length > 0 ||
          closedNotes.some((n) => n.startsWith("⚠️")) ||
          amount < 0;
        summaryLines.push(
          amount >= 0
            ? fast
              ? g.ft.payday("+" + formatUZSCompact(amount))
              : g.payday.toast("+" + formatUZSCompact(amount))
            : g.payday.negative("−" + formatUZSCompact(-amount))
        );
        if (!fast) summaryLines.push(g.calendar.monthEnded);
        if (avansNote) summaryLines.push(avansNote);
        for (const dr of deferredReturns) summaryLines.push(`${dr.playerName}: ${g.toasts.deferReturned(formatUZSCompact(dr.amount))}`);
        for (const ix of indexedList) summaryLines.push(g.toasts.salaryIndexed(ix.playerName, formatUZSCompact(ix.newSalary)));
        for (const rv of riskEvents) {
          summaryLines.push(
            rv.kind === "yomon"
              ? `⚠️ ${rv.playerName} — ${rv.assetTitle}: bu oy tushum bo'lmadi (${rv.reason})`
              : `🚨 ${rv.playerName} — ${rv.assetTitle}: inqiroz! Daromad 3 oyga yarmiga tushdi`
          );
        }
        for (const note of closedNotes) {
          if (note.startsWith("📊") || note.startsWith("💼")) continue; // faqat jurnalga
          summaryLines.push(note);
        }
        pushToast(summaryLines.join(" • "), hasBadEvent ? "bad" : fast ? "gold" : "good");
        // fix-13b (M1): Moliyaviy ustoz — oy kuni + oy yakuni darslari
        if (!fast) {
          const wasPenya = closedNotes.some((n) => n.startsWith("⚠️"));
          const plName = stateRef.current!.players[stateRef.current!.current].name;
          mentorCtx({ kind: "payday", penya: wasPenya, indexed: indexedList.some((i) => i.playerName === plName) });
          mentorCtx({ kind: "month" });
        }
    if (!fast) setBubble({ playerId: pid, icon: "coins" });
    setTimeout(() => setBubble(null), 900);
  };

  /** fix-16: Hayotiy hodisa (12%) — Oy kun / payday tugunidan keyin (asosiy aylanada). false = bekor qilindi. */
  const maybeLifeEvent = async (gen: number, p0: Player): Promise<boolean> => {
    const s0 = stateRef.current!;
    if (Math.random() < LIFE_EVENT_CHANCE) {

      if (gen !== genRef.current) return false;
      const card = pick(eligibleLifeEvents(stateRef.current!.players[stateRef.current!.current]));
      const probe = structuredClone(stateRef.current!.players[stateRef.current!.current]);
      const result = applyLifeEvent(probe, card);
      const isBotP = p0.isBot || s0.spectating;
      mutate((st) => {
        const pl = st.players[st.current];
        applyLifeEvent(pl, card);
        addLog(st, "sparkles", `${pl.name}: ${g.lifeEvent.title} — ${card.title} — ${result}`, "gold");
      });
      if (isBotP) {
        await botCard(gen, g.lifeEvent.title, [`${p0.name}: ${card.title}`, result], "sparkles", "gold");
      } else {
        setModal({ kind: "life-event", card, result });
        await waitForUser();
      }
      if (gen !== genRef.current) return false;
    }
    return true;
  };

  /** Shared roll + hop-by-hop movement with payday triggers. Returns false if cancelled. */
  const rollAndMove = async (gen: number): Promise<boolean> => {
    const s0 = stateRef.current;
    if (!s0) return false;
    const p0 = s0.players[s0.current];
    const fast = p0.escaped;
    // fix-13c (Q1): tez rejimda har doim 2 zar (faqat klassik doskada — yo'l xaritasida zar yo'q)
    const count: 1 | 2 =
      p0.charityTurns > 0 || (s0.mode === "tez" && s0.boardMode === "classic") ? 2 : 1;
    const dice = rollDice(count);
    mutate((st) => {
      st.phase = "rolling";
      st.dice = dice;
      st.diceCount = count;
    });
    setRolling(true);
    await wait(950);
    if (gen !== genRef.current) return false;
    setRolling(false);
    setShake(true);
    setTimeout(() => setShake(false), 160);
    vibrate(settingsRef.current);
    const total = diceTotal(dice, count);
    setRollChip(total);
    setTimeout(() => setRollChip(null), 1100);

    const size = fast ? FT_CELLS.length : RAT_CELLS.length;
    const from = fast ? p0.ftPosition : p0.position;
    const path = movePath(from, total, size);
    mutate((st) => {
      st.phase = "moving";
    });

    let hitPayday = false;
    for (const cell of path) {
      const pid = p0.id;
      setDisplayCells((dc) => ({ ...dc, [pid]: cell }));
      flashCell(cell);
      await wait(320);
      if (gen !== genRef.current) return false;
      const isPayday = fast ? cell === 0 : RAT_CELLS[cell] === "payday";
      if (isPayday) {
        if (!fast) hitPayday = true;
        runPaydayCell(fast, pid);
      }
    }

    const last = path[path.length - 1];
    mutate((st) => {
      const pl = st.players[st.current];
      if (fast) pl.ftPosition = last;
      else pl.position = last;
      st.phase = "resolving";
    });

    // Hayotiy hodisa: 12% chance after each Oy kun (asosiy aylanada)
    if (!fast && hitPayday) {
      if (!(await maybeLifeEvent(gen, p0))) return false;
    }
    return true;
  };

  /* ---------- human cell resolution (modals) ---------- */

  /** fix-16 (X1): yo'l xaritasi tugun turi → klassik katak turi (xarita-only turlar o'zicha). */
  type LandCell = CellType | "exchange" | "rest";
  interface PathLand {
    cell: LandCell;
    risk: PathRisk;
  }

  /** fix-16: tugun turi → mavjud katak-rezolyutsiya trubkasi mapping'i. */
  const nodeCell = (t: PathNodeType): LandCell =>
    t === "deal" ? "opportunity" : t === "payday" ? "payday" : t;

  /** fix-16: xavf darajasiga ko'ra doodad kolodasi (riskli = qimmatroq, safe = arzonroq). */
  const doodadPoolByRisk = (risk: PathRisk | undefined): typeof DOODAD_CARDS => {
    if (!risk || risk === "mid") return DOODAD_CARDS;
    const sorted = [...DOODAD_CARDS].sort((a, b) => a.cost - b.cost);
    const half = Math.ceil(sorted.length / 2);
    return risk === "risky" ? sorted.slice(sorted.length - half) : sorted.slice(0, half);
  };

  const resolveHumanCell = async (gen: number, land?: PathLand): Promise<void> => {
    const s = stateRef.current!;
    const p = s.players[s.current];
    if (!p.escaped) {
      const cell: LandCell = land?.cell ?? RAT_CELLS[p.position];
      switch (cell) {
        // fix-16: xarita-only tugunlar
        case "rest": {
          mutate((st) => {
            addLog(st, "sparkles", `${p.name}: ${g.path.rest}`, "neutral");
          });
          pushToast(g.path.rest, "neutral");
          break;
        }
        case "exchange": {
          // birja oynasi ochiladi (bloklamaydi — yopilgach navbat yakunlanadi)
          pushToast(g.path.exchangeBody, "neutral");
          setModal({ kind: "exchange" });
          break;
        }
        case "payday":
          return; // already paid during movement
        case "avans": {
          // modalsiz: maoshning 30%-i naqd, log + toast
          const src = g.avans.source[p.quadrant] ?? g.avans.source.E;
          const amount = applyAvans(structuredClone(p));
          const text =
            amount > 0
              ? g.avans.received(formatUZSCompact(amount), src)
              : effectiveSalary(p) > 0
                ? g.avans.eatenByLoans
                : g.avans.unemployed;
          mutate((st) => {
            const pl = st.players[st.current];
            applyAvans(pl);
            addLog(st, "coins", `${pl.name}: ${text}`, amount > 0 ? "gold" : "neutral");
            notify(st, { icon: "💸", title: g.notif.avans, body: `${pl.name}: ${text}`, tone: amount > 0 ? "gold" : "neutral" });
          });
          pushToast(text, amount > 0 ? "gold" : "neutral");
          if (amount > 0) mentorCtx({ kind: "avans" });
          break;
        }
        case "opportunity": {
          // fix-16 + #13: o'yinchi o'zi katta/kichik bitimni tanlaydi (avtomatik emas)
          setModal({ kind: "deal-pick" });
          await waitForUser();
          break;
        }
        case "market": {
          const card = pick(MARKET_CARDS);
          const targets = p.assets.filter((a) => a.kind === card.kind);
          const target = targets.sort((a, b) => b.price - a.price)[0] ?? null;
          const offer = target ? marketOffer(p, target, card) : 0;
          setModal({ kind: "market", card, target, offer });
          await waitForUser();
          break;
        }
        case "event": {
          const card = drawEventCard(p);
          if (card.effect.type === "migration") {
            setModal({ kind: "migration", card });
          } else if (card.choices) {
            pendingMarketRef.current = false;
            setModal({ kind: "dilemma", card });
          } else {
            const probe = structuredClone(p);
            const result = applyEvent(probe, card, probeGame());
            mutate((st) => {
              const pl = st.players[st.current];
              applyEvent(pl, card, st);
              st.recentEvents.push(card.id);
              if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
              addLog(st, "event", `${pl.name}: ${card.title} — ${result}`, card.effect.type === "cash" && card.effect.amount > 0 ? "good" : "neutral");
              notify(st, {
                icon: "🎲",
                title: g.notif.event,
                body: `${pl.name}: ${card.title} — ${result}`,
                tone: card.effect.type === "cash" && card.effect.amount > 0 ? "good" : "neutral",
              });
            });
            setModal({ kind: "event", card, result });
          }
          await waitForUser();
          break;
        }
        case "charity": {
          if (p.charityBlockedTurns > 0) {
            const note = g.charity.blocked(p.charityBlockedTurns);
            mutate((st) => {
              addLog(st, "event", `${p.name}: ${note}`, "neutral");
            });
            pushToast(note, "neutral");
            break;
          }
          const donation = Math.round(p.salary * 0.1);
          setModal({ kind: "charity", donation });
          await waitForUser();
          break;
        }
        case "doodad": {
          const card = pick(doodadPoolByRisk(land?.risk));
          setModal({ kind: "doodad", card });
          await waitForUser();
          break;
        }
        case "baby": {
          const probe = structuredClone(p);
          const result = applyBaby(probe, s.month);
          // fix-15 (P3): farzand oraliq 2 yildan kam — hodisa o'tkaziladi (modalsiz)
          if (result.kind === "gap") {
            mutate((st) => {
              addLog(st, "baby", `${p.name}: ${g.baby.gapBody}`, "neutral");
            });
            pushToast(g.baby.gapBody, "neutral");
            break;
          }
          mutate((st) => {
            const pl = st.players[st.current];
            applyBaby(pl, st.month);
            addLog(
              st,
              "baby",
              result.kind === "baby"
                ? `${pl.name}: ${g.baby.body} (+${formatUZSCompact(result.cost)}/oy)`
                : `${pl.name}: ${g.baby.feast} (−${formatUZSCompact(result.cost)})`,
              "bad"
            );
          });
          setModal({ kind: "baby", result });
          if (result.kind === "baby") mentorCtx({ kind: "baby" });
          await waitForUser();
          break;
        }
        case "downsized": {
          // faqat E kvadranti (yollanma xodim) ishdan bo'shatiladi
          if (p.quadrant !== "E") {
            mutate((st) => {
              const pl = st.players[st.current];
              addLog(st, "work", `${pl.name}: ${g.downsized.immune}`, "neutral");
            });
            pushToast(g.downsized.immune, "neutral");
            break;
          }
          const amount = totalExpenses(p);
          mutate((st) => {
            const pl = st.players[st.current];
            applyDownsized(pl);
            addLog(st, "work", `${pl.name}: ${g.downsized.title} (−${formatUZSCompact(amount)})`, "bad");
          });
          setModal({ kind: "downsized", amount });
          mentorCtx({ kind: "downsized" });
          await waitForUser();
          break;
        }
        case "weekend": {
          // 30% ehtimol: tanlov kolodasi o'rniga avtomatik uy xarajati (modalsiz)
          const hexp = rollHomeExpense();
          if (hexp) {
            const text = g.homeExpense.log(hexp.title, formatUZSCompact(hexp.amount));
            mutate((st) => {
              const pl = st.players[st.current];
              applyHomeExpense(pl, hexp);
              addLog(st, "event", `${pl.name}: ${text}`, "bad");
            });
            pushToast(text, "bad");
            break;
          }
          const card = pick(WEEKEND_CARDS);
          setModal({ kind: "weekend", card });
          await waitForUser();
          break;
        }
      }
    } else {
      const cell = FT_CELLS[p.ftPosition];
      switch (cell) {
        case "bonus": {
          const amount = ftMonthlyIncome(p, s.news);
          mutate((st) => {
            const pl = st.players[st.current];
            applyFTBonus(pl);
            addLog(st, "coins", `${pl.name}: ${g.ft.bonus("+" + formatUZSCompact(amount))}`, "gold");
          });
          setModal({ kind: "ft-info", title: g.cells.bonus, body: g.ft.bonus("+" + formatUZSCompact(amount)), tone: "gold" });
          await waitForUser();
          break;
        }
        case "audit": {
          const amount = Math.round(Math.max(0, p.cash) * 0.1);
          mutate((st) => {
            const pl = st.players[st.current];
            applyFTAudit(pl);
            addLog(st, "work", `${pl.name}: ${g.ft.audit(formatUZSCompact(amount))}`, "bad");
          });
          setModal({ kind: "ft-info", title: g.cells.audit, body: g.ft.audit(formatUZSCompact(amount)), tone: "slate" });
          await waitForUser();
          break;
        }
        case "business": {
          const deal = pick(FT_DEALS);
          setModal({ kind: "ft-deal", deal });
          await waitForUser();
          break;
        }
        case "dream": {
          const dream = DREAMS.find((d) => d.id === p.dreamId)!;
          if (p.dreamBought) {
            // orzu allaqachon olingan — faqat ushlab turish jarayonini ko'rsatamiz
            setModal({
              kind: "ft-info",
              title: g.cells.dream,
              body: g.ft.dreamHoldProgress(p.dreamHeldMonths, DREAM_HOLD_MONTHS),
              tone: "gold",
            });
          } else {
            setModal({ kind: "ft-dream", dream });
          }
          await waitForUser();
          break;
        }
        case "charity": {
          const donation = Math.round(Math.max(0, p.cash) * 0.1);
          setModal({ kind: "ft-charity", amount: donation });
          await waitForUser();
          break;
        }
      }
    }
    if (gen !== genRef.current) return;
  };

  /* ---------- escape / bankruptcy after resolution ---------- */

  const afterResolution = async (gen: number): Promise<void> => {
    let s = stateRef.current!;
    let p = s.players[s.current];

    // escape check (birja dividendlari ham passiv daromadga kiradi)
    if (canEscape(p, s.news, s.exchange, s.mode)) {
      if (!p.isBot && !s.spectating) {
        mutate((st) => {
          const pl = st.players[st.current];
          pl.escaped = true;
          pl.escapeTurn = st.round;
          addLog(st, "rocket", `${pl.name} ${g.escape.headline}`, "gold");
        });
        recordEscape(stateRef.current!.round);
        mentorCtx({ kind: "escape" });
        setEscapeOverlay(true);
        await waitForUser(); // CTA switches screen to fasttrack
        if (gen !== genRef.current) return;
      } else {
        mutate((st) => {
          const pl = st.players[st.current];
          pl.escaped = true;
          pl.escapeTurn = st.round;
          addLog(st, "rocket", g.escape.botEscaped(pl.name), "gold");
        });
        pushToast(g.escape.botEscaped(p.name), "gold");
        await wait(1300);
        if (gen !== genRef.current) return;
      }
    }

    // bankruptcy check
    s = stateRef.current!;
    p = s.players[s.current];
    if (p.cash < 0 && !p.bankrupt) {
      if (!p.isBot && !s.spectating) {
        while (true) {
          const cur = stateRef.current!.players[stateRef.current!.current];
          if (cur.cash >= 0) break;
          if (cur.assets.length === 0 && cur.usedEmergencyLoan) {
            mutate((st) => {
              const pl = st.players[st.current];
              pl.bankrupt = true;
              adjustCreditScore(pl, SCORE_BANKRUPTCY);
              addLog(st, "work", g.bankruptcy.botBankrupt(pl.name), "bad");
              addLog(st, "work", `${pl.name}: ${g.credit.logBankruptcy}`, "bad");
            });
            // C2: bankrotlik — yangi o'yin boshlasa ham profilga yoziladi
            if (!recordedRef.current) {
              recordedRef.current = true;
              const fresh = stateRef.current!;
              recordGame(buildRecord(fresh, fresh.players[fresh.current]));
            }
            setBankFinal(true);
            await waitForUser(); // spectate or new game
            return;
          }
          setBankModal(true);
          await waitForUser(); // sell-mode or loan handlers resolve
          if (gen !== genRef.current) return;
        }
      } else {
        mutate((st) => {
          const pl = st.players[st.current];
          botRescue(pl, st);
          if (pl.cash < 0) {
            pl.bankrupt = true;
            adjustCreditScore(pl, SCORE_BANKRUPTCY);
            addLog(st, "work", g.bankruptcy.botBankrupt(pl.name), "bad");
            addLog(st, "work", `${pl.name}: ${g.credit.logBankruptcy}`, "bad");
          } else {
            addLog(st, "work", `${pl.name} qiyin ahvoldan chiqdi`, "neutral");
          }
        });
        const now = stateRef.current!.players[stateRef.current!.current];
        if (now.bankrupt) pushToast(g.bankruptcy.botBankrupt(now.name), "bad");
        await wait(800);
        if (gen !== genRef.current) return;
      }
    }
  };

  const endTurnAndNext = async (gen: number) => {
    let drawn: string | null = null;
    mutate((st) => {
      const cur = st.players[st.current];
      // B2: bot menejer yollaydi — S kvadrantda naqd zaxirasi yetarli bo'lsa
      if (cur.isBot && !cur.bankrupt && !cur.escaped && cur.quadrant === "S" && !cur.hasManager) {
        const cost = managerCost(cur);
        if (cur.cash >= cost * 2 && hireManager(cur)) {
          addLog(st, "work", `${cur.name}: menejer yollandi (−${formatUZSCompact(cost)})`, "good");
          const adv = maybeAdvanceQuadrant(cur, st.exchange);
          if (adv) {
            addLog(st, "rocket", `${cur.name}: ${g.statement.quadrantAdvanced(adv)}`, "gold");
            notify(st, { icon: "🎓", title: g.notif.quadrant, body: `${cur.name}: ${g.statement.quadrantAdvanced(adv)}`, tone: "gold" });
          }
        }
      }
      tickTurn(cur);
      const headline = tickNews(st);
      if (headline) {
        drawn = headline.text;
        addLog(st, "sparkles", g.news.drawn(headline.text), headline.pct > 0 ? "good" : "bad");
        // fix-10 (F2): bozor yangiligi — ta'sirlangan sektorlar bilan bildirishnoma
        const effect = headline.pct > 0 ? g.news.effectUp(headline.targetLabel) : g.news.effectDown(headline.targetLabel);
        const sectorsLine = headline.sectors?.length
          ? `\n${g.notif.sectors}: ${headline.sectors.map((sec) => g.notif.sectorLabels[sec] ?? sec).join(", ")}`
          : "";
        notify(st, {
          icon: "📰",
          title: g.notif.news,
          body: `${headline.text}\n${effect}${sectorsLine}`,
          tone: headline.pct > 0 ? "good" : "bad",
        });
      }
      if (st.phase !== "game-over") st.phase = "idle";
    });
    if (drawn) pushToast(g.news.drawn(drawn), "neutral");
    const s = stateRef.current;
    if (!s || s.phase === "game-over") return;
    // C3: orzu 3 oy ushlab turildi — g'alaba (shu o'yinchining navbati tugagach)
    const justPlayed = s.players[s.current];
    if (dreamHoldWin(justPlayed)) {
      endGame(justPlayed.isBot ? "bot-win" : "win", justPlayed.id, "dream");
      return;
    }
    if (activePlayers(s).length === 0) {
      endGame("bankrupt", null);
      return;
    }
    mutate((st) => advanceTurn(st));
    await wait(500);
    if (gen !== genRef.current) return;
    void beginTurn();
  };

  /** Human full turn: roll → move → resolve → after → await end-turn click. */
  const doRoll = async () => {
    const s = stateRef.current;
    if (!s || s.phase !== "idle") return;
    const p = s.players[s.current];
    if (p.isBot || s.spectating || p.bankrupt) return;
    const gen = genRef.current;
    const ok = await rollAndMove(gen);
    if (!ok || gen !== genRef.current) return;
    await resolveHumanCell(gen);
    if (gen !== genRef.current) return;
    setModal(null);
    await afterResolution(gen);
    if (gen !== genRef.current) return;
    const s2 = stateRef.current;
    if (!s2 || s2.phase === "game-over") return;
    mutate((st) => {
      if (st.phase !== "game-over") st.phase = "awaiting-end";
    });
    await waitForUser(); // "Navbatni yakunlash" button
    if (gen !== genRef.current) return;
    await endTurnAndNext(gen);
  };

  /** fix-16 (X3): yo'l xaritasi — inson tugun tanlaydi (zar o'rniga), so'ng mavjud rezolyutsiya. */
  const doPathPick = async (layer: number, nodeIdx: number) => {
    const s = stateRef.current;
    if (!s || s.phase !== "idle" || s.boardMode !== "path" || !s.path) return;
    const p = s.players[s.current];
    if (p.isBot || s.spectating || p.bankrupt) return;
    if (!canChoosePathNode(s.path, p.id, layer, nodeIdx)) return;
    const nodeData = s.path.nodes[layer]?.[nodeIdx];
    if (!nodeData) return;
    const gen = genRef.current;
    const nodeType: PathNodeType = nodeData.type;
    const nodeRisk: PathRisk = nodeData.risk;
    mutate((st) => {
      choosePathNode(st.path!, st.players[st.current].id, layer, nodeIdx);
      st.phase = "moving";
    });
    vibrate(settingsRef.current);
    await wait(700); // token bog'lovchi bo'ylab siljiydi (PathBoard spring)
    if (gen !== genRef.current) return;
    mutate((st) => {
      st.phase = "resolving";
    });
    if (nodeType === "payday") {
      runPaydayCell(false, p.id);
      if (!(await maybeLifeEvent(gen, p))) return;
    }
    await resolveHumanCell(gen, { cell: nodeCell(nodeType), risk: nodeRisk });
    if (gen !== genRef.current) return;
    setModal(null);
    await afterResolution(gen);
    if (gen !== genRef.current) return;
    const s2 = stateRef.current;
    if (!s2 || s2.phase === "game-over") return;
    mutate((st) => {
      if (st.phase !== "game-over") st.phase = "awaiting-end";
    });
    await waitForUser(); // "Navbatni yakunlash" button
    if (gen !== genRef.current) return;
    await endTurnAndNext(gen);
  };

  /* ---------- fix-17 (R6): reja rejimi — inson oqimi ---------- */

  /** Tasodifiy "Hodisa" kuni uchun katak tanlovi (kutilmaganlik elementi). */
  const planEventCell = (): LandCell => {
    const r = Math.random();
    return r < 0.45 ? "event" : r < 0.8 ? "doodad" : "market";
  };

  /**
   * Reja rejimi (fix-18, E): inson oyini HAFITALAB bajaradi — har chaqiriqda
   * faqat joriy haftaning 5 kuni ijro bo'ladi. 1–3-haftalardan keyin reja
   * holatiga qaytadi (keyingi hafta ochiladi); 4-haftada payday + navbat yakuni.
   */
  const doPlanExecute = async (days: PlanDay[]) => {
    const s = stateRef.current;
    if (!s || s.phase !== "idle" || s.boardMode !== "plan" || !s.plan) return;
    const p = s.players[s.current];
    if (p.isBot || s.spectating || p.bankrupt || p.escaped) return;
    const weekIdx = Math.min(WEEKS_PER_MONTH - 1, p.planWeekIdx ?? 0);
    if (!validatePlanWeek(days, weekIdx)) return;
    const wStart = weekStartDay(weekIdx);
    const wEnd = Math.min(PLAN_DAYS, wStart + DAYS_PER_WEEK);
    const gen = genRef.current;
    mutate((st) => {
      const pl = st.players[st.current];
      st.plan!.days[pl.id] = days.map((d) => ({ ...d, done: false }));
      st.plan!.executing = wStart;
      // maosh ish kunlariga mutanosib (o'tgan haftalar + shu hafta; completeMonth'da 1 ga tiklanadi)
      pl.planSalaryScale = planSalaryScale(days);
      st.phase = "resolving";
      addLog(
        st,
        "sparkles",
        `🗓 ${pl.name}: ${st.month}-oy, ${weekIdx + 1}-hafta bajarilmoqda (${planWorkDays(days.slice(wStart, wEnd))} ish kuni)`,
        "neutral"
      );
    });
    vibrate(settingsRef.current);
    for (let i = wStart; i < wEnd; i++) {
      if (gen !== genRef.current) return;
      const tile = stateRef.current!.plan!.days[p.id]?.[i]?.tile;
      if (!tile) break;
      mutate((st) => {
        st.plan!.executing = i;
      });
      await wait(280);
      if (gen !== genRef.current) return;
      if (tile === "work") {
        mutate((st) => {
          addLog(st, "work", `${p.name}: ${g.plan.workDay}`, "neutral");
        });
      } else if (tile === "rest") {
        mutate((st) => {
          addLog(st, "sparkles", `${p.name}: ${g.plan.restDay}`, "neutral");
        });
      } else if (tile === "knowledge") {
        let msg = "";
        mutate((st) => {
          msg = executeKnowledgeDay(st, st.players[st.current]);
        });
        pushToast(msg, "neutral");
      } else if (tile === "client") {
        let msg = "";
        mutate((st) => {
          msg = executeClientDay(st, st.players[st.current]);
        });
        pushToast(msg, "neutral");
      } else if (tile === "market") {
        // Bozor kuni — mavjud bitim kartasi modali
        await resolveHumanCell(gen, { cell: "opportunity", risk: "mid" });
        if (gen !== genRef.current) return;
        setModal(null);
      } else if (tile === "event") {
        // Hodisa kuni — tasodifiy hodisa/doodad/bozor kartasi
        await resolveHumanCell(gen, { cell: planEventCell(), risk: "mid" });
        if (gen !== genRef.current) return;
        setModal(null);
      }
      mutate((st) => {
        const d = st.plan!.days[st.players[st.current].id];
        if (d?.[i]) d[i].done = true;
      });
    }
    if (gen !== genRef.current) return;
    const lastWeek = weekIdx >= WEEKS_PER_MONTH - 1;
    mutate((st) => {
      st.plan!.executing = -1;
      if (!lastWeek) {
        // keyingi hafta ochiladi — rejalashtirish holatiga qaytish
        st.players[st.current].planWeekIdx = weekIdx + 1;
        st.phase = "idle";
        addLog(st, "sparkles", `${st.players[st.current].name}: ${weekIdx + 1}-hafta tugadi — ${weekIdx + 2}-hafta ochildi`, "good");
      }
    });
    if (!lastWeek) return; // navbat davom etadi — keyingi haftani rejalashtirish kutilmoqda
    // oy yakuni: ish haqi (ish kunlariga mutanosib) + oy tugatish mexanikasi
    runPaydayCell(false, p.id);
    if (!(await maybeLifeEvent(gen, p))) return;
    await afterResolution(gen);
    if (gen !== genRef.current) return;
    const s2 = stateRef.current;
    if (!s2 || s2.phase === "game-over") return;
    mutate((st) => {
      if (st.phase !== "game-over") st.phase = "awaiting-end";
    });
    await waitForUser(); // "Navbatni yakunlash" button
    if (gen !== genRef.current) return;
    await endTurnAndNext(gen);
  };

  /** Reja rejimi: avans tugmasi (10-kundan keyin, oyiga bir marta). fix-18: haftalik oqimda ijro orasida executing=-1 bo'ladi — bajarilgan kunlar sonidan tekshiramiz. */
  const doPlanAvans = () => {
    const s = stateRef.current;
    if (!s || s.boardMode !== "plan" || !s.plan) return;
    const p = s.players[s.current];
    if (p.isBot || s.spectating || p.bankrupt || p.escaped) return;
    if (p.avansTakenThisMonth) return;
    const doneDays = (s.plan.days[p.id] ?? []).filter((d) => d.done).length;
    if (s.plan.executing >= 0 ? s.plan.executing < PLAN_AVANS_DAY - 1 : doneDays < PLAN_AVANS_DAY) return;
    const src = g.avans.source[p.quadrant] ?? g.avans.source.E;
    const amount = applyAvans(structuredClone(p));
    const text =
      amount > 0
        ? g.avans.received(formatUZSCompact(amount), src)
        : effectiveSalary(p) > 0
          ? g.avans.eatenByLoans
          : g.avans.unemployed;
    mutate((st) => {
      const pl = st.players[st.current];
      applyAvans(pl);
      addLog(st, "coins", `${pl.name}: ${text}`, amount > 0 ? "gold" : "neutral");
      notify(st, { icon: "💸", title: g.notif.avans, body: `${pl.name}: ${text}`, tone: amount > 0 ? "gold" : "neutral" });
    });
    pushToast(text, amount > 0 ? "gold" : "neutral");
    if (amount > 0) mentorCtx({ kind: "avans" });
  };

  /* ---------- bot turn ---------- */

  const botCard = async (
    gen: number,
    title: string,
    lines: string[],
    icon: string,
    tone: "good" | "bad" | "neutral" | "gold"
  ) => {
    setModal({ kind: "bot", title, lines, icon, tone });
    await wait(1400);
    if (gen !== genRef.current) return;
    setModal(null);
    await wait(350);
  };

  const botTurn = async (gen: number) => {
    const s0 = stateRef.current!;
    const p0 = s0.players[s0.current];
    // fix-15 (P4): bot farzand ta'limi tanlovini avtomatik hal qiladi (davlat varianti)
    if (p0.pendingChildEvent) {
      mutate((st) => {
        const pl = st.players[st.current];
        autoResolveChildEvent(pl);
        addLog(st, "baby", `${pl.name}: farzandining ta'limi tanlandi (davlat varianti)`, "neutral");
      });
    }
    setBubble({ playerId: p0.id, icon: "roll" });
    await wait(600);
    if (gen !== genRef.current) return;
    // fix-17 (R7): reja rejimida bot ham reja tuzadi va 20 kunni bajaradi
    if (s0.boardMode === "plan" && !p0.escaped && s0.plan) {
      const botDays = generateBotPlan(p0);
      mutate((st) => {
        const pl = st.players[st.current];
        st.plan!.days[pl.id] = botDays;
        st.plan!.executing = 0;
        pl.planSalaryScale = planSalaryScale(botDays);
        st.phase = "resolving";
        addLog(st, "sparkles", `🗓 ${pl.name}: ${st.month}-oy rejasi bajarilmoqda (${planWorkDays(botDays)} ish kuni)`, "neutral");
      });
      setBubble(null);
      for (let i = 0; i < PLAN_DAYS; i++) {
        if (gen !== genRef.current) return;
        const tile = stateRef.current!.plan!.days[p0.id]?.[i]?.tile;
        if (!tile) break;
        mutate((st) => {
          st.plan!.executing = i;
        });
        await wait(140);
        if (gen !== genRef.current) return;
        if (tile === "knowledge") {
          mutate((st) => {
            executeKnowledgeDay(st, st.players[st.current]);
          });
        } else if (tile === "client") {
          mutate((st) => {
            executeClientDay(st, st.players[st.current]);
          });
        } else if (tile === "market") {
          const p1 = stateRef.current!.players[stateRef.current!.current];
          const size = botPickDealSize(p1);
          const deal = pick(size === "big" ? BIG_DEALS : SMALL_DEALS);
          const decision = botDealDecision(p1, deal);
          if (decision.buy) {
            const boughtMsg =
              decision.method === "installment"
                ? g.deal.boughtInstallment(p1.name, deal.title)
                : g.deal.bought(p1.name, deal.title);
            mutate((st) => {
              const pl = st.players[st.current];
              const beforeClients = pl.clients.length;
              if (decision.method === "installment") buyDealInstallment(pl, deal, st.marketIndices[deal.kind]);
              else buyDeal(pl, deal, decision.method === "loan", st.marketIndices[deal.kind]);
              addLog(st, "buy", boughtMsg, "good");
              if (decision.method === "loan") addLog(st, "work", `${pl.name}: ${g.credit.logNewLoan}`, "neutral");
              const adv = maybeAdvanceQuadrant(pl, st.exchange);
              if (adv) {
                addLog(st, "rocket", `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, "gold");
                notify(st, { icon: "🎓", title: g.notif.quadrant, body: `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, tone: "gold" });
              }
              if (pl.clients.length > beforeClients) {
                addLog(st, "buy", `${pl.name}: ${g.toasts.clientsJoined(pl.clients.length - beforeClients)}`, "good");
                notify(st, { icon: "🤝", title: g.notif.clients, body: `${pl.name}: ${g.toasts.clientsJoined(pl.clients.length - beforeClients)}`, tone: "good" });
              }
            });
            await botCard(gen, g.cells.opportunity, [boughtMsg, `+${formatUZSCompact(deal.cashflow)}/oy`], "deal", "good");
          } else {
            mutate((st) => {
              st.discarded += 1;
              addLog(st, "buy", g.deal.passed(p1.name), "neutral");
            });
          }
        } else if (tile === "event") {
          const sub = planEventCell();
          const p1 = stateRef.current!.players[stateRef.current!.current];
          if (sub === "event") {
            const card = drawEventCard(p1);
            if (card.effect.type === "migration") {
              if (botMigrationDecision(p1)) {
                const result = acceptMigration(structuredClone(p1));
                mutate((st) => {
                  acceptMigration(st.players[st.current]);
                  st.recentEvents.push(card.id);
                  if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
                  addLog(st, "event", `${p1.name}: ${card.title} — ${result}`, "good");
                });
                await botCard(gen, g.cells.event, [`${p1.name}: ${card.title}`, result], "event", "neutral");
              }
            } else if (card.choices) {
              const ci = botDilemmaChoice(p1, card);
              const ch = card.choices[ci];
              const synthetic: EventCard = { ...card, effect: ch.effect };
              const result = applyEvent(structuredClone(p1), synthetic, probeGame());
              mutate((st) => {
                applyEvent(st.players[st.current], synthetic, st);
                if (ch.effect2) applyEvent(st.players[st.current], { ...card, effect: ch.effect2! }, st);
                st.recentEvents.push(card.id);
                if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
                addLog(st, "event", `${p1.name}: ${card.title} — ${ch.label} — ${result}`, "neutral");
              });
              await botCard(gen, g.cells.event, [`${p1.name}: ${card.title}`, result], "event", "neutral");
            } else {
              const result = applyEvent(structuredClone(p1), card, probeGame());
              mutate((st) => {
                applyEvent(st.players[st.current], card, st);
                st.recentEvents.push(card.id);
                if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
                addLog(st, "event", `${p1.name}: ${card.title} — ${result}`, "neutral");
              });
              await botCard(gen, g.cells.event, [`${p1.name}: ${card.title}`, result], "event", "neutral");
            }
          } else if (sub === "doodad") {
            const card = pick(DOODAD_CARDS);
            if (!botDoodadDecline(p1, card)) {
              const dmode = botDoodadMode(p1, card);
              const result = applyDoodad(structuredClone(p1), card, dmode);
              mutate((st) => {
                applyDoodad(st.players[st.current], card, dmode);
                addLog(st, "event", `${p1.name}: ${card.title} — ${result}`, "bad");
              });
              await botCard(gen, g.cells.doodad, [`${p1.name}: ${card.title}`, result], "doodad", "bad");
            }
          } else {
            // bozor taklifi (sotish)
            const card = pick(MARKET_CARDS);
            const targets = p1.assets.filter((a) => a.kind === card.kind);
            const target = targets.sort((a, b) => b.price - a.price)[0] ?? null;
            if (target) {
              const offer = marketOffer(p1, target, card);
              mutate((st) => {
                const pl = st.players[st.current];
                sellAsset(pl, target.id, offer);
                addLog(st, "sell", `${g.market.sold(pl.name, target.title)} (+${formatUZSCompact(offer)})`, "good");
              });
              await botCard(gen, g.cells.market, [g.market.sold(p1.name, target.title), `+${formatUZSCompact(offer)}`], "market", "good");
            }
          }
        }
        if (gen !== genRef.current) return;
        mutate((st) => {
          const d = st.plan!.days[st.players[st.current].id];
          if (d?.[i]) d[i].done = true;
        });
      }
      if (gen !== genRef.current) return;
      mutate((st) => {
        st.plan!.executing = -1;
      });
      // oy yakuni: ish haqi + oy tugatish
      runPaydayCell(false, p0.id);
      if (gen !== genRef.current) return;
      await afterResolution(gen);
      if (gen !== genRef.current) return;
      if (stateRef.current?.phase === "game-over") return;
      await wait(500);
      if (gen !== genRef.current) return;
      await endTurnAndNext(gen);
      return;
    }
    // fix-16 (X4): yo'l xaritasi rejimida bot zar o'rniga tugun tanlaydi
    let pathCell: LandCell | null = null;
    let pathRisk: PathRisk | undefined;
    if (s0.boardMode === "path" && !p0.escaped && s0.path) {
      let opts = reachableNodes(s0.path, s0.path.positions[p0.id] ?? { layer: -1, node: 0 });
      if (opts.length === 0) {
        // xarita tugadi — yangisini generatsiya qilamiz
        mutate((st) => {
          regeneratePath(st.path!);
        });
        opts = reachableNodes(stateRef.current!.path!, { layer: -1, node: 0 });
      }
      if (opts.length === 0) return endTurnAndNext(gen);
      const choice = botPathChoice(p0, opts); // fix-16 (X4): shaxsiyat heuristikasi
      mutate((st) => {
        choosePathNode(st.path!, st.players[st.current].id, choice.layer, choice.node);
        st.phase = "moving";
      });
      await wait(800);
      if (gen !== genRef.current) return;
      setBubble(null);
      mutate((st) => {
        st.phase = "resolving";
      });
      if (choice.data.type === "payday") {
        runPaydayCell(false, p0.id);
        if (!(await maybeLifeEvent(gen, p0))) return;
      }
      pathCell = nodeCell(choice.data.type);
      pathRisk = choice.data.risk;
    } else {
      const ok = await rollAndMove(gen);
      setBubble(null);
      if (!ok || gen !== genRef.current) return;
    }

    const s = stateRef.current!;
    const p = s.players[s.current];
    if (!p.escaped) {
      const cell: LandCell = pathCell ?? RAT_CELLS[p.position];
      switch (cell) {
        // fix-16: xarita-only tugunlar (bot)
        case "rest": {
          mutate((st) => {
            addLog(st, "sparkles", `${p.name}: ${g.path.rest}`, "neutral");
          });
          await botCard(gen, g.setup.boardPath, [g.path.rest], "sparkles", "neutral");
          break;
        }
        case "exchange": {
          mutate((st) => {
            botTradeExchange(st.players[st.current], st);
          });
          await botCard(gen, g.path.exchangeTitle, [g.path.exchangeBody], "market", "neutral");
          break;
        }
        case "payday":
          break;
        case "avans": {
          // modalsiz: maoshning 30%-i naqd, log + toast
          const src = g.avans.source[p.quadrant] ?? g.avans.source.E;
          const amount = applyAvans(structuredClone(p));
          const text =
            amount > 0
              ? g.avans.received(formatUZSCompact(amount), src)
              : effectiveSalary(p) > 0
                ? g.avans.eatenByLoans
                : g.avans.unemployed;
          mutate((st) => {
            const pl = st.players[st.current];
            applyAvans(pl);
            addLog(st, "coins", `${pl.name}: ${text}`, amount > 0 ? "gold" : "neutral");
            notify(st, { icon: "💸", title: g.notif.avans, body: `${pl.name}: ${text}`, tone: amount > 0 ? "gold" : "neutral" });
          });
          pushToast(text, amount > 0 ? "gold" : "neutral");
          await wait(600);
          if (gen !== genRef.current) return;
          break;
        }
        case "opportunity": {
          const size = pathRisk === "risky" ? "big" : pathRisk === "safe" ? "small" : botPickDealSize(p);
          const deal = pick(size === "big" ? BIG_DEALS : SMALL_DEALS);
          const decision = botDealDecision(p, deal);
          if (decision.buy) {
            const boughtMsg =
              decision.method === "installment"
                ? g.deal.boughtInstallment(p.name, deal.title)
                : g.deal.bought(p.name, deal.title);
            mutate((st) => {
              const pl = st.players[st.current];
              const beforeClients = pl.clients.length;
              if (decision.method === "installment") buyDealInstallment(pl, deal, st.marketIndices[deal.kind]);
              else buyDeal(pl, deal, decision.method === "loan", st.marketIndices[deal.kind]);
              addLog(st, "buy", boughtMsg, "good");
              if (decision.method === "loan")
                addLog(st, "work", `${pl.name}: ${g.credit.logNewLoan}`, "neutral");
              // B1/B2: kvadrant o'tishi + yangi mijozlar
              const adv = maybeAdvanceQuadrant(pl, st.exchange);
              if (adv) {
                addLog(st, "rocket", `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, "gold");
                notify(st, { icon: "🎓", title: g.notif.quadrant, body: `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, tone: "gold" });
              }
              if (pl.clients.length > beforeClients) {
                addLog(st, "buy", `${pl.name}: ${g.toasts.clientsJoined(pl.clients.length - beforeClients)}`, "good");
                notify(st, { icon: "🤝", title: g.notif.clients, body: `${pl.name}: ${g.toasts.clientsJoined(pl.clients.length - beforeClients)}`, tone: "good" });
              }
            });
            await botCard(gen, g.cells.opportunity, [boughtMsg, `+${formatUZSCompact(deal.cashflow)}/oy`], "deal", "good");
          } else {
            mutate((st) => {
              st.discarded += 1;
              addLog(st, "buy", g.deal.passed(p.name), "neutral");
            });
          }
          break;
        }
        case "market": {
          const card = pick(MARKET_CARDS);
          const targets = p.assets.filter((a) => a.kind === card.kind);
          const target = targets.sort((a, b) => b.price - a.price)[0] ?? null;
          if (target) {
            const offer = marketOffer(p, target, card);
            mutate((st) => {
              const pl = st.players[st.current];
              sellAsset(pl, target.id, offer);
              addLog(st, "sell", `${g.market.sold(pl.name, target.title)} (+${formatUZSCompact(offer)})`, "good");
            });
            await botCard(gen, g.cells.market, [g.market.sold(p.name, target.title), `+${formatUZSCompact(offer)}`], "market", "good");
          }
          break;
        }
        case "event": {
          const card = drawEventCard(p);
          if (card.effect.type === "migration") {
            if (botMigrationDecision(p)) {
              const result = acceptMigration(structuredClone(p));
              mutate((st) => {
                acceptMigration(st.players[st.current]);
                st.recentEvents.push(card.id);
                if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
                addLog(st, "event", `${p.name}: ${card.title} — ${result}`, "good");
              });
              await botCard(gen, g.cells.event, [`${p.name}: ${card.title}`, result], "event", "neutral");
            }
          } else {
            let result: string;
            if (card.choices) {
              const ci = botDilemmaChoice(p, card);
              const ch = card.choices[ci];
              const synthetic: EventCard = { ...card, effect: ch.effect };
              result = applyEvent(structuredClone(p), synthetic, probeGame());
              mutate((st) => {
                applyEvent(st.players[st.current], synthetic, st);
                if (ch.effect2) applyEvent(st.players[st.current], { ...card, effect: ch.effect2! }, st);
                st.recentEvents.push(card.id);
                if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
                addLog(st, "event", `${p.name}: ${card.title} — ${ch.label} — ${result}`, "neutral");
              });
            } else {
              result = applyEvent(structuredClone(p), card, probeGame());
              mutate((st) => {
                applyEvent(st.players[st.current], card, st);
                st.recentEvents.push(card.id);
                if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
                addLog(st, "event", `${p.name}: ${card.title} — ${result}`, "neutral");
              });
            }
            await botCard(gen, g.cells.event, [`${p.name}: ${card.title}`, result], "event", "neutral");
          }
          break;
        }
        case "charity": {
          if (botCharityDecision(p)) {
            const donation = Math.round(p.salary * 0.1);
            mutate((st) => {
              applyCharity(st.players[st.current], true);
              addLog(st, "event", g.charity.donated(p.name), "neutral");
            });
            await botCard(gen, g.cells.charity, [g.charity.donated(p.name), `−${formatUZSCompact(donation)}`], "charity", "neutral");
          }
          break;
        }
        case "doodad": {
          const card = pick(doodadPoolByRisk(pathRisk));
          if (botDoodadDecline(p, card)) {
            const note = card.declineText ?? g.doodad.decline;
            mutate((st) => {
              addLog(st, "event", `${p.name}: ${card.title} — ${note}`, "neutral");
            });
            await botCard(gen, g.cells.doodad, [`${p.name}: ${card.title}`, note], "doodad", "neutral");
            break;
          }
          const mode = botDoodadMode(p, card);
          const result = applyDoodad(structuredClone(p), card, mode);
          mutate((st) => {
            applyDoodad(st.players[st.current], card, mode);
            addLog(st, "event", `${p.name}: ${card.title} — ${result}`, "bad");
          });
          await botCard(gen, g.cells.doodad, [`${p.name}: ${card.title}`, result], "doodad", "bad");
          break;
        }
        case "baby": {
          const result = applyBaby(structuredClone(p), stateRef.current?.month ?? 1);
          // fix-15 (P3): oraliq 2 yildan kam — jim o'tkaziladi
          if (result.kind === "gap") break;
          mutate((st) => {
            applyBaby(st.players[st.current], st.month);
            addLog(st, "baby", result.kind === "baby" ? `${p.name}: ${g.baby.body}` : `${p.name}: ${g.baby.feast}`, "neutral");
          });
          await botCard(gen, g.cells.baby, [result.kind === "baby" ? `${p.name}: ${g.baby.body}` : `${p.name}: ${g.baby.feast}`], "baby", "neutral");
          break;
        }
        case "downsized": {
          // faqat E kvadranti (yollanma xodim) ishdan bo'shatiladi
          if (p.quadrant !== "E") {
            mutate((st) => {
              addLog(st, "work", `${p.name}: ${g.downsized.immune}`, "neutral");
            });
            break;
          }
          const amount = totalExpenses(p);
          mutate((st) => {
            applyDownsized(st.players[st.current]);
            addLog(st, "work", `${p.name}: ${g.downsized.title}`, "bad");
          });
          await botCard(gen, g.cells.downsized, [`${p.name}: ${g.downsized.title}`, `−${formatUZSCompact(amount)}`], "work", "bad");
          break;
        }
        case "weekend": {
          // 30% ehtimol: avtomatik uy xarajati (modalsiz, tempni saqlaydi)
          const hexp = rollHomeExpense();
          if (hexp) {
            const text = g.homeExpense.log(hexp.title, formatUZSCompact(hexp.amount));
            mutate((st) => {
              applyHomeExpense(st.players[st.current], hexp);
              addLog(st, "event", `${p.name}: ${text}`, "bad");
            });
            pushToast(text, "bad");
            break;
          }
          const card = pick(WEEKEND_CARDS);
          const choice = botWeekendChoice(p, card);
          const result = applyWeekend(structuredClone(p), card, choice);
          mutate((st) => {
            applyWeekend(st.players[st.current], card, choice);
            addLog(st, "event", `${p.name}: ${card.title} — ${result}`, "neutral");
          });
          await botCard(gen, g.cells.weekend, [`${p.name}: ${card.title}`, result], "sparkles", "neutral");
          break;
        }
      }
    } else {
      const cell = FT_CELLS[p.ftPosition];
      switch (cell) {
        case "bonus": {
          const amount = ftMonthlyIncome(p, s.news);
          mutate((st) => {
            applyFTBonus(st.players[st.current]);
            addLog(st, "coins", `${p.name}: ${g.ft.bonus("+" + formatUZSCompact(amount))}`, "gold");
          });
          break;
        }
        case "audit": {
          const amount = Math.round(Math.max(0, p.cash) * 0.1);
          mutate((st) => {
            applyFTAudit(st.players[st.current]);
            addLog(st, "work", `${p.name}: ${g.ft.audit(formatUZSCompact(amount))}`, "bad");
          });
          await botCard(gen, g.cells.audit, [`${p.name}: ${g.cells.audit}`, `−${formatUZSCompact(amount)}`], "work", "bad");
          break;
        }
        case "business": {
          const deal = pick(FT_DEALS);
          if (botFTDealDecision(p, deal)) {
            mutate((st) => {
              const pl = st.players[st.current];
              buyFTDeal(pl, deal);
              addLog(st, "buy", `${pl.name} «${deal.title}» sotib oldi (+${formatUZSCompact(deal.cashflow)}/oy)`, "gold");
            });
            await botCard(gen, g.cells.business, [`${p.name} «${deal.title}» sotib oldi`, `+${formatUZSCompact(deal.cashflow)}/oy`], "rocket", "gold");
            const after = stateRef.current!.players[stateRef.current!.current];
            if (ftCashflowWin(after)) {
              endGame("bot-win", after.id, "cashflow");
              return;
            }
          }
          break;
        }
        case "dream": {
          const dream = DREAMS.find((d) => d.id === p.dreamId)!;
          if (!p.dreamBought && p.cash >= dream.price) {
            // C3: orzu sotib olinadi — g'alaba uchun uni 3 oy ushlab turish kerak
            mutate((st) => {
              buyDream(st.players[st.current], dream);
              addLog(st, "rocket", `${p.name} orzusini sotib oldi: ${dream.title}! (${g.ft.dreamHoldRule})`, "gold");
              notify(st, { icon: "✨", title: g.notif.dream, body: `${p.name} orzusini sotib oldi: ${dream.title}!`, tone: "gold" });
            });
            await botCard(gen, g.cells.dream, [`${p.name} orzusini sotib oldi: ${dream.title}!`, g.ft.dreamHoldRule], "rocket", "gold");
          }
          break;
        }
        case "charity": {
          const donation = Math.round(Math.max(0, p.cash) * 0.1);
          if (p.cash > donation * 5) {
            mutate((st) => {
              const pl = st.players[st.current];
              pl.cash -= donation;
              pl.charityTurns = 1;
              addLog(st, "event", g.charity.donated(pl.name), "neutral");
            });
          }
          break;
        }
      }
    }
    if (gen !== genRef.current) return;
    await afterResolution(gen);
    if (gen !== genRef.current) return;
    if (stateRef.current?.phase === "game-over") return;
    await wait(500);
    if (gen !== genRef.current) return;
    await endTurnAndNext(gen);
  };

  /* ---------- modal handlers ---------- */

  const handlers: ModalHandlers = {
    onPickDeal: (size) => {
      const deal = pick(size === "big" ? BIG_DEALS : SMALL_DEALS);
      const analyst = currentPlayer()!.analystDealsLeft > 0;
      if (analyst) {
        mutate((st) => {
          st.players[st.current].analystDealsLeft -= 1;
        });
      }
      setModal({ kind: "deal", deal, analyst });
    },
    onBuyDeal: (method) => {
      const m = modal;
      if (m?.kind !== "deal") return;
      const p = currentPlayer()!;
      // B3: bilim darajasi yetarli bo'lmasa bitim yopiq
      if (dealKnowledgeLocked(p, m.deal)) {
        pushToast(g.deal.knowledgeLocked(p.knowledge, m.deal.minKnowledge!), "bad");
        mentorCtx({ kind: "locked-deal" });
        return;
      }
      if (method === "cash" && p.cash < adjustedDown(p, m.deal)) {
        pushToast(g.toasts.notEnoughCash, "bad");
        return;
      }
      // kreditga olish: reyting ≥ 600 + aktiv garovga yaroqli bo'lishi shart
      if (method === "loan" && dealLoanGate(p, m.deal) !== null) {
        pushToast(
          dealLoanGate(p, m.deal) === "score"
            ? g.credit.scoreTooLow(p.creditScore, SCORE_DEAL_MIN)
            : g.credit.noCollateral,
          "bad"
        );
        return;
      }
      let sideToasts: string[] = [];
      let advFired = false;
      mutate((st) => {
        const pl = st.players[st.current];
        const beforeClients = pl.clients.length;
        if (method === "installment") {
          buyDealInstallment(pl, m.deal, st.marketIndices[m.deal.kind]);
          addLog(st, "buy", g.deal.boughtInstallment(pl.name, m.deal.title), "good");
        } else {
          buyDeal(pl, m.deal, method === "loan", st.marketIndices[m.deal.kind]);
          addLog(st, "buy", g.deal.bought(pl.name, m.deal.title), "good");
          if (method === "loan") addLog(st, "work", `${pl.name}: ${g.credit.logNewLoan}`, "neutral");
        }
        // B1/B2: kvadrant o'tishi + yangi mijozlar
        const adv = maybeAdvanceQuadrant(pl, st.exchange);
        if (adv) {
          advFired = true;
          addLog(st, "rocket", `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, "gold");
          notify(st, { icon: "🎓", title: g.notif.quadrant, body: `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, tone: "gold" });
          sideToasts.push(g.toasts.quadrantAdvanced(pl.name, adv));
        }
        if (pl.clients.length > beforeClients) {
          notify(st, { icon: "🤝", title: g.notif.clients, body: `${pl.name}: ${g.toasts.clientsJoined(pl.clients.length - beforeClients)}`, tone: "good" });
          sideToasts.push(g.toasts.clientsJoined(pl.clients.length - beforeClients));
        }
      });
      pushToast(g.toasts.dealSigned, "good");
      for (const t of sideToasts) pushToast(t, "gold");
      mentorCtx({ kind: "buy-asset" });
      mentorCtx({ kind: "client" });
      if (advFired) mentorCtx({ kind: "quadrant" });
      setModal(null);
      userDone();
    },
    onPassDeal: () => {
      mutate((st) => {
        st.discarded += 1;
        addLog(st, "buy", g.deal.passed(st.players[st.current].name), "neutral");
      });
      mentorCtx({ kind: "pass-deal" });
      setModal(null);
      userDone();
    },
    onSellMarket: () => {
      const m = modal;
      if (m?.kind !== "market" || !m.target) return;
      mutate((st) => {
        const pl = st.players[st.current];
        sellAsset(pl, m.target!.id, m.offer);
        addLog(st, "sell", `${g.market.sold(pl.name, m.target!.title)} (+${formatUZSCompact(m.offer)})`, "good");
      });
      mentorCtx({ kind: "sell" });
      setModal(null);
      userDone();
    },
    onCloseMarket: () => {
      setModal(null);
      userDone();
    },
    onEventDone: () => {
      if (pendingMarketRef.current) {
        // Meros — investitsiya tanlovi: natija yopilgach bozor taklifi ochiladi
        pendingMarketRef.current = false;
        const p = currentPlayer()!;
        const card = pick(MARKET_CARDS);
        const targets = p.assets.filter((a) => a.kind === card.kind);
        const target = targets.sort((a, b) => b.price - a.price)[0] ?? null;
        const offer = target ? marketOffer(p, target, card) : 0;
        setModal({ kind: "market", card, target, offer });
        return; // bozor modalining handlerlari userDone() ni chaqiradi
      }
      setModal(null);
      userDone();
    },
    onDilemma: (choice) => {
      const m = modal;
      if (m?.kind !== "dilemma" || !m.card.choices) return;
      const ch = m.card.choices[choice];
      const synthetic: EventCard = { ...m.card, effect: ch.effect };
      const probe = structuredClone(currentPlayer()!);
      const probeS = probeGame();
      const result = applyEvent(probe, synthetic, probeS);
      const result2 = ch.effect2 ? applyEvent(probe, { ...m.card, effect: ch.effect2 }, probeS) : null;
      mutate((st) => {
        const pl = st.players[st.current];
        applyEvent(pl, synthetic, st);
        if (ch.effect2) applyEvent(pl, { ...m.card, effect: ch.effect2! }, st);
        st.recentEvents.push(m.card.id);
        if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
        addLog(st, "event", `${pl.name}: ${m.card.title} — ${ch.label} — ${result}`, "neutral");
      });
      if (ch.drawMarket) pendingMarketRef.current = true;
      const full = result2 ? `${ch.resultText} — ${result}; ${result2}` : `${ch.resultText} — ${result}`;
      setModal({ kind: "event", card: m.card, result: full, lesson: ch.lessonText });
    },
    onMigration: (accept) => {
      const m = modal;
      if (accept) {
        mutate((st) => {
          const pl = st.players[st.current];
          acceptMigration(pl);
          addLog(st, "event", `${pl.name}: ${g.event.accept} — +15 mln so'm`, "good");
        });
      }
      if (m?.kind === "migration") {
        mutate((st) => {
          st.recentEvents.push(m.card.id);
          if (st.recentEvents.length > EVENT_COOLDOWN) st.recentEvents.shift();
        });
      }
      setModal(null);
      userDone();
    },
    onCharity: (accept) => {
      if (accept) {
        mutate((st) => {
          const pl = st.players[st.current];
          applyCharity(pl, true);
          addLog(st, "event", g.charity.donated(pl.name), "neutral");
        });
      }
      setModal(null);
      userDone();
    },
    onDoodad: (mode) => {
      const m = modal;
      if (m?.kind !== "doodad") return;
      const result = applyDoodad(structuredClone(currentPlayer()!), m.card, mode);
      mutate((st) => {
        const pl = st.players[st.current];
        applyDoodad(pl, m.card, mode);
        addLog(st, "event", `${pl.name}: ${m.card.title} — ${result}`, "bad");
      });
      if (mode === "credit") mentorCtx({ kind: "doodad-credit" });
      setModal(null);
      userDone();
    },
    onDoodadDecline: () => {
      const m = modal;
      if (m?.kind !== "doodad" || !m.card.canDecline) return;
      const note = m.card.declineText ?? g.doodad.decline;
      mutate((st) => {
        const pl = st.players[st.current];
        addLog(st, "event", `${pl.name}: ${m.card.title} — ${note}`, "neutral");
      });
      pushToast(note, "neutral");
      setModal(null);
      userDone();
    },
    onDoodadDefer: () => {
      const m = modal;
      if (m?.kind !== "doodad") return;
      mutate((st) => {
        const pl = st.players[st.current];
        if (deferDoodad(pl, m.card, st.month)) {
          addLog(st, "event", `${pl.name}: ${g.doodad.deferred(m.card.title)}`, "neutral");
        }
      });
      pushToast(g.doodad.deferred(m.card.title), "neutral");
      setModal(null);
      userDone();
    },
    onWeekend: (choice) => {
      const m = modal;
      if (m?.kind !== "weekend") return;
      const result = applyWeekend(structuredClone(currentPlayer()!), m.card, choice);
      mutate((st) => {
        const pl = st.players[st.current];
        applyWeekend(pl, m.card, choice);
        addLog(st, "event", `${pl.name}: ${m.card.title} — ${result}`, choice === "spend" ? "bad" : "neutral");
      });
      pushToast(result, "neutral");
      if (choice === "spend") mentorCtx({ kind: "weekend" });
      setModal(null);
      userDone();
    },
    onLifeEventDone: () => {
      setModal(null);
      userDone();
    },
    onTakeLoan: (offer, principal) => {
      mutate((st) => {
        const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
        takeLoanOffer(pl, `${offer.title} (${offer.months} oy)`, principal, offer.monthlyRate, offer.months);
        addLog(st, "work", `${pl.name}: ${g.loans.taken(offer.title, formatUZSCompact(principal))}`, "neutral");
        addLog(st, "work", `${pl.name}: ${g.credit.logNewLoan}`, "neutral");
      });
      pushToast(g.loans.taken(offer.title, formatUZSCompact(principal)), "good");
      mentorCtx({ kind: "loan" });
      setModal(null);
    },
    onCloseLoans: () => {
      setModal(null);
    },
    onExchangeBuy: (securityId, qty) => {
      let ok = false;
      let fail = false;
      mutate((st) => {
        const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
        const res = buySecurity(pl, st, securityId, qty);
        const sec = securityById(securityId);
        if (res && sec) {
          ok = true;
          addLog(
            st,
            "buy",
            `${g.exchange.bought(pl.name, res.qty, sec.ticker)} (−${formatUZSCompact(res.total + res.fee)})`,
            "good"
          );
        } else {
          fail = true;
        }
      });
      if (ok) pushToast(g.toasts.dealSigned, "good");
      if (fail) pushToast(g.toasts.notEnoughCash, "bad");
      if (ok) mentorCtx({ kind: "exchange-buy" });
    },
    onExchangeSell: (securityId, qty) => {
      mutate((st) => {
        const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
        const res = sellSecurity(pl, st, securityId, qty);
        const sec = securityById(securityId);
        if (res && sec) {
          addLog(
            st,
            "sell",
            `${g.exchange.sold(pl.name, res.qty, sec.ticker)} (+${formatUZSCompact(res.total - res.fee)})`,
            "good"
          );
        }
      });
    },
    onCloseExchange: () => {
      setModal(null);
    },
    onBabyDone: () => {
      setModal(null);
      userDone();
    },
    // fix-15 (P4): farzand ta'limi tanlovi (navbat boshidagi modal)
    onChildEdu: (edu) => {
      const ev = currentPlayer()?.pendingChildEvent;
      mutate((st) => {
        const pl = st.players[st.current];
        const childName = `#${(ev?.childIndex ?? 0) + 1}`;
        resolveChildEvent(pl, edu);
        addLog(
          st,
          "baby",
          `${pl.name}: farzand ${childName} ta'limi — ${g.childEdu.eduLabels[edu]} (+${formatUZSCompact(CHILD_EDU_COSTS[edu])}/oy)`,
          "neutral"
        );
        notify(st, {
          icon: "🎒",
          title: ev?.stage === "school" ? g.childEdu.schoolTitle : g.childEdu.kgTitle,
          body: `${pl.name}: ${g.childEdu.eduLabels[edu]} (+${formatUZSCompact(CHILD_EDU_COSTS[edu])}/oy)`,
          tone: "gold",
        });
      });
      setModal(null);
      // navbat boshidagi modal edi — tanlovdan keyin navbat davom etadi
      void beginTurn();
    },
    onDownsizedDone: () => {
      setModal(null);
      userDone();
    },
    onFTBuy: () => {
      const m = modal;
      if (m?.kind !== "ft-deal") return;
      const pid = currentPlayer()!.id;
      mutate((st) => {
        const pl = st.players[st.current];
        buyFTDeal(pl, m.deal);
        addLog(st, "buy", `${pl.name} «${m.deal.title}» sotib oldi`, "gold");
      });
      pushToast(g.toasts.dealSigned, "gold");
      setModal(null);
      const after = stateRef.current!.players[stateRef.current!.current];
      if (ftCashflowWin(after)) {
        pushToast(g.ft.winCashflow, "gold");
        userDone();
        endGame("win", pid, "cashflow");
        return;
      }
      userDone();
    },
    onFTPass: () => {
      setModal(null);
      userDone();
    },
    onFTDreamBuy: () => {
      const m = modal;
      if (m?.kind !== "ft-dream") return;
      // C3: orzu sotib olinadi — g'alaba uni 3 oy ushlab turgach
      mutate((st) => {
        const pl = st.players[st.current];
        if (buyDream(pl, m.dream)) {
          addLog(st, "rocket", `${pl.name} orzusini sotib oldi: ${m.dream.title}! (${g.ft.dreamHoldRule})`, "gold");
          notify(st, { icon: "✨", title: g.notif.dream, body: `${pl.name} orzusini sotib oldi: ${m.dream.title}!`, tone: "gold" });
        }
      });
      pushToast(g.ft.dreamBoughtToast, "gold");
      setModal(null);
      userDone();
    },
    onFTDreamClose: () => {
      setModal(null);
      userDone();
    },
    onFTCharity: (accept) => {
      if (accept) {
        mutate((st) => {
          const pl = st.players[st.current];
          const donation = Math.round(Math.max(0, pl.cash) * 0.1);
          pl.cash -= donation;
          pl.charityTurns = 1;
          addLog(st, "event", g.charity.donated(pl.name), "neutral");
        });
      }
      setModal(null);
      userDone();
    },
    onFTInfoDone: () => {
      setModal(null);
      userDone();
    },
  };

  /* bankruptcy handlers */
  const onBankruptcySellMode = () => {
    setBankModal(false);
    setForcedSellMode(true);
    // if player somehow has no assets, re-trigger the loop
    const p = currentPlayer()!;
    if (p.assets.length === 0) {
      userDone();
    }
  };

  // fix-14 (T1): qarindoshlardan foizsiz qarz — bankrotlik modalining 1-varianti
  const onBankruptcyQarz = (amount: number, months: number) => {
    let ok = false;
    mutate((st) => {
      const pl = st.players[st.current];
      ok = takeQarz(st, pl.id, amount, months) !== null;
    });
    if (ok) {
      pushToast(g.toasts.qarzTaken, "good");
      mentorCtx({ kind: "qarz" });
      setBankModal(false);
      userDone();
    }
  };

  const onBankruptcyLoan = () => {
    mutate((st) => {
      const pl = st.players[st.current];
      emergencyLoan(pl);
      addLog(st, "work", `${pl.name}: ${g.bankruptcy.emergencyLoan}`, "bad");
      addLog(st, "work", `${pl.name}: ${g.credit.logEmergency}`, "bad");
    });
    setBankModal(false);
    userDone();
  };

  const onForcedSell = (assetId: string) => {
    const probeState = structuredClone(stateRef.current!);
    const probe = probeState.players[probeState.current];
    const title = probe.assets.find((a) => a.id === assetId)?.title ?? "";
    const got = forcedSell(probeState, probe, assetId);
    mutate((st) => {
      const pl = st.players[st.current];
      forcedSell(st, pl, assetId);
      addLog(st, "sell", `${g.market.sold(pl.name, title)} (+${formatUZSCompact(got)})`, "bad");
    });
    // fix-14 (T2): shoshilinch sotuv darsi — birinchi marta sotilganda ochiladi
    mentorCtx({ kind: "forced-sell" });
    const p = stateRef.current!.players[stateRef.current!.current];
    if (p.cash >= 0 || p.assets.length === 0) {
      setForcedSellMode(false);
      userDone();
    }
  };

  // "To'liq yopish" (A5): qoldiq naqddan yechiladi, kredit yopiladi, reyting +5
  const onPayoff = (loanId: string) => {
    let name = "";
    let monthly = 0;
    let closed = false;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      const loan = pl.loans.find((l) => l.id === loanId);
      if (loan) {
        name = loan.name;
        monthly = loan.monthlyPayment;
      }
      closed = closeLoanEarly(pl, loanId);
      if (closed) {
        addLog(st, "work", `${pl.name}: ${g.toasts.loanClosed(name, formatUZSCompact(monthly))}`, "gold");
        addLog(st, "work", `${pl.name}: ${g.credit.logEarlyPayoff}`, "good");
        notify(st, { icon: "🎉", title: g.notif.loanClosed, body: `${pl.name}: ${g.toasts.loanClosed(name, formatUZSCompact(monthly))}`, tone: "gold" });
      }
    });
    pushToast(g.toasts.loanPaidOff, "good");
    if (closed) mentorCtx({ kind: "payoff" });
  };

  // Menejer yollash (B2): 2× oylik xarajat — mijoz cheklovi olinadi, B kvadranti sharti
  const onHireManager = () => {
    let ok = false;
    let cost = 0;
    let advanced: string | null = null;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      cost = managerCost(pl);
      ok = hireManager(pl);
      if (ok) {
        addLog(st, "work", `${pl.name}: menejer yollandi (−${formatUZSCompact(cost)})`, "good");
        const adv = maybeAdvanceQuadrant(pl, st.exchange);
        if (adv) {
          advanced = adv;
          addLog(st, "rocket", `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, "gold");
          notify(st, { icon: "🎓", title: g.notif.quadrant, body: `${pl.name}: ${g.statement.quadrantAdvanced(adv)}`, tone: "gold" });
        }
      }
    });
    if (ok) pushToast(g.toasts.managerHired(formatUZSCompact(cost)), "good");
    else pushToast(g.toasts.notEnoughCash, "bad");
    if (advanced) pushToast(g.toasts.quadrantAdvanced(currentPlayer()!.name, advanced), "gold");
    if (advanced) mentorCtx({ kind: "quadrant" });
  };

  /* fix-9 (F2): Bilim olish markazi — cooldown/naqd/cap engine'da tekshiriladi */
  const onUseKnowledgeAction = (actionId: string) => {
    let res: ReturnType<typeof useKnowledgeAction> | null = null;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      res = useKnowledgeAction(st, pl.id, actionId);
    });
    if (res) {
      const r = res as ReturnType<typeof useKnowledgeAction>;
      pushToast(r.message, !r.ok ? "bad" : r.gained > 0 || r.client ? "good" : "neutral");
      if (r.ok && r.gained > 0) mentorCtx({ kind: "knowledge" });
    }
  };

  /* fix-12: mijozga ish taklifi — narx fee×20%, 70% fee+20% (maks 2) / 30% sadoqat −1 */
  const onOfferWork = (clientId: string) => {
    let res: ReturnType<typeof offerClientWork> | null = null;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      res = offerClientWork(st, pl.id, clientId);
    });
    if (res) {
      const r = res as ReturnType<typeof offerClientWork>;
      pushToast(r.message, !r.ok ? "bad" : r.success ? "good" : "neutral");
    }
  };

  /* fix-9 (F3): Mijoz topish markazi (S/B/I kvadrant) */
  const onUseClientAction = (actionId: string) => {
    let res: ReturnType<typeof useClientAction> | null = null;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      res = useClientAction(st, pl.id, actionId);
      const r = res as ReturnType<typeof useClientAction> | null;
      if (r?.ok && r.added.length > 0) {
        notify(st, { icon: "🤝", title: g.notif.clients, body: `${pl.name}: ${g.toasts.clientsJoined(r.added.length)}`, tone: "good" });
      }
    });
    if (res) {
      const r = res as ReturnType<typeof useClientAction>;
      pushToast(r.message, !r.ok ? "bad" : r.added.length > 0 ? "good" : "neutral");
      if (r.ok && r.added.length > 0) mentorCtx({ kind: "client" });
    }
  };

  // "Qisman" to'lov (A5): qoldiq kamayadi, oylik to'lov o'zgarmaydi, muddat qisqaradi
  const onPartialPay = (loanId: string, amount: number) => {
    let paid = 0;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      const loan = pl.loans.find((l) => l.id === loanId);
      const res = makePartialPayment(pl, loanId, amount);
      if (res) {
        paid = res.paid;
        addLog(st, "work", `${pl.name}: ${g.toasts.partialPaid(formatUZSCompact(res.paid))} — ${loan?.name ?? ""}`, "neutral");
        if (res.closed) {
          addLog(st, "work", `${pl.name}: ${g.toasts.loanPaidOff}`, "gold");
          notify(st, { icon: "🎉", title: g.notif.loanClosed, body: `${pl.name}: ${loan?.name ?? ""} — ${g.toasts.loanPaidOff}`, tone: "gold" });
        }
      }
    });
    if (paid > 0) pushToast(g.toasts.partialPaid(formatUZSCompact(paid)), "good");
    else pushToast(g.toasts.notEnoughCash, "bad");
  };

  // Istalgan payt sotish (A4): bozor qiymati × resale% × likvidlik
  const onSellAsset = (assetId: string) => {
    let toast: string | null = null;
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      const res = sellAssetAnytime(st, pl.id, assetId);
      if (res) toast = g.toasts.soldAnytime(formatUZSCompact(res.net), formatUZSCompact(res.marketValue));
    });
    if (toast) {
      pushToast(toast, "good");
      mentorCtx({ kind: "sell" });
    }
  };

  const onPayoffInstallment = (installmentId: string) => {
    mutate((st) => {
      const pl = st.players.find((x) => !x.isBot) ?? st.players[st.current];
      if (payoffInstallment(pl, installmentId)) addLog(st, "work", `${pl.name}: ${g.toasts.loanPaidOff}`, "good");
    });
    pushToast(g.toasts.loanPaidOff, "good");
  };

  const onEscapeGo = () => {
    mutate((st) => {
      st.screen = "fasttrack";
    });
    setEscapeOverlay(false);
    userDone();
  };

  const onSpectate = () => {
    mutate((st) => {
      st.spectating = true;
    });
    setBankFinal(false);
    userDone();
  };

  /* ---------- render ---------- */

  if (entry === "loading") {
    return <div className="min-h-[100dvh] bg-felt-vignette" />;
  }

  if (entry === "setup") {
    return <SetupScreen onComplete={startNewGame} />;
  }

  if (entry === "choice" && pendingSave) {
    return (
      <div className="min-h-[100dvh] bg-gradient-hero">
        <AnimatePresence>
          <ContinueModal save={pendingSave} onResume={() => resumeGame(pendingSave)} onNew={resetToSetup} />
        </AnimatePresence>
      </div>
    );
  }

  const s = state;
  if (!s) return null;

  if (s.screen === "end") {
    const winner = s.winnerId !== null ? s.players.find((p) => p.id === s.winnerId) ?? null : null;
    return <EndScreen state={s} winner={winner ?? s.players.find((p) => !p.isBot) ?? s.players[0]} onNewGame={resetToSetup} />;
  }

  const human = s.players.find((p) => !p.isBot) ?? s.players[0];
  const current = s.players[s.current];
  const fastTrack = s.screen === "fasttrack";
  const boardPlayers = s.players
    .filter((p) => (fastTrack ? p.escaped : !p.escaped))
    .map((p) => ({
      player: p,
      cell: displayCells[p.id] ?? (p.escaped ? p.ftPosition : p.position),
    }));

  const isHumanTurn = !current.isBot && !s.spectating && !current.bankrupt;
  const blocked = !!modal || bankModal || bankFinal || escapeOverlay || actionsModal !== null;
  /** fix-9: header amaliyot tugmalari faolmi (inson navbati, bo'sh fazada) */
  const actionsEnabled = isHumanTurn && (s.phase === "idle" || s.phase === "awaiting-end") && !modal && actionsModal === null;
  const clientsUnlocked = quadrantLevel(human) >= 1;
  const canRoll = isHumanTurn && s.phase === "idle" && !blocked && !forcedSellMode && (s.boardMode === "classic" || fastTrack);
  const canEnd = isHumanTurn && s.phase === "awaiting-end" && !blocked && !forcedSellMode;
  /** fix-16 (X3): yo'l xaritasi — tugun tanlash faolmi */
  const pathMode = s.boardMode === "path" && !fastTrack;
  const canPickPath = isHumanTurn && s.phase === "idle" && !blocked && !forcedSellMode && pathMode;
  /** fix-17 (R8): reja rejimi */
  const planMode = s.boardMode === "plan" && !fastTrack;
  const canPlanBoard = isHumanTurn && s.phase === "idle" && !blocked && !forcedSellMode && planMode;
  const planExecuting = s.plan?.executing ?? -1;
  /** fix-18: haftalik oqimda avans huquqi bajarilgan kunlar sonidan (10 kundan keyin) */
  const planDoneDays = (s.plan?.days[current.id] ?? []).filter((d) => d.done).length;
  const planAvansOpen =
    planExecuting >= PLAN_AVANS_DAY - 1 || (planExecuting < 0 && planDoneDays >= PLAN_AVANS_DAY);
  const canPlanAvans =
    isHumanTurn &&
    planMode &&
    !blocked &&
    !forcedSellMode &&
    planAvansOpen &&
    !current.avansTakenThisMonth;
  const planAvansHint = !isHumanTurn
    ? null
    : current.avansTakenThisMonth
      ? g.plan.avansTaken
      : !planAvansOpen
        ? g.plan.avansLocked(PLAN_AVANS_DAY)
        : null;

  const currentDream = DREAMS.find((d) => d.id === current.dreamId);
  const humanPassive = passiveIncome(human, { news: s.news, exchange: s.exchange });
  const humanExpenses = totalExpenses(human);
  const humanCf = monthlyCashflow(human, { news: s.news, exchange: s.exchange });
  const gaugePct = humanExpenses > 0 ? Math.min(100, Math.round((humanPassive / humanExpenses) * 100)) : 100;

  /* oy kalendari: joriy o'yinchining katakchasi = oy kuni (hop-payti jonlanadi);
     fix-16: yo'l xaritasida kun = qadamlar soni */
  const calDay = pathMode ? ((s.path?.steps ?? 0) % RAT_CELLS.length) + 1 : dayOfMonth(displayCells[current.id] ?? current.position);
  const avansDay = AVANS_INDEX + 1; // 16-kun

  const actionButton = canEnd ? (
    <button className="btn-secondary" onClick={() => userDone()}>
      {g.turn.endTurn}
    </button>
  ) : pathMode ? (
    // fix-16 (X3): yo'l xaritasida zar bloki o'rniga yo'l tanlash izohi
    <p
      className={cn(
        "rounded-xl px-4 py-2 text-[clamp(11px,2.6vw,13px)] font-semibold",
        canPickPath ? "bg-emerald-100 text-emerald-700" : "text-ink-400"
      )}
    >
      🌿 {g.path.choosePrompt}
    </p>
  ) : (
    <button
      className={cn("btn-primary", !canRoll && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none")}
      disabled={!canRoll}
      onClick={() => void doRoll()}
    >
      <Dices className="h-4 w-4" />
      {g.turn.roll}
    </button>
  );

  /* fix-10 (F1): markaziy hub — qat'iy zonalarga bo'lingan flex-column ustun.
     (1) zar + tugma, (2) o'yinchi chipi zar BLOKIDAN PASTDA, (3) kun pillari bitta qatorda.
     Yangiliklar tickeri va aktiv-modifikator chipi hubdan olib tashlandi (F2: 🔔 markaz).
     Hub ichida absolute-float yo'q; <400px da faqat zar+tugma+kun pillasi qoladi. */
  const hubNode = (
    <div className="flex w-full flex-col items-center gap-2 min-[400px]:gap-2.5">
      {/* (1) zar bloki (fix-16: yo'l xaritasida zar yo'q) */}
      {!pathMode && (
        <div className={cn(s.diceCount === 1 && "[&>div>div:last-child]:hidden")}>
          <Dice
            values={s.dice}
            rolling={rolling}
            size={46}
            playerColor={PLAYER_COLORS[current.colorIndex]}
          />
        </div>
      )}
      {/* zar natijasi — balandligi band qilingan qator (absolute emas, layout siljimaydi) */}
      <div className="flex h-5 items-center justify-center">
        <AnimatePresence>
          {rollChip !== null && (
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-full bg-ink-900 px-2.5 py-0.5 text-[clamp(10px,2.4vw,12px)] font-bold text-white shadow-card"
            >
              +{rollChip}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {/* (1b) harakat tugmasi — zar ostida; navbat izohlari tugma tagida */}
      <div className="flex flex-col items-center gap-1">
        {(canRoll || canEnd || canPickPath) ? (
          actionButton
        ) : (
          isHumanTurn && s.phase === "idle" && (
            <p className="text-caption normal-case text-ink-400">{g.turn.rollHint}</p>
          )
        )}
        {s.discarded > 0 && (
          <span className="text-[clamp(9px,2.2vw,11px)] font-medium uppercase tracking-[0.04em] text-ink-400">
            {g.turn.discarded(s.discarded)}
          </span>
        )}
      </div>
      {/* (2) joriy o'yinchi chipi — hech qachon zar ustida emas */}
      <span
        className="chip text-white max-[399px]:hidden"
        style={{ backgroundColor: PLAYER_COLORS[current.colorIndex] }}
      >
        {current.name}
      </span>
      {/* (3) kun pillari — bitta gorizontal qator (wrap mumkin) */}
      {!fastTrack && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="chip bg-sand-100 text-ink-600 !text-[clamp(9px,2.4vw,11px)]">
            📅 {g.calendar.day(calDay)}
          </span>
          <motion.span
            key={calDay}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="chip bg-sand-100 text-ink-500 max-[399px]:hidden !text-[clamp(9px,2.4vw,11px)]"
          >
            {calDay <= avansDay
              ? g.calendar.toAvans(avansDay - calDay)
              : g.calendar.toPayday(RAT_CELLS.length - calDay)}
          </motion.span>
        </div>
      )}
      {/* FT: orzu chipi + progress (kichik ekranda yashirin — zar/tugma o'rin qoladi) */}
      {fastTrack && currentDream && (
        <span className="chip bg-gold-100 text-gold-600 max-[399px]:hidden">
          <Rocket className="h-3.5 w-3.5" />
          {current.dreamBought
            ? `${currentDream.title} · ${g.ft.dreamHoldProgress(current.dreamHeldMonths, DREAM_HOLD_MONTHS)}`
            : `${currentDream.title} · ${formatUZSCompact(currentDream.price)}`}
        </span>
      )}
      {fastTrack && currentDream && !current.dreamBought && (
        <div className="w-40 max-w-full max-[399px]:hidden">
          <p className="text-caption text-ink-400">{g.statement.gaugeFT}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-200">
            <motion.div
              className="h-full rounded-full bg-gradient-gold"
              animate={{ width: `${Math.min(100, (current.cash / currentDream.price) * 100)}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
        </div>
      )}
      {fastTrack && current.dreamBought && (
        <div className="w-40 max-w-full max-[399px]:hidden">
          <p className="text-caption text-ink-400">
            {g.ft.dreamHoldProgress(current.dreamHeldMonths, DREAM_HOLD_MONTHS)}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-200">
            <motion.div
              className="h-full rounded-full bg-gradient-gold"
              animate={{ width: `${Math.min(100, (current.dreamHeldMonths / DREAM_HOLD_MONTHS) * 100)}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-sand-50">
      {/* top bar (game.md §1 GameShell) */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-sand-200 bg-white px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/oqim-logo.png" alt="OQIM" className="h-7 w-7 rounded" />
          <span className="font-display text-base font-bold text-ink-900">
            OQ<span className="text-emerald-600">IM</span>
          </span>
        </Link>
        {/* fix-10 (F4): mobil sig'ishi uchun status-chiplar faqat md+ da (aylana/oy hub va panelda bor) */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="chip bg-sand-100 text-ink-600">{g.shell.round(s.round)}</span>
          <span className="chip bg-gold-100 text-gold-600">{g.calendar.month(s.month)}</span>
          {/* fix-15 (P2): qiyinlik darajasi chipi */}
          <span
            className={cn(
              "chip",
              human.difficulty === "easy"
                ? "bg-emerald-100 text-emerald-700"
                : human.difficulty === "hard"
                  ? "bg-clay-100 text-clay-600"
                  : "bg-sand-100 text-ink-600"
            )}
          >
            {g.difficulty[human.difficulty]}
          </span>
          {s.mode === "tez" && (
            <span className="chip bg-amber-100 text-amber-700">⚡ Tez</span>
          )}
          <span
            className={cn(
              "chip",
              fastTrack ? "bg-gold-100 text-gold-600" : "bg-emerald-100 text-emerald-700"
            )}
          >
            {fastTrack && <Rocket className="h-3.5 w-3.5" />}
            {fastTrack ? g.shell.fastTrack : g.shell.ratRace}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* fix-10 (F2): Bildirishnomalar markazi 🔔 */}
          <NotificationsCenter items={s.notifications} />
          <button
            className={cn("btn-ghost !p-2", !(isHumanTurn && (s.phase === "idle" || s.phase === "awaiting-end") && !modal) && "opacity-40")}
            onClick={() => {
              if (isHumanTurn && (s.phase === "idle" || s.phase === "awaiting-end") && !modal) {
                setModal({ kind: "exchange" });
              }
            }}
            aria-label={g.exchange.title}
            title={g.exchange.title}
          >
            <TrendingUp className="h-5 w-5" />
          </button>
          <button
            className={cn("btn-ghost !p-2", !(isHumanTurn && (s.phase === "idle" || s.phase === "awaiting-end") && !modal) && "opacity-40")}
            onClick={() => {
              if (isHumanTurn && (s.phase === "idle" || s.phase === "awaiting-end") && !modal) {
                setModal({ kind: "loan-offers" });
              }
            }}
            aria-label={g.loans.offers}
            title={g.loans.offers}
          >
            <Landmark className="h-5 w-5" />
          </button>
          <button
            className={cn("btn-ghost !p-2", !actionsEnabled && "opacity-40")}
            onClick={() => {
              if (actionsEnabled) setActionsModal("knowledge");
            }}
            aria-label={`📚 ${g.shell.knowledge}`}
            title={`📚 ${g.actions.knowledgeTitle}`}
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            className={cn("btn-ghost !p-2", (!actionsEnabled || !clientsUnlocked) && "opacity-40")}
            onClick={() => {
              if (actionsEnabled && clientsUnlocked) setActionsModal("clients");
            }}
            aria-label={`🤝 ${g.shell.clients}`}
            title={clientsUnlocked ? `🤝 ${g.actions.clientsTitle}` : `🔒 ${g.actions.clientsLocked}`}
          >
            <Handshake className="h-5 w-5" />
          </button>
          <a href="/rules" target="_blank" rel="noreferrer" className="btn-ghost !p-2" aria-label={g.shell.rules}>
            <HelpCircle className="h-5 w-5" />
          </a>
          <button className="btn-ghost !p-2" onClick={() => setSettingsOpen(true)} aria-label={g.shell.settings}>
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* turn banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-0 top-16 z-40 flex justify-center px-4"
          >
            <span className="rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-card" style={{ backgroundColor: banner.color }}>
              {banner.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[1fr_400px]">
        {/* board zone */}
        <motion.main
          className="p-4 pb-48 lg:p-6 lg:pb-6"
          animate={shake ? { x: [0, 2, -2, 0] } : { x: 0 }}
          transition={{ duration: 0.14 }}
        >
          <motion.div
            key={fastTrack ? "ft" : "rat"}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {planMode ? (
              <>
                <PlanBoard
                  state={s}
                  canPlan={canPlanBoard}
                  canAvans={canPlanAvans}
                  avansHint={planAvansHint}
                  onAvans={doPlanAvans}
                  onExecute={(days) => void doPlanExecute(days)}
                />
                <div className="mt-4 flex justify-center">{hubNode}</div>
              </>
            ) : pathMode ? (
              <>
                <PathBoard state={s} canPick={canPickPath} onPick={(l, n) => void doPathPick(l, n)} />
                <div className="mt-4 flex justify-center">{hubNode}</div>
              </>
            ) : (
              <Board
                track={fastTrack ? "fast" : "rat"}
                players={boardPlayers}
                flashCells={flashCells}
                hub={hubNode}
                botBubble={bubble}
                activePlayerId={current.id}
                dreamGlowCell={fastTrack ? 2 : null}
              />
            )}
          </motion.div>
        </motion.main>

        {/* statement sidebar (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] border-l border-sand-200 lg:block">
          <StatementPanel
            state={s}
            humanId={human.id}
            forcedSell={forcedSellMode}
            onForcedSell={onForcedSell}
            onPayoff={onPayoff}
            onPayoffInstallment={onPayoffInstallment}
            onSellAsset={onSellAsset}
            onPartialPay={onPartialPay}
            onHireManager={onHireManager}
            onOfferWork={onOfferWork}
            onOpenKnowledge={actionsEnabled ? () => setActionsModal("knowledge") : undefined}
          />
        </aside>
      </div>

      {/* forced-sell emergency loan shortcut */}
      {forcedSellMode && !current.usedEmergencyLoan && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="btn-danger fixed bottom-40 right-4 z-40 lg:bottom-8"
          onClick={onBankruptcyLoan}
        >
          {g.bankruptcy.emergencyLoan}
        </motion.button>
      )}

      {/* mobile: statement bottom sheet */}
      <motion.div
        className="fixed inset-x-0 bottom-16 z-40 flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-modal lg:hidden"
        animate={{ height: sheetOpen ? "78vh" : 72 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y < -40 || info.velocity.y < -300) setSheetOpen(true);
          else if (info.offset.y > 40 || info.velocity.y > 300) setSheetOpen(false);
        }}
      >
        <button className="flex shrink-0 flex-col items-center pt-2" onClick={() => setSheetOpen((v) => !v)}>
          <span className="h-1.5 w-10 rounded-full bg-sand-200" />
          {!sheetOpen && (
            <span className="flex w-full items-center justify-between px-4 py-2">
              <span className="flex items-center gap-1.5 text-body-sm text-ink-600">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <MoneyDisplay value={human.cash} size="sm" showCoin={false} />
              </span>
              <span className="text-money-sm text-ink-600">
                {g.statement.cashflowTitle}:{" "}
                <span className={humanCf >= 0 ? "text-emerald-600" : "text-clay-500"}>
                  {humanCf >= 0 ? "+" : "−"}
                  {formatUZSCompact(Math.abs(humanCf))}
                </span>
              </span>
              <span className="chip bg-emerald-100 text-emerald-700">
                <Gauge className="h-3.5 w-3.5" />
                {gaugePct}%
              </span>
            </span>
          )}
        </button>
        {sheetOpen && (
          <div className="min-h-0 flex-1">
            <StatementPanel
              state={s}
              humanId={human.id}
              forcedSell={forcedSellMode}
              onForcedSell={onForcedSell}
              onPayoff={onPayoff}
              onPayoffInstallment={onPayoffInstallment}
              onSellAsset={onSellAsset}
              onPartialPay={onPartialPay}
              onHireManager={onHireManager}
              onOfferWork={onOfferWork}
              onOpenKnowledge={actionsEnabled ? () => setActionsModal("knowledge") : undefined}
            />
          </div>
        )}
      </motion.div>

      {/* mobile: sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center gap-3 border-t border-sand-200 bg-white/85 px-4 backdrop-blur lg:hidden">
        {s.spectating ? (
          <>
            <span className="flex-1 text-center text-body-sm font-medium text-ink-600">
              {g.turn.watching}
            </span>
            <button
              className="chip bg-sand-100 text-ink-600"
              onClick={() =>
                setSettings((st) => ({
                  ...st,
                  speed: st.speed === "fast" ? "slow" : st.speed === "slow" ? "normal" : "fast",
                }))
              }
            >
              {settings.speed === "slow" ? g.shell.slow : settings.speed === "fast" ? g.shell.fast : g.shell.normal}
            </button>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <MoneyDisplay value={human.cash} size="sm" showCoin={false} />
            </span>
            <div className="flex-1">{actionButton && <div className="[&>button]:w-full">{actionButton}</div>}</div>
          </>
        )}
      </div>

      {/* fix-13b (M1): Moliyaviy ustoz kartasi — pastki chap burchak, navbat bilan */}
      <AnimatePresence>
        {mentorCard && (
          <motion.div
            key={mentorCard.id}
            initial={{ opacity: 0, x: -48, y: 16 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-40 left-4 z-[84] w-[min(320px,calc(100vw-2rem))] lg:bottom-8"
          >
            <div className="overflow-hidden rounded-2xl border border-gold-500/40 bg-white shadow-lift">
              <div className="flex items-center gap-2 bg-gold-100 px-4 py-2">
                <span className="text-base">🎓</span>
                <span className="text-caption font-semibold uppercase tracking-wide text-gold-600">
                  {g.mentor.cardTitle}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="font-display text-sm font-semibold text-ink-900">
                  {mentorCard.title}
                </p>
                <p className="mt-1 text-body-sm text-ink-600">{mentorCard.body}</p>
                <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-caption normal-case tracking-normal text-emerald-700">
                  💡 {g.mentor.tipLabel}: {mentorCard.tip}
                </p>
                <button
                  className="btn-primary mt-3 w-full !py-1.5 !text-sm"
                  onClick={showNextMentor}
                >
                  {g.mentor.understood}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-40 z-[85] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "rounded-full px-4 py-2 text-body-sm font-medium text-white shadow-card",
                t.tone === "good" && "bg-emerald-600",
                t.tone === "bad" && "bg-clay-500",
                t.tone === "gold" && "bg-gold-500 !text-ink-900",
                t.tone === "neutral" && "bg-ink-900"
              )}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* card modals */}
      <CardModals modal={modal} player={current} state={s} handlers={handlers} />

      {/* fix-9: Bilim olish / Mijoz topish markazlari */}
      <AnimatePresence>
        {actionsModal === "knowledge" && (
          <KnowledgeCenterModal
            key="knowledge"
            state={s}
            player={human}
            onUse={onUseKnowledgeAction}
            onClose={() => setActionsModal(null)}
          />
        )}
        {actionsModal === "clients" && (
          <ClientsCenterModal
            key="clients"
            state={s}
            player={human}
            onUse={onUseClientAction}
            onClose={() => setActionsModal(null)}
          />
        )}
      </AnimatePresence>

      {/* overlays */}
      <AnimatePresence>
        {escapeOverlay && <EscapeCeremony key="escape" onGo={onEscapeGo} />}
        {bankModal && (
          <BankruptcyModal
            key="bank"
            state={s}
            player={current}
            onSell={onBankruptcySellMode}
            onLoan={onBankruptcyLoan}
            onQarz={onBankruptcyQarz}
          />
        )}
        {bankFinal && (
          <BankruptFinalModal
            key="bankfinal"
            player={current}
            canSpectate={activePlayers(s).length > 0}
            onSpectate={onSpectate}
            onNewGame={resetToSetup}
          />
        )}
      </AnimatePresence>

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onSettings={setSettings}
        onSaveExit={() => {
          saveGame(s);
          navigate("/");
        }}
        onRestart={() => {
          setSettingsOpen(false);
          resetToSetup();
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
