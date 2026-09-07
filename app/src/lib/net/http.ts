/** Bounded requests: never leave the UI waiting forever or surface raw HTML. */
export async function requestJson<T extends {ok: boolean; error?: string}>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {...init, signal: controller.signal});
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('ok' in body) || typeof body.ok !== 'boolean'
      || ('error' in body && body.error !== undefined && typeof body.error !== 'string'))
      return {ok: false, error: 'Server javobi noto‘g‘ri. Qayta urinib ko‘ring.'} as T;
    if (!response.ok) {
      const safeError = 'error' in body && typeof body.error === 'string' && body.error.length <= 240 ? body.error : null;
      return {ok: false, error: response.status === 429 ? 'So‘rovlar ko‘payib ketdi. Biroz kuting.'
        : response.status < 500 && safeError ? safeError : 'So‘rov bajarilmadi. Qayta urinib ko‘ring.'} as T;
    }
    return body as T;
  } catch {
    return {ok: false, error: controller.signal.aborted ? 'Server javob bermadi. Qayta urinib ko‘ring.' : 'Serverga ulanib bo‘lmadi. Internetni tekshiring.'} as T;
  } finally { clearTimeout(timeout); }
}
