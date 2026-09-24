import {test,expect} from '@playwright/test'
import {metrics} from '../scripts/fixtures.mjs'

for(const width of [320,390,1440])for(const appearance of ['light','dark'])test(`dropdown menus stay bounded and readable ${width} ${appearance}`,async({page})=>{
 await page.setViewportSize({width,height:800})
 await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({appearance})),appearance)
 await page.route('**/theme-config.json',r=>r.fulfill({json:{palette:'forest',modules:{map:false}}}))
 await page.route('**/api/themes/hex/config',r=>r.fulfill({status:404}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const data=metrics();return r.fulfill({json:{...data,probes:Object.fromEntries(Array.from({length:30},(_,i)=>[i+1,`Route ${i+1} · 跨境线路名称 ${'LongName'.repeat(8)}`]))}})})
 await page.goto('/');await page.locator('.next-theme').evaluate(el=>el.setAttribute('data-glass','true'));const route=page.getByLabel('节点探测线路',{exact:true}).first();await expect(route).not.toContainText('正在读取')
 await route.click();const menu=page.getByRole('listbox');await expect(menu).toBeVisible()
 const box=(await menu.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(800)
 expect(await menu.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
 expect(await page.getByRole('option').first().evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))})).toBe(true)
 await page.screenshot({path:`tests/artifacts/dropdown-routes-${width}-${appearance}.png`})
 await page.keyboard.press('Escape');await expect(route).toBeFocused()
 await expect(page.getByLabel('主要探测线路',{exact:true})).toHaveCount(0)
})

test('table sorting supports keyboard selection, dismissal and neutral borders',async({page})=>{
 await page.goto('/');await page.getByLabel('表格视图',{exact:true}).click()
 const trigger=page.getByLabel('实时网速排序',{exact:true});await trigger.focus();await page.keyboard.press('Enter')
 await expect(page.getByRole('listbox')).toBeVisible();await page.keyboard.press('End');await expect(page.getByRole('option').last()).toBeFocused();await page.keyboard.press('Enter')
 await expect(trigger).toHaveAttribute('data-value','download:desc');await expect(trigger).toBeFocused()
 await trigger.click();await page.mouse.click(10,10);await expect(page.getByRole('listbox')).toHaveCount(0)
})
