import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [320,390])test(`mobile history status and controls fit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar'),status=toolbar.locator('.detail-update')
 await expect(status).toContainText(/更新于 \d{2}:\d{2}:\d{2}/)
 for(const tab of ['resources','latency'] as const){
  if(tab==='latency')await page.getByRole('button',{name:'网络延迟',exact:true}).click()
  const control=tab==='resources'?toolbar.locator('.detail-resource-metric-mobile>summary'):toolbar.getByRole('checkbox',{name:'抑制尖峰'})
  await expect(control).toBeVisible()
  const top=(await toolbar.locator('.detail-tabs').boundingBox())!,right=(await control.boundingBox())!,time=(await status.boundingBox())!
  if(tab==='resources'){
   expect(right.x).toBeGreaterThanOrEqual(top.x+top.width)
   expect(time.y).toBeGreaterThanOrEqual(right.y+right.height)
  }else{
   const route=(await toolbar.getByLabel('查看线路',{exact:true}).boundingBox())!
   const ranges=(await toolbar.locator('.detail-ranges').boundingBox())!,refresh=(await toolbar.getByRole('button',{name:'刷新历史'}).boundingBox())!,bar=(await toolbar.boundingBox())!
   expect(Math.abs(time.y+time.height/2-refresh.y-refresh.height/2)).toBeLessThanOrEqual(2)
   expect(time.x).toBeGreaterThanOrEqual(top.x+top.width)
   expect(time.x+time.width).toBeLessThanOrEqual(refresh.x)
   expect(route.y).toBeGreaterThanOrEqual(top.y+top.height)
   expect(route.x).toBeGreaterThanOrEqual(bar.x)
   expect(route.x+route.width).toBeLessThanOrEqual(bar.x+bar.width+1)
   expect(ranges.y).toBeGreaterThanOrEqual(route.y+route.height)
   expect(Math.abs(ranges.y+ranges.height/2-right.y-right.height/2)).toBeLessThanOrEqual(2)
   expect(ranges.x+ranges.width).toBeLessThanOrEqual(right.x)
  }
  expect(time.x+time.width).toBeLessThanOrEqual(width)
  expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
 }
 await page.unroute('**/api/nodes/*/metrics?*')
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({status:503}))
 await toolbar.getByRole('button',{name:'刷新历史'}).click()
 await expect(status).toContainText(/上次成功更新：\d{2}:\d{2}:\d{2}/)
 expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
})

test('English last-success status fits a 320px detail toolbar',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar'),status=toolbar.locator('.detail-update')
 await expect(status).toContainText('Updated')
 await page.getByRole('button',{name:'Network latency',exact:true}).click()
 const checkbox=(await toolbar.getByRole('checkbox',{name:'Suppress spikes'}).boundingBox())!,route=(await toolbar.getByLabel('View route',{exact:true}).boundingBox())!,toolbarBox=(await toolbar.boundingBox())!,ranges=(await toolbar.locator('.detail-ranges').boundingBox())!
 expect(route.y+route.height).toBeLessThanOrEqual(ranges.y)
 expect(ranges.x+ranges.width).toBeLessThanOrEqual(checkbox.x)
 expect(route.x+route.width).toBeLessThanOrEqual(toolbarBox.x+toolbarBox.width)
 await page.unroute('**/api/nodes/*/metrics?*')
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({status:503}))
 await toolbar.getByRole('button',{name:'Refresh history'}).click()
 await expect(status).toContainText('Last successful update:')
 const bar=(await toolbar.boundingBox())!,text=(await status.boundingBox())!
 expect(text.x).toBeGreaterThanOrEqual(bar.x)
 expect(text.x+text.width).toBeLessThanOrEqual(bar.x+bar.width)
 expect(text.y).toBeGreaterThanOrEqual((await toolbar.locator('.detail-ranges').boundingBox())!.y+ranges.height)
 expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
})
