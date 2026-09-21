import {chromium} from '@playwright/test'
import {mkdirSync,readFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const root='tests/artifacts/stability';mkdirSync(root,{recursive:true})
const fixed=Date.parse('2026-09-21T04:00:00Z'),oldNow=Date.now;Date.now=()=>fixed
const fleet=nodes().map((n,i)=>({...n,remark:i%2?'国际线路;Backup;Production':'',expires_at:i%2?'2026-10-05':null})),history=metrics();Date.now=oldNow
const browser=await chromium.launch({channel:'chrome'})
try{
 for(const version of ['baseline','current'])for(const mode of ['light','dark'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1700},reducedMotion:'reduce'});await page.clock.setFixedTime(fixed)
  await page.addInitScript(mode=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:mode,modules:{map:false}})),mode)
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}));await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:history}))
  await page.goto(`http://127.0.0.1:${version==='baseline'?4289:4286}`);await page.locator('.node-card').first().waitFor()
  for(const card of await page.locator('.node-card').all()){await card.scrollIntoViewIfNeeded();await card.locator('.latency-reading').waitFor()}
  await page.evaluate(()=>document.fonts.ready)
  await page.locator('.node-grid').screenshot({path:`${root}/${version}-${width}-${mode}-grid.png`})
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${root}/${version}-${width}-${mode}-home.png`})
  await page.close()
 }
 const page=await browser.newPage({viewport:{width:1440,height:2000},reducedMotion:'reduce'});await page.clock.setFixedTime(fixed)
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,modules:{map:false}})))
 const stateFleet=fleet.map((n,i)=>({...n,online:i!==1,last_seen:fixed/1000-(i===2?120:0),metrics:i===3?null:n.metrics,name:['正常 · Zero','离线 · Offline','过期 · Stale','等待首次上报','请求失败','探测超时'][i]}))
 stateFleet[0].metrics={...stateFleet[0].metrics,net_rx:0,net_tx:0,cpu:0}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:stateFleet}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const id=Number(new URL(r.request().url()).pathname.split('/')[3]);return id===5?r.fulfill({status:503}):r.fulfill({json:id===6?{...history,loss:{1:100},ping:history.ping.map(p=>({...p,latency:null}))}:history})})
 await page.goto('http://127.0.0.1:4286');await page.locator('.ping-empty').filter({hasText:'暂不可用'}).waitFor();await page.locator('.latency-link').filter({hasText:'超时'}).waitFor()
 await page.locator('.node-grid').screenshot({path:`${root}/states.png`})
 await page.close()
 for(const mode of ['light','dark'])for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await p.clock.setFixedTime(fixed)
  await p.addInitScript(mode=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:mode})),mode)
  await p.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}));await p.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:history}))
  await p.goto('http://127.0.0.1:4286');await p.locator('.node-card').first().waitFor();await p.locator('.latency-reading').first().waitFor();if(width>720)await p.locator('.map-land').waitFor()
  await p.screenshot({path:`${root}/preview-${width}-${mode}.png`});await p.close()
  const comparison=await browser.newPage({viewport:{width:width===390?808:1400,height:1800}})
  const type=width===390?'home':'grid'
  const imgs=['baseline','current'].map(v=>readFileSync(`${root}/${v}-${width}-${mode}-${type}.png`).toString('base64'))
  await comparison.setContent(`<body style="margin:0;background:#f2f5fa;font:16px system-ui;padding:12px"><main style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${imgs.map((img,i)=>`<section><p style="margin:0 0 12px">${i?'v0.0.14':'v0.0.13'}</p><img style="display:block;width:100%" src="data:image/png;base64,${img}"></section>`).join('')}</main></body>`)
  await comparison.locator('main').screenshot({path:`${root}/compare-${width}-${mode}.png`});await comparison.close()
 }
}finally{await browser.close()}
