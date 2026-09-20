import {toggleSettings,visualSelect} from './settings'
import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const layouts=['comfortable','compact']
const graphs=['ring','bar','columns','minimal']

test('legacy preferences migrate and system appearance responds live', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('seeded')) {
      localStorage.setItem('monitor-next',JSON.stringify({palette:'forest',graph:'bar',layout:'compact',map:false}))
      localStorage.setItem('monitor-next-mode','dark');localStorage.setItem('seeded','1')
    }
  })
  await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  await expect(page.locator('.next-theme')).toHaveAttribute('data-layout','compact')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-card-layout','classic')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','columns')
  await expect(page.locator('html')).toHaveClass('dark')
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next')!).schemaVersion)).toBe(2)
  await toggleSettings(page)
  await page.getByLabel('明暗模式',{exact:true}).selectOption('system')
  await page.emulateMedia({colorScheme:'light'})
  await expect(page.locator('html')).not.toHaveClass('dark')
  await page.emulateMedia({colorScheme:'dark'})
  await expect(page.locator('html')).toHaveClass('dark')
  await page.reload()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.getByRole('button',{name:'切换明暗模式',exact:true}).click()
  await expect(page.locator('html')).not.toHaveClass('dark')
})

test('two densities by four graphs in light/dark and 320/1440 widths', async ({ page }) => {
  test.setTimeout(120000)
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  await toggleSettings(page)
  for (const width of [1440,320]) {
    await page.setViewportSize({width,height:1000})
    for (const appearance of ['light','dark']) {
      await page.getByLabel('明暗模式',{exact:true}).selectOption(appearance)
      for (const layout of layouts) {
        await visualSelect(page,'layout',layout)
        for (const graph of graphs) {
          await visualSelect(page,'graph',graph)
          await expect(page.locator('.next-theme')).toHaveAttribute('data-layout',layout)
          const first=page.locator('.node-card').first()
          const cpu=first.locator('.resource').first()
          const selector=graph==='ring'?'.metric-ring strong':'.bar-number'
          await expect(cpu.locator(selector)).toBeVisible()
          await expect(cpu.locator(selector)).toContainText('28')
          if(graph==='columns') await expect(cpu.locator('.resource-columns')).toBeVisible()
          if(graph==='bar') await expect(cpu.locator('.resource-bar')).toBeVisible()
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${appearance}/${layout}/${graph}`).toBeTruthy()
        }
        if(width===1440 && appearance==='light') {
          await visualSelect(page,'graph','ring')
          await firstCardShot(page,layout)
        }
      }
    }
  }
  expect(errors).toEqual([])
})
async function firstCardShot(page:any,layout:string) {
  await page.locator('.node-card').first().screenshot({path:`tests/artifacts/v13-${layout}.png`})
}

test('modules can all hide, totals toggle, regions clock map and gauge work', async ({ page }) => {
  await page.goto('/')
  await toggleSettings(page)
  await expect(page.locator('.summary-grid>[data-slot=card]')).toHaveCount(3)
  await page.getByLabel('地区统计',{exact:true}).check()
  await page.getByLabel('当前时间',{exact:true}).check()
  await page.getByLabel('首页地图',{exact:true}).check()
  await page.getByLabel('首页总网速样式',{exact:true}).selectOption('gauge')
  await expect(page.locator('.speed-gauge')).toBeVisible()
  await expect(page.locator('.summary-time')).toBeVisible()
  await expect(page.getByRole('group',{name:'世界节点分布地图'})).toBeVisible()
  await expect(page.locator('.summary-grid>[data-slot=card]')).toHaveCount(5)
  await page.getByLabel('显示已用 / 总容量',{exact:true}).uncheck()
  await page.getByLabel('首页地图',{exact:true}).uncheck()
  await expect(page.locator('.node-card').first().locator('.resource small').nth(1)).toHaveText('2.00 GB')
  for(const label of ['在线节点','高负载提示','流量统计','实时网速','地区统计','当前时间','首页地图']) await page.locator('.module-switches').getByLabel(label,{exact:true}).uncheck()
  await expect(page.locator('.summary-grid')).toHaveCount(0)
  await expect(page.locator('.world-panel')).toHaveCount(0)
  await expect(page.locator('.node-card')).toHaveCount(6)
  await toggleSettings(page)
  await page.getByLabel('表格视图').click()
  await expect(page.locator('tbody tr')).toHaveCount(6)
  await page.reload()
  await expect(page.locator('.summary-grid')).toHaveCount(0)
  await expect(page.locator('tbody tr')).toHaveCount(6)
})

test('background presets, glass, failure fallback and rapid image replacement', async ({ page }) => {
  const media = await page.context().newCDPSession(page)
  await media.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] })
  await page.route('**/missing-background.png',r=>r.fulfill({status:404,body:''}))
  await page.goto('/')
  await toggleSettings(page)
  await page.getByRole('button',{name:'使用内置山峦'}).click()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-background','true')
  await page.getByLabel('开启卡片毛玻璃').check()
  await page.getByLabel('背景效果',{exact:true}).selectOption('glass')
  await page.getByLabel('背景模糊',{exact:true}).fill('12')
  await page.getByLabel('卡片不透明度',{exact:true}).fill('70')
  await page.getByLabel('卡片模糊',{exact:true}).fill('18')
  await page.getByLabel('明暗模式',{exact:true}).selectOption('dark')
  await toggleSettings(page)
  await page.screenshot({path:'tests/artifacts/v13-glass.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await media.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] })
  expect(await page.locator('.node-card').first().evaluate(el=>getComputedStyle(el).backdropFilter)).toBe('blur(6px)')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await page.screenshot({path:'tests/artifacts/v13-mobile-glass.png',fullPage:true})
  await media.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  await expect.poll(() => page.locator('.node-card').first().evaluate(el=>getComputedStyle(el).backdropFilter)).toBe('none')
  await toggleSettings(page)
  await page.getByLabel('背景图片地址',{exact:true}).fill('/missing-background.png')
  await page.getByRole('button',{name:'应用背景',exact:true}).click()
  await expect(page.getByText('背景加载失败，已使用默认底色。请检查图片地址。')).toBeVisible()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-background','false')
  await expect(page.locator('.node-card')).toHaveCount(6)
  await page.getByRole('button',{name:'使用内置山峦'}).click()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-background','true')
  await page.getByRole('button',{name:'清除背景'}).click()
  await expect(page.locator('.site-background')).toHaveCount(0)
})

test('site defaults precedence, export import validation and separate reset scopes', async ({ page }) => {
  await page.route('**/theme-config.json',r=>r.fulfill({json:{schemaVersion:2,palette:'ocean',cardLayout:'modern',modules:{regions:true}}}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','ocean')
  await toggleSettings(page)
  await visualSelect(page,'palette','rose')
  await page.getByLabel('当前时间',{exact:true}).check()
  await toggleSettings(page)
  await page.getByRole('group',{name:'地区快速筛选'}).getByRole('button',{name:'JP',exact:false}).click()
  await toggleSettings(page)
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出外观偏好'}).click()])
  const data=JSON.parse(await readFile((await download.path())!,'utf8'))
  expect(data.schemaVersion).toBe(2);expect(data.palette).toBe('rose');expect(data.query).toBeUndefined()
  await page.getByRole('button',{name:'恢复默认外观',exact:true}).click()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','ocean')
  await expect(page.getByLabel('当前时间',{exact:true})).toBeChecked()
  await expect(page.getByLabel('清除地区筛选')).toContainText('JP')
  await page.getByLabel('导入外观偏好',{exact:true}).setInputFiles({name:'prefs.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))})
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','rose')
  await page.reload()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','rose')
  await toggleSettings(page)
  for(const bad of ['{','{"schemaVersion":99,"palette":"forest"}','{"backgroundUrl":"javascript:alert(1)"}']) {
    await page.getByLabel('导入外观偏好',{exact:true}).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(bad)})
    await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','rose')
  }
  await page.getByRole('button',{name:'重置全部偏好',exact:true}).click()
  await expect(page.getByLabel('清除地区筛选')).toHaveCount(0)
  await expect(page.getByLabel('当前时间',{exact:true})).not.toBeChecked()
  await expect(page.getByLabel('地区统计',{exact:true})).toBeChecked()
  await expect(page.locator('.node-card')).toHaveCount(6)
})

test('invalid site config and blocked browser storage cannot break dashboard', async ({ page }) => {
  await page.route('**/theme-config.json',r=>r.fulfill({body:'<html>not a configuration</html>'}))
  await page.addInitScript(()=>{
    Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})
    Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}})
  })
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  await toggleSettings(page)
  await visualSelect(page,'layout','comfortable')
  await expect(page.locator('.node-tags')).toHaveCount(0)
  await page.getByRole('button',{name:'重置全部偏好',exact:true}).click()
  await expect(page.locator('.node-card')).toHaveCount(6)
  expect(errors).toEqual([])
})

test('six palettes and compact density retain readable mobile cards', async ({ page }) => {
  await page.goto('/')
  await toggleSettings(page)
  await page.setViewportSize({width:390,height:844})
  await visualSelect(page,'layout','compact')
  const tones = new Set<string>()
  for (const palette of ['default','ocean','sunset','forest','midnight','rose']) {
    await visualSelect(page,'palette',palette)
    tones.add(await page.locator('.next-theme').evaluate(el=>getComputedStyle(el).getPropertyValue('--tone')))
    for (const layout of layouts) {
      await visualSelect(page,'layout',layout)
      await expect(page.locator('.node-card').first().locator('.node-symbol')).toBeVisible()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    }
  }
  expect(tones.size).toBe(6)
  await page.screenshot({path:'tests/artifacts/v13-settings.png',fullPage:true})
})
