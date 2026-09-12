/**
 * OQIM: Startap Imperiyasi — hodisa modali, oy hisoboti, yakun oynasi.
 */
import { useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Gift, Landmark, RotateCcw, Sparkles, Trophy, Zap } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Content as DialogContentPrimitive } from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import type { EventCard, EventKind, MonthReport, StartupState } from "@/lib/startup/types";
import * as E from "@/lib/startup/engine";
import { Flower } from "./OfficeScene";
import { PrimaryButton } from "./tabs";

const fm = E.fmtM;
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const KIND: Record<EventKind, { label: string; color: string; Icon: typeof Zap }> = {
  loss: { label: "Hodisa · yo'qotish", color: "text-clay-700", Icon: AlertTriangle },
  risk: { label: "Hodisa · xavf", color: "text-clay-700", Icon: AlertTriangle },
  luck: { label: "Hodisa · omad", color: "text-emerald-700", Icon: Sparkles },
  /* `gold-700`, `gold-600` emas: yorliq 11px va krem fonda 600 atigi 3.09 berardi. */
  mixed: { label: "Hodisa · aralash", color: "text-gold-700", Icon: Zap },
  neutral: { label: "Hodisa", color: "text-ink-600", Icon: Gift },
};

/**
 * Pastdan chiqadigan varaq — hodisa kartasi, oy hisoboti va yakun oynasi.
 *
 * Radix `Dialog` ustida, `CardModals.tsx` dagi `ModalShell` bilan bir xil
 * shartnomada: `role="dialog"`, `aria-modal`, fokus oyna ichiga kiradi va
 * Tab undan chiqmaydi. Ilgari bu oddiy `div` edi — sichqonchasiz o'yinchi
 * varaq ochilganini sezmasdi va Tab ortidagi tab-barga tushib ketardi.
 *
 * VARAQLAR YOPILMAYDI. Ularning har biri o'yinchidan QAROR kutadi (hodisada
 * tanlov, hisobotda «keyingi oyga»), shuning uchun Escape ham, tashqariga
 * bosish ham to'xtatiladi: yopilsa, o'yinchi qarorsiz, qotib qolgan ekranda
 * qolardi. `ModalShell` `onClose` siz chaqirilganda aynan shunday qiladi.
 *
 * NOMI `DialogTitle` ORQALI: sarlavhani varaqning o'zi emas, CHAQIRUVCHI
 * chizadi (hodisada `<h2>`, hisobotda yorliq `<span>`), ya'ni umumiy ramka
 * unga id qo'ya olmaydi. Ko'rinadigan matnning O'ZI uzatiladi va u
 * ekran o'quvchi uchun `sr-only` sarlavhaga qo'yiladi.
 */
function Sheet({ children, label }: { children: React.ReactNode; label: string }) {
  /* Yopilgach fokus varaqni ochgan tugmaga qaytadi (ModalShell bilan bir xil). */
  const opener = useRef(typeof document !== "undefined" ? document.activeElement : null);
  return (
    <Dialog open>
      <DialogPortal>
        <DialogOverlay className="z-[70] bg-emerald-700/70 backdrop-blur-[2px]" />
        <DialogContentPrimitive
          aria-describedby={undefined}
          onCloseAutoFocus={e => { if (opener.current instanceof HTMLElement && opener.current.isConnected) { e.preventDefault(); opener.current.focus(); } }}
          onEscapeKeyDown={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-y-auto rounded-t-[28px] border-[3px] border-b-0 border-emerald-700 bg-sand-50 px-4 pb-8 pt-3 outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border-b-[3px]"
        >
          {/* Nom `aria-label` da; Radix sarlavhani baribir talab qiladi. */}
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}>
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-sand-200" />
            {children}
          </motion.div>
        </DialogContentPrimitive>
      </DialogPortal>
    </Dialog>
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
    <Sheet label={ev.title}>
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
              {/*
                OLTIN TUGMADA `ink-900`, `emerald-900/70` EMAS. Eskisi
                gradient ustida 2.42–2.67 berardi — `axe` uni ko'ra olmasdi
                («background gradient» sababli «incomplete»), shuning uchun
                nosozlik hisobotlarda umuman chiqmasdi. Piksel o'lchovi
                gradientning bu tugma ostidagi haqiqiy oralig'ini berdi
                (#c38e30…#d6a13f) va unda faqat TO'LIQ `ink-900` 4.5 dan
                o'tadi (4.94–5.76): `emerald-900` sof holida ham 3.35 da
                qoladi, chunki oltin fon juda yorug'.
                So'nuqlik endi rangdan emas — o'lcham va qalinlikdan.
              */}
              {c.sub && <span className={cn("text-xs", i === 0 ? "font-semibold text-ink-900" : "text-ink-600")}>{c.sub}{cant ? " · naqd yetarli emas" : ""}</span>}
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
      <span className={cn("font-money text-[13px] font-bold tabular-nums", v < 0 ? "text-clay-700" : bold ? "text-emerald-700" : "text-ink-900")}>{v < 0 ? "−" : v > 0 && bold ? "+" : ""}{fm(Math.abs(v))}</span>
    </div>
  );
  return (
    <Sheet label={`${r.month}-oy hisoboti`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">{r.month}-oy hisoboti</span>
        <span className="text-[11px] font-bold text-ink-600">{s.companyName}</span>
      </div>
      {/*
        MANFIY SARLAVHA `clay-700`, `clay-600` EMAS, va so'nuq yozuvlar 85%.
        Eski juftlik — `clay-600` (#B45A38) ustida `white/70` va `white/80` —
        3.16 va 3.62 berardi, WCAG AA esa bu o'lchamdagi matndan 4.5 talab
        qiladi. Yashil oyda o'sha `white/70` zo'rg'a o'tardi (4.54), ya'ni
        nosozlik faqat ZARAR ko'rgan oylarda chiqardi — hisobot eng muhim
        bo'lgan paytda.
        `clay-600` ustida hech qanday shaffof oq yetarli emas: 95% ham atigi
        4.42, faqat sof oq (4.71) o'tadi — u esa katta raqamdan farq qilmay,
        ierarxiyani yo'qotardi. Shuning uchun fon bir qadam quyuqlashtirildi
        (`clay-700` — modalning o'zida manfiy raqamlar allaqachon shu rangda)
        va uchala so'nuq qatlam bitta darajaga keltirildi.
        O'lchov: yashilda 5.85, terrakotada 5.07 — ikkalasi ham AA dan yuqori.
      */}
      <div className={cn("mt-3 rounded-2xl px-4 py-3", r.net >= 0 ? "bg-emerald-700" : "bg-clay-700")}>
        <div className="text-[11px] font-semibold text-white/85">Naqd o'zgarishi</div>
        <div className="font-money text-[26px] font-bold text-white">{r.net >= 0 ? "+" : "−"}{fm(Math.abs(r.net))} <span className="text-[13px] font-semibold text-white/85">so'm</span></div>
        <div className="text-[12px] font-semibold text-white/85">Naqd: {fm(r.cashAfter)} · foydalanuvchi {r.usersAfter.toLocaleString("ru-RU")} · sifat {r.qualityAfter} · kayfiyat {r.moraleAfter}</div>
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
      {s.cash < 0 && <p className="mt-3 rounded-xl bg-clay-100 px-3 py-2 text-[12px] font-semibold text-clay-700">Naqd manfiy. 2 oylik xarajatdan ko'proq minusga tushsangiz — bankrotlik.</p>}
      <div className="mt-4"><PrimaryButton onClick={onNext}>{r.month + 1}-oyga o'tish <ArrowRight className="h-5 w-5" /></PrimaryButton></div>
    </Sheet>
  );
}

export function EndOverlay({ s, onRestart, onHome }: { s: StartupState; onRestart: () => void; onHome: () => void }) {
  const won = s.phase === "won";
  return (
    <Dialog open>
      <DialogPortal>
        <DialogOverlay className={cn("z-[70]", won ? "bg-emerald-700/90" : "bg-ink-900/85")} />
        <DialogContentPrimitive
          aria-describedby={undefined}
          /* Partiya tugadi — bu oynani yopib o'yinga qaytib bo'lmaydi. */
          onEscapeKeyDown={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-sand-50 p-6 text-center shadow-modal outline-none"
        >
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: EASE }}>
        <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full", won ? "bg-gold-500" : "bg-sand-200")}>{won ? <Trophy className="h-8 w-8 text-emerald-900" /> : <AlertTriangle className="h-8 w-8 text-clay-700" />}</div>
        <DialogTitle className="mt-4 font-display text-[24px] font-bold text-ink-900">{won ? "Unicorn!" : "Bankrotlik"}</DialogTitle>
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
        </DialogContentPrimitive>
      </DialogPortal>
    </Dialog>
  );
}
