import assert from "node:assert/strict";
import { startingBusiness, operateBusiness, businessStage, advanceBusinessMonth, validBusinessOperations } from "../src/lib/game/business";
import { makePlayer, eligibleEvents, financeSummary } from "../src/lib/game/engine";
import { PROFESSIONS } from "../src/lib/game/data";
import { createRoom, joinRoom, startGame, handleAction, publicState } from "../workers/src/game/online";
import { businessOrderQuote } from "../src/lib/game/business-economy";
import type { BusinessModel } from "../src/lib/game/business-economy";
const scenarios = [
  {model: "trade", field: "savdo", resources: 20, capacity: 20, cost: 4_000_000, execution: 0, revenue: 5_600_000, salary: 1_000_000, upgrade: 5_000_000},
  {model: "production", field: "qurilish", resources: 40, capacity: 40, cost: 3_000_000, execution: 0, revenue: 6_000_000, salary: 1_500_000, upgrade: 8_000_000},
  {model: "service", field: "talim", resources: 0, capacity: 40, cost: 0, execution: 1_200_000, revenue: 2_800_000, salary: 2_000_000, upgrade: 4_000_000},
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
    operateBusiness(p, "deliver");
    assert.equal(a.operations!.usedCapacity, s.capacity);
    assert.equal(a.operations!.stock, 0);
    assert.equal(a.price, basePrice);
    const completed = JSON.stringify(p);
    operateBusiness(p, "deliver");
    assert.equal(JSON.stringify(p), completed);
    advanceBusinessMonth(p);
    assert.ok(validBusinessOperations(a.operations, a));
  }
  assert.equal(p.cash, start + 100 * (s.revenue - s.cost - s.execution));
  assert.equal(financeSummary(p).net, baseNet);
  operateBusiness(p, "hire");
  assert.equal(financeSummary(p).net, baseNet - s.salary);
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
  resolve("operations-deliver");
  const published = publicState(room).game!.players[0].assets[0];
  assert.equal(published.businessModel, s.model);
  assert.equal(published.monthlyRevenue, a.monthlyRevenue);
  assert.equal(published.monthlyOperatingCosts, a.monthlyOperatingCosts);
  assert.deepEqual(published.operatingCostParts, a.operatingCostParts);
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
const legacy = startingBusiness("legacy", "talim"); delete legacy.businessModel;
assert.equal(businessOrderQuote(legacy).stockCost, 2_000_000);
assert.equal(businessOrderQuote(legacy).revenue, 3_600_000);
const models: BusinessModel[] = ["trade", "production", "service"];
assert.equal(new Set(models.map(model => businessOrderQuote({...legacy, businessModel: model}).revenue)).size, 3);
console.log("Sector economies and unchanged legacy contracts: OK");
