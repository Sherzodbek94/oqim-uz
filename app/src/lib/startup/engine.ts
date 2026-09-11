/**
 * OQIM: Startap Imperiyasi — sof o'yin mantiqi (GDD v1.0 §4–§6).
 * Barcha funksiyalar holatni o'zgartirmaydi: nusxa qaytaradi.
 * Tasodif — seeded RNG (mulberry32), holat ichida saqlanadi (shaffoflik va saqlash uchun).
 */
import type {
  Candidate, Employee, EventCard, Loan, LoanSource, MarketingChannel, Modifier, MonthReport,
  ProductId, RoleId, SprintKind, StartupState, TaxRegime, Monetization, EquipmentId, OfficeLevel,
} from "./types";
import { STARTUP_VERSION } from "./types";
import { BALANCE as B, EQUIPMENT, EVENTS, LOANS, M, MARKETING, NAMES, OFFICES, PRODUCTS, ROLES } from "./balance";

// ---------- RNG ----------
function rand(s: StartupState): number {
  let t = (s.rngState += 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (s: StartupState, a: number, b: number) => a + rand(s) * (b - a);
const pick = <T,>(s: StartupState, xs: readonly T[]): T => xs[Math.floor(rand(s) * xs.length)];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const roundK = (v: number) => Math.round(v / 100_000) * 100_000;

let idCounter = 0;
const uid = (s: StartupState) => `${s.month}-${Math.floor(rand(s) * 1e9).toString(36)}-${++idCounter}`;

// ---------- Yangi o'yin ----------
export function newStartup(companyName: string, seed = Date.now() % 2147483647): StartupState {
  const s: StartupState = {
    version: STARTUP_VERSION,
    seed, rngState: seed >>> 0,
    companyName: companyName.trim() || "Mening startapim",
    founderName: B.founderName,
    phase: "decide",
    month: 1,
    cash: B.startCash,
    reserve: 0,
    product: "tgbot",
    unlocked: ["tgbot"],
    quality: 30,
    users: 120,
    usersGrowth: 0,
    monetization: "ads",
    reputation: 20,
    staff: [],
    candidates: [],
    office: 0,
    equipment: [],
    deskSets: 0,
    tax: "simple",
    itPark: false,
    loans: [],
    modifiers: [],
    sprint: "feature",
    marketing: [],
    pendingEvent: null,
    recentEvents: [],
    eventsSeen: 0,
    reports: [],
    log: [`«${companyName.trim() || "Mening startapim"}» tashkil etildi. Boshlang'ich kapital: 15 mln so'm.`],
    bestValuation: 0,
    stageReached: 0,
  };
  s.candidates = makeCandidates(s);
  return s;
}

// ---------- Selektorlar ----------
export const productSpec = (s: StartupState) => PRODUCTS.find(p => p.id === s.product)!;
export const officeSpec = (s: StartupState) => OFFICES[s.office];
export const payroll = (s: StartupState) => s.staff.reduce((a, e) => a + e.salary, 0);
export const rent = (s: StartupState) => officeSpec(s).rent;
export const has = (s: StartupState, kind: Employee["role"] | "dev" | "design" | "marketing" | "sales" | "support") =>
  s.staff.some(e => e.role === kind || ROLES[e.role].kind === kind);
export const devs = (s: StartupState) => s.staff.filter(e => ROLES[e.role].kind === "dev");
export const debtTotal = (s: StartupState) => s.loans.reduce((a, l) => a + l.principal, 0);
export const loanMonthly = (s: StartupState) => s.loans.reduce((a, l) => a + l.monthly, 0);
export const interestMonthly = (s: StartupState) => s.loans.reduce((a, l) => a + l.principal * l.apr / 12, 0);

export function activeMods(s: StartupState) { return s.modifiers.filter(m => m.until >= s.month); }
const modMult = (s: StartupState, key: keyof Modifier) =>
  activeMods(s).reduce((a, m) => a * ((m[key] as number | undefined) ?? 1), 1);

export function marketingCost(s: StartupState) {
  return s.marketing.reduce((a, id) => a + (MARKETING.find(m => m.id === id)?.cost ?? 0), 0);
}
export function monthlyCosts(s: StartupState) {
  const base = payroll(s) + rent(s) + (s.tax === "itpark" ? B.itParkAuditCost : 0);
  return base * modMult(s, "costMult") + marketingCost(s);
}

/** Jamoa mahsulot talabini qoplaydimi (asoschi dasturchi hisobida) */
export function teamOk(s: StartupState): { ok: boolean; missing: string[] } {
  const p = productSpec(s);
  const missing: string[] = [];
  if (devs(s).length + 1 < p.needDevs) missing.push(`${p.needDevs - devs(s).length - 1} dasturchi`);
  if (p.needDesigner && !has(s, "design")) missing.push("dizayner");
  if (p.needSmm && !has(s, "marketing")) missing.push("SMM");
  if (p.needSales && !has(s, "sales")) missing.push("sotuv menejeri");
  return { ok: missing.length === 0, missing };
}

export function devPower(s: StartupState) {
  let p = B.founderSkill * 0.5;
  for (const e of devs(s)) {
    const slow = e.morale < B.moraleSlowBelow ? B.moraleSlowFactor : 1;
    p += e.skill * (e.role === "senior" ? 1 : 0.5) * slow;
  }
  if (has(s, "design")) p *= 1.15;
  return p;
}

/** Oylik daromad bahosi (hozirgi sifat, foydalanuvchi va jamoa bilan) */
export function revenueEstimate(s: StartupState) {
  const p = productSpec(s);
  let base = p.revMin + (p.revMax - p.revMin) * (s.quality / 100);
  // foydalanuvchi bazasi: mahsulot potensialiga nisbatan (1000 f. = 1×; log o'sish)
  const userFactor = clamp(0.6 + Math.log10(Math.max(100, s.users)) / 3 - 0.6, 0.5, 1.6);
  base *= userFactor;
  const mono: Record<Monetization, number> = { ads: 0.85, subscription: 1.0, license: has(s, "sales") ? 1.25 : 0.7 };
  base *= mono[s.monetization];
  if (!teamOk(s).ok) base *= 0.4;
  const lowMorale = s.staff.length > 0 && s.staff.reduce((a, e) => a + e.morale, 0) / s.staff.length < B.moraleSlowBelow;
  if (lowMorale) base *= 0.6;
  base *= modMult(s, "revMult");
  base *= 1 + (s.reputation - 20) / 200;
  return Math.round(base);
}

export function monthlyFlow(s: StartupState) { return revenueEstimate(s) - monthlyCosts(s) - interestMonthly(s); }

export function valuation(s: StartupState) {
  const flow = monthlyFlow(s);
  const last = s.reports.slice(-12);
  const avgNet = last.length ? last.reduce((a, r) => a + r.revenue - r.payroll - r.rent - r.marketing - r.tax, 0) / last.length : flow;
  const profit12 = Math.max(0, (avgNet * 0.6 + flow * 0.4)) * 12;
  return Math.max(0, Math.round(profit12 * B.sectorMultiple + s.cash - debtTotal(s) + s.users * 5_000));
}

export function debtRatio(s: StartupState) {
  const f = monthlyFlow(s);
  if (debtTotal(s) === 0) return 0;
  if (f <= 0) return Infinity;
  return debtTotal(s) / f;
}

export function hiringCost(s: StartupState, salary: number) {
  return Math.round(salary * B.hiringCostMonths * (has(s, "hr") ? 0.7 : 1));
}

export function stageOf(s: StartupState): number {
  if (s.unlocked.includes("export") || valuation(s) >= 30_000 * M) return 4;
  if (s.unlocked.includes("saas") || s.itPark) return 3;
  if (s.unlocked.includes("mobile") || s.staff.length >= 10) return 2;
  if (s.office >= 1 && s.staff.length >= 3) return 1;
  return 0;
}

// ---------- Nomzodlar ----------
function makeCandidates(s: StartupState): Candidate[] {
  const pool: RoleId[] = s.month < 4
    ? ["junior", "smm", "accountant", "designer", "junior"]
    : s.month < 12
      ? ["junior", "middle", "designer", "smm", "sales", "accountant", "hr", "office"]
      : ["middle", "senior", "designer", "smm", "sales", "accountant", "hr", "office", "junior"];
  const out: Candidate[] = [];
  const used = new Set<string>();
  for (let i = 0; i < B.candidatePoolSize; i++) {
    const role = pick(s, pool);
    const spec = ROLES[role];
    let name = pick(s, NAMES);
    let tries = 0;
    while ((used.has(name) || s.staff.some(e => e.name === name)) && tries++ < 20) name = pick(s, NAMES);
    if (used.has(name) || s.staff.some(e => e.name === name)) name = `${name} ${["A.", "B.", "K.", "M.", "S.", "T."][Math.floor(rand(s) * 6)]}`;
    used.add(name);
    const skill = clamp(Math.round(spec.skill + between(s, -8, 12)), 5, 99);
    const salary = roundK(between(s, spec.salaryMin, spec.salaryMax) * (0.9 + skill / spec.skill * 0.1));
    out.push({ id: uid(s), name, role, salary, skill });
  }
  return out;
}

// ---------- Qarorlar ----------
export function hire(state: StartupState, candidateId: string): StartupState {
  const s = clone(state);
  const c = s.candidates.find(x => x.id === candidateId);
  if (!c) return state;
  const fee = hiringCost(s, c.salary);
  if (s.cash < fee) return state;
  s.cash -= fee;
  s.staff.push({ id: c.id, name: c.name, role: c.role, salary: c.salary, skill: c.skill, morale: B.moraleBase, hiredMonth: s.month, talent: c.talent });
  s.candidates = s.candidates.filter(x => x.id !== candidateId);
  s.log.push(`${c.name} (${ROLES[c.role].name}) ishga olindi — ${fmtM(c.salary)}/oy, yollash xarajati ${fmtM(fee)}.`);
  return s;
}

export function fire(state: StartupState, employeeId: string): StartupState {
  const s = clone(state);
  const e = s.staff.find(x => x.id === employeeId);
  if (!e) return state;
  const severance = e.salary; // 1 oylik kompensatsiya
  s.cash -= severance;
  s.staff = s.staff.filter(x => x.id !== employeeId);
  for (const o of s.staff) o.morale = clamp(o.morale - 8, 0, 100);
  s.log.push(`${e.name} ishdan bo'shatildi. Kompensatsiya ${fmtM(severance)}, jamoa kayfiyati −8.`);
  return s;
}

export function setSprint(state: StartupState, kind: SprintKind): StartupState {
  const s = clone(state); s.sprint = kind; return s;
}

export function toggleMarketing(state: StartupState, ch: MarketingChannel): StartupState {
  const s = clone(state);
  s.marketing = s.marketing.includes(ch) ? s.marketing.filter(x => x !== ch) : [...s.marketing, ch];
  return s;
}

export function setMonetization(state: StartupState, m: Monetization): StartupState {
  const s = clone(state); s.monetization = m; return s;
}

export function setTax(state: StartupState, t: TaxRegime): StartupState {
  const s = clone(state);
  if (t === "itpark") {
    if (s.staff.length < B.itParkMinStaff) return state;
    s.itPark = true;
  }
  s.tax = t;
  s.log.push(`Soliq rejimi: ${t === "simple" ? "Oddiy (12%)" : t === "itpark" ? "IT Park rezidenti (0%)" : "Yashirin daromad (xavfli)"}.`);
  return s;
}

export function buyEquipment(state: StartupState, id: EquipmentId): StartupState {
  const s = clone(state);
  const spec = EQUIPMENT.find(e => e.id === id)!;
  if (spec.perEmployee) {
    const need = s.staff.length + 1 - s.deskSets;
    if (need <= 0) return state;
    const cost = need * spec.cost;
    if (s.cash < cost) return state;
    s.cash -= cost; s.deskSets += need;
    for (const e of s.staff) e.morale = clamp(e.morale + 3, 0, 100);
    s.log.push(`${need} ta stol-kreslo to'plami: ${fmtM(cost)}.`);
    return s;
  }
  if (s.equipment.includes(id) || s.cash < spec.cost) return state;
  s.cash -= spec.cost; s.equipment.push(id);
  s.log.push(`${spec.name} sotib olindi: ${fmtM(spec.cost)}.`);
  return s;
}

export function canUpgradeOffice(s: StartupState): { ok: boolean; reason?: string } {
  const next = OFFICES[s.office + 1];
  if (!next) return { ok: false, reason: "Eng yuqori daraja" };
  if (next.needItPark && !s.itPark) return { ok: false, reason: "IT Park rezidentligi kerak" };
  if (s.staff.length < next.minStaff) return { ok: false, reason: `${next.minStaff}+ xodim kerak` };
  if (s.cash < next.minCash) return { ok: false, reason: `Naqd ${fmtM(next.minCash)} kerak` };
  if (s.cash < next.rent * 2) return { ok: false, reason: "2 oylik arenda uchun naqd yetarli emas" };
  return { ok: true };
}

export function upgradeOffice(state: StartupState): StartupState {
  if (!canUpgradeOffice(state).ok) return state;
  const s = clone(state);
  const next = OFFICES[s.office + 1];
  s.cash -= next.rent; // birinchi oy oldindan
  s.office = next.level as OfficeLevel;
  for (const e of s.staff) e.morale = clamp(e.morale + 6, 0, 100);
  s.log.push(`Ofis: ${next.name}. Arenda ${fmtM(next.rent)}/oy.`);
  return s;
}

export function canUnlockProduct(s: StartupState, id: ProductId): { ok: boolean; reason?: string } {
  const spec = PRODUCTS.find(p => p.id === id)!;
  const idx = PRODUCTS.findIndex(p => p.id === id);
  const cur = PRODUCTS.findIndex(p => p.id === s.product);
  if (s.unlocked.includes(id)) return { ok: true };
  if (idx !== cur + 1) return { ok: false, reason: "Avval oldingi darajani oching" };
  if (id === "export" && !s.itPark) return { ok: false, reason: "IT Park rezidentligi kerak" };
  if (s.cash < spec.unlockCost) return { ok: false, reason: `Naqd ${fmtM(spec.unlockCost)} kerak` };
  if (s.quality < 40) return { ok: false, reason: "Joriy mahsulot sifati ≥ 40 bo'lsin" };
  return { ok: true };
}

export function unlockProduct(state: StartupState, id: ProductId): StartupState {
  if (!canUnlockProduct(state, id).ok) return state;
  const s = clone(state);
  const spec = PRODUCTS.find(p => p.id === id)!;
  if (!s.unlocked.includes(id)) {
    s.cash -= spec.unlockCost;
    s.unlocked.push(id);
    s.quality = Math.max(25, s.quality - 15);
    s.users = Math.round(s.users * 0.7) + 200;
    s.log.push(`Yangi mahsulot: ${spec.name} (${fmtM(spec.unlockCost)}). Sifat qayta boshlanadi.`);
  }
  s.product = id;
  return s;
}

export function canTakeLoan(s: StartupState, src: LoanSource): { ok: boolean; reason?: string } {
  if (src === "angel") return { ok: false, reason: "v1.0 da" };
  if (s.loans.some(l => l.source === src)) return { ok: false, reason: "Bu manbadan qarz bor" };
  const spec = LOANS[src];
  if (src === "bank" && valuation(s) < 2 * (debtTotal(s) + spec.amount)) return { ok: false, reason: "Kafolat: kompaniya qiymati > 2× qarz" };
  return { ok: true };
}

export function takeLoan(state: StartupState, src: LoanSource): StartupState {
  if (!canTakeLoan(state, src).ok || src === "angel") return state;
  const s = clone(state);
  const spec = LOANS[src];
  const r = spec.apr / 12;
  const monthly = r === 0 ? 0 : Math.round(spec.amount * r / (1 - Math.pow(1 + r, -spec.months)));
  const loan: Loan = { id: uid(s), source: src, principal: spec.amount, apr: spec.apr, monthly, monthsLeft: spec.months, takenMonth: s.month };
  s.loans.push(loan);
  s.cash += spec.amount;
  s.log.push(`${spec.name}: +${fmtM(spec.amount)}${monthly ? `, oylik to'lov ${fmtM(monthly)}` : ", 6 oydan keyin qaytariladi"}.`);
  return s;
}

export function repayLoan(state: StartupState, loanId: string): StartupState {
  const s = clone(state);
  const l = s.loans.find(x => x.id === loanId);
  if (!l || s.cash < l.principal) return state;
  s.cash -= l.principal;
  s.loans = s.loans.filter(x => x.id !== loanId);
  s.log.push(`Qarz muddatidan oldin yopildi: ${fmtM(l.principal)}.`);
  return s;
}

// ---------- Oy yakuni ----------
function drawEvent(s: StartupState): EventCard | null {
  if (rand(s) > B.eventChancePerMonth) return null;
  const pool = EVENTS.filter(e => (e.minMonth ?? 1) <= s.month && !s.recentEvents.includes(e.id));
  if (!pool.length) return null;
  // dev_quit faqat kayfiyat past bo'lsa, cyber server bo'lmasa, outage generator bo'lmasa
  const filtered = pool.filter(e => {
    if (e.id === "dev_quit") return devs(s).length > 0 && devs(s).some(d => d.morale < 40);
    if (e.id === "cyber") return !s.equipment.includes("server");
    if (e.id === "outage") return !s.equipment.includes("generator");
    if (e.id === "fx") return true;
    return true;
  });
  const src = filtered.length ? filtered : pool;
  const total = src.reduce((a, e) => a + e.weight, 0);
  let r = rand(s) * total;
  for (const e of src) { r -= e.weight; if (r <= 0) return e; }
  return src[src.length - 1];
}

/** Oyni yakunlash: hodisa tortiladi. Tanlovli bo'lsa — phase "event"; aks holda darhol hisob-kitob. */
export function endMonth(state: StartupState): StartupState {
  if (state.phase !== "decide") return state;
  const s = clone(state);
  const ev = drawEvent(s);
  if (ev && ev.choices?.length) {
    s.pendingEvent = ev;
    s.phase = "event";
    return s;
  }
  return settleMonth(s, ev, undefined);
}

export function resolveEvent(state: StartupState, choiceId: string): StartupState {
  if (state.phase !== "event" || !state.pendingEvent) return state;
  const s = clone(state);
  const ev = s.pendingEvent!;
  s.pendingEvent = null;
  return settleMonth(s, ev, choiceId);
}

function applyEvent(s: StartupState, ev: EventCard, choice: string | undefined, rep: MonthReport): string {
  const soften = has(s, "office") ? 0.5 : 1; // ofis-menejer yomon ta'sirni −50%
  const addMod = (m: Omit<Modifier, "until"> & { months: number }) =>
    s.modifiers.push({ id: m.id, label: m.label, costMult: m.costMult, revMult: m.revMult, qualityMult: m.qualityMult, usersMult: m.usersMult, until: s.month + m.months - 1 });
  switch (ev.id) {
    case "inflation": addMod({ id: "inflation", label: "Inflyatsiya", costMult: 1 + 0.08 * soften, months: 3 }); return `Xarajatlar 3 oy davomida +${Math.round(8 * soften)}%.`;
    case "fx": {
      addMod({ id: "fx", label: "Dollar kursi", costMult: 1 + 0.04 * soften, months: 2 });
      if (s.product === "export") { addMod({ id: "fx-rev", label: "Eksport bonusi", revMult: 1.25, months: 2 }); return "Eksport daromadi +25% (2 oy), xarajatlar +4%."; }
      return "Import xarajatlar +4% (2 oy).";
    }
    case "outage": {
      if (choice === "generator") { s.cash -= 15 * M; rep.other -= 15 * M; if (!s.equipment.includes("generator")) s.equipment.push("generator"); return "Generator sotib olindi — uzilish ta'sirsiz."; }
      if (choice === "internet") { s.cash -= 5 * M; rep.other -= 5 * M; if (!s.equipment.includes("internet")) s.equipment.push("internet"); addMod({ id: "outage", label: "Elektr uzilishi", qualityMult: 0.9, revMult: 0.95, months: 1 }); return "Zaxira internet — ta'sir −10%."; }
      const f = s.equipment.includes("internet") ? 0.9 : 0.7;
      addMod({ id: "outage", label: "Elektr uzilishi", qualityMult: f, revMult: 1 - (1 - f) * 0.5, months: 1 });
      return `Ishlab chiqarish ${Math.round((1 - f) * 100)}% pasaydi.`;
    }
    case "tax_audit": {
      if (s.tax === "shadow") { const fine = Math.round(Math.max(rep.revenue, 5 * M) * 0.12 * B.shadowFineMult * soften); s.cash -= fine; rep.other -= fine; s.reputation = clamp(s.reputation - 20, 0, 100); return `Yashirin daromad fosh bo'ldi. Jarima ${fmtM(fine)}, obro' −20.`; }
      if (has(s, "accountant")) return "Buxgalter hujjatlarni tartibda topshirdi — jarima yo'q.";
      const fine = Math.round(B.taxAuditFineNoAccountant * soften); s.cash -= fine; rep.other -= fine; return `Hujjatlarda xatolik: jarima ${fmtM(fine)}. Buxgalter bo'lsa bunday bo'lmasdi.`;
    }
    case "grant": s.cash += 25 * M; rep.other += 25 * M; s.reputation = clamp(s.reputation + 10, 0, 100); return "Grant +25 mln so'm, obro' +10.";
    case "talent": {
      if (choice === "hire") {
        const sal = 54 * M;
        s.staff.push({ id: uid(s), name: pick(s, NAMES), role: "senior", salary: sal, skill: 92, morale: 70, hiredMonth: s.month, talent: true });
        return "Talant jamoaga qo'shildi (54 mln/oy, ko'nikma 92).";
      }
      return "Talant boshqa kompaniyaga ketdi.";
    }
    case "dev_quit": {
      const d = devs(s).filter(x => x.morale < 40).sort((a, b) => b.skill - a.skill)[0] ?? devs(s)[0];
      if (!d) return "Ketadigan dasturchi yo'q.";
      s.staff = s.staff.filter(x => x.id !== d.id);
      addMod({ id: "dev_quit", label: "Dasturchi ketdi", qualityMult: 0.7, months: 2 });
      s.quality = clamp(s.quality - 10, 0, 100);
      return `${d.name} ketdi. Sifat −10, sprintlar 2 oy sekin.`;
    }
    case "cyber": {
      if (s.equipment.includes("server")) return "Xavfsizlik tizimi hujumni qaytardi.";
      const dmg = Math.round(B.cyberDamage * soften); s.cash -= dmg; rep.other -= dmg; s.reputation = clamp(s.reputation - 20, 0, 100);
      return `Zarar ${fmtM(dmg)}, obro' −20.`;
    }
    case "partnership": s.cash += 50 * M; rep.other += 50 * M; s.reputation = clamp(s.reputation + 8, 0, 100); return "Shartnoma: +50 mln so'm.";
    case "competitor": {
      if (choice === "quality") { addMod({ id: "comp-q", label: "Sifat bilan javob", qualityMult: 2, months: 1 }); s.marketing = []; return "Sprint 2× samarali, marketing to'xtatildi."; }
      if (choice === "price") { addMod({ id: "comp-p", label: "Narx pasaytirildi", revMult: 0.85, months: 2 }); return "Daromad −15% (2 oy), o'sish saqlandi."; }
      addMod({ id: "comp-i", label: "Raqobatchi", usersMult: 0.6, months: 2 }); return "Foydalanuvchi o'sishi −40% (2 oy).";
    }
    case "award": s.reputation = clamp(s.reputation + 50, 0, 100); return "Obro' +50. Investorlar e'tiborida.";
    case "family": {
      if (choice === "gift") { s.cash -= 3 * M; rep.other -= 3 * M; for (const e of s.staff) e.morale = clamp(e.morale + 10, 0, 100); return "Jamoa kayfiyati +10."; }
      return "Tabrik aytildi.";
    }
    case "navruz": for (const e of s.staff) e.morale = clamp(e.morale + 8, 0, 100); addMod({ id: "navruz", label: "Navro'z", qualityMult: 0.9, months: 1 }); return "Kayfiyat +8, sprint −10%.";
    case "hashar": s.reputation = clamp(s.reputation + 5, 0, 100); return "Obro' +5.";
    case "intern": addMod({ id: "intern", label: "Amaliyotchi", qualityMult: 1.15, months: 3 }); return "Sprintlar 3 oy davomida +15%.";
  }
  return "";
}

function settleMonth(s: StartupState, ev: EventCard | null, choice: string | undefined): StartupState {
  const rep: MonthReport = {
    month: s.month, revenue: 0, payroll: 0, rent: 0, marketing: 0, tax: 0, interest: 0, loanPayments: 0, other: 0,
    net: 0, cashAfter: 0, usersAfter: 0, qualityAfter: 0, moraleAfter: 0, notes: [],
  };
  const cashBefore = s.cash;

  // 1) Hodisa (oy boshida ta'sir qiladi)
  if (ev) {
    s.recentEvents = [...s.recentEvents.slice(-(B.eventCooldown - 1)), ev.id];
    s.eventsSeen++;
    rep.revenue = revenueEstimate(s); // audit jarimasi uchun
    const effect = applyEvent(s, ev, choice, rep);
    rep.event = { id: ev.id, title: ev.title, kind: ev.kind, choice, effect };
    s.log.push(`${s.month}-oy · ${ev.title}: ${effect}`);
  }

  // 2) Sprint → sifat
  const qMult = modMult(s, "qualityMult");
  const power = devPower(s) * qMult;
  let qDelta = 0;
  if (s.sprint === "feature") qDelta = B.sprintFeatureQuality * (power / 60);
  else if (s.sprint === "bugfix") qDelta = B.sprintBugfixQuality * (power / 60);
  else if (s.sprint === "techdebt") { qDelta = 0; s.modifiers.push({ id: "techdebt", label: "Texnik qarz to'landi", qualityMult: 1.3, until: s.month + 2 }); }
  else qDelta = -B.qualityDecay;
  s.quality = clamp(s.quality + qDelta, 0, 100);

  // 3) Marketing → foydalanuvchi
  let growth = B.organicGrowth + (has(s, "marketing") ? 0.02 : 0);
  const smmMult = has(s, "marketing") ? 2 : 1;
  for (const ch of s.marketing) {
    if (ch === "targeted") growth += 0.08 * smmMult;
    if (ch === "blogger") { growth += 0.10; s.reputation = clamp(s.reputation + 3, 0, 100); }
    if (ch === "seo") { const seoMonths = s.reports.filter(r => r.marketing > 0).length; growth += seoMonths >= 3 ? 0.06 : 0.02; }
    if (ch === "event") { s.reputation = clamp(s.reputation + 12, 0, 100); if (rand(s) < 0.5 && !s.candidates.some(c => c.talent)) rep.notes.push("TechFest'da talant nomzod topildi — yollash bozoriga qarang."); }
  }
  growth += (s.quality - 50) / 500;                       // sifat ta'siri (±10%)
  growth *= modMult(s, "usersMult");
  const churn = B.baseChurn - (s.sprint === "bugfix" ? Math.abs(B.sprintBugfixChurn) : 0) + (s.monetization === "subscription" ? 0.02 : 0) - (s.quality - 50) / 1000;
  const usersBefore = s.users;
  s.users = Math.max(50, Math.round(s.users * (1 + growth - churn)));
  s.usersGrowth = Math.round((s.users / usersBefore - 1) * 100);
  rep.marketing = marketingCost(s);
  s.marketing = s.marketing.filter(ch => !MARKETING.find(m => m.id === ch)?.oneTime);
  if (rep.notes.length && rep.notes[0].includes("talant")) {
    s.candidates.push({ id: uid(s), name: pick(s, NAMES), role: "senior", salary: 50 * M, skill: 90, talent: true });
  }

  // 4) Daromad va xarajatlar
  rep.revenue = revenueEstimate(s);
  rep.payroll = Math.round(payroll(s) * modMult(s, "costMult"));
  rep.rent = Math.round(rent(s) * modMult(s, "costMult"));
  const audit = s.tax === "itpark" ? B.itParkAuditCost : 0;
  const profit = rep.revenue - rep.payroll - rep.rent - rep.marketing - audit;
  if (s.tax === "simple") rep.tax = Math.max(0, Math.round(profit * B.simpleTaxRate));
  else if (s.tax === "itpark") rep.tax = audit;
  else if (s.tax === "shadow" && rand(s) < B.shadowAuditChance) {
    const fine = Math.round(Math.max(profit, 0) * B.simpleTaxRate * B.shadowFineMult);
    rep.other -= fine; s.cash -= fine; s.reputation = clamp(s.reputation - 20, 0, 100);
    rep.notes.push(`Yashirin daromad tekshiruvda fosh bo'ldi: jarima ${fmtM(fine)}.`);
  }

  // 5) Kreditlar
  for (const l of s.loans) {
    rep.interest += Math.round(l.principal * l.apr / 12);
    if (l.monthly > 0) {
      const principalPart = Math.min(l.principal, l.monthly - Math.round(l.principal * l.apr / 12));
      l.principal -= Math.max(0, principalPart);
      rep.loanPayments += Math.max(0, principalPart);
    }
    l.monthsLeft--;
    if (l.source === "friends" && l.monthsLeft <= 0) {
      rep.loanPayments += l.principal;
      rep.notes.push(`Do'stlar qarzi muddati keldi: ${fmtM(l.principal)} qaytarildi.`);
      l.principal = 0;
    }
  }
  s.loans = s.loans.filter(l => l.principal > 0);

  // 6) Naqd
  const paidSalaries = s.cash + rep.revenue - rep.rent - rep.marketing >= rep.payroll;
  s.cash += rep.revenue - rep.payroll - rep.rent - rep.marketing - rep.tax - rep.interest - rep.loanPayments;

  // 7) Kayfiyat
  const officeBonus = officeSpec(s).morale;
  const workload = teamOk(s).ok ? 0 : B.moraleWorkloadPenalty * 0.5;
  for (const e of s.staff) {
    let d = (paidSalaries ? B.moralePaid : B.moraleUnpaid) + officeBonus * 0.3 + workload - 8;
    if (has(s, "hr")) d += 4;
    if (s.deskSets >= s.staff.length + 1) d += 1;
    e.morale = clamp(e.morale + d, 0, 100);
  }
  // kayfiyat <15 → ketish xavfi
  for (const e of [...s.staff]) {
    if (e.morale < B.moraleQuitBelow && rand(s) < B.moraleQuitChance) {
      s.staff = s.staff.filter(x => x.id !== e.id);
      rep.notes.push(`${e.name} kayfiyat pastligidan ketdi.`);
    }
  }

  // 8) Hisobot
  rep.net = s.cash - cashBefore;
  rep.cashAfter = s.cash;
  rep.usersAfter = s.users;
  rep.qualityAfter = Math.round(s.quality);
  rep.moraleAfter = s.staff.length ? Math.round(s.staff.reduce((a, e) => a + e.morale, 0) / s.staff.length) : 100;
  s.reports.push(rep);
  s.modifiers = s.modifiers.filter(m => m.until >= s.month + 1);

  // 9) G'alaba / mag'lubiyat
  const v = valuation(s);
  s.bestValuation = Math.max(s.bestValuation, v);
  s.stageReached = Math.max(s.stageReached, stageOf(s));
  const costs = monthlyCosts(s);
  const last12 = s.reports.slice(-12);
  const annualProfit = last12.length === 12 ? last12.reduce((a, r) => a + r.revenue - r.payroll - r.rent - r.marketing - r.tax, 0) : 0;
  const allPositive = last12.length === 12 && last12.every(r => r.revenue - r.payroll - r.rent - r.marketing - r.tax > 0);
  if (v >= B.winValuation || (allPositive && annualProfit >= B.winAnnualProfit)) {
    s.phase = "won";
    s.log.push(`🏆 «${s.companyName}» unicorn bo'ldi! Qiymat: ${fmtM(v)}.`);
    return s;
  }
  if (s.cash < -costs * B.bankruptMonths && s.cash < -5 * M) {
    s.phase = "lost"; s.lostReason = "Naqd pul tugadi: 2 oylik xarajatni qoplay olmadingiz.";
    return s;
  }
  const dr = s.reports.slice(-3);
  if (dr.length === 3 && s.cash < 0 && dr.every(r => debtTotal(s) > 0 && (r.revenue - r.payroll - r.rent - r.marketing - r.tax) * B.debtRatioLimit < debtTotal(s))) {
    s.phase = "lost"; s.lostReason = "Qarz yuki 3 oy ketma-ket sof foydadan 3× oshdi.";
    return s;
  }

  s.phase = "report";
  return s;
}

/** Hisobotni yopish — yangi oy boshlanadi */
export function nextMonth(state: StartupState): StartupState {
  if (state.phase !== "report") return state;
  const s = clone(state);
  s.month++;
  s.sprint = "feature";
  // nomzodlar bozori yangilanadi (talant saqlanadi)
  const keep = s.candidates.filter(c => c.talent);
  s.candidates = [...keep, ...makeCandidates(s)].slice(0, 4);
  s.phase = "decide";
  if (s.cash < 0) s.log.push(`Diqqat: naqd manfiy (${fmtM(s.cash)}). Kredit yoki xarajat qisqartirish kerak.`);
  return s;
}

// ---------- Format ----------
export function fmtM(n: number): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  const c = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", ",");
  if (a >= 1_000_000_000) return `${sign}${c(a / 1e9)} mlrd`;
  if (a >= 1_000_000) return `${sign}${c(a / 1e6)} mln`;
  if (a >= 1_000) return `${sign}${Math.round(a / 1000)} ming`;
  return `${sign}${a}`;
}
