import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
test('speed changes follow samples and preserve the same peak on detail navigation',async({page})=>{
 await page.clock.install()
 let rx=2000,tx=1000
 await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,last_seen:Math.floor(Date.now()/1000),metrics:{...n.metrics,net_rx:rx,net_tx:tx}}]}})})
 await page.goto('/')
 const track=page.locator('.download .speed-track i')
 await expect(track).toHaveAttribute('style','width: 100%;')
 rx=100000;await page.clock.runFor(5001)
 await expect(page.locator('.upload .speed-track i')).toHaveAttribute('style','width: 1%;')
 rx=2000;await page.clock.runFor(5001)
 await expect(track).toHaveAttribute('style','width: 2%;')
 await page.getByRole('button',{name:'查看 Tokyo · 东京主节点',exact:true}).click()
 await expect(page.locator('.detail-speed .download .speed-track i')).toHaveAttribute('style','width: 2%;')
})
test('long single note stays compact on home and complete in detail',async({page})=>{
 const remark='完整备注'.repeat(100)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark}]}}))
 await page.setViewportSize({width:320,height:900});await page.goto('/')
 const tag=page.locator('.node-remarks .detail-remark-tag')
 await expect(tag).toContainText('…')
 expect(await tag.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(30)
 await page.getByRole('button',{name:'查看完整备注'}).click()
 await expect(page.locator('.detail-remark')).toHaveText(remark)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
import {toggleSettings,visualSelect} from './settings'
import {metrics} from '../scripts/fixtures.mjs'
test('packet loss follows graph style and preserves zero, fractional, total and unknown loss',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,4)}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const id=Number(new URL(r.request().url()).pathname.split('/')[3]);const value=[0,7.7,100,null][id-1];return r.fulfill({json:{...metrics(),loss:{'1':value}}})})
 await page.setViewportSize({width:1440,height:2000});await page.goto('/')
 const stats=page.locator('.loss-stat')
 await expect(stats).toHaveCount(4)
 await expect(stats.nth(0)).toContainText('0.0%')
 await expect(stats.nth(1).getByRole('meter')).toHaveAttribute('aria-valuenow','7.7')
 await expect(stats.nth(1).locator('.loss-columns>span i').nth(1)).toHaveAttribute('style',/54/)
 await expect(stats.nth(2)).toContainText('100.0%')
 await expect(stats.nth(3).getByRole('img')).toHaveAttribute('aria-label','丢包暂无统计')
 for(const [style,selector] of [['ring','.loss-ring'],['bar','.loss-bar'],['columns','.loss-columns'],['minimal','.loss-visual']]){
  await toggleSettings(page);await visualSelect(page,'graph',style);await toggleSettings(page)
  if(style==='minimal')await expect(stats.first().locator(selector)).toBeHidden()
  else await expect(stats.first().locator(selector)).toBeVisible()
 }
 await toggleSettings(page);await visualSelect(page,'graph','columns');await toggleSettings(page)
 await page.setViewportSize({width:320,height:1000})
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.locator('.node-card').nth(1).screenshot({path:'tests/artifacts/v243-loss-mobile.png'})
})
