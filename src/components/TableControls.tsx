import {useEffect,useRef} from 'react'
import {Columns3,RotateCcw} from 'lucide-react'
import {defaultBrowse,sortLabels,type Browse,type SortKey} from '@/lib/browse'
import {tr} from '@/lib/i18n'
export function TableColumns({browse,mobile,onChange}:{browse:Browse;mobile:boolean;onChange:(patch:Partial<Browse>)=>void}) {
 const ref=useRef<HTMLDetailsElement>(null),columns=mobile?browse.mobileColumns:browse.columns,layout=mobile?browse.mobileTableLayout:browse.tableLayout
 useEffect(()=>{const close=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))ref.current.open=false};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[])
 return <details ref={ref} className="column-options" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus()}}}>
  <summary title={tr('显示列')} aria-label={tr('显示列')}><Columns3 size={16}/></summary>
  <div><p className="table-column-title">{mobile?tr('手机表格'):tr('桌面表格')}</p>
   <label>{tr('列布局')}<select aria-label={tr('列布局')} value={layout} onChange={e=>onChange({[mobile?'mobileTableLayout':'tableLayout']:e.target.value})}><option value="grouped">{tr('合并相关指标')}</option><option value="separate">{tr('每项独立一列')}</option></select></label>
   <p className="table-column-note">{tr('合并显示上下行速度，桌面状态并入名称；手机状态始终跟随名称。')}</p>
   <p className="table-column-note">{tr('名称与状态始终保留；仅影响当前设备的表格。')}</p>
   {defaultBrowse.columns.map(key=><label key={key}><input type="checkbox" checked={columns.includes(key)} onChange={e=>onChange({[mobile?'mobileColumns':'columns']:e.target.checked?defaultBrowse.columns.filter(c=>c===key||columns.includes(c)):columns.filter(c=>c!==key)})}/>{tr(sortLabels[key as SortKey])}</label>)}
   <button className="table-order-reset" disabled={browse.sort==='default'} onClick={()=>onChange({sort:'default',direction:'asc'})}><RotateCcw size={16}/>{tr('恢复默认顺序')}</button>
  </div>
 </details>
}
