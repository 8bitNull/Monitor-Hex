import {chromium} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const label=process.argv[2]||'before',out=`tests/artifacts/mobile-latency/${label}`
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome'})
try{
 for(const width of [320,390,430,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2})
  await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:'light'})))
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[1]]}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
  await page.goto('http://127.0.0.1:4298')
  await page.locator('.latency-bars').waitFor()
  await page.locator('.node-card').screenshot({path:`${out}/${width}.png`,style:'header{visibility:hidden}'})
  console.log(width,await page.locator('.matrix-values').evaluate(el=>[...el.querySelectorAll('.latency-reading>span,.latency-bars,.latency-link,.loss-stat')].map(e=>({class:e.className,width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))))
  await page.close()
 }
}finally{await browser.close()}
