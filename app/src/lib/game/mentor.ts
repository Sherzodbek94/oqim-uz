/**
 * OQIM — "Moliyaviy ustoz" tizimi (fix-13b, M1).
 * Har bir o'yinchi harakati kichik moliyaviy darsga aylanadi: kalit amallardan
 * keyin checkMentor() chaqiriladi, mos dars bir marta (o'yin ichida) ochiladi,
 * 🎓 bildirishnoma qo'shiladi va kartochka UI da ko'rsatiladi.
 */
import type { GameState, Player } from "./types";
import { debtLoad, notify, totalExpenses } from "./engine";
import { g } from "./strings";

export type LessonCategory = "qarz" | "aktiv" | "xarajat" | "bilim" | "strategiya" | "xavf";

export interface Lesson {
  id: string;
  category: LessonCategory;
  title: string;
  body: string;
  tip: string;
}

export const LESSON_CATEGORY_ICON: Record<LessonCategory, string> = {
  qarz: "💳",
  aktiv: "🏠",
  xarajat: "🧾",
  bilim: "📚",
  strategiya: "♟️",
  xavf: "🛡️",
};

export const LESSONS: Lesson[] = [
  /* ---- qarz ---- */
  {
    id: "istemol-krediti",
    category: "qarz",
    title: "Iste'mol krediti narxi",
    body: "Kreditga olingan iste'mol buyumi daromad keltirmaydi, lekin foizi bilan qaytariladi. 1 mln so'mlik narsa kreditda ko'pincha 1,3 mln ga tushadi.",
    tip: "Iste'mol buyumini naqd pulga yig'ib oling — kreditni faqat aktiv uchun ajrating.",
  },
  {
    id: "qarz-qarmogi",
    category: "qarz",
    title: "Qarz qarmog'i",
    body: "Kredit to'lovlari daromadingizning 60%-idan oshsa, har qanday kutilmagan xarajat sizni penya va bankrotlikka suraydi. Bu — qizil zona.",
    tip: "Avval eng qimmat kreditni yoping, yangi qarz olishni to'xtating.",
  },
  {
    id: "qarz-qonchasi",
    category: "qarz",
    title: "Qarz qonchasi usuli",
    body: "Bir nechta kredit bo'lsa, avval eng kichigini to'liq yoping — bo'shagan to'lovni keyingisiga yo'naltiring. Qoncha kabi kattalashib boradi.",
    tip: "Ro'yxat tuzing: eng kichik qoldiqdan boshlab yoping.",
  },
  {
    id: "kredit-tarixi",
    category: "qarz",
    title: "Kredit tarixi qimmat",
    body: "Penya faqat pul emas — kredit reytingingizni ham tushiradi. Past reyting keyingi kreditlarni qimmatlatiradi yoki umuman yopadi.",
    tip: "To'lov kunini taqvimga yozing; naqd zaxira penya xavfini kamaytiradi.",
  },
  {
    id: "muddatidan-oldingi",
    category: "qarz",
    title: "Muddatidan oldin yopish",
    body: "Kreditni erta yopish — kafolatlangan foyda: to'lanmay qolgan foiz sizning daromadingiz. Bo'shagan oylik to'lov endi sizga ishlaydi.",
    tip: "Qo'lda ortiqcha naqd paydo bo'lsa, avval qimmat kreditga yo'naltiring.",
  },
  {
    id: "kredit-reytingi",
    category: "qarz",
    title: "Reyting — pulga aylanadi",
    body: "Yuqori kredit reytingi arzonroq foiz va kattaroq limit demak. 650 va 780 reyting farqi millionlab so'm foiz farqidir.",
    tip: "To'lovlarni kechiktirmang — reyting oshsa, bank sizga arzonroq qarz beradi.",
  },
  /* ---- aktiv ---- */
  {
    id: "aktiv-passiv",
    category: "aktiv",
    title: "Aktiv vs Passiv",
    body: "Aktiv — cho'ntagingizga pul soladigan narsa, passiv — undan pul oladigan narsa. Birinchi aktivni sotib oldingiz: endi pul siz uchun ishlaydi.",
    tip: "Har oy savol bering: bu xarajat meni boyitadimi yoki qamraydimi?",
  },
  {
    id: "roi-cashflow",
    category: "aktiv",
    title: "ROI va naqd oqim farqi",
    body: "Aktiv qanchaga oshishi (ROI) va har oy qancha pul keltirishi (cashflow) — turli narsalar. Erkinlik uchun naqd oqim muhimroq.",
    tip: "Bitimdan oldin oylik cashflow'ni xarajatlaringiz bilan solishtiring.",
  },
  {
    id: "diversifikatsiya",
    category: "aktiv",
    title: "Diversifikatsiya",
    body: "Bir xil turdagi uchinchi aktiv — barcha tuxumlaringiz bir savatda. Shu soha qulasa, butun daromadingiz xavf ostida qoladi.",
    tip: "Keyingi bitimni boshqa turdan tanlang: biznes, ko'chmas mulk, birja.",
  },
  {
    id: "murakkab-foiz",
    category: "aktiv",
    title: "Murakkab foiz kuchi",
    body: "Depozit va obligatsiyada foiz foiz ustiga qo'shiladi — vaqt o'tgan sari o'sish tezlashadi. Bu boylikning eng sokin dvigateli.",
    tip: "Barqaror, past xavfli qismini portfelingizda doim saqlang.",
  },
  {
    id: "likvidlik",
    category: "aktiv",
    title: "Likvidlik nima",
    body: "Aktivni tez va arzon sotish qiyin bo'lsa — u likvid emas. Shoshilinch sotuvda likvidsiz aktiv qiymatining yarmiga ketishi mumkin.",
    tip: "Favqulodda zaxirani likvid shaklda (naqd/depozit) tuting.",
  },
  {
    id: "fond-birjasi",
    category: "aktiv",
    title: "Birja — kichikdan boshlanadi",
    body: "Aksiyalar dividend keltiradi va vaqt bilan o'sadi, lekin narxi tebranadi. Kichik summadan boshlab o'rganish — aqlli yo'l.",
    tip: "Bitta qog'ozga hamma narsani qo'ymang; dividendni qayta investitsiya qiling.",
  },
  {
    id: "passiv-ozodlik",
    category: "aktiv",
    title: "Passiv daromad = erkinlik",
    body: "Passiv daromadingiz xarajatlarni qopladi — endi ishlash tanlov, majburiyat emas. Moliyaviy erkinlik aynan shu nuqtada boshlanadi.",
    tip: "Erkinlikni saqlash uchun oqimlarni diversifikatsiya qilishda davom eting.",
  },
  /* ---- xarajat ---- */
  {
    id: "zaxira-jamg'arma",
    category: "xarajat",
    title: "Favqulodda zaxira",
    body: "Naqd pulingiz bir oylik xarajatdan ham kam — bitta kutilmagan xarajat kreditga majbur qiladi. 3–6 oylik xarajat zaxirasi tinch uyqu beradi.",
    tip: "Avval zaxira jamg'aring, keyin katta bitimlarga kiring.",
  },
  {
    id: "pul-yotirmasi",
    category: "xarajat",
    title: "Yotgan pul yo'qotadi",
    body: "Ikki oydan beri katta naqd summa ishlamay yotibdi — inflyatsiya uni har oy yeydi. Zaxiradan ortig'i aktivga aylanishi kerak.",
    tip: "Zaxira chegarasidan tashqari pulni depozit yoki bitimga yo'naltiring.",
  },
  {
    id: "hayot-inflyatsiyasi",
    category: "xarajat",
    title: "Turmush darajasi inflyatsiyasi",
    body: "Maosh oshganda xarajatlar ham birga oshsa, farq sezilmaydi. Haqiqiy boylik — daromad va xarajat orasidagi tafovutdan tug'iladi.",
    tip: "Har oshgan so'mning yarmini avtomatik investitsiyaga ajrating.",
  },
  {
    id: "oilaviy-byudjet",
    category: "xarajat",
    title: "Farzand — byudjet qatori",
    body: "Yangi oila a'zosi oylik xarajatni doimiy oshiradi. Bu quvonch, lekin moliyaviy rejasiz — bosim.",
    tip: "Katta hayotiy qarorlardan oldin 6 oylik zaxira to'plang.",
  },
  {
    id: "muvozanat",
    category: "xarajat",
    title: "Hordiq ham rejalashtiriladi",
    body: "Dam olishga pul sarflash yomon emas — rejadan tashqari sarflash yomon. Zavq byudjetga kiritilsa, aybdorliksiz yoqadi.",
    tip: "\"O'zimga\" degan qator ajrating — undan oshmaversa, hamma narsa joyida.",
  },
  {
    id: "avans-xatar",
    category: "xarajat",
    title: "Avans — ertangi maoshdan",
    body: "Avans oy boshida yengillik, oy oxirida bo'shliq. Uni iste'molga yechsangiz, oy kunida naqd tanqisligi kutadi.",
    tip: "Avansni olingach xarajat qilmang — oy oxirigacha zaxirada saqlang.",
  },
  /* ---- bilim ---- */
  {
    id: "bilim-investitsiyasi",
    category: "bilim",
    title: "Bilimga investitsiya",
    body: "Bu bitim uchun bilimingiz yetmedi — va bu bepul dars. Eng arzon investitsiya — o'z bilimingiz: u hech qachon bankrot bo'lmaydi.",
    tip: "Bilim markazida darajangizni oshiring — yopiq bitimlar ochiladi.",
  },
  {
    id: "oziga-investitsiya",
    category: "bilim",
    title: "O'ziga investitsiya",
    body: "Kurs, kitob, mentor — qisqa muddatda xarajat, uzoq muddatda eng yuqori ROI. Daromadingiz bilimingizdan tez oshmaydi.",
    tip: "Har oy daromadning kichik qismini o'sishga sarflang.",
  },
  {
    id: "kvadrant-sayohati",
    category: "bilim",
    title: "Kvadrantlar sayohati",
    body: "E → S → B → I: har kvadrantda pul topish qonuni boshqacha. Yuqoriga o'tish — pul ko'payishidan oldin fikrlash o'zgarishi.",
    tip: "Keyingi kvadrant shartlarini hisobot panelidan kuzating.",
  },
  /* ---- strategiya ---- */
  {
    id: "mijoz-tizim",
    category: "strategiya",
    title: "Mijoz — bu tizim",
    body: "Birinchi mijozingiz paydo bo'ldi: endi daromad sizning soatingizga emas, tizimga bog'lanadi. Soddalashtiring — takrorlanadigan daromad shu.",
    tip: "Sadoqatni oshiring: sodiq mijoz ketmaydi va oshib boradi.",
  },
  {
    id: "imkoniyat-qiymati",
    category: "strategiya",
    title: "Imkoniyat qiymati",
    body: "Har \"ha\" — boshqa imkoniyatga \"yo'q\". Bitimdan voz kechish xato emas: pul va e'tibor cheklangan resurs.",
    tip: "Bitimni emas, bitimlar oqimini solishtiring — yaxshisi keladi.",
  },
  /* ---- xavf ---- */
  {
    id: "urgent-sale",
    category: "xavf",
    title: "Shoshilinch sotuv nima uchun qimmat",
    body: "Shoshilinch sotuvda narx bozor qiymati × sotuv koeffitsienti × shoshilinch chegirma bilan topiladi: likvidsiz aktiv (masalan, biznes) qiymatining 30%-igacha yo'qotadi. Shoshilinchlik — sotuvchi uchun eng qimmat holat.",
    tip: "Likvid zaxira (naqd/depozit) saqlang — aktivni majburiy arzon sotishdan himoya qiladi.",
  },
  {
    id: "foizsiz-qarz",
    category: "qarz",
    title: "Foizsiz qarz — ishonch",
    body: "Qarindoshlardan olingan qarz foizsiz, lekin uning narxi — ishonch. Vaqtida qaytarsangiz, munosabat saqlanadi; kechiktirsangiz, obro'ingiz zarar ko'radi va bir muddat hech kim bermaydi.",
    tip: "Qarz muddatini taqvimga yozing va qaytarish sanasidan oldin summani ajratib qo'ying.",
  },
  {
    id: "bir-daromad-xavfi",
    category: "xavf",
    title: "Yagona daromad xavfi",
    body: "Ishdan bo'shatish bitta daromad manbaiga tayanish xavfini ko'rsatdi. Sug'urta kabi, ikkinchi daromad oqimi — falokat kunlariga himoya.",
    tip: "Passiv daromadni maoshga muqobil emas, himoya sifatida quring.",
  },
];

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l])
);

/* ---------------- Trigerring engine ---------------- */

/** Mentor konteksti — qaysi amal tugaganini bildiradi. */
export interface MentorContext {
  kind:
    | "doodad-credit"
    | "buy-asset"
    | "pass-deal"
    | "payday"
    | "month"
    | "avans"
    | "baby"
    | "downsized"
    | "weekend"
    | "loan"
    | "payoff"
    | "sell"
    | "exchange-buy"
    | "knowledge"
    | "client"
    | "quadrant"
    | "locked-deal"
    | "qarz"
    | "forced-sell"
    | "escape";
  /** payday: shu oyda penya hisoblandi */
  penya?: boolean;
  /** payday: shu oyda maosh indeksatsiya bo'ldi */
  indexed?: boolean;
}

/**
 * Kontekstga mos darslarni tekshiradi. Har bir dars o'yinda bir marta ochiladi
 * (p.lessonsSeen). Ochilgan darslar qaytariladi va 🎓 bildirishnoma yoziladi.
 */
export function checkMentor(s: GameState, p: Player, ctx: MentorContext): Lesson[] {
  if (!Array.isArray(p.lessonsSeen)) p.lessonsSeen = [];
  const ids: string[] = [];
  const fire = (id: string) => {
    if (!p.lessonsSeen.includes(id) && LESSON_BY_ID[id]) ids.push(id);
  };

  switch (ctx.kind) {
    case "doodad-credit":
      fire("istemol-krediti");
      break;
    case "buy-asset": {
      if (p.assets.length === 1) fire("aktiv-passiv");
      if (p.assets.length === 2) fire("roi-cashflow");
      const counts: Record<string, number> = {};
      for (const a of p.assets) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
      if (Object.values(counts).some((n) => n >= 3)) fire("diversifikatsiya");
      const last = p.assets[p.assets.length - 1];
      if (last && (last.kind === "deposit" || last.kind === "bonds")) fire("murakkab-foiz");
      break;
    }
    case "pass-deal":
      fire("imkoniyat-qiymati");
      break;
    case "payday":
      if (ctx.penya) fire("kredit-tarixi");
      if (ctx.indexed || p.salaryMultiplier > 1) fire("hayot-inflyatsiyasi");
      break;
    case "month":
      if (debtLoad(p) > 0.6) fire("qarz-qarmogi");
      if ((p.idleCashMonths ?? 0) >= 2) fire("pul-yotirmasi");
      if (p.cash < totalExpenses(p)) fire("zaxira-jamg'arma");
      if (p.loans.length >= 2) fire("qarz-qonchasi");
      break;
    case "avans":
      fire("avans-xatar");
      break;
    case "baby":
      fire("oilaviy-byudjet");
      break;
    case "downsized":
      fire("bir-daromad-xavfi");
      break;
    case "weekend":
      fire("muvozanat");
      break;
    case "loan":
      fire("kredit-reytingi");
      break;
    case "payoff":
      fire("muddatidan-oldingi");
      break;
    case "sell":
      fire("likvidlik");
      break;
    case "exchange-buy":
      fire("fond-birjasi");
      break;
    case "knowledge":
      fire("oziga-investitsiya");
      break;
    case "client":
      if (p.clients.length > 0) fire("mijoz-tizim");
      break;
    case "quadrant":
      fire("kvadrant-sayohati");
      break;
    case "locked-deal":
      fire("bilim-investitsiyasi");
      break;
    case "qarz":
      fire("foizsiz-qarz");
      break;
    case "forced-sell":
      fire("urgent-sale");
      break;
    case "escape":
      fire("passiv-ozodlik");
      break;
  }

  const fired: Lesson[] = [];
  for (const id of ids) {
    if (p.lessonsSeen.includes(id)) continue;
    p.lessonsSeen.push(id);
    const lesson = LESSON_BY_ID[id];
    fired.push(lesson);
    notify(s, {
      icon: "🎓",
      title: g.mentor.notifTitle,
      body: `${p.name}: ${lesson.title}`,
      tone: "gold",
    });
  }
  return fired;
}
