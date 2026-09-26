import type {Node} from '@/lib/api'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {bytes,percent,mbpsAmount,money,CYCLES,daysUntil,FOREVER} from '@/lib/format'
import {trafficUsage,trafficPeriodLabel} from '@/lib/traffic'
import {tr,locale} from '@/lib/i18n'
import {ChevronRight} from 'lucide-react'
export function MobileDetailOverview({node,totals,onNetwork}:{node:Node;totals:boolean;onNetwork:()=>void}){
 const m=liveMetrics(node),traffic=trafficUsage(node),days=daysUntil(node.expires_at)
 return <div className="ma-detail-overview">
  {m?<><section className="ma-panel"><h2>{tr('资源使用')}</h2><div className="ma-big-grid">{[
   {label:'CPU',value:m.cpu.toFixed(1),percent:m.cpu,foot:tr('{0} 核',node.cpu_cores)},
   {label:tr('内存'),value:percent(m.mem_used,m.mem_total).toFixed(1),percent:percent(m.mem_used,m.mem_total),foot:`${bytes(m.mem_used)} / ${bytes(m.mem_total)}`},
   {label:tr('硬盘'),value:percent(m.disk_used,m.disk_total).toFixed(1),percent:percent(m.disk_used,m.disk_total),foot:`${bytes(m.disk_used)} / ${bytes(m.disk_total)}`},
   {label:tr('负载'),value:m.load[0].toFixed(2),percent:null,foot:tr('1 分钟 · {0} 核',node.cpu_cores)}
  ].map(metric=><div className="ma-big-metric" key={metric.label}><small>{metric.label}</small><strong>{metric.value}<small>{metric.percent!==null?' %':''}</small></strong>{metric.percent!==null&&<div className="ma-track" data-hot={metric.percent>=85}><i style={{width:`${Math.min(100,Math.max(0,metric.percent))}%`}}/></div>}{totals&&<p>{metric.foot}</p>}</div>)}</div></section><section className="ma-panel"><h2>{tr('实时网速')}</h2><div className="ma-big-grid"><div className="ma-big-metric"><small>↑ {tr('上行')}</small><strong>{mbpsAmount(m.net_tx)} <small>Mbps</small></strong></div><div className="ma-big-metric"><small>↓ {tr('下行')}</small><strong>{mbpsAmount(m.net_rx)} <small>Mbps</small></strong></div></div><button className="ma-row" onClick={onNetwork}><span>{tr('网络质量')}</span><ChevronRight size={16}/></button></section></>:<section className="ma-panel"><h2>{nodeState(node)==='offline'?tr('离线'):nodeState(node)==='stale'?tr('数据已过期'):tr('等待首次上报')}</h2><p className="ma-muted">{tr('最近上报时间')}<br/>{node.last_seen>0?new Date(node.last_seen*1000).toLocaleString(locale()):tr('上次上报时间未知')}</p><button className="ma-row" onClick={onNetwork}><span>{tr('查看网络历史')}</span><ChevronRight size={16}/></button></section>}
  <section className="ma-panel"><h2>{tr('流量与账单')}</h2><div className="ma-row"><span>{tr(trafficPeriodLabel(node))}</span><small>{bytes(traffic.value)} / {node.traffic_limit>0?bytes(node.traffic_limit):FOREVER}</small></div>{node.traffic_limit>0&&<div className="ma-track" data-hot={traffic.value>=node.traffic_limit}><i style={{width:`${Math.min(100,traffic.value/node.traffic_limit*100)}%`}}/></div>}<div className="ma-row"><span>{tr('费用')}</span><small>{node.price>0?`${money(node.price,node.currency)} / ${tr(CYCLES[node.billing_cycle]??node.billing_cycle)}`:'—'}</small></div><div className="ma-row"><span>{tr('到期时间')}</span><small>{node.expires_at??tr('未设到期')}{days!==null&&days<=7&&<span className="ma-warning">{days<0?tr('已到期'):tr('剩余 {0} 天',days)}</span>}</small></div></section>
 </div>
}
