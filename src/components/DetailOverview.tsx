import type {Node} from '@/lib/api'
import {liveMetrics} from '@/lib/freshness'
import {tr,locale} from '@/lib/i18n'
import {bytes,percent,pair,osName,uptime} from '@/lib/format'
import {Clock,Monitor,Network,MapPin} from 'lucide-react'
import {useState} from 'react'
import {NodePicker} from './NodePicker'
import {Status} from './NodeIdentity'
import {RemarkTags} from './RemarkTags'
import {ResourceMetric} from './ResourceMetric'
import {SpeedIndicators} from './SpeedIndicators'
export function DetailIdentity({node,nodes,onSwitch}:{node:Node;nodes:Node[];onSwitch:(id:number)=>void}){
 const m=liveMetrics(node)
 const remarkTags=(node.remark??'').split(/[;；]/).map(text=>text.trim()).filter(Boolean)
 const [expanded,setExpanded]=useState(false)
 const crowded=remarkTags.length>3 || remarkTags.some(text=>Array.from(text).length>48)
 let country=node.country;try{country=new Intl.DisplayNames([locale()],{type:'region'}).of(node.country.toUpperCase()) || node.country}catch{/* Preserve unknown country text. */}
 return (      <div className="detail-identity">
        <div className="detail-title-row"><div className="detail-title"><NodePicker node={node} nodes={nodes} onSwitch={onSwitch}/></div><div className="node-status-group"><div className="node-ip-tags" aria-label={tr("IP 协议")}>{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div><Status node={node}/></div></div>
        <div className="detail-subtitle">{country&&<span><MapPin size={14}/>{country}</span>}<span title={tr("系统")}><Monitor size={14}/>{osName(node.os)}</span><span title={tr("在线时长")} aria-label={tr("在线时长")}><Clock size={14}/>{m ? uptime(m.uptime) : '—'}</span></div>
        {remarkTags.length>0 && <div className="detail-meta-tags"><RemarkTags texts={expanded?remarkTags:remarkTags.slice(0,3)} compact={crowded&&!expanded}/>{crowded&&<button className="detail-remarks-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?tr("收起备注"):tr("展开备注")}</button>}</div>}
      </div>
)
}
export function DetailLiveOverview({node}:{node:Node}){
 const m=liveMetrics(node)
 return (      <section className="detail-live" aria-label={tr("实时指标")}>
        <div className="detail-resources">
          <ResourceMetric label="CPU" value={m?.cpu ?? null} foot={tr("{0} 核",node.cpu_cores)}/>
          <ResourceMetric label={tr("内存")} value={m ? percent(m.mem_used,m.mem_total) : null} foot={m ? pair(m.mem_used,m.mem_total) : bytes(node.mem_total)}/>
          <ResourceMetric label={tr("硬盘")} value={m ? percent(m.disk_used,m.disk_total) : null} foot={m ? pair(m.disk_used,m.disk_total) : bytes(node.disk_total)}/>
          <ResourceMetric label={tr("负载")} value={m && node.cpu_cores > 0 ? m.load[0] / node.cpu_cores * 100 : null} displayValue={m ? m.load[0].toFixed(2) : "—"} foot={tr("1 分钟 · {0} 核",node.cpu_cores)}/>
        </div>
        <SpeedIndicators key={node.id} node={node} detail/>
        <div className="detail-connections">{([['TCP',m?.tcp],['UDP',m?.udp]] as const).map(([label,value])=><div key={label}><span><Network size={13}/>{label}</span><strong>{value===undefined?'—':value.toLocaleString()}</strong></div>)}</div>
      </section>
)
}
