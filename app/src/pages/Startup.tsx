/**
 * OQIM — /startap route: "Startap Imperiyasi" rejimi (GDD v1.0).
 * Ekranlar: SETUP → (DECIDE ⇄ EVENT → REPORT)* → WON | LOST.
 * Holat: useState + sof engine funksiyalari; avtosave localStorage (oqim-startup-v1).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { BarChart3, Building2, ChevronLeft, Package, Rocket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StartupState } from "@/lib/startup/types";
import * as E from "@/lib/startup/engine";
import { clearStartup, loadStartup, saveStartup } from "@/lib/startup/save";
import { Flower } from "./startup/OfficeScene";
import { FinanceTab, OfficeTab, ProductTab, TeamTab, type Actions, type Tab } from "./startup/tabs";
import { EndOverlay, EventModal, ReportModal } from "./startup/modals";

const fm = E.fmtM;

const TABS: { id: Tab; label: string; Icon: typeof Building2 }[] = [
  { id: "office", label: "Ofis", Icon: Building2 },
  { id: "finance", label: "Moliya", Icon: BarChart3 },
  { id: "team", label: "Jamoa", Icon: Users },
  { id: "product", label: "Mahsulot", Icon: Package },
];

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
function calendar(month: number) {
  const start = new Date(); const y = start.getFullYear(); const m0 = start.getMonth();
  const idx = (m0 + month - 1) % 12; const year = y + Math.floor((m0 + month - 1) / 12);
  return `${year} ${MONTHS[idx]}`;
}

export default function Startup() {
  const navigate = useNavigate();
  const [state, setState] = useState<StartupState | null>(() => loadStartup());
  const [tab, setTab] = useState<Tab>("office");
  const [name, setName] = useState("");

  useEffect(() => { if (state) saveStartup(state); }, [state]);

  const update = useCallback((fn: (s: StartupState) => StartupState) => setState(s => (s ? fn(s) : s)), []);

  const actions: Actions = useMemo(() => ({
    hire: id => update(s => E.hire(s, id)),
    fire: id => update(s => E.fire(s, id)),
    setSprint: k => update(s => E.setSprint(s, k)),
    toggleMarketing: c => update(s => E.toggleMarketing(s, c)),
    setMonetization: m => update(s => E.setMonetization(s, m)),
    setTax: t => update(s => E.setTax(s, t)),
    buyEquipment: id => update(s => E.buyEquipment(s, id)),
    upgradeOffice: () => update(s => E.upgradeOffice(s)),
    unlockProduct: id => update(s => E.unlockProduct(s, id)),
    takeLoan: src => update(s => E.takeLoan(s, src)),
    repayLoan: id => update(s => E.repayLoan(s, id)),
    endMonth: () => update(s => E.endMonth(s)),
    goTab: t => setTab(t),
  }), [update]);

  const restart = () => { clearStartup(); setState(null); setTab("office"); };

  // ---------- SETUP ----------
  if (!state) {
    return (
      <div className="min-h-dvh bg-sand-50">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-8 pt-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-600"><ChevronLeft className="h-4 w-4" /> Bosh sahifa</Link>
          <div className="mt-8 flex items-center gap-2"><Flower size={28} /><span className="font-display text-[15px] font-extrabold tracking-[0.04em] text-emerald-700">OQIM</span></div>
          <h1 className="mt-3 font-display text-[32px] font-bold leading-[1.05] text-ink-900">Startap Imperiyasi</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">Toshkentdagi bir xonali garajdan boshlab, o'zbek realiyasida — inflyatsiya, dollar kursi, elektr uzilishlari, IT Park imtiyozlari — IT-startapni unicorn darajasiga yetkazing.</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[["15 mln", "start kapital"], ["1 oy", "= 1 aylana"], ["100 mlrd", "g'alaba"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-sand-200 bg-white px-3 py-3"><div className="font-money text-[16px] font-bold text-ink-900">{v}</div><div className="text-[11px] text-ink-600">{l}</div></div>
            ))}
          </div>
          <label className="mt-6 block text-xs font-bold uppercase tracking-[0.06em] text-ink-600">Kompaniya nomi</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={28} placeholder="masalan, Oqim Tech" className="mt-2 h-12 w-full rounded-2xl border border-sand-200 bg-white px-4 text-[15px] font-semibold text-ink-900 outline-none focus:border-emerald-600" />
          <div className="mt-auto pt-8">
            <button type="button" onClick={() => setState(E.newStartup(name))} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold text-[15px] font-extrabold text-ink-900 shadow-[0_5px_0_#B98428] active:translate-y-[3px] active:shadow-[0_2px_0_#B98428]">
              <Rocket className="h-5 w-5" /> Startapni boshlash
            </button>
            <p className="mt-3 text-center text-[11px] text-ink-400">Ro'yxatdan o'tish shart emas — o'yin brauzeringizda saqlanadi.</p>
          </div>
        </div>
      </div>
    );
  }

  const s = state;
  const flow = E.monthlyFlow(s);
  const lastReport = s.reports[s.reports.length - 1];

  return (
    <div className="min-h-dvh bg-sand-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
        {/* HUD */}
        {/*
          PLITKALAR `black/10`, `white/10` EMAS.

          Oq qoplama zumrad gradientni yoritib yuborardi (o'lchangan fon
          #3C7560…#41846A) va shunda USTIDAGI HECH QANDAY och matn WCAG AA
          dan o'tolmasdi — sof oq ham eng yorug' plitkada 4.11 da qolardi.
          Ya'ni muammo matn rangida emas, fonda edi: yorliqlar 3.68–4.46,
          «Oylik oqim» qiymati esa `gold-500` bilan atigi 2.22.

          Qoplama teskari burilgach fon quyuqlashadi (#297056…#205643) va
          butun sarlavha bo'sh joy bilan o'tadi: yorliqlar 4.91–7.04,
          oq qiymatlar 5.92–8.49, manfiy `clay-100` 4.79–6.87.

          `gold-500` esa baribir o'tmaydi (quyuq plitkada ham 2.63) —
          to'yingan oltin zumrad ustida shunchaki past kontrastli. Musbat
          oqim uchun `gold-100` olindi: oltin ohang saqlanadi, nisbat 5.04.
        */}
        <header className="sticky top-0 z-40 rounded-b-[26px] bg-gradient-emerald px-4 pb-3.5 pt-3 shadow-card">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" aria-label="Bosh sahifa"><Flower size={22} /><span className="font-display text-[14px] font-extrabold tracking-[0.04em] text-white">OQIM</span></Link>
            <div className="flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5 text-[12px]"><span className="font-bold text-white">{s.month}-oy</span><span className="text-emerald-100">· {calendar(s.month)}</span></div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[["Naqd pul", fm(s.cash), s.cash < 0 ? "text-clay-100" : "text-white"], ["Oylik oqim", `${flow >= 0 ? "+" : ""}${fm(flow)}`, flow >= 0 ? "text-gold-100" : "text-clay-100"], ["Qiymat", fm(E.valuation(s)), "text-white"]].map(([l, v, c]) => (
              <div key={l} className="rounded-xl border border-white/15 bg-black/10 px-3 py-2">
                <div className="text-[10.5px] font-semibold text-emerald-100">{l}</div>
                <div className={cn("truncate font-money text-[15px] font-bold", c)}>{v}</div>
              </div>
            ))}
          </div>
          {/* Plitkasiz qator — yalang' gradient ustida `emerald-100` 4.13 da qolardi. */}
          <div className="mt-1.5 truncate px-1 text-[11px] text-emerald-50">{s.companyName} · {s.log[s.log.length - 1]}</div>
        </header>

        <main className="flex-1 px-4 pb-4 pt-3">
          {tab === "office" && <OfficeTab s={s} a={actions} />}
          {tab === "finance" && <FinanceTab s={s} a={actions} />}
          {tab === "team" && <TeamTab s={s} a={actions} />}
          {tab === "product" && <ProductTab s={s} a={actions} />}
        </main>

        <nav className="sticky bottom-0 z-40 flex gap-1.5 border-t border-sand-200 bg-sand-50/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur" aria-label="Bo'limlar">
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={on ? "page" : undefined}
                className={cn("flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors", on ? "bg-sand-200 font-extrabold text-emerald-700" : "text-ink-400 hover:bg-sand-100")}>
                <t.Icon className="h-5 w-5" />{t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/*
        `AnimatePresence` SIZ: varaqlar endi Radix `Dialog` ustida va ular
        chiqish animatsiyasiga ega emas — o'rami faqat ikkala varaqni bir
        vaqtda daraxtda ushlab turish xavfini qo'shardi, bu esa a11y
        daraxtida ikkita `role="dialog"` demakdir va fokus qaytarish
        navbatini chalkashtirardi.
      */}
        {s.phase === "event" && s.pendingEvent && <EventModal key="ev" ev={s.pendingEvent} s={s} onChoose={id => update(x => E.resolveEvent(x, id))} />}
        {s.phase === "report" && lastReport && <ReportModal key="rep" r={lastReport} s={s} onNext={() => { update(x => E.nextMonth(x)); setTab("office"); }} />}
      {(s.phase === "won" || s.phase === "lost") && <EndOverlay s={s} onRestart={restart} onHome={() => { restart(); navigate("/"); }} />}
    </div>
  );
}
