import assert from "node:assert/strict";
import { startingBusiness, operateBusiness, operateBusinessMarket, businessStage, advanceBusinessMonth, validBusinessOperations } from "../src/lib/game/business";
import { makePlayer, makeGame, eligibleEvents, applyEvent, applyPayday } from "../src/lib/game/engine";
import { botDilemmaChoice } from "../src/lib/game/bots";
import { PROFESSIONS, EVENT_CARDS } from "../src/lib/game/data";
import { loadSave, saveGame } from "../src/lib/game/save";
import { SAVE_KEY } from "../src/lib/game/types";
import type { Asset, Player } from "../src/lib/game/types";
import { createRoom, joinRoom, startGame, handleAction } from "../workers/src/game/online";
import {
  DEMAND_MAX, DEMAND_MIN, INPUT_PRICE_MAX, INPUT_PRICE_MIN, MARKET_ACTIONS, VOLUME_MAX, VOLUME_MIN,
  businessMarket, businessOutlook, variableSupplyShare,
} from "../src/lib/game/business-market";
import { MAX_LINE_MONTHS, businessEconomy } from "../src/lib/game/business-economy";

/** Determinatsiyalangan generator — uzoq simulyatsiya har ishga tushishda bir xil. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const opts = { isBot: false, personality: null, colorIndex: 0, dreamId: "d1", quadrant: "B" as const };
function owner(field: Parameters<typeof startingBusiness>[1], cash = 5_000_000_000): Player {
  const p = makePlayer(0, "Egasi", PROFESSIONS[0], opts);
  p.assets = [startingBusiness("sim", field)];
  p.cash = cash;
  return p;
}

/** Indeks chegaralaridan kelib chiqadigan qat'iy sof oqim oralig'i. */
function netBounds(a: Asset) {
  const base = a.baseline!;
  const share = variableSupplyShare(a.businessModel);
  const fixed = base.parts.payroll + base.parts.rent + base.parts.marketing + base.parts.other;
  const supplies = (volume: number, price: number) => base.parts.supplies * (share * volume + (1 - share)) * price;
  return {
    min: base.revenue * VOLUME_MIN - fixed - supplies(VOLUME_MAX, INPUT_PRICE_MAX),
    max: base.revenue * VOLUME_MAX - fixed - supplies(VOLUME_MIN, INPUT_PRICE_MIN),
  };
}

/** Omborda, liniyada va tayyor mahsulotda turgan zaxiraning tannarxi. */
function inventoryValue(a: Asset): number {
  const e = businessEconomy(a);
  const op = a.operations;
  if (!op) return 0;
  const perOrderUnit = e.resourcePerUnit * e.unitCost;
  return op.stock * e.unitCost + (op.finished ?? 0) * perOrderUnit + (op.line ? op.line.units * perOrderUnit : 0);
}

/** Buyurtma zanjirining keyingi qadamini bajaradi. */
function driveOrder(p: Player): void {
  switch (businessStage(p)) {
    case "offer": operateBusiness(p, "accept"); break;
    case "procure": operateBusiness(p, "restock"); break;
    case "produce": operateBusiness(p, "produce"); break;
    case "deliver": operateBusiness(p, "deliver"); break;
    default: break; // liniya yoki quvvat — bu oy kutiladi
  }
}

/* ---------------- 1. Uzoq muddatli balans ---------------- */

const MONTHS = 240;
for (const [model, field] of [["trade", "savdo"], ["production", "qurilish"], ["service", "talim"]] as const) {
  const p = owner(field);
  const a = p.assets[0];
  const rand = mulberry32(20260910);
  const base = a.monthlyCashflow;
  const basePrice = a.price;
  const bounds = netBounds(a);
  let sum = 0, min = Infinity, max = -Infinity, delivered = 0;
  for (let month = 0; month < MONTHS; month++) {
    // Oyiga ikki hodisa kartasi: zanjir bosqichma-bosqich oldinga siljiydi.
    for (let step = 0; step < 2; step++) {
      if (businessStage(p) === "deliver") delivered++;
      driveOrder(p);
    }
    advanceBusinessMonth(p, rand);

    const m = businessMarket(a);
    assert.ok(m.demand >= DEMAND_MIN && m.demand <= DEMAND_MAX, `${model}: talab chegarada qolishi kerak`);
    assert.ok(m.inputPrice >= INPUT_PRICE_MIN && m.inputPrice <= INPUT_PRICE_MAX, `${model}: ta'minot narxi chegarada qolishi kerak`);
    assert.ok(m.utilization >= 0 && m.utilization <= 1);
    assert.ok(validBusinessOperations(a.operations, a), `${model}: operatsiyalar sxemasi buzildi`);

    const outlook = businessOutlook(a)!;
    assert.equal(a.monthlyCashflow, outlook.net);
    assert.equal(a.monthlyRevenue! - a.monthlyOperatingCosts!, a.monthlyCashflow);
    assert.equal(Object.values(a.operatingCostParts!).reduce((s, n) => s + n, 0), a.monthlyOperatingCosts);
    assert.ok(Number.isFinite(a.monthlyCashflow));
    assert.ok(a.monthlyCashflow >= bounds.min && a.monthlyCashflow <= bounds.max, `${model}: sof oqim analitik oraliqdan chiqdi`);

    // Naqd zaxiraga aylanadi, zaxira aktivga: qiymat hech qayerda ikkilanmaydi.
    assert.equal(a.price, basePrice + inventoryValue(a), `${model}: aktiv qiymati zaxira tannarxi bilan mos emas`);
    sum += a.monthlyCashflow;
    min = Math.min(min, a.monthlyCashflow);
    max = Math.max(max, a.monthlyCashflow);
  }
  const mean = sum / MONTHS;
  assert.ok(max > min, `${model}: oylik aylanma umuman o'zgarmadi`);
  // 1,0 ga qaytaruvchi drift uzoq muddatda bazaviy darajani saqlashi kerak.
  assert.ok(mean > base * 0.8 && mean < base * 1.35, `${model}: o'rtacha sof oqim ${Math.round(mean)} bazaviy ${base} dan uzoqlashdi`);
  assert.ok(delivered > 20, `${model}: ${MONTHS} oyda faqat ${delivered} buyurtma topshirildi`);
  assert.ok(p.cash > 0);
  console.log(`${model}: ${MONTHS} oy — o'rtacha ${Math.round(mean / 1_000_000)} mln, oraliq ${Math.round(min / 1_000_000)}–${Math.round(max / 1_000_000)} mln, ${delivered} buyurtma`);
}

/* ---------------- 2. Ishlab chiqarish liniyasi ---------------- */

{
  const p = owner("qurilish");
  const a = p.assets[0];
  operateBusiness(p, "accept");
  operateBusiness(p, "restock");
  assert.equal(businessStage(p), "produce");
  const beforeLine = a.price;
  operateBusiness(p, "produce");
  assert.equal(a.price, beforeLine, "Liniyaga berish aktiv qiymatini o'zgartirmaydi");
  assert.equal(a.operations!.line!.monthsLeft, 1);
  assert.equal(a.operations!.finished, 0);
  // Muddat tugasa ham tayyor mahsulot yo'qolmaydi.
  const cashBefore = p.cash;
  for (let i = 0; i < 3; i++) advanceBusinessMonth(p, () => 0.5);
  assert.equal(p.cash, cashBefore, "Muddati tugagan buyurtma tushum bermaydi");
  assert.equal(a.operations!.order, null);
  assert.equal(a.operations!.finished, 20, "Tayyor mahsulot omborda saqlanadi");
  // Yangi buyurtma omborda turgan mahsulot bilan darhol topshiriladi.
  operateBusiness(p, "accept");
  assert.equal(businessStage(p), "deliver");
  operateBusiness(p, "deliver");
  assert.equal(a.operations!.finished, 0);
  assert.equal(a.price, beforeLine - 3_000_000, "Zaxira tannarxi topshirishda aktivdan chiqadi");
  assert.equal(p.cash, cashBefore + 6_000_000);
  console.log("Ishlab chiqarish liniyasi: vaqt, tayyor mahsulot ombori va aktiv qiymati OK");
}

/* ---------------- 3. Sohaviy bozor qarorlari ---------------- */

{
  const p = owner("savdo");
  const a = p.assets[0];
  const frozen = () => 0.5;
  const rising = () => 1; // har oy +DRIFT_STEP

  const beforeLock = p.cash;
  assert.match(operateBusinessMarket(p, "lock-input"), /qulfland/);
  assert.equal(p.cash, beforeLock - MARKET_ACTIONS["lock-input"].cost);
  assert.equal(businessMarket(a).priceLockMonths, 3);
  for (let i = 0; i < 3; i++) {
    advanceBusinessMonth(p, rising);
    assert.equal(businessMarket(a).inputPrice, 1, "Qulflangan oyda ta'minot narxi o'zgarmaydi");
  }
  advanceBusinessMonth(p, rising);
  assert.ok(businessMarket(a).inputPrice > 1, "Qulf tugagach narx yana harakatlanadi");

  const p2 = owner("savdo");
  const a2 = p2.assets[0];
  const beforeBoost = { cash: p2.cash, revenue: a2.monthlyRevenue! };
  operateBusinessMarket(p2, "boost-demand");
  assert.equal(p2.cash, beforeBoost.cash - MARKET_ACTIONS["boost-demand"].cost);
  assert.ok(businessMarket(a2).demand > 1);
  assert.ok(a2.monthlyRevenue! > beforeBoost.revenue, "Kampaniya joriy oy tushumini oshiradi");
  assert.equal(businessMarket(a2).demandBoostMonths, 3);
  for (let i = 0; i < 3; i++) advanceBusinessMonth(p2, frozen);
  assert.equal(businessMarket(a2).demandBoostMonths, 0);

  const p3 = owner("savdo");
  const a3 = p3.assets[0];
  const beforeRaise = { cash: p3.cash, net: a3.monthlyCashflow, supplies: a3.operatingCostParts!.supplies };
  operateBusinessMarket(p3, "raise-input");
  assert.equal(p3.cash, beforeRaise.cash, "Rad etish naqd talab qilmaydi");
  assert.ok(a3.operatingCostParts!.supplies > beforeRaise.supplies);
  assert.ok(a3.monthlyCashflow < beforeRaise.net);
  for (let i = 0; i < 20; i++) operateBusinessMarket(p3, "raise-input");
  assert.ok(businessMarket(a3).inputPrice <= INPUT_PRICE_MAX, "Ta'minot narxi chegaradan oshmaydi");

  // Atomiklik: naqd yetmasa hech narsa o'zgarmaydi.
  const broke = owner("savdo", 1_000_000);
  const snapshot = JSON.stringify(broke);
  assert.match(operateBusinessMarket(broke, "lock-input"), /naqd yetmaydi/);
  assert.equal(JSON.stringify(broke), snapshot);
  // Liniyasiz biznesda liniya qarorlari rad etiladi.
  assert.match(operateBusinessMarket(broke, "repair-line"), /liniyasi yo'q/);
  assert.equal(JSON.stringify(broke), snapshot);

  const line = owner("qurilish");
  operateBusiness(line, "accept");
  operateBusiness(line, "restock");
  operateBusiness(line, "produce");
  const beforeRepair = line.cash;
  operateBusinessMarket(line, "repair-line");
  assert.equal(line.cash, beforeRepair - MARKET_ACTIONS["repair-line"].cost);
  assert.equal(line.assets[0].operations!.line!.monthsLeft, 1, "Ta'mir jadvalni o'zgartirmaydi");
  operateBusinessMarket(line, "delay-line");
  assert.equal(line.assets[0].operations!.line!.monthsLeft, MAX_LINE_MONTHS);
  assert.ok(validBusinessOperations(line.assets[0].operations, line.assets[0]));
  console.log("Sohaviy bozor qarorlari: qulf, kampaniya, chegara, atomiklik va liniya OK");
}

/* ---------------- 4. Sohaga bog'langan hodisalar ---------------- */

{
  const ids = (p: Player) => new Set(eligibleEvents(p, []).map(c => c.id));
  const trade = ids(owner("savdo"));
  const production = ids(owner("qurilish"));
  const service = ids(owner("talim"));
  assert.ok(trade.has("sector-trade-supply") && trade.has("sector-trade-campaign"));
  assert.ok(!trade.has("sector-production-inputs") && !trade.has("sector-service-supply"));
  assert.ok(production.has("sector-production-inputs") && !production.has("sector-trade-campaign"));
  assert.ok(service.has("sector-service-supply") && service.has("sector-service-shift"));
  assert.ok(!service.has("sector-production-inputs"));

  // Liniya kartasi faqat partiya ishlayotganda ochiladi.
  const p = owner("qurilish");
  assert.ok(!ids(p).has("sector-production-line"));
  operateBusiness(p, "accept");
  operateBusiness(p, "restock");
  operateBusiness(p, "produce");
  assert.ok(ids(p).has("sector-production-line"));

  // E kvadrantida sohaviy kartalar umuman chiqmaydi.
  const worker = owner("savdo");
  worker.quadrant = "E";
  assert.ok(![...ids(worker)].some(id => id.startsWith("sector-")));

  // Har bir sohaviy karta ro'yxatdan o'tgan va ikki tanlovli.
  const sector = EVENT_CARDS.filter(c => c.id.startsWith("sector-"));
  assert.equal(sector.length, 6);
  for (const card of sector) {
    assert.equal(card.choices?.length, 2, `${card.id}: ikki tanlov kerak`);
    assert.ok(card.businessStage, `${card.id}: onlayn qaror uchun bosqich kerak`);
    assert.equal(card.requiresQuadrant, "B");
  }
  console.log("Sohaviy hodisalar: model, bosqich va kvadrant gate'lari OK");
}

/* ---------------- 5. Botlar va onlayn qaror ---------------- */

{
  const rich = owner("savdo");
  const supply = EVENT_CARDS.find(c => c.id === "sector-trade-supply")!;
  assert.equal(botDilemmaChoice(rich, supply), 0, "Naqdi ko'p bot narxni qulflaydi");
  const poor = owner("savdo", 1_000_000);
  assert.equal(botDilemmaChoice(poor, supply), 1, "Naqdi kam bot narx oshishini qabul qiladi");

  const p = owner("savdo");
  const a = p.assets[0];
  const room = createRoom("SECTOR", { timerSec: 60, bots: 0 }, "Test", "host");
  joinRoom(room, "Guest", "guest");
  startGame(room, "host");
  room.game!.players[0] = p;
  const card = eligibleEvents(p, []).find(c => c.id === "sector-trade-supply")!;
  assert.ok(card.desc.includes("Bozor holati"), "Karta joriy indekslarni ko'rsatadi");
  room.game!.current = 0; room.awaiting = 0; room.deadline = Date.now() + 60_000;
  room.pending = { kind: "business-choice", card, decisionId: "sector-1" };
  const cash = p.cash;
  assert.ok(handleAction(room, "host", { kind: "business-choice", decisionId: "sector-1", choice: 0 }).ok);
  assert.equal(p.cash, cash - MARKET_ACTIONS["lock-input"].cost, "Server narxni o'z jadvalidan oladi");
  assert.equal(businessMarket(a).priceLockMonths, 3);
  assert.equal(handleAction(room, "host", { kind: "business-choice", decisionId: "sector-1", choice: 0 }).ok, false);
  console.log("Botlar va onlayn sohaviy qaror: OK");
}

/* ---------------- 6. Saqlash va buzilgan ma'lumot ---------------- */

{
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) },
    configurable: true,
  });
  const p = owner("qurilish");
  operateBusiness(p, "accept");
  operateBusiness(p, "restock");
  operateBusiness(p, "produce");
  operateBusinessMarket(p, "boost-demand");
  const state = makeGame([p]);
  assert.ok(saveGame(state));
  const restored = loadSave()!.players[0].assets[0];
  assert.deepEqual(restored.operations, p.assets[0].operations);
  assert.deepEqual(restored.market, p.assets[0].market);
  assert.deepEqual(restored.baseline, p.assets[0].baseline);

  for (const corrupt of [
    (a: Asset) => { a.market!.demand = 5; },
    (a: Asset) => { a.market!.priceLockMonths = -1; },
    (a: Asset) => { a.baseline!.revenue = Number.NaN; },
    (a: Asset) => { a.operations!.line = { units: 20, monthsLeft: 9 }; },
    (a: Asset) => { a.operations!.finished = 999; },
  ]) {
    const broken = structuredClone(state);
    corrupt(broken.players[0].assets[0]);
    storage.set(SAVE_KEY, JSON.stringify(broken));
    assert.equal(loadSave(), null, "Buzilgan biznes holati qabul qilinmaydi");
  }
  // Savdo biznesida tayyor mahsulot ombori bo'lmaydi.
  const tradeState = makeGame([owner("savdo")]);
  operateBusiness(tradeState.players[0], "accept");
  tradeState.players[0].assets[0].operations!.finished = 20;
  storage.set(SAVE_KEY, JSON.stringify(tradeState));
  assert.equal(loadSave(), null);
  console.log("Saqlash: bozor holati, liniya va buzilgan ma'lumot tekshiruvi OK");
}

/* ---------------- 7. Eski saqlovlar o'zgarmaydi ---------------- */

{
  const p = owner("savdo");
  const a = p.assets[0];
  delete a.businessModel; delete a.baseline; delete a.market;
  const before = { revenue: a.monthlyRevenue, costs: a.monthlyOperatingCosts, net: a.monthlyCashflow };
  const rand = mulberry32(7);
  for (let i = 0; i < 60; i++) advanceBusinessMonth(p, rand);
  assert.equal(a.monthlyRevenue, before.revenue);
  assert.equal(a.monthlyOperatingCosts, before.costs);
  assert.equal(a.monthlyCashflow, before.net);
  assert.equal(a.market, undefined);
  assert.match(operateBusinessMarket(p, "boost-demand"), /bozor modeli yo'q/);
  // Qurilishdagi biznes ishga tushmaguncha bozor tarixini to'plamaydi.
  const site = owner("savdo");
  site.assets[0].constructionLeft = 3;
  const idleNet = site.assets[0].monthlyCashflow;
  for (let i = 0; i < 5; i++) advanceBusinessMonth(site, mulberry32(9));
  assert.equal(site.assets[0].monthlyCashflow, idleNet);
  assert.deepEqual(businessMarket(site.assets[0]), { demand: 1, inputPrice: 1, utilization: 0, priceLockMonths: 0, demandBoostMonths: 0 });
  console.log("Eski saqlovlar va qurilishdagi biznes: qayta hisob yo'q OK");
}

/* ---------------- 8. Oy kuni: oldindan ko'rish va haqiqiy hisob mos ---------------- */

{
  // Tugagan oy joriy stavkada to'lanadi; drift keyingi oyga tegishli. Shu sabab
  // toast uchun hisoblangan summa haqiqiy to'lov bilan aynan bir xil bo'ladi.
  const p = owner("savdo");
  operateBusiness(p, "accept");
  operateBusiness(p, "restock");
  operateBusiness(p, "deliver");
  const probe = structuredClone(p);
  const real = structuredClone(p);
  const preview = applyPayday(probe, null, undefined, 5, mulberry32(1));
  const actual = applyPayday(real, null, undefined, 5, mulberry32(999));
  assert.equal(preview.amount, actual.amount, "Oldindan ko'rish va haqiqiy oy kuni bir xil summani berishi kerak");
  assert.deepEqual(preview.notes, actual.notes, "Oy kuni eslatmalari tasodifga bog'liq bo'lmasligi kerak");
  assert.notDeepEqual(businessMarket(probe.assets[0]), businessMarket(real.assets[0]), "Drift baribir tasodifiy");
  // Buyurtma muddati tugashi o'yinchiga ko'rinadigan ogohlantirish beradi.
  const expiring = owner("savdo");
  operateBusiness(expiring, "accept");
  const expiryNotes = [0, 1, 2].map(() => advanceBusinessMonth(expiring, () => 0.5)).flat();
  assert.ok(expiryNotes.some(n => n.startsWith("⚠️") && n.includes("muddati tugadi")));
  console.log("Oy kuni: probe/haqiqiy summa mosligi va muddat ogohlantirishi OK");
}

/* ---------------- 9. Filial ota biznes modelini oladi ---------------- */

{
  const p = owner("qurilish");
  const event = EVENT_CARDS.find(c => c.id === "b-expansion-loan")!;
  applyEvent(p, { ...event, effect: event.choices![0].effect });
  const branch = p.assets.at(-1)!;
  assert.equal(branch.businessModel, "production");
  assert.ok(branch.baseline, "Filial ham dinamik profil oladi");
  assert.equal(branch.monthlyRevenue! - branch.monthlyOperatingCosts!, branch.monthlyCashflow);
  advanceBusinessMonth(p, mulberry32(3));
  assert.equal(branch.monthlyCashflow, businessOutlook(branch)!.net);
  console.log("Filial: dinamik profil meros olinadi OK");
}

console.log("Biznes simulyatsiyasi: uzoq balans, liniya, bozor qarorlari, saqlash va onlayn OK");
