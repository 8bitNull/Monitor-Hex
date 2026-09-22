import assert from 'node:assert/strict'
import {latencyBars,latencyBand,SpeedBuffer,trendPath,trendCeiling,bucketLoss} from './trends.ts'
const cache=new SpeedBuffer()
const put=(id:number,ts:number,tx=0,rx=100)=>({id,ts,tx,rx})
cache.update([put(1,100),put(2,100,50)],[1,2],100)
cache.update([put(1,100,99),put(1,99),put(2,101,0)],[1,2],101)
assert.equal(cache.get(1).length,1);assert.equal(cache.get(1)[0].tx,0);assert.equal(cache.get(2).length,2)
for(let ts=101;ts<201;ts++)cache.update([put(1,ts)],[1,2],ts)
assert.equal(cache.get(1).length,60);assert.equal(cache.get(2).length,0)
cache.update([put(3,201,NaN),put(4,300)],[1,3,4],201)
assert.equal(cache.get(3).length,0);assert.equal(cache.get(4).length,0)
cache.update([],[],201);assert.equal(cache.get(1).length,0)
const rows=[{ts:0,value:0},{ts:1,value:1},{ts:2,value:null},{ts:3,value:3},{ts:100,value:4}]
assert.equal((trendPath(rows,0,100,100,15).match(/M/g)??[]).length,3)
assert.ok(trendPath(rows,0,100,100,15).startsWith('M0.00,38.00 L'))
assert.ok(!trendPath(rows,0,100,100,15).includes('NaN'))
assert.equal(trendCeiling(2),100);assert.equal(trendCeiling(1,1000),900);assert.ok(trendCeiling(2000,900)>=2000)
assert.equal(bucketLoss(undefined),null);assert.equal(bucketLoss(-1),null);assert.equal(bucketLoss(NaN),null);assert.equal(bucketLoss(0),0);assert.equal(bucketLoss(100),100)
for(const count of [20,100,500]){
 const sampleRows=Array.from({length:40},(_,i)=>({ts:i*60,value:20+i%3}))
 const start=performance.now();for(let i=0;i<count;i++)trendPath(sampleRows,0,2340,100,120)
 console.log(JSON.stringify({nodes:count,svgPathMs:Number((performance.now()-start).toFixed(2)),maxSamplesPerNode:60}))
}
console.log('network sample deduplication, expiry, isolation, gaps, zero, scale and loss semantics passed')

const samples=[{ts:0,latency:0},{ts:60,latency:80},{ts:180,latency:160},{ts:240,latency:600},{ts:300,latency:null}]
const bars=latencyBars(samples,200,80,160)
assert.deepEqual(bars.map(b=>b.tone),['good','fair','bad','bad','timeout'])
assert.equal(bars[3].height,30);assert.equal(bars[3].latency,600);assert.equal(bars[3].capped,true)
assert.ok(bars[0].height>0);assert.equal(bars[4].height,0)
assert.ok(Math.abs((bars[2].x-bars[1].x)-2*(bars[1].x-bars[0].x))<.001)
assert.equal(latencyBars(samples,500,80,160)[1].height,4.8)
assert.equal(latencyBand(80,100,200),'good');assert.equal(latencyBand(100,100,200),'fair')
assert.deepEqual(latencyBars([{ts:NaN,latency:1},{ts:0,latency:-1}],200,80,160),[])
