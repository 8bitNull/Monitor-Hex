import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try {
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4188');
  assert.equal(await page.locator('.node').count(),6);
  assert(await page.locator('.country-flag').evaluateAll(images=>images.length===6&&images.every(img=>img.complete&&img.naturalWidth>0)));
  await page.locator('#search').fill('Tokyo');assert.equal(await page.locator('.node').count(),1);
  await page.locator('#search').fill('');
  await page.getByRole('button',{name:'筛选节点',exact:true}).click();
  const rect=await page.locator('#sheet').boundingBox();const phone=await page.locator('#app').boundingBox();
  assert(rect.x>=phone.x&&rect.x+rect.width<=phone.x+phone.width+1);
  await page.locator('[data-filter="status"][data-value="离线"]').click();
  await page.getByRole('button',{name:'显示结果'}).click();assert.equal(await page.locator('.node').count(),1);
  await page.locator('.node').click();await page.getByText('尚未收到新的上报').waitFor();
  await page.getByRole('button',{name:'返回节点列表'}).click();await page.locator('#search').waitFor();
  await page.getByRole('button',{name:'筛选节点',exact:true}).click();await page.getByRole('button',{name:'重置',exact:true}).click();await page.getByRole('button',{name:'显示结果'}).click();
  await page.locator('[data-node="1"]').click();
  for(const tab of ['resources','network','info','overview']){await page.locator(`[data-tab="${tab}"]`).first().click();assert.equal(await page.locator(`.detailtabs [data-tab="${tab}"]`).getAttribute('aria-pressed'),'true');}
  await page.locator('[data-tab="network"]').first().click();await page.locator('[data-range="24h"]').click();await page.locator('[data-action="sample"]').click();await page.locator('.sample').waitFor();
  await page.locator('[data-action="compare"]').click();assert.equal(await page.locator('.chart [stroke-dasharray]').count(),1);
  await page.locator('[data-action="routes"]').click();await page.locator('[data-route="China Telecom"]').click();
  const plot=page.locator('.chartbutton');const box=await plot.boundingBox();
  await plot.click({position:{x:39/310*box.width,y:box.height/2}});
  await page.getByText('09/25 09:41 · 模拟采样',{exact:true}).waitFor();
  await plot.focus();await page.keyboard.press('ArrowRight');
  await page.getByText('09/25 10:41 · 模拟采样',{exact:true}).waitFor();
  for(let i=0;i<7;i++)await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('.sample').innerText(),/样本缺失/);
  await page.getByRole('button',{name:'关闭采样详情'}).click();assert.equal(await page.locator('.sample').count(),0);
  await page.getByRole('button',{name:'切换节点'}).click();await page.locator('#sheet [data-node="2"]').click();
  assert.equal(await page.locator('.detailtabs [data-tab="network"]').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'切换节点'}).click();await page.locator('#sheet [data-node="1"]').click();
  assert(await page.locator('#content').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await page.screenshot({path:`design/mobile-app-demo-network-${width}.png`});
  await page.getByRole('button',{name:'返回节点列表'}).click();await page.locator('#search').waitFor();
  await page.locator('[data-page="overview"]').click();await page.getByText('服务器运行概况').waitFor();
  await page.screenshot({path:`design/mobile-app-demo-overview-${width}.png`});
  await page.locator('[data-page="settings"]').click();await page.locator('#dark').check();assert.match(await page.locator('#app').getAttribute('class'),/dark/);
  await page.locator('#density').selectOption('detailed');await page.locator('[data-page="nodes"]').click();assert.equal(await page.locator('.extra').count(),5);
  await page.screenshot({path:`design/mobile-app-demo-dark-${width}.png`});
  await page.locator('[data-page="settings"]').click();await page.locator('[data-action="reset"]').click();await page.locator('[data-page="nodes"]').click();
  await page.locator('#toast').waitFor({state:'hidden'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await page.locator('#content').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await page.screenshot({path:`design/mobile-app-demo-home-${width}.png`});
  console.log(`${width}px: search, filters, offline state, navigation, tabs, charts, routes, dark mode, density, overflow passed`);
  await page.close();
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close()}
