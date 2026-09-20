import {test,expect} from '@playwright/test'
import {toggleSettings} from './settings'

for(const width of [320,390,1440]){
 test('language lives in settings and persists at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900})
  if(width===390)await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,appearance:'dark'})))
  await page.goto('/')
  await expect(page.locator('header').getByLabel('Language / 语言')).toHaveCount(0)
  await toggleSettings(page)
  const drawer=page.locator('dialog.settings-drawer')
  const language=drawer.getByRole('group',{name:'Language / 语言'})
  await expect(language.getByRole('button',{name:'简体中文'})).toHaveAttribute('aria-pressed','true')
  await drawer.evaluate(el=>el.setAttribute('data-test-persistent','yes'))
  await language.getByRole('button',{name:'English',exact:true}).click()
  await expect(drawer).toHaveAttribute('data-test-persistent','yes')
  await expect(drawer).toBeVisible()
  const bounds=(await drawer.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(width)
  await expect(language.getByRole('button',{name:'English',exact:true})).toBeFocused()
  await expect(page.locator('html')).toHaveAttribute('lang','en-US')
  await expect(drawer.getByRole('heading',{name:'Appearance'})).toBeVisible()
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await page.screenshot({path:`tests/artifacts/language-settings-${width}-en.png`})
  await page.keyboard.press('Escape')
  await expect(page.locator('header').getByRole('button',{name:'Appearance',exact:true})).toBeFocused()
  await page.reload();await toggleSettings(page)
  await expect(language.getByRole('button',{name:'English',exact:true})).toHaveAttribute('aria-pressed','true')
  await language.getByRole('button',{name:'简体中文'}).click()
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
  await page.screenshot({path:`tests/artifacts/language-settings-${width}-zh.png`})
  await toggleSettings(page)
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden')
  await page.screenshot({path:`tests/artifacts/language-header-${width}.png`})
 })
}
