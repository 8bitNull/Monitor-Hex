import {useEffect,useRef,useState} from 'react'
import {Activity,Clock,History,X} from 'lucide-react'
import {Card} from './ui/card'
import {tr,locale} from '../lib/i18n'
import type {LoadAlert} from '../lib/loadAlerts'
const time=(value:number)=>new Date(value).toLocaleString(locale(),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})
export function duration(event:LoadAlert){const seconds=Math.max(0,Math.floor(((event.end??event.last)-event.start)/1000));return `${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function status(event:LoadAlert){return event.status==='active'?tr('告警中'):event.status==='recovered'?tr('已恢复'):tr('监测中断')}
function Records({events,onClose,saved,onOpen,available}:{events:LoadAlert[];onClose:()=>void;saved:boolean;onOpen:(event:LoadAlert)=>void;available:number[]}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;const el=dialog.current!;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;trigger?.focus({preventScroll:true})}},[])
 return <dialog ref={dialog} className="load-records" aria-labelledby="load-records-title" onCancel={onClose}>
  <div className="load-records-heading"><h2 id="load-records-title"><Activity size={18}/>{tr('高负载观测记录')}</h2><button onClick={onClose} aria-label={tr('关闭')}><X size={18}/></button></div>
  <p className="load-records-note">{tr("仅记录当前浏览器打开期间观测到的高负载。")}</p><details className="load-record-rules"><summary>{tr("记录规则")}</summary><p className="load-records-note">{tr('CPU ≥85% 触发，低于 80% 恢复。记录从首次观测起计时；中断时仅统计已观测时段。')}</p>
  <p className="load-records-note">{saved?tr('仅保存在当前浏览器，保留最近 100 条结束记录；页面关闭期间不监测。'):tr('浏览器存储不可用，记录仅在本次页面内保留。')}</p>
  </details><div className="load-records-list">{events.length===0?<p className="load-records-empty">{tr('暂无高负载记录')}</p>:events.map(e=><article key={e.id} data-status={e.status}>
   <div className="load-record-title"><button className="alert-node-link" disabled={!available.includes(e.nodeId)} title={!available.includes(e.nodeId)?tr("节点不存在或未公开。"):tr("查看 CPU 历史")} onClick={()=>{onClose();onOpen(e)}}>{e.name}</button>{!available.includes(e.nodeId)&&<small>{tr("节点不存在或未公开。")}</small>}<span>{status(e)}</span></div>
   <dl><div><dt>{tr('开始时间')}</dt><dd><time dateTime={new Date(e.start).toISOString()}>{time(e.start)}</time></dd></div>
    <div><dt>{e.status==='recovered'?tr('恢复时间'):tr('最后观测')}</dt><dd>{time(e.end??e.last)}</dd></div>
    <div><dt>{tr('持续时长')}</dt><dd className="load-duration"><Clock size={12}/>{duration(e)}</dd></div><div><dt>{tr('CPU 峰值')}</dt><dd>{e.peak.toFixed(1)}%</dd></div></dl>
  </article>)}</div>
 </dialog>
}
export function LoadAlertTile({events,saved,onOpen,available}:{events:LoadAlert[];saved:boolean;onOpen:(event:LoadAlert)=>void;available:number[]}){
 const [open,setOpen]=useState(false);const active=events.filter(e=>e.status==='active');const latest=active[0]??events[0]
 return <Card className="load-alert-tile gap-0 p-3" data-active={active.length>0}>
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Activity className="size-3.5"/><span className="load-tile-label">{tr('高负载')}</span><small className="local-observation">{tr('本地观测')}</small><button className="load-history-button" aria-label={tr('查看高负载记录')} title={tr('查看高负载记录')} onClick={()=>setOpen(true)}><History size={15}/></button></div>
  <button className="load-alert-summary" onClick={()=>setOpen(true)} aria-label={tr('查看高负载记录详情')}>
   <strong className="summary-total">{active.length}<small>{tr('告警中')}</small></strong>
   {latest?<><span className="load-latest-name" title={latest.name}>{latest.name}</span><span className="load-latest-time"><span>{status(latest)} · {time(latest.start)}</span><span title={tr('持续时长')}><Clock size={11}/>{duration(latest)}</span></span></>:<span className="load-empty">{tr('暂无高负载记录')}</span>}
  </button>
  {!saved && <small className="load-storage-warning">{tr('记录未持久保存')}</small>}
  {open && <Records onOpen={onOpen} available={available} events={events} saved={saved} onClose={()=>setOpen(false)}/>}
 </Card>
}
