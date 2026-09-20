import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {probeCatalog,summarizePing,windowLoss,subscribeNodePing,loadPing,getPing} from './ping.ts'
const data={ping:[{task_id:1,ts:1,latency:10}],probes:{'1':'A','2':'Empty','-1':'invalid'}}
assert.deepEqual(probeCatalog(data).map(p=>p.id),[1,2])
assert.equal(windowLoss(data,1),null)
assert.equal(windowLoss({...data,loss:{}},1),0)
assert.equal(summarizePing(data),summarizePing(data))
assert.equal(probeCatalog(data),probeCatalog(data))
let first=0,second=0
const stop1=subscribeNodePing(700,()=>first++),stop2=subscribeNodePing(701,()=>second++)
globalThis.fetch=(async()=>new Response(JSON.stringify(data))) as typeof fetch
await loadPing(700)
assert.equal(first,1);assert.equal(second,0)
stop1();stop2()
for(let id=1000;id<1205;id++)await loadPing(id)
assert.equal(getPing(700),undefined)
assert.equal(getPing(1000),undefined)
assert.ok(getPing(1204)?.data)
for(const count of [20,100,500]) {
 const snapshots=Array.from({length:count},()=>({ping:Array.from({length:1440},(_,i)=>({task_id:1,ts:i,latency:i%200}))}))
 const start=performance.now();snapshots.forEach(summarizePing);const cold=performance.now()-start
 const warm=performance.now();for(let i=0;i<10;i++)snapshots.forEach(summarizePing)
 console.log(JSON.stringify({nodes:count,samplesPerNode:1440,coldMs:+cold.toFixed(2),tenCachedPassesMs:+(performance.now()-warm).toFixed(2)}))
}
console.log('catalog, unknown loss, identity cache, scoped subscription and bounded retention passed')
