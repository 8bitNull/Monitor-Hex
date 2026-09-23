import type {Node} from '@/lib/api'
import {liveMetrics} from '@/lib/freshness'
import {bytes,uptime,money,CYCLES} from '@/lib/format'
import {countryName} from '@/lib/regionNames'
import {tr,locale} from '@/lib/i18n'
const count=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n.toLocaleString(locale()):'—'
export function ExtraTableCell({node,column}:{node:Node;column:string}){
 const m=liveMetrics(node)
 switch(column){
  case 'connections':return <div className="table-extra"><span>TCP {count(m?.tcp)}</span><span>UDP {count(m?.udp)}</span></div>
  case 'uptime':return m&&Number.isFinite(m.uptime)&&m.uptime>=0?(m.uptime===0?tr('{0} 分',0):uptime(m.uptime)):'—'
  case 'system':return <div className="table-extra"><span>{node.os||'—'}</span><small>{[node.arch,node.virt].filter(Boolean).join(' · ')||'—'}</small></div>
  case 'country':return node.country?countryName(node.country):'—'
  case 'billing':return Number.isFinite(node.price)&&node.price>=0?<div className="table-extra"><span>{money(node.price,node.currency)} {node.currency}</span><small>{tr(CYCLES[node.billing_cycle]??node.billing_cycle)||'—'}</small></div>:'—'
  case 'todayTraffic':return <div className="table-extra"><span>{tr('上传')} {Number.isFinite(node.day_tx)&&node.day_tx>=0?bytes(node.day_tx):'—'}</span><span>{tr('下载')} {Number.isFinite(node.day_rx)&&node.day_rx>=0?bytes(node.day_rx):'—'}</span></div>
  case 'load':return <div className="table-extra"><span>{[0,1,2].map(i=>{const n=m?.load?.[i];return typeof n==='number'&&Number.isFinite(n)&&n>=0?n.toFixed(2):'—'}).join(' / ')}</span><small>{tr('1 / 5 / 15 分钟')}</small></div>
  case 'swap':return !m||!Number.isFinite(m.swap_total)||!Number.isFinite(m.swap_used)||m.swap_used<0||m.swap_total<0?'—':m.swap_total===0?tr('未启用'):<div className="table-extra"><span>{Math.min(100,m.swap_used/m.swap_total*100).toFixed(1)}%</span><small>{bytes(m.swap_used)} / {bytes(m.swap_total)}</small></div>
  case 'processes':return count(m?.procs)
  case 'lastSeen':{const date=new Date(node.last_seen*1000);return node.last_seen>0&&Number.isFinite(date.getTime())?<time dateTime={date.toISOString()}>{date.toLocaleString(locale(),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}</time>:'—'}
  default:return null
 }
}
export const extraTableColumns=new Set(['connections','uptime','system','country','billing','todayTraffic','load','swap','processes','lastSeen'])
