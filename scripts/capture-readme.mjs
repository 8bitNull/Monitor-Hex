import {chromium} from '@playwright/test'
import {nodes} from './fixtures.mjs'

const base=`http://127.0.0.1:${process.env.THEME_DEMO_PORT||4173}`
const browser=await chromium.launch({channel:'chrome'})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes().map((node,index)=>({...node,expires_at:'2027-12-31',remark:index===0?'主力节点;稳定运行':''}))}}))
 await page.goto(base)
 await page.locator('.map-land').waitFor()
 for(const card of await page.locator('.node-card').all()){
  await card.scrollIntoViewIfNeeded()
  await card.locator('.route-matrix .latency-reading').first().waitFor()
 }
 await page.evaluate(()=>scrollTo(0,0))
 await page.screenshot({path:'screenshots/readme/home-desktop.png',fullPage:true})

 await page.getByLabel('表格视图',{exact:true}).click()
 await page.locator('.node-table tbody tr').first().waitFor()
 await page.screenshot({path:'screenshots/readme/table-desktop.png',fullPage:true})

 await page.getByLabel('卡片视图',{exact:true}).click()
 await page.locator('.node-card .node-open').first().click()
 await page.locator('.detail-workspace').waitFor()
 await page.screenshot({path:'screenshots/readme/detail-desktop.png',fullPage:true})
 await page.close()

 const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true})
 await mobile.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes().map((node,index)=>({...node,expires_at:'2027-12-31',remark:index===0?'主力节点;稳定运行':''}))}}))
 await mobile.goto(base)
 await mobile.locator('.node-card').first().waitFor()
 for(const card of await mobile.locator('.node-card').all()){
  await card.scrollIntoViewIfNeeded()
  await card.locator('.route-matrix .latency-reading').first().waitFor()
 }
 await mobile.evaluate(()=>scrollTo(0,0))
 await mobile.screenshot({path:'screenshots/readme/home-mobile.png',fullPage:true})
 await mobile.close()
 console.log('Updated README screenshots')
} finally {
 await browser.close()
}
