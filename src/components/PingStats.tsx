import {LatencyBars} from './LatencyBars'
import {latencyBand} from '@/lib/trends'
import {LossMetric} from './LossMetric'
import {Select} from '@/components/ui/select'
import {useNodeProbe} from '../lib/nodeProbes'
import { tr } from '../lib/i18n.ts'
import { ChartNoAxesCombined, Unlink, ChevronDown } from 'lucide-react'
import { usePing } from '@/lib/usePing'
import { summarizePing, probeCatalog } from '@/lib/ping'
export function PingStats({ online = true, id, probe = "auto", onOpenRoutes, count = 1, scale = 200, warn = 80, high = 160 }: { scale?:200|500; warn?:number; high?:number; count?:number; online?:boolean; id:number; probe?:string; onOpenRoutes:(route?:number)=>void }) {
 const choice=useNodeProbe(id,probe)
 const {ref,snapshot}=usePing(id)
 const stats=snapshot?.data?summarizePing(snapshot.data):null
 const catalog=snapshot?.data?probeCatalog(snapshot.data):[]
 const primary=choice.probe === "auto" ? stats?.[0] : stats?.find(s=>String(s.id)===choice.probe)
 const shown=primary?[primary,...(stats || []).filter(s=>s.id!==primary.id)].slice(0,Math.max(1,Math.min(3,count))):[]
 const fallback=probe === "auto" ? stats?.[0] : stats?.find(s=>String(s.id)===probe)
 return <section ref={ref} className="ping-stats route-matrix" data-route-count={shown.length} data-requested-count={count} aria-label={tr("24 小时延迟统计")}>
  <div className="matrix-heading"><div className="route-picker"><span className="route-picker-label" aria-hidden="true"><span>{primary?.name || tr("无该线路记录")}</span><ChevronDown size={14}/></span><Select title={choice.selected==="auto"?tr("全局：{0}",fallback?.name || tr("无该线路记录")):primary?.name} className="route-select" aria-label={tr("节点探测线路")} value={choice.selected} onChange={e=>choice.select(e.target.value)}><option value="auto">{tr("全局：{0}",fallback?.name || tr("无该线路记录"))}</option>{catalog.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{choice.selected!=="auto"&&!catalog.some(s=>String(s.id)===choice.selected)&&<option value={choice.selected}>{tr("无该线路记录")} · {choice.selected}</option>}</Select></div>{choice.selected!=="auto" && <button onClick={()=>choice.select("auto")} aria-label={tr("恢复跟随全局线路")} title={tr("恢复跟随全局线路")}><Unlink size={14}/></button>}{catalog.length>1 && <button onClick={()=>onOpenRoutes()} aria-label={tr("查看全部 {0} 条线路",catalog.length)} title={tr("查看全部 {0} 条线路",catalog.length)}><ChartNoAxesCombined size={14}/><span>{catalog.length}</span></button>}</div>
  {!online && stats && !snapshot?.failed && <p className="ping-stale">{tr("历史数据")}</p>}
  {snapshot?.failed && stats && <p className="ping-stale">{tr("更新失败 · 上次数据")}</p>}
  {!stats?<p className="ping-empty">{snapshot?.failed?tr("暂不可用 · 自动重试"):tr("正在读取探测记录…")}</p>:!stats.length?<p className="ping-empty">{tr("暂无探测记录")}</p>:!primary?<p className="ping-empty">{tr("无该线路记录")}</p>:<>
   {shown.map(s=><div className="ping-probe" key={s.id}>
    <div className="matrix-values">
     <div className="latency-stat"><div className="latency-reading"><span title={s.name}>{shown.length===1?tr("延迟"):s.name}</span><button className="latency-link" onClick={()=>onOpenRoutes(s.id)} aria-label={tr("查看线路：{0}",s.name)} data-tone={latencyBand(s.latest.latency,warn,high)} title={tr("延迟")}>{!online?"—":s.latest.latency===null?tr("超时"):<>{Math.round(s.latest.latency)}<small> ms</small></>}</button></div>
     </div>
     <LossMetric value={online?s.loss:null}/>
    </div>
    {s.id===primary.id&&<><LatencyBars key={`${id}:${s.id}`} rows={s.rows} scale={scale} warn={warn} high={high}/><p className="latency-trend-caption">{tr('最近 {0} 分钟 · 采样 · 0–{1} ms',Math.max(1,Math.round((s.latest.ts-(s.rows[0]?.ts??s.latest.ts))/60)),scale)}</p></>}
    {Date.now()/1000-s.latest.ts>7200&&<p className="ping-stale">{tr("较旧记录")}</p>}
   </div>)}
  </>}
 </section>
}
