/**
 * OQIM: Startap Imperiyasi — saqlash (localStorage, ro'yxatdan o'tishsiz).
 * Kalit: oqim-startup-v1. Klassik o'yin saqlanmasiga (oqim-save-v1) tegilmaydi.
 */
import type { StartupState } from "./types";
import { STARTUP_SAVE_KEY, STARTUP_VERSION } from "./types";

export function loadStartup(): StartupState | null {
  try {
    const raw = localStorage.getItem(STARTUP_SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StartupState;
    if (s.version !== STARTUP_VERSION) return null;
    if (!Number.isFinite(s.cash) || !Number.isInteger(s.month) || s.month < 1) return null;
    if (!Array.isArray(s.staff) || !Array.isArray(s.reports) || !Array.isArray(s.loans)) return null;
    if (!["decide", "event", "report", "won", "lost"].includes(s.phase)) return null;
    if (s.phase === "event" && !s.pendingEvent) s.phase = "decide";
    return s;
  } catch {
    return null;
  }
}

export function saveStartup(s: StartupState): void {
  try {
    localStorage.setItem(STARTUP_SAVE_KEY, JSON.stringify(s));
  } catch {
    /* storage to'la — keyingi safar */
  }
}

export function clearStartup(): void {
  try { localStorage.removeItem(STARTUP_SAVE_KEY); } catch { /* noop */ }
}
