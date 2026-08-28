/**
 * OQIM Onlayn serveri (v19) — Cloudflare Worker.
 *  POST /api/auth/register  — ro'yxatdan o'tish
 *  POST /api/auth/login     — kirish
 *  GET  /api/auth/me        — joriy foydalanuvchi
 *  POST /api/auth/sync      — profilni sinxronlash
 *  POST /api/rooms          — xona yaratish {name, timerSec, bots} → {code, hostToken}
 *  GET  /api/rooms/:code    — xona holati (lobby)
 *  GET  /api/rooms/:code/ws — WebSocket upgrade → GameRoom DO
 */
import { GameRoom } from "./GameRoom";
import { getMe, login, register, syncProfile } from "./auth";
import { makeRoomCode, makeToken, MAX_PLAYERS } from "./game/online";

export { GameRoom };

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  OQIM_USERS: KVNamespace;
  JWT_SECRET: string;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // Auth marshrutlari
    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      const body = await readBody<{ email?: string; password?: string; name?: string }>(request);
      if (!body) return json({ ok: false, error: "Noto'g'ri JSON" }, 400);
      return register(env, body);
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = await readBody<{ email?: string; password?: string }>(request);
      if (!body) return json({ ok: false, error: "Noto'g'ri JSON" }, 400);
      return login(env, body);
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return getMe(env, request.headers.get("Authorization"));
    }

    if (url.pathname === "/api/auth/sync" && request.method === "POST") {
      const body = await readBody<{ profile?: { games?: unknown[]; lessons?: string[] } }>(request);
      if (!body) return json({ ok: false, error: "Noto'g'ri JSON" }, 400);
      return syncProfile(env, request.headers.get("Authorization"), body);
    }

    // POST /api/rooms — xona yaratish
    if (request.method === "POST" && url.pathname === "/api/rooms") {
      let body: { name?: string; timerSec?: number; bots?: number };
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Noto'g'ri JSON" }, 400);
      }
      const hostName = (body.name || "O'yinchi").slice(0, 16);
      const timerSec = body.timerSec === 120 ? 120 : 60;
      const bots = Math.max(0, Math.min(MAX_PLAYERS - 1, (body.bots ?? 0) | 0));
      // Band kodlarga duch kelmaslik uchun bir necha urinish
      for (let i = 0; i < 8; i++) {
        const code = makeRoomCode();
        const id = env.GAME_ROOM.idFromName(code);
        const stub = env.GAME_ROOM.get(id);
        const hostToken = makeToken();
        const res = await stub.fetch("https://do/init", {
          method: "POST",
          body: JSON.stringify({ code, settings: { timerSec, bots }, hostName, hostToken }),
        });
        if (res.ok) return json({ ok: true, code, hostToken, playerId: 0 });
      }
      return json({ ok: false, error: "Kod generatsiya qilib bo'lmadi — qayta urining" }, 500);
    }

    // /api/rooms/:code va /api/rooms/:code/ws
    const m = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(\/ws)?$/);
    if (m) {
      const code = m[1];
      const isWs = !!m[2];
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      if (isWs) {
        if (request.headers.get("Upgrade") !== "websocket") return json({ ok: false, error: "WebSocket kutilgan edi" }, 426);
        return stub.fetch(request);
      }
      if (request.method !== "GET") return json({ ok: false, error: "Faqat GET" }, 405);
      const res = await stub.fetch(request);
      return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } });
    }

    if (url.pathname === "/api/health") return json({ ok: true, service: "oqim-server", version: 19 });
    return json({ ok: false, error: "Topilmadi" }, 404);
  },
};
