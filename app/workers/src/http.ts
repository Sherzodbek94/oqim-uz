/** One HTTP policy for auth, rooms and WebSocket handshakes. */
const ORIGINS = new Set([
  "https://oqim.pages.dev", "https://master.oqim.pages.dev",
  "https://oqim-uz-game.yigitcha-9493.chatgpt.site",
  "http://localhost:3000", "http://localhost:5173", "http://localhost:4173",
]);
export function isAllowedOrigin(origin: string): boolean {
  if (ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && !url.port && url.hostname.endsWith(".oqim.pages.dev");
  } catch { return false; }
}
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin && isAllowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "600", "Vary": "Origin",
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin", "Cache-Control": "no-store",
  };
}
export function baseHeaders(origin: string | null): Record<string, string> {
  return { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) };
}
export function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), { status, headers: baseHeaders(origin) });
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json"))
    throw new HttpError(415, "JSON formatidagi ma’lumot yuboring");
  const limit = 512 * 1024;
  if (Number(request.headers.get("Content-Length")) > limit) throw new HttpError(413, "Ma’lumot hajmi juda katta");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Ma’lumot yuborilmadi");
  const parts: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new HttpError(413, "Ma’lumot hajmi juda katta"); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, "JSON formati noto‘g‘ri"); }
}
