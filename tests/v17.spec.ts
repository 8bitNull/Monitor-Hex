import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
test('focused home reveals secondary facts, clears visible filters and fits mobile width',async({page})=>{
 await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card).toBeVisible()
 await expect(card.getByLabel('累计流量')).toHaveCount(0)
 await expect(card.getByLabel('累计流量')).toHaveCount(0)
 await expect(card.locator('.cpu-model')).toHaveCount(0)
 await page.getByRole('group',{name:'地区快速筛选'}).getByRole('button',{name:'JP',exact:false}).click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByLabel('清除地区筛选').click()
 await expect(page.locator('.node-card')).toHaveCount(6)
 await page.setViewportSize({width:390,height:844})
 await expect(card.locator('.latency-columns').first()).toBeVisible()
 const tiles=await page.locator('.summary-grid > div').all()
 const tops=await Promise.all(tiles.map(async t=>(await t.boundingBox())!.y))
 // Compact overview keeps all three tiles in a single row on phones.
 expect(new Set(tops).size).toBe(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test('high-load alert appears at 85 percent and clears after recovery',async({page})=>{
 let push:((data:string)=>void)|undefined
 await page.routeWebSocket('**/api/ws',ws=>{push=d=>ws.send(d)})
 await page.goto('/')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await expect(page.locator('.high-load-alert')).toHaveCount(0)
 const list=nodes();list[0].metrics.cpu=85
 push!(JSON.stringify({nodes:list}))
 await expect(page.locator('.high-load-alert')).toContainText('85.0%')
 list[0].metrics.cpu=84
 push!(JSON.stringify({nodes:list}))
 await expect(page.locator('.high-load-alert')).toHaveCount(0)
})
