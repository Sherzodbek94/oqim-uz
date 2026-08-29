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

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

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

    // /api/rooms/:code, /api/rooms/:code/ws, /api/rooms/:code/results
    const m = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(\/ws|\/results)?$/);
    if (m) {
      const code = m[1];
      const suffix = m[2];
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      if (suffix === "/ws") {
        if (request.headers.get("Upgrade") !== "websocket") return json({ ok: false, error: "WebSocket kutilgan edi" }, 426);
        return stub.fetch(request);
      }
      if (suffix === "/results" && request.method !== "GET") return json({ ok: false, error: "Faqat GET" }, 405);
      if (!suffix && request.method !== "GET") return json({ ok: false, error: "Faqat GET" }, 405);
      const res = await stub.fetch(request);
      return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } });
    }

    // GET /api/leaderboard — global o'yin natijalari (#5)
    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      try {
        const entries = await getLeaderboard(env, 50);
        return json({ ok: true, entries });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : "Leaderboard olishda xato" }, 500);
      }
    }

    if (url.pathname === "/api/health") return json({ ok: true, service: "oqim-server", version: 19 });
    return json({ ok: false, error: "Topilmadi" }, 404);
  },
};
