/**
 * OQIM Onlayn (v19) — server-authoritative o'yin kontrolleri (sof logika).
 * Cloudflare Durable Object (GameRoom) ham, smoke testlar ham shu modulni ishlatadi.
 * DOM/localStorage'dan mustaqil.
 *
 * MVP cheklovi: faqat KLASSIK doska rejimi onlayn o'ynaladi (path/plan — keyingi versiyalarda).
 * G'alaba: Asosiy aylanadan birinchi chiqgan o'yinchi (canEscape).
 */
import {
  addLog,
  advanceTurn,
  applyAvans,
  applyBaby,
  applyCharity,
  applyDoodad,
  applyDownsized,
  applyEvent,
  applyPayday,
  applyWeekend,
  buyDeal,
  canEscape,
  completeMonth,
  diceTotal,
  eligibleEvents,
  emergencyLoan,
  makeGame,
  makePlayer,
  marketOffer,
  movePath,
  ratCellAt,
  rollDice,
  sellAsset,
  tickTurn,
} from "./engine";
import { BIG_DEALS, DOODAD_CARDS, DREAMS, MARKET_CARDS, PROFESSIONS, SMALL_DEALS, WEEKEND_CARDS } from "./data";
import { botCharityDecision, botDealDecision, botDoodadDecline, botDoodadMode, botPickDealSize, botSellDecision, botWeekendChoice } from "./bots";
import type { BotPersonality, DealCard, GameState, MarketCard, Player } from "./types";
import { RAT_CELLS } from "./types";

export const MAX_PLAYERS = 4;
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // o'qish oson (0/O, 1/I/L yo'q)

export function makeRoomCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

export function makeToken(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 24; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)].toLowerCase();
  return s;
}

export interface RoomSettings {
  timerSec: 60 | 120;
  bots: number; // 0..3
}

export interface RoomPlayer {
  id: number; // game player id = index
  name: string;
  token: string;
  isBot: boolean;
  connected: boolean;
}

export type Pending =
  | { kind: "deal-size" }
  | { kind: "deal"; card: DealCard }
  | { kind: "market"; card: MarketCard; assetIds: string[] }
  | { kind: "charity" };

export type RoomPhase = "lobby" | "playing" | "finished";

export interface GameResult {
  finishedAt: number;
  winnerId: number | null;
  players: { id: number; name: string; isBot: boolean; cash: number; escaped: boolean; bankrupt: boolean }[];
}

export interface OnlineRoom {
  code: string;
  hostToken: string;
  settings: RoomSettings;
  phase: RoomPhase;
  players: RoomPlayer[];
  game: GameState | null;
  pending: Pending | null;
  /** navbat kutilayotgan o'yinchi id (pending yoki roll uchun) */
  awaiting: number | null;
  winnerId: number | null;
  /** turn timer deadline (ms epoch) — alarm shu vaqtga qo'yiladi */
  deadline: number | null;
  createdAt: number;
  /** o'yin tugagandan keyingi natijalar tarixi (#5) */
  results: GameResult[];
  /** global leaderboard ga yozilganini oldini olish uchun (#5) */
  globalResultRecorded: boolean;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function createRoom(code: string, settings: RoomSettings, hostName: string, hostToken: string, now = Date.now()): OnlineRoom {
  return {
    code,
    hostToken,
    settings: { timerSec: settings.timerSec === 120 ? 120 : 60, bots: Math.max(0, Math.min(3, settings.bots | 0)) },
    phase: "lobby",
    players: [{ id: 0, name: hostName.slice(0, 16) || "O'yinchi", token: hostToken, isBot: false, connected: false }],
    game: null,
    pending: null,
    awaiting: null,
    winnerId: null,
    deadline: null,
    createdAt: now,
    results: [],
    globalResultRecorded: false,
  };
}

export function joinRoom(room: OnlineRoom, name: string, token: string): ActionResult & { playerId?: number } {
  if (room.phase !== "lobby") return { ok: false, error: "O'yin allaqachon boshlangan" };
  if (room.players.length >= MAX_PLAYERS) return { ok: false, error: "Xona to'la (maks. 4 o'yinchi)" };
  const id = room.players.length;
  room.players.push({ id, name: name.slice(0, 16) || `O'yinchi ${id + 1}`, token, isBot: false, connected: false });
  return { ok: true, playerId: id };
}

export function playerByToken(room: OnlineRoom, token: string): RoomPlayer | undefined {
  return room.players.find((p) => p.token === token);
}

/** Xost chiqib ketsa, navbatdagi ulangan inson o'yinchisiga xost huquqini o'tkazadi. */
export function transferHost(room: OnlineRoom, leavingToken: string): { ok: boolean; newHostToken?: string } {
  if (room.hostToken !== leavingToken) return { ok: false };
  const next = room.players.find((p) => !p.isBot && p.connected && p.token !== leavingToken);
  if (!next) return { ok: false };
  room.hostToken = next.token;
  return { ok: true, newHostToken: next.token };
}

/** O'yinni boshlash — faqat xost. Botlar qo'shiladi. */
export function startGame(room: OnlineRoom, token: string): ActionResult {
  if (token !== room.hostToken) return { ok: false, error: "Faqat xost boshlay oladi" };
  if (room.phase !== "lobby") return { ok: false, error: "O'yin allaqachon boshlangan" };
  const total = Math.min(MAX_PLAYERS, room.players.length + room.settings.bots);
  if (total < 2) return { ok: false, error: "Kamida 2 o'yinchi kerak (bot qo'shing yoki do'st chaqiring)" };
  while (room.players.length < total) {
    room.players.push({
      id: room.players.length,
      name: `Bot ${room.players.length}`,
      token: makeToken(),
      isBot: true,
      connected: true,
    });
  }
  const usedProf = new Set<string>();
  const botPersonalities: BotPersonality[] = ["cautious", "balanced", "bold"];
  let botIndex = 0;
  const players: Player[] = room.players.map((rp, i) => {
    const avail = PROFESSIONS.filter((pr) => !usedProf.has(pr.id));
    const prof = pick(avail.length ? avail : PROFESSIONS);
    usedProf.add(prof.id);
    const personality: BotPersonality = rp.isBot ? botPersonalities[botIndex++ % botPersonalities.length] : "balanced";
    return makePlayer(i, rp.name, prof, {
      isBot: rp.isBot,
      personality,
      colorIndex: (i % 4) as Player["colorIndex"],
      dreamId: pick(DREAMS).id,
    });
  });
  room.game = makeGame(players, "classic", "classic");
  room.phase = "playing";
  addLog(room.game, "rocket", "🌐 Onlayn o'yin boshlandi! Asosiy aylanadan birinchi chiqgan g'olib.", "gold");
  beginTurn(room, Date.now());
  return { ok: true };
}

const BOT_DELAY_MS = 1200;

/** Navbat boshlanishi: deadline + skipTurns + bot avtomatik yurish. */
function beginTurn(room: OnlineRoom, now: number): void {
  const g = room.game!;
  const p = g.players[g.current];
  room.pending = null;
  if (p.skipTurns > 0) {
    p.skipTurns -= 1;
    addLog(g, "work", `${p.name}: dam olish/ishsizlik — navbat o'tkazib yuborildi`, "bad");
    finishTurn(room, now);
    return;
  }
  if (p.isBot) {
    room.awaiting = p.id;
    room.deadline = now + BOT_DELAY_MS;
    return;
  }
  room.awaiting = p.id;
  room.deadline = now + room.settings.timerSec * 1000;
}

function cur(room: OnlineRoom): Player {
  const g = room.game!;
  return g.players[g.current];
}

/** Navbatni yakunlash: escape/bankrot tekshiruvi, keyingi o'yinchi. */
function finishTurn(room: OnlineRoom, now: number): void {
  const g = room.game!;
  const p = cur(room);
  // G'alaba tekshiruvi — Asosiy aylanadan chiqish
  if (canEscape(p, g.news, g.exchange, g.mode)) {
    p.escaped = true;
    p.escapeTurn = g.round;
    room.phase = "finished";
    room.winnerId = p.id;
    room.pending = null;
    room.awaiting = null;
    room.deadline = null;
    recordGameResult(room);
    addLog(g, "rocket", `🏆 ${p.name} Asosiy aylanadan chiqdi va o'yinda G'OLIB bo'ldi!`, "gold");
    return;
  }
  if (p.cash < 0) {
    const loan = emergencyLoan(p);
    if (loan) {
      addLog(g, "coins", `${p.name}: shoshilinch qarz olindi (naqd manfiy edi)`, "bad");
    } else {
      p.bankrupt = true;
      p.statBankruptcies += 1;
      addLog(g, "work", `💥 ${p.name} bankrot bo'ldi va o'yinni tark etdi`, "bad");
    }
  }
  const alive = g.players.filter((pl) => !pl.bankrupt && !pl.escaped);
  if (alive.length === 0) {
    room.phase = "finished";
    room.winnerId = null;
    room.deadline = null;
    recordGameResult(room);
    addLog(g, "work", "Barcha o'yinchilar o'yindan chiqdi — o'yin tugadi", "bad");
    return;
  }
  if (alive.length === 1 && room.players.some((rp) => !rp.isBot)) {
    // yagona qolgan o'yinchi g'olib
    room.phase = "finished";
    room.winnerId = alive[0].id;
    room.deadline = null;
    recordGameResult(room);
    addLog(g, "rocket", `🏆 ${alive[0].name} yagona qoldi — G'OLIB!`, "gold");
    return;
  }
  tickTurn(p);
  advanceTurn(g);
  beginTurn(room, now);
}

/** Zar tashlash + harakat + katak effekti. Human yoki bot uchun umumiy. */
function doRoll(room: OnlineRoom, now: number): void {
  const g = room.game!;
  const p = cur(room);
  const count: 1 | 2 = p.charityTurns > 0 ? 2 : 1;
  const dice = rollDice(count);
  g.dice = dice;
  g.diceCount = count;
  const total = diceTotal(dice, count);
  addLog(g, "coins", `${p.name}: zar ${dice[0]}${count === 2 ? "+" + dice[1] : ""} = ${total}`, "neutral");
  const path = movePath(p.position, total, RAT_CELLS.length);
  for (const cell of path) {
    if (cell === 0) {
      const res = applyPayday(p, g.news, g.exchange, g.month);
      const mres = completeMonth(g);
      addLog(g, "coins", `${p.name}: Oy kuni ${res.amount >= 0 ? "+" : "−"}${Math.abs(res.amount).toLocaleString("uz-UZ")} so'm`, res.amount >= 0 ? "good" : "bad");
      for (const n of res.notes.filter((n) => n.startsWith("🎉") || n.startsWith("⚠️"))) addLog(g, "coins", `${p.name}: ${n}`, n.startsWith("⚠️") ? "bad" : "gold");
      for (const dr of mres.deferred) addLog(g, "coins", `${dr.playerName}: kechiktirilgan xarajat qaytdi`, "bad");
    }
  }
  p.position = path[path.length - 1];
  resolveCell(room, now);
}

/** Tushilgan katak effekti — pending yoki avtomatik. */
function resolveCell(room: OnlineRoom, now: number): void {
  const g = room.game!;
  const p = cur(room);
  const cell = ratCellAt(p.position);
  const bot = p.isBot;
  switch (cell) {
    case "payday": // 0-katak: payday allaqachon yo'lda qo'llanildi
    case "avans": {
      if (cell === "avans") {
        const amt = applyAvans(p);
        if (amt > 0) addLog(g, "coins", `${p.name}: avans +${amt.toLocaleString("uz-UZ")} so'm`, "good");
      }
      return endOrWait(room, now);
    }
    case "opportunity": {
      if (bot) {
        const size = botPickDealSize(p);
        const card = pick(size === "big" ? BIG_DEALS : SMALL_DEALS);
        const d = botDealDecision(p, card);
        if (d.buy) {
          try {
            buyDeal(p, card, true, g.marketIndices[card.kind] ?? 1);
            addLog(g, "rocket", `${p.name}: "${card.title}" bitimini sotib oldi`, "good");
          } catch {
            addLog(g, "coins", `${p.name}: "${card.title}" — pul yetmadi, o'tkazildi`, "neutral");
          }
        } else addLog(g, "coins", `${p.name}: "${card.title}" bitimidan voz kechdi`, "neutral");
        return endOrWait(room, now);
      }
      room.pending = { kind: "deal-size" };
      room.awaiting = p.id;
      room.deadline = now + room.settings.timerSec * 1000;
      return;
    }
    case "doodad": {
      const card = pick(DOODAD_CARDS);
      if (bot && botDoodadDecline(p, card)) {
        addLog(g, "coins", `${p.name}: "${card.title}" — xariddan bosh tortdi`, "neutral");
        return endOrWait(room, now);
      }
      const mode = bot ? botDoodadMode(p, card) : "cash";
      const note = applyDoodad(p, card, mode);
      addLog(g, "coins", `${p.name}: ${card.title} — ${note}`, "bad");
      return endOrWait(room, now);
    }
    case "market": {
      const card = pick(MARKET_CARDS);
      const owned = p.assets.filter((a) => a.kind === card.kind && !(a.constructionLeft && a.constructionLeft > 0));
      if (owned.length === 0) {
        addLog(g, "coins", `${p.name}: bozor — "${card.kind}" aktivi yo'q, taklif o'tkazildi`, "neutral");
        return endOrWait(room, now);
      }
      if (bot) {
        if (botSellDecision()) {
          const target = owned[0];
          const offer = marketOffer(p, target, card);
          sellAsset(p, target.id, offer);
          addLog(g, "coins", `${p.name}: "${target.title}" sotildi (+${offer.toLocaleString("uz-UZ")})`, "good");
        } else addLog(g, "coins", `${p.name}: bozor taklifidan voz kechdi`, "neutral");
        return endOrWait(room, now);
      }
      room.pending = { kind: "market", card, assetIds: owned.map((a) => a.id) };
      room.awaiting = p.id;
      room.deadline = now + room.settings.timerSec * 1000;
      return;
    }
    case "event": {
      const cards = eligibleEvents(p, g.recentEvents).filter((c) => !c.choices && c.effect.type !== "migration");
      if (cards.length === 0) return endOrWait(room, now);
      const card = pick(cards);
      const note = applyEvent(p, card, g);
      g.recentEvents.push(card.id);
      if (g.recentEvents.length > 8) g.recentEvents.shift();
      addLog(g, "sparkles", `${p.name}: ${card.title} — ${note}`, "gold");
      return endOrWait(room, now);
    }
    case "weekend": {
      const card = pick(WEEKEND_CARDS);
      const choice = bot ? botWeekendChoice(p, card) : "free";
      const note = applyWeekend(p, card, choice);
      addLog(g, "sparkles", `${p.name}: dam olish — ${card.title} (${note})`, "neutral");
      return endOrWait(room, now);
    }
    case "charity": {
      if (p.charityBlockedTurns > 0) return endOrWait(room, now);
      if (bot) {
        const acc = botCharityDecision(p);
        const amt = applyCharity(p, acc);
        if (acc) addLog(g, "sparkles", `${p.name}: xayriya −${amt.toLocaleString("uz-UZ")} (2 navbat 2 zar)`, "gold");
        return endOrWait(room, now);
      }
      room.pending = { kind: "charity" };
      room.awaiting = p.id;
      room.deadline = now + room.settings.timerSec * 1000;
      return;
    }
    case "baby": {
      const r = applyBaby(p, g.month);
      if (r.kind === "baby") addLog(g, "sparkles", `${p.name}: farzand tug'ildi! 👶`, "gold");
      else if (r.kind === "feast") addLog(g, "sparkles", `${p.name}: oilaviy tadbir −${r.cost.toLocaleString("uz-UZ")}`, "bad");
      return endOrWait(room, now);
    }
    case "downsized": {
      applyDownsized(p);
      addLog(g, "work", `${p.name}: ishsizlik! 2 navbat o'tkaziladi`, "bad");
      return endOrWait(room, now);
    }
    default:
      return endOrWait(room, now);
  }
}

function endOrWait(room: OnlineRoom, now: number): void {
  finishTurn(room, now);
}

/** Bot navbatini to'liq o'ynaydi (zar + katak). */
function botPlay(room: OnlineRoom, now: number): void {
  room.awaiting = null;
  doRoll(room, now);
}

export type ClientAction =
  | { kind: "roll" }
  | { kind: "deal-size"; size: "small" | "big" }
  | { kind: "buy" }
  | { kind: "pass" }
  | { kind: "sell"; assetId: string }
  | { kind: "charity"; accept: boolean };

/** Human o'yinchi amali. */
export function handleAction(room: OnlineRoom, token: string, action: ClientAction, now = Date.now()): ActionResult {
  if (room.phase !== "playing" || !room.game) return { ok: false, error: "O'yin faol emas" };
  const rp = playerByToken(room, token);
  if (!rp) return { ok: false, error: "O'yinchi topilmadi" };
  const g = room.game;
  const p = g.players[g.current];
  if (rp.id !== p.id) return { ok: false, error: "Sizning navbatingiz emas" };
  if (room.awaiting !== rp.id) return { ok: false, error: "Hozir kutilmayapti" };

  if (!room.pending) {
    if (action.kind !== "roll") return { ok: false, error: "Avval zar tashlang" };
    room.awaiting = null;
    doRoll(room, now);
    return { ok: true };
  }

  switch (room.pending.kind) {
    case "deal-size": {
      if (action.kind === "deal-size") {
        const card = pick(action.size === "big" ? BIG_DEALS : SMALL_DEALS);
        room.pending = { kind: "deal", card };
        room.deadline = now + room.settings.timerSec * 1000;
        return { ok: true };
      }
      if (action.kind === "pass") {
        addLog(g, "coins", `${p.name}: imkoniyatdan voz kechdi`, "neutral");
        room.pending = null;
        room.awaiting = null;
        finishTurn(room, now);
        return { ok: true };
      }
      return { ok: false, error: "Bitim turini tanlang yoki o'tkazing" };
    }
    case "deal": {
      const card = room.pending.card;
      if (action.kind === "buy") {
        try {
          buyDeal(p, card, true, g.marketIndices[card.kind] ?? 1);
          addLog(g, "rocket", `${p.name}: "${card.title}" bitimini sotib oldi`, "good");
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : "Sotib bo'lmadi" };
        }
      } else if (action.kind === "pass") {
        addLog(g, "coins", `${p.name}: "${card.title}" bitimidan voz kechdi`, "neutral");
      } else return { ok: false, error: "Sotib olish yoki o'tkazish kerak" };
      room.pending = null;
      room.awaiting = null;
      finishTurn(room, now);
      return { ok: true };
    }
    case "market": {
      const pend = room.pending;
      if (action.kind === "sell") {
        if (!pend.assetIds.includes(action.assetId)) return { ok: false, error: "Bu aktiv sotib bo'lmaydi" };
        const target = p.assets.find((a) => a.id === action.assetId)!;
        const offer = marketOffer(p, target, pend.card);
        sellAsset(p, target.id, offer);
        addLog(g, "coins", `${p.name}: "${target.title}" sotildi (+${offer.toLocaleString("uz-UZ")})`, "good");
      } else if (action.kind === "pass") {
        addLog(g, "coins", `${p.name}: bozor taklifidan voz kechdi`, "neutral");
      } else return { ok: false, error: "Sotish yoki o'tkazish kerak" };
      room.pending = null;
      room.awaiting = null;
      finishTurn(room, now);
      return { ok: true };
    }
    case "charity": {
      if (action.kind !== "charity") return { ok: false, error: "Xayriya tanlovi kerak" };
      const amt = applyCharity(p, action.accept);
      if (action.accept) addLog(g, "sparkles", `${p.name}: xayriya −${amt.toLocaleString("uz-UZ")} (2 navbat 2 zar)`, "gold");
      else addLog(g, "coins", `${p.name}: xayriyadan voz kechdi`, "neutral");
      room.pending = null;
      room.awaiting = null;
      finishTurn(room, now);
      return { ok: true };
    }
  }
}

/** Taymer tugaganda avtomatik harakat (Durable Object alarm chaqiradi). */
export function onTimeout(room: OnlineRoom, now = Date.now()): void {
  if (room.phase !== "playing" || !room.game) return;
  const g = room.game;
  const p = g.players[g.current];
  if (p.isBot) {
    // botlar jonli taassurot uchun kichik kechikish bilan o'ynaydi (#9)
    room.awaiting = null;
    botPlay(room, now);
    return;
  }
  const rp = room.players[p.id];
  // Uzilgan o'yinchi faqat navbatni o'tkazib yuboradi, pul/yurish qarorlarini o'zi qabul qilmaydi (#8)
  if (rp && !rp.connected) {
    addLog(g, "work", `⏱ ${p.name}: aloqa uzildi — navbat o'tkazib yuborildi`, "bad");
    room.pending = null;
    room.awaiting = null;
    finishTurn(room, now);
    return;
  }
  addLog(g, "work", `⏱ ${p.name}: vaqt tugadi — avtomatik harakat`, "bad");
  if (!room.pending) {
    room.awaiting = null;
    doRoll(room, now);
    return;
  }
  switch (room.pending.kind) {
    case "deal-size":
    case "deal":
    case "market":
      addLog(g, "coins", `${p.name}: vaqt tugadi — taklif o'tkazib yuborildi`, "neutral");
      break;
    case "charity":
      applyCharity(p, false);
      break;
  }
  room.pending = null;
  room.awaiting = null;
  finishTurn(room, now);
}

/** Klietga yuboriladigan xavfsiz holat (tokenlar yashiringan). */
export function publicState(room: OnlineRoom, forToken?: string) {
  const me = forToken ? playerByToken(room, forToken) : undefined;
  const g = room.game;
  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    isHost: !!forToken && forToken === room.hostToken,
    you: me ? me.id : null,
    players: room.players.map((p) => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected })),
    winnerId: room.winnerId,
    awaiting: room.awaiting,
    deadline: room.deadline,
    pending: room.pending
      ? room.pending.kind === "deal"
        ? { kind: "deal", card: room.pending.card, onlyFor: room.awaiting }
        : room.pending.kind === "market"
          ? {
              kind: "market",
              card: { id: room.pending.card.id, kind: room.pending.card.kind, factor: room.pending.card.factor, icon: room.pending.card.icon },
              assetIds: room.pending.assetIds,
              onlyFor: room.awaiting,
            }
          : { kind: room.pending.kind, onlyFor: room.awaiting }
      : null,
    game: g
      ? {
          current: g.current,
          round: g.round,
          month: g.month,
          dice: g.dice,
          diceCount: g.diceCount,
          log: g.log.slice(-60),
          players: g.players.map((p) => ({
            id: p.id,
            name: p.name,
            isBot: p.isBot,
            avatar: p.avatar,
            colorIndex: p.colorIndex,
            position: p.position,
            cash: p.cash,
            salary: p.salary,
            assets: p.assets.map((a) => ({ id: a.id, title: a.title, kind: a.kind, icon: a.icon, price: a.price, monthlyCashflow: a.monthlyCashflow })),
            loansCount: p.loans.length,
            children: p.children,
            escaped: p.escaped,
            bankrupt: p.bankrupt,
            charityTurns: p.charityTurns,
            skipTurns: p.skipTurns,
          })),
        }
      : null,
  };
}

/** O'yin tugaganda natijani saqlash (#5) */
export function recordGameResult(room: OnlineRoom, now = Date.now()): void {
  if (!room.game || room.phase !== "finished") return;
  const g = room.game;
  room.results.push({
    finishedAt: now,
    winnerId: room.winnerId,
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      cash: p.cash,
      escaped: p.escaped,
      bankrupt: p.bankrupt,
    })),
  });
  // faqat so'nggi 10 o'yinni saqlaymiz
  if (room.results.length > 10) room.results = room.results.slice(-10);
}

/* ---------------- Global leaderboard (#5) ---------------- */

export interface LeaderboardEnv {
  OQIM_USERS: KVNamespace;
}

export interface LeaderboardEntry {
  id: string;
  code: string;
  finishedAt: number;
  createdAt: number;
  winnerId: number | null;
  winnerName: string | null;
  playerCount: number;
  humanCount: number;
  players: { id: number; name: string; isBot: boolean; cash: number; escaped: boolean; bankrupt: boolean }[];
}

const LEADERBOARD_PREFIX = "leaderboard:entry:";
const LEADERBOARD_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 kun

/** Bitta tugagan o'yinni global leaderboard ga yozadi. */
export async function recordGlobalResult(env: LeaderboardEnv, room: OnlineRoom, now = Date.now()): Promise<void> {
  if (!room.game || room.phase !== "finished" || room.globalResultRecorded) return;
  room.globalResultRecorded = true;
  const winner = room.winnerId !== null ? room.game.players.find((p) => p.id === room.winnerId) ?? null : null;
  const humans = room.players.filter((p) => !p.isBot);
  const entry: LeaderboardEntry = {
    id: `${room.code}:${now}`,
    code: room.code,
    finishedAt: now,
    createdAt: room.createdAt,
    winnerId: room.winnerId,
    winnerName: winner?.name ?? null,
    playerCount: room.game.players.length,
    humanCount: humans.length,
    players: room.game.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      cash: p.cash,
      escaped: p.escaped,
      bankrupt: p.bankrupt,
    })),
  };
  await env.OQIM_USERS.put(`${LEADERBOARD_PREFIX}${entry.id}`, JSON.stringify(entry), {
    expirationTtl: LEADERBOARD_MAX_AGE_SECONDS,
  });
}

/** Global leaderboard ni o'qiydi (so'nggi o'yinlar birinchi). */
export async function getLeaderboard(env: LeaderboardEnv, limit = 50): Promise<LeaderboardEntry[]> {
  const list = await env.OQIM_USERS.list({ prefix: LEADERBOARD_PREFIX });
  const entries: LeaderboardEntry[] = [];
  for (const key of list.keys) {
    const raw = await env.OQIM_USERS.get(key.name);
    if (!raw) continue;
    try {
      entries.push(JSON.parse(raw) as LeaderboardEntry);
    } catch {
      /* yomon yozuv */
    }
  }
  entries.sort((a, b) => b.finishedAt - a.finishedAt);
  return entries.slice(0, limit);
}

export { addLog };
