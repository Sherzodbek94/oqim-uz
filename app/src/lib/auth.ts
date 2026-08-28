/**
 * OQIM — real email/parol autentifikatsiyasi (frontend).
 * Server: Cloudflare Workers + KV (app/workers/src/auth.ts).
 */
import { OQIM_SERVER } from "./net/client";

const AUTH_TOKEN_KEY = "oqim-auth-token";
const AUTH_USER_KEY = "oqim-auth-user";

export interface AuthUser {
  email: string;
  name: string;
  role?: "user" | "admin";
  profile: {
    games: unknown[];
    lessons: string[];
  };
}

interface AuthResponse {
  ok: boolean;
  error?: string;
  token?: string;
  user?: AuthUser;
}

function save(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function updateStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

async function post<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${OQIM_SERVER}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${OQIM_SERVER}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as T;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    const data = await post<AuthResponse>("/api/auth/register", { email, password, name });
    if (data.ok && data.token && data.user) save(data.token, data.user);
    return data;
  } catch {
    return { ok: false, error: "Serverga ulanib bo'lmadi" };
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const data = await post<AuthResponse>("/api/auth/login", { email, password });
    if (data.ok && data.token && data.user) save(data.token, data.user);
    return data;
  } catch {
    return { ok: false, error: "Serverga ulanib bo'lmadi" };
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await get<{ ok: boolean; user?: AuthUser; error?: string }>("/api/auth/me", token);
    if (data.ok && data.user) {
      updateStoredUser(data.user);
      return data.user;
    }
    if (data.error?.includes("token") || data.error?.includes("yaroqsiz")) {
      logout();
    }
    return null;
  } catch {
    return getAuthUser();
  }
}

export async function syncCloudProfile(profile: { games: unknown[]; lessons: string[] }): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const data = await post<{ ok: boolean; error?: string }>("/api/auth/sync", { profile }, token);
    return data.ok;
  } catch {
    return false;
  }
}

export interface AdminUser {
  email: string;
  name: string;
  role: string;
  banned: boolean;
  createdAt: number;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const token = getToken();
  if (!token) return [];
  try {
    const data = await get<{ ok: boolean; users?: AdminUser[] }>("/api/admin/users", token);
    return data.ok && Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

export async function adminBan(email: string, banned: boolean): Promise<{ ok: boolean; error?: string }> {
  const token = getToken();
  if (!token) return { ok: false, error: "Avtorizatsiya kerak" };
  try {
    const data = await post<{ ok: boolean; error?: string }>("/api/admin/ban", { email, banned }, token);
    return data;
  } catch {
    return { ok: false, error: "Serverga ulanib bo'lmadi" };
  }
}
