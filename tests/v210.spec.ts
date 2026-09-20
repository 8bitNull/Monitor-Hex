import {test,expect} from '@playwright/test'
import {toggleSettings,visualSelect} from './settings'
test('legacy gauge becomes spark and speed indicators follow global style on home and detail',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,speedStyle:'gauge',modules:{map:false}})))
 await page.goto('/')
 await expect(page.locator('.speed-gauge')).toHaveCount(0)
 await expect(page.locator('.summary-grid svg').filter({has:page.locator('polyline')}).first()).toBeVisible()
 const card=page.locator('.node-card').first();await card.locator('.ping-stats').scrollIntoViewIfNeeded()
 await expect(card.locator('.latency-columns')).toBeVisible()
 for(const [style,visible] of [['columns','.speed-columns'],['bar','.speed-track'],['ring','.speed-ring'],['minimal','']]){
  await toggleSettings(page);await expect(page.getByLabel('首页总网速样式',{exact:true})).toHaveCount(0)
  await visualSelect(page,'graph',style);await toggleSettings(page)
  for(const selector of ['.speed-columns','.speed-track','.speed-ring']){
   if(selector===visible)await expect(card.locator(selector).first()).toBeVisible()
   else await expect(card.locator(selector).first()).toBeHidden()
  }
  if(style==='minimal')await expect(card.locator('.latency-columns')).toBeHidden()
  else await expect(card.locator('.latency-columns')).toBeVisible()
  await page.setViewportSize({width:390,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await card.screenshot({path:`tests/artifacts/v210-${style}.png`})
 }
 await toggleSettings(page);await visualSelect(page,'graph','columns');await toggleSettings(page)
 await page.getByRole('button',{name:'查看 Tokyo · 东京主节点',exact:true}).click()
 await expect(page.locator('.detail-speed .speed-columns').first()).toBeVisible()
 await expect(page.locator('.detail-speed .speed-track').first()).toBeHidden()
 await page.reload();await expect(page.locator('.speed-gauge')).toHaveCount(0)
})
