import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

async function fixture() {
  const bundled = await build({stdin: {contents: `
    import { makePlayer, makeGame } from './src/lib/game/engine';
    import { PROFESSIONS } from './src/lib/game/data';
    import { SAVE_KEY } from './src/lib/game/types';
    const player = makePlayer(0, 'Audit o‘yinchisi', PROFESSIONS[0], {isBot: false, personality: null, colorIndex: 0, dreamId: 'd1', quadrant: 'E'});
    console.log(JSON.stringify({key: SAVE_KEY, game: makeGame([player])}));`, resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false, alias: {'@': './src'}});
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module'], {input: bundled.outputFiles[0].text, encoding: 'utf8'}));
}

async function resume(page: Page) {
  const saved = await fixture();
  await page.addInitScript(({key, game}) => {if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(game));}, saved);
  await page.goto('/game');
  await page.getByRole('button', {name: 'Davom etish', exact: true}).click();
  await expect(page.locator('.game-board')).toBeVisible();
}

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
