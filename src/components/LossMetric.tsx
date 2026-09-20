import {tr} from '@/lib/i18n'
export function LossMetric({value}:{value:number|null}) {
 const n=value===null?0:Math.max(0,Math.min(100,value))
 const tone=value===null?'unknown':n>=5?'bad':n>0?'fair':'good'
 return <div className="loss-stat" data-tone={tone} title={tr("24h 丢包")}>
  <div className="loss-reading"><small>{tr("24h 丢包")}</small><b>{value===null?'—':`${n.toFixed(1)}%`}</b></div>
  <div className="loss-visual" role={value===null?'img':'meter'} aria-label={value===null?tr("丢包暂无统计"):tr("24h 丢包")} aria-valuemin={value===null?undefined:0} aria-valuemax={value===null?undefined:100} aria-valuenow={value===null?undefined:n}>
   <svg className="loss-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" className="loss-ring-track"/><circle cx="12" cy="12" r="9" pathLength="100" strokeDasharray={`${n} 100`}/></svg>
   <span className="loss-bar" aria-hidden="true"><i style={{width:`${n}%`}}/></span>
   <span className="loss-columns" aria-hidden="true">{Array.from({length:20},(_,i)=><span key={i}><i style={{width:`${Math.max(0,Math.min(100,(n-i*5)*20))}%`}}/></span>)}</span>
  </div>
 </div>
}
