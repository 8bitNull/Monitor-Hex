import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,memo} from 'react'
import {X} from 'lucide-react'
import {useNodeProbe} from '../lib/nodeProbes'
import {tr,locale} from '../lib/i18n'
import type {Node} from '@/lib/api'
import {type Browse,type SortKey,sortLabels,sortValue,primaryPing,tableColumns} from '@/lib/browse'
import {usePing} from '@/lib/usePing'
import {bytes,daysUntil,FOREVER,rate} from '@/lib/format'
import {latencyBand} from '@/lib/trends'
import {countryName} from '@/lib/regionNames'
import {nodeState} from '@/lib/freshness'
import {Status} from './NodeIdentity'
function Latency({node,probe,warn,high}:{node:Node;probe:string;warn:number;high:number}) {
 useNodeProbe(node.id,probe)
 const {ref,snapshot,retry}=usePing(node.id),ping=primaryPing(node.id,probe)
 const old=ping&&(Date.now()/1000-ping.latest.ts>7200||!snapshot?.updatedAt||Date.now()-snapshot.updatedAt>=120000)
 const historical=!node.online||old,tone=ping&&!historical?latencyBand(ping.latest.latency,warn,high):undefined
 const level=tone==='good'?1:tone==='fair'?2:tone==='bad'?3:0
 return <div ref={ref} className="table-ping" data-tone={tone}>
  <div className="table-ping-value" title={ping?`${tr('采样')}: ${new Date(ping.latest.ts*1000).toLocaleString(locale())}`:undefined}>
   {snapshot?.failed?<button onClick={retry}>{tr('读取失败 · 重试')}</button>:!snapshot?.data?tr('读取中…'):!ping?tr('无该线路记录'):<><strong>{ping.latest.latency===null?tr('超时'):`${Math.round(ping.latest.latency)} ms`}</strong>{level>0&&<span className="table-latency-grade" data-level={level}><span className="table-grade-bars" aria-hidden="true"/>{tr(level===1?'低':level===2?'中':'高')}</span>}</>}
  </div>
  {ping&&<div className="table-network-meta"><span className="table-route" title={ping.name}>{ping.name}</span><small data-loss={ping.loss!==null&&ping.loss>0}>{tr('24h 丢包')} {ping.loss===null?'—':`${ping.loss.toFixed(1)}%`}</small></div>}
  {ping&&historical&&<small className="table-history-note">{!node.online?tr('历史数据'):tr('较旧记录')}</small>}
 </div>
}
function Expiry({date}:{date:string|null}) {
 const days=daysUntil(date),label=days===null?(date?tr('未知'):tr('未设到期')):days<0?tr('已过期 {0} 天',-days):days===0?tr('今天到期'):tr('{0} 天后到期',days)
 return <div className="table-expiry" data-state={days===null?'unknown':days<0?'expired':days<=7?'soon':'normal'}><strong>{label}</strong>{date&&<time dateTime={date}>{date}</time>}</div>
}
function NameInfo({node,onClose}:{node:Node;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null,el=ref.current!;el.showModal();return()=>{el.close();trigger?.focus({preventScroll:true})}},[])
 return <dialog ref={ref} className="table-name-dialog" aria-labelledby="table-name-title" onCancel={onClose}><div><h2 id="table-name-title">{tr('节点资料')}</h2><button aria-label={tr('关闭')} onClick={onClose}><X size={18}/></button></div><p>{node.name}</p><p>{countryName(node.country)} · {node.os}</p><Status node={node}/></dialog>
}
function Speed({node,directions}:{node:Node;directions:string[]}) {
 return <div className="table-speed">{directions.map(key=>{const v=sortValue(node,key as SortKey,'auto');return <span role="group" key={key} data-direction={key} aria-label={`${tr(key==='upload'?'实时上行':'实时下行')} ${v===null?'—':rate(Number(v))}`}>{v===null?'—':rate(Number(v)).replace(' Mbps','')}{v!==null&&<small>Mbps</small>}</span>})}</div>
}
// Individual ping updates should not rebuild unrelated resource and identity cells.
const TableRow=memo(function TableRow({n,keys,directions,grouped,mobile,probe,warn,high,onOpen,onInfo,state,clock}:{n:Node;keys:string[];directions:string[];grouped:boolean;mobile:boolean;probe:string;warn:number;high:number;onOpen:(id:number)=>void;onInfo:(node:Node)=>void;state:ReturnType<typeof nodeState>;clock:number}) {
 void clock // Minute changes refresh expiry and the age of retained history.
 return <tr data-state={state}>{keys.map(key=>{
   const v=sortValue(n,key as SortKey,probe)
   return <td key={key} data-column={key}>{key==='name'?<div className="table-identity"><div><div className="table-name-text"><button data-node-id={n.id} className="table-node-name" onClick={()=>onOpen(n.id)} title={n.name}>{grouped&&!mobile&&<><i className="table-status-dot" aria-hidden="true"/>{state==='live'&&<span className="sr-only">{tr('在线')}</span>}</>}{n.name}</button><small>{countryName(n.country)} · {n.os}</small></div><button className="table-name-info" aria-label={tr('查看完整节点资料：{0}',n.name)} onClick={()=>onInfo(n)}></button></div>{grouped&&!mobile&&state!=='live'&&<Status node={n}/>}</div>:key==='status'?<Status node={n}/>:key==='latency'?<Latency node={n} probe={probe} warn={warn} high={high}/>:key==='speed'?<Speed node={n} directions={directions}/>:key==='traffic'?<div className="table-traffic">{bytes(Number(v))}<small> / {Number.isFinite(n.traffic_limit)?n.traffic_limit>0?bytes(n.traffic_limit):FOREVER:'—'}</small>{Number.isFinite(n.traffic_limit)&&n.traffic_limit>0&&<progress aria-label={tr('流量额度使用率')} max={100} value={Math.min(100,Math.max(0,Number(v)/n.traffic_limit*100))}/>} {n.traffic_limit>0&&Number(v)>n.traffic_limit&&<small className="table-over-limit">{tr('已超额')}</small>}</div>:key==='expiry'?<Expiry date={n.expires_at}/>:v===null?'—':key==='upload'||key==='download'?<Speed node={n} directions={[key]}/>:<div className="table-metric">{Math.round(Number(v))}%<progress aria-label={tr(sortLabels[key as SortKey])} max={100} value={Math.min(100,Math.max(0,Number(v)))}/></div>}</td>
  })}</tr>
})
export function NodeTable({nodes,browse,onSort,onSortChange,onOpen,mobile=false,warn=80,high=160}:{nodes:Node[];browse:Browse;onSort:(key:SortKey)=>void;onSortChange:(sort:SortKey,direction:'asc'|'desc')=>void;onOpen:(id:number)=>void;mobile?:boolean;warn?:number;high?:number}) {
 const [clock,tick]=useState(0),[info,setInfo]=useState<Node|null>(null),ref=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({left:false,right:false})
 useEffect(()=>{const timer=setInterval(()=>tick(value=>value+1),60000);return()=>clearInterval(timer)},[])
 const grouped=(mobile?browse.mobileTableLayout:browse.tableLayout)==='grouped',keys=useMemo(()=>tableColumns(browse.columns,grouped,mobile),[browse.columns,grouped,mobile]),directions=useMemo(()=>browse.columns.filter(k=>k==='upload'||k==='download'),[browse.columns])
 const openRef=useRef(onOpen);useLayoutEffect(()=>{openRef.current=onOpen},[onOpen])
 const openNode=useCallback((id:number)=>openRef.current(id),[])
 const updateEdges=()=>{const el=ref.current;if(el)setEdges(previous=>{const next={left:el.scrollLeft>1,right:el.scrollLeft+el.clientWidth<el.scrollWidth-1};return next.left===previous.left&&next.right===previous.right?previous:next})}
 useEffect(()=>{const observer=new ResizeObserver(updateEdges);if(ref.current){observer.observe(ref.current);const table=ref.current.querySelector('table');if(table)observer.observe(table)}return()=>observer.disconnect()},[])
 const composite=(key:string)=>key==='speed'?directions:key==='latency'&&grouped?['latency','loss']:[]
 const widths=keys.map(key=>key==='name'?(mobile?140:220):key==='status'?96:['cpu','memory','disk'].includes(key)?88:key==='speed'?190:key==='latency'?210:key==='traffic'?160:130)
 return <><div className="table-shell" data-left={edges.left} data-right={edges.right}><div ref={ref} className="table-scroll" onScroll={updateEdges} tabIndex={0} role="region" aria-label={tr('节点表格，可横向滚动')}><table className="node-table" data-grouped={grouped} style={{minWidth:widths.reduce((a,b)=>a+b,0)}}><colgroup>{keys.map((key,i)=><col key={key} style={{width:widths[i]}}/>)}</colgroup>
  <thead><tr>{keys.map(key=>{const options=composite(key),active=key===browse.sort||options.includes(browse.sort)||key==='name'&&grouped&&!mobile&&browse.sort==='status',label=key==='speed'?tr('实时网速'):key==='latency'&&grouped?tr('网络质量'):tr(sortLabels[key as SortKey]);return <th key={key} data-column={key} aria-sort={active?browse.direction==='asc'?'ascending':'descending':'none'}>{options.length?<select aria-label={tr('{0}排序',label)} value={active?`${browse.sort}:${browse.direction}`:''} onChange={e=>{const [sort,dir]=e.target.value.split(':');onSortChange(sort as SortKey,dir as 'asc'|'desc')}}><option value="" disabled>{label}</option>{options.flatMap(k=>(['asc','desc'] as const).map(dir=><option value={`${k}:${dir}`} key={`${k}:${dir}`}>{tr(sortLabels[k as SortKey])} {tr(dir==='asc'?'升序':'降序')}</option>))}</select>:<button aria-label={`${label}${key===browse.sort?browse.direction==='asc'?' ↑':' ↓':''}`} onClick={()=>onSort(key as SortKey)}>{label}<span aria-hidden="true">{key===browse.sort?browse.direction==='asc'?' ↑':' ↓':' ↕'}</span></button>}</th>})}</tr></thead>
  <tbody>{nodes.map(n=><TableRow key={n.id} n={n} keys={keys} directions={directions} grouped={grouped} mobile={mobile} probe={browse.probe} warn={warn} high={high} onOpen={openNode} onInfo={setInfo} state={nodeState(n)} clock={clock}/>)}</tbody>
 </table></div></div>{info&&<NameInfo node={info} onClose={()=>setInfo(null)}/>}</>
}
