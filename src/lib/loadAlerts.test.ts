import assert from 'node:assert/strict'
import {updateLoadAlerts,readLoadAlerts} from './loadAlerts.ts'
import type {Node} from './api.ts'
const t=1800000000000
const node=(cpu:number,at=t,id=1)=>({id,name:`Node ${id}`,online:true,last_seen:at/1000,received_at:at,metrics:{cpu}} as Node)
let events=updateLoadAlerts([], [node(90),node(95,t,2)],true,t)
assert.equal(events.length,2)
events=updateLoadAlerts(events,[node(83,t+5000),node(98,t+5000,2)],true,t+5000)
assert.equal(events.filter(e=>e.status==='active').length,2)
assert.equal(events.find(e=>e.nodeId===2)?.peak,98)
events=updateLoadAlerts(events,[node(79,t+10000),node(98,t+10000,2)],true,t+10000)
const recovered=events.find(e=>e.nodeId===1)!
assert.equal(recovered.status,'recovered');assert.equal(recovered.end!-recovered.start,10000)
events=updateLoadAlerts(events,[node(79,t+10000),node(98,t+10000,2)],true,t+31000)
assert.equal(events.find(e=>e.nodeId===2)?.status,'interrupted')
assert.equal(events.find(e=>e.nodeId===2)?.end,t+10000)
assert.equal(updateLoadAlerts([], [node(99,t)],true,t+60001).length,0)
assert.equal(updateLoadAlerts([], [node(99)],false,t).length,0)
let active=updateLoadAlerts([], [node(99)],true,t)
assert.equal(readLoadAlerts(JSON.stringify(active))[0].status,'interrupted')
assert.equal(updateLoadAlerts(active,[{...node(99),online:false}],true,t+1000)[0].status,'interrupted')
assert.equal(updateLoadAlerts(active,null,false,t+1000)[0].status,'interrupted')
assert.deepEqual(readLoadAlerts('broken'),[])
assert.deepEqual(readLoadAlerts('[{"id":1}]'),[])
const many=Array.from({length:120},(_,i)=>({...recovered,id:String(i),start:t-i,last:t+i,end:t+i}))
assert.equal(updateLoadAlerts(many,[node(99)],true,t).length,101)
console.log('load alerts: simultaneous nodes, hysteresis, recovery, interruption, persistence and retention passed')
