import {readFileSync, statSync, readdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const html = readFileSync('dist/index.html', 'utf8');
const scripts = [...html.matchAll(/(?:src|href)="([^" ]+\.js)"/g)].map(match => 'dist/' + match[1].replace(/^\.?\//, ''));
assert.ok(scripts.length > 0, 'Build entry script required');
const initialGzip = scripts.reduce((sum, path) => sum + gzipSync(readFileSync(path)).length, 0);
assert.ok(initialGzip <= 180_000, `Initial scripts exceed 180kB gzip: ${initialGzip}`);
for (const name of readdirSync('dist/assets').filter(name => name.endsWith('.js'))) {
  assert.ok(statSync('dist/assets/' + name).size <= 400_000, `${name} exceeds 400kB chunk budget`);
}
console.log(`BUNDLE BUDGET PASSED: initial script/preloads ${initialGzip} bytes gzip; all chunks <=400kB. Not a Core Web Vitals measurement.`);
