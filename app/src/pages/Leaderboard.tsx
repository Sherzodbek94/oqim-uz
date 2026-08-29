import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Trophy, Users, Loader2, Crown } from "lucide-react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/net/client";
import { formatUZSCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((res) => {
        if (cancelled) return;
        if (!res.ok || !res.entries) {
          setError(res.error || "Reytingni olishda xato");
          return;
        }
        setEntries(res.entries);
      })
      .catch(() => setError("Serverga ulanib bo'lmadi"))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-6 text-ink-900">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-body-sm text-ink-600 hover:text-emerald-700">
          ← Bosh sahifa
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-h2 font-bold">
          <Trophy className="h-7 w-7 text-gold-600" /> Onlayn reyting
        </h1>
        <p className="mt-1 text-body text-ink-600">So'nggi onlayn o'yinlarning g'oliblari va ishtirokchilar.</p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card mt-6 !p-0 overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-ink-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Yuklanmoqda...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-clay-600">
              <p>{error}</p>
              <p className="mt-2 text-body-sm text-ink-400">
                Server hali deploy qilinmagan bo'lishi mumkin — faqat lokal o'yinlar mavjud.
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-ink-500">Hali hech qanday onlayn o'yin natijasi yo'q.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead className="bg-sand-100 text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">G'olib</th>
                    <th className="px-4 py-3 font-semibold">O'yinchilar</th>
                    <th className="px-4 py-3 font-semibold">Xona kodi</th>
                    <th className="px-4 py-3 font-semibold">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {entries.map((e, i) => (
                    <tr key={e.id} className="hover:bg-sand-50/50">
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-gold-600">
                            <Crown className="h-4 w-4" /> 1
                          </span>
                        ) : (
                          <span className={cn("font-semibold", i === 1 && "text-ink-700", i === 2 && "text-clay-600")}>
                            {i + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink-900">
                        {e.winnerName ?? "G'olib yo'q"}
                        {e.players.find((p) => p.name === e.winnerName)?.cash !== undefined && (
                          <span className="ml-2 text-body-xs text-emerald-600">
                            {formatUZSCompact(e.players.find((p) => p.name === e.winnerName)?.cash ?? 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-ink-600">
                          <Users className="h-3.5 w-3.5" />
                          {e.humanCount} inson + {e.playerCount - e.humanCount} bot
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-500">{e.code}</td>
                      <td className="px-4 py-3 text-ink-400">{formatDate(e.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
