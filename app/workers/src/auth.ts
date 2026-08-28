/**
 * OQIM — sodda email/parol autentifikatsiyasi (Cloudflare KV + Web Crypto).
 * JWT HS256, parol hash PBKDF2. Maqsad: profil ma'lumotlarini bulutga sinxronlash.
 */
import { checkAuthRateLimit, type RateLimitEnv } from "./rateLimit";

export interface User {
  email: string;
  name: string;
  passwordHash: string; // base64
  salt: string; // base64
  profile: {
    games: unknown[];
    lessons: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface AuthEnv extends RateLimitEnv {
  JWT_SECRET: string;
}

const USER_PREFIX = "user:";
const TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun
const MAX_EMAIL_LEN = 128;
const MAX_NAME_LEN = 32;
const MAX_PASSWORD_LEN = 128;

/* ---------------- Web Crypto yordamchilari ---------------- */

function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64decode(s: string): ArrayBuffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function pbkdf2(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, hash: "SHA-256", iterations: 100_000 },
    key,
    256
  );
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const raw = key instanceof ArrayBuffer ? key : (key.buffer as ArrayBuffer);
  const cryptoKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encode(data));
}

/* ---------------- JWT (HS256) ---------------- */

interface JwtPayload {
  sub: string; // email
  name: string;
  iat: number;
  exp: number;
}

async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const head = b64encode(encode(JSON.stringify(header)));
  const body = b64encode(encode(JSON.stringify(payload)));
  const sig = b64encode(await hmac(encode(secret), `${head}.${body}`));
  return `${head}.${body}.${sig}`;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expectedSig = b64encode(await hmac(encode(secret), `${head}.${body}`));
  if (sig !== expectedSig) return null;
  try {
    const decoded = new TextDecoder().decode(b64decode(body));
    const payload = JSON.parse(decoded) as JwtPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------------- Foydalanuvchi CRUD ---------------- */

async function getUser(env: AuthEnv, email: string): Promise<User | null> {
  const raw = await env.OQIM_USERS.get(`${USER_PREFIX}${email.toLowerCase()}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

async function putUser(env: AuthEnv, user: User): Promise<void> {
  await env.OQIM_USERS.put(`${USER_PREFIX}${user.email.toLowerCase()}`, JSON.stringify(user));
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateInput(email: string, password: string, name?: string): string | null {
  if (!email || email.length > MAX_EMAIL_LEN) return "Email noto'g'ri";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email noto'g'ri";
  if (!password || password.length < 6 || password.length > MAX_PASSWORD_LEN) {
    return "Parol 6 dan 128 gacha belgidan iborat bo'lishi kerak";
  }
  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > MAX_NAME_LEN) return "Ism 2 dan 32 gacha belgidan iborat bo'lishi kerak";
  }
  return null;
}

/* ---------------- Umumiy javoblar ---------------- */

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

const ALLOWED_ORIGINS = ["https://oqim.pages.dev", "https://master.oqim.pages.dev", "http://localhost:5173"];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

/* ---------------- Tashqi API ---------------- */

export interface AuthResponse {
  ok: boolean;
  error?: string;
  token?: string;
  user?: { email: string; name: string; profile: User["profile"] };
}

function getClientIP(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

export async function register(
  request: Request,
  env: AuthEnv,
  body: { email?: string; password?: string; name?: string },
  origin: string | null = null
): Promise<Response> {
  const limit = await checkAuthRateLimit(env, getClientIP(request));
  if (!limit.ok) {
    return json({ ok: false, error: "Juda ko'p urinish. Iltimos, biroz kuting." }, 429, origin);
  }

  const email = sanitizeEmail(body.email || "");
  const password = body.password || "";
  const name = (body.name || "O'yinchi").trim();

  const validation = validateInput(email, password, name);
  if (validation) return json({ ok: false, error: validation }, 400, origin);

  const existing = await getUser(env, email);
  if (existing) return json({ ok: false, error: "Bu email bilan ro'yxatdan o'tilgan" }, 409, origin);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt.buffer);

  const user: User = {
    email,
    name,
    passwordHash: b64encode(hash),
    salt: b64encode(salt.buffer),
    profile: { games: [], lessons: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await putUser(env, user);

  const token = await signJwt(
    { sub: email, name, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRES_MS },
    env.JWT_SECRET
  );

  return json({ ok: true, token, user: { email, name, profile: user.profile } }, 200, origin);
}

export async function login(
  request: Request,
  env: AuthEnv,
  body: { email?: string; password?: string },
  origin: string | null = null
): Promise<Response> {
  const limit = await checkAuthRateLimit(env, getClientIP(request));
  if (!limit.ok) {
    return json({ ok: false, error: "Juda ko'p urinish. Iltimos, biroz kuting." }, 429, origin);
  }

  const email = sanitizeEmail(body.email || "");
  const password = body.password || "";

  if (!email || !password) return json({ ok: false, error: "Email va parolni kiriting" }, 400, origin);

  const user = await getUser(env, email);
  if (!user) return json({ ok: false, error: "Email yoki parol noto'g'ri" }, 401, origin);

  const hash = await pbkdf2(password, b64decode(user.salt));
  if (b64encode(hash) !== user.passwordHash) {
    return json({ ok: false, error: "Email yoki parol noto'g'ri" }, 401, origin);
  }

  const token = await signJwt(
    { sub: email, name: user.name, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRES_MS },
    env.JWT_SECRET
  );

  return json({ ok: true, token, user: { email, name: user.name, profile: user.profile } }, 200, origin);
}

export async function getMe(env: AuthEnv, authHeader: string | null, origin: string | null = null): Promise<Response> {
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Avtorizatsiya kerak" }, 401, origin);
  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) return json({ ok: false, error: "Token yaroqsiz" }, 401, origin);

  const user = await getUser(env, payload.sub);
  if (!user) return json({ ok: false, error: "Foydalanuvchi topilmadi" }, 404, origin);

  return json({ ok: true, user: { email: user.email, name: user.name, profile: user.profile } }, 200, origin);
}

export async function syncProfile(
  env: AuthEnv,
  authHeader: string | null,
  body: { profile?: Partial<User["profile"]> },
  origin: string | null = null
): Promise<Response> {
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Avtorizatsiya kerak" }, 401, origin);
  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) return json({ ok: false, error: "Token yaroqsiz" }, 401, origin);

  const user = await getUser(env, payload.sub);
  if (!user) return json({ ok: false, error: "Foydalanuvchi topilmadi" }, 404, origin);

  if (body.profile) {
    if (Array.isArray(body.profile.games)) user.profile.games = body.profile.games.slice(0, 5000);
    if (Array.isArray(body.profile.lessons)) user.profile.lessons = body.profile.lessons.slice(0, 100);
  }
  user.updatedAt = Date.now();
  await putUser(env, user);

  return json({ ok: true, user: { email: user.email, name: user.name, profile: user.profile } }, 200, origin);
}
