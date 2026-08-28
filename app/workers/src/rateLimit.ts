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

function key(ip: string): string {
  return `ratelimit:auth:${ip}`;
}

export async function checkAuthRateLimit(env: RateLimitEnv, ip: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const k = key(ip);
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

  if (now - data.windowStart > WINDOW_MS) {
    data = { count: 0, windowStart: now };
  }

  data.count += 1;

  // TTL ni qolgan vaqtga moslashtirish
  const ttlSeconds = Math.ceil((WINDOW_MS - (now - data.windowStart)) / 1000);
  await env.OQIM_USERS.put(k, JSON.stringify(data), { expirationTtl: Math.max(60, ttlSeconds) });

  if (data.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((data.windowStart + WINDOW_MS - now) / 1000);
    return { ok: false, retryAfter };
  }

  return { ok: true };
}
