import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
for(const width of [900,1024,1440])test(`desktop latency proposal keeps routes left and statistics right at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信 Primary long route',2:'浙江联通 Backup long route',3:'浙江移动 Mobile route'}}}))
 for(const language of ['zh','en']){
  await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
  await page.goto('/node/1?routes=1#latency')
  const chips=page.locator('.latency-view>.route-chips'),summary=page.locator('.latency-summary'),chart=page.locator('.latency-view>.detail-chart-frame')
  await expect(summary).toBeVisible()
  const c=(await chips.boundingBox())!,s=(await summary.boundingBox())!,f=(await chart.boundingBox())!
  expect(c.x+c.width).toBeLessThanOrEqual(s.x)
  expect(Math.abs(c.y+c.height/2-s.y-s.height/2)).toBeLessThanOrEqual(1)
  expect(f.height).toBe(378)
  expect(await page.locator('.detail-history').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  await expect.poll(()=>page.locator('.detail-chart-frame .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value').count()).toBeGreaterThan(1)
  const range=(await page.locator('.latency-range-heading').boundingBox())!,brush=(await page.locator('.latency-brush').boundingBox())!;expect(range.y+range.height).toBeLessThanOrEqual(brush.y)
  await page.locator('.latency-explanation summary').click();await expect(page.locator('.latency-explanation>div')).toBeVisible()
 }
})
