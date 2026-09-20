import {toggleSettings,visualSelect} from './settings'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
const twoProbes=()=>{const ts=Math.floor(Date.now()/1000);return {ping:[{task_id:1,ts,latency:20},{task_id:2,ts,latency:180}],probes:{'1':'Route A','2':'Route B'},loss:{'1':0,'2':5}}}
test('single route follows global comparison selection',async({page})=>{
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:twoProbes()}))
 await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card.locator('.ping-probe')).toHaveCount(1)
 await expect(card.getByLabel('节点探测线路')).toBeVisible()
 await toggleSettings(page)
 await page.getByLabel('主要探测线路').selectOption('2')
 await toggleSettings(page)
 await expect(card.locator('.ping-probe')).toHaveCount(1)
 await page.getByLabel('表格视图').click()
 await expect(page.locator('.table-ping').first()).toContainText('180 ms')
 await page.reload()
 await expect(page.locator('.table-ping').first()).toContainText('180 ms')
})

test('legacy layout imports use the unified design at both densities',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({cardLayout:'modern',graph:'ring'})))
 await page.goto('/')
 await page.setViewportSize({width:390,height:900})
 await expect(page.locator('.next-theme')).toHaveAttribute('data-card-layout','modern')
 await toggleSettings(page)
 await expect(page.getByLabel('手机布局')).toHaveCount(0)
 await expect(page.getByLabel('视觉风格')).toHaveCount(0)
 await visualSelect(page,'layout','compact')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-layout','compact')
 await page.setViewportSize({width:1440,height:1000})
 await visualSelect(page,'layout','comfortable')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-layout','comfortable')
 await toggleSettings(page)
 for(const language of ['zh','en']) {
  await page.getByLabel('Language / 语言').selectOption(language)
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:1000})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  }
 }
})
test('automatic refresh shares the two-request limit and reports failures',async({page})=>{
 await page.clock.install()
 let batch=false,active=0,peak=0,completed=0
 await page.route('**/api/nodes/*/metrics?*',async r=>{
  active++;peak=Math.max(peak,active)
  await new Promise(resolve=>setTimeout(resolve,70))
  const fail=batch&&r.request().url().includes('/nodes/3/')
  await r.fulfill(fail?{status:503,body:'unavailable'}:{json:twoProbes()})
  active--;completed++
 })
 await page.setViewportSize({width:1440,height:2200})
 await page.goto('/')
 await expect.poll(()=>completed).toBe(6)
 batch=true;peak=0
 await page.clock.runFor(60001)
 await expect.poll(()=>completed).toBe(12)
 expect(peak).toBeLessThanOrEqual(2)
 await expect(page.locator('.node-card').nth(2)).toContainText('更新失败')
})
test('detail exposes sample coverage and keeps timeout and long gaps disconnected',async({page})=>{
 const ts=Math.floor(Date.now()/1000)-15000
 const data={...metrics(),ping:[0,60,120,180,240,12000,12060].map((t,i)=>({task_id:1,ts:ts+t,latency:i===2?null:20+i})),probes:{'1':'Route A'},loss:{'1':12}}
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:data}))
 await page.goto('/node/1')
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 await expect(page.locator('.sample-coverage')).toHaveCount(0)
 await expect.poll(async()=>{const paths=await page.locator('.recharts-line-curve').getAttribute('d');return(paths?.match(/M/g)||[]).length}).toBe(3)
 await page.getByRole('button',{name:'隐藏全部线路'}).click()
 await expect(page.getByText('没有选中任何探测')).toBeVisible()
 await page.getByRole('button',{name:'显示全部线路'}).click()
 await expect(page.locator('.recharts-line-curve')).toBeVisible()
})
test('render failure offers safe recovery without exposing node data',async({page})=>{
 let push:((value:string)=>void)|undefined
 await page.routeWebSocket('**/api/ws',ws=>{push=d=>ws.send(d)})
 await page.goto('/')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await page.evaluate(()=>{Number.prototype.toFixed=()=>{throw new Error('private diagnostic should not be displayed')}})
 push!(JSON.stringify({nodes:nodes()}))
 await expect(page.getByRole('alert')).toContainText('页面显示异常')
 await expect(page.getByRole('alert')).not.toContainText('private diagnostic')
 await page.getByRole('button',{name:'刷新',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(6)
})

test('single route remains usable with blocked storage',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')}})
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:twoProbes()}))
 await page.goto('/')
 await expect(page.locator('.node-card').first().locator('.ping-probe')).toHaveCount(1)
 await page.getByLabel('Language / 语言').selectOption('en')
 await expect(page.locator('.node-card').first().locator('.ping-probe')).toHaveCount(1)
})
