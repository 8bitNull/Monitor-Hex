import {chromium} from '@playwright/test'
import {mkdirSync,readFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const root='tests/artifacts/detail-reading';mkdirSync(root,{recursive:true})
const fixed=Date.parse('2026-09-21T04:00:00Z'),original=Date.now;Date.now=()=>fixed
const fleet=nodes().map((n,i)=>({...n,remark:i%2?'国际线路;Backup;Production':'2.5Gbps 国际线路;应用与备份服务',expires_at:'2026-10-05'})),history=metrics();Date.now=original
const browser=await chromium.launch({channel:'chrome'})
try{
 for(const width of [390,1440])for(const mode of ['light','dark']){
  for(const version of ['baseline','current']){
   const page=await browser.newPage({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});await page.clock.setFixedTime(fixed)
   await page.addInitScript(mode=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:mode})),mode)
   await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}));await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...history,probes:{1:'Tokyo gateway',2:'Singapore gateway',3:'Hong Kong gateway'},ping:history.ping.flatMap(p=>[p,{...p,task_id:2,latency:p.latency+30},{...p,task_id:3,latency:p.latency+60}])}}))
   const url=`http://127.0.0.1:${version==='baseline'?4289:4286}`
   await page.goto(url+'/node/1');await page.locator('.resource-chart-panel .recharts-area-curve').waitFor();await page.screenshot({path:`${root}/${version}-${width}-${mode}-detail.png`,fullPage:true})
   await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.getByRole('button',{name:'显示全部线路',exact:true}).click();await page.locator('.recharts-line-curve').first().waitFor()
   await page.locator('.detail-history').screenshot({path:`${root}/${version}-${width}-${mode}-latency.png`})
   if(version==='current'){
    await page.locator('.detail-probe-legend>summary').click();await page.locator('.detail-history').screenshot({path:`${root}/routes-${width}-${mode}.png`})
    await page.goto(url);await page.locator('.latency-reading').first().waitFor();if(width>720)await page.locator('.map-land').waitFor();await page.screenshot({path:`${root}/home-${width}-${mode}.png`})
    await page.locator('.node-card').nth(1).scrollIntoViewIfNeeded();await page.locator('.node-card').nth(1).locator('.latency-reading').waitFor();await page.locator('.node-card').nth(1).screenshot({path:`${root}/card-${width}-${mode}.png`})
    await page.locator('header').getByRole('button',{name:'外观设置',exact:true}).click();await page.locator('[data-settings=detail]').scrollIntoViewIfNeeded();await page.locator('.settings-drawer').screenshot({path:`${root}/settings-${width}-${mode}.png`})
    await page.getByRole('group',{name:'通用显示预设',exact:true}).getByRole('button',{name:/精简/}).click();await page.locator('[data-settings=card-info]').scrollIntoViewIfNeeded();await page.locator('.settings-drawer').screenshot({path:`${root}/presets-${width}-${mode}.png`})
    await page.getByRole('button',{name:'关闭设置',exact:true}).click();await page.locator('.node-card').nth(1).screenshot({path:`${root}/slim-${width}-${mode}.png`})
   }
   await page.close()
  }
  for(const kind of ['detail','latency']){
   const page=await browser.newPage({viewport:{width:width===390?808:1400,height:2400}})
   const images=['baseline','current'].map(v=>readFileSync(`${root}/${v}-${width}-${mode}-${kind}.png`).toString('base64'))
   await page.setContent(`<body style="margin:0;background:#edf0f5;font:16px system-ui;padding:12px"><main style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${images.map((img,i)=>`<section><p style="margin:0 0 12px">${i?'v0.0.16':'v0.0.15'}</p><img style="display:block;width:100%" src="data:image/png;base64,${img}"></section>`).join('')}</main></body>`)
   await page.locator('main').screenshot({path:`${root}/compare-${width}-${mode}-${kind}.png`});await page.close()
  }
 }
}finally{await browser.close()}
