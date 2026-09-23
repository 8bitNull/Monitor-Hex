import {chromium} from 'playwright';import {nodes} from './fixtures.mjs';import {writeFile,mkdir,readFile,readdir} from 'node:fs/promises';import {gzipSync} from 'node:zlib';
const label=process.argv[2]||'current',base=process.env.MAP_BENCH_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
for(const count of [20,100,500])for(let run=0;run<3;run++){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const client=await page.context().newCDPSession(page);await client.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.addInitScript(()=>{window.mapTasks=[];new PerformanceObserver(list=>window.mapTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true})});
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[i%6],id:i+1,sort:i}))}}));
 await page.goto(base);await page.locator('.region-atlas').waitFor();const ready=await page.evaluate(()=>performance.now());
 const map=page.locator('.explorer-stage>svg');await map.scrollIntoViewIfNeeded();const box=await map.boundingBox();
 await page.evaluate(()=>{window.mapFrames=[];window.mapMeasuring=true;let last=performance.now();const step=t=>{window.mapFrames.push(t-last);last=t;if(window.mapMeasuring)requestAnimationFrame(step)};requestAnimationFrame(step)});
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55,{steps:40});await page.mouse.up();
 const data=await page.evaluate(()=>{window.mapMeasuring=false;const frames=window.mapFrames.slice(1).sort((a,b)=>a-b);return {frameP95:frames[Math.floor(frames.length*.95)],longTasks:window.mapTasks.length,mapStart:performance.getEntriesByType('resource').find(e=>e.name.includes('/WorldMap-'))?.startTime}});
 results.push({count,run,ready,...data});await page.close();
}
await browser.close();const files=(await readdir('dist/assets')).filter(f=>f.startsWith('WorldMap-'));const assets=[];for(const file of files){const b=await readFile('dist/assets/'+file);assets.push({file,bytes:b.length,gzip:gzipSync(b).length})}
await mkdir('tests/artifacts/map-performance',{recursive:true});await writeFile(`tests/artifacts/map-performance/${label}.json`,JSON.stringify({label,cpuThrottle:4,network:'local fixture server, no artificial latency',assets,results},null,2));console.log(JSON.stringify({label,assets,results}));
