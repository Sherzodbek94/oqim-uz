import assert from "node:assert/strict";
import { createRoom, joinRoom, startGame, handleAction, onTimeout, publicState } from "../workers/src/game/online";
import { BUSINESS_EVENTS } from "../src/lib/game/business-events";
import { makePlayer } from "../src/lib/game/engine";
import { PROFESSIONS } from "../src/lib/game/data";
import { RAT_CELLS } from "../src/lib/game/types";

const room = createRoom("ABCDEF", {timerSec: 60, bots: 0}, "Host", "host");
joinRoom(room, "Guest", "guest");
assert.ok(startGame(room, "host").ok);
const p = makePlayer(0, "Host", PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: "d1", quadrant: "B"});
p.cash = 20_000_000;
delete p.assets[0].businessModel; // Legacy in-flight room compatibility.
p.expenseParts.other = 50_000_000; // Prevent automatic win while testing decision protocol.
room.game!.players[0] = p;
room.players.forEach(r => {r.connected = true;});
const stage = (id: string, decisionId: string) => {
  room.game!.current = 0; room.awaiting = 0;
  room.deadline = Date.now() + 60_000;
  room.pending = {kind: "business-choice", card: BUSINESS_EVENTS.find(c => c.id === id)!, decisionId};
};
stage("operations-order", "order-1");
const before = JSON.stringify(room);
assert.equal(handleAction(room, "guest", {kind: "business-choice", decisionId: "order-1", choice: 0}).ok, false);
assert.equal(handleAction(room, "host", {kind: "business-choice", decisionId: "stale", choice: 0}).ok, false);
assert.equal(handleAction(room, "host", {kind: "business-choice", decisionId: "order-1", choice: 5 as 0}).ok, false);
assert.equal(JSON.stringify(room), before);
assert.equal(handleAction(room, "host", {kind: "business-choice", decisionId: "order-1", choice: 0}, room.deadline! + 1).ok, false);
assert.ok(handleAction(room, "host", {kind: "business-choice", decisionId: "order-1", choice: 0}).ok);
assert.equal(p.assets[0].operations!.order!.units, 20);
assert.equal(room.pending, null);
assert.equal(handleAction(room, "host", {kind: "business-choice", decisionId: "order-1", choice: 0}).ok, false);

// Actual dice landing must offer the pending chain rather than filter it out.
room.game!.current = 0; room.awaiting = 0; room.pending = null;
p.position = RAT_CELLS.indexOf("event") - 1;
const random = Math.random;
try {
  Math.random = () => 0; // one step
  assert.ok(handleAction(room, "host", {kind: "roll"}).ok);
} finally { Math.random = random; }
assert.equal(room.pending?.kind, "business-choice");
const state = publicState(room, "host");
assert.ok(state.pending && "choices" in state.pending);
assert.equal(JSON.stringify(state).includes('"effect"'), false);
assert.equal(JSON.stringify(state).includes('"token"'), false);
const decisionId = room.pending!.kind === "business-choice" ? room.pending!.decisionId : "";
const cash = p.cash;
assert.ok(handleAction(room, "host", {kind: "business-choice", decisionId, choice: 0}).ok);
assert.equal(p.cash, cash - 2_000_000);
stage("operations-deliver", "delivery-1");
assert.ok(handleAction(room, "host", {kind: "business-choice", decisionId: "delivery-1", choice: 0}).ok);
assert.equal(p.cash, cash + 1_600_000);
stage("operations-order", "order-2");
const after = JSON.stringify(p);
assert.equal(handleAction(room, "host", {kind: "business-choice", decisionId: "delivery-1", choice: 0}).ok, false);
assert.equal(JSON.stringify(p), after);
const money = p.cash;
onTimeout(room);
assert.equal(p.cash, money, "Timeout must not buy or accept an order");
assert.equal(p.assets[0].operations!.order, null);
assert.equal(room.pending, null);
console.log("Online business: turn auth, stale/replayed decisions, dice chain, stock, payout, timeout and safe public state OK");

// Reach B through the real manager action instead of remaining permanently in S.
room.game!.current = 0; room.awaiting = 0; room.phase = "playing";
p.quadrant = "S"; p.hasManager = false; p.cash = 1_000_000_000;
while (p.assets.length < 3) p.assets.push({...p.assets[0], id: `extra-${p.assets.length}`, operations: undefined});
assert.ok(handleAction(room, "host", {kind: "hire-manager"}).ok);
assert.equal(p.hasManager, true);
assert.equal(p.quadrant, "B");
const managerCash = p.cash;
assert.equal(handleAction(room, "host", {kind: "hire-manager"}).ok, false);
assert.equal(p.cash, managerCash);
console.log("Online S→B manager path and duplicate hire protection OK");
