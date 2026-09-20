import {readFileSync} from 'node:fs'
const version=JSON.parse(readFileSync(new URL('../theme.json',import.meta.url),'utf8')).version
import {chromium} from '@playwright/test'
import {nodes,metrics} from './fixtures.mjs'
const browser=await chromium.launch({channel:'chrome'})
async function configure(page,appearance){
 await page.addInitScript(a=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,appearance:a})),appearance)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],country:'DE',name:'Netcup RS1000 · 法兰克福',agent_version:'1.0.0',ipv4_pin:true,ipv6_pin:true,remark:'2.5Gbps 国际线路;Anti-DDoS;应用与备份服务',expires_at:'2026-10-20'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const d=metrics();return r.fulfill({json:{...d,probes:{1:'浙江电信',2:'浙江联通',3:'浙江移动'},ping:d.ping.flatMap(p=>[p,{...p,task_id:2,latency:p.latency+45},{...p,task_id:3,latency:p.latency+100}])}})})
}
for(const appearance of ['light','dark']){
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await configure(page,appearance)
 await page.goto((process.env.CAPTURE_URL||'http://127.0.0.1:4174')+'/node/1');await page.locator('.resource-chart-panel .recharts-wrapper').waitFor()
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`tests/artifacts/monitor-hex-v${version}-detail-${width}-${appearance}.png`,fullPage:true})
 }
 await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.getByRole('button',{name:'显示全部线路'}).click();await page.locator('.detail-chart-frame .recharts-wrapper').waitFor()
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`tests/artifacts/monitor-hex-v${version}-latency-${width}-${appearance}.png`,fullPage:true})
 }
 await page.close()
}
await browser.close()
