/**
 * OQIM Onlayn (v19) — WebSocket klient.
 * Zustand yo'q — mavjud useState/useRef patterniga mos oddiy event-emittent klient.
 * Token localStorage'da saqlanadi (reconnect uchun). Server yo'q bo'lsa
 * lokal o'yin hech qanday ta'sir ko'rmaydi (bu modul faqat /onlayn sahifada ishlatiladi).
 */

import { requestJson } from './http';
import { z } from 'zod';

const resultPlayerSchema = z.object({
  id: z.number().int(), name: z.string(), isBot: z.boolean(), cash: z.number(),
  escaped: z.boolean(), bankrupt: z.boolean(),
});
const resultSchema = z.object({
  finishedAt: z.number(), winnerId: z.number().int().nullable(), players: z.array(resultPlayerSchema),
});
const leaderboardSchema = resultSchema.extend({
  id: z.string(), code: z.string(), createdAt: z.number(), winnerName: z.string().nullable(),
  playerCount: z.number().int().nonnegative(), humanCount: z.number().int().nonnegative(),
});
const invalidResponse = {ok: false, error: 'Server javobi noto‘g‘ri. Qayta urinib ko‘ring.'} as const;

export const OQIM_SERVER: string =
  (import.meta.env.VITE_OQIM_SERVER as string | undefined)?.replace(/\/$/, "") ||
  "https://oqim-server.yigitcha-9493.workers.dev";

const TOKEN_KEY = (code: string) => `oqim-online-token-${code}`;
const NAME_KEY = "oqim-online-name";

export function savedToken(code: string): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY(code));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { token?: unknown; expiresAt?: unknown };
    if (typeof saved.token !== "string" || typeof saved.expiresAt !== "number" || saved.expiresAt <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY(code));
      return null;
    }
    return saved.token;
  } catch {
    return null;
  }
}
export function saveToken(code: string, token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY(code), JSON.stringify({token, expiresAt: Date.now() + 24 * 60 * 60 * 1000}));
  } catch {
    /* yopiq rejim */
  }
}
export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}
export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* yopiq rejim */
  }
}

export interface CreateRoomResponse {
  ok: boolean;
  code?: string;
  hostToken?: string;
  error?: string;
}

export async function createRoom(name: string, timerSec: 60 | 120, bots: number): Promise<CreateRoomResponse> {
  const response = await requestJson<CreateRoomResponse>(`${OQIM_SERVER}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, timerSec, bots }),
  });
  if (response.ok && (!/^[A-Z2-9]{6}$/.test(response.code ?? '') || !response.hostToken)) return invalidResponse;
  return response;
}

export async function checkRoom(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[A-Z2-9]{6}$/.test(code)) return {ok: false, error: 'Xona kodi 6 belgidan iborat bo‘lishi kerak'};
  return requestJson(`${OQIM_SERVER}/api/rooms/${code}`);
}

export interface GameResult {
  finishedAt: number;
  winnerId: number | null;
  players: { id: number; name: string; isBot: boolean; cash: number; escaped: boolean; bankrupt: boolean }[];
}

export async function fetchResults(code: string): Promise<{ ok: boolean; results?: GameResult[]; error?: string }> {
  const response = await requestJson<{ok: boolean; results?: GameResult[]; error?: string}>(`${OQIM_SERVER}/api/rooms/${encodeURIComponent(code)}/results`);
  if (!response.ok) return response;
  const parsed = z.array(resultSchema).safeParse(response.results);
  return parsed.success ? {ok: true, results: parsed.data} : invalidResponse;
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

export async function fetchLeaderboard(): Promise<{ ok: boolean; entries?: LeaderboardEntry[]; error?: string }> {
  const response = await requestJson<{ok: boolean; entries?: LeaderboardEntry[]; error?: string}>(`${OQIM_SERVER}/api/leaderboard`);
  if (!response.ok) return response;
  const parsed = z.array(leaderboardSchema).safeParse(response.entries);
  return parsed.success ? {ok: true, entries: parsed.data} : invalidResponse;
}

export interface PublicState {
  code: string;
  phase: "lobby" | "playing" | "finished";
  settings: { timerSec: number; bots: number };
  isHost: boolean;
  you: number | null;
  players: { id: number; name: string; isBot: boolean; connected: boolean }[];
  winnerId: number | null;
  awaiting: number | null;
  deadline: number | null;
  pending:
    | { kind: "deal-size"; onlyFor: number | null }
    | { kind: "deal"; card: OnlineDealCard; onlyFor: number | null }
    | { kind: "market"; card: { id: string; kind: string; factor: number; icon: string }; assetIds: string[]; onlyFor: number | null }
    | { kind: "charity"; onlyFor: number | null }
    | null;
  game: {
    current: number;
    round: number;
    month: number;
    dice: [number, number];
    diceCount: number;
    log: { id: number; round: number; icon: string; text: string; tone: string }[];
    players: OnlinePlayer[];
  } | null;
}

export interface OnlineDealCard {
  id: string;
  title: string;
  kind: string;
  icon: string;
  price: number;
  down: number;
  cashflow: number;
  note: string;
  size: "small" | "big";
}

export interface OnlinePlayer {
  id: number;
  name: string;
  isBot: boolean;
  avatar: string;
  colorIndex: number;
  position: number;
  cash: number;
  salary: number;
  assets: { id: string; title: string; kind: string; icon: string; price: number; monthlyCashflow: number }[];
  loansCount: number;
  children: number;
  escaped: boolean;
  bankrupt: boolean;
  charityTurns: number;
  skipTurns: number;
}

export type ServerMsg =
  | { t: "state"; state: PublicState }
  | { t: "joined"; token: string; playerId: number }
  | { t: "error"; error: string }
  | { t: "end"; winnerId: number | null }
  | { t: "pong" }
  | { t: "status"; connected: boolean; canReconnect: boolean }
  | { t: "chat"; playerId: number; text: string; at: number };

export type ClientAction =
  | { kind: "roll" }
  | { kind: "deal-size"; size: "small" | "big" }
  | { kind: "buy" }
  | { kind: "pass" }
  | { kind: "sell"; assetId: string }
  | { kind: "charity"; accept: boolean };

type Listener = (msg: ServerMsg) => void;

const MAX_RETRIES = 6;

export class OnlineClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private closedByUser = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private canReconnect = true;
  status: "connecting" | "open" | "closed" = "connecting";

  private code: string;
  private name: string;
  private token: string | null;

  constructor(code: string, name: string, token: string | null) {
    this.code = code;
    this.name = name;
    this.token = token;
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(msg: ServerMsg): void {
    for (const fn of this.listeners) fn(msg);
  }

  private emitStatus(): void {
    this.emit({ t: "status", connected: this.status === "open", canReconnect: this.canReconnect });
  }

  connect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const previous = this.ws;
    this.ws = null;
    previous?.close();
    this.closedByUser = false;
    this.status = "connecting";
    this.emitStatus();
    const base = OQIM_SERVER.replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/api/rooms/${this.code}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.status = "open";
      this.canReconnect = true;
      this.send({ t: "join", name: this.name, token: this.token ?? undefined });
      this.emitStatus();
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      try {
        const msg = JSON.parse(ev.data as string) as ServerMsg;
        if (msg.t === "joined") {
          this.token = msg.token;
          saveToken(this.code, msg.token);
        }
        this.emit(msg);
      } catch {
        /* yomon paket */
      }
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.status = "closed";
      this.emitStatus();
      if (this.closedByUser) return;
      if ([1008, 1009].includes(event.code)) {
        this.canReconnect = false;
        this.emitStatus();
        return;
      }
      if (this.retry < MAX_RETRIES) {
        const delay = Math.min(8000, 500 * 2 ** this.retry++);
        this.retryTimer = setTimeout(() => this.connect(), delay);
      } else {
        this.canReconnect = false;
        this.emitStatus();
      }
    };
    ws.onerror = () => ws.close();
  }

  /** Qo'lda qayta ulanish (avto-retry tugagandan keyin). */
  reconnect(): void {
    this.retry = 0;
    this.canReconnect = true;
    this.connect();
  }

  send(
    msg:
      | { t: "join"; name: string; token?: string }
      | { t: "start" }
      | { t: "action"; action: ClientAction }
      | { t: "chat"; text: string }
      | { t: "ping" }
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  start(): void {
    this.send({ t: "start" });
  }
  action(action: ClientAction): void {
    this.send({ t: "action", action });
  }
  chat(text: string): void {
    this.send({ t: "chat", text: text.slice(0, 200) });
  }

  close(): void {
    this.closedByUser = true;
    this.canReconnect = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this.status = "closed";
    this.emitStatus();
  }
}
