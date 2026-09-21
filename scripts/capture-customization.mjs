import {chromium} from '@playwright/test'
import {mkdirSync,readFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const fixed=Date.parse('2026-09-21T04:00:00Z'),now=Date.now;Date.now=()=>fixed
const fleet=nodes().map((n,i)=>({...n,remark:i===0?'国际线路;Backup;Production':n.remark,expires_at:'2026-10-05'})),history=metrics();Date.now=now
const root='tests/artifacts/customization';mkdirSync(root,{recursive:true})
const browser=await chromium.launch({channel:'chrome'})
try{
for(const mode of ['light','dark'])for(const width of [390,1440]){
 for(const version of ['baseline','default','custom']){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.clock.setFixedTime(fixed)
  await page.addInitScript(({mode,version})=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:mode,...(version==='custom'?{desktopColumns:'4',mobileInfoMode:'custom',mobileCardInfo:{traffic:true,connections:false,uptime:false,expiry:true,remarks:true,price:true}}:{})})),{mode,version})
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}));await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:history}))
  await page.goto('http://127.0.0.1:'+(version==='baseline'?'4289':'4286'));await page.locator('.route-matrix').first().scrollIntoViewIfNeeded();await page.locator('.latency-reading').first().waitFor();await page.evaluate(()=>document.fonts.ready)
  await page.locator('.node-card').first().screenshot({path:`${root}/${version}-${width}-${mode}-card.png`})
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${root}/${version}-${width}-${mode}-home.png`})
  if(version==='custom'){
   await page.locator('header').getByRole('button',{name:'外观设置',exact:true}).click();await page.screenshot({path:`${root}/settings-${width}-${mode}-top.png`})
   await page.locator('[data-settings=card-info]').scrollIntoViewIfNeeded();await page.screenshot({path:`${root}/settings-${width}-${mode}-display.png`})
  }
  await page.close()
 }
 const a=readFileSync(`${root}/baseline-${width}-${mode}-card.png`),b=readFileSync(`${root}/default-${width}-${mode}-card.png`)
 console.log(`${width} ${mode}: default card identical to v0.0.12 = ${a.equals(b)}`)
 if(!a.equals(b))throw Error('Default card visual regression')
}
}finally{await browser.close()}
