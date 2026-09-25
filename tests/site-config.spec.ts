import {test, expect} from '@playwright/test'

test('hub site settings win over legacy theme overrides while appearance stays personal', async ({page}) => {
  let writes = 0
  await page.route('**/api/me', route => route.fulfill({json: {authed: true, github: false, site_name: 'My Monitor', public_page: true}}))
  await page.route('**/api/themes/hex/config', route => {
    if (route.request().method() === 'PUT') writes++
    return route.fulfill({json: {palette: 'ocean', module_map: false, latencyScale: '500', desktopColumns: '3'}})
  })
  await page.addInitScript(()=>{if(!sessionStorage.getItem('legacy-seeded')){localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,schemaVersion:3,designVersion:1,palette:'rose',appearance:'dark'}));sessionStorage.setItem('legacy-seeded','1')}})
  await page.goto('/')
  await expect(page).toHaveTitle('My Monitor')
  await expect(page.locator('.brand')).toHaveText('My Monitor')
  await expect(page.locator('.brand small')).toHaveCount(0)
  await expect(page.locator('.site-footer')).toContainText('HEX ·')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await expect(page.locator('.node-grid')).toHaveAttribute('data-columns', '3')
  await expect(page.locator('.map-panel')).toHaveCount(0)
  await expect(page.locator('dialog.settings-drawer')).toHaveCount(0)
  await expect(page.locator('header').getByRole('button',{name:/显示与偏好|Display & preferences/})).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next')!))).not.toHaveProperty('palette')
  expect(writes).toBe(0)
})

test('header dark and language controls persist without a settings drawer',async({page})=>{
  await page.goto('/')
  const header=page.locator('header')
  await expect(header.getByRole('button',{name:'Language / 语言'})).toBeVisible()
  await expect(header.getByRole('button',{name:'切换明暗模式'})).toBeVisible()
  await expect(page.locator('.settings-drawer')).toHaveCount(0)
  await header.getByRole('button',{name:'切换明暗模式'}).click()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await header.getByRole('button',{name:'Language / 语言'}).click()
  await expect(page.locator('html')).toHaveAttribute('lang','en-US')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await expect(page.locator('html')).toHaveAttribute('lang','en-US')
  await header.getByRole('button',{name:'Toggle light / dark'}).click()
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
})

test('home route and table column settings are absent from the public page',async({page})=>{
  await page.goto('/')
  await expect(page.getByLabel('主要探测线路',{exact:true})).toHaveCount(0)
  await page.getByLabel('表格视图',{exact:true}).click()
  await expect(page.locator('details.table-options')).toHaveCount(0)
  await expect(page.locator('thead [data-column=cpu]')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('主要探测线路',{exact:true})).toHaveCount(0)
  await expect(page.locator('details.table-options')).toHaveCount(0)
})

test('an unavailable hub config silently falls back to packaged defaults', async ({page}) => {
  await page.route('**/api/themes/hex/config', route => route.fulfill({status: 404}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'default')
  await expect(page.locator('dialog.settings-drawer')).toHaveCount(0)
})
