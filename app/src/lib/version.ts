/**
 * OQIM — versiya ko'rsatkichi (fix-13b, M2).
 * Kelajakdagi relizlar: APP_VERSION ni oshiring + APP_CHANGELOG ga yozuv qo'shing.
 * Birinchi yuklanishda (yoki yangi versiyada) bir martalik "Yangi versiya" paneli chiqadi.
 */

export const APP_VERSION = 19;

export interface ChangelogEntry {
  v: number;
  points: string[];
}

export const APP_CHANGELOG: ChangelogEntry[] = [
  { v: 1, points: ["Ilk reliz — bosh sahifa, qoidalar, o'ynaladigan doska"] },
  { v: 2, points: ["Kvadrat doska", "Kredit / bo'lib to'lash", "Kengaytirilgan karta kolodalar"] },
  { v: 3, points: ["Dam olish kuni va Hayotiy hodisalar kolodasi", "Kasbga mos hodisalar", "Kredit takliflari"] },
  { v: 4, points: ["Qahramonlar va qobiliyatlar", "O'z personaj", "Fond birjasi", "Dilemma hodisalar"] },
  { v: 5, points: ["Annuitet kreditlar (amortizatsiya)", "Bosqichli Erkinlik yo'li", "Qarz yuki ko'rsatkichi"] },
  { v: 6, points: ["Kredit reytingi va garov", "Moliyaviy kvadrantlar", "30 kunlik kalendar doska", "Avans katagi"] },
  { v: 7, points: ["OQIM rebrending", "Profil sahifasi va yutuqlar", "Kvadrant progressiyasi, mijozlar, bilim darajasi", "Bozor qiymati bo'yicha sotish"] },
  { v: 8, points: ["Xarajat validatsiyasi yumshatildi", "Kundalik aylana / Erkinlik yo'li atamalari", "Yangi hero rasmi"] },
  { v: 9, points: ["Premium doska dizayni", "Bilim olish markazi", "Mijoz topish markazi"] },
  { v: 10, points: ["Markaziy hub qayta loyiha", "Bildirishnomalar markazi 🔔", "Universal orzular", "Mobil tuzatishlar"] },
  { v: 11, points: ["Bilim/Mijoz markazlari cooldown tizimi", "Menejer yollash", "Oy kalendari aniqlandi"] },
  { v: 12, points: ["Avans sof maoshdan (30%)", "To'lovlar auditi aniqlandi", "Fond birjasi oynasi yaxshilandi"] },
  {
    v: 13,
    points: [
      "🎓 Moliyaviy ustoz — har harakatingizdan amaliy darslar (25 ta dars)",
      "Darslar tabi va profil kolleksiyasi",
      "Mijozga ish taklifi mexanikasi",
      "Versiya ko'rsatkichi va yangiliklar paneli",
    ],
  },
  { v: 14, points: ["Moliyaviy ustoz darslari kengaytirildi", "Qarz olish bloklash muddati"] },
  { v: 15, points: ["Farzandlar hayot tsikli va ta'lim tanlovi", "Qiyinlik darajasi", "Tez rejim"] },
  { v: 16, points: ["🌿 Yo'l xaritasi rejimi", "Tiklangan funksiyalar"] },
  {
    v: 17,
    points: [
      "🗓 Reja rejimi — oy kunlarini o'zingiz rejalang",
      "6 xil harakat plitkasi: Ish, Bilim, Mijoz, Bozor, Hodisa, Dam olish",
      "Maosh ish kunlariga mutanosib",
      "Botlar ham reja tuzadi",
    ],
  },
  {
    v: 18,
    points: [
      "🗓 Reja rejimi endi haftalik — faqat joriy hafta ochiq, keyingilari tuman ostida",
      "⛰️ Yo'l xaritasi 'Hayot cho'qqisi'ga aylantirildi — 4 bosqichli ko'tarilish",
      "Kvadrant zonalar xaritada vizual ko'rinadi",
    ],
  },
  {
    v: 19,
    points: [
      "🌐 Onlayn multiplayer — 4 kishigacha xona kodi orqali",
      "Navbat taymeri (60/120 sek)",
      "Botlar bilan aralash o'yin",
      "Cloudflare Workers serveri",
    ],
  },
];

export const VERSION_KEY = "oqim-last-version";

/** Saqlangan oxirgi ko'rilgan versiya (yo'q/buzilsa — 0). */
export function readLastVersion(): number {
  try {
    const raw = localStorage.getItem(VERSION_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Joriy versiyani ko'rilgan deb belgilash. */
export function markVersionSeen(): void {
  try {
    localStorage.setItem(VERSION_KEY, String(APP_VERSION));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Yangi versiya paneli kerakmi? Sof funksiya (smoke test uchun):
 * lastSeen < current bo'lsa — joriy versiya yozuvini qaytaradi, aks holda null.
 */
export function whatsNewFor(lastSeen: number, current: number = APP_VERSION): ChangelogEntry | null {
  if (lastSeen >= current) return null;
  const entry = APP_CHANGELOG.find((e) => e.v === current);
  return entry ?? null;
}
