import {test,expect} from '@playwright/test'
import {toggleSettings,visualSelect} from './settings'
test('palette swatches are centred at desktop and mobile widths',async({page})=>{
 await page.goto('/');await toggleSettings(page)
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000})
  for(const b of await page.locator('.palette-options button').all()){
   await b.click();const outer=(await b.boundingBox())!,inner=(await b.locator('i').boundingBox())!
   expect(Math.abs(outer.x+outer.width/2-inner.x-inner.width/2)).toBeLessThan(1)
   expect(Math.abs(outer.y+outer.height/2-inner.y-inner.height/2)).toBeLessThan(1)
  }
 }
 await page.locator('.palette-options').screenshot({path:'tests/artifacts/appearance-palette.png'})
})
test('each card layout fits its indicator, keeps data visible and persists selection',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,modules:{map:false},homeRoutes:1}))})
 await page.goto('/')
 const card=page.locator('.node-card').first();await card.locator('.latency-reading').waitFor()
 await expect(card.getByLabel('节点探测线路').locator('option').first()).toHaveText(/^全局：/)
 for(const appearance of ['light','dark']){
  await page.locator('.next-theme').evaluate((el,a)=>{el.classList.toggle('dark',a==='dark');document.documentElement.classList.toggle('dark',a==='dark')},appearance)
  for(const graph of ['columns','bar','ring','minimal']){
   await toggleSettings(page);await visualSelect(page,'graph',graph);await toggleSettings(page)
   await expect(card).toHaveAttribute('data-indicator',graph)
   for(const width of [1440,1024,390,320]){
    await page.setViewportSize({width,height:1000})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
    for(const metric of await card.locator('.resource').all()){
     const number=metric.locator(graph==='ring'?'.metric-ring strong':'.bar-number');await expect(number).toBeVisible()
     const box=(await metric.boundingBox())!,value=(await number.boundingBox())!
     expect(value.x+value.width).toBeLessThanOrEqual(box.x+box.width+1)
    }
    if(width===390)await card.screenshot({path:`tests/artifacts/appearance-card-${graph}-${appearance}.png`})
   }
  }
 }
 await page.reload();await expect(card).toHaveAttribute('data-indicator','minimal')
 await expect(card.locator('.latency-columns')).toBeHidden()
})
