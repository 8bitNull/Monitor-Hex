import {chromium} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const fixed=Date.parse('2026-09-20T04:00:00Z'),realNow=Date.now
Date.now=()=>fixed
const fleet=nodes(),history=metrics()
Date.now=realNow
const label=process.env.CAPTURE_LABEL||'candidate'
const root=`tests/artifacts/refinement/${label}`
mkdirSync(root,{recursive:true})
const browser=await chromium.launch({channel:process.env.TEST_BROWSER||'chrome'})
try{
 for(const [width,height] of [[320,844],[390,844],[430,932],[768,1024],[1440,1000]])for(const appearance of ['light','dark'])for(const language of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'})
  await page.clock.setFixedTime(fixed)
  await page.addInitScript(({appearance,language})=>{localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,designVersion:1,appearance}));localStorage.setItem('monitor-next-language',language)},{appearance,language})
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:history}))
  await page.goto(process.env.CAPTURE_URL||'http://127.0.0.1:4286')
  await page.locator('.node-card').first().waitFor()
  await page.locator('.route-matrix').first().scrollIntoViewIfNeeded()
  await page.locator('.latency-reading').first().waitFor()
  await page.evaluate(()=>scrollTo(0,0))
  await page.evaluate(()=>document.fonts.ready)
  await page.mouse.move(0,0)
  await page.screenshot({path:`${root}/${width}-${appearance}-${language}.png`})
  if(width===390&&language==='zh')await page.locator('.node-card').first().screenshot({path:`${root}/card-${appearance}.png`})
  await page.close()
 }
}finally{await browser.close()}
console.log(`Captured ${root}`)
