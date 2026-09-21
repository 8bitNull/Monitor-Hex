import {test,expect,type Page} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {toggleSettings} from './settings'
const keys=['traffic','connections','uptime','expiry','remarks','price']
const labels=['本月用量','TCP／UDP','在线时长','到期信息','备注标签','价格']
const all=Object.fromEntries(keys.map(k=>[k,true]))
async function setup(page:Page){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'国际线路;Backup;Production;More',expires_at:'2026-10-05',price:5}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/');await page.locator('.route-matrix').scrollIntoViewIfNeeded();await page.locator('.latency-reading').waitFor()
}
test('all 64 auxiliary combinations remove empty rows and preserve detail information',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:1000});await setup(page)
 const card=page.locator('.node-card'),group=page.getByRole('group',{name:'通用卡片信息',exact:true})
 for(let n=0;n<64;n++){
  const mask=n^(n>>1);await toggleSettings(page)
  for(let i=0;i<6;i++)await group.getByLabel(labels[i],{exact:true}).setChecked(Boolean(mask&(1<<i)))
  await toggleSettings(page)
  for(const [i,selector] of ['.traffic-summary','.node-connections','.node-timing>span[title]','.node-timing .expiring, .node-timing>span:not([title])','.node-remarks','.node-price'].entries())await expect(card.locator(selector)).toHaveCount(mask&(1<<i)?1:0)
  await expect(card.locator('.node-timing')).toHaveCount(mask&12?1:0);await expect(card.locator('.node-footer')).toHaveCount(mask&48?1:0);await expect(card.locator('.node-secondary')).toHaveCount(mask?1:0)
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
 }
 await toggleSettings(page);for(const label of labels)await group.getByLabel(label,{exact:true}).uncheck();await toggleSettings(page)
 await card.locator('.node-open').click();await expect(page.locator('.detail-connections')).toBeVisible();await expect(page.locator('.detail-information')).toContainText('$5.00')
})
test('mobile follows, copies once, remembers independent choices and respects 720 boundary and resets',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await setup(page);await toggleSettings(page)
 const general=page.getByRole('group',{name:'通用卡片信息',exact:true}),mobile=page.getByRole('group',{name:'手机卡片信息',exact:true})
 await general.getByLabel('TCP／UDP',{exact:true}).uncheck()
 await page.getByLabel('手机显示',{exact:true}).selectOption('custom');await expect(mobile.getByLabel('TCP／UDP',{exact:true})).not.toBeChecked()
 await mobile.getByLabel('价格',{exact:true}).uncheck();await toggleSettings(page);await expect(page.locator('.node-price')).toHaveCount(0)
 await page.setViewportSize({width:721,height:1000});await expect(page.locator('.node-price')).toBeVisible()
 await page.setViewportSize({width:720,height:1000});await expect(page.locator('.node-price')).toHaveCount(0)
 await toggleSettings(page);await page.getByLabel('手机显示',{exact:true}).selectOption('follow');await toggleSettings(page);await expect(page.locator('.node-price')).toBeVisible()
 await page.reload();await toggleSettings(page);await page.getByLabel('手机显示',{exact:true}).selectOption('custom');await expect(mobile.getByLabel('价格',{exact:true})).not.toBeChecked()
 await page.getByRole('button',{name:'恢复默认外观',exact:true}).click();await expect(page.getByLabel('手机显示',{exact:true})).toHaveValue('custom');await expect(mobile.getByLabel('价格',{exact:true})).not.toBeChecked()
 await page.getByRole('button',{name:'重置全部偏好',exact:true}).click();await expect(page.getByLabel('手机显示',{exact:true})).toHaveValue('follow');await expect(general.getByLabel('TCP／UDP',{exact:true})).toBeChecked()
})
test('explicit equal-default display choices survive site changes, unrelated changes, export and import',async({page})=>{
 let config:any={cardInfo:all,desktopColumns:'auto'};await page.route('**/theme-config.json',r=>r.fulfill({json:config}));await setup(page);await toggleSettings(page)
 const group=page.getByRole('group',{name:'通用卡片信息',exact:true})
 await group.getByLabel('价格',{exact:true}).uncheck();await group.getByLabel('价格',{exact:true}).check()
 await page.getByLabel('桌面列数',{exact:true}).selectOption('2');await page.getByLabel('桌面列数',{exact:true}).selectOption('auto')
 await page.getByLabel('明暗模式',{exact:true}).selectOption('dark');await toggleSettings(page)
 config={cardInfo:{...all,price:false,uptime:false},desktopColumns:'4'};await page.reload();await expect(page.locator('.node-price')).toBeVisible();await expect(page.locator('.node-timing>span[title]')).toHaveCount(0);await expect(page.locator('.node-grid')).toHaveAttribute('data-columns','auto')
 await toggleSettings(page);const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出外观偏好',exact:true}).click();const download=await downloadPromise;const exported=JSON.parse(await readFile((await download.path())!,'utf8'));expect(exported.cardInfo.price).toBe(true);expect(exported.cardInfo.uptime).toBe(false)
 await page.getByRole('button',{name:'重置全部偏好',exact:true}).click();await expect(group.getByLabel('价格',{exact:true})).not.toBeChecked()
 await page.getByLabel('导入外观偏好',{exact:true}).setInputFiles({name:'prefs.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await expect(group.getByLabel('价格',{exact:true})).toBeChecked();await expect(page.getByLabel('桌面列数',{exact:true})).toHaveValue('auto')
 await page.reload();await expect(page.locator('.node-price')).toBeVisible()
})
for(const width of [320,390,430,720,721,1024,1440,1920])test('column safety and customization layout at '+width,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:1000})
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
 await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance,modules:{map:false},desktopColumns:'4'}))},{language,appearance});await setup(page)
 const grid=page.locator('.node-grid'),card=page.locator('.node-card')
 for(const columns of ['2','3','4','auto']){
  await toggleSettings(page);await page.getByLabel(language==='zh'?'桌面列数':'Desktop columns',{exact:true}).selectOption(columns);await toggleSettings(page)
  const count=await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)
  if(width<=720)expect(count).toBe(1);else if(columns!=='auto'){expect(count).toBeLessThanOrEqual(Number(columns));expect((await card.boundingBox())!.width).toBeGreaterThanOrEqual(300)}
  if(width===1440&&columns==='4')expect(count).toBe(4)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  for(const graph of ['bar','ring','columns','minimal']){
   await page.locator('.next-theme').evaluate((el,g)=>el.setAttribute('data-graph',g),graph);await card.evaluate((el,g)=>el.setAttribute('data-indicator',g),graph)
   expect(await card.evaluate(el=>[...el.querySelectorAll('.resource')].every(r=>[...r.querySelectorAll('.bar-number,.metric-ring strong,.resource small')].every(n=>{const box=n.getBoundingClientRect(),parent=r.getBoundingClientRect();return !box.width||(box.right<=parent.right+1&&box.left>=parent.left-1)})))).toBeTruthy()
  }
 }
 await toggleSettings(page);await expect(page.locator('.advanced-appearance')).not.toHaveAttribute('open','');await page.locator('.advanced-appearance>summary').click();await expect(page.getByLabel(language==='zh'?'背景图片地址':'Background image URL',{exact:true})).toBeVisible();await toggleSettings(page)
 }
})
