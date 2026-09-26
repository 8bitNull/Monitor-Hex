import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

async function setup(page:Page,authed=true){
 await page.setViewportSize({width:320,height:640})
 await page.route('**/api/me',r=>r.fulfill({json:{authed,github:false,site_name:'测试站点',public_page:true}}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,3).map((n,i)=>({...n,name:i===0?'Long node name '.repeat(8):n.name,agent_version:['1.9.0','', '2.0.0'][i],online:i!==0}))}}))
 await page.goto('/')
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click()
}
const version={hub:'1.9.0',hub_latest:'1.10.0',agent_latest:'1.10.0',notice:true}
test('public visitors never query or see admin versions',async({page})=>{
 let calls=0;await page.route('**/api/version',r=>{calls++;return r.fulfill({json:version})})
 await setup(page,false);await expect(page.getByRole('button',{name:/版本与更新/})).toHaveCount(0);expect(calls).toBe(0)
})
test('admin versions, badges, offline/unknown nodes and read-only links fit mobile',async({page})=>{
 const writes:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&r.method()!=='GET')writes.push(r.url())})
 await page.route('**/api/version',r=>r.fulfill({json:version}));await setup(page)
 await page.getByRole('button',{name:/版本与更新.*有新版本/}).click()
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('1 个节点可更新')
 await dialog.locator('summary').click();await expect(dialog).toContainText('尚未上报版本');await expect(dialog).toContainText('当前版本高于发布版本');await expect(dialog).toContainText('离线')
 await expect(dialog.getByRole('link',{name:'前往后台更新'})).toHaveAttribute('href','/admin/update')
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 const footer=(await dialog.locator('.ma-sheet-actions').boundingBox())!;expect(footer.y+footer.height).toBeLessThanOrEqual(640)
 await page.screenshot({path:'tests/artifacts/mobile-updates-320.png'})
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/版本与更新/})).toBeFocused();expect(writes).toEqual([])
})
test('failed, unsupported, expired and partial checks never claim latest; retry recovers',async({page})=>{
 let mode=0;await page.route('**/api/version',r=>mode===0?r.fulfill({status:503}):mode===1?r.fulfill({json:{...version,hub_latest:'',agent_latest:'',notice:false}}):mode===2?r.fulfill({status:401}):mode===3?r.fulfill({status:404}):r.fulfill({json:version}))
 await setup(page);await page.getByRole('button',{name:/版本与更新/}).click();const dialog=page.getByRole('dialog')
 await expect(dialog).toContainText('检查失败，请稍后重试')
 mode=1;await dialog.getByRole('button',{name:'检查更新',exact:true}).click();await expect(dialog).toContainText('最新版本暂不可用');await expect(dialog).not.toContainText('已是最新版本');await expect(page.locator('.ma-nav .ma-update-dot')).toHaveCount(0)
 mode=2;await dialog.getByRole('button',{name:'检查更新',exact:true}).click();await expect(dialog).toContainText('登录已失效');await expect(dialog).not.toContainText('1.9.0')
 mode=3;await dialog.getByRole('button',{name:'检查更新',exact:true}).click();await expect(dialog).toContainText('当前后台暂不支持版本查询')
 mode=4;await dialog.getByRole('button',{name:'检查更新',exact:true}).click();await expect(dialog).toContainText('1 个节点可更新')
})
test('disabled notices suppress badges and English dark layout fits',async({page})=>{
 await page.route('**/api/version',r=>r.fulfill({json:{...version,notice:false}}));await setup(page)
 await page.getByLabel('明暗模式',{exact:true}).selectOption('dark');await page.getByLabel('Language / 语言').selectOption('en')
 await page.getByRole('button',{name:/Versions & updates/}).click();await expect(page.locator('.ma-update-dot')).toHaveCount(0)
 await expect(page.getByRole('dialog')).toContainText('1 nodes can be updated')
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)}
 await page.screenshot({path:'tests/artifacts/mobile-updates-dark-en.png'})
})
