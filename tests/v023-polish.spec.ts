import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:any){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((node,i)=>i===0?{...node,ipv4:'192.0.2.10',ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd',expires_at:new Date(Date.now()+3*86400000).toISOString().slice(0,10)}:node)}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}

test('overview search and back-to-top stay compact on desktop',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await setup(page);await page.goto('/');await expect(page.locator('.desktop-header-search input')).toBeVisible()
 await page.locator('.desktop-header-search input').fill('Hong Kong');await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('.node-card')).toContainText('Hong Kong')
 await page.locator('.desktop-header-search input').fill('');await expect(page.locator('.node-card')).toHaveCount(6)
 await page.evaluate(()=>scrollTo(0,1200));await expect(page.getByRole('button',{name:'返回顶部',exact:true})).toBeVisible();await page.getByRole('button',{name:'返回顶部',exact:true}).click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(10)
})

test('mobile search and card disclosure preserve the primary scan',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/');await page.locator('.mobile-header-search-toggle').click();const popover=page.locator('.mobile-header-search-popover'),search=popover.locator('input');await expect(search).toBeVisible();const popoverBox=(await popover.boundingBox())!,viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));expect(Math.abs(popoverBox.x+popoverBox.width/2-viewport.width/2)).toBeLessThanOrEqual(1);expect(Math.abs(popoverBox.y+popoverBox.height/2-viewport.height/2)).toBeLessThanOrEqual(1);await search.click();await expect.poll(async()=>search.evaluate(el=>{const style=getComputedStyle(el);const control=el.parentElement?getComputedStyle(el.parentElement):null;return [style.outlineStyle,style.boxShadow,control?.boxShadow]})).toEqual(['none','none','none']);await search.fill('Tokyo');await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByRole('button',{name:'清除搜索',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(6)
 const disclosure=page.locator('.node-secondary-disclosure').first();await expect(disclosure).not.toHaveAttribute('open','');await disclosure.locator('summary').click();await expect(disclosure).toHaveAttribute('open','');await expect(disclosure.locator('.node-secondary')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test('mobile detail groups, alignment and history ranges are bounded',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/node/1');await page.locator('.detail-facts-toggle').click()
 await expect(page.locator('section[aria-label="硬件与系统"] details')).toHaveAttribute('open','');await expect(page.locator('section[aria-label="网络与流量"] details')).not.toHaveAttribute('open','');await expect(page.locator('section[aria-label="费用与到期"] details')).not.toHaveAttribute('open','')
 const hardware=page.locator('section[aria-label="硬件与系统"]');await expect(hardware.getByRole('button',{name:'复制：CPU',exact:true})).toHaveCount(0);await expect(hardware.locator('.fact-value').filter({hasText:'AMD EPYC'}).first()).toHaveCSS('text-align','right');await page.locator('section[aria-label="网络与流量"] summary').click();await expect(page.getByRole('button',{name:'复制：IPv6',exact:true}).locator('xpath=ancestor::dd').locator('.fact-value')).toHaveCSS('text-align','right')
 const toolbar=page.locator('.detail-chart-toolbar');await expect(toolbar).toHaveAttribute('data-range-count','4');const tabs=await toolbar.locator('.detail-tabs button').evaluateAll(bs=>bs.map(b=>{const box=b.getBoundingClientRect();return {top:box.top,bottom:box.bottom,x:box.x,right:box.right}}));const ranges=await toolbar.locator('.detail-ranges button').evaluateAll(bs=>bs.map(b=>{const box=b.getBoundingClientRect();return {top:box.top,bottom:box.bottom,x:box.x,right:box.right}}));expect(new Set([...tabs,...ranges].map(box=>Math.round(box.top))).size).toBe(1);expect(ranges[3].x).toBeGreaterThan(ranges[2].x);expect(ranges[3].top).toBe(ranges[2].top);const toolbarBox=await toolbar.boundingBox(),refreshBox=(await toolbar.locator('.detail-refresh').boundingBox())!;expect(ranges[3].right).toBeLessThanOrEqual(refreshBox.x);expect(ranges[3].right).toBeLessThanOrEqual(toolbarBox!.x+toolbarBox!.width);await expect(toolbar.locator('.detail-refresh')).toBeVisible()
 await page.getByRole('button',{name:'网络延迟',exact:true}).click();await expect(toolbar).toHaveAttribute('data-range-count','3');const latencyRanges=await toolbar.locator('.detail-ranges button').evaluateAll(bs=>bs.map(b=>{const box=b.getBoundingClientRect();return {top:box.top,bottom:box.bottom,right:box.right}}));expect(new Set(latencyRanges.map(box=>Math.round(box.top))).size).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test('desktop billing state is explicit without changing the three-column frame',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await setup(page);await page.goto('/node/1');await expect(page.locator('.billing-status')).toHaveAttribute('data-state','soon');await expect(page.locator('.detail-fact-groups>section')).toHaveCount(3);const box=await page.locator('.detail-fact-groups>section').nth(2).boundingBox();expect(box).not.toBeNull()
})
