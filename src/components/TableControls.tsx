import {useEffect,useRef} from 'react'
import {Columns3} from 'lucide-react'
import {defaultBrowse,tablePreset,sortLabels,type Browse,type SortKey} from '@/lib/browse'
import {tr} from '@/lib/i18n'
export function TableColumns({browse,mobile,onChange}:{browse:Browse;mobile:boolean;onChange:(patch:Partial<Browse>)=>void}) {
 const ref=useRef<HTMLDetailsElement>(null),columns=mobile?browse.mobileColumns:browse.columns,layout=mobile?browse.mobileTableLayout:browse.tableLayout
 useEffect(()=>{const close=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))ref.current.open=false};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[])
 const apply=(preset:'overview'|'network'|'billing')=>onChange(tablePreset(preset,mobile))
 const current=(['overview','network','billing'] as const).find(key=>{const p=tablePreset(key,mobile);return layout==='grouped'&&JSON.stringify(columns)===JSON.stringify(mobile?p.mobileColumns:p.columns)})
 return <details ref={ref} className="column-options" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus()}}}>
  <summary title={tr('显示列')} aria-label={tr('显示列')}><Columns3 size={16}/></summary>
  <div><p className="table-column-title">{mobile?tr('手机表格'):tr('桌面表格')} · {current?tr(current==='overview'?'概览':current==='network'?'网络':'费用'):tr('自定义')}</p>
   <div className="table-presets">{(['overview','network','billing'] as const).map(key=><button key={key} aria-pressed={current===key} onClick={()=>apply(key)}>{tr(key==='overview'?'概览':key==='network'?'网络':'费用')}</button>)}</div>
   <label>{tr('列布局')}<select aria-label={tr('列布局')} value={layout} onChange={e=>onChange({[mobile?'mobileTableLayout':'tableLayout']:e.target.value})}><option value="grouped">{tr('分组显示')}</option><option value="separate">{tr('独立列')}</option></select></label>
   <p className="table-column-note">{tr('名称与状态始终保留；仅影响当前设备的表格。')}</p>
   {defaultBrowse.columns.map(key=><label key={key}><input type="checkbox" checked={columns.includes(key)} onChange={e=>onChange({[mobile?'mobileColumns':'columns']:e.target.checked?defaultBrowse.columns.filter(c=>c===key||columns.includes(c)):columns.filter(c=>c!==key)})}/>{tr(sortLabels[key as SortKey])}</label>)}
  </div>
 </details>
}
export function TableSort({browse,onChange}:{browse:Browse;onChange:(patch:Partial<Browse>)=>void}) {
 return <div className="table-sort-toolbar"><label>{tr('表格排序')}<select aria-label={tr('表格排序')} value={browse.sort==='default'?'default':`${browse.sort}:${browse.direction}`} onChange={e=>{const [sort,direction]=e.target.value.split(':');onChange({sort:sort as SortKey,direction:direction==='desc'?'desc':'asc'})}}><option value="default">{tr('后台默认')}</option>{Object.entries(sortLabels).filter(([key])=>key!=='default').flatMap(([key,label])=>(['asc','desc'] as const).map(dir=><option key={`${key}:${dir}`} value={`${key}:${dir}`}>{tr(label)} · {tr(dir==='asc'?'升序':'降序')}</option>))}</select></label>{browse.sort!=='default'&&<button onClick={()=>onChange({sort:'default',direction:'asc'})}>{tr('恢复默认顺序')}</button>}</div>
}
