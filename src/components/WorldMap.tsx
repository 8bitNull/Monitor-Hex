import {Flag} from './NodeIcons'
import {tr} from '../lib/i18n.ts'
import {RotateCcw,Plus,Minus,Scan,Maximize,Minimize,Globe,HelpCircle} from 'lucide-react'
import {useMemo,useState,useRef,useEffect,memo,useCallback,type ReactNode} from 'react'
import geometry from '@/data/map-paths.json'
import {groupRegions,UNKNOWN_REGION} from '@/lib/groups'
export type MapNode={id:number;name:string;country:string;online:boolean}
const countries=geometry.shapes
const coordinates=geometry.points as Record<string,number[]>
const countryCodes=new Set(countries.map(c=>c.code))
import {countryName} from '@/lib/regionNames'
export {countryName} from '@/lib/regionNames'
export const WorldMap=memo(function WorldMap({nodes,region='all',onRegion,viewSwitch}:{nodes:MapNode[];region?:string;onRegion:(code:string)=>void;viewSwitch?:ReactNode}){
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const panel=useRef<HTMLElement>(null),svg=useRef<SVGSVGElement>(null)
 // Initial framing favours the northern node belt, matching the homepage composition.
 const [view,commitView]=useState({x:-363,y:-34.6,k:1.69}),[full,setFull]=useState(false),[help,setHelp]=useState(false)
 const pendingView=useRef(view),frame=useRef(0)
 const setView=useCallback((next:typeof view|((v:typeof view)=>typeof view))=>{pendingView.current=typeof next==='function'?next(pendingView.current):next;if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;commitView(pendingView.current)})},[])
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[])
 const [unit,setUnit]=useState(1)
 useEffect(()=>{const el=svg.current!;const update=()=>{const r=el.getBoundingClientRect();if(r.width&&r.height){const u=Math.max(1000/r.width,480/r.height);setUnit(u)}};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()},[])
 const suppressClick=useRef(false)
 const drag=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null)
 const selected=regions.find(r=>r.code===region)
 const points=useMemo(()=>regions.flatMap(r=>coordinates[r.code]?[{...r,point:coordinates[r.code]}]:[]),[regions])
 const local=(x:number,y:number)=>{const el=svg.current!;const p=el.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(el.getScreenCTM()!.inverse())}
 const zoom=useCallback((factor:number,anchor={x:500,y:240})=>setView(v=>{const k=Math.max(.7,Math.min(6,v.k*factor)),r=k/v.k;return {k,x:anchor.x-(anchor.x-v.x)*r,y:anchor.y-(anchor.y-v.y)*r}}),[setView])
 useEffect(()=>{const el=svg.current!;const wheel=(e:WheelEvent)=>{if(!e.ctrlKey&&!e.metaKey&&!document.fullscreenElement)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.002),local(e.clientX,e.clientY))};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[zoom])
 useEffect(()=>{const update=()=>setFull(document.fullscreenElement===panel.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)},[])
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await panel.current?.requestFullscreen()}catch{setHelp(true)}}
 const tone=(r:typeof regions[number])=>r.online===r.total?'good':r.online===0?'offline':'mixed'
 const byCode=useMemo(()=>new Map(regions.map(r=>[r.code,r])),[regions])
 const markers=points.filter(r=>['HK','MO','SG'].includes(r.code)||!countryCodes.has(r.code)).map(r=>({...r,x:r.point[0]*view.k+view.x,y:r.point[1]*view.k+view.y}))
 const land=useMemo(()=>countries.map((f,i)=>{const r=byCode.get(f.code);return <path key={i} d={f.d} className={r?'populated-region':''} data-tone={r?tone(r):undefined} data-region={r?.code} role={r?'button':undefined} tabIndex={r?0:undefined} aria-label={r?`${countryName(r.code)} ${r.online}/${r.total}`:undefined} aria-pressed={r?region===r.code:undefined} onClick={r?()=>onRegion(r.code):undefined} onKeyDown={r?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onRegion(r.code)}}:undefined}>{r&&<title>{tr("{0}：{1} / {2} 在线",countryName(r.code),r.online,r.total)}</title>}</path>}),[byCode,region,onRegion])
 return <section ref={panel} className={`world-panel explorer-map region-atlas ${full?'is-fullscreen':''}`}>
  <div className="section-heading"><h2>{tr("全球节点分布")}</h2><span>{regions.length} {tr("个地区 ·")} {nodes.length} {tr("个节点")}</span></div>
  <div className="explorer-stage">
   <svg ref={svg} viewBox="0 0 1000 480" role="group" aria-label={tr("世界节点分布地图")} tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const delta:Record<string,[number,number]>={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(delta[e.key]){e.preventDefault();const [x,y]=delta[e.key];setView(v=>({...v,x:v.x+x,y:v.y+y}))}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.3)}else if(e.key==='-'){e.preventDefault();zoom(1/1.3)}}}
    onClickCapture={e=>{if(suppressClick.current){e.stopPropagation();suppressClick.current=false}}} onPointerDown={e=>{if(e.button!==0)return;suppressClick.current=false;const p=local(e.clientX,e.clientY);drag.current={id:e.pointerId,x:p.x,y:p.y,moved:false}}}
    onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const p=local(e.clientX,e.clientY);const dx=p.x-d.x,dy=p.y-d.y;if(!d.moved&&Math.abs(dx)+Math.abs(dy)<4)return;d.moved=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);setView(v=>({...v,x:v.x+dx,y:v.y+dy}));d.x=p.x;d.y=p.y}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const moved=drag.current?.moved;drag.current=null;if(moved){e.preventDefault();return}}} onPointerCancel={()=>{drag.current=null}}>
    <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} className="map-land">{land}</g>
    {markers.map(r=><g key={r.code} transform={`translate(${r.x} ${r.y}) scale(${unit})`} className="map-cluster" data-tone={tone(r)} data-region={r.code} role="button" tabIndex={0} aria-pressed={region===r.code} aria-label={`${countryName(r.code)} ${r.online}/${r.total}`} onClick={()=>onRegion(r.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onRegion(r.code)}}}>
     <title>{tr("{0}：{1} / {2} 在线",countryName(r.code),r.online,r.total)}</title><circle className="small-region-hit" r={14}/><circle r={4}/>
    </g>)}
   </svg>
   <div className="map-tools"><button aria-label={tr("操作说明")} aria-expanded={help} onClick={()=>setHelp(v=>!v)}><HelpCircle size={18}/></button><button aria-label={tr("恢复默认位置")} title={tr("恢复默认位置")} onClick={()=>setView({x:-363,y:-34.6,k:1.69})}><RotateCcw size={18}/></button><button title={tr("放大地图")} aria-label={tr("放大地图")} onClick={()=>zoom(1.3)}><Plus size={18}/></button><button title={tr("缩小地图")} aria-label={tr("缩小地图")} onClick={()=>zoom(1/1.3)}><Minus size={18}/></button><button title={tr("适配全部")} aria-label={tr("适配全部")} onClick={()=>setView({x:0,y:0,k:1})}><Scan size={18}/></button><button title={tr(full?"退出全屏":"全屏地图")} aria-label={tr(full?"退出全屏":"全屏地图")} onClick={fullscreen}>{full?<Minimize size={18}/>:<Maximize size={18}/>}</button></div>
   {selected&&view.k>=1.8&&<div className="map-node-preview"><strong>{countryName(selected.code)}</strong><div>{selected.nodes.slice(0,6).map(n=><span key={n.id}><i className={n.online?'dot online':'dot'}/>{n.name}</span>)}</div>{selected.total>6&&<small>+{selected.total-6}</small>}</div>}
   <output className="map-scale">{Math.round(view.k*100)}%</output>
  </div>
  <div className="explorer-footer"><div className="region-list"><button onClick={()=>onRegion('all')} title={tr("所有地区")} aria-label={tr("所有地区")} aria-pressed={region==='all'}><Globe size={16}/></button>{regions.map(r=><button key={r.code} data-region={r.code} aria-pressed={region===r.code} onClick={()=>onRegion(r.code)}>{r.code!==UNKNOWN_REGION&&<Flag code={r.code}/>}<span>{countryName(r.code)}</span><b>{r.total}</b></button>)}</div></div>
 {full&&<div className="map-view-switch">{viewSwitch}</div>}
 {selected&&<div className="map-selection"><span>{countryName(selected.code)} · {tr("在线")} {selected.online}/{selected.total}</span><button onClick={()=>onRegion('all')}>{tr("清除地区筛选")}</button></div>}
 {help&&<p className="map-note">{tr("拖拽移动；Ctrl / ⌘ + 滚轮缩放，全屏内直接滚轮缩放。方向键平移，+ / − 缩放。地图表示地区分组，不是机房精确位置。")}</p>}</section>
})
