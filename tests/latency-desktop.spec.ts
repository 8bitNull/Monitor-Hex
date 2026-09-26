import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [320,390,900,1024,1440])test(`latency chart and route controls fit at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信 Primary long route',2:'浙江联通 Backup long route',3:'浙江移动 Mobile route'}}}))
 for(const language of ['zh','en']){
  await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
  await page.goto('/node/1?routes=1#latency')
  const chips=page.locator('.route-chips'),chart=page.locator('.latency-view>.detail-chart-frame'),loss=page.locator('.loss-track')
  await expect(chips).toBeVisible();await expect(chart.locator('.recharts-line-curve')).toHaveCount(1)
  await expect(loss).toBeVisible();await expect(page.locator('.latency-stat-details,.latency-summary,.latency-explanation-panel')).toHaveCount(0)
  const c=(await chips.boundingBox())!,f=(await chart.boundingBox())!,l=(await loss.boundingBox())!
  expect(f.y).toBeGreaterThanOrEqual(c.y+c.height)
  expect(l.y).toBeGreaterThanOrEqual(f.y+f.height)
  if(width>=900)expect(f.height).toBe(378)
  await expect(page.locator('.latency-chart-caption .latency-chart-key')).toBeVisible()
  await expect.poll(()=>chart.locator('.recharts-cartesian-axis-tick-value').count()).toBeGreaterThan(1)
  const route=page.locator('.detail-chart-toolbar').getByLabel(language==='zh'?'查看线路':'View route',{exact:true})
  await expect(route).toBeVisible()
  const box=(await route.boundingBox())!,toolbar=(await page.locator('.detail-chart-toolbar').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(toolbar.x)
  expect(box.x+box.width).toBeLessThanOrEqual(toolbar.x+toolbar.width+1)
  expect(await page.locator('.detail-history').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 }
})
