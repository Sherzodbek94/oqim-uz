/**
 * OQIM — fix-9 amaliyot markazlari:
 *  📚 "Bilim olish" markazi (F2) — pulga bilim sotib olish (cooldown bilan).
 *  🤝 "Mijoz topish" markazi (F3) — S/B/I kvadrant uchun marketing kanallari.
 * Ikkalasi ham ModalShell'da; tugmalar cooldown/naqd/cap sabablari bilan bloklanadi.
 */
import {
  BookOpen,
  GraduationCap,
  Handshake,
  Instagram,
  Megaphone,
  MonitorPlay,
  Percent,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUZSCompact } from "@/lib/format";
import { g } from "@/lib/game/strings";
import {
  CLIENT_ACTIONS,
  KNOWLEDGE_ACTIONS,
  clientActionCost,
  clientActionGate,
  clientIncome,
  effectiveClients,
  knowledgeActionGate,
  type ActionGate,
} from "@/lib/game/engine";
import { CLIENT_CAP_NO_MANAGER, KNOWLEDGE_MAX, type GameState, type Player } from "@/lib/game/types";
import MoneyDisplay from "@/components/MoneyDisplay";
import { ModalShell } from "./CardModals";

const KNOWLEDGE_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  webinar: MonitorPlay,
  course: GraduationCap,
  seminar: Users,
};

const CLIENT_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  telegram: Send,
  referal: Handshake,
  networking: Users,
  promo: Percent,
};

/** Gate sababini o'zbekcha matnga o'giradi. */
function gateReasonText(gate: ActionGate): string | null {
  if (gate.ok) return null;
  switch (gate.reason) {
    case "cooldown":
      return g.actions.cooldownNote(gate.monthsLeft ?? 1);
    case "cash":
      return g.actions.noCash;
    case "cap":
      return g.actions.maxKnowledge;
    case "quadrant":
      return g.actions.clientsLocked;
    case "no-clients":
      return g.actions.noClients;
    default:
      return null;
  }
}

interface ActionRowProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  effect: string;
  /** fix-12: kutilgan natija qatori (ehtimollar shaffof) */
  expect?: string;
  /** fix-12: eng yaxshi arzon kanal — emerald halqa + "Tavsiya" badge */
  best?: boolean;
  cost: number;
  perClient?: boolean;
  gate: ActionGate;
  onUse: () => void;
  tone: "emerald" | "gold";
}

function ActionRow({ icon: Icon, title, desc, effect, expect, best, cost, perClient, gate, onUse, tone }: ActionRowProps) {
  const reason = gateReasonText(gate);
  return (
    <div
      className={cn(
        "rounded-2xl border border-sand-200 bg-sand-50 p-3",
        best && "border-emerald-500 ring-2 ring-emerald-500/60"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-card",
            tone === "emerald" ? "bg-emerald-600" : "bg-gold-500 text-ink-900"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-body-sm font-semibold text-ink-900">
              <span className="truncate">{title}</span>
              {best && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {g.actions.recommended}
                </span>
              )}
            </p>
            <span className="flex shrink-0 items-center gap-1 text-money-sm text-ink-600">
              −<MoneyDisplay value={cost} size="sm" showCoin={false} />
              {perClient && <span className="text-caption text-ink-400">({g.actions.perClient})</span>}
            </span>
          </div>
          <p className="mt-0.5 text-caption normal-case text-ink-600">{desc}</p>
          <p className="mt-0.5 text-caption normal-case text-ink-400">{effect}</p>
        </div>
      </div>
      <button
        className={cn(
          "mt-2.5 w-full rounded-full py-1.5 text-body-sm font-semibold transition-colors",
          gate.ok
            ? tone === "emerald"
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gold-500 text-ink-900 hover:bg-gold-600 hover:text-white"
            : "cursor-not-allowed bg-sand-200 text-ink-400"
        )}
        disabled={!gate.ok}
        onClick={onUse}
        title={reason ?? undefined}
      >
        {reason ?? g.actions.use}
      </button>
      {expect && <p className="mt-1.5 text-center text-[11px] leading-snug text-ink-400">{expect}</p>}
    </div>
  );
}

/* ---------------- 📚 Bilim olish markazi (F2) ---------------- */

export function KnowledgeCenterModal({
  state,
  player,
  onUse,
  onClose,
}: {
  state: GameState;
  player: Player;
  onUse: (actionId: string) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell wide onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-h4">{g.actions.knowledgeTitle}</h3>
            <p className="text-caption normal-case text-ink-600">
              {g.actions.knowledgeNow(player.knowledge, KNOWLEDGE_MAX)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-body-sm text-ink-600">{g.actions.knowledgeSub}</p>
        <div className="mt-3 space-y-2.5">
          {KNOWLEDGE_ACTIONS.map((def) => {
            const copy = g.actions.knowledge[def.id as keyof typeof g.actions.knowledge];
            return (
              <ActionRow
                key={def.id}
                icon={KNOWLEDGE_ICONS[def.id] ?? BookOpen}
                title={copy.title}
                desc={copy.desc}
                effect={copy.effect}
                cost={def.cost}
                gate={knowledgeActionGate(state, player, def.id)}
                onUse={() => onUse(def.id)}
                tone="emerald"
              />
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- 🤝 Mijoz topish markazi (F3) ---------------- */

export function ClientsCenterModal({
  state,
  player,
  onUse,
  onClose,
}: {
  state: GameState;
  player: Player;
  onUse: (actionId: string) => void;
  onClose: () => void;
}) {
  const active = effectiveClients(player).length;
  // fix-12: har kanalning kutilgan oylik daromadi (mln so'm birligida emas, so'mda)
  // EV = ehtimol × o'rtacha fee; eng yaxshi EV/narx nisbatiga ega arzon kanal "Tavsiya".
  const expectedIncome: Record<string, number> = {
    instagram: 0.65 * 1_150_000,
    telegram: 0.5 * 750_000,
    referal: Math.min(Math.max(player.clients.length, 1), 3) * 0.4 * 900_000,
    networking: 1.25 * 1_500_000,
    promo: 2 * 600_000,
  };
  let bestId: string | null = null;
  let bestRatio = 0;
  for (const def of CLIENT_ACTIONS) {
    const cost = clientActionCost(player, def);
    if (cost <= 0 || !clientActionGate(state, player, def.id).ok) continue;
    const ratio = (expectedIncome[def.id] ?? 0) / cost;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestId = def.id;
    }
  }
  return (
    <ModalShell wide onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-600">
            <Megaphone className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-h4">{g.actions.clientsTitle}</h3>
            <p className="text-caption normal-case text-ink-600">
              {g.actions.clientsNow(active, player.clients.length)}
              {clientIncome(player) > 0 && ` · +${formatUZSCompact(clientIncome(player))}/oy`}
            </p>
          </div>
        </div>
        <p className="mt-2 text-body-sm text-ink-600">{g.actions.clientsSub}</p>
        <p className={cn("mt-1.5 text-caption normal-case", player.hasManager ? "text-emerald-700" : "text-gold-600")}>
          {player.hasManager ? g.actions.managerActive : g.actions.capNote(CLIENT_CAP_NO_MANAGER)}
        </p>
        <div className="mt-3 space-y-2.5">
          {CLIENT_ACTIONS.map((def) => {
            const copy = g.actions.clients[def.id as keyof typeof g.actions.clients];
            return (
              <ActionRow
                key={def.id}
                icon={CLIENT_ICONS[def.id] ?? Megaphone}
                title={copy.title}
                desc={copy.desc}
                effect={copy.effect}
                expect={copy.expect}
                best={def.id === bestId}
                cost={clientActionCost(player, def)}
                perClient={def.perClient}
                gate={clientActionGate(state, player, def.id)}
                onUse={() => onUse(def.id)}
                tone="gold"
              />
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
