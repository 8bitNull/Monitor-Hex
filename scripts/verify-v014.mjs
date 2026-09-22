// Reproducible local fixture comparison; never touches the production site.
import {chromium} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const out='tests/artifacts/v014-comparison'
mkdirSync(out,{recursive:true})
const baseline=process.env.THEME_BASELINE_URL||'http://127.0.0.1:4176'
const current=process.env.THEME_CAPTURE_URL||'http://127.0.0.1:4175'
const fixed=Date.parse('2026-09-22T04:00:00Z')
const originalNow=Date.now;Date.now=()=>fixed
const fleet=nodes().map(n=>({...n,expires_at:'2026-12-31',remark:'Production;Backup'})),history=metrics()
Date.now=originalNow
const browser=await chromium.launch({channel:process.env.TEST_BROWSER||'chrome'})
const report={visual:[],performance:[]}
async function prepare(url,count,appearance='light',overview=false) {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 await page.clock.setFixedTime(fixed)
 await page.addInitScript(({appearance,overview})=>localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,appearance,infoDensity:overview?'overview':'full',graph:'bar',latencyScale:500,latencyWarn:150,latencyHigh:300,modules:{map:false}})),{appearance,overview})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...fleet[i%fleet.length],id:i+1,sort:i,last_seen:fixed/1000,online:true}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const id=Number(new URL(r.request().url()).pathname.split('/')[3])
  return r.fulfill({json:{...history,probes:{1:'浙江电信',2:'浙江联通',3:'浙江移动'},loss:{1:0,2:0.1,3:0},ping:history.ping.flatMap((p,i)=>[1,2,3].map(task_id=>({...p,task_id,latency:90+(id%4)*50+task_id*20+Math.sin(i*.3)*8,loss:task_id===2&&i===50?2:0})))}})
 })
 return page
}
try {
 if(!process.env.PERFORMANCE_ONLY)for(const [version,url] of [['v013',baseline],['v014',current]])for(const appearance of ['light','dark'])for(const width of [390,1440]){
  const page=await prepare(url,6,appearance,version==='v014')
  await page.setViewportSize({width,height:1000});await page.goto(url)
  await page.locator('.latency-bars').first().waitFor();await page.evaluate(()=>document.fonts.ready)
  await page.screenshot({path:`${out}/${version}-${appearance}-${width}-home.png`})
  report.visual.push({version,appearance,width,cardHeight:(await page.locator('.node-card').first().boundingBox()).height,summaryHeight:(await page.locator('.summary-grid').boundingBox()).height})
  await page.locator('.node-open').first().click();await page.getByRole('button',{name:'网络延迟',exact:true}).click()
  await page.locator('.detail-probe-legend>summary').click()
  while(await page.locator('.probe-options button[aria-pressed=false]').count())await page.locator('.probe-options button[aria-pressed=false]').first().click()
  await page.keyboard.press('Escape');await page.mouse.move(0,0);await page.evaluate(()=>scrollTo(0,0))
  await page.screenshot({path:`${out}/${version}-${appearance}-${width}-detail.png`,fullPage:true})
  if(version==='v014'){
   await page.getByRole('button',{name:'外观设置',exact:true}).click()
   await page.locator('.settings-nav').getByRole('button',{name:'网络',exact:true}).click()
   await page.screenshot({path:`${out}/${version}-${appearance}-${width}-settings.png`})
  }
  await page.close()
 }
 // Alternate builds within each sample to reduce order-dependent machine drift.
 if(!process.env.CAPTURE_ONLY)for(const count of [20,100,500])for(let run=1;run<=3;run++)for(const [version,url] of [['v013',baseline],['v014',current]]){
  const page=await prepare(url,count,'light',version==='v014'),client=await page.context().newCDPSession(page)
  let requests=0;page.on('request',r=>{if(r.url().includes('/metrics?'))requests++})
  await client.send('Performance.enable')
  const start=performance.now();await page.goto(url);await page.locator('.latency-bars').first().waitFor()
  const readyMs=performance.now()-start
  const {metrics:perf}=await client.send('Performance.getMetrics')
  report.performance.push({version,count,run,readyMs:Math.round(readyMs),taskMs:Math.round((perf.find(m=>m.name==='TaskDuration')?.value||0)*1000),requests})
  await page.close()
 }
 writeFileSync(`${out}/${process.env.PERFORMANCE_ONLY?"performance":"report"}.json`,JSON.stringify(report,null,2))
 console.log(JSON.stringify(report,null,2))
} finally {await browser.close()}
