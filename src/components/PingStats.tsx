import {LossMetric} from './LossMetric'
import {Select} from '@/components/ui/select'
import {useNodeProbe} from '../lib/nodeProbes'
import { tr, locale } from '../lib/i18n.ts'
import { ChartNoAxesCombined, Unlink, ChevronDown } from 'lucide-react'
import { usePing } from '@/lib/usePing'
import { summarizePing, probeCatalog } from '@/lib/ping'
function tone(n: number | null) { return n === null ? 'timeout' : n < 80 ? 'good' : n < 160 ? 'fair' : n < 220 ? 'slow' : 'bad' }
export function PingStats({ online = true, id, probe = "auto", onOpenRoutes, count = 1 }: { count?:number; online?:boolean; id:number; probe?:string; onOpenRoutes:(route?:number)=>void }) {
 const choice=useNodeProbe(id,probe)
 const {ref,snapshot}=usePing(id)
 const stats=snapshot?.data?summarizePing(snapshot.data):null
 const catalog=snapshot?.data?probeCatalog(snapshot.data):[]
 const primary=choice.probe === "auto" ? stats?.[0] : stats?.find(s=>String(s.id)===choice.probe)
 const shown=primary?[primary,...(stats || []).filter(s=>s.id!==primary.id)].slice(0,Math.max(1,Math.min(3,count))):[]
 const fallback=probe === "auto" ? stats?.[0] : stats?.find(s=>String(s.id)===probe)
 return <section ref={ref} className="ping-stats route-matrix" data-route-count={shown.length} aria-label={tr("24 小时延迟统计")}>
  <div className="matrix-heading"><div className="route-picker"><span className="route-picker-label" aria-hidden="true"><span>{primary?.name || tr("无该线路记录")}</span><ChevronDown size={14}/></span><Select title={choice.selected==="auto"?tr("全局：{0}",fallback?.name || tr("无该线路记录")):primary?.name} className="route-select" aria-label={tr("节点探测线路")} value={choice.selected} onChange={e=>choice.select(e.target.value)}><option value="auto">{tr("全局：{0}",fallback?.name || tr("无该线路记录"))}</option>{catalog.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{choice.selected!=="auto"&&!catalog.some(s=>String(s.id)===choice.selected)&&<option value={choice.selected}>{tr("无该线路记录")} · {choice.selected}</option>}</Select></div>{choice.selected!=="auto" && <button onClick={()=>choice.select("auto")} aria-label={tr("恢复跟随全局线路")} title={tr("恢复跟随全局线路")}><Unlink size={14}/></button>}{catalog.length>1 && <button onClick={()=>onOpenRoutes()} aria-label={tr("查看全部 {0} 条线路",catalog.length)} title={tr("查看全部 {0} 条线路",catalog.length)}><ChartNoAxesCombined size={14}/><span>{catalog.length}</span></button>}</div>
  {!online && stats && !snapshot?.failed && <p className="ping-stale">{tr("历史数据")}</p>}
  {snapshot?.failed && stats && <p className="ping-stale">{tr("更新失败 · 上次数据")}</p>}
  {!stats?<p className="ping-empty">{snapshot?.failed?tr("暂不可用 · 自动重试"):tr("正在读取探测记录…")}</p>:!stats.length?<p className="ping-empty">{tr("暂无探测记录")}</p>:!primary?<p className="ping-empty">{tr("无该线路记录")}</p>:<>
   {shown.map(s=><div className="ping-probe" key={s.id}>
    <div className="matrix-values">
     <div className="latency-stat"><div className="latency-reading"><span title={s.name}>{shown.length===1?tr("延迟"):s.name}</span><button className="latency-link" onClick={()=>onOpenRoutes(s.id)} aria-label={tr("查看线路：{0}",s.name)} data-tone={tone(s.latest.latency)} title={tr("延迟")}>{s.latest.latency===null?tr("超时"):<>{Math.round(s.latest.latency)}<small> ms</small></>}</button></div>
     <div className="latency-columns" role="img" aria-label={tr("近期延迟采样")} title={tr("近期延迟采样")} >{s.rows.map((row,i)=><i key={i} data-tone={tone(row.latency)} title={`${new Date(row.ts*1000).toLocaleString(locale())} · ${row.latency===null?tr("超时"):`${Math.round(row.latency)} ms`}`}/>)}</div></div>
     <LossMetric value={s.loss}/>
    </div>
    {Date.now()/1000-s.latest.ts>7200&&<p className="ping-stale">{tr("较旧记录")}</p>}
   </div>)}
  </>}
 </section>
}
