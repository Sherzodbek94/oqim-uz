import assert from 'node:assert/strict';
import { businessMonthlyFinance } from '../src/lib/game/business-finance';
import { startingBusiness, operateBusiness } from '../src/lib/game/business';
import { makePlayer, buyDeal, applyEvent, financeSummary } from '../src/lib/game/engine';
import { PROFESSIONS, SMALL_DEALS, BIG_DEALS, EVENT_CARDS } from '../src/lib/game/data';
import type { Asset } from '../src/lib/game/types';
const opts = {isBot: false, personality: null, colorIndex: 0, dreamId: 'd1', quadrant: 'B' as const};
function reconciles(a: Asset) {
  assert.equal(a.monthlyRevenue! - a.monthlyOperatingCosts!, a.monthlyCashflow);
  assert.equal(Object.values(a.operatingCostParts!).reduce((sum, n) => sum + n, 0), a.monthlyOperatingCosts);
}
for (const [field, revenue, costs] of [['savdo', 60_000_000, 46_000_000], ['qurilish', 48_000_000, 34_000_000], ['talim', 30_000_000, 16_000_000]] as const) {
  const p = makePlayer(0, 'Test', PROFESSIONS[0], opts);
  p.assets = [startingBusiness('business', field)];
  const a = p.assets[0];
  assert.equal(a.monthlyRevenue, revenue);
  assert.equal(a.monthlyOperatingCosts, costs);
  reconciles(a);
  const net = financeSummary(p).net;
  p.cash = 100_000_000;
  operateBusiness(p, 'hire');
  reconciles(a);
  assert.equal(a.monthlyRevenue, revenue, 'Hiring does not magically create sales');
  assert.ok(financeSummary(p).net < net);
  const event = EVENT_CARDS.find(c => c.id === 'b-expansion-loan')!;
  applyEvent(p, {...event, effect: event.choices![0].effect});
  const branch = p.assets.at(-1)!;
  reconciles(branch);
  assert.equal(branch.businessModel, a.businessModel);
  assert.equal(branch.monthlyCashflow, 6_000_000);
}
for (const model of ['trade', 'production', 'service'] as const) {
  for (const net of [1, 123_457, 6_000_000, 14_000_000]) {
    const f = businessMonthlyFinance(model, net);
    assert.equal(f.monthlyRevenue! - f.monthlyOperatingCosts!, net, 'Rounding must preserve promised yield');
  }
  assert.deepEqual(businessMonthlyFinance(model, 0), {});
  assert.deepEqual(businessMonthlyFinance(model, -1), {});
}
let checked = 0;
for (const deal of [...SMALL_DEALS, ...BIG_DEALS].filter(d => d.kind === 'business')) {
  const p = makePlayer(0, 'Buyer', PROFESSIONS[0], opts);
  p.cash = 1_000_000_000_000;
  buyDeal(p, deal, false);
  const a = p.assets.at(-1)!;
  if (a.monthlyCashflow > 0) { reconciles(a); checked++; }
}
assert.ok(checked > 0);
console.log(`Sector monthly finance: starts, hires, branches, rounding and ${checked} purchases OK`);
