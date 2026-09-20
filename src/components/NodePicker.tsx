import {useEffect,useRef,useState} from 'react'
import {ChevronDown,Check,X,Search} from 'lucide-react'
import type {Node} from '@/lib/api'
import {tr} from '@/lib/i18n'
import {Flag} from './NodeIcons'
import {Status} from './NodeIdentity'
export function NodePicker({node,nodes,onSwitch}:{node:Node;nodes:Node[];onSwitch:(id:number)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(!open)return;const el=dialog.current!,button=trigger.current!,rect=button.getBoundingClientRect();el.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-432))}px`;el.style.top=`${Math.min(rect.bottom+8,innerHeight-320)}px`;const overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;if(button.isConnected)button.focus({preventScroll:true})}},[open])
 const matches=nodes.filter(n=>`${n.name} ${n.country}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()))
 return <><h2><button ref={trigger} className="node-picker-trigger" aria-label={tr('切换节点')} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setQuery('');setOpen(true)}}>{node.country&&<Flag code={node.country}/>}<span>{node.name}</span><ChevronDown size={16}/></button></h2>
 {open&&<dialog ref={dialog} className="node-picker" aria-label={tr('切换节点')} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false)}}}>
 <div className="node-picker-heading"><strong>{tr('切换节点')}</strong><button aria-label={tr('关闭')} onClick={()=>setOpen(false)}><X size={18}/></button></div>
 {nodes.length>8&&<label className="node-picker-search"><Search size={15}/><input aria-label={tr('搜索节点')} placeholder={tr('搜索节点')} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
 <div className="node-picker-list">{matches.length?matches.map(n=><button key={n.id} aria-current={n.id===node.id?'true':undefined} onClick={()=>{setOpen(false);if(n.id!==node.id)onSwitch(n.id)}}>{n.country&&<Flag code={n.country}/>}<span>{n.name}</span><Status node={n}/>{n.id===node.id&&<Check size={15}/>}</button>):<p>{tr('没有符合条件的节点')}</p>}</div>
 </dialog>}</>
}
