import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
test('favorite controls are removed and notes replace the card footer affordance',async({page})=>{
 const remark='2.5Gbps; 国际线路；Anti-DDoS; <script>alert(1)</script>; '+ 'LongWord'.repeat(25)
 await page.addInitScript(()=>localStorage.setItem('monitor-next-favorites-v1','[1]'))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>({...n,remark:i===0?remark:'',price:0}))}}))
 await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card.locator('.node-remarks .detail-remark-tag')).toHaveCount(3)
 await expect(card.getByRole('button',{name:'查看完整备注'})).toHaveText('+2')
 await expect(page.locator('.node-card').nth(1).locator('.node-footer')).toHaveCount(0)
 await expect(page.getByRole('button',{name:/收藏/})).toHaveCount(0)
 const hues=await card.locator('.detail-remark-tag').evaluateAll(els=>els.map(e=>e.className))
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 }
 await page.setViewportSize({width:390,height:1000})
 await card.screenshot({path:'tests/artifacts/v242-notes-mobile.png'})
 await card.getByRole('button',{name:'查看完整备注'}).click()
 await expect(page.locator('.detail-remark-tag')).toHaveCount(5)
 await expect(page.locator('.node-detail')).toContainText('<script>alert(1)</script>')
 await expect(page.locator('.detail-favorite')).toHaveCount(0)
 expect(await page.locator('.detail-remark-tag').evaluateAll(els=>els.slice(0,3).map(e=>e.className))).toEqual(hues)
 await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await page.getByLabel('表格视图').click()
 await expect(page.getByRole('button',{name:/收藏/})).toHaveCount(0)
 await expect(page.locator('tbody tr')).toHaveCount(6)
})
