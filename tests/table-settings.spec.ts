import {test,expect} from '@playwright/test'
import {toggleSettings,settingsCategory} from './settings'
import {chooseOption} from './select'

test('desktop and mobile column choices are independent and persist in a fresh tab',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByLabel('表格视图',{exact:true}).click()
 await toggleSettings(page);await settingsCategory(page,'cards')
 const mobile=page.getByRole('group',{name:'手机表格',exact:true}),desktop=page.getByRole('group',{name:'桌面表格',exact:true})
 await mobile.getByLabel('内存',{exact:true}).check();await mobile.getByLabel('硬盘',{exact:true}).check();await mobile.getByLabel('上传速度',{exact:true}).check()
 await page.locator('.table-desktop-settings summary').click();await expect(desktop).toBeVisible()
 await desktop.getByLabel('硬盘',{exact:true}).uncheck()
 await toggleSettings(page);await expect(page.locator('thead [data-column=memory]')).toBeVisible();await expect(page.locator('thead [data-column=disk]')).toBeVisible();await expect(page.locator('.table-speed [data-direction=download]')).toHaveCount(0)
 const fresh=await context.newPage();await fresh.setViewportSize({width:390,height:844});await fresh.goto('/');await fresh.getByLabel('表格视图',{exact:true}).click();await expect(fresh.locator('thead [data-column=memory]')).toBeVisible();await fresh.close()
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('thead [data-column=disk]')).toHaveCount(0)
 await toggleSettings(page);await settingsCategory(page,'cards');await mobile.getByRole('button',{name:'全选指标',exact:true}).click();await chooseOption(mobile.getByLabel('列布局',{exact:true}),'separate');await toggleSettings(page)
 await page.setViewportSize({width:390,height:844});await expect(page.locator('thead th')).toHaveCount(21);await expect(page.locator('thead [data-column=remark]')).toHaveCount(0)
 await toggleSettings(page);await settingsCategory(page,'cards');await mobile.getByRole('button',{name:'恢复默认列',exact:true}).click();await page.locator('.table-desktop-settings summary').click();await expect(desktop.getByLabel('硬盘',{exact:true})).not.toBeChecked();await toggleSettings(page);await expect(page.locator('thead th')).toHaveCount(3);await expect(page.locator('thead th').last()).toHaveAttribute('data-column','latency')
})
for(const width of [320,390,1440])test(`table settings fit and all optional columns can be hidden at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.getByLabel('表格视图',{exact:true}).click();await toggleSettings(page);await settingsCategory(page,'cards')
 const group=page.getByRole('group',{name:width<=720?'手机表格':'桌面表格',exact:true})
 for(const checkbox of await group.getByRole('checkbox').all())await checkbox.uncheck()
 expect(await page.locator('.settings-drawer').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await group.screenshot({path:`tests/artifacts/table-settings-${width}.png`})
 await toggleSettings(page);await expect(page.locator('thead th')).toHaveCount(width<=720?1:2);await expect(page.locator('thead th').last()).toHaveAttribute('data-column',width<=720?'name':'remark')
})
