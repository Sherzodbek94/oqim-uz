/**
 * OQIM: Startap Imperiyasi — balans konfiguratsiyasi (GDD v1.0 §5–§6).
 * Barcha raqamlar shu yerda — dizayner kodsiz o'zgartiradi (GDD §12).
 */
import type {
  EquipmentSpec, EventCard, MarketingSpec, OfficeSpec, ProductSpec, RoleSpec, RoleId,
} from "./types";

export const M = 1_000_000;

export const BALANCE = {
  startCash: 15 * M,
  founderSkill: 45,                // asoschi kod ko'nikmasi (junior+)
  founderName: "Siz (asoschi)",
  maxMonths: 120,
  winValuation: 100_000 * M,       // 100 mlrd so'm — unicorn
  winAnnualProfit: 12_000 * M,     // yoki yillik sof foyda 12 mlrd (12 oy barqaror)
  sectorMultiple: 3,               // kompaniya qiymati = sof aktiv + 12 oylik foyda × 3
  bankruptMonths: 2,               // naqd < −(2 oylik xarajat) → bankrot
  debtRatioLimit: 3,               // qarz / oylik sof oqim > 3 (3 oy ketma-ket) → ogohlantirish/bankrot
  eventChancePerMonth: 0.7,
  eventCooldown: 6,
  // morale
  moraleBase: 60,
  moralePaid: 10,
  moraleUnpaid: -25,
  moraleWorkloadPenalty: -20,      // ish yuki >120%
  moraleQuitBelow: 15, moraleQuitChance: 0.3,
  moraleSlowBelow: 30, moraleSlowFactor: 0.15,
  // sprint
  sprintFeatureQuality: 6, sprintBugfixQuality: 2, sprintBugfixChurn: -0.02,
  qualityDecay: 1.5,               // sprint yo'q bo'lsa har oy sifat pasayadi
  // users
  baseChurn: 0.06,
  organicGrowth: 0.02,
  // tax
  simpleTaxRate: 0.12,
  itParkAuditCost: 0.5 * M,
  itParkMinStaff: 5,
  shadowAuditChance: 0.05, shadowFineMult: 20,
  // hiring
  hiringCostMonths: 0.5,           // yollash xarajati = maoshning yarmi (HR bo'lsa −30%)
  candidatePoolSize: 3,
  taxAuditFineNoAccountant: 10 * M,
  cyberDamage: 15 * M,
} as const;

export const ROLES: Record<RoleId, RoleSpec> = {
  junior:     { id: "junior",     name: "Junior dasturchi", kind: "dev",       salaryMin: 5*M,  salaryMax: 8*M,  skill: 20, skillLabel: "Kod",       desc: "Mahsulot ishlab chiqish, sekin" },
  middle:     { id: "middle",     name: "Middle dasturchi", kind: "dev",       salaryMin: 14*M, salaryMax: 20*M, skill: 45, skillLabel: "Kod",       desc: "Asosiy ishlab chiqarish kuchi" },
  senior:     { id: "senior",     name: "Senior dasturchi", kind: "dev",       salaryMin: 30*M, salaryMax: 45*M, skill: 75, skillLabel: "Kod",       desc: "1 Senior = 2 Middle tezlik, kayfiyat bonusi" },
  designer:   { id: "designer",   name: "Dizayner",         kind: "design",    salaryMin: 10*M, salaryMax: 18*M, skill: 60, skillLabel: "Dizayn",    desc: "Mahsulot sifatiga +%" },
  smm:        { id: "smm",        name: "SMM-menejer",      kind: "marketing", salaryMin: 6*M,  salaryMax: 10*M, skill: 40, skillLabel: "Marketing", desc: "Organik o'sish, brend obro'si" },
  sales:      { id: "sales",      name: "Sotuv menejeri",   kind: "sales",     salaryMin: 8*M,  salaryMax: 15*M, skill: 55, skillLabel: "Sotuv",     desc: "Korporativ mijozlar, shartnomalar" },
  accountant: { id: "accountant", name: "Buxgalter",        kind: "support",   salaryMin: 5*M,  salaryMax: 9*M,  skill: 50, skillLabel: "Hisob",     desc: "Soliq xatoligi xavfi 0%, hisobot aniq" },
  hr:         { id: "hr",         name: "HR-menejer",       kind: "support",   salaryMin: 7*M,  salaryMax: 12*M, skill: 50, skillLabel: "HR",        desc: "Kayfiyat saqlanadi, yollash narxi −30%" },
  office:     { id: "office",     name: "Ofis-menejer",     kind: "support",   salaryMin: 4*M,  salaryMax: 6*M,  skill: 50, skillLabel: "Tartib",    desc: "Yomon hodisalar ta'siri −50%" },
};

export const PRODUCTS: ProductSpec[] = [
  { id: "tgbot",     name: "Telegram-bot xizmatlari", unlockCost: 0,       revMin: 3*M,    revMax: 15*M,    needDevs: 1, needDesigner: false, needSmm: false, needSales: false, desc: "Garajdan boshlanadi. Kichik buyurtmalar, tez pul." },
  { id: "webstudio", name: "Veb-studiya",             unlockCost: 10*M,    revMin: 15*M,   revMax: 50*M,    needDevs: 2, needDesigner: true,  needSmm: false, needSales: false, desc: "Sayt yasash. 2 dasturchi + dizayner kerak." },
  { id: "mobile",    name: "Mobil ilova",             unlockCost: 60*M,    revMin: 50*M,   revMax: 200*M,   needDevs: 3, needDesigner: true,  needSmm: true,  needSales: false, desc: "O'z mahsulotingiz. Foydalanuvchi bazasi va marketing." },
  { id: "saas",      name: "SaaS platforma",          unlockCost: 250*M,   revMin: 200*M,  revMax: 1000*M,  needDevs: 3, needDesigner: true,  needSmm: true,  needSales: true,  desc: "Obuna modeli, korporativ sotuv." },
  { id: "export",    name: "Eksport IT-xizmatlari",   unlockCost: 1000*M,  revMin: 1000*M, revMax: 10000*M, needDevs: 5, needDesigner: true,  needSmm: true,  needSales: true,  desc: "Xorijiy mijozlar, dollar daromadi. IT Park kerak." },
];

export const OFFICES: OfficeSpec[] = [
  { level: 0, name: "Uy / garaj",                       rent: 0,     morale: -5, minCash: 0,     minStaff: 0,  needItPark: false, desc: "Boshlang'ich. Arenda yo'q, lekin kayfiyat past." },
  { level: 1, name: "Coworking",                        rent: 2*M,   morale: 5,  minCash: 10*M,  minStaff: 0,  needItPark: false, desc: "Toshkent markazidagi umumiy ish maydoni." },
  { level: 2, name: "Kichik ofis (Mirzo Ulug'bek)",     rent: 8*M,   morale: 12, minCash: 0,     minStaff: 3,  needItPark: false, desc: "O'z eshigingiz. 3+ xodim kerak." },
  { level: 3, name: "Korporativ ofis (Yunusobod)",      rent: 25*M,  morale: 20, minCash: 0,     minStaff: 10, needItPark: false, desc: "IT-markazda. 10+ xodim kerak." },
  { level: 4, name: "IT Park binosi",                   rent: 60*M,  morale: 30, minCash: 0,     minStaff: 10, needItPark: true,  desc: "Faqat IT Park rezidentlari uchun." },
];

export const EQUIPMENT: EquipmentSpec[] = [
  { id: "desks",     name: "Stol-kreslo to'plami", cost: 1.5*M, perEmployee: true, desc: "Har xodimga. Kayfiyat +3." },
  { id: "internet",  name: "Zaxira 4G internet",   cost: 5*M,   desc: "Elektr/onlayn hodisalar zarari kamayadi." },
  { id: "generator", name: "Generator",            cost: 15*M,  desc: "Elektr uzilishi ta'siri 0 ga tushadi." },
  { id: "server",    name: "Server va xavfsizlik", cost: 20*M,  desc: "Kiberhujum xavfi o'chadi." },
];

export const MARKETING: MarketingSpec[] = [
  { id: "targeted", name: "Telegram/Instagram target", cost: 2*M,  oneTime: false, desc: "Foydalanuvchi o'sishi. SMM bo'lsa samara 2×." },
  { id: "blogger",  name: "Bloger integratsiyasi",     cost: 5*M,  oneTime: false, desc: "Brend obro'si +, virusli o'sish." },
  { id: "event",    name: "Offline tadbir (TechFest)",  cost: 20*M, oneTime: true,  desc: "Investor e'tibori, talant xodim." },
  { id: "seo",      name: "SEO / kontent",             cost: 3*M,  oneTime: false, desc: "Sust, lekin doimiy organik o'sish (3 oydan keyin)." },
];

export const LOANS = {
  friends: { name: "Do'stlar / oila qarzi", amount: 20*M,  apr: 0,    months: 6,  desc: "0%. 6 oydan keyin bir yo'la qaytariladi." },
  micro:   { name: "Mikroqarz tashkiloti",  amount: 50*M,  apr: 0.36, months: 12, desc: "Tez, qimmat. 36% yillik." },
  bank:    { name: "Bank biznes-krediti",   amount: 300*M, apr: 0.24, months: 24, desc: "24% yillik. Kafolat: qiymat > 2× qarz." },
} as const;

export const EVENTS: EventCard[] = [
  { id: "inflation", title: "Inflyatsiya 9%", kind: "loss", weight: 3, text: "Markaziy bank yillik inflyatsiyani 9% deb e'lon qildi. Barcha xarajatlar 3 oy davomida +8%." },
  { id: "fx", title: "Dollar kursi sakradi", kind: "mixed", weight: 2, minMonth: 4, text: "So'm 6% ga qadrsizlandi. Import xarajatlar oshadi, eksport daromadi +25% (agar eksport bo'lsa)." },
  { id: "outage", title: "Elektr uzilishi", kind: "loss", weight: 3, text: "Tumanda 3 soatlik jadval uzilishlari boshlandi. Ushbu oyda ishlab chiqarish −30%. Generator yoki zaxira internet bo'lsa, ta'sir kamayadi.",
    choices: [
      { id: "generator", label: "Generator sotib olish", sub: "−15 mln · bu va keyingi uzilishlar ta'sirsiz", cost: 15*M },
      { id: "internet", label: "Zaxira 4G internet", sub: "−5 mln · ta'sir −30% → −10%", cost: 5*M },
      { id: "endure", label: "Chidab turish", sub: "Bu oy sifat o'sishi −30%" },
    ] },
  { id: "tax_audit", title: "Soliq tekshiruvi", kind: "risk", weight: 2, minMonth: 4, text: "Soliq inspeksiyasi hujjatlarni tekshirmoqda. Buxgalter bo'lsa — «toza». Bo'lmasa — 10 mln jarima. Yashirin daromad rejimida — 20× oylik soliq." },
  { id: "grant", title: "IT Park startap granti", kind: "luck", weight: 1, minMonth: 3, text: "Loyihangiz IT Park akseleratoriga tanlandi. Grant: 25 mln so'm." },
  { id: "talent", title: "Talant keldi", kind: "luck", weight: 1, minMonth: 3, text: "90+ ko'nikmali senior dasturchi sizga qo'shilmoqchi. Maoshi bozordan 20% yuqori — 54 mln/oy.",
    choices: [
      { id: "hire", label: "Yollash", sub: "54 mln/oy · ko'nikma 92 · 2 Middle tezlik" },
      { id: "skip", label: "Rad etish", sub: "Hozircha byudjet yo'q" },
    ] },
  { id: "dev_quit", title: "Asosiy dasturchi ketdi", kind: "loss", weight: 2, minMonth: 5, text: "Kayfiyat past — eng tajribali dasturchingiz boshqa kompaniyaga o'tdi. Mahsulot sifati 2 oy davomida −30." },
  { id: "cyber", title: "Kiberhujum", kind: "risk", weight: 1, minMonth: 6, text: "Serverlaringiz hujumga uchradi. Xavfsizlik tizimi bo'lmasa: 15 mln zarar + obro' −20." },
  { id: "partnership", title: "Hamkorlik taklifi", kind: "luck", weight: 1, minMonth: 6, text: "Yirik kompaniya sizga integratsiya shartnomasini taklif qildi: +50 mln daromad." },
  { id: "competitor", title: "Yangi raqobatchi bozorda", kind: "mixed", weight: 2, minMonth: 5, text: "Xuddi shunday mahsulot bilan raqobatchi chiqdi. Foydalanuvchi o'sishi 2 oy davomida −40%.",
    choices: [
      { id: "quality", label: "Sifat bilan javob", sub: "Bu oy sprint 2× samarali, marketing to'xtaydi" },
      { id: "price", label: "Narxni tushirish", sub: "Daromad −15% (2 oy), o'sish saqlanadi" },
      { id: "ignore", label: "E'tibor bermaslik", sub: "O'sish −40% (2 oy)" },
    ] },
  { id: "award", title: "«Yil startapi» mukofoti", kind: "luck", weight: 1, minMonth: 10, text: "Sizni yil startapi deb tan olishdi. Obro' +50, investorlar e'tibori." },
  { id: "family", title: "Oilaviy holat", kind: "neutral", weight: 1, text: "Xodimingizning to'yi. Jamoa bilan boradasizmi?",
    choices: [
      { id: "gift", label: "Sovg'a qilish", sub: "−3 mln · butun jamoa kayfiyati +10", cost: 3*M },
      { id: "congrats", label: "Tabriklash bilan cheklanish", sub: "Xarajat yo'q" },
    ] },
  { id: "navruz", title: "Navro'z bayrami", kind: "neutral", weight: 1, text: "Bayram kunlari — jamoa 3 kun dam oladi. Kayfiyat +8, sprint samarasi −10%." },
  { id: "hashar", title: "Hashar", kind: "neutral", weight: 1, minMonth: 2, text: "Mahalla hashari. Jamoa bilan qatnashdingiz — obro' +5." },
  { id: "intern", title: "Amaliyotchi talaba", kind: "luck", weight: 1, minMonth: 2, text: "TATU talabasi 3 oy bepul amaliyot o'tamoqchi. Sifat +2 (3 oy)." },
];

/** O'zbek ismlari — nomzodlar uchun */
export const NAMES = [
  "Dilnoza", "Bekzod", "Madina", "Sardor", "Jasur", "Nilufar", "Aziz", "Kamola", "Timur", "Sevara",
  "Otabek", "Gulnora", "Rustam", "Zilola", "Shohrux", "Feruza", "Doston", "Malika", "Ulug'bek", "Nargiza",
  "Farrux", "Dildora", "Javohir", "Shahnoza", "Sanjar", "Mohira",
];

export const STAGES = [
  { id: 0, name: "Uy / garaj",  months: "1–6 oy",   goal: "Oylik oqim musbat" },
  { id: 1, name: "Coworking",   months: "7–14 oy",  goal: "3 xodim · birinchi ofis" },
  { id: 2, name: "Kichik ofis", months: "15–30 oy", goal: "Mobil ilova · 10 xodim" },
  { id: 3, name: "IT Park",     months: "31–50 oy", goal: "SaaS · Series A" },
  { id: 4, name: "Unicorn",     months: "100 mlrd", goal: "Milliy brend" },
];
