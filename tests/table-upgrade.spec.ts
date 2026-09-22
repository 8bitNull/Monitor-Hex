import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page,count=6) {
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[0],id:i+1,sort:i,name:`Node ${i+1}`,online:true,last_seen:Date.now()/1000,metrics:{...nodes()[0].metrics,cpu:10+i,net_tx:i*1000000,net_rx:(count-i)*1000000}}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const id=Number(new URL(r.request().url()).pathname.split('/')[3]);return r.fulfill({json:{...metrics(),probes:{1:'浙江电信'},ping:[{task_id:1,ts:Date.now()/1000,latency:[79,80,159,160,null,40][(id-1)%6]}],...(id===6?{loss:undefined}:{loss:{1:id===2?4:0}})}})})
}
async function table(page:Page){await page.goto('/');await page.getByRole('button',{name:'表格视图',exact:true}).click();await page.locator('.table-ping').first().scrollIntoViewIfNeeded();await page.locator('.table-ping strong').first().waitFor();await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=0)}
test('grouped table fits desktop and sorts each network metric independently',async({page})=>{
 await setup(page);await table(page);await expect(page.locator('thead th')).toHaveCount(8)
 expect(await page.locator('.table-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy()
 await page.getByLabel('实时网速排序',{exact:true}).selectOption('download:desc');await expect(page.locator('.table-node-name').first()).toContainText('Node 1')
 await page.getByLabel('实时网速排序',{exact:true}).selectOption('upload:desc');await expect(page.locator('.table-node-name').first()).toContainText('Node 6')
 await page.getByLabel('网络质量排序',{exact:true}).selectOption('loss:desc');await expect(page.locator('.table-node-name').first()).toContainText('Node 2');await expect(page.locator('.table-node-name').last()).toContainText('Node 6')
 await page.getByLabel('表格排序',{exact:true}).selectOption('latency:desc');await expect(page.locator('.table-node-name').last()).toContainText('Node 5')
 await page.getByRole('button',{name:'恢复默认顺序',exact:true}).click();await expect(page.locator('.table-node-name').first()).toContainText('Node 1')
})
test('table sorting sits before the card and table controls',async({page})=>{
 await setup(page);await table(page)
 const toolbar=page.locator('.view-toolbar');await expect(toolbar.locator('.table-sort-toolbar')).toHaveCount(1);await expect(toolbar.locator('.view-switch')).toHaveCount(1);await expect(toolbar.locator('.column-options')).toHaveCount(1);await expect(page.locator('.node-browser + .table-sort-toolbar')).toHaveCount(0)
 const order=await toolbar.evaluate(element=>Array.from(element.children).map(child=>child.className));expect(order[0]).toBe('table-sort-toolbar');expect(order[1]).toBe('view-switch');expect(order[2]).toContain('column-options')
})
test('legacy columns remain reversible and grouped mode never revives a hidden direction',async({page})=>{
 await setup(page);await page.addInitScript(()=>{if(!sessionStorage.getItem('monitor-next-browse-v1'))sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({columnsVersion:3,columns:['cpu','download','latency'],mobileColumns:[]}))})
 await table(page);await expect(page.locator('thead th')).toHaveCount(5)
 await page.getByLabel('显示列',{exact:true}).click();await page.getByLabel('列布局',{exact:true}).selectOption('grouped');await expect(page.locator('thead th')).toHaveCount(4)
 await expect(page.locator('.table-speed [data-direction=upload]')).toHaveCount(0);await expect(page.locator('.table-speed [data-direction=download]')).toHaveCount(6)
 await page.keyboard.press('Escape');await expect(page.getByLabel('显示列',{exact:true})).toBeFocused()
 await page.reload();await expect(page.locator('thead th')).toHaveCount(4)
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('monitor-next-table-v3-backup')!).columns)).toEqual(['cpu','download','latency'])
 await page.setViewportSize({width:390,height:844});await expect(page.locator('thead th')).toHaveCount(2)
})
test('mobile presets, edge hints and full name disclosure preserve desktop columns',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});await table(page)
 await expect(page.locator('thead th')).toHaveCount(5);await expect(page.locator('.table-shell')).toHaveAttribute('data-right','true')
 await page.getByLabel('显示列',{exact:true}).click();await page.locator('.table-presets').getByRole('button',{name:'网络',exact:true}).click();await expect(page.locator('thead th')).toHaveCount(4)
 await page.keyboard.press('Escape');await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=el.scrollWidth)
 await expect(page.locator('.table-shell')).toHaveAttribute('data-right','false');await expect(page.locator('.table-shell')).toHaveAttribute('data-left','true')
 await page.locator('.table-name-info').first().click();await expect(page.getByRole('dialog',{name:'节点资料'})).toContainText('Node 1');await page.keyboard.press('Escape');await expect(page.locator('.table-name-info').first()).toBeFocused()
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('thead th')).toHaveCount(8)
})
test('latency grade boundaries and unknown loss remain distinct',async({page})=>{
 await setup(page);await table(page)
 await expect(page.locator('.table-ping').nth(0)).toHaveAttribute('data-tone','good');await expect(page.locator('.table-ping').nth(1)).toHaveAttribute('data-tone','fair');await expect(page.locator('.table-ping').nth(3)).toHaveAttribute('data-tone','bad');await expect(page.locator('.table-ping').nth(4)).toHaveAttribute('data-tone','timeout')
 await expect(page.locator('.table-network-meta').nth(5)).toContainText('24h 丢包 —');await expect(page.locator('.table-network-meta').first()).toContainText('24h 丢包 0.0%')
 await expect(page.locator('.table-speed').first()).toContainText('0Mbps')
})
test('table scroll, sticky header and clicked row restore on return',async({page})=>{
 await setup(page,40);await table(page)
 const scroll=page.locator('.table-scroll');await scroll.evaluate(el=>el.scrollTop=1000)
 const row=page.locator('.table-node-name').nth(17);await row.scrollIntoViewIfNeeded();const before=await row.boundingBox(),top=await scroll.evaluate(el=>el.scrollTop)
 const header=await page.locator('thead th').first().boundingBox(),box=await scroll.boundingBox();expect(Math.abs(header!.y-box!.y)).toBeLessThan(3)
 await row.click();await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(row).toBeFocused()
 await expect.poll(async()=>Math.abs((await row.boundingBox())!.y-before!.y)).toBeLessThan(25)
 expect(Math.abs(await scroll.evaluate(el=>el.scrollTop)-top)).toBeLessThan(25)
})
test('table layouts in both languages and themes at responsive boundaries',async({page})=>{
 test.setTimeout(90000);await setup(page)
 for(const language of ['zh','en'])for(const appearance of ['light','dark'])for(const width of [320,390,720,721,900,1440]){
  await page.setViewportSize({width,height:1000});await page.addInitScript(({appearance,language})=>{localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,appearance}));localStorage.setItem('monitor-next-language',language)}, {appearance,language})
  await page.goto('/');await page.getByRole('button',{name:language==='en'?'Table view':'表格视图',exact:true}).click();await page.locator('.table-ping').first().scrollIntoViewIfNeeded();await page.locator('.table-ping strong').first().waitFor();await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  if(width===1440)expect(await page.locator('.table-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy()
  await page.screenshot({path:`tests/artifacts/v015/table-${language}-${appearance}-${width}.png`})
 }
})
test('visible rows load lazily and explicit quality sorting reads the complete fleet',async({page})=>{
 let requests=0;page.on('request',request=>{if(request.url().includes('/metrics?'))requests++})
 await setup(page,30);await table(page);expect(requests).toBeLessThan(30)
 await page.getByLabel('表格排序',{exact:true}).selectOption('loss:desc')
 await expect(page.locator('.table-ping strong')).toHaveCount(30);await expect(page.locator('.sort-note')).toContainText('30/30')
 expect(requests).toBe(30)
})
test('custom thresholds, stale history and very small actual rates keep their meanings',async({page})=>{
 await setup(page);await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,latencyWarn:100,latencyHigh:200})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:6},(_,i)=>({...nodes()[0],id:i+1,name:`Node ${i+1}`,online:i!==4,last_seen:Date.now()/1000,metrics:{...nodes()[0].metrics,net_tx:i===0?0:i===1?1:1000000}}))}}))
 await table(page);await expect(page.locator('.table-ping').nth(1)).toHaveAttribute('data-tone','good');await expect(page.locator('.table-ping').nth(3)).toHaveAttribute('data-tone','fair')
 await expect(page.locator('.table-speed').nth(1)).toContainText('<0.001Mbps');await expect(page.locator('.table-speed').nth(4)).toContainText('—')
 await expect(page.locator('.table-ping').nth(4)).toContainText('历史数据');await expect(page.locator('.table-ping').nth(4)).not.toHaveAttribute('data-tone',/good|fair|bad|timeout/)
})
test('scaled layout and column menus remain operable with keyboard',async({page})=>{
 await setup(page);await table(page);await page.evaluate(()=>document.documentElement.style.zoom='2')
 await page.getByLabel('显示列',{exact:true}).click();await expect(page.getByLabel('列布局',{exact:true})).toBeVisible()
 await page.locator('.table-presets').getByRole('button',{name:'费用',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByLabel('显示列',{exact:true})).toBeFocused()
 await expect(page.locator('.table-traffic')).toHaveCount(6);await expect(page.locator('.table-expiry')).toHaveCount(6)
 const menu=page.locator('.column-options');await page.getByLabel('显示列',{exact:true}).click();await page.getByRole('heading',{name:'服务器总览'}).click();await expect(menu).not.toHaveAttribute('open','')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.screenshot({path:'tests/artifacts/v015/table-200-percent.png'})
})
