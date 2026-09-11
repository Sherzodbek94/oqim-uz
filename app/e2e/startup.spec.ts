import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

/**
 * Startap Imperiyasi (`/startap`): sozlash, oy halqasi, hodisa varag'i.
 *
 * Dvigatel sof funksiyalardan iborat, lekin rejim UI qatlamida yashaydi:
 * hodisa varag'i `phase === "event"` da, hisobot `phase === "report"` da
 * ochiladi. O'sha ikki varaq orasidagi o'tish uzilsa, dvigatel testlari
 * yashil qolardi — o'yinchi esa oyni yakunlab qotgan ekranga qarardi.
 *
 * TASODIF SEED BILAN BOSHQARILADI. Karta seeded RNG (mulberry32) bilan
 * tortiladi va seed holat ichida saqlanadi; sozlash ekrani uni
 * `Date.now()` dan oladi. Shuning uchun saqlanma DVIGATELNING O'ZI bilan
 * yasaladi (`game.spec.ts` dagi fixture naqshi), qo'lda yozilgan JSON
 * bilan emas: dvigatel o'zgarsa, fixture ham u bilan birga o'zgaradi.
 */

/** Seed 1 birinchi oydayoq TANLOVLI karta beradi. */
const SEED = 1;
const NAME = 'Oqim Tech';

async function fixture(seed = SEED) {
  const bundled = await build({stdin: {contents: `
    import { newStartup } from './src/lib/startup/engine';
    import { STARTUP_SAVE_KEY } from './src/lib/startup/types';
    console.log(JSON.stringify({key: STARTUP_SAVE_KEY, state: newStartup('${NAME}', ${seed})}));`,
    resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false, alias: {'@': './src'}});
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module'], {input: bundled.outputFiles[0].text, encoding: 'utf8'}));
}

/**
 * Sozlashni chetlab o'tib, seedlangan partiyani ochadi.
 * `Startup.tsx` holatni `useState(() => loadStartup())` bilan oladi, ya'ni
 * saqlanma sahifa ulanishidan OLDIN joyida bo'lishi kerak.
 */
async function seeded(page: Page, seed = SEED) {
  const {key, state} = await fixture(seed);
  /* Qorovul: `addInitScript` HAR navigatsiyada ishlaydi — usiz reload
     saqlanmani 1-oyga qaytarib, «tiklandi» testini yolg'on qilardi. */
  await page.addInitScript(({key, state}) => {if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));}, {key, state});
  await page.goto('/startap');
  await expect(page.getByRole('navigation', {name: "Bo'limlar"})).toBeVisible();
}

test('mode selector opens the startup mode and the setup screen starts a run', async ({page}) => {
  /*
   * BIRINCHI TASHRIF holatida: «Yangi versiya» paneli chiqib turadi.
   *
   * Ilgari u telefon enida 260 px balandlikda o'ng pastda turardi va asosiy
   * tugma ustiga tushib, bosishni yutib yuborardi — bosilardi, lekin hech
   * narsa bo'lmasdi. Endi telefonda u bitta qatorli 58 px tasma. Shu test
   * o'sha tuzatishning qorovuli: panel yana CTA ni to'ssa, birinchi bo'lib
   * shu yerda qiziradi.
   */
  await page.goto('/');
  /*
   * Tinchlanishini kutamiz: bosh sahifada lenis silliq skroll va kirish
   * animatsiyalari ishlaydi, shuning uchun `load` dan keyin darhol bosilsa
   * Playwright tugmani «stable» deb hisoblamaydi va 30 soniyada uziladi.
   * `force` YECHIM EMAS — u koordinataga uradi va bosish ustidagi boshqa
   * elementga tushib, modal umuman ochilmaydi.
   */
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', {name: "O'yinni boshlash", exact: true}).click();
  await page.getByRole('link', {name: /Startap Imperiyasi/}).click();
  await expect(page).toHaveURL(/\/startap$/);

  await page.getByPlaceholder(/masalan/i).fill(NAME);
  await page.getByRole('button', {name: /Startapni boshlash/}).click();
  await expect(page.getByRole('navigation', {name: "Bo'limlar"})).toBeVisible();
  /* Start kapitali — GDD §6: 15 mln so'm. */
  await expect(page.getByText('15 mln').first()).toBeVisible();

  /* To'rt bo'lim ham ochilsin — har biri alohida tab komponenti. */
  for (const tab of ['Moliya', 'Jamoa', 'Mahsulot', 'Ofis']) {
    await page.getByRole('button', {name: tab, exact: true}).click();
    await expect(page.getByRole('button', {name: tab, exact: true})).toHaveAttribute('aria-current', 'page');
  }
});

test('ending a month reports the result and moves the counter forward', async ({page}) => {
  await seeded(page);
  await page.getByRole('button', {name: /Oyni yakunlash/}).click();

  /* Seed 1 birinchi oyda tanlovli karta beradi — tanlovsiz hisobot chiqmaydi. */
  const card = page.getByRole('dialog', {name: 'Elektr uzilishi'});
  await expect(card).toBeVisible();
  await card.getByRole('button').first().click();

  const report = page.getByRole('dialog', {name: '1-oy hisoboti'});
  await expect(report).toBeVisible();
  await expect(report.getByText("Naqd o'zgarishi")).toBeVisible();
  await page.getByRole('button', {name: /2-oyga o'tish/}).click();
  await expect(report).toBeHidden();
  await expect(page.getByRole('banner').getByText('2-oy')).toBeVisible();
});

test('the event choice reaches the monthly report', async ({page}) => {
  await seeded(page);
  await page.getByRole('button', {name: /Oyni yakunlash/}).click();

  const card = page.getByRole('dialog');
  const title = await card.getByRole('heading').first().innerText();
  await card.getByRole('button').first().click();

  /*
   * Karta NOMI qattiq yozilmaydi — u `balance.ts` dan keladi va o'sha jadval
   * sozlansa test sababsiz yiqilardi. Tekshirilayotgani — varaqdagi sarlavha
   * AYNAN hisobotdagi satrda takrorlanishi.
   */
  const report = page.getByRole('dialog', {name: '1-oy hisoboti'});
  await expect(report).toBeVisible();
  await expect(report.getByText(title, {exact: false})).toBeVisible();
});

test('the event sheet is a modal dialog and keeps focus inside', async ({page}) => {
  await seeded(page);
  await page.getByRole('button', {name: /Oyni yakunlash/}).click();

  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  /*
   * `aria-modal` ATAYLAB tekshirilmaydi: Radix uni qo'ymaydi, o'rniga
   * varaqdan tashqaridagi HAMMA narsaga `aria-hidden` qo'yadi. Bu kuchliroq
   * kafolat — ekran o'quvchi modal ortidagi mazmunga umuman yetib bormaydi —
   * shuning uchun o'sha mexanizmning o'zi o'lchanadi.
   */
  await expect.poll(() => card.evaluate(d => [...document.body.children].filter(c => !c.contains(d)).every(c => c.getAttribute('aria-hidden') === 'true'))).toBe(true);

  /* Fokus ochilgach varaq ICHIGA kiradi. */
  await expect.poll(() => card.evaluate(d => d.contains(document.activeElement))).toBe(true);

  /*
   * Tab tuzog'i. Ortida `sticky` tab-bar va HUD havolasi turadi: tuzoq
   * bo'lmasa fokus o'sha yerga tushib ketardi va o'yinchi tanlovga
   * qaytolmasdi.
   */
  let escaped = 0;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    if (!(await card.evaluate(d => d.contains(document.activeElement)))) escaped++;
  }
  expect(escaped, 'Tab fokusni varaqdan chiqarib yubordi').toBe(0);

  /*
   * Escape varaqni YOPMASLIGI kerak: tanlov qilinmaguncha oy yakunlanmaydi,
   * yopilsa o'yinchi qarorsiz ekranda qolardi.
   *
   * Hozir bu IKKI qatlam bilan ta'minlangan: `onEscapeKeyDown` qorovuli va
   * `open` propining boshqariladigan bo'lishi (`onOpenChange` yo'q, ya'ni
   * Radix holatni o'zi o'zgartira olmaydi). Shu sababli faqat qorovulni
   * olib tashlash bu tekshiruvni yiqitmaydi — u xatti-harakatni qo'riqlaydi,
   * aniq bir qatorni emas: `open` kelajakda holatga bog'lansa, qorovulsiz
   * darhol qizaradi.
   */
  await page.keyboard.press('Escape');
  await expect(card).toBeVisible();

  const result = await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);

  /*
   * Tanlovdan keyin fokus YANGI varaqda qolsin va bir vaqtda BITTA oyna
   * bo'lsin — ikkitasi a11y daraxtini ham chalkashtiradi.
   */
  await card.getByRole('button').first().click();
  const report = page.getByRole('dialog', {name: '1-oy hisoboti'});
  await expect(report).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect.poll(() => report.evaluate(d => d.contains(document.activeElement))).toBe(true);
});

test('the run is restored from localStorage after a reload', async ({page}) => {
  await seeded(page);
  await page.getByRole('button', {name: /Oyni yakunlash/}).click();
  await page.getByRole('dialog', {name: 'Elektr uzilishi'}).getByRole('button').first().click();
  await page.getByRole('button', {name: /2-oyga o'tish/}).click();
  await expect(page.getByRole('banner').getByText('2-oy')).toBeVisible();

  /* Avtosave `useEffect` da — reload poyga holatini ushlab qolmasin. */
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oqim-startup-v1') ?? '{}').month)).toBe(2);

  await page.reload();
  /* Sozlash ekraniga qaytmasin — bu saqlanma o'qilmaganining belgisi. */
  await expect(page.getByRole('navigation', {name: "Bo'limlar"})).toBeVisible();
  await expect(page.getByRole('banner').getByText('2-oy')).toBeVisible();
});

test('the office screen fits a phone and the art is not stretched', async ({page}) => {
  await seeded(page);
  /*
   * Renderlar 4:3. Ilgari chaqiruvchi qattiq balandlik berardi va `<img>`
   * sukut `object-fit: fill` bilan rasmni CHO'ZARDI — har bir ofis yassi
   * ko'rinardi. Shuning uchun bu yerda nisbat o'lchanadi, ko'rinish emas.
   */
  const box = await page.locator('img[src*="/startup/office/"]').evaluate(i => {
    const r = i.getBoundingClientRect();
    return {drawn: r.width / r.height, natural: (i as HTMLImageElement).naturalWidth / (i as HTMLImageElement).naturalHeight};
  });
  expect(Math.abs(box.drawn - box.natural), `nisbat ${box.drawn.toFixed(3)} vs ${box.natural.toFixed(3)}`).toBeLessThan(0.02);

  const layout = await page.evaluate(() => ({needed: document.documentElement.scrollWidth, have: document.documentElement.clientWidth}));
  expect(layout.needed, `o'yin ekrani: ${layout.needed}px kerak, ${layout.have}px bor`).toBeLessThanOrEqual(layout.have);
});
