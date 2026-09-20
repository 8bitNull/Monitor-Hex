import type {Node} from './api.ts'
import {nodeState} from './freshness.ts'
export const LOAD_ALERT_KEY='monitor-next-load-alerts-v1'
export type LoadAlert={id:string;nodeId:number;name:string;start:number;last:number;end?:number;peak:number;status:'active'|'recovered'|'interrupted'}
export function readLoadAlerts(raw:string|null):LoadAlert[]{
 try {
  const value:unknown=JSON.parse(raw||'[]')
  if(!Array.isArray(value))return []
  return value.filter((v):v is LoadAlert=>v && typeof v.id==='string' && typeof v.name==='string' && Number.isInteger(v.nodeId) && [v.start,v.last,v.peak].every(Number.isFinite) && v.start>0 && v.last<=8640000000000000 && v.last>=v.start && v.peak>=0 && v.peak<=100 && ['active','recovered','interrupted'].includes(v.status) && (v.end===undefined || (Number.isFinite(v.end) && v.end>=v.start && v.end<=8640000000000000))).slice(0,500).map(v=>v.status==='active'?{...v,status:'interrupted',end:v.last}:v)
 }catch{return []}
}
/** Durations cover observed samples only; a missing stream is never recovery. */
export function updateLoadAlerts(previous:LoadAlert[],nodes:Node[]|null,enabled:boolean,now:number):LoadAlert[]{
 const result=previous.map(e=>({...e}));const byId=new Map((nodes||[]).map(n=>[n.id,n]))
 for(const event of result.filter(e=>e.status==='active')){
  const n=byId.get(event.nodeId)
  if(!enabled || !n || nodeState(n,now)!=='live' || now-event.last>20000){event.status='interrupted';event.end=event.last}
 }
 if(enabled)for(const n of nodes||[]){
  if(nodeState(n,now)!=='live' || !n.metrics || !Number.isFinite(n.metrics.cpu))continue
  const sample=Math.min(now,n.received_at??now),cpu=n.metrics.cpu
  const event=result.find(e=>e.nodeId===n.id && e.status==='active')
  if(event){
   if(sample<event.last)continue
   event.last=sample;event.name=n.name;event.peak=Math.max(event.peak,cpu)
   if(cpu<80){event.status='recovered';event.end=sample}
  }else if(cpu>=85){result.unshift({id:`${n.id}-${sample}`,nodeId:n.id,name:n.name,start:sample,last:sample,peak:cpu,status:'active'})}
 }
 const active=result.filter(e=>e.status==='active');const ended=result.filter(e=>e.status!=='active').sort((a,b)=>b.start-a.start).slice(0,100)
 return [...active,...ended].sort((a,b)=>b.start-a.start)
}
