import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('offline detail surfaces last report and condenses unavailable live readings',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[5]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/6')
 await expect(page.locator('.detail-last-seen')).toContainText('上次上报：')
 await expect(page.locator('.overview-unavailable')).toContainText('实时资源与网速暂不可用')
 await expect(page.locator('.detail-live .resource')).toHaveCount(0)
 await expect(page.locator('.overview-account')).toBeVisible()
 await expect(page.locator('.detail-network-reading')).toContainText('采样：')
 await expect(page.locator('.detail-network-reading')).not.toContainText('较旧记录')
 await page.locator('.detail-network-reading>button').first().click()
 await expect(page.getByRole('button',{name:'网络延迟',exact:true})).toHaveAttribute('aria-pressed','true')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test('online detail shows fresh route reading and marks older samples',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 await expect(page.locator('.detail-network-reading')).toContainText('Tokyo gateway')
 await expect(page.locator('.detail-network-reading')).toContainText('24h 丢包')
 await expect(page.locator('.detail-network-reading')).not.toContainText('较旧记录')
 await page.route('**/api/nodes/*/metrics?*',r=>{const data=metrics();return r.fulfill({json:{...data,ping:data.ping.map(point=>({...point,ts:point.ts-600}))}})})
 await page.reload()
 await expect(page.locator('.detail-network-reading')).toContainText('较旧记录')
})
