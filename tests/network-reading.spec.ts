import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page){
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,homeRoutes:3,modules:{map:false}})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const ts=Math.floor(Date.now()/1000),d=metrics();return r.fulfill({json:{...d,probes:{1:'Tokyo primary route',2:'Hong Kong backup route',3:'No packet statistics'},loss:{1:2.5,2:0},ping:[1,2,3].flatMap(id=>[{task_id:id,ts:ts-180,latency:0,loss:0},{task_id:id,ts:ts-120,latency:21,loss:undefined},{task_id:id,ts:ts-60,latency:null,loss:id===3?undefined:100},{task_id:id,ts,latency:28,loss:id===3?undefined:25}])}})})
}
for(const width of [320,390,720,900,1440])test(`network readings fit in both languages and themes at ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:1000});await setup(page)
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);const p=JSON.parse(localStorage.getItem('monitor-next')!);localStorage.setItem('monitor-next',JSON.stringify({...p,appearance}))},{language,appearance})
  await page.goto('/');const card=page.locator('.node-card');await expect(card.locator('.ping-probe')).toHaveCount(3)
  await expect(card.locator('.micro-trend')).toHaveCount(1);await expect(card.locator('.micro-timeout')).toHaveCount(1)
  await expect(card.locator('.speed-direction')).toHaveText(language==='zh'?['上行','下行']:['Upload','Download'])
  const controls=card.locator('.latency-link');for(const button of await controls.all()){await button.scrollIntoViewIfNeeded();const b=(await button.boundingBox())!;expect(await button.evaluate((el,{x,y})=>el.contains(document.elementFromPoint(x,y)),{x:b.x+b.width/2,y:b.y+b.height/2})).toBeTruthy()}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  if(language==='zh'&&appearance==='light')await card.screenshot({path:`tests/artifacts/v012/home-${width}.png`})
  await page.goto('/node/1?routes=1,2,3#latency');await expect(page.locator('.loss-track')).toBeVisible();await expect(page.locator('.detail-speed .micro-trend')).toHaveCount(2)
  const select=page.locator('.loss-track select');await select.selectOption('2');await expect(select).toHaveValue('2')
  await page.locator('.detail-probe-legend>summary').click();await expect(page.locator('.probe-label').first()).toHaveCSS('text-overflow','ellipsis');await page.keyboard.press('Escape')
  const billing=page.locator('.detail-fact-groups>section').nth(2)
  if(width<900){await page.locator('.detail-facts-toggle').click();await billing.locator('summary').click()}
  const status=(await billing.locator('.billing-status').boundingBox())!,facts=(await billing.locator('dl').boundingBox())!;expect(status.y).toBeGreaterThan(facts.y+facts.height)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  if(language==='zh'&&appearance==='light')await page.locator('.detail-history').screenshot({path:`tests/artifacts/v012/latency-${width}.png`})
 }
 expect(errors).toEqual([])
})
test('loss timeline preserves zero, unknown and timeout and follows selected routes',async({page})=>{
 await setup(page);await page.goto('/node/1?routes=1,2,3#latency')
 const track=page.locator('.loss-track'),reading=track.locator('.loss-track-reading'),slider=track.locator('input')
 await expect(reading).toContainText('25%');await expect(track.locator('rect')).toHaveCount(2)
 await slider.focus();await page.keyboard.press('Home');await expect(reading).toContainText('0 ms');await expect(reading).toContainText('丢包 0%')
 await page.keyboard.press('ArrowRight');await expect(reading).toContainText('丢包 —')
 await page.keyboard.press('ArrowRight');await expect(reading).toContainText('超时');await expect(reading).toContainText('100%')
 await track.locator('select').selectOption('3');await expect(reading).toContainText('丢包 —')
 await page.locator('.detail-probe-legend>summary').click();await page.getByRole('button',{name:'No packet statistics',exact:true}).click();await page.keyboard.press('Escape');await expect(track.locator('select')).toHaveValue('1')
 await page.locator('.detail-probe-legend>summary').click();await page.getByRole('button',{name:'Hong Kong backup route',exact:true}).click();await page.keyboard.press('Escape');await expect(track.locator('select')).toHaveCount(0);await expect(track).toContainText('Tokyo primary route')
 await page.getByRole('button',{name:'1 小时',exact:true}).click();await expect(reading).toContainText('25%')
})
test('live trends accumulate real reports and clear on offline state',async({page})=>{
 await page.clock.install();await setup(page);let count=0,offline=false;const ts=Math.floor(Date.now()/1000)
 await page.unroute('**/api/nodes');await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,last_seen:ts+count*5,online:!offline,metrics:{...n.metrics,net_tx:0,net_rx:1024*count}}]}})})
 await page.goto('/node/1');const speed=page.locator('.detail-speed');await expect(speed.locator('.micro-empty')).toHaveCount(2)
 count++;await page.clock.runFor(5100);await expect(speed.locator('.micro-empty')).toHaveCount(0);await expect(speed.locator('.upload .speed-amount')).toHaveText('0')
 expect(await speed.locator('.upload .micro-trend path').first().getAttribute('d')).toContain('L')
 offline=true;await page.clock.runFor(5100);await expect(speed.locator('.speed-amount').first()).toHaveText('—');await expect(speed.locator('.micro-trend circle')).toHaveCount(0)
})
