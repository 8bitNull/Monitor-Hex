import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
for(const width of [900,1024,1440])test(`desktop latency statistics and explanation stay above the chart at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信 Primary long route',2:'浙江联通 Backup long route',3:'浙江移动 Mobile route'}}}))
 for(const language of ['zh','en']){
  await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
  await page.goto('/node/1?routes=1#latency')
  const chips=page.locator('.latency-view>.route-chips'),summary=page.locator('.latency-summary'),chart=page.locator('.latency-view>.detail-chart-frame')
  await expect(summary).toBeVisible()
  const c=(await chips.boundingBox())!,s=(await summary.boundingBox())!,f=(await chart.boundingBox())!
  expect(c.y).toBeGreaterThanOrEqual(s.y+s.height)
  expect(f.y).toBeGreaterThan(c.y+c.height)
  expect(f.height).toBe(378)
  expect(await page.locator('.detail-history').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  const key=page.locator('.latency-chart-caption .latency-chart-key'),info=page.getByRole('button',{name:language==='zh'?'统计说明':'About statistics',exact:true})
  await expect(key).toBeVisible()
  const k=(await key.boundingBox())!,i=(await info.boundingBox())!
  expect(i.y+i.height).toBeLessThanOrEqual(k.y)
  if(width===1440&&language==='zh')await page.locator('.detail-history').screenshot({path:'tests/artifacts/local/latency-refined-desktop.png'})
  await expect.poll(()=>page.locator('.detail-chart-frame .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value').count()).toBeGreaterThan(1)
  const range=(await page.locator('.latency-range-heading').boundingBox())!,brush=(await page.locator('.latency-brush').boundingBox())!;expect(range.y+range.height).toBeLessThanOrEqual(brush.y)
  await info.click();await expect(info).toHaveAttribute('aria-expanded','true')
  const explanation=page.locator('.latency-explanation-panel');await expect(explanation).toBeVisible()
  const panel=(await explanation.boundingBox())!,routes=(await chips.boundingBox())!
  expect(panel.y+panel.height).toBeLessThanOrEqual(routes.y)
  if(width===1440&&language==='zh')await page.locator('.detail-history').screenshot({path:'tests/artifacts/local/latency-refined-explanation.png'})
  await info.click();await expect(explanation).toHaveCount(0)
 }
})
for(const width of [320,390])test(`mobile latency explanation stays between statistics and routes at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1?routes=1#latency')
 const summary=page.locator('.latency-summary'),route=summary.locator('.latency-summary-route'),chips=page.locator('.latency-view>.route-chips')
 await expect(summary).toBeVisible()
 const s=(await summary.boundingBox())!,r=(await route.boundingBox())!
 expect(r.x).toBeLessThanOrEqual(s.x+12)
 await page.getByRole('button',{name:'统计说明'}).click()
 const panel=page.locator('.latency-explanation-panel');await expect(panel).toBeVisible()
 const p=(await panel.boundingBox())!,c=(await chips.boundingBox())!
 expect(p.y).toBeGreaterThanOrEqual(s.y+s.height)
 expect(p.y+p.height).toBeLessThanOrEqual(c.y)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 if(width===390)await page.locator('.detail-history').screenshot({path:'tests/artifacts/local/latency-refined-mobile.png'})
})
