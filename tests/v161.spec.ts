import {toggleSettings,visualSelect} from './settings'
import {test,expect} from '@playwright/test'
test('default appearance migration runs once and duplicate filters are removed',async({page})=>{
 await page.goto('/')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await page.evaluate(()=>{localStorage.setItem('monitor-next',JSON.stringify({skin:'original',graph:'ring',cardLayout:'modern',palette:'forest'}))})
 await page.reload()
 await expect(page.locator('.next-theme')).toHaveAttribute('data-skin','lumina')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','columns')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','forest')
 await expect(page.getByLabel('筛选地区')).toHaveCount(0)
 await expect(page.getByLabel('系统分组',{exact:true})).toHaveCount(0)
 await toggleSettings(page)
 expect(await page.locator('main').innerText()).not.toMatch(/lumina/i)
 await visualSelect(page,'graph','ring')
 await page.reload()
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','ring')
 await toggleSettings(page)
 for(const lang of ['zh','en']) {
  await page.getByLabel('Language / 语言').selectOption(lang)
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  }
 }
})
