import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:any,count=7,long=false){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],name:long?'Tokyo 东京超长节点名称 '.repeat(16):'Tokyo',ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,`线路 Tokyo ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:count},(_,i)=>({...p,task_id:i+1,latency:p.latency+i*10})))}})})
 await page.goto('/node/1');await expect(page.locator('.recharts-area-curve')).toBeVisible();if(!long)await expect(page.getByRole('button',{name:'展开名称',exact:true})).toHaveCount(0)
}
for(const width of [900,1024,1440,1920])test(`facts span the desktop workspace at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await setup(page)
 const facts=(await page.locator('.detail-information').boundingBox())!,workspace=(await page.locator('.detail-workspace').boundingBox())!,history=(await page.locator('.detail-history').boundingBox())!
 expect(Math.abs(facts.width-workspace.width)).toBeLessThanOrEqual(1);expect(facts.y).toBeLessThanOrEqual(history.y)
 expect(await page.locator('.detail-fact-groups').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width>=900?3:1)
 expect(await page.locator('.detail-fact-groups>section').first().getAttribute('aria-label')).toBe('硬件与系统')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
for(const count of [6,7,20])test(`route picker keeps a compact single-line menu with ${count}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,count);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const legend=page.locator('.detail-probe-legend'),summary=legend.locator('summary');await summary.click()
 const options=legend.locator('.probe-options .probe-select');await expect(options).toHaveCount(count);await expect(page.locator('.probe-bulk-actions,.route-search,.probe-solo,.probe-restore')).toHaveCount(0)
 const targetName=`线路 Tokyo ${Math.min(7,count)}`,target=legend.getByRole('button',{name:targetName,exact:true});await target.click();await expect(target).toHaveAttribute('aria-pressed','true');await expect(target.locator('.probe-check')).toHaveText('✓');await expect(legend).toHaveAttribute('open','')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.keyboard.press('Escape');await expect(summary).toBeFocused()
})
test('long title expands separately and copy expires without moving rows',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.setViewportSize({width:320,height:844});await setup(page,7,true)
 const name=page.locator('.node-title-text'),expand=page.getByRole('button',{name:'展开名称',exact:true});await expect(expand).toBeVisible();const h=(await name.boundingBox())!.height
 await expand.click();expect((await name.boundingBox())!.height).toBeGreaterThan(h);await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'收起名称',exact:true}).click();expect((await name.boundingBox())!.height).toBe(h)
 await page.locator('.detail-facts-toggle').click();const copy=page.getByRole('button',{name:'复制：IPv6',exact:true}),row=copy.locator('xpath=ancestor::dd');const height=(await row.boundingBox())!.height
 await page.clock.install();await copy.click();await expect(row.getByRole('status')).toHaveText('已复制');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('2001:db8:1234:5678:abcd:1234:5678:abcd');await page.clock.runFor(2001);await expect(row.getByRole('status')).toHaveCount(0,{timeout:3000});expect((await row.boundingBox())!.height).toBe(height)
 await page.evaluate(()=>{let calls=0;Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>new Promise((resolve,reject)=>setTimeout(()=>++calls===1?reject(Error('denied')):resolve(undefined),300))})});await copy.click();await copy.click();await page.clock.runFor(301);await expect(row.getByRole('status')).toHaveText('已复制');expect((await row.boundingBox())!.height).toBe(height)
})
for(const width of [320,390])for(const tab of ['resources','latency'])test(`mobile ${width} ${tab} tooltip closes, reopens and stays bounded`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page,20)
 if(tab==='latency'){await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.locator('.detail-probe-legend>summary').click();const hidden=page.locator('.probe-options .probe-select[aria-pressed="false"]');while(await hidden.count())await hidden.first().click();await page.keyboard.press('Escape');await expect(page.locator('.recharts-line-curve')).toHaveCount(20)}
 const frame=page.locator('.detail-chart-frame');await frame.scrollIntoViewIfNeeded();const height=(await frame.boundingBox())!.height,tip=frame.locator('.recharts-tooltip-wrapper')
 for(const x of [75,150,((await frame.boundingBox())!.width-30)]){await frame.click({position:{x,y:110}});await expect(tip).toBeVisible();const b=(await tip.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);const close=page.getByRole('button',{name:'关闭图表提示',exact:true});expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);await close.click();await expect(tip).toBeHidden()}
 await frame.click({position:{x:180,y:110}});await expect(tip).toBeVisible();if(tab==='latency')expect(await tip.locator('.recharts-default-tooltip').evaluate(el=>el.scrollHeight>el.clientHeight)).toBeTruthy()
 await page.locator('.detail-facts-toggle').click();await expect(tip).toBeHidden();await frame.click({position:{x:180,y:110}});await expect(tip).toBeVisible();await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page.locator('.recharts-tooltip-wrapper')).toBeHidden();expect((await frame.boundingBox())!.height).toBe(height)
})
test('selecting a distant route preserves order, scroll and focus until reopening',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,20);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const summary=page.locator('.detail-probe-legend>summary');await summary.click()
 const options=page.locator('.probe-options'),last=options.getByRole('button',{name:'线路 Tokyo 20',exact:true})
 const order=()=>options.locator('.probe-select').evaluateAll(elements=>elements.map(el=>el.getAttribute('aria-label')))
 const before=await order();await last.scrollIntoViewIfNeeded();const scroll=await options.evaluate(el=>el.scrollTop);expect(scroll).toBeGreaterThan(0)
 await last.click();await expect(last).toHaveAttribute('aria-pressed','true');await expect(last).toBeFocused()
 expect(await order()).toEqual(before);expect(Math.abs(await options.evaluate(el=>el.scrollTop)-scroll)).toBeLessThanOrEqual(2)
 await expect(page.locator('.detail-probe-legend')).toHaveAttribute('open','');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.keyboard.press('Escape');await expect(summary).toBeFocused();await summary.click()
 await expect.poll(async()=>(await order()).slice(0,2)).toEqual([before[0],'线路 Tokyo 20'])
 await page.keyboard.press('Escape');const frame=page.locator('.detail-chart-frame');await frame.click({position:{x:160,y:100}})
 await expect(frame.locator('.recharts-tooltip-item-name')).toHaveText([before[0]!,'线路 Tokyo 20'])
})
