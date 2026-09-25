import {Component,useEffect,useState,useMemo,type ComponentType,type ReactNode} from 'react'
import {ChevronDown,Globe,X} from 'lucide-react'
import type {MapNode} from './WorldMap'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {tr} from '@/lib/i18n'
import {Flag} from './NodeIcons'
export type MapProps={nodes:MapNode[];region:string;onRegion:(code:string)=>void;viewSwitch?:ReactNode;expanded?:boolean;onExpandedChange?:()=>void;onClose?:()=>void}
let request:Promise<typeof import('./WorldMap')>|undefined
export function loadMap(){return request??=import('./WorldMap').catch(error=>{request=undefined;throw error})}
class MapBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
export function MapPanel({nodeSnapshot,region,onRegion,viewSwitch,pendingNodes=false,matchedCount,onClearFilters}:{nodeSnapshot:string;viewSwitch:ReactNode;pendingNodes?:boolean;matchedCount?:number;onClearFilters?:()=>void}&Omit<MapProps,'nodes'>){
 const nodes=useMemo(()=>JSON.parse(nodeSnapshot) as MapNode[],[nodeSnapshot])
 const [Map,setMap]=useState<ComponentType<MapProps>|null>(null),[state,setState]=useState<'loading'|'slow'|'failed'|'ready'>('loading'),[attempt,setAttempt]=useState(0)
 const [expanded,setExpanded]=useState(()=>{try{return localStorage.getItem('monitor-next-map-height-v1')==='expanded'}catch{return false}})
 const [open,setOpen]=useState(()=>{try{const saved=localStorage.getItem('monitor-next-map-open-v1');return saved===null?localStorage.getItem('monitor-next-map-height-v1')==='expanded':saved==='open'}catch{return false}})
 useEffect(()=>{try{localStorage.setItem('monitor-next-map-height-v1',expanded?'expanded':'compact')}catch{/* Storage is optional. */}},[expanded])
 useEffect(()=>{try{localStorage.setItem('monitor-next-map-open-v1',open?'open':'closed')}catch{/* Storage is optional. */}},[open])
 useEffect(()=>{
  if(!open)return
  let active=true
  const slow=setTimeout(()=>{if(active)setState('slow')},3000)
  const timeout=setTimeout(()=>{if(active)setState('failed')},15000)
  loadMap().then(module=>{if(active){setMap(()=>module.WorldMap);setState('ready')}},()=>{if(active)setState('failed')}).finally(()=>{clearTimeout(slow);clearTimeout(timeout)})
  return()=>{active=false;clearTimeout(slow);clearTimeout(timeout)}
 },[attempt,open])
 const fallback=(failed:boolean)=><section className="map-placeholder explorer-map" aria-label={tr('全球节点分布')}>
  <button type="button" className="map-fallback-close" aria-label={tr('收起地图')} title={tr('收起地图')} onClick={()=>setOpen(false)}><X size={18} aria-hidden="true"/></button>
  <div className="map-loading-message" role={failed?'alert':'status'}><Globe size={40} aria-hidden="true"/><p>{failed?tr('地图暂时无法加载'):state==='slow'?tr('地图加载较慢，节点列表仍可使用'):tr('地图加载中…')}</p>{failed&&<div><button onClick={()=>{setMap(null);setState('loading');setAttempt(n=>n+1)}}>{tr('重试地图')}</button><button onClick={()=>location.reload()}>{tr('刷新页面')}</button></div>}</div>
  <div className="explorer-footer"><div className="region-list"><button onClick={()=>onRegion('all')} aria-label={tr('所有地区')} aria-pressed={region==='all'}><Globe size={16}/></button>{groupRegions(nodes).map(r=><button key={r.code} data-region={r.code} aria-pressed={region===r.code} onClick={()=>onRegion(r.code)}>{countryName(r.code)} <small>{r.total}</small></button>)}</div></div>
 </section>
 return <div className={`map-frame${expanded?' is-expanded':''}${open?' map-open':''}`}>
  <div className="home-region-bar" role="group" aria-label={tr('地区快速筛选')}>
   <span className="home-region-label">{tr('地区')}</span>
   <div className="home-region-list"><button onClick={()=>onRegion('all')} aria-pressed={region==='all'}>{tr('所有地区')} <small>{nodes.length}</small></button>{groupRegions(nodes).map(r=><button key={r.code} onClick={()=>onRegion(r.code)} aria-pressed={region===r.code}>{r.code.length===2&&<Flag code={r.code}/>}<span>{countryName(r.code)}</span><small>{r.total}</small></button>)}</div>
   {!open&&<button type="button" className="home-map-toggle" aria-expanded={false} onClick={()=>setOpen(true)}>{tr('展开地图')}<ChevronDown size={16} aria-hidden="true"/></button>}
   {region!=='all'&&matchedCount!==undefined&&onClearFilters&&<div className="home-region-result"><span>{tr('匹配 {0} 个节点',matchedCount)}</span><button type="button" onClick={onClearFilters}>{tr('清除筛选')}</button></div>}
  </div>
  {open&&<MapBoundary key={attempt} fallback={fallback(true)}>{Map&&state==='ready'?<Map nodes={nodes} region={region} onRegion={onRegion} viewSwitch={viewSwitch} expanded={expanded} onExpandedChange={()=>setExpanded(value=>!value)} onClose={()=>setOpen(false)}/>:fallback(state==='failed')}</MapBoundary>}
  {open&&pendingNodes&&<span className="map-data-notice" role="status">{tr('等待节点数据')}</span>}
 </div>
}
