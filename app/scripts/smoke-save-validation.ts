import assert from 'node:assert/strict';
import {makeGame, makePlayer} from '../src/lib/game/engine';
import {PROFESSIONS} from '../src/lib/game/data';
import {SAVE_KEY} from '../src/lib/game/types';
import {loadSave, saveGame} from '../src/lib/game/save';
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {value: {getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value)}});
const player = makePlayer(0, 'Test', PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: 'd1', quadrant: 'E'});
const valid = makeGame([player]);
assert.equal(saveGame(valid), true);
assert.ok(loadSave());
for (const broken of [{...valid, current: -1}, {...valid, current: 99}, {...valid, version: undefined}, {...valid, players: []}, {...valid, players: [player, player]}, {...valid, round: 0}]) {
  storage.set(SAVE_KEY, JSON.stringify(broken));
  assert.equal(loadSave(), null);
}
console.log('SAVE VALIDATION PASSED');
