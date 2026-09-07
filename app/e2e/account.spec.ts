import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('account recovery handles failure and has accessible form controls', async ({page}) => {
  let fail = true;
  await page.route('**/api/auth/reset/request', route => fail ? route.abort() : route.fulfill({json: {ok: true}}));
  await page.goto('/hisob');
  await page.getByLabel('Email', {exact: true}).fill('audit@example.com');
  await page.getByRole('button', {name: 'Havola yuborish', exact: true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const result = await new AxeBuilder({page}).include('section[aria-labelledby="account-title"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  fail = false;
  await page.getByRole('button', {name: 'Havola yuborish', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('Mos hisob mavjud bo‘lsa');
});

test('reset link stays out of URL and confirmation requires matching passwords', async ({page}) => {
  const token = 'x'.repeat(43);
  let requests = 0;
  await page.route('**/api/auth/reset/confirm', async route => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({email: 'audit@example.com', token, password: 'my-new-password-123'});
    await route.fulfill({json: {ok: true}});
  });
  await page.goto(`/hisob#action=reset&email=audit%40example.com&token=${token}`);
  await expect(page).toHaveURL(/\/hisob$/);
  await page.getByLabel('Yangi parol', {exact: true}).fill('my-new-password-123');
  await page.getByLabel('Parolni takrorlang', {exact: true}).fill('not-the-same');
  await page.getByRole('button', {name: 'Tasdiqlash', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Parollar bir xil emas');
  expect(requests).toBe(0);
  await page.getByLabel('Parolni takrorlang', {exact: true}).fill('my-new-password-123');
  await page.getByRole('button', {name: 'Tasdiqlash', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('Parol yangilandi');
  expect(requests).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(token);
});

test('email verification is explicit and expired links allow a new request', async ({page}) => {
  let requests = 0;
  await page.route('**/api/auth/verify/confirm', route => {
    requests++;
    return route.fulfill({status: 400, json: {ok: false, error: 'Havola eskirgan yoki ishlatilgan. Yangi havola so‘rang.'}});
  });
  await page.goto(`/hisob#action=verify&email=audit%40example.com&token=${'y'.repeat(43)}`);
  await expect(page.getByRole('heading', {name: 'Emailni tasdiqlash'})).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('button', {name: 'Tasdiqlash', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Havola eskirgan');
  await page.getByRole('button', {name: 'Email tasdiqlash havolasini so‘rash'}).click();
  await expect(page.getByRole('button', {name: 'Havola yuborish', exact: true})).toBeVisible();
});
