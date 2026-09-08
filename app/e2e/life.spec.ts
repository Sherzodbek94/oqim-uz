import {test,expect} from '@playwright/test';
import {EVENTS,finances,SAVE_KEY} from '../src/oqim-life/engine';
import type {State} from '../src/oqim-life/engine';

test('new life plays a full month and preserves classic save',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('oqim-save-v1','CLASSIC_UNTOUCHED');});
  await page.goto('/hayot');
  await page.getByRole('button',{name:/Yollanma ishchi/}).click();
  await page.getByRole('button',{name:/Boshlaymiz/}).click();
  await page.getByRole('button',{name:/Qo‘shimcha ish/}).click();
  await page.getByRole('button',{name:'Mening uyim',exact:true}).click();
  await page.getByRole('button',{name:/Dam olish.*Quvvat/}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).actions,SAVE_KEY)).toBe(2);
  const event=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).event as string,SAVE_KEY);
  await page.getByRole('button',{name:EVENTS[event].choices[1].label,exact:false}).click();
  await page.getByRole('button',{name:/Dam olish.*Quvvat/}).click();
  await page.getByRole('button',{name:/Dam olish.*Quvvat/}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).actions,SAVE_KEY)).toBe(0);
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!) as State,SAVE_KEY);
  await page.getByRole('button',{name:/Oyni yakunlash/}).click();
  await page.getByRole('button',{name:'Tasdiqlash',exact:true}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).month,SAVE_KEY)).toBe(2);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).cash,SAVE_KEY)).toBe(before.cash+finances(before).flow);
  expect(await page.evaluate(()=>localStorage.getItem('oqim-save-v1'))).toBe('CLASSIC_UNTOUCHED');
  await page.reload();await expect(page.getByText('2-oy',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('business is an interactive map asset with real management',async({page})=>{
  await page.goto('/hayot');await page.getByRole('button',{name:/Biznes egasi/}).click();
  await page.getByRole('button',{name:/Boshlaymiz/}).click();
  await page.getByRole('button',{name:'Mahalla bozori — sizniki',exact:true}).click();
  await page.getByRole('button',{name:/Boshqaruvchi yollash/}).click();
  await page.getByRole('button',{name:'Tasdiqlash',exact:true}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).businesses[0].manager,SAVE_KEY)).toBe(true);
  await page.getByRole('button',{name:'Hisobot',exact:true}).click();
  await expect(page.getByText('Tovar xaridi',{exact:true})).toBeVisible();
  await expect(page.getByText('Ishchilar maoshi',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Shaharcha',exact:true}).click();
  await expect(page.locator('.life-map-art')).toBeVisible();
  expect(await page.locator('.life-map-art').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  await page.screenshot({path:test.info().outputPath('oqim-life.png'),fullPage:true});
});
