import type { EventCard, EventChoice, EventEffect } from "./types";
import { MARKET_ACTIONS } from "./business-market";
import { PRODUCTION_LINE_MONTHS } from "./business-economy";
import { formatUZSCompact } from "../format";

function choice(id: string, label: string, hint: string, effect: EventEffect): EventChoice {
  return { id, label, hint, effect, resultText: "Biznes qarori natijasi", lessonText: "Naqd zaxira, oylik xarajat va buyurtma muddatini birga tekshiring." };
}
const cancel = choice("operations-cancel", "Buyurtmani bekor qilish", "Tushum yo'q; olingan zaxira saqlanadi", { type: "business-operation", action: "cancel" });
const wait = choice("operations-wait", "Hozircha kutish", "Pul sarflanmaydi; muddat yangi oyda kamayadi", { type: "nothing" });
const hire = choice("operations-hire", "Xodim yollash", "−1 mln hozir · −1 mln/oy · quvvat +10", { type: "business-operation", action: "hire" });

const boost = MARKET_ACTIONS["boost-demand"];
const lock = MARKET_ACTIONS["lock-input"];
const raise = MARKET_ACTIONS["raise-input"];
const repair = MARKET_ACTIONS["repair-line"];
const delay = MARKET_ACTIONS["delay-line"];

/** Sohaviy bozor tanlovi: narxni qulflash yoki ko'tarilishni qabul qilish. */
function supplyDilemma(id: string, title: string, desc: string, model: "trade" | "production" | "service"): EventCard {
  return {
    id, title, desc, icon: "Truck",
    requiresQuadrant: "B", requiresBusiness: true, requiresBusinessModel: model, businessStage: "offer",
    effect: { type: "nothing" },
    choices: [
      choice(`${id}-lock`, "Oldindan shartnoma tuzish", `−${formatUZSCompact(lock.cost)} · ta'minot narxi ${lock.months} oy qulflanadi`, { type: "business-market", action: "lock-input" }),
      choice(`${id}-accept`, "Yangi narxni qabul qilish", `Hozir to'lov yo'q · ta'minot narxi +${raise.pct}%`, { type: "business-market", action: "raise-input" }),
    ],
  };
}

/** Sohaviy bozor tanlovi: talabni pullik oshirish yoki o'tkazib yuborish. */
function demandDilemma(id: string, title: string, desc: string, label: string, model: "trade" | "production" | "service"): EventCard {
  return {
    id, title, desc, icon: "Megaphone",
    requiresQuadrant: "B", requiresBusiness: true, requiresBusinessModel: model, businessStage: "offer",
    effect: { type: "nothing" },
    choices: [
      choice(`${id}-invest`, label, `−${formatUZSCompact(boost.cost)} · talab +${boost.pct}% · ${boost.months} oy`, { type: "business-market", action: "boost-demand" }),
      choice(`${id}-skip`, "Bu oy o'tkazib yuborish", "Pul sarflanmaydi; talab o'z holicha o'zgaradi", { type: "nothing" }),
    ],
  };
}

export const BUSINESS_EVENTS: EventCard[] = [
  {
    id: "operations-order", title: "Qo'shimcha buyurtma", icon: "Briefcase",
    desc: "Tanlangan biznes uchun 20 birlik qo'shimcha ish: zaxira 2 mln, tushum 3,6 mln. Bajarish muddati 3 oy. Bu bazaviy oylik faoliyatdan alohida.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "offer", effect: { type: "nothing" },
    choices: [choice("operations-accept", "Buyurtmani qabul qilish", "Hozir tushum yo'q; zaxira va quvvat kerak", { type: "business-operation", action: "accept" }), wait],
  },
  {
    id: "operations-procure", title: "Buyurtma zaxirasini tayyorlash", icon: "Package",
    desc: "Faol buyurtmali biznes uchun yetishmayotgan zaxirani xarid qiling. Tovar biznesida bu mahsulot, xizmat biznesida ish uchun materiallar paketidir.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "procure", effect: { type: "nothing" },
    choices: [choice("operations-restock", "Zaxira xarid qilish", "100 ming/birlik · ko'pi bilan 2 mln · qarz avtomatik olinmaydi", { type: "business-operation", action: "restock" }), cancel],
  },
  {
    id: "operations-produce", title: "Liniyani yuklash", icon: "Factory",
    desc: `Xomashyo omborda. Uni ishlab chiqarish liniyasiga bering: quvvat hozir band bo'ladi va ${PRODUCTION_LINE_MONTHS} oydan keyin tayyor mahsulot omborga tushadi. Tayyor mahsulotsiz buyurtma topshirilmaydi.`,
    requiresQuadrant: "B", requiresBusiness: true, requiresBusinessModel: "production", businessStage: "produce", effect: { type: "nothing" },
    choices: [choice("operations-produce", "Liniyaga berish", "Xomashyo → tayyor mahsulot · quvvat band bo'ladi", { type: "business-operation", action: "produce" }), wait],
  },
  {
    id: "operations-line", title: "Liniya ishlamoqda", icon: "Clock",
    desc: "Partiya ishlab chiqarilmoqda. Tayyor mahsulot omborga tushgach buyurtma topshiriladi. Kutish paytida quvvatni oshirish mumkin; buyurtma muddati davom etadi.",
    requiresQuadrant: "B", requiresBusiness: true, requiresBusinessModel: "production", businessStage: "line", effect: { type: "nothing" },
    choices: [wait, hire],
  },
  {
    id: "operations-deliver", title: "Buyurtmani topshirish", icon: "Truck",
    desc: "Zaxira va quvvat yetarli. Topshirganda 20 birlik zaxira sarflanadi va 3,6 mln tushum keladi. Biznes to'xtagan bo'lsa, topshirish bajarilmaydi.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "deliver", effect: { type: "nothing" },
    choices: [choice("operations-deliver", "Buyurtmani topshirish", "+3,6 mln naqd · quvvatdan 20 birlik · zaxira −20", { type: "business-operation", action: "deliver" }), cancel],
  },
  {
    id: "operations-capacity", title: "Quvvat yetishmayapti", icon: "Users",
    desc: "Faol buyurtmaga bu oy bo'sh quvvat yetmaydi. Xodim bilan quvvatni oshiring yoki yangi oyda quvvat tiklanishini kuting. Buyurtma muddati davom etadi.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "capacity", effect: { type: "nothing" },
    choices: [hire, wait],
  },
  {
    id: "operations-equipment", title: "Qo'shimcha ish uchun uskuna", icon: "Hammer",
    desc: "Tanlangan biznesning qo'shimcha buyurtma quvvatini oshirish mumkin. Uskuna o'zi tushum bermaydi; buyurtma kerak.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "offer", effect: { type: "nothing" },
    choices: [choice("operations-upgrade", "Uskuna olish", "−5 mln · aktiv qiymati +5 mln · quvvat +10 (maksimal 100)", { type: "business-operation", action: "upgrade" }), wait],
  },
  {
    id: "operations-staff", title: "Jamoani kengaytirish", icon: "Users",
    desc: "Qo'shimcha buyurtmalar uchun xodim yollash mumkin. Oylik maosh buyurtma bo'lmasa ham to'lanadi. Ko'pi bilan 5 qo'shimcha xodim.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "offer", effect: { type: "nothing" },
    choices: [hire, wait],
  },
  supplyDilemma("sector-trade-supply", "Ta'minotchi narxni oshirdi",
    "Do'kon ta'minotchisi keyingi partiyalarga yangi narx e'lon qildi. Oldindan shartnoma narxni bir necha oyga qotiradi; rad etsangiz sotilgan tovar tannarxi oshadi.", "trade"),
  demandDilemma("sector-trade-campaign", "Mavsumiy savdo aksiyasi",
    "Mavsum boshlandi: reklama va chegirma kampaniyasi savdo hajmini bir necha oyga ko'taradi. Kampaniya tushumni kafolatlamaydi, faqat talab indeksini oshiradi.",
    "Kampaniyani ishga tushirish", "trade"),
  supplyDilemma("sector-production-inputs", "Xomashyo bozori qimmatladi",
    "Xomashyo yetkazib beruvchi narxni qayta ko'rib chiqdi. Uzoq muddatli shartnoma narxni qotiradi; aks holda har oylik xomashyo xarajati oshadi.", "production"),
  {
    id: "sector-production-line", title: "Liniyada uzilish", icon: "Wrench",
    desc: "Ishlab chiqarish liniyasida nosozlik aniqlandi. Shoshilinch ta'mir partiyani jadvalda ushlab qoladi; kutish partiyani bir oyga kechiktiradi va buyurtma muddati davom etaveradi.",
    requiresQuadrant: "B", requiresBusiness: true, requiresBusinessModel: "production", requiresProductionLine: true,
    businessStage: "line", effect: { type: "nothing" },
    choices: [
      choice("sector-production-line-repair", "Shoshilinch ta'mir", `−${formatUZSCompact(repair.cost)} · partiya jadval bo'yicha chiqadi`, { type: "business-market", action: "repair-line" }),
      choice("sector-production-line-wait", "Ta'mirsiz kutish", `Pul sarflanmaydi · partiya +${delay.months} oy kechikadi`, { type: "business-market", action: "delay-line" }),
    ],
  },
  supplyDilemma("sector-service-supply", "Ish materiallari qimmatladi",
    "Xizmat uchun material va vositalar narxi ko'tarildi. Ta'minotchi bilan oldindan kelishuv narxni qotiradi; rad etsangiz oylik material xarajati oshadi.", "service"),
  demandDilemma("sector-service-shift", "Mijozlar navbati uzaydi",
    "Mijozlar oqimi ortdi, lekin navbat uzun. Qo'shimcha smena va reklama talabni bir necha oyga ushlab turadi; quvvat yetmasa navbat baribir qisqarmaydi.",
    "Qo'shimcha smena ochish", "service"),
];
