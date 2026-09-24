import {test,expect} from '@playwright/test'
import {toggleSettings,settingsCategory} from './settings'

async function openTableSettings(page:Parameters<typeof toggleSettings>[0]) {
 await page.getByLabel('表格视图',{exact:true}).click()
 await toggleSettings(page)
 await settingsCategory(page,'cards')
}

test('table settings select the current device and show only its controls',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/')
 await openTableSettings(page)

 const mobile=page.getByRole('group',{name:'手机表格',exact:true})
 const desktop=page.getByRole('group',{name:'桌面表格',exact:true})
 const deviceSwitch=page.getByRole('group',{name:'表格显示',exact:true})
 await expect(mobile).toBeVisible()
 await expect(desktop).toHaveCount(0)
 await expect(deviceSwitch.getByRole('button',{name:'手机表格',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(deviceSwitch.getByRole('button',{name:'桌面表格',exact:true})).toHaveAttribute('aria-pressed','false')

 await deviceSwitch.getByRole('button',{name:'桌面表格',exact:true}).click()
 await expect(desktop).toBeVisible()
 await expect(mobile).toHaveCount(0)

 await page.setViewportSize({width:1440,height:1000})
 await expect(desktop).toBeVisible()
 await settingsCategory(page,'network')
 await settingsCategory(page,'cards')
 await expect(desktop).toBeVisible()

 await toggleSettings(page)
 await page.setViewportSize({width:1440,height:1000})
 await openTableSettings(page)
 await expect(desktop).toBeVisible()
 await expect(mobile).toHaveCount(0)
 await expect(deviceSwitch.getByRole('button',{name:'桌面表格',exact:true})).toHaveAttribute('aria-pressed','true')
})

test('table device selection follows viewport until manually changed',async({page})=>{
 await page.setViewportSize({width:1440,height:1000})
 await page.goto('/')
 await openTableSettings(page)

 const mobile=page.getByRole('group',{name:'手机表格',exact:true})
 const desktop=page.getByRole('group',{name:'桌面表格',exact:true})
 const deviceSwitch=page.getByRole('group',{name:'表格显示',exact:true})
 await expect(desktop).toBeVisible()
 await expect(mobile).toHaveCount(0)
 await page.setViewportSize({width:390,height:844})
 await expect(mobile).toBeVisible()
 await expect(desktop).toHaveCount(0)
 await deviceSwitch.getByRole('button',{name:'桌面表格',exact:true}).click()
 await page.setViewportSize({width:1440,height:1000})
 await expect(desktop).toBeVisible()
 await page.setViewportSize({width:390,height:844})
 await expect(desktop).toBeVisible()
})
