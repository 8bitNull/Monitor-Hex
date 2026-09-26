import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,`线路 ${i+1}`])),ping:Array.from({length:8},(_,i)=>metrics().ping.map(p=>({...p,task_id:i+1,latency:p.latency+i*20}))).flat()}}))
}
for(const width of [320,390])test(`mobile header actions have reachable targets at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page);await page.goto('/')
 const actions=[page.getByRole('button',{name:'搜索节点',exact:true}),page.getByRole('button',{name:'Language / 语言'}),page.getByRole('link',{name:'登录',exact:true}),page.getByRole('button',{name:'切换明暗模式'})]
 for(const action of actions){const box=await action.boundingBox();expect(box).not.toBeNull();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44)}
 await expect(page.getByRole('link',{name:'登录',exact:true}).locator('svg.lucide-log-in')).toHaveCount(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test('empty node list gives the next step for the current visitor',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[]}}))
 await page.route('**/api/me',r=>r.fulfill({json:{authed:false,github:false,site_name:'HEX',public_page:true}}))
 await page.goto('/');await expect(page.locator('#node-results')).toContainText('还没有节点');await expect(page.locator('#node-results')).toContainText('请联系管理员添加节点。')
 await page.route('**/api/me',r=>r.fulfill({json:{authed:true,github:false,site_name:'HEX',public_page:true}}))
 await page.reload();await expect(page.locator('#node-results').getByRole('link',{name:'前往后台添加节点'})).toHaveAttribute('href','/admin/')
})
test('offline filter composes with search and compact summary survives reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/')
 await page.getByRole('button',{name:'筛选离线节点',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('.active-filters')).toBeHidden();await expect(page.locator('.node-browser')).toBeHidden()
 await page.getByRole('button',{name:'显示全部节点',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(6)
 await page.getByRole('button',{name:'收起总览',exact:true}).click();await expect(page.locator('.summary-grid')).toBeHidden();await page.reload();await expect(page.locator('.summary-compact')).toBeVisible()
 await page.getByRole('button',{name:'搜索节点',exact:true}).click();await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('Tokyo');await page.getByRole('button',{name:'查看 1 个结果',exact:true}).click();await expect(page.locator('.mobile-search-panel')).toHaveCount(0);await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('#node-results')).toBeFocused()
})
for(const width of [320,390])test(`mobile summary status targets remain reachable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page);await page.goto('/')
 const online=page.getByRole('button',{name:'筛选在线节点',exact:true}),all=page.getByRole('button',{name:'显示全部节点',exact:true}),offline=page.getByRole('button',{name:'筛选离线节点',exact:true})
 const boxes=await Promise.all([online,all,offline].map(button=>button.boundingBox()))
 for(const box of boxes){expect(box).not.toBeNull();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44)}
 expect(boxes[0]!.x+boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x)
  await online.click();await expect(page.locator('.node-card')).toHaveCount(5)
  await expect(page.locator('.active-filters')).toBeHidden();await expect(page.locator('.node-browser')).toBeHidden()
 await all.click();await expect(page.locator('.node-card')).toHaveCount(6)
 await offline.click();await expect(page.locator('.node-card')).toHaveCount(1)
})
test('desktop status-only filtering has no duplicate filter panel',async({page})=>{
 await setup(page);await page.goto('/')
 await page.getByRole('button',{name:'筛选在线节点',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(5)
 await expect(page.locator('.node-browser')).toBeHidden()
 await page.getByRole('button',{name:'显示全部节点',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(6)
 await page.getByRole('button',{name:'筛选离线节点',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.node-browser')).toBeHidden()
})
for(const width of [320,360,390,430])test(`default mobile table fits ${width}px and keeps status`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page);await page.goto('/');await page.getByRole('button',{name:'表格视图',exact:true}).click()
 await expect(page.locator('thead th')).toHaveCount(3);await expect(page.locator('tbody .status-pill')).toHaveCount(6)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await expect(page.locator('thead th').last()).toHaveText('延迟');await expect(page.locator('thead [data-column=remark]')).toHaveCount(0)
 await expect(page.locator('.table-sort-toolbar,.column-options')).toHaveCount(0)
})
test('all routes have legends and keyboard zoom has readable dates',async({page})=>{
 await setup(page);await page.goto('/node/1?routes=all#latency');await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(8)
 await expect(page.locator('.route-chips .expand-routes')).toBeVisible()
 const start=page.getByRole('slider',{name:'开始时间',exact:true});await expect(start).toHaveAttribute('aria-valuenow','0');await start.focus();await page.keyboard.press('ArrowRight');await expect(start).toHaveAttribute('aria-valuenow','1');await expect(start).toHaveAttribute('aria-valuetext',/\d/);await expect(page.getByRole('button',{name:'恢复范围',exact:true})).toBeVisible();await page.getByRole('button',{name:'恢复范围',exact:true}).click()
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(8)
})
test('empty history offers recovery and a failed first request never remains loading',async({page})=>{
 await setup(page);await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await page.goto('/node/1#latency');await expect(page.locator('.history-empty')).toBeVisible();await expect(page.locator('.history-loading')).toHaveCount(0)
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping:[],probes:{}}}));await page.locator('.detail-history').getByRole('button',{name:'重试',exact:true}).click();await page.getByRole('button',{name:'调整时间范围',exact:true}).click();await expect(page.getByRole('button',{name:'1 小时',exact:true})).toBeFocused()
})
test('resource toolbar controls remain explicit on mobile',async({page})=>{
 await page.setViewportSize({width:320,height:844});await setup(page);await page.goto('/node/1');await expect(page.locator('.detail-tabs').getByText('资源',{exact:true})).toBeVisible();await expect(page.locator('.detail-resource-metric-mobile summary')).toContainText('CPU')
 for(const l of [page.locator('.detail-ranges'),page.locator('.detail-refresh'),page.locator('.detail-resource-metric-mobile summary')]){const box=await l.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320)}
 await expect(page.locator('.settings-drawer')).toHaveCount(0)
})

for(const width of [320,390,1440])test(`route chips control curves and loss visibility at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await setup(page);await page.goto('/node/1?routes=1,2,3#latency')
 const chips=page.locator('.route-chips'),curves=page.locator('.detail-chart-frame .recharts-line-curve')
 await expect(page.locator('.latency-summary,.latency-stat-details')).toHaveCount(0)
 await expect(curves).toHaveCount(3)
 await chips.getByRole('button',{name:'线路 3',exact:true}).click();await expect(curves).toHaveCount(2)
 await chips.getByRole('button',{name:'线路 1',exact:true}).click();await expect(curves).toHaveCount(1)
 await expect(page.locator('.loss-track')).toBeVisible()
 await chips.getByRole('button',{name:'线路 2',exact:true}).click();await expect(page.locator('.loss-track')).toHaveCount(0)
 await expect(page.locator('.detail-chart-frame')).toContainText('没有选中任何探测')
 await page.getByRole('button',{name:'选择线路',exact:true}).click();await expect(chips.getByRole('button',{name:'线路 1',exact:true})).toBeFocused()
 await page.keyboard.press('Space');await expect(curves).toHaveCount(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
