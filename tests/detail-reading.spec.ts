import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {toggleSettings,visualSelect} from './settings'
async function setup(page:any,count=3){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],agent_version:'1.2.3',ipv4:'192.0.2.1',remark:'国际线路;Backup',expires_at:'2027-01-01'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,`Route ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:count},(_,i)=>({...p,task_id:i+1,latency:p.latency+i*10})))}})})
 await page.goto('/node/1');await expect(page.locator('.detail-resource-charts')).toBeVisible()
}
test('latency controls float at the chart top-right with a soft route border',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const tools=page.locator('.latency-chart-tools'),frame=page.locator('.detail-chart-frame'),summary=page.locator('.detail-probe-legend>summary')
 await expect(tools.locator('.detail-smooth')).toBeVisible();await expect(summary).toBeVisible()
 const toolBox=await tools.boundingBox(),frameBox=await frame.boundingBox();expect(toolBox).not.toBeNull();expect(frameBox).not.toBeNull()
 expect(toolBox!.x+toolBox!.width).toBeLessThanOrEqual(frameBox!.x+frameBox!.width+1);expect(toolBox!.y).toBeGreaterThanOrEqual(frameBox!.y-1);expect(toolBox!.y).toBeLessThan(frameBox!.y+80)
 const border=await summary.evaluate((element)=>getComputedStyle(element).borderColor),foreground=await summary.evaluate((element)=>getComputedStyle(element).color)
 expect(border).not.toBe(foreground)
 await summary.click();await expect(page.locator('.probe-options')).toBeVisible()
})
for(const width of [320,390,430,720,899,900,1024,1440,1920])test(`detail reading and toolbar geometry at ${width}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:844})
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance}))},{language,appearance})
  await setup(page)
  for(const graph of ['bar','ring','columns','minimal']){
   await toggleSettings(page);await visualSelect(page,'graph',graph);await toggleSettings(page);await page.evaluate(()=>scrollTo(0,0))
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   if(width===390){const b=(await page.locator('.detail-chart-toolbar').boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(844)}
  }
  for(const tab of ['resources','latency']){
   await page.getByRole('button',{name:language==='zh'?(tab==='resources'?'资源':'网络延迟'):(tab==='resources'?'Resources':'Network latency'),exact:true}).click()
   const tabs=(await page.locator('.detail-tabs').boundingBox())!,ranges=(await page.locator('.detail-ranges').boundingBox())!,refresh=(await page.locator('.detail-refresh').boundingBox())!
   if(width<=600){expect(Math.abs(tabs.y-ranges.y)).toBeLessThanOrEqual(2);const primary=await page.locator('.detail-ranges button').evaluateAll(buttons=>buttons.slice(0,3).map(button=>button.getBoundingClientRect().top));expect(new Set(primary.map(top=>Math.round(top))).size).toBe(1);if(tab==='resources'){const all=await page.locator('.detail-ranges button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().top));expect(all[3]).toBeGreaterThan(all[2])}}
   else if(width<1200){expect(ranges.y).toBeGreaterThan(tabs.y);expect(Math.abs(refresh.y+refresh.height/2-ranges.y-ranges.height/2)).toBeLessThan(2)}
   else expect(Math.abs(tabs.y-ranges.y)).toBeLessThan(2)
   for(const b of await page.locator('.detail-chart-toolbar button').all()){const box=(await b.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44)}
   expect(await page.locator('.detail-history').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  }
  if(width<900)await expect(page.locator('.detail-facts-toggle')).toHaveAttribute('aria-expanded','false')
  else {await expect(page.locator('.detail-facts-toggle')).toHaveCount(0);await expect(page.locator('#detail-fact-groups')).toBeVisible()}
 }
})
test('device information preference persists, exports, inherits and resets',async({page})=>{
 await page.setViewportSize({width:899,height:900});await setup(page)
 const toggle=page.locator('.detail-facts-toggle');await expect(toggle).toHaveAttribute('aria-expanded','false')
 await page.setViewportSize({width:900,height:900});await expect(toggle).toHaveCount(0);await expect(page.locator('#detail-fact-groups')).toBeVisible()
 await page.setViewportSize({width:899,height:900});await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.click();await page.reload();await expect(toggle).toHaveAttribute('aria-expanded','true')
 await toggleSettings(page);const select=page.getByLabel('设备资料展开方式',{exact:true});await expect(select).toHaveValue('expanded')
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出外观偏好',exact:true}).click();const path=await (await download).path()
 await page.getByRole('button',{name:'恢复默认外观',exact:true}).click();await expect(select).toHaveValue('expanded')
 await page.getByRole('button',{name:'重置全部偏好',exact:true}).click();await expect(select).toHaveValue('auto')
 await page.getByLabel('导入外观偏好',{exact:true}).setInputFiles(path!);await expect(select).toHaveValue('expanded')
 await select.selectOption('expanded');await toggleSettings(page);await page.setViewportSize({width:390,height:844});await expect(toggle).toHaveAttribute('aria-expanded','true')
 await expect(page.getByRole('region',{name:'硬件与系统',exact:true})).toContainText('1.2.3')
})
test('loading empty failure and success share the same history canvas',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);const body=page.locator('.detail-history-body');const height=(await body.boundingBox())!.height
 await page.unroute('**/api/nodes/*/metrics?*');let pending:any,calls=0;await page.route('**/api/nodes/*/metrics?*',r=>{pending=r;calls++})
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page.getByLabel('正在读取历史数据')).toBeVisible();expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
 await pending.fulfill({json:{metrics:[],ping:[],probes:{}}});await expect(body).toContainText('这段时间没有历史数据');expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
 await page.getByRole('button',{name:'刷新历史',exact:true}).click();await expect.poll(()=>calls).toBe(2);await pending.fulfill({status:503})
 await expect(page.locator('.history-notice')).toBeVisible();expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
})
for(const count of [1,3,20])test(`route selector handles ${count} routes without moving the plot`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,count);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const selector=page.locator('.detail-probe-legend'),plot=page.locator('.detail-chart-frame');await expect(selector).not.toHaveAttribute('open','')
 const height=(await plot.boundingBox())!.height;await selector.locator('summary').click();await expect(page.locator('.probe-options button[aria-pressed]')).toHaveCount(count)
 await page.locator('.probe-options button[aria-pressed]').last().click();expect((await plot.boundingBox())!.height).toBe(height)
 await page.keyboard.press('Escape');await expect(selector).not.toHaveAttribute('open','');await expect(selector.locator('summary')).toBeFocused()
 await selector.locator('summary').click();await page.getByRole('button',{name:'显示全部线路',exact:true}).click();await expect(selector.locator('summary')).toContainText(`已选 ${count} / ${count}`)
 await page.getByRole('button',{name:'隐藏全部线路',exact:true}).click();await expect(plot).toContainText('没有选中任何探测')
})
test('long identity notes expand and copy feedback does not move facts',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],name:'超长名称'.repeat(20),remark:Array.from({length:8},(_,i)=>`备注${i} ${'长文本'.repeat(30)}`).join(';')}]}}));await page.reload()
 await page.setViewportSize({width:320,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.getByRole('button',{name:'展开备注',exact:true}).click();await expect(page.locator('.detail-meta-tags .detail-remark-tag')).toHaveCount(8)
 await page.getByRole('button',{name:'收起备注',exact:true}).click();await page.locator('.detail-facts-toggle').click()
 const button=page.getByRole('button',{name:'复制：CPU',exact:true}),row=button.locator('xpath=ancestor::dd');const before=(await row.boundingBox())!.height
 await button.click();await expect(page.getByRole('status')).toHaveText('已复制');expect((await row.boundingBox())!.height).toBe(before)
 await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{value:()=>Promise.reject(new Error('denied')),configurable:true}));await button.click()
 await expect(page.getByRole('status')).toHaveText('复制失败，请手动选择文本');expect((await row.boundingBox())!.height).toBe(before)
})
test('mobile chart tap shows bounded tooltip with units',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page)
 const frame=page.locator('.resource-chart-panel .detail-chart-frame');await frame.scrollIntoViewIfNeeded();await frame.click({position:{x:180,y:120}})
 const tip=frame.locator('.recharts-tooltip-wrapper');await expect(tip).toBeVisible();await expect(tip).toContainText('%')
 const b=(await tip.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(390)
})
