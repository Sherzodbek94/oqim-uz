/**
 * OQIM Onlayn (v19) — GameRoom Durable Object.
 * WebSocket Hibernation API + alarm asosidagi navbat taymeri.
 */
import {
  createRoom,
  handleAction,
  joinRoom,
  makeToken,
  onTimeout,
  playerByToken,
  publicState,
  startGame,
  type ClientAction,
  type OnlineRoom,
} from "./game/online";

interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

interface AttachMeta {
  token: string;
}

type ClientMsg =
  | { t: "join"; name: string; token?: string }
  | { t: "start" }
  | { t: "action"; action: ClientAction }
  | { t: "ping" };

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
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Ichki init — Worker yangi xona yaratganda chaqiradi
    if (request.method === "POST" && url.pathname === "/init") {
      const body = (await request.json()) as { code: string; settings: { timerSec: 60 | 120; bots: number }; hostName: string; hostToken: string };
      this.room = createRoom(body.code, body.settings, body.hostName, body.hostToken);
      await this.save();
      return Response.json({ ok: true });
    }

    const room = await this.load();

    // Xona holati (lobby) — HTTP
    if (request.method === "GET" && !request.headers.get("Upgrade")) {
      if (!room) return Response.json({ ok: false, error: "Xona topilmadi" }, { status: 404 });
      return Response.json({ ok: true, state: publicState(room) });
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket kutilgan edi", { status: 426 });
    }
    if (!room) return new Response("Xona topilmadi", { status: 404 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      return this.send(ws, { t: "error", error: "Noto'g'ri JSON" });
    }
    const room = await this.load();
    if (!room) return this.send(ws, { t: "error", error: "Xona topilmadi" });
    const now = Date.now();

    if (msg.t === "ping") return this.send(ws, { t: "pong" });

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
      ws.serializeAttachment({ token: player.token } satisfies AttachMeta);
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
      if (room.phase === "finished") this.broadcast({ t: "end", winnerId: room.winnerId });
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
        await this.afterChange();
      }
    }
  }

  /** Navbat taymeri — vaqt tugaganda avtomatik harakat. */
  async alarm(): Promise<void> {
    const room = await this.load();
    if (!room || room.phase !== "playing") return;
    const now = Date.now();
    if (room.deadline && now >= room.deadline - 250) {
      onTimeout(room, now);
      await this.afterChange();
      if ((room.phase as string) === "finished") this.broadcast({ t: "end", winnerId: room.winnerId });
    } else if (room.deadline) {
      await this.syncDeadline();
    }
  }
}

