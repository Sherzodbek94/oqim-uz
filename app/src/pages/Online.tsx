/**
 * OQIM v19 — 🌐 Onlayn multiplayer sahifasi (/onlayn).
 * 3 holat: kirish (xona yaratish / kod bilan kirish) → lobby → o'yin.
 * Server: Cloudflare Workers + Durable Objects (workers/ papka, DEPLOY.md).
 * Server o'chiq bo'lsa lokal o'yin (/game) avvalgidek ishlayveradi.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Copy, Crown, Globe, Loader2, LogIn, Play, Users, Wifi, WifiOff } from "lucide-react";
import {
  OnlineClient,
  createRoom,
  savedName,
  savedToken,
  saveName,
  type PublicState,
  type ServerMsg,
} from "@/lib/net/client";
import { CELL_CAPTIONS, CELL_COLORS, RAT_CELLS } from "@/lib/game/types";
import { formatUZSCompact } from "@/lib/format";

type Screen = "entry" | "room";

const PLAYER_COLORS = ["#2E7D5F", "#41788F", "#D9A441", "#C24E4E"];

const inputCls =
  "mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-ink-900 outline-none transition-colors focus:border-emerald-600";

export default function Online() {
  const [screen, setScreen] = useState<Screen>("entry");
  const [name, setName] = useState(savedName());
  const [codeInput, setCodeInput] = useState("");
  const [timerSec, setTimerSec] = useState<60 | 120>(60);
  const [bots, setBots] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [state, setState] = useState<PublicState | null>(null);
  const [connected, setConnected] = useState(false);
  const [winner, setWinner] = useState<number | null | "none">(null);
  const clientRef = useRef<OnlineClient | null>(null);
  const codeRef = useRef<string>("");

  useEffect(() => () => clientRef.current?.close(), []);

  const openRoom = (code: string, token: string | null) => {
    codeRef.current = code;
    setError(null);
    setState(null);
    setWinner(null);
    const client = new OnlineClient(code, name.trim() || "O'yinchi", token);
    clientRef.current = client;
    client.on((msg: ServerMsg) => {
      if (msg.t === "state") setState(msg.state);
      else if (msg.t === "error") setError(msg.error);
      else if (msg.t === "end") setWinner(msg.winnerId ?? "none");
      else if (msg.t === "pong") setConnected(true);
    });
    client.connect();
    setScreen("room");
  };

  const onCreate = async () => {
    if (!name.trim()) return setError("Ismingizni yozing");
    saveName(name.trim());
    setBusy(true);
    setError(null);
    try {
      const r = await createRoom(name.trim(), timerSec, bots);
      if (!r.ok || !r.code || !r.hostToken) throw new Error(r.error || "Server javob bermadi");
      openRoom(r.code, r.hostToken);
    } catch (e) {
      setError(
        `Serverga ulanib bo'lmadi: ${e instanceof Error ? e.message : "xato"}. Server hali deploy qilinmagan bo'lishi mumkin (workers/DEPLOY.md).`
      );
    } finally {
      setBusy(false);
    }
  };

  const onJoin = () => {
    const code = codeInput.trim().toUpperCase();
    if (!name.trim()) return setError("Ismingizni yozing");
    if (code.length !== 6) return setError("Xona kodi 6 belgidan iborat");
    saveName(name.trim());
    openRoom(code, savedToken(code));
  };

  const me = state?.you ?? null;
  const game = state?.game ?? null;
  const myTurn = state?.phase === "playing" && me !== null && state.awaiting === me;
  const pending = state?.pending ?? null;
  const deadlineLeft = useCountdown(state?.deadline ?? null, myTurn);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard yo'q */
    }
  };

  if (screen === "entry") {
    return (
      <div className="min-h-screen bg-gradient-hero px-4 py-10 text-ink-900">
        <div className="mx-auto max-w-md">
          <Link to="/" className="text-body-sm text-ink-600 hover:text-emerald-700">← Bosh sahifa</Link>
          <h1 className="mt-4 flex items-center gap-2 text-h2 font-bold">
            <Globe className="h-7 w-7 text-emerald-700" /> Onlayn o'yin
          </h1>
          <p className="mt-2 text-body-sm text-ink-600">
            4 kishigacha bitta xonada — klassik doska, navbat taymeri, botlar. Rat Race'dan birinchi qochgan g'olib!
          </p>

          <label className="mt-6 block text-body-sm font-semibold">Ismingiz</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="Masalan: Dilnoza"
            className={inputCls}
          />

          <div className="card mt-6 !p-5">
            <h2 className="font-bold">Yangi xona yaratish</h2>
            <div className="mt-3 flex items-center justify-between gap-2 text-body-sm">
              <span>Navbat taymeri</span>
              <div className="flex gap-2">
                {([60, 120] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTimerSec(s)}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      timerSec === s ? "bg-emerald-700 text-white" : "bg-sand-100 text-ink-600 hover:bg-sand-200"
                    }`}
                  >
                    {s} sek
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-body-sm">
              <span>Botlar soni</span>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBots(n)}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      bots === n ? "bg-emerald-700 text-white" : "bg-sand-100 text-ink-600 hover:bg-sand-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={onCreate} disabled={busy} className="btn-primary mt-4 w-full">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Xona yaratish
            </button>
          </div>

          <div className="card mt-4 !p-5">
            <h2 className="font-bold">Kod bilan kirish</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6))}
                placeholder="ABC234"
                className={`${inputCls} !mt-0 text-center font-mono text-lg font-bold tracking-[0.3em]`}
              />
              <button onClick={onJoin} className="btn-secondary !px-5">
                <LogIn className="h-5 w-5" /> Kirish
              </button>
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl bg-clay-100 px-4 py-3 text-body-sm text-clay-600">{error}</p>}
        </div>
      </div>
    );
  }

  // ---- ROOM (lobby + o'yin) ----
  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-6 text-ink-900">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-h3 font-bold">
              Xona <span className="font-mono tracking-[0.25em] text-emerald-700">{codeRef.current}</span>
            </h1>
            <button onClick={copyCode} className="btn-secondary !px-3 !py-1.5 text-body-sm">
              <Copy className="h-4 w-4" /> {copied ? "Nusxalandi!" : "Kod"}
            </button>
          </div>
          <span className={`flex items-center gap-1.5 text-body-sm ${connected ? "text-emerald-700" : "text-clay-600"}`}>
            {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connected ? "Ulangan" : "Qayta ulanmoqda..."}
          </span>
        </div>

        {error && <p className="mt-3 rounded-xl bg-clay-100 px-4 py-2 text-body-sm text-clay-600">{error}</p>}

        {/* LOBBY */}
        {state?.phase === "lobby" && (
          <div className="card mt-6">
            <h2 className="flex items-center gap-2 font-bold">
              <Users className="h-5 w-5" /> Lobby ({state.players.length}/4)
            </h2>
            <ul className="mt-3 space-y-2">
              {state.players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-sand-100 px-4 py-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: PLAYER_COLORS[p.id % 4] }} />
                  <span className="font-semibold">{p.name}</span>
                  {p.id === 0 && <Crown className="h-4 w-4 text-gold-600" />}
                  {p.id === state.you && <span className="text-body-sm text-emerald-700">(siz)</span>}
                  <span className={`ml-auto text-body-sm ${p.connected ? "text-emerald-700" : "text-ink-400"}`}>
                    {p.connected ? "onlayn" : "kutilmoqda"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-body-sm text-ink-600">
              Taymer: {state.settings.timerSec} sek · Botlar: {state.settings.bots} · Rejim: klassik doska
            </p>
            {state.isHost ? (
              <button onClick={() => clientRef.current?.start()} className="btn-primary mt-4 w-full">
                <Play className="h-5 w-5" /> O'yinni boshlash
              </button>
            ) : (
              <p className="mt-4 text-center text-body-sm text-ink-600">Xost o'yinni boshlashini kuting...</p>
            )}
          </div>
        )}

        {/* O'YIN */}
        {game && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
            <div>
              {/* Mini doska — 30 katak, 6 ustun */}
              <div className="grid grid-cols-6 gap-1.5">
                {RAT_CELLS.map((cell, i) => {
                  const here = game.players.filter((p) => !p.bankrupt && p.position === i);
                  return (
                    <div
                      key={i}
                      className={`flex min-h-[54px] flex-col items-center justify-center rounded-lg border px-1 py-1 text-center ${
                        i === 0 ? "border-gold-500" : "border-sand-200"
                      }`}
                      style={{ background: `${CELL_COLORS[cell]}18` }}
                      title={CELL_CAPTIONS[cell]}
                    >
                      <span className="text-[10px] leading-tight text-ink-600">{i === 0 ? "💰 Oy kun" : CELL_CAPTIONS[cell]}</span>
                      <span className="mt-0.5 flex gap-0.5">
                        {here.map((p) => (
                          <span
                            key={p.id}
                            className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${
                              game.current === p.id ? "animate-pulse border-ink-900" : "border-white"
                            }`}
                            style={{ background: PLAYER_COLORS[p.id % 4] }}
                            title={p.name}
                          />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Harakat paneli */}
              <div className="card mt-4 !p-4">
                {state?.phase === "finished" ? (
                  <div className="text-center">
                    <p className="text-h3 font-bold text-gold-600">
                      {winner === "none" || winner === null
                        ? "O'yin tugadi"
                        : `🏆 ${game.players.find((p) => p.id === winner)?.name} g'olib!`}
                    </p>
                    <Link to="/" className="btn-secondary mt-4">Bosh sahifa</Link>
                  </div>
                ) : myTurn ? (
                  <div>
                    <p className="flex items-center justify-between font-bold text-emerald-700">
                      Sizning navbatingiz
                      {deadlineLeft !== null && (
                        <span className={`text-body-sm ${deadlineLeft <= 10 ? "text-clay-600" : "text-ink-400"}`}>⏱ {deadlineLeft}s</span>
                      )}
                    </p>
                    {!pending && (
                      <button onClick={() => clientRef.current?.action({ kind: "roll" })} className="btn-primary mt-3 w-full">
                        🎲 Zar tashlash
                      </button>
                    )}
                    {pending?.kind === "deal-size" && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button onClick={() => clientRef.current?.action({ kind: "deal-size", size: "small" })} className="btn-primary">Kichik bitim</button>
                        <button onClick={() => clientRef.current?.action({ kind: "deal-size", size: "big" })} className="btn-primary">Katta bitim</button>
                        <button onClick={() => clientRef.current?.action({ kind: "pass" })} className="btn-secondary">O'tkazish</button>
                      </div>
                    )}
                    {pending?.kind === "deal" && (
                      <div className="mt-3 rounded-xl bg-sand-100 p-4">
                        <p className="font-bold">{pending.card.icon} {pending.card.title}</p>
                        <p className="mt-1 text-body-sm text-ink-600">{pending.card.note}</p>
                        <p className="mt-2 text-body-sm">
                          Narx: <b className="font-money">{formatUZSCompact(pending.card.price)}</b> · Boshlang'ich:{" "}
                          <b className="font-money">{formatUZSCompact(pending.card.down)}</b> · Oylik:{" "}
                          <b className="font-money text-emerald-700">+{formatUZSCompact(pending.card.cashflow)}</b>
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => clientRef.current?.action({ kind: "buy" })} className="btn-primary">Sotib olish</button>
                          <button onClick={() => clientRef.current?.action({ kind: "pass" })} className="btn-secondary">Voz kechish</button>
                        </div>
                      </div>
                    )}
                    {pending?.kind === "market" && me !== null && (
                      <div className="mt-3 rounded-xl bg-sand-100 p-4">
                        <p className="font-bold">{pending.card.icon} Bozor taklifi — "{pending.card.kind}" ×{pending.card.factor}</p>
                        <div className="mt-2 space-y-2">
                          {game.players[me].assets
                            .filter((a) => pending.kind === "market" && pending.assetIds.includes(a.id))
                            .map((a) => (
                              <button
                                key={a.id}
                                onClick={() => clientRef.current?.action({ kind: "sell", assetId: a.id })}
                                className="btn-primary w-full"
                              >
                                Sotish: {a.icon} {a.title} (~{formatUZSCompact(Math.round(a.price * pending.card.factor))})
                              </button>
                            ))}
                          <button onClick={() => clientRef.current?.action({ kind: "pass" })} className="btn-secondary w-full">Voz kechish</button>
                        </div>
                      </div>
                    )}
                    {pending?.kind === "charity" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={() => clientRef.current?.action({ kind: "charity", accept: true })} className="btn-primary">
                          ❤️ Xayriya (10%) — 2 zar
                        </button>
                        <button onClick={() => clientRef.current?.action({ kind: "charity", accept: false })} className="btn-secondary">Voz kechish</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-body-sm text-ink-600">
                    Navbat: <b className="text-ink-900">{game.players[game.current]?.name}</b>
                    {game.players[game.current]?.isBot && " 🤖"} — kutilmoqda...
                  </p>
                )}
              </div>

              {/* Log */}
              <div className="card mt-4 !p-4">
                <h3 className="text-body-sm font-bold text-ink-600">Jurnal</h3>
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-body-sm">
                  {game.log.map((l) => (
                    <li
                      key={l.id}
                      className={
                        l.tone === "gold" ? "text-gold-600" : l.tone === "good" ? "text-emerald-700" : l.tone === "bad" ? "text-clay-600" : "text-ink-600"
                      }
                    >
                      {l.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* O'yinchilar paneli */}
            <div className="space-y-2">
              <p className="text-body-sm text-ink-600">
                {game.round}-raund · {game.month}-oy · Zar: {game.dice[0]}
                {game.diceCount === 2 ? ` + ${game.dice[1]}` : ""}
              </p>
              {game.players.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-3 shadow-card ${
                    game.current === p.id && state?.phase === "playing" ? "border-emerald-600 bg-emerald-50" : "border-sand-200 bg-white"
                  } ${p.bankrupt ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: PLAYER_COLORS[p.id % 4] }} />
                    <b>{p.name}</b>
                    {p.isBot && <span title="bot">🤖</span>}
                    {p.bankrupt && <span>💥</span>}
                    {p.escaped && <span>🏆</span>}
                    {p.id === me && <span className="text-body-sm text-emerald-700">(siz)</span>}
                    <span className={`ml-auto font-money font-bold ${p.cash < 0 ? "text-clay-600" : "text-emerald-700"}`}>
                      {formatUZSCompact(p.cash)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-400">
                    Maosh {formatUZSCompact(p.salary)} · Aktivlar {p.assets.length} · Kredit {p.loansCount}
                    {p.children > 0 && ` · 👶${p.children}`}
                    {p.charityTurns > 0 && " · ❤️2 zar"}
                    {p.skipTurns > 0 && ` · ⏸${p.skipTurns}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Har soniyada qolgan vaqtni qaytaradi (faqat faol navbatda). */
function useCountdown(deadline: number | null, active: boolean): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline || !active) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, active]);
  return useMemo(() => left, [left]);
}
