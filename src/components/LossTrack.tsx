import {useState} from 'react'
import {tr,locale} from '@/lib/i18n'
import {bucketLoss} from '@/lib/trends'
type Sample={ts:number;latency:number|null;loss?:number}
export function LossTrack({series,preferred,start,end,selected,onSelect}:{series:{id:number;name:string;points:Sample[]}[];preferred?:number;start:number;end:number;selected?:number;onSelect?:(id:number)=>void}){
 const [localSelected,setSelected]=useState<number|undefined>(undefined),[sample,setSample]=useState<number|null>(null)
 const route=series.find(s=>s.id===(selected??localSelected))??series.find(s=>s.id===preferred)??series[0]
 const points=route?.points.filter(p=>p.ts*1000>=start&&p.ts*1000<=end)??[]
 const active=points[Math.min(sample??points.length-1,points.length-1)]
 const x=(ts:number)=>(ts*1000-start)/Math.max(1,end-start)*1000
 const inspect=(event:React.PointerEvent<SVGSVGElement>)=>{if(!points.length)return;const box=event.currentTarget.getBoundingClientRect(),time=start+(event.clientX-box.left)/box.width*(end-start);let nearest=0;points.forEach((p,i)=>{if(Math.abs(p.ts*1000-time)<Math.abs(points[nearest].ts*1000-time))nearest=i});setSample(nearest)}
 return <section className="loss-track" aria-label={tr('丢包时间轨道')}>
  <div className="loss-track-heading"><label>{tr('丢包线路')}{series.length>1?<select aria-label={tr('丢包线路')} value={route?.id??''} onChange={e=>{setSelected(Number(e.target.value));onSelect?.(Number(e.target.value));setSample(null)}}>{series.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>:<span>{route?.name??'—'}</span>}</label><small>0–100%</small></div>
  <div className="loss-track-plot"><svg viewBox="0 0 1000 36" preserveAspectRatio="none" role="img" aria-label={tr('丢包时间轨道')} onPointerMove={inspect} onPointerDown={inspect}>
   <line x1="0" x2="1000" y1="35" y2="35" stroke="var(--border)"/>
   {points.map(p=>{const loss=bucketLoss(p.loss);return <g key={p.ts}>{loss!==null&&loss>0&&<rect x={Math.max(0,Math.min(996,x(p.ts)-2))} y={35-loss*.3} width="4" height={Math.max(1,loss*.3)} fill="var(--warn)"/>}{p.latency===null&&<path d={`M${Math.min(996,Math.max(4,x(p.ts)))-3},4 l6,6 m0,-6 l-6,6`} stroke="var(--destructive)" vectorEffect="non-scaling-stroke"/>}<title>{new Date(p.ts*1000).toLocaleString(locale())} · {p.latency===null?tr('超时'):`${p.latency} ms`} · {tr('丢包')} {loss===null?'—':`${loss}%`}</title></g>})}
   {active&&<line x1={x(active.ts)} x2={x(active.ts)} y1="0" y2="36" stroke="var(--muted-foreground)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke"/>}
  </svg></div>
  {points.length>0&&<input className="loss-track-scrubber" type="range" aria-label={tr('查看丢包采样')} min="0" max={Math.max(0,points.length-1)} value={Math.min(sample??points.length-1,points.length-1)} onChange={e=>setSample(Number(e.target.value))}/>}
  {points.some(p=>bucketLoss(p.loss)===null)&&<p className="loss-track-note">{tr("部分时段缺少逐点丢包数据")}</p>}
  <div className="loss-track-reading" aria-live="polite">{active?<><time>{new Date(active.ts*1000).toLocaleTimeString(locale())}</time><span>{active.latency===null?tr('超时'):`${Number(active.latency.toFixed(1))} ms`}</span><span>{tr('丢包')} {bucketLoss(active.loss)===null?'—':`${active.loss}%`}</span></>:tr('暂无探测记录')}</div>
 </section>
}
