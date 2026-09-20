import {toggleSettings,visualSelect} from './settings'
import { test, expect } from '@playwright/test'
import { nodes } from '../scripts/fixtures.mjs'

test('search, status, settings persistence, map and deep-linked history', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  await page.getByRole('group',{name:'地区快速筛选'}).getByRole('button',{name:'JP',exact:false}).click()
  await expect(page.locator('.node-card')).toHaveCount(1)
  await page.getByRole('button',{name:'离线',exact:true}).click()
  await expect(page.getByText('没有符合条件的节点')).toBeVisible()
  await page.getByRole('button', { name: '清除筛选' }).click()
  await page.getByRole('button', { name: '离线', exact: true }).click()
  await expect(page.locator('.node-card')).toHaveCount(1)
  await expect(page.locator('.metric-ring strong').first()).toHaveText('—')
  await page.getByRole('button', { name: '全部', exact: true }).click()
  await toggleSettings(page)
  await visualSelect(page,'palette','forest')
  await visualSelect(page,'graph','bar')
  await visualSelect(page,'layout','compact')
  await page.reload()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'forest')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-graph', 'bar')
  await expect(page.getByLabel('地图视图')).toHaveCount(0)
  await expect(page.getByRole('group', { name: '世界节点分布地图' })).toBeVisible()
  await page.screenshot({ path: 'tests/artifacts/map.png', fullPage: true })
  await page.locator('.region-list button').filter({ hasText: '日本' }).click()
  await expect(page.locator('.node-card')).toHaveCount(1)
  await page.locator('.node-grid').getByRole('button', { name: '查看 Tokyo · 东京主节点',exact:true }).click()
  await expect(page).toHaveURL(/\/node\/1$/)
  await expect(page.locator('.recharts-surface').first()).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tokyo · 东京主节点' })).toBeVisible()
  await page.getByRole('button', { name: '网络延迟', exact: true }).click()
  await expect(page.getByText('Tokyo gateway').first()).toBeVisible()
  await page.screenshot({ path: 'tests/artifacts/detail.png', fullPage: true })
  await page.getByRole('button', { name: '返回总览' }).click()
  await expect(page.locator('.node-card')).toHaveCount(1)
  await expect(page.getByLabel('清除地区筛选')).toContainText('JP')
  expect(errors).toEqual([])
})

test('websocket updates and incomplete reports are isolated', async ({ page }) => {
  let push: ((data: string) => void) | undefined
  await page.routeWebSocket('**/api/ws', ws => { push = d => ws.send(d) })
  await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  const list = nodes()
  list[0].metrics.cpu = 67
  list[1].metrics = { cpu: 'broken' } as never
  list[2].metrics = null
  push!(JSON.stringify({ nodes: list }))
  await expect(page.locator('.node-card').nth(0).locator('.metric-ring strong').first()).toHaveText('67%')
  await expect(page.locator('.node-card').nth(1).locator('.metric-ring strong').first()).toHaveText('—')
  await expect(page.locator('.node-card').nth(2).locator('.metric-ring strong').first()).toHaveText('—')
})

test('mobile, dark mode, empty state and screenshots', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  await expect(page.locator('.matrix-values').first()).toBeVisible()
  await page.screenshot({ path: 'preview.png', fullPage: true })
  await page.getByLabel('切换明暗模式').click()
  await page.screenshot({ path: 'tests/artifacts/dark.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.node-card').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: 'tests/artifacts/mobile.png', fullPage: true })
  await page.route('**/api/nodes', route => route.fulfill({ json: { nodes: [] } }))
  await page.reload()
  await expect(page.getByText('还没有节点')).toBeVisible()
})

test('homepage ping shows server window loss, timeout, multiple probes and empty/error states', async ({ page }) => {
  await page.route('**/api/nodes/*/metrics?*', route => {
    const url = new URL(route.request().url())
    expect(url.searchParams.get('hours')).toBe('24')
    expect(url.searchParams.get('series')).toBe('ping')
    if (url.pathname.includes('/3/')) return route.fulfill({ status: 503 })
    if (url.pathname.includes('/2/')) return route.fulfill({ json: { ping: [], loss: {} } })
    return route.fulfill({ json: { ping: [
      ...Array.from({ length: 40 }, (_, i) => ({ task_id: 1, ts: 100 + i, latency: 217.7 + i * .7, loss: i % 11 === 0 ? 50 : i % 7 === 0 ? 2 : 0 })),
      { task_id: 2, ts: 200, latency: null, loss: 100 },
    ], probes: { '1': '香港线路', '2': '超时线路' }, loss: { '1': 4.2, '2': 100 } } })
  })
  await page.goto('/')
  const first = page.locator('.node-card').first()
  await expect(first.locator('.matrix-values b').filter({hasText:'4.2%'})).toBeVisible()
  await expect(first.locator('.latency-columns i')).toHaveCount(40)
  await first.getByLabel('节点探测线路').selectOption('2')
  await expect(first.getByText('超时', { exact: true })).toBeVisible()
  await expect(first.locator('.ping-probe')).toHaveCount(1)
  await expect(page.locator('.node-card').nth(1).getByText('暂无探测记录')).toBeVisible()
  await expect(page.locator('.node-card').nth(2).getByText('无法读取探测记录')).toBeVisible()
  await page.getByLabel('切换明暗模式').click()
  await first.screenshot({ path: 'tests/artifacts/latency-card.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('site errors can retry and closed public page redirects to admin', async ({ page }) => {
  await page.route('**/api/me', route => route.fulfill({ status: 502, body: '' }))
  await page.goto('/')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.unroute('**/api/me')
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('.node-card')).toHaveCount(6)
  await page.route('**/api/me', route => route.fulfill({ json: { public_page: false, authed: false, site_name: 'Private' } }))
  await page.goto('/')
  await expect(page).toHaveURL(/\/admin\/$/)
})

