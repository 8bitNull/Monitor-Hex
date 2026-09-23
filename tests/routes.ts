import {expect,type Page} from '@playwright/test'
export async function expandRoutes(page:Page){
 await expect(page.locator('.route-chips')).toBeVisible()
 const expand=page.locator('.expand-routes[aria-expanded=false]')
 if(await expand.count())await expand.click()
}
