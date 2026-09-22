import {settingsButton} from './settings'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {toggleSettings,visualSelect} from './settings'

for(const [width,height] of [[320,844],[390,844],[430,932],[768,1024],[1440,1000]]){
 test('refined cards keep readable metrics in every style at '+width,async({page})=>{
  test.setTimeout(90000)
  await page.setViewportSize({width,height})
  for(const language of ['zh','en'])for(const appearance of ['light','dark']){
   await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance,modules:{map:false}}))},{language,appearance})
   await page.goto('/')
   for(const graph of ['bar','ring','columns','minimal']){
    await toggleSettings(page);await visualSelect(page,'graph',graph);await toggleSettings(page)
    const card=page.locator('.node-card').first()
    await expect(card).toHaveAttribute('data-indicator',graph)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    const faults=await card.evaluate(el=>{
     const issues:string[]=[]
     for(const resource of el.querySelectorAll('.resource')){
      const r=resource.getBoundingClientRect()
      for(const part of resource.querySelectorAll('.resource-label,.resource small,.bar-number,.metric-ring strong')){
       const b=part.getBoundingClientRect();if(!b.width||!b.height)continue
       if(b.left<r.left-1||b.right>r.right+1)issues.push('metric overflows: '+part.textContent)
      }
     }
     for(const speed of el.querySelectorAll('.speed-pair strong')){
      const r=speed.getBoundingClientRect(),parent=speed.parentElement!.getBoundingClientRect()
      if(r.right>parent.right+1)issues.push('speed overflows')
     }
     return issues
    })
    expect(faults).toEqual([])
    const baselines=await card.locator('.speed-pair strong').evaluateAll(elements=>elements.map(el=>{const range=document.createRange();range.selectNodeContents(el.firstChild!);return range.getBoundingClientRect().top}))
    expect(Math.abs(baselines[0]-baselines[1])).toBeLessThanOrEqual(1)
    if(width===390&&graph==='bar'){
     for(const value of await card.locator('.resource').all().then(rs=>rs.slice(0,2))){const box=(await value.boundingBox())!;expect(box.y+box.height).toBeLessThan(height)}
    }
   }
  }
 })
}

test('fresh defaults, legacy choices, explicit site-equal choices and resets stay compatible',async({page})=>{
 let config:any={}
 await page.route('**/theme-config.json',r=>r.fulfill({json:config}))
 await page.goto('/');await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','bar')
 config={graph:'ring'};await page.reload();await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','ring')
 await toggleSettings(page);await visualSelect(page,'graph','ring');await toggleSettings(page)
 config={graph:'columns'};await page.reload();await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','ring')
 await toggleSettings(page);await (await settingsButton(page,'恢复默认外观',{exact:true})).click();await toggleSettings(page)
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','columns')
 for(const modern of [false,true])for(const graph of ['ring','bar','columns','minimal']){
  await page.evaluate(({modern,graph})=>localStorage.setItem('monitor-next',JSON.stringify(modern?{_storageVersion:1,graph}:{graph})),{modern,graph})
  config={graph};await page.reload();await expect(page.locator('.next-theme')).toHaveAttribute('data-graph',graph)
  config={graph:graph==='bar'?'ring':'bar'};await page.reload();await expect(page.locator('.next-theme')).toHaveAttribute('data-graph',graph)
 }
})

test('zero, unavailable, warning, long facts and failed latency retain honest states',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.route('**/theme-config.json',r=>r.fulfill({json:{modules:{map:false}}}))
 let fleet:any[]=nodes();const base=fleet[0]
 fleet=[
  {...base,id:1,name:'Zero',metrics:{...base.metrics,cpu:0,net_rx:0,net_tx:0,mem_used:0,disk_used:0}},
  {...base,id:2,name:'Offline',online:false,metrics:null},
  {...base,id:3,name:'Stale',last_seen:Math.floor(Date.now()/1000)-120},
  {...base,id:4,name:'Missing',metrics:null},
  {...base,id:5,name:'Long node name · 超长节点名称与备注 '.repeat(5),remark:'Long note 长备注 '.repeat(25),expires_at:'2020-01-01',metrics:{...base.metrics,cpu:95,net_rx:1024**4,net_tx:99999999999}},
  {...base,id:6,name:'Expiring',expires_at:new Date(Date.now()+2*86400000).toISOString().slice(0,10)}
 ]
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.request().url().includes('/5/')?r.fulfill({status:503}):r.fulfill({json:r.request().url().includes('/6/')?{metrics:[],ping:[],probes:{}}:metrics()}))
 await page.goto('/')
 const cards=page.locator('.node-card');await expect(cards).toHaveCount(6)
 await expect(cards.nth(0).locator('.bar-number').first()).toHaveText('0.0%')
 for(const i of [1,2,3])await expect(cards.nth(i).locator('.bar-number').first()).toHaveText('—')
 await expect(cards.nth(4).locator('.resource').first()).toHaveClass(/danger/)
 await expect(cards.nth(4).locator('.expiring')).toContainText('已过期')
 await cards.nth(5).locator('.node-secondary-disclosure summary').click()
 await expect(cards.nth(5).locator('.expiring')).toBeVisible()
 for(const card of await cards.all()){
  await card.scrollIntoViewIfNeeded();expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  await card.screenshot({path:`tests/artifacts/refinement/state-${await card.locator('.node-open').getAttribute('data-node-id')}.png`})
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
