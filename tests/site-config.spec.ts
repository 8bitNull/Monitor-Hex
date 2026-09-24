import {test, expect} from '@playwright/test'

test('hub site settings become defaults while the public drawer stays personal', async ({page}) => {
  let writes = 0
  await page.route('**/api/me', route => route.fulfill({json: {authed: true, github: false, site_name: 'Monitor HEX', public_page: true}}))
  await page.route('**/api/themes/hex/config', route => {
    if (route.request().method() === 'PUT') writes++
    return route.fulfill({json: {palette: 'ocean', module_map: false, latencyScale: '500', desktopColumns: '3'}})
  })
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('.node-grid')).toHaveAttribute('data-columns', '3')
  await expect(page.locator('.map-panel')).toHaveCount(0)
  await page.getByRole('button', {name: '显示与偏好'}).click()
  const drawer = page.locator('dialog.settings-drawer')
  await expect(drawer).toContainText('仅保存在当前浏览器')
  await expect(drawer.getByRole('button', {name: '站点设置'})).toHaveCount(0)
  await expect(drawer.getByRole('button', {name: '保存站点设置'})).toHaveCount(0)
  await drawer.getByRole('group', {name: '主题配色'}).getByRole('button', {name: '玫瑰'}).click()
  await drawer.getByRole('button', {name: '关闭设置'}).click()
  await page.reload()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'rose')
  expect(writes).toBe(0)
  await page.evaluate(() => localStorage.removeItem('monitor-next'))
  await page.reload()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
})

test('an unavailable hub config silently falls back to packaged defaults', async ({page}) => {
  await page.route('**/api/themes/hex/config', route => route.fulfill({status: 404}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'default')
  await page.getByRole('button', {name: '显示与偏好'}).click()
  await expect(page.locator('dialog.settings-drawer')).toBeVisible()
  await expect(page.locator('dialog.settings-drawer').getByRole('button', {name: '偏好'})).toBeVisible()
})
