import {memo} from 'react'
import {latencyBars} from '@/lib/trends'
import {tr,locale} from '@/lib/i18n'
export const LatencyBars=memo(function LatencyBars({rows,scale,warn,high}:{rows:{ts:number;latency:number|null}[];scale:200|500;warn:number;high:number}){
 const bars=latencyBars(rows,scale,warn,high)
 // Center the visible marks without changing their heights or shared zero baseline.
 const plotTop=Math.min(32,...bars.map(p=>p.capped?1:p.latency===null?26:32-p.height))
 const viewportTop=(plotTop+32)/2-18
 const description=tr('延迟采样 · 统一刻度 0–{0} ms；黄色 ≥{1}，红色 ≥{2}',scale,warn,high)
 return <div className="latency-bars" title={description}><svg viewBox={`0 ${viewportTop} 300 36`} preserveAspectRatio="none" role="img" aria-label={description}>
  <path d="M0 32H300" className="latency-baseline"/>
  {bars.map((p,index)=><g key={p.ts} data-tone={p.tone} data-capped={p.capped||undefined} data-latest={index===bars.length-1||undefined}><title>{new Date(p.ts*1000).toLocaleTimeString(locale())} · {p.latency===null?tr('超时'):`${p.latency} ms`}</title>{p.latency===null?<path className="latency-timeout" d={`M${p.x-2} 26l4 6m0-6l-4 6`} vectorEffect="non-scaling-stroke"/>:<rect x={p.x-p.width/2} y={32-p.height} width={p.width} height={p.height} rx=".7"/>}{p.capped&&<path className="latency-cap" d={`M${p.x-2} 4l2-3 2 3`} vectorEffect="non-scaling-stroke"/>}</g>)}
 </svg></div>
})
