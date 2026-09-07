import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const requireWorker = createRequire(new URL('../workers/package.json', import.meta.url));
const {Miniflare, convertV4MiniflareOptions} = requireWorker('miniflare');
const emails = [];
let deliveryFails = false;
const bundle = await build({entryPoints: ['workers/src/index.ts'], bundle: true, format: 'esm', platform: 'browser', write: false});
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: bundle.outputFiles[0].text,
  compatibilityDate: '2025-01-01', compatibilityFlags: ['nodejs_compat'],
  outboundService: async request => {
    assert.equal(request.url, 'https://api.resend.com/emails', 'Unexpected outbound request blocked');
    emails.push(await request.json());
    return Response.json(deliveryFails ? {error: 'mock failure'} : {id: 'mock-email'}, {status: deliveryFails ? 503 : 200});
  },
  kvNamespaces: ['OQIM_USERS'],
  durableObjects: {GAME_ROOM: 'GameRoom', RATE_LIMITER: {className: 'RateLimiter', useSQLite: true}, USER_ACCOUNT: {className: 'UserAccount', useSQLite: true}},
  bindings: {JWT_SECRET: 'local-integration-secret-not-for-production', ADMIN_EMAILS: 'audit@example.com', ACCOUNT_REGISTRATION_ENABLED: 'true', LEADERBOARD_INDEX_READY: 'true',
    RESEND_API_KEY: 'test-only-not-a-real-key', MAIL_FROM: 'OQIM <test@example.com>', PUBLIC_APP_URL: 'https://oqim.pages.dev'},
}));
const origin = 'https://oqim.pages.dev';
const post = (path, body, ip = '192.0.2.1') => mf.dispatchFetch('https://local.test' + path, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': ip}, body: JSON.stringify(body)});
try {
  const preflight = await mf.dispatchFetch('https://local.test/api/auth/login', {method: 'OPTIONS', headers: {Origin: origin}});
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.equal((await post('/api/auth/register', {email: 12})).status, 400);
  const started = performance.now();
  const registered = await post('/api/auth/register', {email: 'audit@example.com', password: 'safe-integration-password', name: 'Audit'});
  assert.equal(registered.status, 200, await registered.clone().text());
  const account = await registered.json();
  assert.equal((await mf.dispatchFetch('https://local.test/api/admin/users', {headers: {Origin: origin, Authorization: `Bearer ${account.token}`}})).status, 403);
  const loggedIn = await post('/api/auth/login', {email: 'audit@example.com', password: 'safe-integration-password'});
  assert.equal(loggedIn.status, 200, await loggedIn.clone().text());
  const duplicate = await Promise.all([1, 2].map(i => post('/api/auth/register', {
    email: 'parallel@example.com', password: `parallel-password-${i}`, name: 'Parallel',
  }, `192.0.2.${10 + i}`)));
  assert.deepEqual(duplicate.map(r => r.status).sort(), [200, 409], 'Only one concurrent registration may succeed');
  const accounts = await mf.getDurableObjectNamespace('USER_ACCOUNT');
  const accountStub = accounts.get(accounts.idFromName('audit@example.com'));
  const accountUrl = 'https://account/?email=audit%40example.com';
  const original = (await (await accountStub.fetch(accountUrl)).json()).user;
  const write = user => accountStub.fetch(accountUrl, {method: 'PUT', body: JSON.stringify({user, expected: original.revision})});
  assert.equal((await write({...original, banned: true, sessionVersion: 1})).status, 200);
  assert.equal((await write({...original, profile: {games: [], lessons: ['old-write']}})).status, 409, 'Stale profile must not undo a ban');
  assert.equal((await mf.dispatchFetch('https://local.test/api/auth/me', {headers: {Origin: origin, Authorization: `Bearer ${account.token}`}})).status, 403);
  const kv = await mf.getKVNamespace('OQIM_USERS');
  await kv.put('user:legacy@example.com', JSON.stringify({...original, email: 'legacy@example.com'}));
  const legacyStub = accounts.get(accounts.idFromName('legacy@example.com'));
  const legacyUrl = 'https://account/?email=legacy%40example.com';
  const migrated = (await (await legacyStub.fetch(legacyUrl)).json()).user;
  assert.equal(migrated.passwordHash, original.passwordHash, 'Migration must preserve credentials');
  await kv.put('user:legacy@example.com', JSON.stringify({...original, email: 'legacy@example.com', banned: true}));
  assert.equal((await (await legacyStub.fetch(legacyUrl)).json()).user.banned, false, 'KV must not replace canonical account after import');
  assert.equal((await post('/api/admin/leaderboard/migrate', {})).status, 403);
  // Trusted fixture provisioning, never exposed by a public route.
  const canonical = (await (await accountStub.fetch(accountUrl)).json()).user;
  assert.equal((await accountStub.fetch(accountUrl, {method: 'PUT', body: JSON.stringify({expected: canonical.revision,
    user: {...canonical, banned: false, role: 'admin', adminGrantedAt: Date.now(), sessionVersion: 2}})})).status, 200);
  const adminLogin = await post('/api/auth/login', {email: 'audit@example.com', password: 'safe-integration-password'});
  const adminToken = (await adminLogin.json()).token;
  const sample = {id: 'old-game', code: 'ABCDEF', createdAt: Date.now() - 1000, finishedAt: Date.now(),
    winnerId: null, winnerName: null, playerCount: 1, humanCount: 1,
    players: [{id: 0, name: 'Audit', isBot: false, cash: 100, escaped: false, bankrupt: false}]};
  await kv.put('leaderboard:entry:old-game', JSON.stringify(sample));
  const migrate = () => mf.dispatchFetch('https://local.test/api/admin/leaderboard/migrate', {method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: origin, Authorization: `Bearer ${adminToken}`}, body: '{}'});
  const migration = await migrate();
  assert.equal(migration.status, 200, await migration.clone().text());
  assert.equal((await migration.json()).indexed, 1);
  assert.equal((await migrate()).status, 200);
  const leaderboard = await (await mf.dispatchFetch('https://local.test/api/leaderboard')).json();
  assert.deepEqual(leaderboard.entries.map(entry => entry.id), ['old-game'], 'Real KV migration and indexed route preserve one copy');
  const linkFromEmail = async index => {
    const until = Date.now() + 5000;
    while (emails.length <= index && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(emails[index], 'Mock mail must be delivered');
    const url = new URL(emails[index].text.match(/https:\/\/[^\s]+/)[0]);
    assert.equal(url.origin, 'https://oqim.pages.dev');
    return Object.fromEntries(new URLSearchParams(url.hash.slice(1)));
  };
  const knownRequest = await post('/api/auth/verify/request', {email: 'audit@example.com'});
  assert.equal(knownRequest.status, 200);
  const genericBody = await knownRequest.json();
  assert.deepEqual(await (await post('/api/auth/verify/request', {email: 'unknown@example.com'})).json(), genericBody);
  const verification = await linkFromEmail(0);
  const proof = {email: verification.email, token: verification.token};
  const pending = (await (await accountStub.fetch(accountUrl)).json()).user;
  assert.notEqual(pending.emailVerification.hash, verification.token, 'Only a token hash may be stored');
  assert.equal((await post('/api/auth/reset/confirm', {...proof, password: 'new-safe-password-123'})).status, 400, 'Purposes must not be interchangeable');
  assert.equal((await post('/api/auth/verify/confirm', proof)).status, 200);
  assert.equal((await post('/api/auth/verify/confirm', proof)).status, 400, 'Verification link must be single use');
  assert.ok((await (await accountStub.fetch(accountUrl)).json()).user.emailVerifiedAt);
  assert.equal((await post('/api/auth/reset/request', {email: 'audit@example.com'})).status, 200);
  const reset = await linkFromEmail(1);
  const resetInput = {email: reset.email, token: reset.token, password: 'new-safe-password-123'};
  const consumed = await Promise.all([post('/api/auth/reset/confirm', resetInput), post('/api/auth/reset/confirm', resetInput)]);
  assert.equal(consumed.filter(response => response.status === 200).length, 1, 'Only one concurrent reset may consume the token');
  assert.ok(consumed.every(response => [200, 400, 409].includes(response.status)));
  assert.equal((await mf.dispatchFetch('https://local.test/api/auth/me', {headers: {Authorization: `Bearer ${adminToken}`}})).status, 401, 'Password reset must revoke previous JWTs');
  assert.equal((await post('/api/auth/login', {email: 'audit@example.com', password: 'safe-integration-password'})).status, 401);
  assert.equal((await post('/api/auth/login', {email: 'audit@example.com', password: 'new-safe-password-123'})).status, 200);
  await post('/api/auth/reset/request', {email: 'audit@example.com'});
  const expiring = await linkFromEmail(2);
  const withReset = (await (await accountStub.fetch(accountUrl)).json()).user;
  await accountStub.fetch(accountUrl, {method: 'PUT', body: JSON.stringify({expected: withReset.revision,
    user: {...withReset, passwordReset: {...withReset.passwordReset, expiresAt: Date.now() - 1}}})});
  assert.equal((await post('/api/auth/reset/confirm', {email: expiring.email, token: expiring.token, password: 'another-safe-password'})).status, 400);
  deliveryFails = true;
  assert.deepEqual(await (await post('/api/auth/reset/request', {email: 'audit@example.com'})).json(), genericBody,
    'Provider failures must not expose account existence');
  await linkFromEmail(3);
  console.log('ACCOUNT LINKS PASSED: mock delivery only, one-time use, purpose isolation, concurrent reset, expiry and session revocation');
  console.log(`Workerd registration + login wall time: ${Math.round(performance.now() - started)}ms (not production CPU measurement)`);
  const room = await post('/api/rooms', {name: 'Audit', timerSec: 60, bots: 1});
  assert.equal(room.status, 201, await room.clone().text());
  const {code} = await room.json();
  assert.equal((await mf.dispatchFetch(`https://local.test/api/rooms/${code}`)).status, 200);
  const requests = await Promise.all(Array.from({length: 11}, () => post('/api/rooms', {name: 'Parallel', timerSec: 60, bots: 0}, '192.0.2.2')));
  assert.equal(requests.filter(response => response.status === 201).length, 10);
  assert.equal(requests.filter(response => response.status === 429).length, 1);
  console.log('WORKER INTEGRATION PASSED: real workerd, KV, Durable Objects, auth and concurrent rate limit');
} finally { await mf.dispose(); }
