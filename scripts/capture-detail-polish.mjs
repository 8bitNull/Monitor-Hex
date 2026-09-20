import {chromium} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const fixed=Date.parse('2026-09-20T04:00:00Z'),now=Date.now
Date.now=()=>fixed
const fleet=[{...nodes()[0],country:'DE',name:'Netcup RS1000 · 法兰克福',ipv4_pin:true,ipv6_pin:true,agent_version:'1.0.0',remark:'2.5Gbps 国际线路;Anti-DDoS;应用与备份服务'}],base=metrics()
const history={...base,probes:{1:'浙江电信',2:'浙江联通',3:'浙江移动'},ping:base.ping.flatMap(p=>[p,{...p,task_id:2,latency:p.latency+45},{...p,task_id:3,latency:p.latency+100}])}
Date.now=now
const root=`tests/artifacts/detail-polish/${process.env.CAPTURE_LABEL||'candidate'}`
mkdirSync(root,{recursive:true})
const browser=await chromium.launch({channel:process.env.TEST_BROWSER||'chrome'})
try{
for(const width of [320,390,430,768,1024,1440])for(const appearance of ['light','dark'])for(const language of ['zh','en']){
 const page=await browser.newPage({viewport:{width,height:width<768?844:1000},reducedMotion:'reduce'})
 await page.clock.setFixedTime(fixed)
 await page.addInitScript(({appearance,language})=>{localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,designVersion:1,appearance}));localStorage.setItem('monitor-next-language',language)},{appearance,language})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:history}))
 await page.goto((process.env.CAPTURE_URL||'http://127.0.0.1:4286')+'/node/1')
 await page.locator('.resource-chart-panel .recharts-wrapper').waitFor()
 await page.evaluate(()=>document.fonts.ready)
 await page.screenshot({path:`${root}/${width}-${appearance}-${language}-detail.png`,fullPage:true})
 await page.getByRole('button',{name:language==='zh'?'网络延迟':'Network latency',exact:true}).click()
 await page.getByRole('button',{name:language==='zh'?'显示全部线路':'Show all probes',exact:true}).click()
 await page.locator('.detail-chart-frame .recharts-wrapper').waitFor()
 await page.locator('.detail-history').scrollIntoViewIfNeeded()
 await page.screenshot({path:`${root}/${width}-${appearance}-${language}-latency.png`})
 await page.locator('header').getByRole('button',{name:language==='zh'?'外观设置':'Appearance',exact:true}).click()
 await page.screenshot({path:`${root}/${width}-${appearance}-${language}-settings.png`})
 await page.close()
}
}finally{await browser.close()}
console.log(`Captured ${root}`)
