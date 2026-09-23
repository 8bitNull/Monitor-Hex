import {useEffect,useRef,type ReactNode} from 'react'
import {X} from 'lucide-react'
import {tr} from '@/lib/i18n'

export function MobileSearch({children,count,onClose,onResults,onClear}:{children:ReactNode;count:number;onClose:()=>void;onResults:()=>void;onClear:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null,el=ref.current!
  el.showModal();el.querySelector('input')?.focus()
  return()=>{el.close();trigger?.focus({preventScroll:true})}
 },[])
 return <dialog ref={ref} className="mobile-search-panel" aria-labelledby="mobile-search-title" onCancel={onClose} onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing&&e.target instanceof HTMLInputElement){e.preventDefault();if(count)onResults()}}}>
  <div className="mobile-search-heading"><h2 id="mobile-search-title">{tr('搜索节点')}</h2><button onClick={onClose} aria-label={tr('关闭搜索')}><X size={18}/></button></div>
  {children}<p role="status">{tr('找到 {0} 个节点',count)}</p><button className="search-results-action" onClick={count?onResults:onClear}>{count?tr('查看 {0} 个结果',count):tr('清空搜索')}</button>
 </dialog>
}
