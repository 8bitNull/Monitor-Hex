import type {Page} from '@playwright/test'
export async function toggleSettings(page:Page) {
 const drawer=page.locator('dialog.settings-drawer')
 if(await drawer.isVisible()) await drawer.getByRole('button',{name:/^(关闭设置|Close settings)$/}).click()
 else await page.locator('header').getByRole('button',{name:/^(外观设置|Appearance)$/}).click()
}
export async function visualSelect(page:Page, kind:string,value:string) {
 const names:Record<string,Record<string,string[]>>={palette:{default:['经典蓝','Classic blue'],ocean:['海洋','Ocean'],sunset:['落日','Sunset'],forest:['森林','Forest'],midnight:['午夜','Midnight'],rose:['玫瑰','Rose']},graph:{ring:['圆环','Ring'],bar:['进度条','Bar'],columns:['分段柱条','Columns'],minimal:['极简数字','Minimal']},layout:{comfortable:['舒适','Comfortable'],compact:['紧凑','Compact']}}
 const drawer=page.locator('dialog.settings-drawer')
 const buttons=drawer.locator(kind==='palette'?'.palette-options':kind==='graph'?'.graph-options':'.density-options').getByRole('button')
 const keys=Object.keys(names[kind]);await buttons.nth(keys.indexOf(value)).click()
}
