import {toggleSettings} from './settings'
import {test,expect} from '@playwright/test'
import {metrics} from '../scripts/fixtures.mjs'
test('independent route choices persist, follow global, expose missing records and open all-route detail',async({page})=>{
 let missing=false
 await page.route('**/api/nodes/*/metrics?*',r=>{const d=metrics();const now=Math.floor(Date.now()/1000);return r.fulfill({json:{...d,ping:[{task_id:1,ts:now,latency:20},...missing?[]:[{task_id:2,ts:now,latency:180}]],probes:{'1':'Route A','2':'Route B'},loss:{'1':0,'2':5}}})})
 await page.goto('/')
 const first=page.locator('.node-card').first(),second=page.locator('.node-card').nth(1)
 await first.getByLabel('节点探测线路').selectOption('2')
 await expect(first.locator('.matrix-values')).toContainText('180 ms')
 await expect(second.locator('.matrix-values')).toContainText('20 ms')
 await page.reload()
 await expect(first.getByLabel('节点探测线路')).toHaveValue('2')
 await page.getByLabel('表格视图').click()
 await page.getByRole('columnheader',{name:/所选线路延迟/}).getByRole('button').click()
 await expect(page.locator('tbody tr').last()).toContainText('Tokyo')
 await page.getByRole('columnheader',{name:/所选线路延迟/}).getByRole('button').click()
 await page.getByLabel('表格视图').click()
 await expect(page.locator('.table-ping').first()).toContainText('180 ms')
 await page.getByLabel('卡片视图').click()
 missing=true
 await page.reload()
 await expect(first.locator('.ping-empty')).toContainText('无该线路记录')
 await expect(first.locator('.ping-probe')).toHaveCount(0)
 await first.getByLabel('节点探测线路').selectOption('auto')
 await expect(first.locator('.matrix-values')).toContainText('20 ms')
 missing=false
 await page.reload()
 await toggleSettings(page)
 await page.getByLabel('主要探测线路').selectOption('2')
 await toggleSettings(page)
 await expect(first.locator('.matrix-values')).toContainText('180 ms')
 await first.getByRole('button',{name:'查看全部 2 条线路'}).click()
 await expect(page).toHaveURL(/node\/1#latency$/)
 await expect(page.locator('.detail-probe-legend')).toContainText('Route A')
 await expect(page.locator('.detail-probe-legend')).toContainText('Route B')
 await page.reload()
 await expect(page.locator('.detail-probe-legend')).toContainText('Route B')
})
