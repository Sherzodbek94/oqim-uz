import { GameRoom } from "./GameRoom";
import { UserAccount } from "./UserAccount";
import { RateLimiter, checkRoomsRateLimit } from "./rateLimit";
import { getLeaderboard, makeRoomCode, makeToken, type LeaderboardEnv } from "./game/online";
import { adminBan, adminListUsers, getMe, login, register, syncProfile, type AuthEnv } from "./auth";
import { baseHeaders, corsHeaders, HttpError, isAllowedOrigin, json, readJson } from "./http";
import { roomInput } from "./validation";
export { GameRoom, RateLimiter, UserAccount };
interface Env extends LeaderboardEnv, AuthEnv { GAME_ROOM: DurableObjectNamespace; }

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && !isAllowedOrigin(origin)) return json({ok: false, error: "Bu manzildan ulanishga ruxsat yo‘q"}, 403);
  if (request.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders(origin)});
  if (url.pathname === "/api/health") return json({ok: true, service: "oqim-server", version: 20}, 200, origin);
  if (request.method === "POST" && url.pathname === "/api/rooms") {
    const parsed = roomInput.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Ism, taymer va botlar sonini tekshiring");
    const limit = await checkRoomsRateLimit(env, request.headers.get("CF-Connecting-IP") || "unknown");
    if (!limit.ok) return new Response(JSON.stringify({ok: false, error: "Xona yaratish limiti tugadi. Biroz kuting."}),
      {status: 429, headers: {...baseHeaders(origin), "Retry-After": String(limit.retryAfter ?? 900)}});
    const {name: hostName, timerSec, bots} = parsed.data;
    for (let i = 0; i < 8; i++) {
      const code = makeRoomCode();
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
      const hostToken = makeToken();
      const res = await stub.fetch("https://do/init", {method: "POST",
        body: JSON.stringify({code, settings: {timerSec, bots}, hostName, hostToken})});
      if (res.ok) return json({ok: true, code, hostToken, playerId: 0}, 201, origin);
      if (res.status !== 409) throw new HttpError(503, "Xona yaratilmadi. Qayta urinib ko‘ring.");
    }
    throw new HttpError(503, "Bo‘sh xona kodi topilmadi. Qayta urinib ko‘ring.");
  }
  if (request.method === "POST" && ["/api/auth/register", "/api/auth/login", "/api/profile/sync", "/api/admin/ban"].includes(url.pathname)) {
    const body = await readJson(request);
    if (url.pathname === "/api/auth/register") return register(request, env, body, origin);
    if (url.pathname === "/api/auth/login") return login(request, env, body, origin);
    if (url.pathname === "/api/admin/ban") return adminBan(env, request.headers.get("Authorization"), body, origin);
    return syncProfile(env, request.headers.get("Authorization"), body, origin);
  }
  if (request.method === "GET" && url.pathname === "/api/auth/me") return getMe(env, request.headers.get("Authorization"), origin);
  if (request.method === "GET" && url.pathname === "/api/admin/users") return adminListUsers(env, request.headers.get("Authorization"), origin, url.searchParams.get("cursor") ?? undefined);
  const m = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(\/ws|\/results)?$/);
  if (m) {
    if (request.method !== "GET") throw new HttpError(405, "Faqat GET ruxsat etilgan");
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(m[1]));
    if (m[2] === "/ws") {
      if (!origin || !isAllowedOrigin(origin)) throw new HttpError(403, "Ulanish manzilini tekshiring");
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") throw new HttpError(426, "WebSocket kerak");
      return stub.fetch(request);
    }
    const res = await stub.fetch(request);
    return new Response(res.body, {status: res.status, headers: baseHeaders(origin)});
  }
  if (request.method === "GET" && url.pathname === "/api/leaderboard")
    return json({ok: true, entries: await getLeaderboard(env, 50)}, 200, origin);
  return json({ok: false, error: "Topilmadi"}, 404, origin);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const started = Date.now(); const requestId = crypto.randomUUID();
    try { return await route(request, env); }
    catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      console.error(JSON.stringify({event: "request_failed", requestId, status, durationMs: Date.now() - started}));
      return json({ok: false, error: error instanceof HttpError ? error.message : "Serverda xatolik. Keyinroq urinib ko‘ring.", requestId},
        status, request.headers.get("Origin"));
    }
  },
};
