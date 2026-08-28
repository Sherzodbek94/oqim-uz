/** Landing data — professions & investments (home.md §S5, §S6; sync with game deck). */

export interface Profession {
  id: string;
  name: string;
  flavor: string;
  avatar: string;
  salary: number; // UZS / oy
  expenses: number;
  savings: number;
  debts: number;
}

export const professions: Profession[] = [
  { id: "teacher",    name: "Maktab o'qituvchisi", flavor: "Bilim ulashadi — byudjet hisoblaydi", avatar: "/avatar-teacher.png",    salary: 6_500_000,  expenses: 5_650_000,  savings: 2_500_000,  debts: 5_000_000 },
  { id: "doctor",     name: "Shifokor",            flavor: "Bemorlarni davolaydi — o'zini emas",  avatar: "/avatar-doctor.png",     salary: 12_000_000, expenses: 10_400_000, savings: 5_000_000,  debts: 18_000_000 },
  { id: "taxi",       name: "Taksi haydovchi",     flavor: "Kun bo'yi yo'lda — Cobalt qarzda",    avatar: "/avatar-taxi.png",       salary: 9_000_000,  expenses: 7_900_000,  savings: 3_000_000,  debts: 30_000_000 },
  { id: "programmer", name: "Dasturchi (senior)",  flavor: "Kod yozadi — kapital yig'adi",        avatar: "/avatar-programmer.png", salary: 28_000_000, expenses: 23_200_000, savings: 15_000_000, debts: 90_000_000 },
  { id: "trader",     name: "Sotuvchi",            flavor: "Bozor rastasidan tortib do'kongacha", avatar: "/avatar-trader.png",     salary: 7_500_000,  expenses: 6_600_000,  savings: 2_500_000,  debts: 15_000_000 },
  { id: "banker",     name: "Bankir",              flavor: "Boshqalarning pulini sanaydi",        avatar: "/avatar-banker.png",     salary: 18_000_000, expenses: 15_400_000, savings: 8_000_000,  debts: 50_000_000 },
  { id: "builder",    name: "Quruvchi (usta)",     flavor: "Uylar quradi — o'zinikini orzu qiladi", avatar: "/avatar-builder.png",  salary: 10_000_000, expenses: 8_700_000,  savings: 4_000_000,  debts: 12_000_000 },
  { id: "waiter",     name: "Ofitsiant",           flavor: "Restoranda xizmat qiladi, choy puli yig'adi", avatar: "/avatar-waiter.png", salary: 6_000_000, expenses: 5_200_000, savings: 2_000_000, debts: 4_000_000 },
  { id: "farmer",     name: "Fermer",              flavor: "Yer ishlaydi — hosil kabi o'sadi",    avatar: "/avatar-farmer.png",     salary: 14_000_000, expenses: 12_200_000, savings: 5_500_000,  debts: 30_000_000 },
  { id: "lawyer",     name: "Advokat",             flavor: "Shartnomalarni o'qiydi — bitimlarni ham", avatar: "/avatar-lawyer.png", salary: 22_000_000, expenses: 18_800_000, savings: 10_000_000, debts: 60_000_000 },
  { id: "smm-manager", name: "SMM menejer",        flavor: "Brendlarning tarmoqlarini yuritadi",  avatar: "/avatar-programmer.png", salary: 10_000_000, expenses: 8_200_000,  savings: 5_000_000,  debts: 6_000_000 },
  { id: "logist",     name: "Logist",              flavor: "Yuk oqimini boshqaradi",              avatar: "/avatar-taxi.png",       salary: 11_000_000, expenses: 9_300_000,  savings: 5_000_000,  debts: 18_000_000 },
  { id: "oshpaz",     name: "Oshpaz",              flavor: "Taomi mashhur, jamg'armasi kamlik qiladi", avatar: "/avatar-waiter.png", salary: 9_000_000, expenses: 7_700_000,  savings: 4_000_000,  debts: 6_000_000 },
  { id: "dizayner",   name: "Dizayner",            flavor: "Frilans loyihalar — barqarorlikni o'zi quradi", avatar: "/avatar-programmer.png", salary: 13_000_000, expenses: 10_900_000, savings: 6_000_000, debts: 8_000_000 },
  { id: "tadbirkor",  name: "Tadbirkor (kichik biznes)", flavor: "O'z biznesining egasi — daromad ham, xarajat ham katta", avatar: "/avatar-trader.png", salary: 20_000_000, expenses: 17_000_000, savings: 9_000_000, debts: 50_000_000 },
  { id: "stomatolog", name: "Shifokor-stomatolog", flavor: "Xususiy klinika — daromad yuqori, uskuna qarzi ham", avatar: "/avatar-doctor.png", salary: 26_000_000, expenses: 22_000_000, savings: 12_000_000, debts: 45_000_000 },
];

export type InvestCategory = "realestate" | "business" | "securities" | "currency";

export interface Investment {
  id: string;
  title: string;
  category: InvestCategory;
  icon: string; // lucide icon name key resolved in component
  price: number;
  cashflow?: number; // monthly
  growthNote?: string; // for non-cashflow assets
  roi: string; // e.g. "ROI 25%/yil"
  risk: string;
}

export const investments: Investment[] = [
  { id: "flat",     title: "Toshkent kvartirasi (ijaraga)", category: "realestate", icon: "Home",            price: 550_000_000, cashflow: 2_100_000,  roi: "ROI 5%/yil",   risk: "bozor narxiga bog'liq" },
  { id: "choyxona", title: "Choyxona",                      category: "business",   icon: "Coffee",          price: 90_000_000,  cashflow: 3_000_000,  roi: "ROI 40%/yil",  risk: "joylashuvga bog'liq" },
  { id: "barber",   title: "Sartaroshxona",                 category: "business",   icon: "Scissors",        price: 60_000_000,  cashflow: 2_200_000,  roi: "ROI 44%/yil",  risk: "mijozlar oqimi talab qilinadi" },
  { id: "shop",     title: "Oziq-ovqat do'koni",            category: "business",   icon: "ShoppingBasket",  price: 70_000_000,  cashflow: 2_400_000,  roi: "ROI 41%/yil",  risk: "tovar aylanmasiga bog'liq" },
  { id: "telegram", title: "Telegram onlayn do'kon",        category: "business",   icon: "Send",            price: 25_000_000,  cashflow: 950_000,    roi: "ROI 46%/yil",  risk: "reklama xarajati oshishi mumkin" },
  { id: "kofetogo", title: "Kofe-to-go nuqtasi",            category: "business",   icon: "Coffee",          price: 30_000_000,  cashflow: 1_200_000,  roi: "ROI 48%/yil",  risk: "joylashuv va oqimga bog'liq" },
  { id: "darkkitchen", title: "Dark kitchen (yetkazish oshxonasi)", category: "business", icon: "ChefHat",   price: 65_000_000,  cashflow: 2_500_000,  roi: "ROI 46%/yil",  risk: "yetkazish platformalariga bog'liq" },
  { id: "sewing",   title: "Tikuv sexi",                    category: "business",   icon: "Factory",         price: 250_000_000, cashflow: 7_400_000,  roi: "ROI 36%/yil",  risk: "eksport buyurtmalarga bog'liq" },
  { id: "franchise", title: "Fast-food franshizasi",        category: "business",   icon: "Store",           price: 380_000_000, cashflow: 11_500_000, roi: "ROI 36%/yil",  risk: "royalti va brend qoidalariga bog'liq" },
  { id: "deposit",  title: "Bank depoziti (22% yillik)",    category: "securities", icon: "Landmark",        price: 50_000_000,  cashflow: 900_000,    roi: "ROI 22%/yil",  risk: "past — depozit kafolatlanadi" },
  { id: "dqg",      title: "Davlat qimmatli qog'ozlari",    category: "securities", icon: "Landmark",        price: 50_000_000,  cashflow: 750_000,    roi: "ROI 18%/yil",  risk: "past — davlat kafolati" },
  { id: "ipo",      title: "IPO aksiyalari",                category: "securities", icon: "TrendingUp",      price: 30_000_000,  growthNote: "o'sim potensiali", roi: "ROI 25%/yil", risk: "yuqori o'zgaruvchanlik" },
  { id: "usd",      title: "AQSH dollori",                  category: "currency",   icon: "DollarSign",      price: 40_000_000,  growthNote: "kurs bilan o'sadi", roi: "ROI 8%/yil", risk: "valyuta kursiga bog'liq" },
];

export interface EventItem {
  title: string;
  icon: string;
  effect: string;
  tone: "clay" | "emerald" | "sky";
}

export const eventItems: EventItem[] = [
  { title: "Inflyatsiya 8%",            icon: "Zap",        effect: "Xarajatlar oshadi",    tone: "clay" },
  { title: "To'y taklifi",              icon: "Mail",       effect: "−2 000 000 so'm",      tone: "clay" },
  { title: "Davlat subsidiyasi",        icon: "Landmark",   effect: "+5 000 000 so'm",      tone: "emerald" },
  { title: "Imtiyozli ipoteka",         icon: "KeyRound",   effect: "Yangi imkoniyat",      tone: "emerald" },
  { title: "Mehnat migratsiyasi taklifi", icon: "Plane",    effect: "Risk yoki omad?",      tone: "sky" },
  { title: "Elektr/gaz uzilishi",       icon: "PowerOff",   effect: "Biznes 1 oy to'xtaydi", tone: "clay" },
  { title: "Dollar kursi sakradi",      icon: "TrendingUp", effect: "Valyuta egalari yutadi", tone: "sky" },
  { title: "Oilaviy bayram",            icon: "Gift",       effect: "Kutilmagan xarajat",   tone: "clay" },
];
