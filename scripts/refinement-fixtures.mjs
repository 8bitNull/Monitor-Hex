// Local review data only. Never imported by production or included in dist.
import {nodes,metrics} from './fixtures.mjs'
export function refinedNodes(){
 const base=nodes(),day=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
 return Array.from({length:24},(_,i)=>{
  const original=base[i%base.length],high=i===8,quota=i===10
  return {...original,id:i+1,sort:i,group:i%3===0?'网站':i%3===1?'流量':'',name:i===0?'Tokyo · 日本主站与跨区域生产环境网关':`${original.name} ${String(i+1).padStart(2,'0')}`,
   expires_at:i===2?day:null,traffic_limit:i===0?0:quota?55*1024**3:original.traffic_limit,
   ipv4:`192.0.2.${i+1}`,ipv6:`2001:db8:1234:5678:abcd:1234:5678:${i+1}`,
   metrics:original.metrics?{...original.metrics,cpu:high?92:original.metrics.cpu,net_rx:i===0?170000000:original.metrics.net_rx}:null}
 })
}
export function refinedMetrics(){
 const source=metrics()
 return {...source,probes:{1:'华东电信',2:'华南联通',3:'华北移动'},loss:{1:0,2:.6},
  ping:source.ping.flatMap((p,i)=>[1,2,3].map(id=>({...p,task_id:id,latency:id===2&&i===30?null:p.latency+(id-1)*18,...(id===3?{}:{loss:id===2&&i===30?100:0})}))) }
}
