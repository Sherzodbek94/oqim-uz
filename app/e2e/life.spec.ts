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

test('walking, camera and additional business offers are usable',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install({time:new Date('2026-01-01T08:00:00Z')});
  await page.goto('/hayot');await page.getByRole('button',{name:/Biznes egasi/}).click();
  await page.getByRole('button',{name:/Boshlaymiz/}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  const before=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  await page.getByRole('button',{name:'Mening uyim',exact:true}).click();
  await page.clock.runFor(100);
  await expect(page.locator('.life-walker')).toHaveAttribute('data-moving','true');
  await expect(page.getByRole('button',{name:/Mijozlarni jalb qilish/})).toBeDisabled();
  await page.clock.runFor(5000);
  await expect(page.locator('.life-walker')).toHaveAttribute('data-moving','false');
  await page.clock.resume();
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(before);
  await page.getByRole('button',{name:'Xaritani yaqinlashtirish',exact:true}).click();
  await expect(page.getByLabel('Xarita masshtabi')).toHaveText('120%');
  await page.getByRole('button',{name:'Xaritani tiklash',exact:true}).click();
  await expect(page.getByLabel('Xarita masshtabi')).toHaveText('100%');
  await page.getByLabel('Kam harakat',{exact:true}).check();
  await page.getByRole('button',{name:'Mahalla bozori — sizniki',exact:true}).click();
  await page.getByLabel('Biznes taklifini tanlang').selectOption('online');
  await expect(page.getByRole('heading',{name:'Onlayn savdo',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Biznesni sotib olish/}).click();
  await page.getByRole('button',{name:'Tasdiqlash',exact:true}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).businesses.length,SAVE_KEY)).toBe(2);
  await expect(page.getByRole('dialog')).toBeHidden();
  const box=await page.locator('.life-map').boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  await page.screenshot({path:test.info().outputPath('oqim-life-expanded.png'),fullPage:true});
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

test('all nine interiors explain forecasts without spending money or time',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/hayot');await page.getByRole('button',{name:/Biznes egasi/}).click();
  await page.getByRole('button',{name:/Boshlaymiz/}).click();
  const before=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  const groups=[['Mahalla bozori — sizniki',['trade','clothing','online']],['Nonvoyxona',['production','furniture','dairy']],['Dizayn studiyasi',['service','carwash','barber']]] as const;
  for(const [place,sectors] of groups){
    await page.getByRole('button',{name:place,exact:true}).click();
    for(const sector of sectors){
      await page.getByLabel('Biznes taklifini tanlang').selectOption(sector);
      await page.getByRole('button',{name:'Biznes ichiga kirish',exact:true}).click();
      const room=page.getByRole('region',{name:'Biznes ichki sahnasi'});
      await expect(room).toHaveAttribute('data-sector',sector);
      await expect(room.getByRole('button',{name:'Jarayonni ko‘rsatish',exact:true})).toBeDisabled();
      await room.getByRole('button',{name:/3\. Pul tushumi/}).click();
      await expect(room.getByRole('heading',{name:'Pul tushumi',exact:true})).toBeVisible();
      expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(before);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width+1);
      if(sector==='trade')await page.screenshot({path:test.info().outputPath('life-interior.png'),fullPage:true});
      await room.getByRole('button',{name:'Shaharchaga qaytish',exact:true}).click();
    }
  }
});
