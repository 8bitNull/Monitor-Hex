import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
for(let run=0;run<3;run++){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
 for(const cache of ['cold','warm']){await page.goto('http://127.0.0.1:4176');await page.locator('.region-atlas').waitFor();results.push({run,cache,...await page.evaluate(()=>({ready:performance.now(),resource:performance.getEntriesByType('resource').filter(r=>r.name.includes('/WorldMap-')).map(r=>({start:r.startTime,end:r.responseEnd,transfer:r.transferSize,encoded:r.encodedBodySize}))}))});}
 await context.close();
}await browser.close();await writeFile('tests/artifacts/map-performance/delivery.json',JSON.stringify({conditions:'1.6 Mbps, 150ms latency, 4x CPU, gzip fixture server, six nodes, Chromium disk cache',results},null,2));console.log(JSON.stringify(results));
