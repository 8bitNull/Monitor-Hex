import {Flag} from './NodeIcons'
import {tr,locale} from '../lib/i18n.ts'
import {RotateCcw,Plus,Minus,Scan,Maximize,Minimize,Globe} from 'lucide-react'
import {useMemo,useState,useRef,useEffect,type ReactNode} from 'react'
import {geoNaturalEarth1,geoPath,geoCentroid} from 'd3-geo'
import {feature} from 'topojson-client'
import type {Topology,GeometryCollection} from 'topojson-specification'
import world from '@/data/world.json'
import type {Node} from '@/lib/api'
import {groupRegions,UNKNOWN_REGION} from '@/lib/groups'
const topology=world as unknown as Topology<{countries:GeometryCollection<{name:string}>}>
const countries=feature(topology,topology.objects.countries).features.filter(f=>f.properties?.name!=='Antarctica')
const projection=geoNaturalEarth1().fitExtent([[28,28],[972,452]],{type:'FeatureCollection',features:countries})
const path=geoPath(projection)
const names=new Intl.DisplayNames(['en'],{type:'region'})
const aliases:Record<string,string>={US:'United States of America',TR:'Turkey',KR:'South Korea',KP:'North Korea',RU:'Russia',TW:'Taiwan',CZ:'Czechia'}
const positions:Record<string,[number,number]>={US:[-98,39],RU:[95,60],HK:[114.17,22.32],MO:[113.55,22.2],SG:[103.82,1.35]}
export function countryName(code:string){if(code===UNKNOWN_REGION)return tr("未知地区");try{return new Intl.DisplayNames([locale()],{type:'region'}).of(code)||code}catch{return tr("未知地区")}}
export function WorldMap({nodes,region='all',onRegion,viewSwitch}:{nodes:Node[];region?:string;onRegion:(code:string)=>void;viewSwitch?:ReactNode}){
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const panel=useRef<HTMLElement>(null),svg=useRef<SVGSVGElement>(null)
 // Initial framing favours the northern node belt, matching the homepage composition.
 const [view,setView]=useState({x:-363,y:-34.6,k:1.69}),[full,setFull]=useState(false),[help,setHelp]=useState(false)
 const [unit,setUnit]=useState(1)
 useEffect(()=>{const el=svg.current!;const update=()=>{const r=el.getBoundingClientRect();if(r.width&&r.height){const u=Math.max(1000/r.width,480/r.height);setUnit(u)}};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()},[])
 const suppressClick=useRef(false)
 const drag=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null)
 const selected=regions.find(r=>r.code===region)
 const points=useMemo(()=>regions.flatMap(r=>{
  if(r.code===UNKNOWN_REGION)return []
  const f=countries.find(f=>f.properties?.name===(aliases[r.code]||names.of(r.code)))
  const ll=positions[r.code]||(f?geoCentroid(f):null)
  const p=ll?projection(ll):null
  return p?[{...r,point:p}]:[]
 }),[regions])
 const local=(x:number,y:number)=>{const el=svg.current!;const p=el.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(el.getScreenCTM()!.inverse())}
 const zoom=(factor:number,anchor={x:500,y:240})=>setView(v=>{const k=Math.max(.7,Math.min(6,v.k*factor)),r=k/v.k;return {k,x:anchor.x-(anchor.x-v.x)*r,y:anchor.y-(anchor.y-v.y)*r}})
 useEffect(()=>{const el=svg.current!;const wheel=(e:WheelEvent)=>{if(!e.ctrlKey&&!e.metaKey&&!document.fullscreenElement)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.002),local(e.clientX,e.clientY))};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[])
 useEffect(()=>{const update=()=>setFull(document.fullscreenElement===panel.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)},[])
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await panel.current?.requestFullscreen()}catch{setHelp(true)}}
 const tone=(r:typeof regions[number])=>r.online===r.total?'good':r.online===0?'offline':'mixed'
 const byName=new Map(regions.filter(r=>r.code!==UNKNOWN_REGION).map(r=>[aliases[r.code]||names.of(r.code),r]))
 const markers=points.filter(r=>['HK','MO','SG'].includes(r.code)||!countries.some(f=>f.properties?.name===(aliases[r.code]||names.of(r.code)))).map(r=>({...r,x:r.point[0]*view.k+view.x,y:r.point[1]*view.k+view.y}))
 return <section ref={panel} className={`world-panel explorer-map region-atlas ${full?'is-fullscreen':''}`}>
  <div className="section-heading"><h2>{tr("全球节点分布")}</h2><span>{regions.length} {tr("个地区 ·")} {nodes.length} {tr("个节点")}</span></div>
  <div className="explorer-stage">
   <svg ref={svg} viewBox="0 0 1000 480" role="group" aria-label={tr("世界节点分布地图")} tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const delta:Record<string,[number,number]>={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(delta[e.key]){e.preventDefault();const [x,y]=delta[e.key];setView(v=>({...v,x:v.x+x,y:v.y+y}))}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.3)}else if(e.key==='-'){e.preventDefault();zoom(1/1.3)}}}
    onClickCapture={e=>{if(suppressClick.current){e.stopPropagation();suppressClick.current=false}}} onPointerDown={e=>{if(e.button!==0)return;suppressClick.current=false;const p=local(e.clientX,e.clientY);drag.current={id:e.pointerId,x:p.x,y:p.y,moved:false}}}
    onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const p=local(e.clientX,e.clientY);const dx=p.x-d.x,dy=p.y-d.y;if(!d.moved&&Math.abs(dx)+Math.abs(dy)<4)return;d.moved=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);setView(v=>({...v,x:v.x+dx,y:v.y+dy}));d.x=p.x;d.y=p.y}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const moved=drag.current?.moved;drag.current=null;if(moved){e.preventDefault();return}}} onPointerCancel={()=>{drag.current=null}}>
    <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} className="map-land">{countries.map((f,i)=>{const r=byName.get(f.properties?.name);return <path key={i} d={path(f)||''} className={r?'populated-region':''} data-tone={r?tone(r):undefined} data-region={r?.code} role={r?'button':undefined} tabIndex={r?0:undefined} aria-label={r?`${countryName(r.code)} ${r.online}/${r.total}`:undefined} aria-pressed={r?region===r.code:undefined} onClick={r?()=>onRegion(r.code):undefined} onKeyDown={r?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onRegion(r.code)}}:undefined}>{r&&<title>{tr("{0}：{1} / {2} 在线",countryName(r.code),r.online,r.total)}</title>}</path>})}</g>
    {markers.map(r=><g key={r.code} transform={`translate(${r.x} ${r.y}) scale(${unit})`} className="map-cluster" data-tone={tone(r)} data-region={r.code} role="button" tabIndex={0} aria-pressed={region===r.code} aria-label={`${countryName(r.code)} ${r.online}/${r.total}`} onClick={()=>onRegion(r.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onRegion(r.code)}}}>
     <title>{tr("{0}：{1} / {2} 在线",countryName(r.code),r.online,r.total)}</title><circle className="small-region-hit" r={14}/><circle r={4}/>
    </g>)}
   </svg>
   <div className="map-tools"><button aria-label={tr("恢复默认位置")} title={tr("恢复默认位置")} onClick={()=>setView({x:-363,y:-34.6,k:1.69})}><RotateCcw size={18}/></button><button title={tr("放大地图")} aria-label={tr("放大地图")} onClick={()=>zoom(1.3)}><Plus size={18}/></button><button title={tr("缩小地图")} aria-label={tr("缩小地图")} onClick={()=>zoom(1/1.3)}><Minus size={18}/></button><button title={tr("适配全部")} aria-label={tr("适配全部")} onClick={()=>setView({x:0,y:0,k:1})}><Scan size={18}/></button><button title={tr(full?"退出全屏":"全屏地图")} aria-label={tr(full?"退出全屏":"全屏地图")} onClick={fullscreen}>{full?<Minimize size={18}/>:<Maximize size={18}/>}</button></div>
   {selected&&view.k>=1.8&&<div className="map-node-preview"><strong>{countryName(selected.code)}</strong><div>{selected.nodes.slice(0,6).map(n=><span key={n.id}><i className={n.online?'dot online':'dot'}/>{n.name}</span>)}</div>{selected.total>6&&<small>+{selected.total-6}</small>}</div>}
   <output className="map-scale">{Math.round(view.k*100)}%</output>
  </div>
  <div className="explorer-footer"><div className="region-list"><button onClick={()=>onRegion('all')} title={tr("所有地区")} aria-label={tr("所有地区")} aria-pressed={region==='all'}><Globe size={16}/></button>{regions.map(r=><button key={r.code} data-region={r.code} aria-pressed={region===r.code} onClick={()=>onRegion(r.code)}>{r.code!==UNKNOWN_REGION&&<Flag code={r.code}/>}<span>{countryName(r.code)}</span><b>{r.total}</b></button>)}</div></div>
  {viewSwitch&&<div className="map-view-switch">{viewSwitch}</div>}
 {help&&<p className="map-note">{tr("拖拽移动；Ctrl / ⌘ + 滚轮缩放，全屏内直接滚轮缩放。地图表示地区分组，不是机房精确位置。")}</p>}</section>
}
