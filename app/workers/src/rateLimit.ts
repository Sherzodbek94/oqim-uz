/**
 * Oddiy KV asosida rate limiting.
 * Har bir IP uchun 15 daqiqalik oynada cheklangan so'rovlar soni.
 * Eslatma: KV eventuali consistency ga ega, shuning juda yuqori yukda
 * aniq emas. Production'da Cloudflare Rate Limiting qoidalari yoki
 * Durable Objects bilan global qat'iy limiter afzal.
 */

export interface RateLimitEnv {
  OQIM_USERS: KVNamespace;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 daqiqa
const MAX_ATTEMPTS = 10; // 15 daqiqada 10 ta auth urinish
const MAX_ROOMS = 10; // 15 daqiqada 10 ta xona yaratish

async function checkRateLimit(
  env: RateLimitEnv,
  k: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfter?: number }> {
  const now = Date.now();
  const raw = await env.OQIM_USERS.get(k);
  let data: { count: number; windowStart: number };

  if (raw) {
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      data = { count: 0, windowStart: now };
    }
  } else {
    data = { count: 0, windowStart: now };
  }

  if (now - data.windowStart > windowMs) {
    data = { count: 0, windowStart: now };
  }

  data.count += 1;

  // TTL ni qolgan vaqtga moslashtirish
  const ttlSeconds = Math.ceil((windowMs - (now - data.windowStart)) / 1000);
  await env.OQIM_USERS.put(k, JSON.stringify(data), { expirationTtl: Math.max(60, ttlSeconds) });

  if (data.count > maxAttempts) {
    const retryAfter = Math.ceil((data.windowStart + windowMs - now) / 1000);
    return { ok: false, retryAfter };
  }

  return { ok: true };
}

export async function checkAuthRateLimit(env: RateLimitEnv, ip: string): Promise<{ ok: boolean; retryAfter?: number }> {
  return checkRateLimit(env, `ratelimit:auth:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
}

export async function checkRoomsRateLimit(env: RateLimitEnv, ip: string): Promise<{ ok: boolean; retryAfter?: number }> {
  return checkRateLimit(env, `ratelimit:rooms:${ip}`, MAX_ROOMS, WINDOW_MS);
}
