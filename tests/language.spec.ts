import {test,expect} from '@playwright/test'

for(const width of [320,390,1440])test(`header language toggle persists at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900})
 await page.goto('/')
 const language=page.locator('header').getByRole('button',{name:'Language / 语言'})
 await expect(language).toBeVisible()
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
 await language.click()
 await expect(page.locator('html')).toHaveAttribute('lang','en-US')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.reload()
 await expect(page.locator('html')).toHaveAttribute('lang','en-US')
 await language.click()
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
 await page.reload()
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
})
