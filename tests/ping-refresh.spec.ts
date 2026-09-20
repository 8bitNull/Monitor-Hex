import { test, expect } from '@playwright/test'
import { nodes } from '../scripts/fixtures.mjs'

test('ping refresh advances after delayed response, bypasses cache manually and resumes on visibility', async ({page}) => {
  await page.clock.install({time:new Date('2026-09-19T12:00:00Z')})
  await page.route('**/api/nodes', r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
  let calls=0
  let release:()=>void=()=>{}
  await page.route('**/api/nodes/1/metrics?*',async r=>{
    const url=new URL(r.request().url())
    expect(url.searchParams.get('points')).toBe('1440')
    expect(url.searchParams.get('hours')).toBe('24')
    const count=++calls
    if(count===1) await new Promise<void>(resolve=>{release=resolve})
    await r.fulfill({json:{ping:[{task_id:1,ts:1800360000+count*60,latency:20+count*10}],probes:{'1':'刷新测试'},loss:{'1':4.2}}})
  })
  await page.goto('/')
  await page.locator('.ping-stats').scrollIntoViewIfNeeded()
  await expect.poll(()=>calls).toBe(1)
  await page.clock.runFor(5000)
  release()
  await expect(page.locator('.matrix-values').first()).toContainText('30 ms')
  await page.clock.runFor(60001)
  await expect(page.locator('.matrix-values').first()).toContainText('40 ms')
  await page.clock.runFor(60001)
  await expect(page.locator('.matrix-values').first()).toContainText('50 ms')
  await page.clock.runFor(60001)
  await expect(page.locator('.matrix-values').first()).toContainText('60 ms')
  expect(calls).toBe(4)
  await page.getByLabel('表格视图').click()
  await expect(page.locator('.table-ping')).toContainText('60 ms')
  expect(calls).toBe(4)
  await page.getByRole('button',{name:'刷新延迟数据'}).click()
  await expect(page.locator('.table-ping')).toContainText('70 ms')
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
  await page.clock.runFor(120001)
  expect(calls).toBe(5)
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))})
  await expect(page.locator('.table-ping')).toContainText('80 ms')
  await expect(page.locator('.table-ping')).toContainText('4.2%')
})
