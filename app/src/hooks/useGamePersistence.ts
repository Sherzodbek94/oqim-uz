import { useCallback, useEffect, useRef, useState } from "react";
import { saveGame } from "@/lib/game/save";
import type { GameState } from "@/lib/game/types";

/** Coalesce writes and retain only resumable checkpoints, not halfway decisions. */
export function useGamePersistence(state: GameState | null, enabled: boolean) {
  const [status, setStatus] = useState<"saved" | "error" | "pending">("saved");
  const checkpoint = useRef<GameState | null>(null);
  const flush = useCallback(() => {
    if (!checkpoint.current) return;
    setStatus(saveGame(checkpoint.current) ? "saved" : "error");
  }, []);
  useEffect(() => {
    if (!enabled || !state || state.screen === "end") { checkpoint.current = null; return; }
    if (!["idle", "awaiting-end"].includes(state.phase)) return;
    checkpoint.current = state;
    const timer = setTimeout(flush, 250);
    return () => clearTimeout(timer);
  }, [state, enabled, flush]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      // Flush the last safe checkpoint on route change without updating React.
      if (checkpoint.current) saveGame(checkpoint.current);
    };
  }, [flush]);
  return {status, retry: flush};
}
