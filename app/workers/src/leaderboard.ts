import { z } from 'zod';
import type { LeaderboardEntry, LeaderboardEnv } from './game/online';

export const LEGACY_PREFIX = 'leaderboard:entry:';
const INDEX_PREFIX = 'leaderboard:recent:v1:';
const RETENTION = 90 * 24 * 60 * 60;
const MAX_TIME = 9_999_999_999_999;
const schema = z.object({
  id: z.string(), code: z.string(), finishedAt: z.number().int().nonnegative().max(MAX_TIME),
  createdAt: z.number(), winnerId: z.number().int().nullable(), winnerName: z.string().nullable(),
  playerCount: z.number().int(), humanCount: z.number().int(),
  players: z.array(z.object({id: z.number().int(), name: z.string(), isBot: z.boolean(),
    cash: z.number(), escaped: z.boolean(), bankrupt: z.boolean()})),
});

export function parseEntry(raw: string | null): LeaderboardEntry | null {
  try { const parsed = schema.safeParse(raw ? JSON.parse(raw) : null); return parsed.success ? parsed.data : null; }
  catch { return null; }
}

export async function indexResult(env: LeaderboardEnv, entry: LeaderboardEntry, now = Date.now()): Promise<boolean> {
  const remaining = Math.floor(entry.finishedAt / 1000) + RETENTION - Math.floor(now / 1000);
  if (remaining <= 0) return false;
  const key = `${INDEX_PREFIX}${String(MAX_TIME - entry.finishedAt).padStart(13, '0')}:${entry.id}`;
  await env.OQIM_USERS.put(key, JSON.stringify(entry), {expirationTtl: Math.max(60, remaining)});
  return true;
}

/** Lexicographic reverse timestamp index: bounded page plus at most 50 reads. */
export async function readRecent(env: LeaderboardEnv, limit = 50): Promise<LeaderboardEntry[]> {
  const count = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 50;
  const list = await env.OQIM_USERS.list({prefix: INDEX_PREFIX, limit: count});
  const entries = await Promise.all(list.keys.map(async key => parseEntry(await env.OQIM_USERS.get(key.name))));
  const cutoff = Date.now() - RETENTION * 1000;
  return entries.filter((entry): entry is LeaderboardEntry => entry !== null && entry.finishedAt > cutoff);
}

/** Explicit, resumable legacy backfill. Never run a full scan on a public read. */
export async function migrateRecentPage(env: LeaderboardEnv, cursor?: string) {
  const list = await env.OQIM_USERS.list({prefix: LEGACY_PREFIX, limit: 50, cursor});
  let indexed = 0, invalid = 0, expired = 0;
  // Sequential writes respect KV limits and make a repeated page idempotent.
  for (const key of list.keys) {
    const entry = parseEntry(await env.OQIM_USERS.get(key.name));
    if (!entry) { invalid++; continue; }
    if (await indexResult(env, entry)) indexed++;
    else expired++;
  }
  return {ok: true, indexed, invalid, expired, cursor: list.list_complete ? null : list.cursor};
}
