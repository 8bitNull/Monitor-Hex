import {chromium} from '@playwright/test'
import {nodes} from './fixtures.mjs'
import {mkdirSync} from 'node:fs'
const root='tests/artifacts/detail-focus';mkdirSync(root,{recursive:true})
const browser=await chromium.launch({channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}})
 await page.goto('http://127.0.0.1:4286/node/1');await page.locator('.recharts-area-curve').waitFor()
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${root}/sidebar-320.png`,fullPage:true})
 await page.locator('.detail-workspace').evaluate(el=>el.style.gridTemplateColumns='280px minmax(0,1fr)')
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${root}/sidebar-trial-280.png`,fullPage:true});await page.close()
 for(const dark of [false,true]){
 const p=await browser.newPage({viewport:{width:320,height:844}})
 await p.addInitScript(dark=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:dark?'dark':'light'})),dark)
 await p.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],name:'Tokyo 东京主节点 · Production 国际线路与备份服务',ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd',cpu_name:'AMD EPYC Processor 7B13 High Performance Virtual CPU',remark:'国际线路;Production;每日备份;Tokyo main gateway — long remarks remain readable;高可用部署'}]}}))
 await p.goto('http://127.0.0.1:4286/node/1');await p.locator('.recharts-area-curve').waitFor();await p.getByRole('button',{name:'展开备注',exact:true}).click();await p.locator('.detail-facts-toggle').click();await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${root}/long-mobile-${dark?'dark':'light'}.png`,fullPage:true});await p.close()
 }
}finally{await browser.close()}
