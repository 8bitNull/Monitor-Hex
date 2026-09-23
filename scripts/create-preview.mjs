import { chromium } from 'playwright'
import { nodes } from './fixtures.mjs'

// Run after npm run build and npm run demo. Captures the current UI with sample data.
const browser = await chromium.launch({channel:'chrome',headless:true})
try {
 const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes().map((node,i)=>({...node,remark:i===0?'主力节点；稳定运行':'',expires_at:'2027-12-31'}))}}))
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:'light'})))
 await page.goto(`http://127.0.0.1:${process.env.THEME_DEMO_PORT||4173}`)
 const card=page.locator('.node-card').first()
 await card.scrollIntoViewIfNeeded()
 await card.locator('.latency-link').waitFor()
 const shot=await card.screenshot()
 await page.setViewportSize({width:1600,height:900})
 await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
 *{box-sizing:border-box}body{margin:0;width:1600px;height:900px;overflow:hidden;background:#f3f6fb;color:#172b49;font-family:"Segoe UI","Microsoft YaHei",sans-serif}
 .cover{position:relative;height:100%;padding:66px 80px;background:radial-gradient(ellipse at 80% 30%,#d8e9ff 0,transparent 52%)}
 .grid{position:absolute;inset:0;background-image:radial-gradient(#24457319 1px,transparent 1px);background-size:24px 24px;mask-image:linear-gradient(90deg,transparent 40%,black)}
 .brand{position:relative;display:flex;align-items:center;gap:14px;font-size:23px;letter-spacing:5px;font-weight:600}
 .logo{height:38px;width:34px;background:#326fe4;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);display:grid;place-items:center}.logo:after{content:'';width:12px;height:14px;background:#f3f6fb;clip-path:inherit}
 .intro{position:relative;width:760px;margin-top:68px}
 .eyebrow{font-size:17px;font-weight:600;letter-spacing:5px;color:#6080aa}
 h1{font-size:154px;line-height:1;margin:10px 0 24px;letter-spacing:-9px;font-weight:750;color:#17345c}
 h2{font-size:49px;line-height:1.5;letter-spacing:2px;margin:0;font-weight:600}
 .description{font-size:23px;color:#657991;margin:24px 0 36px}
 .features{display:flex;gap:12px}.features span{padding:11px 18px;border:1px solid #d6e1f0;border-radius:9px;font-size:18px;background:#ffffff8c;color:#486383}
 .footer{position:absolute;bottom:59px;left:80px;display:flex;align-items:center;gap:11px;color:#637c99;font-size:17px;letter-spacing:1px}.dot{width:7px;height:7px;background:#249e86;border-radius:50%}
 .visual{position:absolute;right:79px;top:92px;width:520px;height:716px}
 .backplate{position:absolute;inset:28px -17px -10px 18px;background:linear-gradient(150deg,#3778de,#1e4f9d);border-radius:31px;transform:rotate(5deg)}
 .card-wrap{position:relative;padding:16px 18px 20px;border-radius:25px;background:#fff;box-shadow:0 24px 65px #1e487326;border:1px solid #e3ebf5}
 .window{height:32px;display:flex;align-items:center;gap:6px;border-bottom:1px solid #edf1f7;margin-bottom:13px;padding-bottom:13px}.window i{width:7px;height:7px;border-radius:50%;background:#c6d4e5}.window span{margin-left:auto;font-size:12px;color:#7b8da6;letter-spacing:2px}
 img{display:block;width:100%;height:auto;border-radius:14px}
 .caption{display:flex;align-items:center;justify-content:space-between;padding-top:16px;color:#68809e;font-size:13px;letter-spacing:1px}.caption b{display:flex;align-items:center;gap:6px;color:#28866f;font-weight:500}
 </style><div class="cover"><div class="grid"></div><div class="brand"><div class="logo"></div>MONITOR HEX</div><div class="intro"><div class="eyebrow">SERVER MONITORING THEME</div><h1>HEX<span style="color:#3979e0">.</span></h1><h2>服务器状态<br>一目了然。</h2><p class="description">清晰呈现资源、网络与每一台服务器。</p><div class="features"><span>卡片 / 表格</span><span>深浅主题</span><span>移动适配</span></div></div><div class="footer"><i class="dot"></i>为 monitor-probe 打造</div><div class="visual"><div class="backplate"></div><div class="card-wrap"><div class="window"><i></i><i></i><i></i><span>LIVE OVERVIEW</span></div><img src="data:image/png;base64,${shot.toString('base64')}"><div class="caption"><span>真实界面 · 演示数据</span><b><i class="dot"></i>简洁 · 直观</b></div></div></div></div></html>`)
 await page.evaluate(()=>document.fonts.ready)
 await page.screenshot({path:'preview.png',scale:'css'})
 console.log('Created preview.png (1600 × 900)')
} finally {await browser.close()}
