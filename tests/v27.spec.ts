import {test,expect} from '@playwright/test'
import {toggleSettings} from './settings'

test('map is embedded by default, shares filters and stays optional across view changes',async({page})=>{
 await page.goto('/')
 await expect(page.getByLabel('地图视图')).toHaveCount(0)
 await expect(page.locator('.world-panel')).toBeVisible()
 await expect(page.locator('.node-card')).toHaveCount(6)
 const japan=page.locator('.world-panel path[data-region="JP"]')
 await japan.focus();await japan.press('Enter')
 await expect(japan).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByLabel('表格视图').click();await expect(page.locator('.world-panel')).toHaveCount(0)
 await page.getByLabel('卡片视图').click();await expect(page.locator('.world-panel')).toBeVisible()
 await page.getByLabel('清除地区筛选').click()
 await page.locator('.world-panel').screenshot({path:'tests/artifacts/v270-map-desktop.png'})
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  expect((await page.locator('.world-panel').boundingBox())!.height).toBeLessThan(210)
 }
 await page.screenshot({path:'tests/artifacts/v270-home-mobile.png'})
 await toggleSettings(page);await page.getByLabel('首页地图',{exact:true}).uncheck();await toggleSettings(page)
 await page.reload();await expect(page.locator('.world-panel')).toHaveCount(0)
 await expect(page.locator('.node-card')).toHaveCount(6)
})
