import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const requireWorker = createRequire(new URL('../workers/package.json', import.meta.url));
const {Miniflare, convertV4MiniflareOptions} = requireWorker('miniflare');
const bundle = await build({entryPoints: ['workers/src/index.ts'], bundle: true, format: 'esm', platform: 'browser', write: false});
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: bundle.outputFiles[0].text,
  compatibilityDate: '2025-01-01', compatibilityFlags: ['nodejs_compat'],
  kvNamespaces: ['OQIM_USERS'],
  durableObjects: {GAME_ROOM: 'GameRoom', RATE_LIMITER: {className: 'RateLimiter', useSQLite: true}, USER_ACCOUNT: {className: 'UserAccount', useSQLite: true}},
  bindings: {JWT_SECRET: 'local-integration-secret-not-for-production', ADMIN_EMAILS: 'audit@example.com', ACCOUNT_REGISTRATION_ENABLED: 'true'},
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
