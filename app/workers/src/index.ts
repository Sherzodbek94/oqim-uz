/**
 * OQIM Onlayn serveri (v19) — Cloudflare Worker.
 *  POST /api/rooms          — xona yaratish {name, timerSec, bots} → {code, hostToken}
 *  GET  /api/rooms/:code    — xona holati (lobby)
 *  GET  /api/rooms/:code/ws — WebSocket upgrade → GameRoom DO
 */
import { GameRoom } from "./GameRoom";
import { getLeaderboard, makeRoomCode, makeToken, MAX_PLAYERS, type LeaderboardEnv } from "./game/online";

export { GameRoom };

interface Env extends LeaderboardEnv {
  GAME_ROOM: DurableObjectNamespace;
}

const ALLOWED_ORIGINS = ["https://oqim.pages.dev", "https://master.oqim.pages.dev", "http://localhost:5173"];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".oqim.pages.dev") || url.hostname === "oqim.pages.dev";
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://oqim-server.yigitcha-9493.workers.dev;",
};

function baseHeaders(origin: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(origin),
    ...SECURITY_HEADERS,
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: baseHeaders(origin),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

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
        if (res.ok) return json({ ok: true, code, hostToken, playerId: 0 }, 200, origin);
      }
      return json({ ok: false, error: "Kod generatsiya qilib bo'lmadi — qayta urining" }, 500, origin);
    }

    // /api/rooms/:code, /api/rooms/:code/ws, /api/rooms/:code/results
    const m = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(\/ws|\/results)?$/);
    if (m) {
      const code = m[1];
      const suffix = m[2];
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      if (suffix === "/ws") {
        if (request.headers.get("Upgrade") !== "websocket") return json({ ok: false, error: "WebSocket kutilgan edi" }, 426, origin);
        return stub.fetch(request);
      }
      if (suffix === "/results" && request.method !== "GET") return json({ ok: false, error: "Faqat GET" }, 405, origin);
      if (!suffix && request.method !== "GET") return json({ ok: false, error: "Faqat GET" }, 405, origin);
      const res = await stub.fetch(request);
      return new Response(res.body, { status: res.status, headers: baseHeaders(origin) });
    }

    // GET /api/leaderboard — global o'yin natijalari (#5)
    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      try {
        const entries = await getLeaderboard(env, 50);
        return json({ ok: true, entries }, 200, origin);
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : "Leaderboard olishda xato" }, 500, origin);
      }
    }

    if (url.pathname === "/api/health") return json({ ok: true, service: "oqim-server", version: 19 }, 200, origin);
    return json({ ok: false, error: "Topilmadi" }, 404, origin);
  },
};
