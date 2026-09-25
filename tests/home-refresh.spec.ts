import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

test('mobile card shows resources and supporting facts without a disclosure',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 const expiry=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
 let stale=false
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[{...nodes()[0],last_seen:Math.floor(Date.now()/1000)-(stale?120:0),expires_at:expiry,metrics:{...nodes()[0].metrics,cpu:92}}]}}))
 await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card.locator('.node-heading .card-issue')).toContainText('CPU 92%')
 await expect(card.locator('.node-heading .card-issue')).toContainText('剩余 3 天')
 await expect(card.locator('.node-heading .card-issue')).toContainText('即将到期')
 await card.screenshot({path:'tests/artifacts/home-status-390.png'})
 await expect(card.locator('.resources .resource')).toHaveCount(4)
 await expect(card.locator('.node-secondary-disclosure')).toHaveCount(0)
 await expect(card.locator('.card-billing')).toBeVisible()
 await expect(card.locator('.node-price')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.setViewportSize({width:320,height:844})
 await expect(card.locator('.node-heading .card-issue')).toBeVisible()
 expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
 await card.screenshot({path:'tests/artifacts/home-status-320.png'})
 await page.locator('.next-theme').evaluate(el=>{el.classList.add('dark');document.documentElement.classList.add('dark')})
 await card.screenshot({path:'tests/artifacts/home-status-320-dark.png'})
 stale=true
 await page.reload()
 await expect(card.locator('.node-status-group')).toContainText('数据已过期')
 await expect(card.locator('.status-pill')).toHaveAttribute('data-state','stale')
 await expect(card.locator('.card-issue')).not.toContainText('高负载')
 await expect(card.locator('.card-issue')).toContainText('剩余 3 天')
 await page.setViewportSize({width:900,height:844})
 await expect(card.locator('.resources .resource')).toHaveCount(4)
 await expect(card.locator('.node-secondary-disclosure')).toHaveCount(0)
 await expect(card.locator('.card-billing')).toBeVisible()
})

test('four summary tiles form balanced rows at tablet widths',async({page})=>{
 await page.goto('/')
 const grid=page.locator('.summary-grid')
 await expect(grid.locator(':scope > div')).toHaveCount(4)
 for(const width of [721,795,1024,1100,1101,1440]){
  await page.setViewportSize({width,height:900})
  const layout=await grid.locator(':scope > div').evaluateAll(tiles=>tiles.map(tile=>{
   const box=tile.getBoundingClientRect()
   return {top:box.top,left:box.left,width:box.width}
  }))
  if(width<=1100){
   expect(layout[0].top).toBe(layout[1].top)
   expect(layout[2].top).toBe(layout[3].top)
   expect(layout[2].top).toBeGreaterThan(layout[0].top)
   expect(layout[0].left).toBe(layout[2].left)
   expect(layout[1].left).toBe(layout[3].left)
  }else expect(new Set(layout.map(tile=>tile.top)).size).toBe(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 }
})

test('summary filters keep feedback without marks beneath the numbers',async({page})=>{
 await page.goto('/')
 for(const width of [390,795,1440]){
  await page.setViewportSize({width,height:900})
  const count=page.locator('.summary-node-count button')
  const offline=page.locator('.summary-offline-filter')
  if(await count.first().getAttribute('aria-pressed')!=='true')await count.first().click()
  await expect(count.first()).toHaveAttribute('aria-pressed','true')
  await offline.hover()
  const styles=await page.locator('.summary-grid').evaluate(grid=>[...grid.querySelectorAll('.summary-node-count button,.summary-offline-filter')].map(button=>{
   const style=getComputedStyle(button)
   return {decoration:style.textDecorationLine,border:style.borderBottomWidth}
  }))
  expect(styles).toEqual([{decoration:'none',border:'0px'},{decoration:'none',border:'0px'},{decoration:'none',border:'0px'}])
  if(width===390){
   await page.getByRole('button',{name:'收起总览'}).click()
   const compact=page.locator('.summary-compact button[aria-pressed=true]')
   await expect(compact).toHaveCount(1)
   await expect(compact).toHaveCSS('text-decoration-line','none')
   await page.getByRole('button',{name:'展开总览'}).click()
  }
 }
})

test('mobile node summary labels and offline hint fit without reducing click targets',async({page})=>{
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes()}}))
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});await page.goto('/')
  const tile=page.locator('.summary-grid>div').first(),buttons=tile.locator('.summary-node-count button'),hint=tile.locator('.summary-offline-filter')
  await expect(buttons.nth(0)).toContainText('在线');await expect(buttons.nth(0)).toContainText('5')
  await expect(buttons.nth(1)).toContainText('全部');await expect(buttons.nth(1)).toContainText('6')
  await expect(hint).toContainText('离线')
  for(const button of [...await buttons.all(),hint]){const box=await button.boundingBox();expect(box).not.toBeNull();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44)}
  const boxes=await Promise.all([buttons.nth(0).boundingBox(),buttons.nth(1).boundingBox(),hint.boundingBox(),tile.boundingBox(),tile.locator('.summary-tile-heading').boundingBox()])
  expect(boxes[0]!.x+boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x)
  expect(boxes[4]!.x+boxes[4]!.width).toBeLessThanOrEqual(boxes[2]!.x)
  expect(boxes[2]!.y).toBeLessThan(boxes[0]!.y)
  expect(boxes[2]!.y+boxes[2]!.height).toBeLessThanOrEqual(boxes[0]!.y+1)
  expect(boxes[2]!.x+boxes[2]!.width).toBeLessThanOrEqual(boxes[3]!.x+boxes[3]!.width)
  expect(await tile.evaluate(el=>el.scrollHeight===el.clientHeight)).toBeTruthy()
 }
})

test('desktop offline card keeps its facts without stretching to the row height',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes()}}));await page.goto('/')
 const offline=page.locator('.node-card.node-offline').first()
 await expect(offline.locator('.offline-last-report')).toBeVisible();await expect(offline.locator('.card-billing')).toBeVisible()
 const heights=await offline.evaluate(el=>{
  const top=Math.round(el.getBoundingClientRect().top),grid=el.parentElement!
  return [...grid.children].filter(card=>Math.round(card.getBoundingClientRect().top)===top).map(card=>({offline:card===el,height:card.getBoundingClientRect().height}))
 })
 expect(heights.filter(item=>!item.offline).length).toBeGreaterThan(0)
 expect(heights.find(item=>item.offline)!.height).toBeLessThan(Math.max(...heights.filter(item=>!item.offline).map(item=>item.height))-30)
})
