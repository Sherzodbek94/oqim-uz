/**
 * OQIM (avvalgi Cashflow UZ) — card-draw modals (game.md §3.3, §7).
 * Desktop: centered rounded-3xl; mobile: bottom-sheet. Card draws flip from
 * their card-back asset with content stagger-in (design.md §7.2.3).
 */
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Baby,
  Briefcase,
  CalendarClock,
  Coins,
  GraduationCap,
  HeartHandshake,
  Home,
  Landmark,
  Palmtree,
  Rocket,
  ShoppingBag,
  SkipForward,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUZS, formatUZSCompact } from "@/lib/format";
import { g } from "@/lib/game/strings";
import { BANK_LOAN_MONTHS, DREAM_HOLD_MONTHS, INSTALLMENT_MIN_PRICE, LOAN_RATE_YEAR, MAX_DOODAD_DEFERS, SCORE_DEAL_MIN } from "@/lib/game/types";
import { adjustedCashflow, adjustedDown, adjustedPrice, annuityPayment, dealKnowledgeLocked, dealLoanGate, dealLoanPayment, doodadCreditGate, doodadCreditTerms, dreamMonthlyNet, installmentQuote, loanOfferGate, weekendSpendCost, type BuyMethod, type WeekendChoice } from "@/lib/game/engine";
import { expenseDiscountPct } from "@/lib/game/heroes";
import { LOAN_OFFERS } from "@/lib/game/data";
import type {
  Asset,
  ChildEdu,
  DealCard,
  DoodadCard,
  Dream,
  EventCard,
  FTDeal,
  GameState,
  LifeEventCard,
  LoanOffer,
  MarketCard,
  Player,
  Sector,
  WeekendCard,
} from "@/lib/game/types";
import type { ExchangeState } from "@/lib/game/types";
import { CHILD_EDU_COSTS } from "@/lib/game/types";
import type { BabyResult, DoodadMode } from "@/lib/game/engine";
import {
  SECURITIES,
  hasDiversificationBonus,
  maxBuyQty,
  portfolioValue,
  priceChangePct,
  tradeFee,
  type Security,
} from "@/lib/game/exchange";
import MoneyDisplay from "@/components/MoneyDisplay";

export type ModalState =
  | { kind: "deal-pick" }
  | { kind: "deal"; deal: DealCard; analyst?: boolean }
  | { kind: "market"; card: MarketCard; target: Asset | null; offer: number }
  | { kind: "event"; card: EventCard; result: string; lesson?: string }
  | { kind: "dilemma"; card: EventCard }
  | { kind: "migration"; card: EventCard }
  | { kind: "charity"; donation: number }
  | { kind: "doodad"; card: DoodadCard }
  | { kind: "baby"; result: BabyResult }
  /** fix-15 (P4): farzand ta'limi tanlovi (3 yosh bog'cha / 7 yosh maktab) */
  | { kind: "child-edu" }
  | { kind: "downsized"; amount: number }
  | { kind: "weekend"; card: WeekendCard }
  | { kind: "life-event"; card: LifeEventCard; result: string }
  | { kind: "loan-offers" }
  | { kind: "exchange" }
  | { kind: "ft-deal"; deal: FTDeal }
  | { kind: "ft-dream"; dream: Dream }
  | { kind: "ft-charity"; amount: number }
  | { kind: "ft-info"; title: string; body: string; tone: "gold" | "slate" }
  | { kind: "bot"; title: string; lines: string[]; icon: string; tone: "good" | "bad" | "neutral" | "gold" };

export interface ModalHandlers {
  onPickDeal: (size: "small" | "big") => void;
  onBuyDeal: (method: BuyMethod) => void;
  onPassDeal: () => void;
  onSellMarket: () => void;
  onCloseMarket: () => void;
  onEventDone: () => void;
  /** ikki tanlovli hodisa (dilemma) — tanlangan variant indeksi */
  onDilemma: (choice: 0 | 1) => void;
  onMigration: (accept: boolean) => void;
  onCharity: (accept: boolean) => void;
  onDoodad: (mode: DoodadMode) => void;
  onDoodadDecline: () => void;
  /** "Keyinroq olaman" — xarajat 3 oyga kechiktiriladi (narx +12%) */
  onDoodadDefer: () => void;
  onWeekend: (choice: WeekendChoice) => void;
  onLifeEventDone: () => void;
  onTakeLoan: (offer: LoanOffer, principal: number) => void;
  onCloseLoans: () => void;
  onExchangeBuy: (securityId: string, qty: number) => void;
  onExchangeSell: (securityId: string, qty: number) => void;
  onCloseExchange: () => void;
  onBabyDone: () => void;
  /** fix-15 (P4): farzand ta'limi varianti tanlandi */
  onChildEdu: (edu: ChildEdu) => void;
  onDownsizedDone: () => void;
  onFTBuy: () => void;
  onFTPass: () => void;
  onFTDreamBuy: () => void;
  onFTDreamClose: () => void;
  onFTCharity: (accept: boolean) => void;
  onFTInfoDone: () => void;
}

function useIsMobile(): boolean {
  const [m, setM] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const fn = () => setM(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return m;
}

/* ---------------- Modal shell ---------------- */

export function ModalShell({
  children,
  wide,
  xl,
  onClose,
}: {
  children: ReactNode;
  wide?: boolean;
  /** 720px — birja kabi keng jadvallar uchun */
  xl?: boolean;
  /** Berilsa: backdrop bosilsa yopiladi + har doim ko'rinadigan X tugmasi chiqadi */
  onClose?: () => void;
}) {
  const mobile = useIsMobile();
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-900/35 backdrop-blur-sm lg:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={
        onClose
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <motion.div
        className={cn(
          "w-full bg-white shadow-modal",
          mobile
            ? "max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl"
            : cn(
                "max-h-[90vh] overflow-y-auto overscroll-contain rounded-3xl",
                xl ? "max-w-[720px]" : wide ? "max-w-[560px]" : "max-w-[420px]"
              )
        )}
        initial={mobile ? { y: "100%" } : { scale: 0.92, opacity: 0 }}
        animate={mobile ? { y: 0 } : { scale: 1, opacity: 1 }}
        exit={mobile ? { y: "100%" } : { scale: 0.94, opacity: 0 }}
        transition={
          mobile
            ? { type: "spring", stiffness: 320, damping: 32 }
            : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
        }
        drag={mobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
      >
        {mobile && (
          <div className="sticky top-0 z-10 flex justify-center bg-white pb-1 pt-2">
            <span className="h-1.5 w-10 rounded-full bg-sand-200" />
          </div>
        )}
        {onClose && (
          <div className="sticky top-3 z-20 -mb-11 flex justify-end pr-3">
            <button
              onClick={onClose}
              aria-label="Yopish"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-sand-200 bg-white/95 text-ink-600 shadow-card transition-colors hover:bg-sand-100 hover:text-ink-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Flip card (design.md §7.2.3) ---------------- */

function FlipCard({
  back,
  goldRing,
  tone,
  children,
}: {
  back: string;
  goldRing?: boolean;
  tone: string;
  children: ReactNode;
}) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ perspective: 1200 }} className="p-5">
      <motion.div
        className={cn("relative mx-auto w-full max-w-[320px]", goldRing && "rounded-2xl ring-4 ring-gold-500/70")}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.34, 1.3, 0.64, 1] }}
        style={{ transformStyle: "preserve-3d", aspectRatio: "5 / 6.4" }}
      >
        {/* back */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-sand-200 shadow-token"
          style={{ backfaceVisibility: "hidden" }}
        >
          <img src={back} alt="" className="h-full w-full object-cover" />
        </div>
        {/* front */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-token"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className={cn("h-1.5 w-full shrink-0", tone)} />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            {flipped && children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Stagger({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="flex min-h-full flex-col"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
    >
      {children}
    </motion.div>
  );
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

function CardHead({
  chip,
  chipClass,
  icon: Icon,
  title,
  desc,
}: {
  chip: string;
  chipClass: string;
  icon: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <motion.div variants={item}>
      <span className={cn("chip", chipClass)}>
        <Icon className="h-3.5 w-3.5" />
        {chip}
      </span>
      <h3 className="mt-2 text-h3 !text-[20px]">{title}</h3>
      {desc && <p className="mt-1 text-body-sm text-ink-600">{desc}</p>}
    </motion.div>
  );
}

function FigureRow({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "info" }) {
  return (
    <motion.div variants={item} className="flex items-center justify-between border-b border-sand-200/70 py-1.5 last:border-0">
      <span className="text-body-sm text-ink-600">{label}</span>
      <span
        className={cn(
          "text-money-sm",
          tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-clay-500" : tone === "info" ? "text-sky-600" : "text-ink-900"
        )}
      >
        {value}
      </span>
    </motion.div>
  );
}

/* ---------------- Individual modals ---------------- */

function DealPickModal({ onPick }: { onPick: (s: "small" | "big") => void }) {
  return (
    <ModalShell wide>
      <div className="p-6 text-center">
        <h3 className="text-h3">{g.deal.pickTitle}</h3>
        <p className="mt-1 text-body-sm text-ink-600">{g.deal.pickSub}</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            className="group relative overflow-hidden rounded-2xl border border-sand-200 shadow-token transition-shadow hover:shadow-lift"
            onClick={() => onPick("small")}
            style={{ aspectRatio: "5 / 7" }}
          >
            <img src="/card-back-opportunity.png" alt={g.deal.small} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/60 to-transparent p-3 text-left text-sm font-semibold text-white">
              {g.deal.small}
            </span>
          </motion.button>
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            className="group relative overflow-hidden rounded-2xl border border-sand-200 shadow-token ring-4 ring-gold-500/70 transition-shadow hover:shadow-lift"
            onClick={() => onPick("big")}
            style={{ aspectRatio: "5 / 7" }}
          >
            <img src="/card-back-opportunity.png" alt={g.deal.big} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/60 to-transparent p-3 text-left text-sm font-semibold text-white">
              {g.deal.big}
            </span>
          </motion.button>
        </div>
      </div>
    </ModalShell>
  );
}

/* Choice card: icon + title + consequence line (payment options) */
function ChoiceCard({
  icon: Icon,
  title,
  sub,
  onClick,
  disabled,
  reason,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string;
  tone?: "default" | "primary" | "gold" | "ghost";
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
      title={disabled ? reason : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
        disabled
          ? "cursor-not-allowed border-sand-200 bg-sand-50 opacity-60"
          : tone === "primary"
            ? "border-emerald-600/40 bg-emerald-100/50 hover:border-emerald-600 hover:shadow-card"
            : tone === "gold"
              ? "border-gold-500/50 bg-gold-100/50 hover:border-gold-500 hover:shadow-card"
              : tone === "ghost"
                ? "border-sand-200 bg-white hover:border-ink-400/40"
                : "border-sand-200 bg-white hover:border-emerald-600/50 hover:shadow-card"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          disabled
            ? "bg-sand-200 text-ink-400"
            : tone === "primary"
              ? "bg-emerald-600 text-white"
              : tone === "gold"
                ? "bg-gold-500 text-ink-900"
                : tone === "ghost"
                  ? "bg-sand-100 text-ink-600"
                  : "bg-sky-600 text-white"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", disabled ? "text-ink-400" : "text-ink-900")}>
          {title}
        </span>
        <span className={cn("block text-caption", disabled ? "text-ink-400" : "text-ink-600")}>
          {disabled && reason ? reason : sub}
        </span>
      </span>
    </motion.button>
  );
}

function DealModal({
  deal,
  player,
  analyst,
  onBuy,
  onPass,
}: {
  deal: DealCard;
  player: Player;
  analyst?: boolean;
  onBuy: (method: BuyMethod) => void;
  onPass: () => void;
}) {
  const discounted = player.mortgageDiscount && deal.kind === "realestate";
  const down = adjustedDown(player, deal);
  const price = adjustedPrice(player, deal);
  const cashflow = adjustedCashflow(player, deal) - dealLoanPayment(deal);
  const affordable = player.cash >= down;
  const roi = down > 0 ? Math.round((cashflow * 12 * 100) / down) : 0;
  const big = deal.size === "big";
  // B3: bilim darajasi talabi — yetarli bo'lmasa barcha sotib olish yo'llari yopiq
  const knowledgeLocked = dealKnowledgeLocked(player, deal);
  const knowledgeReason = knowledgeLocked
    ? g.deal.knowledgeLocked(player.knowledge, deal.minKnowledge!)
    : null;

  // Kreditga olish: bank loan covers the shortfall below the down payment
  // (annuitet: 30%/yil, 24 oy)
  // Garov talabi: reyting ≥ 600 + aktiv resalePercent ≥ 60
  const shortfall = Math.max(0, down - player.cash);
  const loanMonthly = annuityPayment(shortfall, LOAN_RATE_YEAR / 12, BANK_LOAN_MONTHS);
  const loanGate = dealLoanGate(player, deal);
  const loanDisabledReason =
    shortfall <= 0
      ? g.deal.loanNotNeeded
      : loanGate === "score"
        ? g.credit.scoreTooLow(player.creditScore, SCORE_DEAL_MIN)
        : loanGate === "collateral"
          ? g.credit.noCollateral
          : null;

  // Bo'lib to'lash: down now, remaining price +10% over 12 months
  const quote = installmentQuote(player, deal);
  const installmentDisabledReason = !quote
    ? price <= INSTALLMENT_MIN_PRICE
      ? g.deal.installmentTooSmall
      : g.deal.installmentFullPrice
    : player.cash < quote.down
      ? g.deal.cantAfford
      : null;

  return (
    <ModalShell>
      <FlipCard back="/card-back-opportunity.png" goldRing={big} tone={big ? "bg-gold-500" : "bg-emerald-600"}>
        <Stagger>
          <CardHead
            chip={big ? g.deal.big : g.deal.small}
            chipClass={big ? "bg-gold-100 text-gold-600" : "bg-emerald-100 text-emerald-700"}
            icon={big ? TrendingUp : Sparkles}
            title={deal.title}
            desc={deal.note}
          />
          <div className="mt-3">
            <FigureRow label={g.deal.price} value={formatUZS(price)} />
            <FigureRow label={g.deal.down} value={formatUZS(down)} tone="info" />
            <FigureRow label={g.deal.cashflowRow} value={`+${formatUZS(cashflow)}`} tone="good" />
            <motion.div variants={item} className="mt-1 flex flex-wrap gap-1.5">
              {roi > 0 && (
                <span className="chip bg-emerald-100 text-emerald-700">ROI {roi}%/yil</span>
              )}
              {deal.minKnowledge !== undefined && (
                <span
                  className={cn(
                    "chip",
                    knowledgeLocked ? "bg-clay-100 text-clay-600" : "bg-sky-100 text-sky-700"
                  )}
                  title={knowledgeReason ?? undefined}
                >
                  <GraduationCap className="h-3 w-3" />
                  {g.deal.knowledgeRequired(deal.minKnowledge)}
                </span>
              )}
              {deal.riskLevel !== undefined && (
                <span className={cn("chip", deal.riskLevel >= 4 ? "bg-clay-100 text-clay-600" : "bg-sand-200 text-ink-600")}>
                  {g.deal.riskLevel(deal.riskLevel)}
                </span>
              )}
              {deal.liquidity !== undefined && (
                <span className="chip bg-sand-200 text-ink-600">{g.deal.liquidity(deal.liquidity)}</span>
              )}
              {deal.risky && <span className="chip bg-clay-100 text-clay-600">Riskli</span>}
              {analyst && (
                <span className="chip bg-sky-100 text-sky-700" title={g.deal.analystBadgeHint}>
                  {g.deal.analystBadge}
                </span>
              )}
            </motion.div>
            {discounted && (
              <motion.p variants={item} className="mt-1 text-caption text-gold-600">
                {g.deal.mortgageDiscountApplied}
              </motion.p>
            )}
            {player.dealCoupon && player.dealCoupon.kinds.includes(deal.kind) && (
              <motion.p variants={item} className="mt-1 text-caption text-gold-600">
                Chegirma kuponi: −{player.dealCoupon.pct}% (bu bitimda ishlatiladi)
              </motion.p>
            )}
          </div>
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            <ChoiceCard
              icon={Wallet}
              title={g.deal.buyCash}
              sub={g.deal.buyCashSub(formatUZSCompact(down))}
              tone="primary"
              disabled={knowledgeLocked || !affordable}
              reason={knowledgeReason ?? g.deal.cantAfford}
              onClick={() => onBuy("cash")}
            />
            <ChoiceCard
              icon={Landmark}
              title={g.deal.buyLoan}
              sub={g.deal.buyLoanSub(formatUZSCompact(loanMonthly), BANK_LOAN_MONTHS)}
              disabled={knowledgeLocked || loanDisabledReason !== null}
              reason={knowledgeReason ?? loanDisabledReason ?? undefined}
              onClick={() => onBuy("loan")}
            />
            <ChoiceCard
              icon={CalendarClock}
              title={g.deal.buyInstallment}
              sub={
                quote
                  ? g.deal.buyInstallmentSub(formatUZSCompact(quote.monthlyPayment), quote.months)
                  : ""
              }
              tone="gold"
              disabled={knowledgeLocked || installmentDisabledReason !== null}
              reason={knowledgeReason ?? installmentDisabledReason ?? undefined}
              onClick={() => onBuy("installment")}
            />
            <ChoiceCard
              icon={SkipForward}
              title={g.deal.pass}
              sub=""
              tone="ghost"
              onClick={onPass}
            />
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function MarketModal({
  card,
  target,
  offer,
  onSell,
  onClose,
}: {
  card: MarketCard;
  target: Asset | null;
  offer: number;
  onSell: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell>
      <FlipCard back="/card-back-market.png" tone="bg-sky-600">
        <Stagger>
          <CardHead
            chip={g.market.title}
            chipClass="bg-sky-100 text-sky-700"
            icon={Store}
            title={target ? card.text(target.title, offer) : g.market.title}
            desc={target ? undefined : g.market.nothingToSell}
          />
          {target && (
            <div className="mt-3">
              <FigureRow label={target.title} value={formatUZS(offer)} tone="info" />
              <FigureRow label={g.market.youReceive} value={formatUZS(offer)} tone="good" />
            </div>
          )}
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            {target ? (
              <>
                <button className="btn-gold w-full" onClick={onSell}>
                  {g.market.sell} · +{formatUZSCompact(offer)}
                </button>
                <button className="btn-ghost w-full" onClick={onClose}>
                  {g.market.keep}
                </button>
              </>
            ) : (
              <button className="btn-secondary w-full" onClick={onClose}>
                <X className="h-4 w-4" />
                {g.market.close}
              </button>
            )}
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function LessonBox({ text }: { text: string }) {
  return (
    <motion.div variants={item} className="mt-3 rounded-xl border border-gold-500/40 bg-gold-100/60 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gold-600">{g.dilemma.lesson}</p>
      <p className="mt-0.5 text-body-sm leading-snug text-ink-700">{text}</p>
    </motion.div>
  );
}

function EventModal({
  card,
  result,
  lesson,
  onDone,
}: {
  card: EventCard;
  result: string;
  lesson?: string;
  onDone: () => void;
}) {
  const lessonText = lesson ?? card.lessonText;
  return (
    <ModalShell>
      <FlipCard back="/card-back-event.png" tone="bg-[#7A5CA8]">
        <Stagger>
          <CardHead chip={g.event.title} chipClass="bg-[#7A5CA8]/15 text-[#7A5CA8]" icon={Zap} title={card.title} desc={card.desc} />
          <motion.p variants={item} className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-body-sm font-medium text-ink-900">
            {result}
          </motion.p>
          {lessonText && <LessonBox text={lessonText} />}
          <motion.div variants={item} className="mt-auto pt-4">
            <button className="btn-primary w-full" onClick={onDone}>
              {g.event.ok}
            </button>
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

/** Ikki tanlovli hodisa (dilemma) — har bir tanlov o'z effekti va darsiga ega. */
function DilemmaModal({
  card,
  onChoice,
}: {
  card: EventCard;
  onChoice: (choice: 0 | 1) => void;
}) {
  if (!card.choices) return null;
  return (
    <ModalShell>
      <FlipCard back="/card-back-event.png" tone="bg-[#7A5CA8]">
        <Stagger>
          <CardHead chip={g.event.title} chipClass="bg-[#7A5CA8]/15 text-[#7A5CA8]" icon={Zap} title={card.title} desc={card.desc} />
          <motion.p variants={item} className="mt-2 text-caption font-semibold uppercase tracking-wide text-ink-400">
            {g.dilemma.choose}
          </motion.p>
          <motion.div variants={item} className="mt-auto space-y-2 pt-3">
            <ChoiceCard
              icon={HeartHandshake}
              title={card.choices[0].label}
              sub={card.choices[0].hint}
              tone="primary"
              onClick={() => onChoice(0)}
            />
            <ChoiceCard
              icon={SkipForward}
              title={card.choices[1].label}
              sub={card.choices[1].hint}
              tone="ghost"
              onClick={() => onChoice(1)}
            />
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function MigrationModal({ card, onChoice }: { card: EventCard; onChoice: (accept: boolean) => void }) {
  return (
    <ModalShell>
      <FlipCard back="/card-back-event.png" tone="bg-[#7A5CA8]">
        <Stagger>
          <CardHead chip={g.event.title} chipClass="bg-[#7A5CA8]/15 text-[#7A5CA8]" icon={Zap} title={card.title} desc={card.desc} />
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            <button className="btn-primary w-full" onClick={() => onChoice(true)}>
              {g.event.accept} · +15 mln so'm
            </button>
            <button className="btn-ghost w-full" onClick={() => onChoice(false)}>
              {g.event.decline}
            </button>
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function CharityModal({
  donation,
  ft,
  onChoice,
}: {
  donation: number;
  ft?: boolean;
  onChoice: (accept: boolean) => void;
}) {
  return (
    <ModalShell>
      <FlipCard back="/card-back-charity.png" tone="bg-clay-500">
        <Stagger>
          <CardHead
            chip={g.charity.title}
            chipClass="bg-clay-100 text-clay-600"
            icon={HeartHandshake}
            title={g.charity.title}
            desc={ft ? g.ft.charityBody : g.charity.body}
          />
          <motion.div variants={item} className="mt-3">
            <span className="chip bg-gold-100 text-gold-600">
              <Coins className="h-3.5 w-3.5" />
              {g.charity.reward}
            </span>
          </motion.div>
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            <button className="btn-primary w-full" onClick={() => onChoice(true)}>
              {g.charity.donate(formatUZSCompact(donation))}
            </button>
            <button className="btn-ghost w-full" onClick={() => onChoice(false)}>
              {g.charity.decline}
            </button>
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function DoodadModal({
  card,
  player,
  onPay,
  onDecline,
  onDefer,
}: {
  card: DoodadCard;
  player: Player;
  onPay: (mode: DoodadMode) => void;
  onDecline: () => void;
  onDefer: () => void;
}) {
  // Qahramon chegirmasi bilan haqiqiy narx (engine bilan bir xil hisob)
  const disc = card.category ? expenseDiscountPct(player, card.category) : 0;
  const cost = disc < 0 ? Math.round(card.cost * (1 + disc / 100)) : card.cost;
  const terms = doodadCreditTerms(card, cost);
  const canCash = player.cash >= cost;
  const creditGate = doodadCreditGate(player, card, cost);
  const creditReason =
    creditGate === "score" ? g.doodad.creditScoreLow(player.creditScore) : creditGate === "down" ? g.doodad.creditNoDown : null;
  const forced = !canCash && creditGate !== null;
  return (
    <ModalShell>
      <FlipCard back="/card-back-charity.png" tone="bg-[#C24E4E]">
        <Stagger>
          <CardHead
            chip={g.doodad.title}
            chipClass="bg-[#C24E4E]/15 text-[#C24E4E]"
            icon={ShoppingBag}
            title={card.title}
            desc={card.desc}
          />
          <div className="mt-3">
            <FigureRow label={g.deal.price} value={formatUZS(cost)} tone="bad" />
            <FigureRow
              label={g.doodad.payCredit(formatUZSCompact(terms.monthlyPayment))}
              value={`${terms.months} oy · 24%/yil`}
            />
            <motion.p variants={item} className="mt-1 text-caption text-ink-400">
              {g.doodad.creditHint}
            </motion.p>
            {forced && (
              <motion.p variants={item} className="mt-1 text-caption text-clay-500">
                {g.doodad.forced}
              </motion.p>
            )}
          </div>
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            {/* 1 — Naqd to'lash */}
            {canCash && (
              <button className="btn-danger w-full" onClick={() => onPay("cash")}>
                {g.doodad.payCash(formatUZSCompact(cost))}
              </button>
            )}
            {/* 2 — Kreditga olish (annuitet 12 oy, 24%/yil; reyting ≥ 550) */}
            {!forced && (
              <button
                className={cn("btn-secondary w-full", creditGate !== null && "cursor-not-allowed opacity-50")}
                disabled={creditGate !== null}
                title={creditReason ?? undefined}
                onClick={() => onPay("credit")}
              >
                {g.doodad.payCredit(formatUZSCompact(terms.monthlyPayment))}
                {creditReason && (
                  <span className="mt-0.5 block text-[11px] font-normal text-clay-500">{creditReason}</span>
                )}
              </button>
            )}
            {/* 3 — Keyinroq olish: 3 oyga kechikadi, qaytganda narx +12% (limit 2) */}
            {(() => {
              const limitHit = player.deferCount >= MAX_DOODAD_DEFERS;
              return (
                <button
                  className={cn(
                    "w-full rounded-2xl border-2 border-amber-400 bg-white py-2.5 text-sm font-semibold text-amber-600 transition-colors",
                    limitHit ? "cursor-not-allowed opacity-50" : "hover:bg-amber-50"
                  )}
                  disabled={limitHit}
                  title={limitHit ? g.doodad.deferLimit : g.doodad.deferHint}
                  onClick={onDefer}
                >
                  {g.doodad.defer}
                  <span className="mt-0.5 block text-[11px] font-normal text-amber-600/80">
                    {limitHit ? g.doodad.deferLimit : g.doodad.deferHint}
                  </span>
                </button>
              );
            })()}
            {/* 4 — Hozircha olmay turish (faqat rad etiladigan xarajatlar) */}
            {card.canDecline && (
              <button className="btn-ghost w-full" title={card.declineText} onClick={onDecline}>
                {g.doodad.decline}
              </button>
            )}
            {/* Majburiy: naqd ham, kredit ham imkonsiz — majburiy kredit */}
            {forced && (
              <button className="btn-danger w-full" onClick={() => onPay("credit")}>
                {g.doodad.forced}
              </button>
            )}
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

/**
 * fix-15 (P4): Farzand ta'limi modali — 3 yoshda bog'cha, 7 yoshda maktab.
 * Tanlov → dars matni → "Davom etish".
 */
function ChildEduModal({
  player,
  onChoice,
}: {
  player: Player;
  onChoice: (edu: ChildEdu) => void;
}) {
  const ev = player.pendingChildEvent;
  const stage = ev?.stage ?? "kg";
  const options: ChildEdu[] = stage === "kg" ? ["none", "kg-state", "kg-private"] : ["sch-state", "sch-plus", "sch-private"];
  const [picked, setPicked] = useState<ChildEdu | null>(null);
  return (
    <ModalShell>
      <FlipCard back="/card-back-charity.png" tone="bg-[#C24E4E]">
        <Stagger>
          <CardHead
            chip={stage === "kg" ? "3 yosh" : "7 yosh"}
            chipClass="bg-[#C24E4E]/15 text-[#C24E4E]"
            icon={stage === "kg" ? Baby : GraduationCap}
            title={stage === "kg" ? g.childEdu.kgTitle : g.childEdu.schoolTitle}
            desc={stage === "kg" ? g.childEdu.kgDesc : g.childEdu.schoolDesc}
          />
          {picked === null ? (
            <motion.div variants={item} className="mt-auto space-y-2 pt-4">
              {options.map((edu) => {
                const opt = g.childEdu.options[edu];
                const cost = CHILD_EDU_COSTS[edu];
                return (
                  <ChoiceCard
                    key={edu}
                    icon={edu === "none" ? Wallet : GraduationCap}
                    title={opt.label}
                    sub={cost > 0 ? `+${formatUZSCompact(cost)}/oy` : opt.hint}
                    tone={edu === "none" ? "ghost" : "primary"}
                    onClick={() => setPicked(edu)}
                  />
                );
              })}
            </motion.div>
          ) : (
            <>
              <motion.p variants={item} className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-body-sm font-medium text-ink-900">
                {g.childEdu.options[picked].label} — {CHILD_EDU_COSTS[picked] > 0 ? `+${formatUZSCompact(CHILD_EDU_COSTS[picked])}/oy` : g.childEdu.options[picked].hint}
              </motion.p>
              <LessonBox text={g.childEdu.options[picked].lesson} />
              <motion.div variants={item} className="mt-auto pt-4">
                <button className="btn-primary w-full" onClick={() => onChoice(picked)}>
                  {g.childEdu.ok}
                </button>
              </motion.div>
            </>
          )}
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function BabyModal({ result, onDone }: { result: BabyResult; onDone: () => void }) {
  return (
    <ModalShell>
      <div className="p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7FA05A]/15 text-[#7FA05A]"
        >
          <Baby className="h-8 w-8" />
        </motion.div>
        <h3 className="mt-3 text-h3">{g.baby.congrats}</h3>
        <p className="mt-1 text-body-sm text-ink-600">
          {result.kind === "baby" ? g.baby.body : `${g.baby.feast} — ${g.baby.feastBody}`}
        </p>
        <p className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-money text-clay-500">
          {result.kind === "baby"
            ? `${g.baby.cost}: +${formatUZSCompact(result.cost)}/oy`
            : `−${formatUZSCompact(result.cost)}`}
        </p>
        <button className="btn-primary mt-5 w-full" onClick={onDone}>
          {g.baby.ok}
        </button>
      </div>
    </ModalShell>
  );
}

function DownsizedModal({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <ModalShell>
      <div className="p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#5A6B70]/15 text-[#5A6B70]"
        >
          <Briefcase className="h-8 w-8" />
        </motion.div>
        <h3 className="mt-3 text-h3">{g.downsized.title}</h3>
        <p className="mt-1 text-body-sm text-ink-600">{g.downsized.body(formatUZS(amount))}</p>
        <button className="btn-secondary mt-5 w-full" onClick={onDone}>
          {g.downsized.ok}
        </button>
      </div>
    </ModalShell>
  );
}

function FTDealModal({
  deal,
  player,
  onBuy,
  onPass,
}: {
  deal: FTDeal;
  player: Player;
  onBuy: () => void;
  onPass: () => void;
}) {
  const affordable = player.cash >= deal.price;
  const roi = Math.round((deal.cashflow * 12 * 100) / deal.price);
  return (
    <ModalShell>
      <FlipCard back="/card-back-market.png" goldRing tone="bg-gold-500">
        <Stagger>
          <CardHead
            chip={g.ft.dealTitle}
            chipClass="bg-gold-100 text-gold-600"
            icon={Rocket}
            title={deal.title}
          />
          <div className="mt-3">
            <FigureRow label={g.deal.price} value={formatUZS(deal.price)} />
            <FigureRow label={g.ft.cashflowRow} value={`+${formatUZS(deal.cashflow)}`} tone="good" />
            <motion.div variants={item} className="mt-1">
              <span className="chip bg-gold-100 text-gold-600">ROI {roi}%/yil</span>
            </motion.div>
          </div>
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            <button
              className={cn("btn-gold w-full", !affordable && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none")}
              disabled={!affordable}
              title={!affordable ? g.ft.cantAfford : undefined}
              onClick={onBuy}
            >
              {g.ft.buy}
            </button>
            <button className="btn-ghost w-full" onClick={onPass}>
              {g.ft.pass}
            </button>
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function FTDreamModal({
  dream,
  player,
  onBuy,
  onClose,
}: {
  dream: Dream;
  player: Player;
  onBuy: () => void;
  onClose: () => void;
}) {
  const affordable = player.cash >= dream.price;
  const net = dreamMonthlyNet(dream);
  return (
    <ModalShell>
      <div className="p-6 text-center">
        <motion.img
          src="/star-8.svg"
          alt=""
          className="mx-auto h-14 w-14 drop-shadow-[0_0_12px_rgba(217,164,65,0.8)]"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <h3 className="mt-2 text-h3">{g.ft.dreamTitle}</h3>
        <p className="mt-1 font-display text-xl font-semibold text-gold-600">{dream.title}</p>
        <p className="mt-1 text-body-sm text-ink-500">{dream.desc}</p>
        <p className="mt-2 text-money text-ink-900">{formatUZS(dream.price)}</p>
        {/* C3: upkeep / daromad / obro' satrlari */}
        <div className="mt-3 space-y-1">
          {net > 0 && (
            <p className="text-body-sm text-clay-500">{g.ft.dreamUpkeep(formatUZSCompact(net))}</p>
          )}
          {net < 0 && (
            <p className="text-body-sm text-emerald-600">{g.ft.dreamIncome(formatUZSCompact(-net))}</p>
          )}
          {net === 0 && !dream.creditPerMonth && (
            <p className="text-body-sm text-ink-400">{g.ft.dreamFree}</p>
          )}
          {dream.creditPerMonth && (
            <p className="text-body-sm text-emerald-600">{g.ft.dreamCredit}</p>
          )}
          <p className="text-caption normal-case tracking-normal text-gold-600">
            {g.ft.dreamHoldRule}
            {player.dreamBought && ` · ${g.ft.dreamHoldProgress(player.dreamHeldMonths, DREAM_HOLD_MONTHS)}`}
          </p>
        </div>
        <div className="mt-5 space-y-2">
          <button
            className={cn("btn-gold w-full", !affordable && "cursor-not-allowed !bg-none !bg-sand-200 !text-ink-400 !shadow-none")}
            disabled={!affordable}
            onClick={onBuy}
          >
            {g.ft.dreamBuy(formatUZSCompact(dream.price))}
          </button>
          {!affordable && <p className="text-body-sm text-ink-400">{g.ft.dreamWait}</p>}
          <button className="btn-ghost w-full" onClick={onClose}>
            {g.market.keep}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function FTInfoModal({
  title,
  body,
  tone,
  onDone,
}: {
  title: string;
  body: string;
  tone: "gold" | "slate";
  onDone: () => void;
}) {
  return (
    <ModalShell>
      <div className="p-6 text-center">
        <div
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
            tone === "gold" ? "bg-gold-100 text-gold-600" : "bg-[#5A6B70]/15 text-[#5A6B70]"
          )}
        >
          {tone === "gold" ? <Coins className="h-8 w-8" /> : <Briefcase className="h-8 w-8" />}
        </div>
        <h3 className="mt-3 text-h3">{title}</h3>
        <p className="mt-1 text-body-sm text-ink-600">{body}</p>
        <button className={cn("mt-5 w-full", tone === "gold" ? "btn-gold" : "btn-secondary")} onClick={onDone}>
          {g.event.ok}
        </button>
      </div>
    </ModalShell>
  );
}

function WeekendModal({
  card,
  player,
  onChoice,
}: {
  card: WeekendCard;
  player: Player;
  onChoice: (choice: WeekendChoice) => void;
}) {
  const cost = weekendSpendCost(player, card);
  const canAfford = cost <= player.cash;
  const spendSub = card.spend.addInstallment
    ? `${formatUZSCompact(card.spend.addInstallment.monthlyPayment)}/oy × ${card.spend.addInstallment.months} oy`
    : cost > 0
      ? `−${formatUZSCompact(cost)}`
      : card.spend.note;
  return (
    <ModalShell>
      <FlipCard back="/card-back-charity.png" tone="bg-[#4E8D7C]">
        <Stagger>
          <CardHead
            chip={g.weekend.title}
            chipClass="bg-[#4E8D7C]/15 text-[#4E8D7C]"
            icon={Palmtree}
            title={card.title}
            desc={card.desc}
          />
          <motion.div variants={item} className="mt-auto space-y-2 pt-4">
            <ChoiceCard
              icon={Wallet}
              title={card.spend.label}
              sub={spendSub}
              tone="primary"
              disabled={!canAfford}
              reason={g.deal.cantAfford}
              onClick={() => onChoice("spend")}
            />
            <ChoiceCard
              icon={Palmtree}
              title={card.free.label}
              sub={card.free.cost > 0 ? `−${formatUZSCompact(card.free.cost)}` : card.free.note}
              tone="ghost"
              onClick={() => onChoice("free")}
            />
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function LifeEventModal({
  card,
  result,
  onDone,
}: {
  card: LifeEventCard;
  result: string;
  onDone: () => void;
}) {
  return (
    <ModalShell>
      <FlipCard back="/card-back-market.png" goldRing tone="bg-gold-500">
        <Stagger>
          <CardHead
            chip={g.lifeEvent.title}
            chipClass="bg-gold-100 text-gold-600"
            icon={Star}
            title={card.title}
            desc={card.desc}
          />
          <motion.p variants={item} className="mt-3 rounded-xl bg-gold-100/60 px-3 py-2 text-body-sm font-medium text-ink-900">
            {result}
          </motion.p>
          <motion.div variants={item} className="mt-auto pt-4">
            <button className="btn-gold w-full" onClick={onDone}>
              {g.lifeEvent.ok}
            </button>
          </motion.div>
        </Stagger>
      </FlipCard>
    </ModalShell>
  );
}

function LoanOffersModal({
  player,
  exchange,
  onTake,
  onClose,
}: {
  player: Player;
  exchange: ExchangeState;
  onTake: (offer: LoanOffer, principal: number) => void;
  onClose: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const opts = { exchange };
  return (
    <ModalShell wide>
      <div className="p-6">
        <span className="chip bg-emerald-100 text-emerald-700">
          <Landmark className="h-3.5 w-3.5" />
          {g.loans.offers}
        </span>
        <p className="mt-2 text-body-sm text-ink-600">{g.loans.offersSub}</p>
        <div className="mt-4 space-y-4">
          {LOAN_OFFERS.map((offer) => {
            const { gate, minScore, cap } = loanOfferGate(player, offer, opts);
            // daromad limiti: maksimal summa 6× oylik daromaddan oshmaydi
            const availAmounts = offer.amounts.filter((a) => a <= cap);
            const principal =
              amounts[offer.id] && availAmounts.includes(amounts[offer.id])
                ? amounts[offer.id]
                : (availAmounts[availAmounts.length - 1] ?? offer.amounts[0]);
            const monthly = annuityPayment(principal, offer.monthlyRate, offer.months);
            const lockReason =
              gate === "score"
                ? g.credit.scoreTooLow(player.creditScore, minScore)
                : gate === "business"
                  ? g.loans.requiresBusiness
                  : gate === "cap"
                    ? g.credit.incomeCap(formatUZSCompact(cap))
                    : null;
            return (
              <div
                key={offer.id}
                className={cn(
                  "rounded-2xl border p-4",
                  gate ? "border-sand-200 bg-sand-50 opacity-70" : "border-sand-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{offer.title}</p>
                    <p className="mt-0.5 text-caption text-ink-600">{offer.desc}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {minScore > 0 && (
                        <span
                          className={cn(
                            "chip",
                            player.creditScore >= minScore
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-clay-100 text-clay-600"
                          )}
                        >
                          {g.credit.requiresScore(minScore)}
                        </span>
                      )}
                      {cap < offer.maxPrincipal && (
                        <span className="chip bg-sky-100 text-sky-700">
                          {g.credit.incomeCap(formatUZSCompact(cap))}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="chip shrink-0 bg-sand-100 text-ink-600">{g.loans.months(offer.months)}</span>
                </div>
                {lockReason ? (
                  <p className="mt-2 text-caption text-clay-500">{lockReason}</p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availAmounts.map((a) => (
                        <button
                          key={a}
                          className={cn(
                            "chip transition-colors",
                            principal === a
                              ? "bg-emerald-600 text-white"
                              : "bg-sand-100 text-ink-600 hover:bg-sand-200"
                          )}
                          onClick={() => setAmounts((m) => ({ ...m, [offer.id]: a }))}
                        >
                          {formatUZSCompact(a)}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-caption text-ink-600">
                        {g.loans.monthly}: <span className="text-money-sm text-clay-500">−{formatUZSCompact(monthly)}/oy</span>
                      </span>
                      <button className="btn-primary !px-4 !py-2 !text-sm" onClick={() => onTake(offer, principal)}>
                        {g.loans.take}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn-ghost mt-4 w-full" onClick={onClose}>
          <X className="h-4 w-4" />
          {g.loans.close}
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------------- Birja (fond birjasi) ---------------- */

const SECTOR_CHIP: Record<Sector, string> = {
  bank: "bg-sky-100 text-sky-700",
  sanoat: "bg-sand-200 text-ink-600",
  telekom: "bg-emerald-100 text-emerald-700",
  energetika: "bg-gold-100 text-gold-600",
  qishloq: "bg-[#7FA05A]/15 text-[#5C7A3E]",
  texnologiya: "bg-[#7A5CA8]/15 text-[#7A5CA8]",
  oltin: "bg-gold-100 text-gold-600",
  obligatsiya: "bg-clay-100 text-clay-600",
};

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 72;
  const h = 22;
  if (points.length < 2) return <svg width={w} height={h} aria-hidden />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <polyline
        points={d}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        className={up ? "stroke-emerald-600" : "stroke-clay-500"}
      />
    </svg>
  );
}

const BIRJA_INTRO_KEY = "cfuz-birja-intro";

function ExchangeModal({
  state,
  player,
  onBuy,
  onSell,
  onClose,
}: {
  state: GameState;
  player: Player;
  onBuy: (securityId: string, qty: number) => void;
  onSell: (securityId: string, qty: number) => void;
  onClose: () => void;
}) {
  const [intro, setIntro] = useState(() => {
    try {
      return localStorage.getItem(BIRJA_INTRO_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [trade, setTrade] = useState<{ sec: Security; mode: "buy" | "sell" } | null>(null);
  const [qtyText, setQtyText] = useState("1");
  const ex = state.exchange;

  /* bir martalik onboarding: 3 qisqa qoida */
  if (intro) {
    return (
      <ModalShell wide onClose={onClose}>
        <div className="p-6 text-center">
          <span className="chip bg-emerald-100 text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            {g.exchange.title}
          </span>
          <h3 className="mt-3 text-h3">{g.exchange.introTitle}</h3>
          <div className="mt-4 space-y-2 text-left">
            {g.exchange.introRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-sand-100 px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-body-sm text-ink-700">{rule}</p>
              </div>
            ))}
          </div>
          <button
            className="btn-primary mt-5 w-full"
            onClick={() => {
              try {
                localStorage.setItem(BIRJA_INTRO_KEY, "1");
              } catch {
                /* ignore */
              }
              setIntro(false);
            }}
          >
            {g.exchange.introOk}
          </button>
        </div>
      </ModalShell>
    );
  }

  /* sotib olish / sotish dialogi */
  if (trade) {
    const sec = trade.sec;
    const price = ex.prices[sec.id] ?? sec.basePrice;
    const holding = player.portfolio.find((h) => h.securityId === sec.id);
    const maxQ = trade.mode === "buy" ? maxBuyQty(player, price) : holding?.qty ?? 0;
    const parsed = Math.floor(Number(qtyText) || 0);
    const qty = Math.max(0, Math.min(parsed, maxQ));
    const total = qty * price;
    const fee = tradeFee(total);
    const valid = qty >= 1;
    return (
      <ModalShell onClose={() => setTrade(null)}>
        <div className="p-6">
          <span className={cn("chip", SECTOR_CHIP[sec.sector])}>{g.exchange.sectors[sec.sector]}</span>
          <h3 className="mt-2 text-h3 !text-[20px]">
            {trade.mode === "buy" ? g.exchange.buyTitle(sec.ticker) : g.exchange.sellTitle(sec.ticker)}
          </h3>
          <p className="mt-0.5 text-body-sm text-ink-600">{sec.name}</p>
          <div className="mt-3">
            <FigureRow label={g.exchange.price} value={formatUZS(price)} tone="info" />
            {holding && (
              <FigureRow label={g.exchange.youOwn(holding.qty)} value={formatUZSCompact(holding.avgBuyPrice)} />
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-body-sm text-ink-600">{g.exchange.qty}</label>
            <input
              type="number"
              min={0}
              max={maxQ}
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              className="w-24 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-money-sm text-ink-900 outline-none focus:border-emerald-600"
            />
            <button className="chip bg-sand-100 text-ink-600 hover:bg-sand-200" onClick={() => setQtyText(String(maxQ))}>
              {g.exchange.max}
            </button>
            <span className="ml-auto text-caption text-ink-400">
              {g.exchange.max}: {maxQ}
            </span>
          </div>
          <div className="mt-3">
            <FigureRow label={g.exchange.total} value={formatUZS(total)} />
            <FigureRow label={`${g.exchange.fee} (${g.exchange.feePct})`} value={formatUZS(fee)} tone="bad" />
            <FigureRow
              label={trade.mode === "buy" ? g.exchange.toPay : g.exchange.toReceive}
              value={formatUZS(trade.mode === "buy" ? total + fee : total - fee)}
              tone={trade.mode === "buy" ? "bad" : "good"}
            />
          </div>
          <div className="mt-4 space-y-2">
            <button
              className={cn("btn-primary w-full", !valid && "cursor-not-allowed opacity-50")}
              disabled={!valid}
              onClick={() => {
                if (trade.mode === "buy") onBuy(sec.id, qty);
                else onSell(sec.id, qty);
                setTrade(null);
                setQtyText("1");
              }}
            >
              {g.exchange.confirm}
              {valid && ` · ${qty} × ${formatUZSCompact(price)}`}
            </button>
            <button className="btn-ghost w-full" onClick={() => setTrade(null)}>
              {g.exchange.cancel}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  const pfValue = portfolioValue(player, ex);
  return (
    <ModalShell xl onClose={onClose}>
      <div className="p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="chip bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              {g.exchange.title}
            </span>
            <p className="mt-2 text-body-sm text-ink-600">{g.exchange.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-caption text-ink-400">{g.statement.cashTitle}</p>
            <MoneyDisplay value={player.cash} size="sm" className="text-ink-900" showCoin={false} />
            {pfValue > 0 && (
              <>
                <p className="mt-1 text-caption text-ink-400">{g.exchange.portfolioValue}</p>
                <MoneyDisplay value={pfValue} size="sm" className="text-emerald-700" showCoin={false} />
              </>
            )}
          </div>
        </div>
        {hasDiversificationBonus(player) && (
          <p className="mt-2">
            <span className="chip bg-gold-100 text-gold-600">
              <Sparkles className="h-3.5 w-3.5" />
              {g.exchange.diversification}
            </span>
          </p>
        )}
        <div className="mt-3 space-y-2">
          {SECURITIES.map((sec) => {
            const price = ex.prices[sec.id] ?? sec.basePrice;
            const change = priceChangePct(ex, sec);
            const hist = ex.history[sec.id] ?? [sec.basePrice];
            const holding = player.portfolio.find((h) => h.securityId === sec.id);
            const up = change >= 0;
            return (
              <div key={sec.id} className="rounded-2xl border border-sand-200 bg-white p-3" title={sec.description}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-money-sm font-bold text-ink-900">{sec.ticker}</span>
                      <span className={cn("chip !px-2 !py-0 !text-[10px]", SECTOR_CHIP[sec.sector])}>
                        {g.exchange.sectors[sec.sector]}
                      </span>
                      <span className="chip bg-sand-100 !px-2 !py-0 !text-[10px] text-ink-400">
                        {sec.dividendYield > 0
                          ? g.exchange.dividendYield((sec.dividendYield * 100).toFixed(1).replace(".", ","))
                          : g.exchange.noDividend}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-caption text-ink-600">{sec.name}</p>
                  </div>
                  <div className="hidden sm:block">
                    <Sparkline points={hist} up={up} />
                  </div>
                  <div className="w-28 shrink-0 text-right">
                    <MoneyDisplay value={price} size="sm" className="text-ink-900" showCoin={false} />
                    <p className={cn("text-money-sm", up ? "text-emerald-600" : "text-clay-500")}>
                      {up ? "+" : "−"}
                      {Math.abs(change).toFixed(1).replace(".", ",")}%
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {holding && (
                    <span className="chip bg-emerald-100 !px-2 !py-0.5 !text-[10px] text-emerald-700">
                      {g.exchange.youOwn(holding.qty)}
                    </span>
                  )}
                  <span className="flex-1" />
                  <button
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                    onClick={() => {
                      setTrade({ sec, mode: "buy" });
                      setQtyText("1");
                    }}
                  >
                    {g.exchange.buy}
                  </button>
                  <button
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      holding
                        ? "bg-clay-100 text-clay-600 hover:bg-clay-200"
                        : "cursor-not-allowed bg-sand-100 text-ink-400"
                    )}
                    disabled={!holding}
                    onClick={() => {
                      setTrade({ sec, mode: "sell" });
                      setQtyText(String(holding?.qty ?? 1));
                    }}
                  >
                    {g.exchange.sell}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-ghost mt-4 w-full" onClick={onClose}>
          <X className="h-4 w-4" />
          {g.exchange.close}
        </button>
      </div>
    </ModalShell>
  );
}

const BOT_ICONS: Record<string, LucideIcon> = {
  deal: TrendingUp,
  market: Store,
  event: Zap,
  charity: HeartHandshake,
  doodad: ShoppingBag,
  baby: Baby,
  work: Briefcase,
  coins: Coins,
  rocket: Rocket,
  home: Home,
  sparkles: Sparkles,
};

function BotAutoModal({ m }: { m: Extract<ModalState, { kind: "bot" }> }) {
  const Icon = BOT_ICONS[m.icon] ?? Sparkles;
  const chip =
    m.tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : m.tone === "bad"
        ? "bg-clay-100 text-clay-600"
        : m.tone === "gold"
          ? "bg-gold-100 text-gold-600"
          : "bg-sand-100 text-ink-600";
  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4"
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full max-w-[340px] rounded-2xl border border-sand-200 bg-white p-4 shadow-modal">
        <span className={cn("chip", chip)}>
          <Icon className="h-3.5 w-3.5" />
          {m.title}
        </span>
        <div className="mt-2 space-y-1">
          {m.lines.map((l, i) => (
            <p key={i} className="text-body-sm text-ink-600">
              {l}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Dispatcher ---------------- */

export default function CardModals({
  modal,
  player,
  state,
  handlers,
}: {
  modal: ModalState | null;
  player: Player;
  state: GameState;
  handlers: ModalHandlers;
}) {
  // birja har doim inson o'yinchi portfeli bilan ishlaydi
  const human = state.players.find((p) => !p.isBot) ?? player;
  return (
    <AnimatePresence>
      {modal?.kind === "deal-pick" && <DealPickModal key="dp" onPick={handlers.onPickDeal} />}
      {modal?.kind === "deal" && (
        <DealModal key={`d-${modal.deal.id}`} deal={modal.deal} player={player} analyst={modal.analyst} onBuy={handlers.onBuyDeal} onPass={handlers.onPassDeal} />
      )}
      {modal?.kind === "market" && (
        <MarketModal key={`m-${modal.card.id}`} card={modal.card} target={modal.target} offer={modal.offer} onSell={handlers.onSellMarket} onClose={handlers.onCloseMarket} />
      )}
      {modal?.kind === "event" && (
        <EventModal key={`e-${modal.card.id}`} card={modal.card} result={modal.result} lesson={modal.lesson} onDone={handlers.onEventDone} />
      )}
      {modal?.kind === "dilemma" && (
        <DilemmaModal key={`di-${modal.card.id}`} card={modal.card} onChoice={handlers.onDilemma} />
      )}
      {modal?.kind === "migration" && (
        <MigrationModal key="mig" card={modal.card} onChoice={handlers.onMigration} />
      )}
      {modal?.kind === "charity" && (
        <CharityModal key="ch" donation={modal.donation} onChoice={handlers.onCharity} />
      )}
      {modal?.kind === "ft-charity" && (
        <CharityModal key="fch" donation={modal.amount} ft onChoice={handlers.onFTCharity} />
      )}
      {modal?.kind === "doodad" && (
        <DoodadModal key={`dd-${modal.card.id}`} card={modal.card} player={player} onPay={handlers.onDoodad} onDecline={handlers.onDoodadDecline} onDefer={handlers.onDoodadDefer} />
      )}
      {modal?.kind === "weekend" && (
        <WeekendModal key={`we-${modal.card.id}`} card={modal.card} player={player} onChoice={handlers.onWeekend} />
      )}
      {modal?.kind === "life-event" && (
        <LifeEventModal key={`le-${modal.card.id}`} card={modal.card} result={modal.result} onDone={handlers.onLifeEventDone} />
      )}
      {modal?.kind === "loan-offers" && (
        <LoanOffersModal key="loans" player={player} exchange={state.exchange} onTake={handlers.onTakeLoan} onClose={handlers.onCloseLoans} />
      )}
      {modal?.kind === "exchange" && (
        <ExchangeModal
          key="exchange"
          state={state}
          player={human}
          onBuy={handlers.onExchangeBuy}
          onSell={handlers.onExchangeSell}
          onClose={handlers.onCloseExchange}
        />
      )}
      {modal?.kind === "baby" && <BabyModal key="bb" result={modal.result} onDone={handlers.onBabyDone} />}
      {modal?.kind === "child-edu" && player.pendingChildEvent && (
        <ChildEduModal key="ce" player={player} onChoice={handlers.onChildEdu} />
      )}
      {modal?.kind === "downsized" && (
        <DownsizedModal key="ds" amount={modal.amount} onDone={handlers.onDownsizedDone} />
      )}
      {modal?.kind === "ft-deal" && (
        <FTDealModal key={`ft-${modal.deal.id}`} deal={modal.deal} player={player} onBuy={handlers.onFTBuy} onPass={handlers.onFTPass} />
      )}
      {modal?.kind === "ft-dream" && (
        <FTDreamModal key="ftd" dream={modal.dream} player={player} onBuy={handlers.onFTDreamBuy} onClose={handlers.onFTDreamClose} />
      )}
      {modal?.kind === "ft-info" && (
        <FTInfoModal key="fti" title={modal.title} body={modal.body} tone={modal.tone} onDone={handlers.onFTInfoDone} />
      )}
      {modal?.kind === "bot" && <BotAutoModal key={`bot-${modal.title}-${modal.lines[0] ?? ""}`} m={modal} />}
    </AnimatePresence>
  );
}
