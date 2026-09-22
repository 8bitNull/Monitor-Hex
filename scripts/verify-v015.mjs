// Local fixture comparison for table layout and bounded network loading.
import {chromium} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const out='tests/artifacts/v015-comparison';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:process.env.TEST_BROWSER||'chrome'})
const builds=[['v014',process.env.THEME_BASELINE_URL||'http://127.0.0.1:4176'],['v015',process.env.THEME_CAPTURE_URL||'http://127.0.0.1:4175']]
const report={visual:[],performance:[]},fixed=Date.parse('2026-09-22T08:00:00Z')
async function prepare(count,appearance='light',language='zh') {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.clock.setFixedTime(fixed)
 await page.addInitScript(()=>{const observer=new MutationObserver(()=>{if(document.querySelector('.table-ping strong')){observer.disconnect();requestAnimationFrame(()=>{window.__tableReadyMs=performance.now()})}});observer.observe(document,{childList:true,subtree:true})})
 await page.addInitScript(({appearance,language})=>{sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({view:'table'}));localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,appearance,modules:{map:false}}));localStorage.setItem('monitor-next-language',language)},{appearance,language})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[i%6],id:i+1,sort:i,name:`Node ${String(i+1).padStart(3,'0')}`,online:true,last_seen:fixed/1000,expires_at:'2026-12-31',metrics:{...nodes()[0].metrics,cpu:10+i%75,net_tx:(i%9)*1000000,net_rx:(9-i%9)*1000000}}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信'},ping:[{task_id:1,ts:fixed/1000,latency:Number(new URL(r.request().url()).pathname.split('/')[3])%300+20}],loss:{1:0}}}))
 return page
}
try {
 if(!process.env.PERFORMANCE_ONLY)for(const [version,url] of builds)for(const appearance of ['light','dark'])for(const width of [390,1440]){
  const page=await prepare(6,appearance);await page.setViewportSize({width,height:1000});await page.goto(url)
  await page.locator('.table-ping').first().scrollIntoViewIfNeeded();await page.locator('.table-ping strong').first().waitFor();await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=0)
  await page.screenshot({path:`${out}/${version}-${appearance}-${width}.png`,fullPage:true})
  report.visual.push({version,appearance,viewport:width,...await page.locator('.table-scroll').evaluate(el=>({width:el.clientWidth,contentWidth:el.scrollWidth,rowHeight:el.querySelector('tbody tr').getBoundingClientRect().height,headerHeight:el.querySelector('thead').getBoundingClientRect().height}))})
  if(version==='v015'){
   await page.getByLabel('显示列',{exact:true}).click();await page.screenshot({path:`${out}/${version}-${appearance}-${width}-columns.png`})
   if(width===390){await page.locator('.table-presets').getByRole('button',{name:'网络',exact:true}).click();await page.keyboard.press('Escape');await page.locator('.table-scroll').evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:`${out}/${version}-${appearance}-${width}-network.png`})}
  }
  await page.close()
 }
 if(!process.env.CAPTURE_ONLY)for(const count of (process.env.TABLE_COUNTS||'20,100,500').split(',').map(Number))for(let run=1;run<=3;run++)for(const [version,url] of builds){
  console.log('Measuring',version,count,run);const page=await prepare(count),client=await page.context().newCDPSession(page)
  let requests=0;page.on('request',r=>{if(r.url().includes('/metrics?'))requests++})
  await client.send('Performance.enable');const start=performance.now();await page.goto(url);await page.locator('.table-ping strong').first().waitFor()
  await page.waitForFunction(()=>Number.isFinite(window.__tableReadyMs));const driverReadyMs=Math.round(performance.now()-start),readyMs=Math.round(await page.evaluate(()=>window.__tableReadyMs)),before=(await client.send('Performance.getMetrics')).metrics
  // Allow the already scheduled visible-row observer to settle, not a network polling cycle.
  await page.waitForTimeout(250)
  const visibleRequests=requests
  let allRequests=null
  if(!process.env.SKIP_SORT&&run===1){
   if(version==='v015')await page.getByLabel('表格排序',{exact:true}).selectOption('latency:desc')
   else await page.getByRole('button',{name:'所选线路延迟',exact:true}).click()
   await page.waitForFunction(count=>document.querySelectorAll('.table-ping strong').length===count,count,{timeout:120000})
   allRequests=requests
  }
  report.performance.push({count,run,version,readyMs,driverReadyMs,taskMs:Math.round((before.find(m=>m.name==='TaskDuration')?.value||0)*1000),visibleRequests,sortRequests:allRequests})
  writeFileSync(`${out}/performance-progress.json`,JSON.stringify(report,null,2));await page.close()
 }
 writeFileSync(`${out}/${process.env.SKIP_SORT?'readiness':process.env.PERFORMANCE_ONLY?'performance':'report'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}finally{await browser.close()}
