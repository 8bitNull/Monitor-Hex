export type SpeedSample={ts:number;tx:number;rx:number}
/** Bounded real reports, not samples manufactured by component renders. */
export class SpeedBuffer {
 private entries=new Map<number,SpeedSample[]>()
 update(nodes:{id:number;ts:number;tx:number;rx:number}[],activeIds:number[],now:number){
  const active=new Set(activeIds)
  for(const [id,rows] of this.entries){const kept=rows.filter(p=>p.ts>=now-60);if(!active.has(id)||!kept.length)this.entries.delete(id);else if(kept.length!==rows.length)this.entries.set(id,kept)}
  for(const n of nodes){
   if(![n.ts,n.tx,n.rx].every(Number.isFinite)||n.tx<0||n.rx<0||n.ts<now-60||n.ts>now+5)continue
   const rows=this.entries.get(n.id)??[]
   if(n.ts<=(rows.at(-1)?.ts??-Infinity))continue
   this.entries.set(n.id,[...rows,{ts:n.ts,tx:n.tx,rx:n.rx}].slice(-60))
  }
 }
 get(id:number){return this.entries.get(id)??EMPTY_SPEED}
}
const EMPTY_SPEED:SpeedSample[]=[]
export function trendPath(rows:{ts:number;value:number|null}[],start:number,end:number,top:number,gap:number){
 let d='',previous:number|null=null
 for(const p of rows){
  if(p.ts<start||p.ts>end||p.value===null||!Number.isFinite(p.value)){previous=null;continue}
  const x=(p.ts-start)/Math.max(1,end-start)*300,y=38-Math.min(1,Math.max(0,p.value)/Math.max(1,top))*34
  d+=`${previous===null||p.ts-previous>gap?'M':'L'}${x.toFixed(2)},${y.toFixed(2)} `;previous=p.ts
 }
 return d.trim()
}
/** Expand immediately, contract at most 10% per fresh sample set. */
export function trendCeiling(max:number,previous=0,floor=100){return Math.max(floor,Math.ceil(max/Math.max(1,floor/4))*Math.max(1,floor/4),previous*.9)}
export function bucketLoss(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null}

export function latencyBand(value:number|null,warn=80,high=160){
 return value===null?'timeout':value>=high?'bad':value>=warn?'fair':'good'
}
/** Timestamp placement preserves gaps; scale is shared by all cards. */
export function latencyBars(rows:{ts:number;latency:number|null}[],scale:number,warn:number,high:number){
 const valid=rows.filter(p=>Number.isFinite(p.ts)&&(p.latency===null||(Number.isFinite(p.latency)&&p.latency>=0)))
 const end=Math.max(0,...valid.map(p=>p.ts)),start=Math.min(end,...valid.map(p=>p.ts)),span=Math.max(60,end-start)
 const width=Math.min(6,280*60/span*.7)
 return valid.map(p=>({...p,x:10+(p.ts-start)/span*280,width,height:p.latency===null?0:Math.max(1,Math.min(p.latency/scale,1)*30),tone:p.latency!==null&&p.latency>scale?'bad':latencyBand(p.latency,warn,high),capped:p.latency!==null&&p.latency>scale}))
}
