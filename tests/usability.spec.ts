import {settingsCategory} from './settings'
import {setting,settingsButton} from './settings'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {toggleSettings,visualSelect} from './settings'
async function setup(page:any){
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full'}))})
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'国际线路;Backup;Production',expires_at:'2027-01-01'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>r.fulfill({json:metrics()}))
 await page.goto('/');await expect(page.locator('.node-card')).toBeVisible()
}
test('presets derive from saved switches, preserve unrelated settings and survive export import',async({page})=>{
 await setup(page);await toggleSettings(page)
 const presets=page.getByRole('group',{name:'通用显示预设',exact:true}),info=page.getByRole('group',{name:'通用卡片信息',exact:true})
 await (await setting(page,'明暗模式',{exact:true})).selectOption('dark');await (await setting(page,'桌面列数',{exact:true})).selectOption('4')
 await settingsCategory(page,'cards')
 await presets.getByRole('button',{name:/精简/}).click()
 await expect(info.getByLabel('TCP／UDP',{exact:true})).not.toBeChecked();await expect(info.getByLabel('在线时长',{exact:true})).not.toBeChecked()
 for(const name of ['本月用量','到期信息','备注标签','价格'])await expect(info.getByLabel(name,{exact:true})).toBeChecked()
 await expect((await setting(page,'明暗模式',{exact:true}))).toHaveValue('dark');await expect((await setting(page,'桌面列数',{exact:true}))).toHaveValue('4')
 await settingsCategory(page,'cards')
 await info.getByLabel('价格',{exact:true}).uncheck();await expect(page.locator('.preset-heading small').first()).toHaveText('自定义')
 const download=page.waitForEvent('download');await (await settingsButton(page,'导出外观偏好',{exact:true})).click();const path=await (await download).path()
 await (await settingsButton(page,'重置全部偏好',{exact:true})).click();await settingsCategory(page,'cards');await expect(presets.getByRole('button',{name:/完整/})).toHaveAttribute('aria-pressed','true')
 await (await setting(page,'导入外观偏好',{exact:true})).setInputFiles(path!);await expect(page.locator('.preset-heading small').first()).toHaveText('自定义')
 await page.reload();await toggleSettings(page);await expect(page.locator('.preset-heading small').first()).toHaveText('自定义')
 await presets.getByRole('button',{name:/精简/}).click();await (await settingsButton(page,'恢复默认外观',{exact:true})).click()
 await settingsCategory(page,'cards');await expect(presets.getByRole('button',{name:/精简/})).toHaveAttribute('aria-pressed','true')
})
test('independent mobile preset does not change general switches and follows again',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await toggleSettings(page)
 await (await setting(page,'手机显示',{exact:true})).selectOption('custom')
 await page.getByRole('group',{name:'手机显示预设',exact:true}).getByRole('button',{name:/精简/}).click()
 await expect(page.getByRole('group',{name:'通用卡片信息',exact:true}).getByLabel('TCP／UDP',{exact:true})).toBeChecked()
 await toggleSettings(page);await expect(page.locator('.node-connections')).toHaveCount(0)
 await page.setViewportSize({width:721,height:844});await expect(page.locator('.node-connections')).toBeVisible()
 await page.setViewportSize({width:720,height:844});await expect(page.locator('.node-connections')).toHaveCount(0)
 await page.reload();await toggleSettings(page);await expect(page.getByRole('group',{name:'手机显示预设',exact:true}).getByRole('button',{name:/精简/})).toHaveAttribute('aria-pressed','true')
 await (await setting(page,'手机显示',{exact:true})).selectOption('follow');await expect(page.locator('.mobile-follow-note')).toBeVisible()
 await toggleSettings(page);await expect(page.locator('.node-connections')).toBeVisible()
})
for(const [width,height] of [[320,568],[390,844],[430,932],[844,390],[720,900],[721,900],[1440,1000]])test(`presets and settings fit ${width}x${height}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height})
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance}))},{language,appearance})
  await setup(page);await toggleSettings(page);const dialog=page.locator('.settings-drawer')
  const group=page.getByRole('group',{name:language==='zh'?'通用显示预设':'General display presets',exact:true})
  for(const preset of [0,1]){
   await group.getByRole('button').nth(preset).click()
   for(const graph of ['bar','columns','ring','minimal']){
    await visualSelect(page,'graph',graph);await toggleSettings(page)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    await page.evaluate(()=>scrollTo(0,0))
    if(width===390){for(const r of (await page.locator('.node-card .resource').all()).slice(0,2)){const b=(await r.boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(844)}}
    await toggleSettings(page)
   }
  }
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  await settingsCategory(page,'other');await dialog.locator('.preference-actions button').last().scrollIntoViewIfNeeded();await expect(dialog.locator('.settings-top button')).toBeInViewport()
  await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy()
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible()
  await expect(page.locator('header').getByRole('button',{name:language==='zh'?'外观设置':'Appearance',exact:true})).toBeFocused()
 }
})
test('preset keyboard controls keep scroll, target sizes and readable contrast',async({page})=>{
 await setup(page);await toggleSettings(page)
 const group=page.getByRole('group',{name:'通用显示预设',exact:true}),slim=group.getByRole('button',{name:/精简/})
 await slim.focus();const before=await page.locator('.settings-drawer').evaluate(el=>el.scrollTop)
 await page.keyboard.press('Space');await expect(slim).toHaveAttribute('aria-pressed','true')
 expect(Math.abs(await page.locator('.settings-drawer').evaluate(el=>el.scrollTop)-before)).toBeLessThanOrEqual(2)
 for(const b of await group.getByRole('button').all()){const rect=(await b.boundingBox())!;expect(rect.height).toBeGreaterThanOrEqual(44);expect(rect.width).toBeGreaterThanOrEqual(44)}
 for(const mode of ['light','dark']){
  await (await setting(page,'明暗模式',{exact:true})).selectOption(mode)
  const ratios=await page.locator('.settings-drawer').evaluate(el=>{
   const ctx=document.createElement('canvas').getContext('2d')!;
   function rgb(color:string){ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)}
   function lum(c:number[]){const a=c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722}
   const style=getComputedStyle(el),bg=lum(rgb(style.backgroundColor));return ['--foreground','--muted-foreground','--tone'].map(key=>{const l=lum(rgb(style.getPropertyValue(key)));return (Math.max(l,bg)+.05)/(Math.min(l,bg)+.05)})
  });for(const ratio of ratios)expect(ratio).toBeGreaterThanOrEqual(4.5)
 }
 await page.emulateMedia({reducedMotion:'reduce'});await toggleSettings(page)
 expect(await page.locator('.node-card').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s')
})
