import assert from 'node:assert/strict';
import { indexResult, migrateRecentPage, readRecent, LEGACY_PREFIX } from '../workers/src/leaderboard';
import { getLeaderboard, type LeaderboardEnv, type LeaderboardEntry } from '../workers/src/game/online';

const data = new Map<string, string>();
let reads = 0;
const prefixes: string[] = [];
const env = {LEADERBOARD_INDEX_READY: 'true', OQIM_USERS: {
  get: async (key: string) => {reads++; return data.get(key) ?? null;},
  put: async (key: string, value: string) => {data.set(key, value);},
  list: async ({prefix, limit, cursor}: {prefix: string; limit: number; cursor?: string}) => {
    prefixes.push(prefix);
    const keys = [...data.keys()].filter(key => key.startsWith(prefix)).sort();
    const start = Number(cursor ?? 0), end = start + limit;
    return {keys: keys.slice(start, end).map(name => ({name})), list_complete: end >= keys.length, cursor: String(end)};
  },
}} as unknown as LeaderboardEnv;
const entry = (i: number): LeaderboardEntry => ({id: `game-${i}`, code: 'ABCDEF',
  createdAt: Date.now() - 200_000, finishedAt: Date.now() - i * 1000,
  winnerId: null, winnerName: null, playerCount: 1, humanCount: 1,
  players: [{id: 0, name: 'Test', isBot: false, cash: 100, escaped: false, bankrupt: false}],
});
for (let i = 0; i < 120; i++) data.set(`${LEGACY_PREFIX}game-${i}`, JSON.stringify(entry(i)));
data.set(`${LEGACY_PREFIX}bad`, '{broken');
let cursor: string | undefined, indexed = 0, invalid = 0;
do {
  const page = await migrateRecentPage(env, cursor);
  indexed += page.indexed; invalid += page.invalid;
  cursor = page.cursor ?? undefined;
} while (cursor);
assert.equal(indexed, 120); assert.equal(invalid, 1);
reads = 0; prefixes.length = 0;
const recent = await getLeaderboard(env);
assert.equal(recent.length, 50);
assert.equal(recent[0].id, 'game-0'); assert.equal(recent[49].id, 'game-49');
assert.equal(reads, 50, 'Public reads must be bounded independently of archive size');
assert.equal(prefixes.length, 1); assert.notEqual(prefixes[0], LEGACY_PREFIX);
const original = recent[0];
const size = data.size;
await indexResult(env, original); await indexResult(env, original);
assert.equal(data.size, size, 'Retries must not duplicate the index');
await indexResult(env, {...entry(500), finishedAt: Date.now() - 91 * 86400_000});
assert.equal(data.size, size, 'Backfill must not revive expired results');
assert.equal((await readRecent(env, 500)).length, 50);
console.log('LEADERBOARD INDEX PASSED: bounded reads, pagination, ordering, corruption, expiry and idempotency');
