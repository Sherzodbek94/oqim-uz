/**
 * OQIM Onlayn (v19) — WebSocket klient.
 * Zustand yo'q — mavjud useState/useRef patterniga mos oddiy event-emittent klient.
 * Token localStorage'da saqlanadi (reconnect uchun). Server yo'q bo'lsa
 * lokal o'yin hech qanday ta'sir ko'rmaydi (bu modul faqat /onlayn sahifada ishlatiladi).
 */

export const OQIM_SERVER: string =
  (import.meta.env.VITE_OQIM_SERVER as string | undefined)?.replace(/\/$/, "") ||
  "https://oqim-server.your-account.workers.dev";

const TOKEN_KEY = (code: string) => `oqim-online-token-${code}`;
const NAME_KEY = "oqim-online-name";

export function savedToken(code: string): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY(code));
  } catch {
    return null;
  }
}
export function saveToken(code: string, token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY(code), token);
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
  const res = await fetch(`${OQIM_SERVER}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, timerSec, bots }),
  });
  return (await res.json()) as CreateRoomResponse;
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
  | { t: "pong" };

export type ClientAction =
  | { kind: "roll" }
  | { kind: "deal-size"; size: "small" | "big" }
  | { kind: "buy" }
  | { kind: "pass" }
  | { kind: "sell"; assetId: string }
  | { kind: "charity"; accept: boolean };

type Listener = (msg: ServerMsg) => void;

export class OnlineClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private closedByUser = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
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

  connect(): void {
    this.closedByUser = false;
    this.status = "connecting";
    const base = OQIM_SERVER.replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/api/rooms/${this.code}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.status = "open";
      this.retry = 0;
      this.send({ t: "join", name: this.name, token: this.token ?? undefined });
      this.emit({ t: "pong" }); // status yangilansin
    };
    ws.onmessage = (ev) => {
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
    ws.onclose = () => {
      this.status = "closed";
      if (!this.closedByUser && this.retry < 6) {
        const delay = Math.min(8000, 500 * 2 ** this.retry++);
        this.retryTimer = setTimeout(() => this.connect(), delay);
      }
    };
    ws.onerror = () => ws.close();
  }

  send(msg: { t: "join"; name: string; token?: string } | { t: "start" } | { t: "action"; action: ClientAction } | { t: "ping" }): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  start(): void {
    this.send({ t: "start" });
  }
  action(action: ClientAction): void {
    this.send({ t: "action", action });
  }

  close(): void {
    this.closedByUser = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
  }
}
