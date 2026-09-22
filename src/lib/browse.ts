import {liveMetrics} from './freshness.ts'
import {resolveProbe} from './nodeProbes.ts'
import { regionKey } from './groups.ts'
import type { Node } from './api.ts'
import { getPing, summarizePing } from './ping.ts'
export const sortLabels = { default: '后台默认', name: '名称', status: '在线状态', cpu: 'CPU', memory: '内存', disk: '硬盘', upload: '上传速度', download: '下载速度', traffic: '流量用量 / 总额度', latency: '所选线路延迟', loss: '24h 丢包', expiry: '到期时间' }
export type SortKey = keyof typeof sortLabels
export type Browse = { query: string; status: string; region: string; sort: SortKey; direction: 'asc' | 'desc'; view: 'cards' | 'table'; probe: string; columns: string[]; mobileColumns: string[]; columnsVersion: number; tableLayout: 'grouped'|'separate'; mobileTableLayout: 'grouped'|'separate' }
export const defaultBrowse: Browse = { query: '', status: 'all', region: 'all', sort: 'default', direction: 'asc', view: 'cards', probe: 'auto', columnsVersion: 4, tableLayout:'grouped', mobileTableLayout:'grouped', mobileColumns: ['cpu','memory','latency'], columns: ['cpu', 'memory', 'disk', 'upload', 'download', 'traffic', 'latency', 'expiry'] }
export function normalizeBrowse(input:unknown): Browse {
  const v=input && typeof input==='object' && !Array.isArray(input)?input as Record<string,unknown>:{}
  const columns=(value:unknown,fallback:string[])=>Array.isArray(value)?defaultBrowse.columns.filter(c=>value.includes(c)):fallback
  const layout=(key:string,field:string)=>v[key]==='grouped'||v[key]==='separate'?v[key]:Array.isArray(v[field])?'separate':'grouped'
  return {...defaultBrowse,query:typeof v.query==='string'?v.query:'',status:['all','online','offline'].includes(String(v.status))?v.status as string:'all',region:typeof v.region==='string'?v.region:'all',sort:Object.hasOwn(sortLabels,String(v.sort))?v.sort as SortKey:'default',direction:v.direction==='desc'?'desc':'asc',view:v.view==='table'?'table':'cards',probe:typeof v.probe==='string'?v.probe:'auto',columns:Array.isArray(v.columns)&&![2,3,4].includes(Number(v.columnsVersion))?defaultBrowse.columns.filter(c=>c==='traffic'||(v.columns as unknown[]).includes(c)):columns(v.columns,defaultBrowse.columns),mobileColumns:columns(v.mobileColumns,defaultBrowse.mobileColumns),tableLayout:layout('tableLayout','columns'),mobileTableLayout:layout('mobileTableLayout','mobileColumns')}
}
export function readBrowse(): Browse {
  try {
    const v=JSON.parse(sessionStorage.getItem('monitor-next-browse-v1')||'{}')
    const normalized=normalizeBrowse(v)
    try { if(v && v.columnsVersion!==4 && (Array.isArray(v.columns)||Array.isArray(v.mobileColumns)) && !sessionStorage.getItem('monitor-next-table-v3-backup')) sessionStorage.setItem('monitor-next-table-v3-backup',JSON.stringify({columns:v.columns,mobileColumns:v.mobileColumns,columnsVersion:v.columnsVersion,sort:v.sort,direction:v.direction})) } catch { /* Backup storage must not discard readable preferences. */ }
    return normalized
  } catch { return {...defaultBrowse} }
}
export function tableColumns(columns:string[],grouped:boolean,mobile:boolean):string[] {
  const keys=['name',...(!grouped||mobile?['status']:[]),...columns]
  if(!grouped)return keys
  let speed=false
  return keys.flatMap(key=>key==='upload'||key==='download'?(speed?[]:(speed=true,['speed'])):[key]).sort((a,b)=>['name','status','cpu','memory','disk','speed','latency','traffic','expiry'].indexOf(a)-['name','status','cpu','memory','disk','speed','latency','traffic','expiry'].indexOf(b))
}
export function tablePreset(preset:'overview'|'network'|'billing',mobile:boolean):Partial<Browse> {
  const columns=preset==='network'?['upload','download','latency']:preset==='billing'?['traffic','expiry']:mobile?defaultBrowse.mobileColumns:defaultBrowse.columns
  return mobile?{mobileColumns:[...columns],mobileTableLayout:'grouped'}:{columns:[...columns],tableLayout:'grouped'}
}
const regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })
const englishRegions = new Intl.DisplayNames(['en'], { type: 'region' })
function englishRegion(code: string) { try { return englishRegions.of(code.toUpperCase()) || code } catch { return code } }
export function regionName(code: string) { try { return regionNames.of(code.toUpperCase()) || code } catch { return code } }
export function primaryPing(id: number, probe: string) {
  probe = resolveProbe(id, probe)
  const snapshot = getPing(id)
  if (!snapshot?.data) return undefined
  const stats = summarizePing(snapshot.data)
  return probe === 'auto' ? stats[0] : stats.find(p => String(p.id) === probe)
}
export function sortValue(n: Node, key: SortKey, probe: string): number | string | null {
  const m = liveMetrics(n)
  switch (key) {
    case 'name': return n.name
    case 'status': return n.online ? 1 : 0
    case 'cpu': return m?.cpu ?? null
    case 'memory': return m && m.mem_total > 0 ? Math.min(100, m.mem_used / m.mem_total * 100) : null
    case 'disk': return m && m.disk_total > 0 ? Math.min(100, m.disk_used / m.disk_total * 100) : null
    case 'upload': return m?.net_tx ?? null
    case 'download': return m?.net_rx ?? null
    case 'traffic': return n.traffic_mode === 'up' ? n.month_tx : n.traffic_mode === 'down' ? n.month_rx : n.traffic_mode === 'max' ? Math.max(n.month_rx,n.month_tx) : n.month_rx+n.month_tx
    case 'expiry': { const date = n.expires_at ? Date.parse(n.expires_at) : NaN; return Number.isFinite(date) ? date : null }
    case 'latency':
    case 'loss': {
      const snapshot = getPing(n.id), ping = primaryPing(n.id, probe)
      return n.online && !snapshot?.failed && snapshot?.updatedAt && Date.now() - snapshot.updatedAt < 120000 && ping && Date.now() / 1000 - ping.latest.ts < 7200 ? key==='loss'?ping.loss:ping.latest.latency : null
    }
    default: return n.sort
  }
}
export function browseNodes(nodes: Node[], options: Browse): Node[] {
  const q = options.query.trim().toLocaleLowerCase()
  const keys = new Map(nodes.map(n=>[n.id,sortValue(n,options.sort,options.probe)]))
  return nodes.filter(n => (options.status === 'all' || (options.status === 'online' ? n.online : !n.online)) && (options.region === 'all' || regionKey(n.country) === options.region) && [n.name, n.country, regionName(n.country), englishRegion(n.country), n.os, n.arch].join(' ').toLocaleLowerCase().includes(q)).sort((a, b) => {
    const fallback = a.sort - b.sort || a.id - b.id
    if (options.sort === 'default') return fallback
    const av = keys.get(a.id)!, bv = keys.get(b.id)!
    if (av === null || bv === null) return av === bv ? fallback : av === null ? 1 : -1
    const diff = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv, 'zh-CN', { numeric: true }) : Number(av) - Number(bv)
    return (options.direction === 'asc' ? diff : -diff) || fallback
  })
}
