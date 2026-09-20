import {test,expect} from '@playwright/test'
test('inline curves remain visible and do not resize on hover',async({page})=>{
 await page.goto('/')
 const card=page.locator('.node-card').first()
 const chart=card.getByRole('img',{name:'近期延迟采样'})
 await expect(chart).toBeVisible()
 const box=await card.boundingBox()
 for(let i=0;i<4;i++){await chart.hover();await page.mouse.move(0,0);expect((await card.boundingBox())!.height).toBe(box!.height)}
 await page.setViewportSize({width:390,height:844})
 await expect(chart).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
