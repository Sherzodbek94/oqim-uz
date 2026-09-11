/**
 * OQIM: Startap Imperiyasi — hodisa modali, oy hisoboti, yakun oynasi.
 */
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Gift, Landmark, RotateCcw, Sparkles, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventCard, EventKind, MonthReport, StartupState } from "@/lib/startup/types";
import * as E from "@/lib/startup/engine";
import { Flower } from "./OfficeScene";
import { PrimaryButton } from "./tabs";

const fm = E.fmtM;
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const KIND: Record<EventKind, { label: string; color: string; Icon: typeof Zap }> = {
  loss: { label: "Hodisa · yo'qotish", color: "text-clay-600", Icon: AlertTriangle },
  risk: { label: "Hodisa · xavf", color: "text-clay-600", Icon: AlertTriangle },
  luck: { label: "Hodisa · omad", color: "text-emerald-700", Icon: Sparkles },
  mixed: { label: "Hodisa · aralash", color: "text-gold-600", Icon: Zap },
  neutral: { label: "Hodisa", color: "text-ink-600", Icon: Gift },
};

function Sheet({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-emerald-700/70 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
        className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border-[3px] border-b-0 border-emerald-700 bg-sand-50 px-4 pb-8 pt-3 sm:rounded-[28px] sm:border-b-[3px]" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-sand-200" />
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Higgsfield kartasi bor hodisalar (`public/startup/events/<id>.webp`).
 *
 * Hozir `balance.ts` dagi o'n beshtasining HAMMASIDA rasm bor, lekin ro'yxat
 * qo'lda qoldirildi: yangi karta qo'shilib, rasmi hali chizilmagan bo'lsa,
 * modal singan rasm belgisi emas, quyidagi gradient + belgi blokini
 * ko'rsatadi. Rasm chizilgach — shu yerga id qo'shiladi.
 */
const ART = new Set([
  "inflation", "fx", "outage", "tax_audit", "grant", "talent", "dev_quit",
  "cyber", "partnership", "competitor", "award", "family", "navruz", "hashar", "intern",
]);

export function EventModal({ ev, s, onChoose }: { ev: EventCard; s: StartupState; onChoose: (id: string) => void }) {
  const k = KIND[ev.kind];
  return (
    <Sheet>
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-extrabold uppercase tracking-[0.08em]", k.color)}>{k.label}</span>
        <span className="text-[11px] font-bold text-ink-600">Karta {s.eventsSeen + 1}</span>
      </div>
      <div className="relative mt-3 flex h-[min(34dvh,260px)] items-center justify-center overflow-hidden rounded-2xl bg-gradient-emerald">
        {ART.has(ev.id) ? (
          /*
            `object-contain`: karta o'z ramkasi va oltin gul burchaklari bilan
            chizilgan, `cover` esa aynan o'sha ramkani kesib tashlardi. Balandlik
            `dvh` ga bog'langan — past telefonda rasm tanlov tugmalarini
            ekrandan itarib yubormasligi kerak.
          */
          <img src={`/startup/events/${ev.id}.webp`} alt="" width={660} height={880} loading="eager" decoding="async" className="h-full w-auto object-contain" />
        ) : (
          <>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gold-500 shadow-[0_0_0_12px_rgba(217,164,65,0.18),0_0_0_26px_rgba(217,164,65,0.08)]"><k.Icon className="h-10 w-10 text-emerald-900" /></div>
            {[["top-3 left-3"], ["top-3 right-3"], ["bottom-3 left-3"], ["bottom-3 right-3"]].map(([c]) => <div key={c} className={cn("absolute", c)}><Flower size={18} /></div>)}
          </>
        )}
      </div>
      <h2 className="mt-3 font-display text-[22px] font-bold leading-tight text-ink-900">{ev.title}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-900">{ev.text}</p>
      <div className="mt-4 flex flex-col gap-2">
        {(ev.choices ?? [{ id: "ok", label: "Davom etish", sub: "" }]).map((c, i) => {
          const cant = c.cost !== undefined && s.cash < c.cost;
          return (
            <button key={c.id} type="button" disabled={cant} onClick={() => onChoose(c.id)}
              className={cn("flex flex-col items-start rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.99] disabled:opacity-50",
                i === 0 ? "bg-gradient-gold text-ink-900 shadow-[0_5px_0_#B98428]" : "border border-sand-200 bg-white text-ink-900")}>
              <span className="text-[14px] font-extrabold">{c.label}</span>
              {c.sub && <span className={cn("text-xs", i === 0 ? "font-semibold text-emerald-900/70" : "text-ink-600")}>{c.sub}{cant ? " · naqd yetarli emas" : ""}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function ReportModal({ r, s, onNext }: { r: MonthReport; s: StartupState; onNext: () => void }) {
  const op = r.revenue - r.payroll - r.rent - r.marketing - r.tax;
  const line = (l: string, v: number, bold = false) => (
    <div className="flex justify-between border-b border-sand-100 py-1.5 last:border-0">
      <span className={cn("text-[13px]", bold ? "font-extrabold" : "font-semibold", "text-ink-900")}>{l}</span>
      <span className={cn("font-money text-[13px] font-bold tabular-nums", v < 0 ? "text-clay-600" : bold ? "text-emerald-700" : "text-ink-900")}>{v < 0 ? "−" : v > 0 && bold ? "+" : ""}{fm(Math.abs(v))}</span>
    </div>
  );
  return (
    <Sheet>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">{r.month}-oy hisoboti</span>
        <span className="text-[11px] font-bold text-ink-600">{s.companyName}</span>
      </div>
      <div className={cn("mt-3 rounded-2xl px-4 py-3", r.net >= 0 ? "bg-emerald-700" : "bg-clay-600")}>
        <div className="text-[11px] font-semibold text-white/70">Naqd o'zgarishi</div>
        <div className="font-money text-[26px] font-bold text-white">{r.net >= 0 ? "+" : "−"}{fm(Math.abs(r.net))} <span className="text-[13px] font-semibold text-white/70">so'm</span></div>
        <div className="text-[12px] font-semibold text-white/80">Naqd: {fm(r.cashAfter)} · foydalanuvchi {r.usersAfter.toLocaleString("ru-RU")} · sifat {r.qualityAfter} · kayfiyat {r.moraleAfter}</div>
      </div>
      {r.event && (
        <div className="mt-3 flex gap-2.5 rounded-2xl border border-sand-200 bg-white px-3.5 py-3">
          <Landmark className={cn("h-5 w-5 flex-none", KIND[r.event.kind].color)} />
          <div className="text-[12px] leading-snug text-ink-900"><b>{r.event.title}.</b> {r.event.effect}</div>
        </div>
      )}
      <div className="mt-3 rounded-2xl border border-sand-200 bg-white px-4 py-1">
        {line("Daromad", r.revenue)}
        {line("Oyliklar", -r.payroll)}
        {r.rent > 0 && line("Arenda", -r.rent)}
        {r.marketing > 0 && line("Marketing", -r.marketing)}
        {r.tax > 0 && line("Soliq / audit", -r.tax)}
        {line("Operatsion foyda", op, true)}
        {r.interest > 0 && line("Kredit foizi", -r.interest)}
        {r.loanPayments > 0 && line("Qarz to'lovi", -r.loanPayments)}
        {r.other !== 0 && line("Hodisa / jihoz", r.other)}
      </div>
      {r.notes.length > 0 && <ul className="mt-3 flex flex-col gap-1 px-1 text-[12px] text-ink-600">{r.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>}
      {s.cash < 0 && <p className="mt-3 rounded-xl bg-clay-100 px-3 py-2 text-[12px] font-semibold text-clay-600">Naqd manfiy. 2 oylik xarajatdan ko'proq minusga tushsangiz — bankrotlik.</p>}
      <div className="mt-4"><PrimaryButton onClick={onNext}>{r.month + 1}-oyga o'tish <ArrowRight className="h-5 w-5" /></PrimaryButton></div>
    </Sheet>
  );
}

export function EndOverlay({ s, onRestart, onHome }: { s: StartupState; onRestart: () => void; onHome: () => void }) {
  const won = s.phase === "won";
  return (
    <div className={cn("fixed inset-0 z-[80] flex items-center justify-center p-4", won ? "bg-emerald-700/90" : "bg-ink-900/85")}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: EASE }} className="w-full max-w-[400px] rounded-[28px] bg-sand-50 p-6 text-center shadow-modal">
        <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full", won ? "bg-gold-500" : "bg-sand-200")}>{won ? <Trophy className="h-8 w-8 text-emerald-900" /> : <AlertTriangle className="h-8 w-8 text-clay-600" />}</div>
        <h2 className="mt-4 font-display text-[24px] font-bold text-ink-900">{won ? "Unicorn!" : "Bankrotlik"}</h2>
        <p className="mt-2 text-[14px] text-ink-600">{won ? `«${s.companyName}» ${s.month} oyda 100 mlrd so'mlik kompaniyaga aylandi.` : s.lostReason}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-left">
          {[["Oylar", String(s.month)], ["Eng yuqori qiymat", fm(s.bestValuation)], ["Bosqich", `${s.stageReached + 1} / 5`]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white px-3 py-2"><div className="text-[10px] font-semibold text-ink-600">{l}</div><div className="font-money text-[14px] font-bold text-ink-900">{v}</div></div>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton onClick={onRestart}><RotateCcw className="h-5 w-5" /> Yangi startap</PrimaryButton>
          <button type="button" onClick={onHome} className="btn-secondary w-full">Bosh sahifa</button>
        </div>
      </motion.div>
    </div>
  );
}
