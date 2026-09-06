/**
 * OQIM Onlayn (v19) — GameRoom Durable Object.
 * WebSocket Hibernation API + alarm asosidagi navbat taymeri.
 */
import {
  addLog,
  createRoom,
  handleAction,
  joinRoom,
  makeToken,
  onTimeout,
  playerByToken,
  publicState,
  recordGlobalResult,
  startGame,
  transferHost,
  type ClientAction,
  type LeaderboardEnv,
  type OnlineRoom,
} from "./game/online";
import { isAllowedOrigin } from "./http";

interface Env extends LeaderboardEnv {
  GAME_ROOM: DurableObjectNamespace;
}

interface AttachMeta {
  token: string;
  windowStart?: number;
  count?: number;
}

type ClientMsg =
  | { t: "join"; name: string; token?: string }
  | { t: "start" }
  | { t: "action"; action: ClientAction }
  | { t: "chat"; text: string }
  | { t: "ping" };

function isClientMsg(value: unknown): value is ClientMsg {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  if (msg.t === "ping" || msg.t === "start") return true;
  if (msg.t === "join") return typeof msg.name === "string" && msg.name.length <= 64 && (msg.token === undefined || typeof msg.token === "string");
  if (msg.t === "chat") return typeof msg.text === "string" && msg.text.length <= 1000;
  if (msg.t === "action" && msg.action && typeof msg.action === "object") {
    const action = msg.action as Record<string, unknown>;
    if (["roll", "buy", "pass"].includes(String(action.kind))) return Object.keys(action).length <= 2;
    if (action.kind === "deal-size") return action.size === "small" || action.size === "big";
    if (action.kind === "sell") return typeof action.assetId === "string" && action.assetId.length <= 128;
    if (action.kind === "charity") return typeof action.accept === "boolean";
  }
  return false;
}

export class GameRoom {
  private room: OnlineRoom | null = null;

  constructor(
    private ctx: DurableObjectState,
    private env: Env
  ) {}

  private async load(): Promise<OnlineRoom | null> {
    if (!this.room) {
      this.room = (await this.ctx.storage.get<OnlineRoom>("room")) ?? null;
    }
    return this.room;
  }

  private async save(): Promise<void> {
    if (this.room) await this.ctx.storage.put("room", this.room);
  }

  private send(ws: WebSocket, msg: unknown): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* yopiq soket */
    }
  }

  private broadcast(msg?: unknown): void {
    for (const ws of this.ctx.getWebSockets()) {
      const meta = ws.deserializeAttachment() as AttachMeta | null;
      this.send(ws, msg ?? { t: "state", state: publicState(this.room!, meta?.token) });
    }
  }

  private async syncDeadline(): Promise<void> {
    const room = this.room;
    const current = await this.ctx.storage.getAlarm();
    if (!room || room.phase !== "playing" || !room.deadline) {
      if (current !== null) await this.ctx.storage.deleteAlarm();
      return;
    }
    if (current !== room.deadline) await this.ctx.storage.setAlarm(room.deadline);
  }

  private async afterChange(): Promise<void> {
    await this.save();
    await this.syncDeadline();
    this.broadcast();
    if (this.room?.phase === "finished" && !this.room.globalResultRecorded) await this.publishResult();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Ichki init — Worker yangi xona yaratganda chaqiradi
    if (request.method === "POST" && url.pathname === "/init") {
      const body = (await request.json()) as { code: string; settings: { timerSec: 60 | 120; bots: number }; hostName: string; hostToken: string };
      const created = await this.ctx.storage.transaction(async tx => {
        if (await tx.get("room")) return false;
        const next = createRoom(body.code, body.settings, body.hostName, body.hostToken);
        await tx.put("room", next);
        this.room = next;
        return true;
      });
      return Response.json({ ok: created }, {status: created ? 201 : 409});
    }

    const room = await this.load();

    // Xona holati (lobby) — HTTP
    if (request.method === "GET" && /\/api\/rooms\/[A-Z2-9]{6}$/.test(url.pathname) && !request.headers.get("Upgrade")) {
      if (!room) return Response.json({ ok: false, error: "Xona topilmadi" }, { status: 404 });
      return Response.json({ ok: true, state: publicState(room) });
    }

    // O'yin natijalari — HTTP
    if (request.method === "GET" && /\/api\/rooms\/[A-Z2-9]{6}\/results$/.test(url.pathname)) {
      if (!room) return Response.json({ ok: false, error: "Xona topilmadi" }, { status: 404 });
      return Response.json({ ok: true, results: room.results });
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket kutilgan edi", { status: 426 });
    }
    if (!room) return new Response("Xona topilmadi", { status: 404 });

    const origin = request.headers.get("Origin");
    if (!origin || !isAllowedOrigin(origin)) return new Response("Ruxsat yo‘q", {status: 403});
    if (this.ctx.getWebSockets().length >= 12) return new Response("Xona ulanish limiti", {status: 429});

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({token: "", windowStart: Date.now(), count: 0} satisfies AttachMeta);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if ((typeof message === "string" ? new TextEncoder().encode(message).byteLength : message.byteLength) > 4096) {
      ws.close(1009, "Xabar juda katta"); return;
    }
    const rate = (ws.deserializeAttachment() as AttachMeta | null) ?? {token: ""};
    if (!rate.windowStart || Date.now() - rate.windowStart >= 10_000) { rate.windowStart = Date.now(); rate.count = 0; }
    rate.count = (rate.count ?? 0) + 1;
    ws.serializeAttachment(rate);
    if (rate.count > 30) { ws.close(1008, "Xabarlar limiti"); return; }
    let msg: ClientMsg;
    try {
      const parsed: unknown = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
      if (!isClientMsg(parsed)) return this.send(ws, { t: "error", error: "Xabar formati noto'g'ri" });
      msg = parsed;
    } catch {
      return this.send(ws, { t: "error", error: "Noto'g'ri JSON" });
    }
    const room = await this.load();
    if (!room) return this.send(ws, { t: "error", error: "Xona topilmadi" });
    const now = Date.now();

    if (msg.t === "ping") return this.send(ws, { t: "pong" });

    if (msg.t === "chat") {
      const meta = ws.deserializeAttachment() as AttachMeta | null;
      const player = meta ? playerByToken(room, meta.token) : undefined;
      if (player && msg.text.trim()) {
        this.broadcast({ t: "chat", playerId: player.id, text: msg.text.trim().slice(0, 200), at: Date.now() });
      }
      return;
    }

    if (msg.t === "join") {
      // Reconnect yoki yangi o'yinchi
      let player = msg.token ? playerByToken(room, msg.token) : undefined;
      if (!player) {
        if (room.phase !== "lobby") return this.send(ws, { t: "error", error: "O'yin boshlangan — yangi o'yinchi kira olmaydi" });
        if (room.players.length >= 4) return this.send(ws, { t: "error", error: "Xona to'la" });
        const token = makeToken();
        const r = joinRoom(room, msg.name || "O'yinchi", token);
        if (!r.ok) return this.send(ws, { t: "error", error: r.error });
        player = room.players.find((p) => p.token === token)!;
        this.send(ws, { t: "joined", token, playerId: player.id });
      }
      player.connected = true;
      player.name = (msg.name || player.name).slice(0, 16);
      ws.serializeAttachment({ ...rate, token: player.token } satisfies AttachMeta);
      await this.afterChange();
      return;
    }

    const meta = ws.deserializeAttachment() as AttachMeta | null;
    if (!meta?.token) return this.send(ws, { t: "error", error: "Avval qo'shiling (join)" });

    if (msg.t === "start") {
      const r = startGame(room, meta.token);
      if (!r.ok) return this.send(ws, { t: "error", error: r.error });
      await this.afterChange();
      return;
    }

    if (msg.t === "action") {
      const r = handleAction(room, meta.token, msg.action, now);
      if (!r.ok) return this.send(ws, { t: "error", error: r.error });
      await this.afterChange();
      if (room.phase === "finished") {
        await this.publishResult();
        this.broadcast({ t: "end", winnerId: room.winnerId });
      }
      return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const room = await this.load();
    if (!room) return;
    const meta = ws.deserializeAttachment() as AttachMeta | null;
    const player = meta ? playerByToken(room, meta.token) : undefined;
    if (player) {
      // boshqa faol soketi bo'lmasa offline deb belgilaymiz
      const stillOnline = this.ctx.getWebSockets().some((other) => {
        if (other === ws) return false;
        const m = other.deserializeAttachment() as AttachMeta | null;
        return m?.token === player.token;
      });
      if (!stillOnline) {
        player.connected = false;
        if (player.token === room.hostToken) {
          const t = transferHost(room, player.token);
          if (t.ok && room.game) addLog(room.game, "crown", `👑 Xost chiqib ketdi — yangi xost: ${playerByToken(room, t.newHostToken!)?.name}`, "gold");
        }
        await this.afterChange();
      }
    }
  }

  /** Navbat taymeri — vaqt tugaganda avtomatik harakat. */
  async alarm(): Promise<void> {
    const room = await this.load();
    if (room?.phase === "finished") { await this.publishResult(); return; }
    if (!room || room.phase !== "playing") return;
    const now = Date.now();
    if (room.deadline && now >= room.deadline - 250) {
      onTimeout(room, now);
      await this.afterChange();
      if ((room.phase as string) === "finished") {
        await this.publishResult();
        this.broadcast({ t: "end", winnerId: room.winnerId });
      }
    } else if (room.deadline) {
      await this.syncDeadline();
    }
  }

  private async publishResult(): Promise<void> {
    if (!this.room) return;
    try {
      await recordGlobalResult(this.env, this.room);
      await this.save();
    } catch {
      console.error(JSON.stringify({event: "result_write_failed", code: this.room.code}));
      await this.ctx.storage.setAlarm(Date.now() + 30_000);
    }
  }
}
