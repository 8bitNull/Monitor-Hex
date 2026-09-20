// Local installation preview, using sample data only.
import {readFileSync} from 'node:fs'
const {version}=JSON.parse(readFileSync(new URL('../theme.json',import.meta.url),'utf8'))
import {chromium} from '@playwright/test'
import {nodes} from './fixtures.mjs'
const browser=await chromium.launch({channel:'chrome'})
for(const appearance of ['light','dark']){
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 await page.addInitScript(appearance=>{
  localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,appearance,modules:{busiest:true,map:true}}))
  const now=Date.now();localStorage.setItem('monitor-next-load-alerts-v1',JSON.stringify([{id:'sample-recovered',nodeId:2,name:'Hong Kong · 香港边缘',start:now-900000,last:now-300000,end:now-300000,peak:97.8,status:'recovered'}]))
 },appearance)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>i===0?{...n,metrics:{...n.metrics,cpu:93.6}}:n)}}))
 await page.goto(process.env.CAPTURE_URL||'http://127.0.0.1:4174')
 await page.locator('.map-land').waitFor();await page.locator('.load-alert-tile[data-active=true]').waitFor()
 for(const card of await page.locator('.node-card').all()){await card.scrollIntoViewIfNeeded();await card.locator('.route-matrix .latency-reading').first().waitFor()}
 await page.evaluate(()=>scrollTo(0,0))
 await page.waitForFunction(()=>!document.querySelector('.node-grid')?.textContent?.includes('正在读取探测记录'))
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('monitor-next-load-alerts-v1')||'[]').some(e=>e.status==='active' && e.last>e.start))
 if(await page.locator('.map-scale').innerText()!=='169%')throw Error('Incorrect map scale')
 if(!await page.locator('.site-footer').innerText().then(t=>t.includes('Monitor HEX')))throw Error('Incorrect theme name')
 await page.screenshot({path:`tests/artifacts/monitor-hex-v${version}-home-${appearance}.png`,fullPage:true})
 if(appearance==='light')await page.screenshot({path:'preview.png'})
 await page.getByRole('button',{name:'查看高负载记录',exact:true}).click()
 await page.screenshot({path:`tests/artifacts/monitor-hex-v${version}-alerts-${appearance}.png`})
 await page.keyboard.press('Escape')
 await page.setViewportSize({width:390,height:1000});await page.evaluate(()=>scrollTo(0,0))
 if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow')
 await page.screenshot({path:`tests/artifacts/monitor-hex-v${version}-mobile-${appearance}.png`,fullPage:true})
 await page.close()
}
await browser.close()
