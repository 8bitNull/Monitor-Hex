import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
const base=1800000000
const data=(shift=0)=>({metrics:[],probes:{1:'Primary'},loss:{1:shift},ping:Array.from({length:6},(_,i)=>({task_id:1,ts:base+(i+shift)*60,latency:20+i+shift,loss:0}))})
async function setup(page:Page){
 await page.clock.install();await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
}
test('automatic latency updates preserve selected timestamps and settings, retain failures and recover',async({page})=>{
 await setup(page);let calls=0,fail=false
 await page.route('**/api/nodes/*/metrics?*',r=>{if(!r.request().url().includes('series=ping'))return r.fulfill({json:data()});const shift=calls++;return fail?r.fulfill({status:503}):r.fulfill({json:data(shift)})})
 await page.goto('/node/1?routes=1#latency');const summary=page.locator('.latency-summary'),refresh=page.getByRole('button',{name:'刷新历史',exact:true})
 await expect(summary).toContainText('22.5 ms');await expect(refresh).toBeEnabled();expect(calls).toBe(1)
 await page.getByRole('checkbox',{name:'平滑显示'}).check()
 const handles=page.locator('.latency-brush .recharts-brush-traveller');await handles.first().focus();await page.keyboard.press('ArrowRight');await handles.last().focus();await page.keyboard.press('ArrowLeft')
 const range=page.locator('.latency-range-heading>span').first();const selected=await range.innerText()
 await page.clock.fastForward(30000);await expect.poll(()=>calls).toBe(2);await expect(refresh).toBeEnabled();await expect(range).toHaveText(selected);await expect(summary).toContainText('22.5 ms');await expect(page.getByRole('checkbox',{name:'平滑显示'})).toBeChecked()
 await page.getByRole('button',{name:'恢复范围',exact:true}).click();await expect(summary).toContainText('23.5 ms')
 fail=true;await page.clock.fastForward(30000);await expect(page.locator('.history-notice')).toContainText('保留上次历史记录');await expect(summary).toContainText('23.5 ms')
 fail=false;await page.clock.fastForward(30000);await expect(summary).toContainText('25.5 ms');await expect(page.locator('.history-notice')).toHaveCount(0)
 await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(1)
})
test('latency polling pauses in background, refreshes on return and stops outside latency',async({page})=>{
 await setup(page);let calls=0,pending:any,hold=false
 await page.route('**/api/nodes/*/metrics?*',r=>{if(r.request().url().includes('series=ping')){calls++;if(hold){pending=r;return}}return r.fulfill({json:data()})})
 await page.goto('/node/1?routes=1#latency');await expect(page.locator('.latency-summary')).toBeVisible();await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
 await page.clock.fastForward(90000);expect(calls).toBe(1)
 hold=true;await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await expect.poll(()=>calls).toBe(2)
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByRole('button',{name:'刷新历史',exact:true}).evaluate((el:HTMLButtonElement)=>el.click());expect(calls).toBe(2)
 hold=false;await pending.fulfill({json:data(1)});await expect(page.locator('.latency-summary')).toContainText('23.5 ms')
 await page.getByRole('button',{name:'资源',exact:true}).click();await page.clock.fastForward(90000);expect(calls).toBe(2)
})
