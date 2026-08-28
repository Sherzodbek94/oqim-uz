/**
 * Audit log — muhim auth va admin hodisalarini KV'da saqlash.
 * Har bir hodisa uchun alohyc kalit ishlatiladi, chunki KV'da qiymat
 * yangilash overwriting keltirib chiqaradi.
 */

export interface AuditEnv {
  OQIM_USERS: KVNamespace;
}

export type AuditEvent =
  | { type: "register"; email: string; success: boolean; error?: string }
  | { type: "login"; email: string; success: boolean; error?: string }
  | { type: "ban"; admin: string; target: string; banned: boolean }
  | { type: "sync"; email: string; success: boolean };

function getIP(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

export async function logAudit(env: AuditEnv, request: Request | null, event: AuditEvent): Promise<void> {
  try {
    const entry = {
      ...event,
      ip: request ? getIP(request) : "server",
      ts: Date.now(),
    };
    const id = crypto.randomUUID();
    await env.OQIM_USERS.put(`audit:${event.type}:${id}`, JSON.stringify(entry), {
      expirationTtl: 30 * 24 * 60 * 60, // 30 kun
    });
  } catch {
    /* log failures should not break request */
  }
}
