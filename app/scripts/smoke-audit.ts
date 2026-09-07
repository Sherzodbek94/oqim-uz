import assert from "node:assert/strict";
import { makePlayer, financeSummary, passiveIncome, recordFinanceStats } from "../src/lib/game/engine";
import { PROFESSIONS } from "../src/lib/game/data";
import { registration, profileInput, roomInput } from "../workers/src/validation";
import { readJson, HttpError, corsHeaders, isAllowedOrigin } from "../workers/src/http";
import { GameRoom } from "../workers/src/GameRoom";
import { createRoom, startGame, recordGlobalResult } from "../workers/src/game/online";
import { register, login, getMe, adminListUsers } from "../workers/src/auth";
import { RateLimiter } from "../workers/src/rateLimit";

const player = makePlayer(0, "Test", PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: "d1", quadrant: "E"});
player.ftCashflow = 1_000_000;
const before = JSON.stringify(player);
const report = financeSummary(player);
passiveIncome(player);
assert.equal(JSON.stringify(player), before, "Report selectors must not mutate a player");
assert.equal(report.net, report.totalIncome - report.expenses);
assert.equal(report.totalIncome, report.salary + report.passive + 1_000_000);
recordFinanceStats(player);
assert.ok(player.statMaxPassive >= 1_000_000);

assert.equal(registration.safeParse({email: 123, password: "long-password"}).success, false);
assert.equal(registration.safeParse({email: "a@example.com", password: "short"}).success, false);
assert.equal(registration.safeParse({email: "a@example.com", password: "long-password", role: "admin"}).success, false);
assert.equal(profileInput.safeParse({profile: {games: [{won: true, date: "invalid"}]}}).success, false);
assert.equal(roomInput.safeParse({name: "Ali", timerSec: 120, bots: 1}).success, true);
assert.equal(roomInput.safeParse({name: "Ali", timerSec: 120, bots: 99}).success, false);
assert.equal(isAllowedOrigin("https://oqim-uz-game.yigitcha-9493.chatgpt.site"), true);
assert.equal(isAllowedOrigin("https://evil.example"), false);
assert.match(corsHeaders("https://oqim.pages.dev")["Access-Control-Allow-Headers"], /Authorization/);
await assert.rejects(() => readJson(new Request("https://test", {method: "POST", headers: {"Content-Type": "application/json"}, body: "{"})), (error: unknown) => error instanceof HttpError && error.status === 400);
await assert.rejects(() => readJson(new Request("https://test", {method: "POST", headers: {"Content-Type": "application/json"}, body: "x".repeat(524289)})), (error: unknown) => error instanceof HttpError && error.status === 413);

const data = new Map<string, unknown>();
const storage = {get: async (key: string) => data.get(key), put: async (key: string, value: unknown) => {data.set(key, structuredClone(value));}, transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(storage)};
const durable = new GameRoom({storage} as never, {} as never);
const init = () => new Request("https://do/init", {method: "POST", body: JSON.stringify({code: "ABCDEF", settings: {timerSec: 60, bots: 1}, hostName: "Ali", hostToken: "original"})});
assert.equal((await durable.fetch(init())).status, 201);
assert.equal((await durable.fetch(init())).status, 409, "Existing rooms must not be overwritten");

const room = createRoom("ABCDEF", {timerSec: 60, bots: 1}, "Ali", "host");
assert.equal(startGame(room, "host").ok, true);
room.phase = "finished";
await assert.rejects(() => recordGlobalResult({OQIM_USERS: {put: async () => {throw new Error("KV offline");}}} as never, room));
assert.equal(Boolean(room.globalResultRecorded), false, "Failed result writes must be retryable");
const keys: string[] = [];
const env = {OQIM_USERS: {put: async (key: string) => {keys.push(key);}}} as never;
await recordGlobalResult(env, room);
room.globalResultRecorded = false; // Simulate restart before DO state was persisted.
await recordGlobalResult(env, room);
assert.equal(keys.length, 2);
assert.equal(keys[0], keys[1], "Retries must use the same idempotency key");

const users = new Map<string, string>();
const authEnv = {
  JWT_SECRET: "test-only-secret-32-bytes-minimum-please",
  ACCOUNT_REGISTRATION_ENABLED: 'true',
  ADMIN_EMAILS: "admin@example.com",
  OQIM_USERS: {get: async (key: string) => users.get(key) ?? null, put: async (key: string, value: string) => {users.set(key, value);}},
  USER_ACCOUNT: {idFromName: (email: string) => email, get: (email: string) => ({fetch: async (_url: string, init?: RequestInit) => {
    const key = `user:${email}`;
    const user = users.has(key) ? JSON.parse(users.get(key)!) : null;
    if (init?.method !== 'PUT') return Response.json({ok: true, user});
    const input = JSON.parse(init.body as string);
    if (input.expected !== (user?.revision ?? null)) return Response.json({ok: false}, {status: 409});
    const updated = {...input.user, revision: (user?.revision ?? 0) + 1};
    users.set(key, JSON.stringify(updated));
    return Response.json({ok: true, user: updated});
  }})},
  RATE_LIMITER: {idFromName: (name: string) => name, get: () => ({fetch: async () => Response.json({ok: true})})},
} as never;
const request = new Request("https://test/api/auth/register");
assert.equal((await register({...request} as Request, {ACCOUNT_REGISTRATION_ENABLED: 'false'} as never,
  {email: 'paused@example.com', password: 'test-password-long', name: 'Paused'})).status, 503,
  'Registration must stay closed until migration is verified');
const registered = await register(request, authEnv, {email: "admin@example.com", password: "test-password-long", name: "Test"});
assert.equal(registered.status, 200);
const registeredBody = await registered.json() as {token: string};
const storedUser = JSON.parse(users.get("user:admin@example.com")!);
assert.equal(storedUser.role, "user", "Allowlisted email must not self-provision admin");
assert.equal(storedUser.passwordIterations, 600_000);
assert.equal((await adminListUsers(authEnv, `Bearer ${registeredBody.token}`)).status, 403);
assert.equal((await getMe(authEnv, `Bearer ${registeredBody.token}`)).status, 200);
assert.equal((await login(request, authEnv, {email: 123, password: "test-password-long"})).status, 400);
assert.equal((await login(request, authEnv, {email: "admin@example.com", password: "incorrect-password"})).status, 401);
storedUser.sessionVersion = 1;
users.set("user:admin@example.com", JSON.stringify(storedUser));
assert.equal((await getMe(authEnv, `Bearer ${registeredBody.token}`)).status, 401, "Revoked sessions must fail");
const buckets = new Map<string, unknown>();
const limitStorage = {get: async (key: string) => buckets.get(key), put: async (key: string, value: unknown) => {buckets.set(key, value);}, setAlarm: async () => {}, transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(limitStorage)};
const limiter = new RateLimiter({storage: limitStorage} as never);
for (let i = 0; i < 10; i++) assert.equal((await (await limiter.fetch()).json() as {ok: boolean}).ok, true);
assert.equal((await (await limiter.fetch()).json() as {ok: boolean}).ok, false);
console.log("ALL AUDIT REGRESSIONS PASSED");
