import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
import {toggleSettings} from './settings'

test('speed indicators share scale across home/detail, distinguish zero, missing, offline and stale',async({page})=>{
 let tx=1000,rx=2000,stale=false,missing=false,online=true
 await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,online,last_seen:Math.floor(Date.now()/1000)-(stale?120:0),metrics:missing?null:{...n.metrics,net_tx:tx,net_rx:rx}}]}})})
 await page.goto('/')
 const speed=page.locator('.speed-indicators')
 await expect(speed).toHaveAttribute('data-state','live')
 await expect(speed.locator('.upload .speed-track i')).toHaveAttribute('style','width: 50%;')
 await expect(speed.locator('.download .speed-track i')).toHaveAttribute('style','width: 100%;')
 await page.getByRole('button',{name:'查看 Tokyo · 东京主节点',exact:true}).click()
 await expect(page.locator('.detail-speed .upload .speed-track i')).toHaveAttribute('style','width: 50%;')
 for(const width of [320,390,1440]) {await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()}
 tx=0;rx=0
 await expect(speed.locator('strong').first()).toContainText('0',{timeout:10000})
 await expect(speed.locator('.speed-track i').first()).toHaveAttribute('style','width: 0%;')
 stale=true
 await expect(speed).toHaveAttribute('data-state','stale',{timeout:10000})
 await expect(speed).toHaveAttribute('title',/上次上报/)
 missing=true
 await expect(speed).toHaveAttribute('data-state','missing',{timeout:10000})
 await expect(speed.locator('strong').first()).toHaveText('—')
 online=false
 await expect(speed).toHaveAttribute('data-state','offline',{timeout:10000})
})

test('home speed setting has explicit scope and card action icons are removed',async({page})=>{
 await page.goto('/')
 await expect(page.locator('.node-card').getByRole('button',{name:'采样信息'})).toHaveCount(0)
 await expect(page.locator('.node-card').getByRole('button',{name:'刷新延迟数据'})).toHaveCount(0)
 await toggleSettings(page)
 const home=page.locator('[data-settings=home]')
 await home.getByLabel('首页总网速样式',{exact:true}).selectOption('gauge')
 await expect(home).toContainText('仅影响首页顶部实时网速')
 await toggleSettings(page)
 await expect(page.locator('.speed-gauge')).toBeVisible()
 await expect(page.locator('.speed-indicators')).toHaveCount(6)
 await page.reload();await expect(page.locator('.speed-gauge')).toBeVisible()
})
