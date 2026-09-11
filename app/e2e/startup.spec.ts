import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { FOUNDER_ART, ROLE_ART } from '../src/pages/startup/roleArt';
import { FEMALE_NAMES, NAMES } from '../src/lib/startup/balance';
import { portraitFor } from '../src/pages/startup/roleArt';

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

test('the team tab draws a role portrait for every card', async ({page}) => {
  await seeded(page);
  await page.getByRole('button', {name: 'Jamoa', exact: true}).click();

  /*
   * `ROLE_ART` to'liq `Record`, ya'ni yo'q rol `tsc` da ushlanadi — bu test
   * esa FAYL yetib kelishini tekshiradi: yo'l noto'g'ri yozilsa yoki rasm
   * `public/` dan tushib qolsa, tiplar baribir yashil qolardi va o'yinchi
   * bo'sh kvadrat ko'rardi.
   */
  const art = page.locator('img[src*="/startup/roles/"]');
  await expect(art.first()).toBeVisible();
  expect(await art.count(), 'kamida asoschi va nomzodlar').toBeGreaterThan(1);

  /*
   * `toBeVisible` YETARLI EMAS: u element joylashuvga tushishi bilan o'tadi,
   * rasm baytlari kelishini kutmaydi. Portretlar `loading="lazy"`, ya'ni
   * yuklash tab ochilgandan keyin boshlanadi — sovuq CI runner'da bu
   * tekshiruvdan kechroq tugaydi. Birinchi yozilishida test aynan shunday
   * yiqilgan edi (WebKit, `naturalWidth === 0`), shuning uchun bu yerda
   * so'rov emas, KUTISH turadi.
   */
  await expect
    .poll(() => art.evaluateAll(is => is.every(i => (i as HTMLImageElement).naturalWidth > 0)), {timeout: 15_000})
    .toBe(true);

  /*
   * Yuqoridagi tekshiruv faqat SHU partiyada chizilgan rollarni qamraydi —
   * nomzodlar seeddan kelib chiqadi, ya'ni to'qqiztadan uch-to'rttasi.
   *
   * Shuning uchun `ROLE_ART` ning O'ZI — komponent ishlatadigan xarita —
   * manifest sifatida olinadi va har bir QIYMAT so'raladi. Fayl ro'yxatidan
   * yasalgan yo'llar yetarli emasdi: ular faylning borligini tasdiqlardi,
   * lekin xaritadagi xato yozuvni emas (aynan shunday sinovda o'tib ketgan).
   * Har rolning IKKALA jins varianti ham tekshiriladi.
   */
  const urls: [string, string][] = [['founder', FOUNDER_ART]];
  for (const [role, pair] of Object.entries(ROLE_ART)) {
    for (const g of ['m', 'f'] as const) pair[g].forEach((u, i) => urls.push([`${role}-${g}-${i + 1}`, u]));
  }
  const broken = await page.evaluate(async (list) => {
    const load = (u: string) => new Promise<boolean>(res => {
      const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = u;
    });
    const out: string[] = [];
    for (const [id, u] of list) if (!(await load(u))) out.push(`${id} -> ${u}`);
    return out;
  }, urls);
  expect(broken, `yechilmagan portret: ${broken.join(', ')}`).toEqual([]);
  /* junior 5 + middle 4 + senior 4 + 6 rol x 3, har biri ikki jinsda, + asoschi. */
  expect(urls.length, 'variantlar soni').toBe((5 + 4 + 4 + 6 * 3) * 2 + 1);

  /*
   * ISM VA PORTRET JINSI MOS KELSIN. Ilgari portret faqat rolga bog'langandi
   * va «Ulug'bek — dizayner» ayol portreti bilan chiqardi. Bu tekshiruv
   * ekrandagi HAR bir kartani `FEMALE_NAMES` bilan solishtiradi: fayl
   * nomidagi `-m`/`-f` qo'shimchasi ismdan kelib chiqishi shart.
   */
  const rows = await page.locator('img[src*="/startup/roles/"]').evaluateAll(is => is.map(i => {
    const row = i.closest('div')?.parentElement;
    return {file: i.getAttribute('src')!.split('/').pop()!, text: (row as HTMLElement)?.innerText?.split('\n')[0]?.trim() ?? ''};
  }));
  const mismatched = rows
    .filter(r => r.file !== 'founder.webp' && r.text)
    .map(r => ({...r, name: r.text.replace(/\s*Talant\s*/, '').trim()}))
    .filter(r => /-f-\d+\.webp$/.test(r.file) !== FEMALE_NAMES.has(r.name))
    .map(r => `${r.name} -> ${r.file}`);
  expect(mismatched, `ism va portret jinsi mos emas: ${mismatched.join(', ')}`).toEqual([]);

  /*
   * HAR BIR VARIANT ISHLATILSIN. Variant ismning xeshidan tanlanadi va
   * ismlar ro'yxati kichik (26 ta), shunday o'lchamda xeshning sifati
   * ko'rinib qoladi: djb2 ayol ismlarini uchta portretga 11/0/2 qilib
   * bo'lardi, ya'ni ikkinchisi hech qachon chizilmasdi. Bu tekshiruv
   * shunchaki fayl bor-yo'qligini emas, YETIB BORISHINI qo'riqlaydi.
   */
  for (const [role, pair] of Object.entries(ROLE_ART)) {
    const used = new Set(NAMES.map(n => portraitFor(role as keyof typeof ROLE_ART, n)));
    const all = [...pair.m, ...pair.f];
    const unused = all.filter(u => !used.has(u));
    expect(unused, `${role}: hech qachon chizilmaydigan portret`).toEqual([]);
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

test('the garage scene animates', async ({browser}) => {
  /*
   * O'Z KONTEKSTI kerak: `playwright.config.ts` butun to'plamga
   * `reducedMotion: 'reduce'` qo'yadi, ya'ni sukut bo'yicha sahna ataylab
   * qotib turadi. Animatsiyani ko'rish uchun o'sha sozlama bekor qilinadi.
   */
  const ctx = await browser.newContext({reducedMotion: 'no-preference'});
  const page = await ctx.newPage();
  await seeded(page);

  /*
   * 0-daraja jonli: personaj shaffof sprite bo'lib fon ustida turadi va
   * pozalar taymer bilan almashadi. Bu yerda ANIMATSIYA emas, uning
   * KO'RINADIGAN natijasi o'lchanadi — src o'zgarmasa, sahna qotib qolgan.
   */
  const actor = page.locator('img[src*="/startup/actors/"]');
  await expect(actor).toBeVisible();
  await expect.poll(() => actor.evaluate(i => (i as HTMLImageElement).naturalWidth > 0)).toBe(true);

  const korilgan = new Set<string>();
  for (let i = 0; i < 40; i++) {
    korilgan.add((await actor.getAttribute('src')) ?? '');
    await page.waitForTimeout(180);
  }
  expect(korilgan.size, `pozalar almashmadi: ${[...korilgan].join(', ')}`).toBeGreaterThan(1);
  await ctx.close();
});

test('the garage scene holds still when motion is reduced', async ({browser}) => {
  /*
   * `prefers-reduced-motion` — bu qulaylik emas, zarurat: sahna to'xtovsiz
   * aylanadi va vestibulyar sezgirligi bor odam uni to'xtata olmasdi.
   */
  const ctx = await browser.newContext({reducedMotion: 'reduce'});
  const page = await ctx.newPage();
  await seeded(page);
  const actor = page.locator('img[src*="/startup/actors/"]');
  await expect(actor).toBeVisible();
  /*
   * ORALIQDA ham namuna olinadi. Faqat boshi va oxirini solishtirish
   * yetmaydi: yozish kadri 620 ms da almashadi, ya'ni 3 soniyadan keyin
   * poza tasodifan o'sha kadrga qaytib qoladi va qorovul o'chirilgan bo'lsa
   * ham test yashil qolardi — birinchi yozilishida aynan shunday bo'lgan.
   */
  const korilgan = new Set<string>();
  for (let i = 0; i < 25; i++) {
    korilgan.add((await actor.getAttribute('src')) ?? '');
    await page.waitForTimeout(160);
  }
  expect([...korilgan], 'harakat kamaytirilganda poza almashmasligi kerak').toHaveLength(1);
  await ctx.close();
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
