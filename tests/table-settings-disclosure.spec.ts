import {test,expect} from '@playwright/test'
import {toggleSettings,settingsCategory} from './settings'

async function openTableSettings(page:Parameters<typeof toggleSettings>[0]) {
 await page.getByLabel('表格视图',{exact:true}).click()
 await toggleSettings(page)
 await settingsCategory(page,'cards')
}

test('mobile table settings lead and desktop settings use a disclosure',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/')
 await openTableSettings(page)

 const desktop=page.locator('.table-desktop-settings')
 const mobile=page.getByRole('group',{name:'手机表格',exact:true})
 const desktopGroup=desktop.getByRole('group',{name:'桌面表格',exact:true})
 await expect(mobile).toBeVisible()
 await expect(desktop.locator('summary')).toBeVisible()
 await expect(desktop).not.toHaveAttribute('open','')
 await expect(desktopGroup).toBeHidden()
 expect(await mobile.evaluate((element,selector)=>Boolean(element.compareDocumentPosition(document.querySelector(selector)!)&Node.DOCUMENT_POSITION_FOLLOWING),'.table-desktop-settings')).toBe(true)

 await desktop.locator('summary').click()
 await expect(desktop).toHaveAttribute('open','')
 await expect(desktopGroup).toBeVisible()
})

test('desktop table settings remain directly available',async({page})=>{
 await page.setViewportSize({width:1440,height:1000})
 await page.goto('/')
 await openTableSettings(page)

 const desktop=page.locator('.table-desktop-settings')
 await expect(desktop.locator('summary')).toBeHidden()
 await expect(desktop).toHaveAttribute('open','')
 await expect(desktop.locator('.table-device-settings')).toBeVisible()
 await expect(desktop.getByLabel('列布局',{exact:true})).toBeVisible()
})
