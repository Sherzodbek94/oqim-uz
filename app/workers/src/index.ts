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
import { adminBan, adminListUsers, getMe, login, register, syncProfile } from "./auth";
import { makeRoomCode, makeToken, MAX_PLAYERS } from "./game/online";

export { GameRoom };

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  OQIM_USERS: KVNamespace;
  JWT_SECRET: string;
}

const ALLOWED_ORIGINS = ["https://oqim.pages.dev", "https://master.oqim.pages.dev", "http://localhost:5173"];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB
const MAX_SYNC_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

async function readBody<T>(request: Request, maxBytes = MAX_BODY_SIZE): Promise<T | null> {
  try {
    const contentLength = request.headers.get("Content-Length");
    if (contentLength && Number(contentLength) > maxBytes) return null;
    const clone = request.clone();
    const bytes = await clone.arrayBuffer();
    if (bytes.byteLength > maxBytes) return null;
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Auth marshrutlari
    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      const body = await readBody<{ email?: string; password?: string; name?: string }>(request);
      if (!body) return json({ ok: false, error: "Noto'g'ri JSON" }, 400, origin);
      return register(request, env, body, origin);
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = await readBody<{ email?: string; password?: string }>(request);
      if (!body) return json({ ok: false, error: "Noto'g'ri JSON" }, 400, origin);
      return login(request, env, body, origin);
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return getMe(env, request.headers.get("Authorization"), origin);
    }

    if (url.pathname === "/api/auth/sync" && request.method === "POST") {
      const body = await readBody<{ profile?: { games?: unknown[]; lessons?: string[] } }>(request, MAX_SYNC_BODY_SIZE);
      if (!body) return json({ ok: false, error: "Noto'g'ri yoki hajm juda katta" }, 400, origin);
      return syncProfile(env, request.headers.get("Authorization"), body, origin);
    }

    // Admin marshrutlari
    if (url.pathname === "/api/admin/ban" && request.method === "POST") {
      const body = await readBody<{ email?: string; banned?: boolean }>(request);
      if (!body) return json({ ok: false, error: "Noto'g'ri JSON" }, 400, origin);
      return adminBan(env, request.headers.get("Authorization"), body, origin);
    }

    if (url.pathname === "/api/admin/users" && request.method === "GET") {
      return adminListUsers(env, request.headers.get("Authorization"), origin);
    }

    // POST /api/rooms — xona yaratish
    if (request.method === "POST" && url.pathname === "/api/rooms") {
      let body: { name?: string; timerSec?: number; bots?: number };
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Noto'g'ri JSON" }, 400, origin);
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
        if (res.ok) return json({ ok: true, code, hostToken, playerId: 0 }, 200, origin);
      }
      return json({ ok: false, error: "Kod generatsiya qilib bo'lmadi — qayta urining" }, 500, origin);
    }

    // /api/rooms/:code va /api/rooms/:code/ws
    const m = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(\/ws)?$/);
    if (m) {
      const code = m[1];
      const isWs = !!m[2];
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      if (isWs) {
        if (request.headers.get("Upgrade") !== "websocket") {
          return json({ ok: false, error: "WebSocket kutilgan edi" }, 426, origin);
        }
        return stub.fetch(request);
      }
      if (request.method !== "GET") return json({ ok: false, error: "Faqat GET" }, 405, origin);
      const res = await stub.fetch(request);
      return new Response(res.body, {
        status: res.status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
      });
    }

    if (url.pathname === "/api/health") return json({ ok: true, service: "oqim-server", version: 19 }, 200, origin);
    return json({ ok: false, error: "Topilmadi" }, 404, origin);
  },
};
