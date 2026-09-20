import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
import {toggleSettings} from './settings'

test('card route count persists, keeps primary first and reserves other routes for detail',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],ipv4:'192.0.2.1',ipv6:'2001:db8::1'}]}}))
 const now=Math.floor(Date.now()/1000)
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{ping:[1,2,3,4].flatMap(id=>Array.from({length:40},(_,i)=>({task_id:id,ts:now-(39-i)*60,latency:200+id}))),probes:{1:'Route A',2:'Route B',3:'Route C',4:'Route D'},loss:{1:0,2:1.2,3:100,4:0}}}))
 await page.goto('/')
 const card=page.locator('.node-card');await card.locator('.ping-stats').scrollIntoViewIfNeeded()
 await expect(card.locator('.ping-probe')).toHaveCount(1)
 await expect(card.locator('.node-ip-tags')).toHaveText('V4V6')
 await expect(card.locator('.node-connections')).toContainText('TCP102UDP24')
 for(const n of ['2','3']){
  await toggleSettings(page);await page.getByLabel('首页线路数量').selectOption(n);await toggleSettings(page)
  await expect(card.locator('.ping-probe')).toHaveCount(Number(n))
 }
 await card.getByLabel('节点探测线路').selectOption('3')
 await expect(card.locator('.latency-reading>span').first()).toHaveText('Route C')
 await page.reload();await card.locator('.ping-stats').scrollIntoViewIfNeeded();await expect(card.locator('.ping-probe')).toHaveCount(3)
 await expect(card.locator('.latency-reading>span').first()).toHaveText('Route C')
 await expect(card.locator('.latency-reading>span').filter({hasText:'Route D'})).toHaveCount(0)
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 }
 await card.screenshot({path:'tests/artifacts/v260-card-mobile.png'})
 await card.getByRole('button',{name:'查看全部 4 条线路'}).click()
 await expect(page.locator('.detail-probe-legend')).toContainText('Route D')
})

test('unknown protocols are hidden and offline connections never become zero',async({page})=>{
 const n=nodes()[0]
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...n,online:false}]}}))
 await page.goto('/')
 await expect(page.locator('.node-ip-tags')).toHaveCount(0)
 await expect(page.locator('.node-connections b')).toHaveText(['—','—'])
})
