import {useEffect,useRef,useState} from 'react'
import {Check,ChevronDown,Globe,X} from 'lucide-react'
import type {Node} from '@/lib/api'
import {groupRegions,UNKNOWN_REGION} from '@/lib/groups'
import {locale,tr} from '@/lib/i18n'
import {Flag} from './NodeIcons'

export function RegionPicker({nodes,region,onChange}:{nodes:Node[];region:string;onChange:(region:string)=>void}) {
 const [open,setOpen]=useState(false)
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null)
 const regions=groupRegions(nodes)
 const name=(code:string)=>{if(code===UNKNOWN_REGION)return tr('未知地区');try{return new Intl.DisplayNames([locale()],{type:'region'}).of(code)||code}catch{return code}}
 const count=region==='all'?nodes.length:regions.find(r=>r.code===region)?.total??0
 useEffect(()=>{
  if(!open)return
  const el=dialog.current!,button=trigger.current,overflow=document.body.style.overflow
  el.showModal();document.body.style.overflow='hidden'
  return()=>{el.close();document.body.style.overflow=overflow;if(button?.isConnected)button.focus({preventScroll:true})}
 },[open])
 const choose=(code:string)=>{onChange(code);setOpen(false)}
 return <div className="mobile-region-picker" role="group" aria-label={tr('地区快速筛选')}>
  <button ref={trigger} className="region-picker-trigger" aria-label={tr('选择地区')} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>
   <span>{region==='all'?tr('所有地区'):name(region)}</span><small>{count}</small><ChevronDown size={15}/>
  </button>
  {open&&<dialog ref={dialog} className="region-sheet" aria-label={tr('选择地区')} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false)}}}>
   <div className="region-sheet-handle" aria-hidden="true"/>
   <div className="region-sheet-heading"><h2>{tr('选择地区')}</h2><button aria-label={tr('关闭')} onClick={()=>setOpen(false)}><X size={18}/></button></div>
   <div className="region-sheet-list">
    {[{code:'all',total:nodes.length},...regions].map(r=><button key={r.code} aria-pressed={region===r.code} onClick={()=>choose(r.code)}>
     <span className="region-sheet-icon">{r.code==='all'||r.code===UNKNOWN_REGION?<Globe size={19}/>:<Flag code={r.code}/>}</span>
     <span className="region-sheet-name">{r.code==='all'?tr('所有地区'):name(r.code)}</span><small>{tr('{0} 个节点',r.total)}</small><Check size={17} className="region-sheet-check"/>
    </button>)}
   </div>
  </dialog>}
 </div>
}
