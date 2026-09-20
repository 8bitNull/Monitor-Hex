import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
test('mobile remarks share a row with price and native route menu keeps inheritance explicit',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,4).map((n,i)=>({...n,price:i===3?0:i===2?123456.78:5,remark:i===0?'2.5Gbps;Anti-DDoS':i===2?'':'很长的备注用于检查右侧价格不被挤压;Backup;Production;More',metrics:{...n.metrics,tcp:12345678,udp:87654321,uptime:99999999}}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'A very long probe name · 电信线路 · 这是完整线路名称'}}}))
 for(const language of ['zh','en']){
 await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
 await page.goto('/');await page.locator('.route-matrix').first().scrollIntoViewIfNeeded();await page.locator('.latency-reading').first().waitFor()
 for(const width of [320,390,430,768,1440]){
  await page.setViewportSize({width,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  for(const footer of await page.locator('.node-footer').all()){
   expect(await footer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
   if(width<=720)expect(await footer.evaluate(el=>{const p=el.querySelector('.node-price')?.getBoundingClientRect(),n=el.querySelector('.node-remarks')?.getBoundingClientRect();return !p||!n||(n.right<=p.left&&Math.abs(n.top-p.top)<1)})).toBeTruthy()
  }
 }
 const card=page.locator('.node-card').first(),select=card.locator('.route-select')
 await expect(card.locator('.route-picker-label')).not.toContainText(/全局|Global/)
 await expect(select.locator('option').first()).toHaveText(/全局|Global/)
 await select.selectOption('1');await expect(select).toHaveValue('1')
 await select.selectOption('auto');await expect(select).toHaveValue('auto')
 await expect(page.locator('.map-help')).toHaveCount(0)
 }
})
