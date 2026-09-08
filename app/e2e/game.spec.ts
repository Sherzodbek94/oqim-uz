import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

async function fixture(quadrant: 'E' | 'B' = 'E', modern = false) {
  const bundled = await build({stdin: {contents: `
    import { makePlayer, makeGame } from './src/lib/game/engine';
    import { PROFESSIONS } from './src/lib/game/data';
    import { SAVE_KEY } from './src/lib/game/types';
    import { operateBusiness, startingBusiness } from './src/lib/game/business';
    const player = makePlayer(0, 'Audit o‘yinchisi', PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: 'd1', quadrant: '${quadrant}'});
    if (player.quadrant === 'B') { if (!${modern}) delete player.assets[0].businessModel; /* preserve legacy coverage */ operateBusiness(player, 'accept'); operateBusiness(player, 'restock'); player.assets.push(startingBusiness('second-business', 'transport')); }
    console.log(JSON.stringify({key: SAVE_KEY, game: makeGame([player])}));`, resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false, alias: {'@': './src'}});
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module'], {input: bundled.outputFiles[0].text, encoding: 'utf8'}));
}

async function resume(page: Page, quadrant: 'E' | 'B' = 'E', modern = false, route = '/game') {
  const saved = await fixture(quadrant, modern);
  await page.addInitScript(({key, game}) => {if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(game));}, saved);
  await page.goto(route);
  await page.getByRole('button', {name: 'Davom etish', exact: true}).click();
  await expect(page.locator('.game-board')).toBeVisible();
}

test('city edition keeps playable board and can return to original edition', async ({page}) => {
  await resume(page, 'E', false, '/game-city');
  await expect(page.locator('.oqim-city-v2')).toBeVisible();
  await expect(page.locator('.board-cell')).toHaveCount(30);
  await page.locator('.board-cell').nth(2).click();
  await expect(page.locator('.board-cell').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.city-action-dock').getByRole('button', {name: 'Zar tashlash', exact: true})).toBeEnabled();
  const box = await page.locator('.game-board').boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await page.screenshot({path: test.info().outputPath('city-edition.png'), fullPage: true});
  await page.getByRole('link', {name: 'Avvalgi ko‘rinish', exact: true}).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator('.oqim-city-v2')).toHaveCount(0);
});

test('city edition rolls and advances the real saved game', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Math.random = () => 0.01; });
  await resume(page, 'E', false, '/game-city');
  await page.locator('.city-action-dock').getByRole('button', {name: 'Zar tashlash', exact: true}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oqim-save-v1') ?? '{}').players?.[0]?.position)).toBe(1);
  expect(errors).toEqual([]);
});

test('business report restores stock, order deadline and capacity', async ({page, isMobile}) => {
  await resume(page, 'B');
  if (isMobile) await page.getByRole('button', {name: 'Hisobotni ochish', exact: true}).last().click();
  await page.locator('summary:visible').filter({hasText: 'Batafsil hisobot va maqsadlar'}).first().click();
  await page.locator('summary:visible').filter({hasText: "O'quv markazi"}).first().click();
  const operations = page.locator('[aria-label="Qo\'shimcha buyurtma holati"]:visible').first();
  await expect(operations).toContainText("Bo'sh quvvat: 20 / 20");
  await expect(operations).toContainText('Zaxira: 20 birlik');
  await expect(operations).toContainText('3 oy qoldi');
  const box = await operations.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
});

test('business selection persists after reopening the game', async ({page, isMobile}) => {
  await resume(page, 'B');
  const openReport = async () => {
    if (isMobile) await page.getByRole('button', {name: 'Hisobotni ochish', exact: true}).last().click();
    await page.locator('summary:visible').filter({hasText: 'Batafsil hisobot va maqsadlar'}).first().click();
  };
  await openReport();
  const selection = page.getByRole('combobox', {name: /Boshqariladigan biznes/});
  await expect(selection).toBeEnabled();
  await selection.selectOption('second-business');
  await expect(selection).toHaveValue('second-business');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oqim-save-v1') ?? '{}').players?.[0]?.managedBusinessId)).toBe('second-business');
  await page.reload();
  await page.getByRole('button', {name: 'Davom etish', exact: true}).click();
  await openReport();
  await expect(selection).toHaveValue('second-business');
});

test('saved game resumes and board fits viewport', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await resume(page);
  const board = await page.locator('.game-board').boundingBox();
  const viewport = page.viewportSize()!;
  expect(board).not.toBeNull();
  expect(board!.x).toBeGreaterThanOrEqual(0);
  expect(board!.x + board!.width).toBeLessThanOrEqual(viewport.width + 1);
  await expect(page.locator('.board-cell')).toHaveCount(30);
  await expect(page.locator('.board-cell .event-scene')).toHaveCount(30);
  await expect.poll(() => page.locator('.board-cell .event-scene img').first().evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  await page.locator('.board-cell').nth(2).click();
  await expect(page.locator('.board-cell').nth(2)).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('mobile report tabs switch and details stay usable', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Mobile action bar only');
  await resume(page);
  await page.getByRole('button', {name: 'Hisobotni ochish', exact: true}).last().click();
  await expect(page.getByRole('tab', {selected: true})).toContainText('Hisobot');
  const tabs = page.getByRole('tab');
  const target = tabs.nth(1);
  await target.click();
  await expect(target).toHaveAttribute('aria-selected', 'true');
  await tabs.first().click();
  const panel = page.getByRole('tabpanel', {name: 'Hisobot'});
  await panel.getByText('Batafsil hisobot va maqsadlar', {exact: true}).click();
  await expect(panel.locator('details[open]')).toBeVisible();
});

test('game controls have accessible names and keyboard semantics', async ({page}) => {
  await resume(page);
  // Measure the settled screen, not the intermediate entrance fade.
  await expect.poll(() => page.locator('.board-layout').evaluate(element => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) !== 1) return false;
    }
    return true;
  })).toBe(true);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const result = await new AxeBuilder({page}).include('.board-layout').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.locator('.board-cell').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.board-cell').first()).toHaveAttribute('aria-pressed', 'true');
});

test('corrupt save opens setup instead of crashing', async ({page}) => {
  const saved = await fixture();
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), saved.key);
  await page.goto('/game');
  await expect(page.getByRole('button', {name: 'Davom etish', exact: true})).toHaveCount(0);
  await expect(page.getByRole('heading', {name: "O'yinni sozlash", exact: true})).toBeVisible();
});

test('leaderboard handles network failure and retries', async ({page}) => {
  let fail = true;
  await page.route('**/api/leaderboard', route => fail ? route.abort() : route.fulfill({json: {ok: true, entries: []}}));
  await page.goto('/reyting');
  await expect(page.getByRole('alert')).toBeVisible();
  fail = false;
  await page.getByRole('button', {name: 'Qayta urinish'}).click();
  await expect(page.getByText("Hali hech qanday onlayn o'yin natijasi yo'q.", {exact: true})).toBeVisible();
});

test('malformed successful leaderboard response shows recoverable error', async ({page}) => {
  await page.route('**/api/leaderboard', route => route.fulfill({json: {ok: true, entries: {unexpected: true}}}));
  await page.goto('/reyting');
  await expect(page.getByRole('alert')).toContainText('Server javobi noto‘g‘ri');
  await expect(page.getByRole('button', {name: 'Qayta urinish'})).toBeEnabled();
});


test('service business uses working hours without inventory after resume', async ({page, isMobile}) => {
  await resume(page, 'B', true);
  if (isMobile) await page.getByRole('button', {name: 'Hisobotni ochish', exact: true}).last().click();
  await page.locator('summary:visible').filter({hasText: 'Batafsil hisobot va maqsadlar'}).first().click();
  await page.locator('summary:visible').filter({hasText: "O'quv markazi"}).first().click();
  const operations = page.locator("[aria-label=\"Qo'shimcha buyurtma holati\"]:visible").first();
  await expect(operations).toContainText('Xizmat');
  await expect(operations).toContainText('40 / 40 ish soati/oy');
  await expect(operations).toContainText('Ombor talab qilinmaydi');
  await expect(operations).toContainText('3 oy qoldi');
});
