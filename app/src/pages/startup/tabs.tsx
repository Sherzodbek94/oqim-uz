/**
 * OQIM: Startap Imperiyasi — to'rtta tab: Ofis · Moliya · Jamoa · Mahsulot.
 * Mobil-first (390px), desktopda markazlashgan ustun.
 */
import { ArrowRight, Briefcase, Building2, Check, ChevronRight, Flag, Landmark, Megaphone, Plus, Rocket, ShieldCheck, Sparkles, Users, Wallet, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EquipmentId, LoanSource, MarketingChannel, Monetization, ProductId, SprintKind, StartupState, TaxRegime } from "@/lib/startup/types";
import * as E from "@/lib/startup/engine";
import { BALANCE, EQUIPMENT, LOANS, MARKETING, OFFICES, PRODUCTS, ROLES, STAGES } from "@/lib/startup/balance";
import OfficeScene from "./OfficeScene";

export interface Actions {
  hire: (id: string) => void;
  fire: (id: string) => void;
  setSprint: (k: SprintKind) => void;
  toggleMarketing: (c: MarketingChannel) => void;
  setMonetization: (m: Monetization) => void;
  setTax: (t: TaxRegime) => void;
  buyEquipment: (id: EquipmentId) => void;
  upgradeOffice: () => void;
  unlockProduct: (id: ProductId) => void;
  takeLoan: (s: LoanSource) => void;
  repayLoan: (id: string) => void;
  endMonth: () => void;
  goTab: (t: Tab) => void;
}

export type Tab = "office" | "finance" | "team" | "product";

const fm = E.fmtM;

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="font-display text-[15px] font-bold text-emerald-700">{children}</h3>
      {right && <span className="text-xs font-semibold text-ink-600">{right}</span>}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-sand-200 bg-white p-4 shadow-card", className)}>{children}</div>;
}

function Row({ icon, title, sub, onClick, right, active, disabled }: { icon: React.ReactNode; title: string; sub: string; onClick?: () => void; right?: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left transition-all active:scale-[0.99] disabled:opacity-50",
        active ? "border-emerald-600 ring-2 ring-emerald-600/20" : "border-sand-200 hover:border-emerald-300",
      )}
    >
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sand-100 text-emerald-700">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-ink-900">{title}</div>
        <div className="truncate text-xs text-ink-600">{sub}</div>
      </div>
      {right ?? <ChevronRight className="h-4 w-4 text-ink-400" />}
    </button>
  );
}

export function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold text-[15px] font-extrabold text-ink-900 shadow-[0_5px_0_#B98428] transition-all active:translate-y-[3px] active:shadow-[0_2px_0_#B98428] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ---------- OFIS ----------
export function OfficeTab({ s, a }: { s: StartupState; a: Actions }) {
  const morale = s.staff.length ? Math.round(s.staff.reduce((x, e) => x + e.morale, 0) / s.staff.length) : 70;
  const team = E.teamOk(s);
  const decisions = [
    { icon: <Users className="h-5 w-5" />, title: "Xodim yollash", sub: `${s.candidates.length} nomzod bozorda · oyliklar ${fm(E.payroll(s))}/oy`, tab: "team" as Tab },
    { icon: <Rocket className="h-5 w-5" />, title: `Sprint: ${sprintName(s.sprint)}`, sub: team.ok ? `Sifat ${Math.round(s.quality)} / 100` : `Jamoa yetishmaydi: ${team.missing.join(", ")}`, tab: "product" as Tab },
    { icon: <Megaphone className="h-5 w-5" />, title: "Marketing", sub: s.marketing.length ? `${s.marketing.length} kanal · ${fm(E.marketingCost(s))}/oy` : "Faol kampaniya yo'q", tab: "product" as Tab },
    { icon: <Wallet className="h-5 w-5" />, title: "Kredit / soliq", sub: E.debtTotal(s) ? `Qarz: ${fm(E.debtTotal(s))}` : "Do'stlar qarzi: 20 mln, 0%", tab: "finance" as Tab },
  ];
  const upgrade = E.canUpgradeOffice(s);
  const next = OFFICES[s.office + 1];
  const mods = E.activeMods(s);
  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3">
        <div className="flex items-center justify-between px-1 text-xs font-semibold">
          <span className="text-emerald-700">{OFFICES[s.office].name} · {s.staff.length + 1} kishi</span>
          <span className={cn(morale >= 50 ? "text-ink-600" : morale >= 30 ? "text-gold-600" : "text-clay-600")}>Kayfiyat {morale}</span>
        </div>
        <OfficeScene level={s.office} className="mt-1 w-full" />
        {mods.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 pt-1">
            {mods.map(m => <span key={m.id} className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">{m.label} · {m.until - s.month + 1} oy</span>)}
          </div>
        )}
        {next && (
          <button type="button" onClick={a.upgradeOffice} disabled={!upgrade.ok} className="mt-2 flex w-full items-center gap-2 rounded-xl bg-sand-50 px-3 py-2 text-left text-xs disabled:opacity-70">
            <Building2 className="h-4 w-4 flex-none text-emerald-700" />
            <span className="flex-1 text-ink-600"><b className="text-ink-900">{next.name}</b> · {fm(next.rent)}/oy · {upgrade.ok ? "ko'chish mumkin" : upgrade.reason}</span>
            {upgrade.ok && <ArrowRight className="h-4 w-4 text-emerald-700" />}
          </button>
        )}
      </Card>
      <SectionTitle right={`${s.month}-oy`}>Bu oy qarorlari</SectionTitle>
      <div className="flex flex-col gap-2">
        {decisions.map(d => <Row key={d.title} icon={d.icon} title={d.title} sub={d.sub} onClick={() => a.goTab(d.tab)} />)}
      </div>
      <PrimaryButton onClick={a.endMonth}>Oyni yakunlash <ArrowRight className="h-5 w-5" /></PrimaryButton>
      <p className="px-2 text-center text-[11px] text-ink-400">Prognoz: daromad {fm(E.revenueEstimate(s))} · xarajat {fm(E.monthlyCosts(s))} · oqim <b className={E.monthlyFlow(s) >= 0 ? "text-emerald-700" : "text-clay-600"}>{fm(E.monthlyFlow(s))}</b></p>
    </div>
  );
}

function sprintName(k: SprintKind) {
  return k === "feature" ? "yangi funksiya" : k === "bugfix" ? "xatolarni tuzatish" : k === "techdebt" ? "texnik qarz" : "yo'q";
}

// ---------- MOLIYA ----------
export function FinanceTab({ s, a }: { s: StartupState; a: Actions }) {
  const last = s.reports.slice(-6);
  const bars = last.length ? last : [];
  const mx = Math.max(1, ...bars.map(r => Math.abs(r.revenue - r.payroll - r.rent - r.marketing - r.tax)));
  const rev = E.revenueEstimate(s), pay = E.payroll(s), rn = E.rent(s), mk = E.marketingCost(s);
  const profit = rev - pay - rn - mk - (s.tax === "itpark" ? BALANCE.itParkAuditCost : 0);
  const tax = s.tax === "simple" ? Math.max(0, profit * BALANCE.simpleTaxRate) : s.tax === "itpark" ? BALANCE.itParkAuditCost : 0;
  const dr = E.debtRatio(s);
  const line = (l: string, v: number, bold = false, neg = false) => (
    <div className="flex justify-between border-b border-sand-100 py-2 last:border-0">
      <span className={cn("text-[13px]", bold ? "font-extrabold text-ink-900" : "font-semibold text-ink-900")}>{l}</span>
      <span className={cn("font-money text-[13px] font-bold tabular-nums", neg ? "text-clay-600" : bold ? "text-emerald-700" : "text-ink-900")}>{v < 0 ? "−" : ""}{fm(Math.abs(v))}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Naqd oqim — oxirgi 6 oy</SectionTitle>
      <Card className="px-2 py-3">
        {bars.length === 0 ? (
          <p className="px-2 text-center text-xs text-ink-400">Birinchi oy yakunlangach grafik paydo bo'ladi.</p>
        ) : (
          <div className="flex gap-1">
            {bars.map(r => {
              const v = r.revenue - r.payroll - r.rent - r.marketing - r.tax;
              const h = Math.round(Math.abs(v) / mx * 60);
              return (
                <div key={r.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative h-[124px] w-full">
                    <div className="absolute left-[20%] right-[20%] rounded-md" style={{ top: v >= 0 ? 62 - h : 62, height: h, background: v >= 0 ? "#D9A441" : "#C9744C" }} />
                    <div className="absolute inset-x-0 top-[62px] h-px bg-sand-200" />
                  </div>
                  <span className="text-[11px] font-semibold text-ink-600">{r.month}-oy</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <SectionTitle>{s.month}-oy prognozi</SectionTitle>
      <Card className="px-4 py-1">
        {line(`Daromad: ${E.productSpec(s).name}`, rev)}
        {line(`Oyliklar (${s.staff.length} xodim)`, -pay, false, pay > 0)}
        {line(`Arenda: ${OFFICES[s.office].name}`, -rn, false, rn > 0)}
        {line("Marketing", -mk, false, mk > 0)}
        {line(s.tax === "itpark" ? "IT Park audit" : s.tax === "simple" ? "Soliq (12%, foydadan)" : "Soliq (yashirin)", -tax, false, tax > 0)}
        {E.interestMonthly(s) > 0 && line("Kredit foizi", -E.interestMonthly(s), false, true)}
        {line("Sof oqim", E.monthlyFlow(s), true, E.monthlyFlow(s) < 0)}
      </Card>
      <div className={cn("flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs", dr > 3 ? "bg-clay-100" : "bg-sand-100")}>
        <ShieldCheck className={cn("h-5 w-5 flex-none", dr > 3 ? "text-clay-600" : "text-emerald-700")} />
        <span className="leading-snug text-ink-900">
          Qarz yuki: <b>{dr === 0 ? "yo'q" : dr === Infinity ? "∞ (oqim manfiy)" : `${dr.toFixed(1)}×`}</b> {dr > 3 ? "— xavfli" : "— xavfsiz"}. Kompaniya qiymati: <b>{fm(E.valuation(s))}</b>.
        </span>
      </div>

      <SectionTitle>Soliq rejimi</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {([["simple", "Oddiy", "12% foydadan"], ["itpark", "IT Park", "0% · 5+ xodim"], ["shadow", "Yashirin", "0% · 5% xavf"]] as const).map(([id, name, sub]) => (
          <button key={id} type="button" onClick={() => a.setTax(id)} disabled={id === "itpark" && s.staff.length < BALANCE.itParkMinStaff}
            className={cn("flex flex-col items-start rounded-xl px-3 py-2.5 text-left disabled:opacity-50", s.tax === id ? "bg-emerald-700 text-white" : "bg-sand-100 text-ink-900")}>
            <span className="text-[13px] font-extrabold">{name}</span>
            <span className={cn("text-[11px]", s.tax === id ? "text-emerald-100" : "text-ink-600")}>{sub}</span>
          </button>
        ))}
      </div>

      <SectionTitle right={E.debtTotal(s) ? `Jami qarz: ${fm(E.debtTotal(s))}` : undefined}>Kredit va investitsiya</SectionTitle>
      <div className="flex flex-col gap-2">
        {s.loans.map(l => (
          <Row key={l.id} icon={<Landmark className="h-5 w-5" />} title={LOANS[l.source as keyof typeof LOANS].name}
            sub={`Qoldiq ${fm(l.principal)} · ${l.monthly ? `${fm(l.monthly)}/oy` : `${l.monthsLeft} oydan keyin`} · ${l.monthsLeft} oy`}
            right={<button type="button" onClick={() => a.repayLoan(l.id)} disabled={s.cash < l.principal} className="rounded-full bg-sand-100 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-40">Yopish</button>} />
        ))}
        {(Object.keys(LOANS) as (keyof typeof LOANS)[]).map(src => {
          const c = E.canTakeLoan(s, src); const spec = LOANS[src];
          return (
            <Row key={src} icon={<Wallet className="h-5 w-5" />} title={`${spec.name} · ${fm(spec.amount)}`}
              sub={c.ok ? spec.desc : c.reason!} disabled={!c.ok} onClick={() => a.takeLoan(src)}
              right={<Plus className="h-5 w-5 text-emerald-700" />} />
          );
        })}
        <Row icon={<Sparkles className="h-5 w-5" />} title="Angel investor" sub="v1.0 da: 100 mln–2 mlrd, 10–25% ulush" disabled />
      </div>

      <SectionTitle>Jihozlar</SectionTitle>
      <div className="flex flex-col gap-2">
        {EQUIPMENT.map(eq => {
          const owned = eq.perEmployee ? s.deskSets >= s.staff.length + 1 : s.equipment.includes(eq.id);
          const cost = eq.perEmployee ? (s.staff.length + 1 - s.deskSets) * eq.cost : eq.cost;
          return (
            <Row key={eq.id} icon={<Wrench className="h-5 w-5" />} title={eq.name} sub={owned ? "Mavjud" : `${fm(cost)} · ${eq.desc}`}
              disabled={owned || s.cash < cost} onClick={() => a.buyEquipment(eq.id)}
              right={owned ? <Check className="h-5 w-5 text-emerald-700" /> : <Plus className="h-5 w-5 text-emerald-700" />} />
          );
        })}
      </div>
    </div>
  );
}

// ---------- JAMOA ----------
function Bar({ label, v, color }: { label: string; v: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-[46px] text-[10px] font-bold text-ink-600">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-sand-200"><div className="h-1.5 rounded-full" style={{ width: `${v}%`, background: color ?? "#24604A" }} /></div>
      <span className="w-5 text-right text-[10px] font-extrabold text-ink-900">{v}</span>
    </div>
  );
}

function Avatar({ role, talent }: { role: string; talent?: boolean }) {
  const bg = talent ? "#F7ECD2" : role === "founder" ? "#EAE1CF" : "#DDEEE3";
  return (
    <div className="flex h-11 w-11 flex-none items-end justify-center overflow-hidden rounded-xl" style={{ background: bg }}>
      <svg width="34" height="36" viewBox="0 0 34 36"><circle cx="17" cy="12" r="9" fill="#F1C9A6" /><path d="M8 12 Q17 -2 26 12 Z" fill="#1B4A38" /><path d="M3 36 Q17 20 31 36 Z" fill={role === "founder" ? "#D9A441" : "#24604A"} /></svg>
    </div>
  );
}

export function TeamTab({ s, a }: { s: StartupState; a: Actions }) {
  const moraleColor = (m: number) => (m >= 50 ? "#24604A" : m >= 30 ? "#D9A441" : "#C9744C");
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle right={`Oyliklar: ${fm(E.payroll(s))}/oy`}>Jamoa</SectionTitle>
      <div className="flex flex-col gap-2">
        <Card className="flex gap-3 p-3">
          <Avatar role="founder" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between"><span className="text-[14px] font-extrabold text-ink-900">{s.founderName}</span><span className="text-xs font-bold text-emerald-700">—</span></div>
            <span className="text-xs text-ink-600">Dasturchi · Boshqaruv</span>
            <Bar label="Kod" v={BALANCE.founderSkill} />
          </div>
        </Card>
        {s.staff.map(e => (
          <Card key={e.id} className="flex gap-3 p-3">
            <Avatar role={e.role} talent={e.talent} />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-extrabold text-ink-900">{e.name}{e.talent && <span className="ml-1.5 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-extrabold text-ink-900">Talant</span>}</span>
                <span className="text-xs font-bold text-emerald-700">{fm(e.salary)}</span>
              </div>
              <span className="text-xs text-ink-600">{ROLES[e.role].name}</span>
              <Bar label={ROLES[e.role].skillLabel} v={e.skill} />
              <Bar label="Kayfiyat" v={Math.round(e.morale)} color={moraleColor(e.morale)} />
              <button type="button" onClick={() => a.fire(e.id)} className="self-end text-[11px] font-semibold text-ink-400 hover:text-clay-600">Bo'shatish (−{fm(e.salary)})</button>
            </div>
          </Card>
        ))}
        {s.staff.length === 0 && <p className="px-2 text-xs text-ink-400">Hozircha yolg'izsiz. Birinchi xodimni oqim musbat bo'lganda yollang.</p>}
      </div>
      <SectionTitle right="Har oy yangilanadi">Yollash bozori</SectionTitle>
      <div className="flex flex-col gap-2">
        {s.candidates.map(c => {
          const fee = E.hiringCost(s, c.salary);
          return (
            <div key={c.id} className="flex items-center gap-2.5 rounded-2xl border border-dashed border-sand-200 bg-sand-50 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink-900">{c.name}{c.talent && <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px]">Talant</span>}</div>
                <div className="truncate text-[11px] text-ink-600">{ROLES[c.role].name} · {ROLES[c.role].skillLabel.toLowerCase()} {c.skill} · {fm(c.salary)}/oy · yollash {fm(fee)}</div>
              </div>
              <button type="button" onClick={() => a.hire(c.id)} disabled={s.cash < fee} aria-label={`${c.name}ni yollash`}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-700 text-white disabled:opacity-40"><Plus className="h-5 w-5" /></button>
            </div>
          );
        })}
      </div>
      <p className="px-2 text-[11px] text-ink-400">Rollar: {Object.values(ROLES).map(r => r.name).join(" · ")}. HR bo'lsa yollash −30%.</p>
    </div>
  );
}

// ---------- MAHSULOT ----------
export function ProductTab({ s, a }: { s: StartupState; a: Actions }) {
  const p = E.productSpec(s);
  const idx = PRODUCTS.findIndex(x => x.id === p.id);
  const next = PRODUCTS[idx + 1];
  const canNext = next ? E.canUnlockProduct(s, next.id) : { ok: false, reason: "Eng yuqori daraja" };
  const hist = s.reports.slice(-9).map(r => r.usersAfter);
  const pts = [...hist, s.users];
  const mxU = Math.max(...pts, 1), mnU = Math.min(...pts);
  const poly = pts.map((u, i) => `${(i / Math.max(1, pts.length - 1)) * 310},${100 - ((u - mnU) / Math.max(1, mxU - mnU)) * 80}`).join(" ");
  const team = E.teamOk(s);
  const sprints: [SprintKind, string, string][] = [
    ["feature", "Yangi funksiya", "Sifat +6 · foydalanuvchi o'sishi"],
    ["bugfix", "Xatolarni tuzatish", "Churn −2% · sifat +2"],
    ["techdebt", "Texnik qarz", "Keyingi 2 sprint 1,3× tez"],
  ];
  const monos: [Monetization, string, string][] = [["ads", "Reklama", "past, barqaror"], ["subscription", "Obuna", "o'rta, churn"], ["license", "Litsenziya", "yuqori, sotuv kerak"]];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-[16px] font-bold text-emerald-700">{p.name}</h3>
          <p className="text-xs text-ink-600">{idx + 1}-daraja · {next ? `keyingi: ${next.name} (${fm(next.unlockCost)})` : "so'nggi daraja"}</p>
        </div>
        <Flag className="h-5 w-5 text-gold-500" />
      </div>
      <Card className="p-3">
        <svg viewBox="0 0 310 110" className="h-[110px] w-full">
          <defs><linearGradient id="oq-users" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24604A" stopOpacity="0.25" /><stop offset="1" stopColor="#24604A" stopOpacity="0" /></linearGradient></defs>
          <polygon points={`0,110 ${poly} 310,110`} fill="url(#oq-users)" />
          <polyline points={poly} fill="none" stroke="#24604A" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[["Foydalanuvchi", s.users.toLocaleString("ru-RU")], ["Sifat", `${Math.round(s.quality)} / 100`], ["O'sish", `${s.usersGrowth >= 0 ? "+" : ""}${s.usersGrowth}%`]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-sand-50 px-3 py-2"><div className="text-[11px] font-semibold text-ink-600">{l}</div><div className="font-money text-[15px] font-bold text-ink-900">{v}</div></div>
          ))}
        </div>
        {!team.ok && <p className="mt-2 rounded-xl bg-clay-100 px-3 py-2 text-[11px] font-semibold text-clay-600">Jamoa yetishmaydi ({team.missing.join(", ")}) — daromad 40% ga tushadi.</p>}
      </Card>

      <SectionTitle>Monetizatsiya</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {monos.map(([id, name, sub]) => (
          <button key={id} type="button" onClick={() => a.setMonetization(id)} className={cn("flex flex-col items-start rounded-xl px-3 py-2.5 text-left", s.monetization === id ? "bg-emerald-700 text-white" : "bg-sand-100 text-ink-900")}>
            <span className="text-[13px] font-extrabold">{name}</span><span className={cn("text-[11px]", s.monetization === id ? "text-emerald-100" : "text-ink-600")}>{sub}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Bu oy sprinti</SectionTitle>
      <div className="flex flex-col gap-2">
        {sprints.map(([k, t, sub]) => (
          <Row key={k} icon={<Rocket className="h-5 w-5" />} title={t} sub={sub} active={s.sprint === k} onClick={() => a.setSprint(k)}
            right={s.sprint === k ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white"><Check className="h-3.5 w-3.5" /></span> : <span className="h-6 w-6 rounded-full border-2 border-sand-200" />} />
        ))}
      </div>

      <SectionTitle right={s.marketing.length ? `${fm(E.marketingCost(s))}/oy` : undefined}>Marketing kanallari</SectionTitle>
      <div className="flex flex-col gap-2">
        {MARKETING.map(m => {
          const on = s.marketing.includes(m.id);
          return <Row key={m.id} icon={<Megaphone className="h-5 w-5" />} title={`${m.name} · ${fm(m.cost)}${m.oneTime ? "" : "/oy"}`} sub={m.desc} active={on} onClick={() => a.toggleMarketing(m.id)}
            right={on ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white"><Check className="h-3.5 w-3.5" /></span> : <span className="h-6 w-6 rounded-full border-2 border-sand-200" />} />;
        })}
      </div>

      <SectionTitle>Mahsulot darajalari</SectionTitle>
      <div className="flex flex-col gap-2">
        {PRODUCTS.map((pr, i) => {
          const unlocked = s.unlocked.includes(pr.id);
          const isNext = i === idx + 1;
          const cur = pr.id === s.product;
          return (
            <Row key={pr.id} icon={<Briefcase className="h-5 w-5" />} title={`${i + 1}. ${pr.name}`}
              sub={cur ? "Joriy mahsulot" : unlocked ? "Ochilgan — o'tish" : isNext ? (canNext.ok ? `Ochish: ${fm(pr.unlockCost)}` : canNext.reason!) : `${fm(pr.unlockCost)} · ${pr.desc}`}
              active={cur} disabled={!(unlocked || (isNext && canNext.ok))} onClick={() => a.unlockProduct(pr.id)} />
          );
        })}
      </div>

      <SectionTitle right={`${s.stageReached + 1} / 5 bosqich`}>Erkinlik yo'li</SectionTitle>
      <Card className="p-3">
        <div className="flex flex-col">
          {STAGES.map((st, i) => {
            const done = i < s.stageReached, cur = i === s.stageReached;
            return (
              <div key={st.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", done ? "bg-emerald-700 text-white" : cur ? "bg-gold-500 ring-4 ring-gold-100" : "border-2 border-sand-200 bg-white")}>{done && <Check className="h-4 w-4" />}</div>
                  {i < STAGES.length - 1 && <div className={cn("w-0.5 flex-1", done ? "bg-emerald-700" : "bg-sand-200")} style={{ minHeight: 18 }} />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex justify-between"><span className={cn("text-[13px] font-extrabold", done || cur ? "text-ink-900" : "text-ink-400")}>{st.name}</span><span className="text-[11px] font-bold text-ink-600">{st.months}</span></div>
                  <div className="text-[11px] text-ink-600">{st.goal}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
