import {toggleSettings,visualSelect} from './settings'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
const cpuName='AMD EPYC 9654 84-Core Processor / '+ 'Full CPU model and hardware revision '.repeat(5)
async function setup(page:any) {
 const fixture=nodes().slice(0,1);fixture[0].metrics.cpu=95;fixture[0].cpu_name=cpuName
 await page.route('**/api/nodes', (r:any)=>r.fulfill({json:{nodes:fixture}}))
 await page.routeWebSocket('**/api/ws',(ws:any)=>ws.close())
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>r.fulfill({json:{...metrics(),ping:[{task_id:1,ts:Math.floor(Date.now()/1000)-60,latency:20},{task_id:1,ts:Math.floor(Date.now()/1000),latency:30}],probes:{1:'Route A',2:'Configured without samples'},loss:undefined}}))
}
test('new browser respects site graph and palette defaults before saved preferences',async({page})=>{
 await page.route('**/theme-config.json',r=>r.fulfill({json:{skin:'original',graph:'bar',palette:'forest',schemaVersion:2}}))
 await page.goto('/')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','bar')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','forest')
 await toggleSettings(page)
 await visualSelect(page,'graph','ring')
 await page.reload()
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','ring')
})
test('critical resource number and graph share severity in every graph and theme',async({page})=>{
 await setup(page);await page.goto('/');await toggleSettings(page)
 for(const mode of ['light','dark']) {
  await page.getByLabel('明暗模式',{exact:true}).selectOption(mode)
  for(const graph of ['columns','bar','ring','minimal']) {
   await visualSelect(page,'graph',graph)
   const metric=page.locator('.resource.danger').first()
   const colors=await metric.evaluate(el=>{const num=el.querySelector('.bar-number')!;const meter=el.querySelector('.resource-columns .filled')!;const bar=el.querySelector('.resource-bar i')!;const ring=el.querySelector('.ring-value')!;return {number:getComputedStyle(num).color,column:getComputedStyle(meter).backgroundColor,bar:getComputedStyle(bar).backgroundColor,ring:getComputedStyle(ring).stroke}})
   expect(colors.number).toBe(colors.column);expect(colors.number).toBe(colors.bar);expect(colors.number).toBe(colors.ring)
  }
 }
 await page.setViewportSize({width:390,height:844})
 expect(await page.getByLabel('节点探测线路').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
})
test('configured empty routes remain selectable, unknown loss stays unknown, full CPU wraps',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});await page.goto('/')
 await page.locator('.route-matrix').scrollIntoViewIfNeeded()
 await expect(page.locator('.matrix-values b').last()).toContainText('—')
 const route=page.getByLabel('节点探测线路')
 await expect(route.locator('option[value="2"]')).toHaveText('Configured without samples')
 await route.selectOption('2');await expect(page.locator('.ping-empty')).toHaveText('无该线路记录')
 await page.getByRole('button',{name:'查看全部 2 条线路'}).click()
 await expect(page.locator('.detail-probe-legend')).toContainText('Configured without samples')
 await expect(page.locator('.detail-probe-legend')).toContainText('暂无探测记录')
 await expect(page.locator('.detail-probe-legend')).toContainText('丢包 —')
 const fact=page.locator('dd').filter({hasText:cpuName})
 await expect(fact).toHaveText(cpuName+' × 4')
 expect(await fact.evaluate(el=>el.scrollWidth<=el.clientWidth&&getComputedStyle(el).whiteSpace==='normal')).toBeTruthy()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test('unified card visual baselines for desktop and phone in light and dark',async({page})=>{
 await setup(page);await page.goto('/')
 await expect(page.locator('.matrix-values')).toContainText('30 ms')
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  for(const mode of ['light','dark']) {
   await toggleSettings(page)
   await page.getByLabel('明暗模式',{exact:true}).selectOption(mode)
   await toggleSettings(page)
   await expect(page.locator('.node-card')).toHaveScreenshot(`unified-card-${width}-${mode}.png`,{maxDiffPixelRatio:0.01,animations:'disabled'})
  }
 }
})

