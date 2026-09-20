import {test,expect} from '@playwright/test'
test('quiet overview keeps advanced choices discoverable and sample metadata accessible',async({page})=>{
 await page.goto('/')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await expect(page.getByLabel('排序字段')).toHaveCount(0)
 await expect(page.getByLabel('卡片分组')).toHaveCount(0)
 await expect(page.locator('.advanced-browser')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'采样信息'})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'刷新延迟数据'})).toHaveCount(0)
 for(const lang of ['zh','en']) {
  await page.getByLabel('Language / 语言').selectOption(lang)
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:1000})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  }
 }
 await page.getByLabel('Language / 语言').selectOption('zh')
 await page.evaluate(()=>scrollTo(0,0))
 await page.screenshot({path:'tests/artifacts/v152-desktop.png',fullPage:true})
 await page.getByRole('button',{name:'切换明暗模式'}).click()
 await page.evaluate(()=>scrollTo(0,0))
 await page.screenshot({path:'tests/artifacts/v152-dark.png',fullPage:true})
 await page.setViewportSize({width:390,height:844})
 await page.evaluate(()=>scrollTo(0,0))
 await page.screenshot({path:'tests/artifacts/v152-mobile.png',fullPage:true})
})
