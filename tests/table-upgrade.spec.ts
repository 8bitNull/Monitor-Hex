import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page,count=6) {
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[0],id:i+1,sort:i,name:`Node ${i+1}`,remark:`备注 ${i+1} <script>文本内容</script>`,online:true,last_seen:Date.now()/1000,metrics:{...nodes()[0].metrics,cpu:10+i,net_tx:i*1000000,net_rx:(count-i)*1000000}}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const id=Number(new URL(r.request().url()).pathname.split('/')[3]);return r.fulfill({json:{...metrics(),probes:{1:'浙江电信'},ping:[{task_id:1,ts:Date.now()/1000,latency:[79,80,159,160,null,40][(id-1)%6]}],...(id===6?{loss:undefined}:{loss:{1:id===2?4:0}})}})})
}
async function table(page:Page){await page.goto('/');await page.getByRole('button',{name:'表格视图',exact:true}).click();await page.locator('.table-ping').first().scrollIntoViewIfNeeded();await page.locator('.table-ping strong').first().waitFor();await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=0)}
test('grouped table fits desktop and sorts each network metric independently',async({page})=>{
 await setup(page);await table(page);await expect(page.locator('thead th')).toHaveCount(9)
 expect(await page.locator('.table-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy()
 await page.getByLabel('实时网速排序',{exact:true}).selectOption('download:desc');await expect(page.locator('.table-node-name').first()).toContainText('Node 1')
 await page.getByLabel('实时网速排序',{exact:true}).selectOption('upload:desc');await expect(page.locator('.table-node-name').first()).toContainText('Node 6')
 await page.getByLabel('网络质量排序',{exact:true}).selectOption('loss:desc');await expect(page.locator('.table-node-name').first()).toContainText('Node 2');await expect(page.locator('.table-node-name').last()).toContainText('Node 6')
 await page.getByLabel('网络质量排序',{exact:true}).selectOption('latency:desc');await expect(page.locator('.table-node-name').last()).toContainText('Node 5')
})
test('table toolbar only keeps view controls',async({page})=>{
 await setup(page);await table(page)
 const toolbar=page.locator('.view-toolbar');await expect(toolbar.locator('.table-sort-toolbar')).toHaveCount(0);await expect(toolbar.locator('.view-switch')).toHaveCount(1);await expect(toolbar.locator('.column-options')).toHaveCount(0)
 await expect(page.locator('.table-name-info,.table-presets')).toHaveCount(0)
})
test('legacy grouped columns persist without reviving a hidden direction',async({page})=>{
 await setup(page);await page.addInitScript(()=>{if(!sessionStorage.getItem('monitor-next-browse-v1'))sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({columnsVersion:3,tableLayout:'grouped',columns:['cpu','download','latency'],mobileColumns:[]}))})
 await table(page);await expect(page.locator('thead th')).toHaveCount(5)
 await expect(page.locator('.table-speed [data-direction=upload]')).toHaveCount(0);await expect(page.locator('.table-speed [data-direction=download]')).toHaveCount(6)
 await page.reload();await expect(page.locator('thead th')).toHaveCount(5)
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('monitor-next-table-v3-backup')!).columns)).toEqual(['cpu','download','latency'])
 await page.setViewportSize({width:390,height:844});await expect(page.locator('thead th')).toHaveCount(2)
})
test('mobile custom columns, edge hints and remark disclosure preserve desktop columns',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});await table(page)
 await expect(page.locator('thead th')).toHaveCount(4);await expect(page.locator('.table-shell')).toHaveAttribute('data-right','true')
 await page.keyboard.press('Escape');await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=el.scrollWidth)
 await expect(page.locator('.table-shell')).toHaveAttribute('data-right','false');await expect(page.locator('.table-shell')).toHaveAttribute('data-left','true')
 await page.locator('.table-remark').first().click();await expect(page.getByRole('dialog',{name:'备注',exact:true})).toContainText('备注 1 <script>文本内容</script>');await page.keyboard.press('Escape');await expect(page.locator('.table-remark').first()).toBeFocused()
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('thead th')).toHaveCount(9)
})
test('latency grade boundaries and unknown loss remain distinct',async({page})=>{
 await setup(page);await table(page)
 await expect(page.locator('.table-ping').nth(0)).toHaveAttribute('data-tone','good');await expect(page.locator('.table-ping').nth(1)).toHaveAttribute('data-tone','fair');await expect(page.locator('.table-ping').nth(3)).toHaveAttribute('data-tone','bad');await expect(page.locator('.table-ping').nth(4)).toHaveAttribute('data-tone','timeout')
 await page.locator('.table-ping').nth(5).scrollIntoViewIfNeeded();await expect(page.locator('.table-network-meta').nth(5)).toContainText('24h 丢包 —');await expect(page.locator('.table-network-meta').first()).toContainText('24h 丢包 0.0%')
 await expect(page.locator('.table-speed').first()).toContainText('0Mbps')
})
test('20-row pagination, filtering, sorting and return from detail',async({page})=>{
 await setup(page,45);await table(page)
 await expect(page.locator('tbody tr')).toHaveCount(20)
 await page.getByRole('button',{name:'下一页',exact:true}).click()
 await expect(page.locator('.table-node-name').first()).toContainText('Node 21')
 const row=page.locator('.table-node-name').nth(3);await row.click();await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(row).toBeFocused()
 await expect(page.getByLabel('页码',{exact:true})).toHaveValue('2')
 await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(5)
 await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'名称',exact:true}).click();await expect(page.getByLabel('页码',{exact:true})).toHaveValue('1')
 await page.getByRole('button',{name:'下一页',exact:true}).click()
 await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('Node 45');await expect(page.locator('tbody tr')).toHaveCount(1)
 await expect(page.locator('.table-node-name')).toContainText('Node 45');await expect(page.getByRole('button',{name:'下一页',exact:true})).toHaveCount(0)
 expect(await page.locator('.table-scroll').evaluate(el=>el.scrollHeight===el.clientHeight)).toBeTruthy()
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
 await page.getByLabel('网络质量排序',{exact:true}).selectOption('loss:desc')
 await expect(page.locator('tbody tr')).toHaveCount(20);await expect(page.locator('.sort-note')).toContainText('30/30')
 expect(requests).toBe(30)
})
test('custom thresholds, stale history and very small actual rates keep their meanings',async({page})=>{
 await setup(page);await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,latencyWarn:100,latencyHigh:200})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:6},(_,i)=>({...nodes()[0],id:i+1,name:`Node ${i+1}`,online:i!==4,last_seen:Date.now()/1000,metrics:{...nodes()[0].metrics,net_tx:i===0?0:i===1?1:1000000}}))}}))
 await table(page);await expect(page.locator('.table-ping').nth(1)).toHaveAttribute('data-tone','good');await expect(page.locator('.table-ping').nth(3)).toHaveAttribute('data-tone','fair')
 await expect(page.locator('.table-speed').nth(1)).toContainText('<0.001Mbps');await expect(page.locator('.table-speed').nth(4)).toContainText('—')
 await expect(page.locator('.table-ping').nth(4)).toContainText('历史数据');await expect(page.locator('.table-ping').nth(4)).not.toHaveAttribute('data-tone',/good|fair|bad|timeout/)
})
test('scaled layout and remark disclosure remain operable with keyboard',async({page})=>{
 await setup(page);await table(page);await page.evaluate(()=>document.documentElement.style.zoom='2')
 const remark=page.locator('.table-remark').first();await remark.focus();await page.keyboard.press('Enter')
 await expect(page.getByRole('dialog',{name:'备注',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(remark).toBeFocused()
 await expect(page.locator('.table-traffic')).toHaveCount(6);await expect(page.locator('.table-expiry')).toHaveCount(6)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.screenshot({path:'tests/artifacts/v015/table-200-percent.png'})
})
