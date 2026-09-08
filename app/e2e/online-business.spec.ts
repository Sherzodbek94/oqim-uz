import { test, expect } from '@playwright/test';
import type { PublicState } from '../src/lib/net/client';

test('online business decision sends only server decision ID and closes on update', async ({page}) => {
  const player = {id: 0, name: 'Host', isBot: false, avatar: '/avatar-teacher.png', colorIndex: 0,
    position: 3, cash: 10_000_000, salary: 0, assets: [], loansCount: 0, children: 0,
    escaped: false, bankrupt: false, charityTurns: 0, skipTurns: 0};
  const state: PublicState = {
    code: 'ABCDEF', phase: 'playing', settings: {timerSec: 60, bots: 0}, isHost: true, you: 0,
    players: [{id: 0, name: 'Host', isBot: false, connected: true}, {id: 1, name: 'Guest', isBot: false, connected: true}],
    winnerId: null, awaiting: 0, deadline: Date.now() + 60_000,
    pending: {kind: 'business-choice', decisionId: 'server-decision-1', onlyFor: 0,
      title: 'Buyurtma zaxirasini tayyorlash', desc: '20 birlik zaxira kerak.',
      choices: [{label: 'Zaxira xarid qilish', hint: '−2 mln'}, {label: 'Bekor qilish', hint: 'Xarajatsiz'}]},
    game: {current: 0, round: 1, month: 1, dice: [1,1], diceCount: 1, log: [], players: [player, {...player, id: 1, name: 'Guest'}]},
  };
  const actions: unknown[] = [];
  await page.route('**/api/rooms', route => route.fulfill({json: {ok: true, code: 'ABCDEF', hostToken: 'test-room-token'}}));
  await page.routeWebSocket('**/api/rooms/ABCDEF/ws', ws => {
    ws.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.t === 'join') ws.send(JSON.stringify({t: 'state', state}));
      if (message.t === 'action') {
        actions.push(message.action);
        ws.send(JSON.stringify({t: 'state', state: {...state, pending: null, awaiting: 1, game: {...state.game, current: 1}}}));
      }
    });
  });
  await page.goto('/onlayn');
  await page.getByPlaceholder('Masalan: Dilnoza').fill('Host');
  await page.getByRole('button', {name: 'Xona yaratish', exact: true}).click();
  const decision = page.getByRole('region', {name: 'Biznes qarori'});
  await expect(decision).toBeVisible();
  const box = await decision.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await decision.getByRole('button', {name: /Zaxira xarid qilish/}).click();
  await expect(decision).toHaveCount(0);
  expect(actions).toEqual([{kind: 'business-choice', decisionId: 'server-decision-1', choice: 0}]);
});
