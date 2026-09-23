import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
test('billing rows align, preserve quota states and fit narrow cards',async({page})=>{
 await page.clock.install({time:new Date('2026-09-23T12:00:00+08:00')})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[
 {...nodes()[0],id:1,traffic_limit:500e9,month_used:220e9,traffic_reset_day:15,expires_at:'2026-09-28'},
 {...nodes()[0],id:2,traffic_limit:500e9,month_used:520e9,traffic_reset_day:31,expires_at:'2026-09-22'},
 {...nodes()[0],id:3,traffic_limit:0,month_used:220e9,traffic_reset_day:1,expires_at:null},
 {...nodes()[0],id:4,traffic_limit:0,month_used:220e9,traffic_reset_day:undefined,expires_at:'2026-11-28'},
 {...nodes()[0],id:5,traffic_limit:500e9,month_used:450e9,traffic_reset_day:1,expires_at:'2026-09-23'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 for(const width of [320,390,1440])for(const language of ['zh','en']){
  await page.setViewportSize({width,height:1000});await page.addInitScript(language=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,homeRoutes:1,modules:{map:false}}))},language)
  await page.goto('/');const cards=page.locator('.node-card');await expect(cards).toHaveCount(5)
  await expect(cards.nth(0).getByRole('progressbar')).toHaveAttribute('aria-valuenow','44')
  await expect(cards.nth(1).locator('.quota-percent')).toHaveText('104%');await expect(cards.nth(1).locator('.traffic-summary')).toHaveAttribute('data-quota-state','over')
  await expect(cards.nth(1).locator('.card-expiry')).toHaveAttribute('data-expiry-state','expired')
  await expect(cards.nth(2).locator('.quota')).toHaveCount(0);await expect(cards.nth(2).locator('.traffic-reset')).toBeVisible()
  await expect(cards.nth(3).locator('.traffic-reset')).toHaveCount(0)
  await expect(cards.nth(4).locator('.traffic-summary')).toHaveAttribute('data-quota-state','near')
  if(width===320)await expect(cards.first().locator('.quota-percent')).toBeHidden();else await expect(cards.first().locator('.quota-percent')).toBeVisible()
  for(const card of await cards.all()){
   const layout=await card.evaluate(el=>{const a=el.querySelector('.traffic-summary b')!.getBoundingClientRect(),b=el.querySelector('.card-expiry b')!.getBoundingClientRect();return {delta:Math.abs(a.y-b.y),overflow:el.scrollWidth>el.clientWidth+1}})
   expect(layout.delta).toBeLessThanOrEqual(1);expect(layout.overflow).toBeFalsy()
  }
  if(language==='zh')await cards.first().screenshot({path:`tests/artifacts/billing-aligned/${width}.png`})
 }
})
