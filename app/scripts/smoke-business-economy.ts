import assert from "node:assert/strict";
import { startingBusiness, operateBusiness, businessStage, advanceBusinessMonth, validBusinessOperations } from "../src/lib/game/business";
import { makePlayer, eligibleEvents, financeSummary } from "../src/lib/game/engine";
import { PROFESSIONS } from "../src/lib/game/data";
import { createRoom, joinRoom, startGame, handleAction, publicState } from "../workers/src/game/online";
import { businessOrderQuote } from "../src/lib/game/business-economy";
import { businessMarket, businessOutlook } from "../src/lib/game/business-market";
import type { BusinessModel } from "../src/lib/game/business-economy";

/** Driftsiz oy: qadam (0,5·2−1)·STEP = 0 va indekslar 1,0 da mixlanadi. */
const steady = () => 0.5;

const scenarios = [
  {model: "trade", field: "savdo", resources: 20, capacity: 20, cost: 4_000_000, execution: 0, revenue: 5_600_000, salary: 1_000_000, upgrade: 5_000_000, line: false},
  {model: "production", field: "qurilish", resources: 40, capacity: 40, cost: 3_000_000, execution: 0, revenue: 6_000_000, salary: 1_500_000, upgrade: 8_000_000, line: true},
  {model: "service", field: "talim", resources: 0, capacity: 40, cost: 0, execution: 1_200_000, revenue: 2_800_000, salary: 2_000_000, upgrade: 4_000_000, line: false},
] as const;
for (const s of scenarios) {
  const p = makePlayer(0, "Test", PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: "d1", quadrant: "B"});
  p.assets = [startingBusiness("sector", s.field)];
  p.cash = 100_000_000;
  const a = p.assets[0];
  assert.equal(a.businessModel, s.model);
  const q = businessOrderQuote(a);
  assert.deepEqual([q.resources, q.capacity, q.stockCost, q.executionCost, q.revenue], [s.resources, s.capacity, s.cost, s.execution, s.revenue]);
  const basePrice = a.price;
  const baseNet = financeSummary(p).net;
  const baseCashflow = a.monthlyCashflow;
  const start = p.cash;
  for (let i = 0; i < 100; i++) {
    operateBusiness(p, "accept");
    assert.equal(businessStage(p), s.model === "service" ? "deliver" : "procure");
    if (s.resources) {
      const before = p.cash;
      operateBusiness(p, "restock");
      assert.equal(p.cash, before - s.cost);
      assert.equal(a.operations!.stock, s.resources);
    } else {
      const before = JSON.stringify(p);
      operateBusiness(p, "restock");
      assert.equal(JSON.stringify(p), before, "Services never buy inventory");
    }
    if (s.line) {
      // Xomashyo darhol tushum bermaydi: avval liniya, keyin tayyor mahsulot.
      assert.equal(businessStage(p), "produce");
      operateBusiness(p, "produce");
      assert.equal(a.operations!.stock, 0);
      assert.equal(a.operations!.usedCapacity, s.capacity);
      assert.equal(a.operations!.line!.monthsLeft, 1);
      assert.equal(businessStage(p), "line");
      const waiting = JSON.stringify(p);
      operateBusiness(p, "deliver");
      operateBusiness(p, "produce");
      assert.equal(JSON.stringify(p), waiting, "Delivery and reloading both wait for the running line");
      advanceBusinessMonth(p, steady);
      assert.equal(a.operations!.line, null);
      assert.equal(a.operations!.finished, 20);
      assert.equal(businessStage(p), "deliver");
    }
    operateBusiness(p, "deliver");
    assert.equal(a.operations!.usedCapacity, s.line ? 0 : s.capacity);
    assert.equal(a.operations!.stock, 0);
    assert.equal(a.operations!.finished ?? 0, 0);
    assert.equal(a.price, basePrice, "Inventory value leaves the asset exactly once");
    const completed = JSON.stringify(p);
    operateBusiness(p, "deliver");
    assert.equal(JSON.stringify(p), completed);
    advanceBusinessMonth(p, steady);
    assert.ok(validBusinessOperations(a.operations, a));
  }
  assert.equal(p.cash, start + 100 * (s.revenue - s.cost - s.execution));
  // Buyurtma naqdi passiv daromadga aylanmaydi; oylik raqamni faqat qayta hisob o'zgartiradi.
  assert.equal(financeSummary(p).net - baseNet, a.monthlyCashflow - baseCashflow);
  const market = businessMarket(a);
  assert.equal(market.demand, 1, "Steady months leave demand untouched");
  assert.equal(market.inputPrice, 1, "Steady months leave input prices untouched");
  // Ishlab chiqarishda quvvat topshirish oyida emas, liniya oyida band bo'ladi.
  assert.equal(market.utilization, s.line ? 0 : 1);
  assert.equal(a.monthlyCashflow, businessOutlook(a)!.net);
  if (s.line) assert.equal(a.monthlyCashflow, baseCashflow, "Idle capacity keeps the baseline profile");
  else assert.ok(a.monthlyCashflow > baseCashflow, "Full utilization lifts next month's turnover");

  const beforeHire = financeSummary(p).net;
  operateBusiness(p, "hire");
  assert.equal(financeSummary(p).net, beforeHire - s.salary, "Payroll is volume-independent");
  const beforeUpgrade = a.price;
  operateBusiness(p, "upgrade");
  assert.equal(a.price, beforeUpgrade + s.upgrade);
  const room = createRoom("ABCDEF", {timerSec: 60, bots: 0}, "Test", "host");
  joinRoom(room, "Guest", "guest"); startGame(room, "host");
  room.game!.players[0] = p;
  p.expenseParts.other = 100_000_000;
  const resolve = (cardId: string) => {
    const card = eligibleEvents(p, []).find(c => c.id === cardId)!;
    assert.ok(card);
    assert.ok(card.desc.includes(q.economy.name));
    room.game!.current = 0; room.awaiting = 0; room.deadline = Date.now() + 60_000;
    room.pending = {kind: "business-choice", card, decisionId: cardId};
    assert.ok(handleAction(room, "host", {kind: "business-choice", decisionId: cardId, choice: 0}).ok);
  };
  resolve("operations-order");
  if (s.resources) resolve("operations-procure");
  if (s.line) {
    resolve("operations-produce");
    advanceBusinessMonth(p, steady);
  }
  resolve("operations-deliver");
  const published = publicState(room).game!.players[0].assets[0];
  assert.equal(published.businessModel, s.model);
  assert.equal(published.monthlyRevenue, a.monthlyRevenue);
  assert.equal(published.monthlyOperatingCosts, a.monthlyOperatingCosts);
  assert.deepEqual(published.operatingCostParts, a.operatingCostParts);
  assert.deepEqual(published.market, a.market);
  published.operatingCostParts!.payroll = 0;
  assert.notEqual(a.operatingCostParts!.payroll, 0, "Public snapshot must not alias engine costs");
  console.log(`${s.model}: 100 cycles, cash/stock/capacity, staffing, upgrade and online decision chain OK`);
}
const poor = makePlayer(0, "Poor", PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: "d1", quadrant: "B"});
poor.cash = 0;
operateBusiness(poor, "accept");
const before = JSON.stringify(poor);
operateBusiness(poor, "deliver");
assert.equal(JSON.stringify(poor), before, "Service execution needs cash before payout");
const bad = structuredClone(poor.assets[0].operations!); bad.stock = 1;
assert.equal(validBusinessOperations(bad, poor.assets[0]), false);
// Tayyor mahsulot ombori va liniya faqat ishlab chiqarishga tegishli.
const nonLine = structuredClone(poor.assets[0].operations!);
nonLine.finished = 20;
assert.equal(validBusinessOperations(nonLine, poor.assets[0]), false);
const legacy = startingBusiness("legacy", "talim"); delete legacy.businessModel;
assert.equal(businessOrderQuote(legacy).stockCost, 2_000_000);
assert.equal(businessOrderQuote(legacy).revenue, 3_600_000);
const models: BusinessModel[] = ["trade", "production", "service"];
assert.equal(new Set(models.map(model => businessOrderQuote({...legacy, businessModel: model}).revenue)).size, 3);
console.log("Sector economies and unchanged legacy contracts: OK");
