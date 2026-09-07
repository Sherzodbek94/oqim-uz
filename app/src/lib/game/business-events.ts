import type { EventCard, EventChoice, EventEffect } from "./types";

function choice(id: string, label: string, hint: string, effect: EventEffect): EventChoice {
  return { id, label, hint, effect, resultText: "Biznes qarori natijasi", lessonText: "Naqd zaxira, oylik xarajat va buyurtma muddatini birga tekshiring." };
}
const cancel = choice("operations-cancel", "Buyurtmani bekor qilish", "Tushum yo'q; olingan zaxira saqlanadi", { type: "business-operation", action: "cancel" });
const wait = choice("operations-wait", "Hozircha kutish", "Pul sarflanmaydi; muddat yangi oyda kamayadi", { type: "nothing" });
const hire = choice("operations-hire", "Xodim yollash", "−1 mln hozir · −1 mln/oy · quvvat +10", { type: "business-operation", action: "hire" });

export const BUSINESS_EVENTS: EventCard[] = [
  {
    id: "operations-order", title: "Qo'shimcha buyurtma", icon: "Briefcase",
    desc: "Birinchi faol biznesingiz uchun 20 birlik qo'shimcha ish: zaxira 2 mln, tushum 3,6 mln. Bajarish muddati 3 oy. Bu bazaviy oylik faoliyatdan alohida.",
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
    desc: "Birinchi faol biznesning qo'shimcha buyurtma quvvatini oshirish mumkin. Uskuna o'zi tushum bermaydi; buyurtma kerak.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "offer", effect: { type: "nothing" },
    choices: [choice("operations-upgrade", "Uskuna olish", "−5 mln · aktiv qiymati +5 mln · quvvat +10 (maksimal 100)", { type: "business-operation", action: "upgrade" }), wait],
  },
  {
    id: "operations-staff", title: "Jamoani kengaytirish", icon: "Users",
    desc: "Qo'shimcha buyurtmalar uchun xodim yollash mumkin. Oylik maosh buyurtma bo'lmasa ham to'lanadi. Ko'pi bilan 5 qo'shimcha xodim.",
    requiresQuadrant: "B", requiresBusiness: true, businessStage: "offer", effect: { type: "nothing" },
    choices: [hire, wait],
  },
];
