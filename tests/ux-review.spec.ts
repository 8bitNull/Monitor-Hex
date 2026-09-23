import {chooseOption} from './select'
import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,`线路 ${i+1}`])),ping:Array.from({length:8},(_,i)=>metrics().ping.map(p=>({...p,task_id:i+1,latency:p.latency+i*20}))).flat()}}))
}
test('offline filter composes with search and compact summary survives reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/')
 await page.getByRole('button',{name:'筛选离线节点',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('.filter-match-count')).toContainText('1')
 await page.getByRole('button',{name:'清除状态筛选',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(6)
 await page.getByRole('button',{name:'收起总览',exact:true}).click();await expect(page.locator('.summary-grid')).toBeHidden();await page.reload();await expect(page.locator('.summary-compact')).toBeVisible()
 await page.getByRole('button',{name:'搜索节点',exact:true}).click();await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('Tokyo');await page.getByRole('button',{name:'查看 1 个结果',exact:true}).click();await expect(page.locator('.mobile-search-panel')).toHaveCount(0);await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('#node-results')).toBeFocused()
})
for(const width of [320,360,390,430])test(`default mobile table fits ${width}px and keeps status`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page);await page.goto('/');await page.getByRole('button',{name:'表格视图',exact:true}).click()
 await expect(page.locator('thead th')).toHaveCount(3);await expect(page.locator('tbody .status-pill')).toHaveCount(6)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await expect(page.locator('thead th').last()).toHaveText('延迟');await expect(page.locator('thead [data-column=remark]')).toHaveCount(0)
 await expect(page.locator('.table-sort-toolbar,.column-options')).toHaveCount(0)
})
test('all routes have legends, summary follows loss route, keyboard zoom has readable dates',async({page})=>{
 await setup(page);await page.goto('/node/1?routes=all#latency');await expect(page.locator('.route-chips button')).toHaveCount(8)
 await expect(page.getByLabel('统计线路',{exact:true})).toHaveCount(0);await chooseOption(page.getByLabel('丢包线路',{exact:true}),'3');await expect(page.locator('.latency-summary-route')).toHaveText('线路 3')
 const start=page.getByRole('slider',{name:'开始时间',exact:true});await expect(start).toHaveAttribute('aria-valuenow','0');await start.focus();await page.keyboard.press('ArrowRight');await expect(start).toHaveAttribute('aria-valuenow','1');await expect(start).toHaveAttribute('aria-valuetext',/\d/);await expect(page.locator('.loss-unavailable')).toBeVisible();await page.getByRole('button',{name:'恢复范围',exact:true}).click();await expect(page.locator('.loss-unavailable')).toHaveCount(0)
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.route-chips button')).toHaveCount(5);await page.getByRole('button',{name:'展开其余 4 条线路',exact:true}).click();await expect(page.locator('.route-chips button')).toHaveCount(9)
})
test('empty history offers recovery and a failed first request never remains loading',async({page})=>{
 await setup(page);await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await page.goto('/node/1#latency');await expect(page.locator('.history-empty')).toBeVisible();await expect(page.locator('.history-loading')).toHaveCount(0)
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping:[],probes:{}}}));await page.locator('.detail-history').getByRole('button',{name:'重试',exact:true}).click();await page.getByRole('button',{name:'调整时间范围',exact:true}).click();await expect(page.getByRole('button',{name:'1 小时',exact:true})).toBeFocused()
})
test('resource toolbar text and desktop-only settings are explicit on mobile',async({page})=>{
 await page.setViewportSize({width:320,height:844});await setup(page);await page.goto('/node/1');await expect(page.locator('.detail-tabs').getByText('资源',{exact:true})).toBeVisible();await expect(page.locator('.detail-resource-metric-mobile summary')).toContainText('CPU')
 for(const l of [page.locator('.detail-ranges'),page.locator('.detail-refresh'),page.locator('.detail-resource-metric-mobile summary')]){const box=await l.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320)}
 await page.getByRole('button',{name:'显示与偏好',exact:true}).click();await expect(page.getByLabel('资料密度',{exact:true})).toHaveCount(0);await expect(page.getByText('仅桌面生效',{exact:true}).first()).toBeVisible();await expect(page.getByLabel('背景图片地址',{exact:true})).toBeHidden();await page.getByText('高级外观',{exact:true}).click();await expect(page.getByLabel('背景图片地址',{exact:true})).toBeVisible()
})

for(const width of [320,390,1440])test(`one loss selector owns summary and hidden routes cannot reclaim it at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await setup(page);await page.goto('/node/1?routes=1,2,3#latency')
 const chips=page.locator('.route-chips'),summary=page.locator('.latency-summary-route'),loss=page.getByLabel('丢包线路',{exact:true})
 await expect(page.locator('.detail-chart-toolbar [data-slot=select],.detail-probe-legend,.latency-summary [data-slot=select]')).toHaveCount(0)
 await chooseOption(loss,'3');await expect(summary).toHaveText('线路 3')
 await chips.getByRole('button',{name:'线路 3',exact:true}).click();await expect(summary).toHaveText('线路 1');await expect(loss).toHaveAttribute('data-value','1')
 await chips.getByRole('button',{name:'线路 3',exact:true}).click();await expect(summary).toHaveText('线路 1')
 await chips.getByRole('button',{name:'线路 1',exact:true}).click();await expect(summary).toHaveText('线路 2')
 await chips.getByRole('button',{name:'线路 3',exact:true}).click();await expect(summary).toHaveText('线路 2');await expect(loss).toHaveCount(0)
 await chips.getByRole('button',{name:'线路 2',exact:true}).click();await expect(page.locator('.latency-summary,.loss-track')).toHaveCount(0)
 await page.getByRole('button',{name:'选择线路',exact:true}).click();await expect(chips.getByRole('button',{name:'线路 1',exact:true})).toBeFocused()
 await page.keyboard.press('Space');await expect(summary).toHaveText('线路 1')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
