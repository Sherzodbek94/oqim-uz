import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { FOUNDER_ART, ROLE_ART } from '../src/pages/startup/roleArt';
import { readdirSync, readFileSync } from 'node:fs';
import { BALANCE, EVENTS, FEMALE_NAMES, NAMES } from '../src/lib/startup/balance';
import type { EventCard } from '../src/lib/startup/types';
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

/**
 * TANLANGAN hodisa kartasi bilan ochilgan varaq.
 *
 * Dvigateldan kartani kutib o'tirmaydi: kartalar seeded RNG bilan tortiladi,
 * ya'ni ayrim kartalar tasodifiy partiyada oylab chiqmasligi mumkin — va
 * aynan shunday kartalarning rangi buzilgandi. Shuning uchun saqlanmaga
 * `phase: "event"` va kerakli karta TO'G'RIDAN-TO'G'RI yoziladi.
 *
 * `addInitScript` EMAS, `goto` + yozish + `reload`. Init-skript HAR navigatsiyada
 * ishlaydi va halqada CHAQIRUVLAR TO'PLANADI: birinchi kartaning skripti
 * saqlanmani birinchi bo'lib to'ldirib, keyingi hamma iteratsiyada o'sha
 * kartani ko'rsatib turardi. Natijada halqa o'n besh marta aylanib, aslida
 * bitta kartani tekshirardi — mutatsiya testi buni ochdi.
 *
 * `seeded` dan farqli — navigatsiyani kutmaydi: varaq ochiq bo'lganda ortidagi
 * hamma narsa `aria-hidden`, ya'ni `getByRole('navigation')` uni ko'rmaydi.
 */
async function seededEvent(page: Page, key: string, state: unknown, ev: EventCard) {
  await page.goto('/startap');
  await page.evaluate(({key, state}) => localStorage.setItem(key, JSON.stringify(state)),
    {key, state: {...(state as object), phase: 'event', pendingEvent: ev}});
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  /* Qorovul: AYNAN shu karta ochilganini tasdiqlaydi — yuqoridagi xato jim o'tib ketgandi. */
  await expect(page.getByRole('dialog').getByRole('heading', {name: ev.title}).first()).toBeAttached();
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

  /*
   * Yangi partiya YO'L-YO'RIQ bilan boshlanadi. U modal varaq, ya'ni ortidagi
   * hamma narsa `aria-hidden` bo'ladi va navigatsiya rol bo'yicha topilmaydi —
   * shuning uchun avval yopiladi. (Yo'riqning o'zi alohida testda tekshiriladi.)
   */
  const guide = page.getByRole('dialog', {name: "Boshlang'ich yo'l-yo'riq"});
  await expect(guide).toBeVisible();
  await guide.getByRole('button', {name: /Tushundim/}).click();
  await expect(guide).toBeHidden();

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
   * Personaj — 16 kadrli sprite varaq, `background-position-x` bilan
   * siljiydi. HAMMA kadr ko'rinishi tekshiriladi: `steps(16)` (ya'ni
   * `jump-none` siz) qiymatlarni k/16 da beradi va kadr chegaralariga
   * tushmaydi — ekranda ikkita personaj yonma-yon ko'rinardi. To'g'ri
   * sozlamada 16 ta aniq qiymat chiqadi.
   */
  const actor = page.locator('.oq-actor');
  await expect(actor).toBeVisible();
  const kadrlar = new Set<string>();
  for (let i = 0; i < 70; i++) {
    kadrlar.add(await actor.evaluate(e => getComputedStyle(e).backgroundPositionX));
    await page.waitForTimeout(40);
  }
  expect(kadrlar.size, `kadrlar almashmadi: ${[...kadrlar].join(', ')}`).toBe(16);

  /*
   * SON YETMAYDI, QIYMAT MUHIM. `steps(16)` ham o'n olti xil qiymat beradi
   * — faqat ular k/16 da, kadrlar ORASIDA. Kadr chegarasi k/15, ya'ni
   * 6.6667% ning karralari; shu tekshiruvsiz ikkita personaj yonma-yon
   * ko'ringan build ham yashil o'tardi (mutatsiyada aynan shunday bo'ldi).
   */
  const QADAM = 100 / (16 - 1);
  const notogri = [...kadrlar].filter(v => {
    const p = parseFloat(v);
    return Math.abs(p / QADAM - Math.round(p / QADAM)) > 0.02;
  });
  expect(notogri, `kadr chegarasiga tushmagan qiymatlar: ${notogri.join(', ')}`).toEqual([]);
  await ctx.close();
});

test('the garage scene holds still when motion is reduced', async ({browser}) => {
  /*
   * `prefers-reduced-motion` — bu qulaylik emas, zarurat: sahna to'xtovsiz
   * aylanadi va vestibulyar sezgirligi bor odam uni to'xtata olmasdi.
   * To'xtatish `index.css` dagi umumiy blokda, shuning uchun bu yerda
   * aynan NATIJA o'lchanadi.
   */
  const ctx = await browser.newContext({reducedMotion: 'reduce'});
  const page = await ctx.newPage();
  await seeded(page);
  const actor = page.locator('.oq-actor');
  await expect(actor).toBeVisible();
  const kadrlar = new Set<string>();
  for (let i = 0; i < 25; i++) {
    kadrlar.add(await actor.evaluate(e => getComputedStyle(e).backgroundPositionX));
    await page.waitForTimeout(120);
  }
  expect([...kadrlar], 'harakat kamaytirilganda kadr almashmasligi kerak').toHaveLength(1);
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

/** «… kayfiyat 70» / «Kayfiyat 70» satridan raqamni ajratadi. */
function moraleIn(text: string): number {
  const m = /kayfiyat (\d+)/i.exec(text);
  if (!m) throw new Error(`kayfiyat raqami topilmadi: ${text}`);
  return Number(m[1]);
}

test('the monthly report and the office header agree on morale', async ({page}) => {
  /*
   * Ilgari o'rtacha kayfiyat IKKI joyda alohida hisoblanardi va xodim yo'q
   * holatda ikki xil zaxiraga tushardi: sarlavha 70, hisobot 100. O'yinchi
   * birinchi xodimni yollagunicha har oy shu ziddiyatni ko'rardi.
   *
   * Endi ikkalasi `engine.teamMorale` dan oladi. Bu test o'sha yagona
   * manbani emas, NATIJANI o'lchaydi: kelajakda kimdir yana o'z hisobini
   * yozsa, funksiya joyida qolgani testni yashil qilib qo'ymaydi.
   */
  await seeded(page);
  await page.getByRole('button', {name: /Oyni yakunlash/}).click();
  await page.getByRole('dialog').getByRole('button').first().click();

  const report = page.getByRole('dialog', {name: '1-oy hisoboti'});
  const inReport = moraleIn(await report.getByText(/kayfiyat \d+/).innerText());
  await page.getByRole('button', {name: /2-oyga o'tish/}).click();
  await expect(report).toBeHidden();

  const inHeader = moraleIn(await page.getByText(/^Kayfiyat \d+$/).innerText());
  expect(inReport, `hisobot ${inReport}, sarlavha ${inHeader}`).toBe(inHeader);

  /*
   * Zaxira qiymatning O'ZI ham tekshiriladi, aks holda ikkalasi 100 ga
   * ketib ham kelishardi. Yangi xodim `moraleBase` bilan keladi — yolg'iz
   * asoschi 100 da tursa, birinchi yollash kayfiyat qulagandek ko'rinardi.
   * Chegara ATAYLAB keng: bu raqamni qulflamaydi, jarlikni taqiqlaydi.
   */
  expect(Math.abs(inHeader - BALANCE.moraleBase), `yolg'iz ${inHeader}, birinchi xodim ${BALANCE.moraleBase}`).toBeLessThanOrEqual(20);
});

test('every office render ships for a reason', async () => {
  /*
   * `level0.webp` jonli sahnaga o'tilgach yetim qolgandi: `OfficeScene` 0-daraja
   * uchun `LiveOffice` ni qaytarib, `ART[0]` ga umuman yetib bormasdi — rasm esa
   * har deploy'da 24 KB bo'lib chiqib turardi. Tipdagi `Exclude` uni kodga
   * qaytarishdan saqlaydi; bu test TESKARI tomonni qo'riqlaydi — `public/` ga
   * tashlangan, hech kim so'ramaydigan faylni.
   */
  const used = ['src/pages/startup/OfficeScene.tsx', 'src/pages/startup/LiveOffice.tsx']
    .map(f => readFileSync(f, 'utf8')).join('\n');
  const orphans = readdirSync('public/startup/office').filter(f => !used.includes(`/startup/office/${f}`));
  expect(orphans, `hech kim ishlatmaydigan rasm: ${orphans.join(', ')}`).toEqual([]);
});

type Kontrast = { text: string; fontPx: number; ratio: number; required: number; bg: string };

/**
 * Ichidagi HAR BIR matnli tugun uchun WCAG 2 kontrast nisbatini qaytaradi.
 *
 * `axe` ning O'ZI yetarli emas: matn rangi shaffof bo'lsa (`text-white/85`),
 * u ba'zi tugunlarni «incomplete» deb belgilaydi va ular nosozlik hisobiga
 * KIRMAYDI — ya'ni faqat `violations` ga qaralsa, buzilgan rang testdan jim
 * o'tib ketardi. Shuning uchun nisbat shu yerda hisoblangan uslublardan
 * qayta o'lchanadi: alfa ota-onaning to'liq rangi ustiga qo'shiladi.
 *
 * Fon aniqlanmasa `ratio: -1` qaytadi va test uni xato deb sanaydi —
 * o'lchanmagan tugun «o'tdi» degani emas.
 */
async function kontrast(scope: Locator): Promise<Kontrast[]> {
  return scope.evaluate((root: HTMLElement) => {
    const srgb = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    const lum = (c: number[]) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);
    const nums = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);

    const mix = (fg: number[], a: number, bg: number[]) => [0, 1, 2].map(i => a * fg[i] + (1 - a) * bg[i]);

    /*
     * Tugun ostida HAQIQATDAN bo'yaladigan fon(lar).
     *
     * Uch narsani hisobga oladi, chunki uchalasi ham shu loyihada nosozlikni
     * YASHIRGAN:
     *
     * 1. SHAFFOF QOPLAMALAR. HUD plitkasi `bg-black/10` — o'zi fon emas,
     *    ostidagini o'zgartiradi. Ilgari faqat «birinchi to'liq rang»
     *    qidirilardi va qoplama e'tiborsiz qolardi.
     * 2. GRADIENTLAR. `axe` gradient ustidagi matnni «incomplete» deb
     *    belgilaydi va u NOSOZLIK HISOBIGA KIRMAYDI — startap HUD'idagi
     *    2.22 lik «Oylik oqim» aynan shu bo'shliqdan o'tib ketgandi.
     *    Bu yerda gradientning HAMMA to'xtashi nomzod fon sifatida
     *    qaytariladi va eng yomoni olinadi.
     * 3. OTA-ONA SHAFFOFLIGI. `framer-motion` varaqni `opacity: 0 -> 1`
     *    bilan chiqaradi; yarim yo'lda o'lchangan rang haqiqiy emas
     *    (0.91 da #24604A ekranda #386e59 bo'lib chiqdi). Bunda o'lchov
     *    bekor qilinadi.
     *
     * Hech biri aniqlanmasa `null` — chaqiruvchi buni «o'tdi» emas, XATO
     * deb sanaydi.
     */
    const fonlar = (el: HTMLElement): number[][] | null => {
      /*
       * SHAFFOFLIK BUTUN ZANJIR bo'ylab alohida tekshiriladi, fon qidiruvi
       * bilan birga emas.
       *
       * Sababi o'lchab topildi: hisobot sarlavhasining foni `bg-clay-700` —
       * to'liq rang, ya'ni qidiruv DARHOL to'xtaydi va animatsiya qilinuvchi
       * `motion.div` ga yetib bormaydi. Natijada test yarim yo'lda o'lchab
       * «o'tdi» deb qo'yardi; to'liq to'plam yuklamada ishga tushganda `axe`
       * o'sha tugunni 3.56 deb ko'rsatdi (emerald-700 ning 0.71 shaffofligi).
       */
      for (let n: HTMLElement | null = el; n; n = n.parentElement) {
        if (Number(getComputedStyle(n).opacity) < 1) return null;
      }
      const ustki: { c: number[]; a: number }[] = [];
      const qo11a = (baza: number[]) => {
        /* Bo'yash tashqaridan ichkariga: yuqoriga yurib yig'ilgani teskari qo'llanadi. */
        let b = baza;
        for (const o of ustki.slice().reverse()) b = mix(o.c, o.a, b);
        return b;
      };
      for (let n: HTMLElement | null = el; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        const bc = nums(s.backgroundColor);
        const alfa = bc.length >= 4 ? bc[3] : 1;
        if (s.backgroundImage !== 'none') {
          const stops = (s.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).map(nums).filter(c => c.length >= 3);
          if (!stops.length) return null;   // rasm yoki `conic` — o'lchab bo'lmaydi
          return stops.map(st => qo11a(st.slice(0, 3)));
        }
        if (bc.length >= 3 && alfa > 0 && alfa < 1) { ustki.push({ c: bc.slice(0, 3), a: alfa }); continue; }
        if (bc.length >= 3 && alfa === 1) return [qo11a(bc.slice(0, 3))];
      }
      return null;
    };

    const rows: Kontrast[] = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      /* Faqat O'Z matni bor tugunlar — o'ram elementlar matnni ikki marta sanardi. */
      if (!Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent ?? '').trim())) continue;
      const st = getComputedStyle(el);
      const text = (el.textContent ?? '').trim().slice(0, 40);
      const bgs = fonlar(el);
      if (!bgs) { rows.push({ text, fontPx: 0, ratio: -1, required: 0, bg: "noma'lum" }); continue; }
      const fg = nums(st.color);
      const a = fg[3] ?? 1;
      const fontPx = parseFloat(st.fontSize);
      /* AA: 24px dan katta, yoki 18.66px dan katta va qalin — 3:1; qolgani 4.5:1. */
      const large = fontPx >= 24 || (fontPx >= 18.66 && Number(st.fontWeight) >= 700);
      /* Gradientda matn har qanday to'xtash ustiga tushishi mumkin — eng yomoni olinadi. */
      let eng = Infinity, engBg = bgs[0];
      for (const bg of bgs) {
        const l1 = lum(mix(fg, a, bg)), l2 = lum(bg);
        const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (r < eng) { eng = r; engBg = bg; }
      }
      rows.push({
        text, fontPx,
        ratio: Math.round(eng * 100) / 100,
        required: large ? 3 : 4.5,
        bg: `rgb(${engBg.map(Math.round).join(',')})`,
      });
    }
    return rows;
  });
}

/**
 * Animatsiya tugab, doiradagi HAR BIR tugun o'lchanadigan bo'lguncha kutadi.
 *
 * `framer-motion` varaqni `opacity: 0 -> 1` bilan chiqaradi va shaffoflik
 * o'rami MATN TUGUNLARIDAN YUQORIDA, lekin varaqning ildizidan PASTDA —
 * ya'ni varaqning o'zida shaffoflikni kutish yetarli emas (birinchi urinishda
 * aynan shu sababdan varaqdagi hamma tugun «noma'lum» chiqdi). Shuning uchun
 * o'lchovning O'ZI takrorlanadi: `ratio < 0` qolmaguncha.
 *
 * Haqiqatan o'lchab bo'lmaydigan fon bo'lsa (masalan rasm) bu kutish
 * uziladi — va bu to'g'ri natija: o'lchanmagan tugun «o'tdi» degani emas.
 */
async function kontrastTinch(scope: Locator, minRows: number): Promise<Kontrast[]> {
  let rows: Kontrast[] = [];
  await expect.poll(async () => {
    rows = await kontrast(scope);
    if (rows.length < minRows) return `faqat ${rows.length} tugun (kamida ${minRows} kutilgan)`;
    const yoq = rows.filter(r => r.ratio < 0);
    return yoq.length ? `${yoq.length} tugun fonini aniqlab bo'lmadi: ${yoq.map(r => `"${r.text}"`).join(', ')}` : 'ok';
  }).toBe('ok');
  return rows;
}

test('the monthly report header meets AA contrast in both cash states', async ({page}) => {
  /*
   * Ilgari MANFIY oyda sarlavha `clay-600` ustidagi `white/70` va `white/80`
   * bilan 3.16 va 3.62 berardi. Yashil oyda o'sha `white/70` 4.54 bilan
   * zo'rg'a o'tardi, ya'ni sog'lom partiyani sinagan hech kim buni ko'rmasdi:
   * nosozlik faqat pul minusga ketgan oyda chiqardi.
   *
   * Seed 1 ning birinchi kartasi IKKALA holatni ham beradi — tanlov[0]
   * generator sotib oladi (−11,5 mln), tanlov[2] chidab turadi (+2,9 mln) —
   * shuning uchun ikkala sarlavha bitta fixture bilan tekshiriladi.
   */
  const bgs: string[] = [];
  for (const [tanlov, kutilgan] of [[0, 'manfiy'], [2, 'ijobiy']] as const) {
    /* Saqlanmani tozalab qayta seed qilamiz — `seeded` bo'sh xotiraga yozadi. */
    await page.goto('/startap').catch(() => {});
    await page.evaluate(() => localStorage.clear()).catch(() => {});
    await seeded(page);

    await page.getByRole('button', {name: /Oyni yakunlash/}).click();
    await page.getByRole('dialog').getByRole('button').nth(tanlov).click();
    const report = page.getByRole('dialog', {name: '1-oy hisoboti'});
    await expect(report).toBeVisible();

    const head = report.getByText("Naqd o'zgarishi").locator('..');
    const rows = await kontrastTinch(head, 3);
    bgs.push(await head.evaluate(e => getComputedStyle(e).backgroundColor));
    const bad = rows.filter(r => r.ratio < r.required);
    expect(bad, `${kutilgan}: ${bad.map(b => `"${b.text}" ${b.ratio}:1 < ${b.required} (${b.fontPx}px, ${b.bg})`).join(' | ')}`).toEqual([]);

    /*
     * `axe` qo'shimcha qarovul — nisbatdan boshqa qoidalarni ham ko'radi
     * (rollar, nomlar, `aria-*`). BIR MARTA ishlatiladi: ikkala holatda
     * varaqning tuzilishi bir xil, farq faqat rangda — rangni esa yuqoridagi
     * o'lchov aniqroq tekshiradi. Axe sahifaga o'zini yuklaydi va bu og'ir
     * qadam; ikki marta chaqirilganda render jarayoni yiqilardi.
     */
    if (tanlov === 0) {
      const res = await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const nomi = res.violations.flatMap(v => v.nodes.map(n => `${v.id} @ ${n.target.join(' ')} :: ${n.failureSummary?.replace(/\s+/g, ' ').slice(0, 160)}`));
      expect(nomi, `${kutilgan}: ${nomi.join(' || ')}`).toEqual([]);
    }
  }

  /* Ikkala YO'L ham yurilganiga ishonch: aks holda test bitta rangni ikki marta tekshirardi. */
  expect(bgs[0], `ikkala hisobot ham bir xil fonda: ${bgs[0]}`).not.toBe(bgs[1]);
});

/*
 * Har bir tab — ALOHIDA test, bitta halqa emas.
 *
 * Ilgari to'rttasi bitta testda edi va to'rt marta ketma-ket to'liq axe
 * skani render jarayonini yiqitardi («Target crashed», to'plamda muntazam
 * «flaky»). Alohida testda har biri toza sahifa oladi va bitta skan bajaradi.
 * Yon foyda: yiqilsa, QAYSI tab ekani test nomida turadi.
 *
 * `text-ink-400` (#8A9992) krem fonda 2.81 berardi va axe buni har bir tab'da
 * «serious» deb belgilardi: pastki navigatsiyaning uchta faol bo'lmagan
 * yorlig'i, «Prognoz» qatori, «Hozircha yolg'izsiz…» maslahati. Token
 * quyuqlashtirildi (#5C6E67); bu testlar uni joyida ushlab turadi.
 */
for (const tab of ['Ofis', 'Moliya', 'Jamoa', 'Mahsulot']) {
  test(`the ${tab} tab passes AA colour contrast`, async ({page}) => {
    await seeded(page);
    await page.getByRole('button', {name: tab, exact: true}).click();
    await expect(page.getByRole('button', {name: tab, exact: true})).toHaveAttribute('aria-current', 'page');

    /* Skanerlash TO'LIQ sahifa bo'yicha: nosozlik varaqlar ORTIDAGI doimiy tartibda edi. */
    const res = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const bad = res.violations.flatMap(v => v.nodes.map(n => {
      const r = /contrast of ([\d.]+)/.exec(n.failureSummary ?? '');
      return `${tab}/${v.id}${r ? ` ${r[1]}:1` : ''} @ ${n.target.join(' ')}`;
    }));
    expect(bad, bad.join(' || ')).toEqual([]);

    /*
     * HUD alohida o'lchanadi va `axe` ga ISHONILMAYDI. Sarlavha
     * `bg-gradient-emerald` ustida turadi, gradient esa `axe` uchun
     * «incomplete» — ya'ni `violations` bo'sh bo'lgani bilan u yerdagi matn
     * tekshirilmagan qoladi. Aynan shu bo'shliqdan uchta yorliq (3.68–4.46)
     * va «Oylik oqim» qiymati (2.22) o'tib ketgandi.
     */
    const rows = await kontrastTinch(page.getByRole('banner'), 6);
    const hudBad = rows.filter(r => r.ratio < r.required);
    expect(hudBad, `${tab} HUD: ${hudBad.map(b => `"${b.text}" ${b.ratio}:1 < ${b.required} (${b.fontPx}px, ${b.bg})`).join(' | ')}`).toEqual([]);
  });
}

test('every event card renders at AA contrast', async ({page}) => {
  /*
   * HAR BIR karta ochiladi, turiga bitta vakil emas.
   *
   * Avval turlar bo'yicha bittadan olinardi va test YOLG'ON YASHIL bo'ldi:
   * har turning birinchi kartasida tanlovlar (yoki ularning `sub` yozuvi)
   * bo'lmasligi mumkin, ya'ni oltin tugmaning ostki yozuvi umuman
   * chizilmasdi — `emerald-900/70` ni 2.42 ga qaytarib qo'yganda ham test
   * o'tib ketdi. Endi ro'yxat to'liq, va ostki yozuv haqiqatan
   * O'LCHANGANI alohida tasdiqlanadi.
   *
   * Qamrov: har turning yorlig'i (`KIND` dagi rang — `mixed` `gold-600`
   * bilan 3.09 berardi) va oltin tugmaning ikkala qatori. Ikkinchisi `axe`
   * uchun ko'rinmas edi: gradient ustidagi matn «incomplete» deb belgilanadi
   * va nosozlik hisobiga kirmaydi.
   */
  const kinds = new Set<string>();
  let subsMeasured = 0;
  /* Fixture bir marta yasaladi — esbuild'ni o'n besh marta yugurtirish shart emas. */
  const {key, state} = await fixture();

  for (const ev of EVENTS) {
    await seededEvent(page, key, state, ev);
    kinds.add(ev.kind);

    const rows = await kontrastTinch(page.getByRole('dialog'), 4);
    const bad = rows.filter(r => r.ratio < r.required);
    expect(bad, `${ev.id} (${ev.kind}): ${bad.map(b => `"${b.text}" ${b.ratio}:1 < ${b.required} (${b.fontPx}px, ${b.bg})`).join(' | ')}`).toEqual([]);

    /* Oltin tugma ostki yozuvi chizilgan bo'lsa — u o'lchovga TUSHGANINI tasdiqlaymiz. */
    const sub = ev.choices?.[0]?.sub;
    if (sub) {
      const bosh = sub.slice(0, 18);
      expect(rows.some(r => r.text.startsWith(bosh)), `${ev.id}: "${bosh}…" o'lchovga tushmadi`).toBe(true);
      subsMeasured++;
    }
  }

  /* Qorovulning qorovuli: ostki yozuv birorta kartada ham o'lchanmasa, test tishsiz. */
  expect(subsMeasured, "hech bir kartada oltin tugma ostki yozuvi o'lchanmadi").toBeGreaterThan(0);
  expect(kinds.size, 'hodisa turlari qamrovi').toBeGreaterThanOrEqual(4);
});

/** Sozlash ekranidan haqiqiy yangi partiya boshlaydi (saqlanma seed qilmasdan). */
async function yangiPartiya(page: Page) {
  await page.goto('/startap');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/startap');
  await page.getByPlaceholder(/masalan/i).fill(NAME);
  await page.getByRole('button', {name: /Startapni boshlash/}).click();
}

test('a new run opens the guide once and a resumed run does not', async ({page}) => {
  /*
   * `/startap` da yo'l-yo'riq YO'Q edi — `src/pages/startup/` bo'ylab
   * `tutorial|yo'riq|onboard` qidiruvi hech narsa topmasdi, klassik o'yinda
   * esa bor. Kirgan o'yinchi nimadan boshlashni bilmasdi.
   *
   * Oyna saqlanmaga bayroq yozmaydi — u YANGI partiyaga bog'langan.
   * Shuning uchun test ikkala tomonni ham tekshiradi: yangi partiyada
   * chiqishi VA tiklangan saqlanmada chiqmasligi. Ikkinchisi bo'lmasa,
   * oyna har ochilganda chiqib, halaqit berardi.
   */
  await yangiPartiya(page);

  const guide = page.getByRole('dialog', {name: "Boshlang'ich yo'l-yo'riq"});
  await expect(guide).toBeVisible();
  /* To'rt qadam — matnning o'zi emas, ularning BORLIGI qo'riqlanadi. */
  await expect(guide.getByRole('listitem')).toHaveCount(4);

  const rows = await kontrastTinch(guide, 6);
  const bad = rows.filter(r => r.ratio < r.required);
  expect(bad, `yo'l-yo'riq: ${bad.map(b => `"${b.text}" ${b.ratio}:1 < ${b.required}`).join(' | ')}`).toEqual([]);

  await guide.getByRole('button', {name: /Tushundim/}).click();
  await expect(guide).toBeHidden();
  await expect(page.getByRole('navigation', {name: "Bo'limlar"})).toBeVisible();

  /* Tiklangan saqlanmada CHIQMASLIGI kerak. */
  await page.reload();
  await expect(page.getByRole('navigation', {name: "Bo'limlar"})).toBeVisible();
  await expect(page.getByRole('dialog', {name: "Boshlang'ich yo'l-yo'riq"})).toHaveCount(0);
});

test('the restart button asks first and only then wipes the run', async ({page}) => {
  /*
   * `restart()` bor edi, lekin FAQAT `EndOverlay` ga ulangandi — ya'ni
   * partiyani g'alaba yoki bankrotlikdan oldin qayta boshlashning hech
   * qanday yo'li yo'q edi. Endi HUD da tugma bor.
   *
   * Amal qaytarilmas (`clearStartup()` saqlanmani o'chiradi), shuning uchun
   * test IKKALA tomonni ham qo'riqlaydi: bekor qilinganda partiya
   * BUZILMASLIGI va tasdiqlanganda haqiqatan o'chishi.
   */
  await seeded(page);
  /* Oyni yakunlab, 2-oyga o'tamiz — «o'chdi» ni «o'chmadi» dan ajratish uchun. */
  await page.getByRole('button', {name: /Oyni yakunlash/}).click();
  await page.getByRole('dialog').getByRole('button').first().click();
  await page.getByRole('button', {name: /2-oyga o'tish/}).click();
  await expect(page.getByRole('banner').getByText('2-oy')).toBeVisible();

  const tugma = page.getByRole('button', {name: 'Partiyani qayta boshlash'});
  await expect(tugma).toBeVisible();

  await tugma.click();
  const ask = page.getByRole('dialog', {name: 'Partiyani qayta boshlash'});
  await expect(ask).toBeVisible();
  /* Nimani yo'qotishi ko'rinib tursin — tasdiqlash ma'nosi shunda. */
  await expect(ask.getByText(new RegExp(NAME))).toBeVisible();
  await expect(ask.getByText(/2-oy/)).toBeVisible();

  const rows = await kontrastTinch(ask, 4);
  const bad = rows.filter(r => r.ratio < r.required);
  expect(bad, `tasdiqlash: ${bad.map(b => `"${b.text}" ${b.ratio}:1 < ${b.required} (${b.bg})`).join(' | ')}`).toEqual([]);

  /* 1) BEKOR QILISH partiyani buzmasligi kerak. */
  await ask.getByRole('button', {name: /Bekor qilish/}).click();
  await expect(ask).toBeHidden();
  await expect(page.getByRole('banner').getByText('2-oy')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('oqim-startup-v1') ?? '{}').month)).toBe(2);

  /* 2) TASDIQLASH saqlanmani o'chirib, sozlash ekraniga qaytarishi kerak. */
  await tugma.click();
  await page.getByRole('dialog', {name: 'Partiyani qayta boshlash'}).getByRole('button', {name: /Ha, yangi startap/}).click();
  await expect(page.getByPlaceholder(/masalan/i)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('oqim-startup-v1'))).toBeNull();
});
