import { HttpError } from "./http";
export interface RateLimitEnv { OQIM_USERS: KVNamespace; RATE_LIMITER: DurableObjectNamespace; }
type Limit = {ok: boolean; retryAfter?: number};
const WINDOW = 15 * 60 * 1000;
/** One strongly consistent Durable Object per hashed IP and operation. */
export class RateLimiter {
  constructor(private ctx: DurableObjectState) {}
  async fetch(): Promise<Response> {
    const now = Date.now();
    const result = await this.ctx.storage.transaction(async tx => {
      let bucket = await tx.get<{count: number; until: number}>("bucket");
      if (!bucket || bucket.until <= now) bucket = {count: 0, until: now + WINDOW};
      if (bucket.count >= 10) return {ok: false, retryAfter: Math.ceil((bucket.until - now) / 1000)};
      bucket.count++;
      await tx.put("bucket", bucket);
      await tx.setAlarm(bucket.until);
      return {ok: true};
    });
    return Response.json(result);
  }
  async alarm(): Promise<void> { await this.ctx.storage.delete("bucket"); }
}
async function check(env: RateLimitEnv, operation: string, ip: string): Promise<Limit> {
  if (!env.RATE_LIMITER) throw new HttpError(503, "Server himoyasi sozlanmoqda. Keyinroq urinib ko‘ring.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(operation + ":" + ip));
  const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const response = await env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(key)).fetch("https://limit/check");
  if (!response.ok) throw new HttpError(503, "So‘rovni tekshirish imkoni bo‘lmadi");
  return response.json<Limit>();
}
export const checkAuthRateLimit = (env: RateLimitEnv, ip: string) => check(env, "auth", ip);
export const checkRoomsRateLimit = (env: RateLimitEnv, ip: string) => check(env, "rooms", ip);
