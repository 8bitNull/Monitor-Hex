import {useEffect,useState} from 'react'
import {Select} from './ui/select'
import {defaultBrowse,availableTableColumns,tableColumnLabels,type Browse} from '@/lib/browse'
import {tr} from '@/lib/i18n'

function TableDeviceSettings({mobile,browse,onChange}:{mobile:boolean;browse:Browse;onChange:(patch:Partial<Browse>)=>void}) {
 const field=mobile?'mobileColumns':'columns',layout=mobile?'mobileTableLayout':'tableLayout',columns=browse[field]
 return <div className="table-device-settings" role="group" aria-label={mobile?tr('手机表格'):tr('桌面表格')}>
  <h3>{mobile?tr('手机表格'):tr('桌面表格')}</h3>
  <div className="preference-grid"><label>{tr('列布局')}<Select aria-label={tr('列布局')} value={browse[layout]} onChange={e=>onChange({[layout]:e.target.value})}><option value="grouped">{tr('合并相关指标')}</option><option value="separate">{tr('每项独立一列')}</option></Select></label></div>
  <div className="table-column-checks">{availableTableColumns.map(key=><label className="check-control" key={key}><input type="checkbox" checked={columns.includes(key)} onChange={e=>onChange({[field]:e.target.checked?availableTableColumns.filter(c=>c===key||columns.includes(c)):columns.filter(c=>c!==key)})}/>{tr(tableColumnLabels[key])}</label>)}</div>
  <div className="table-column-actions"><button type="button" onClick={()=>onChange({[field]:[...availableTableColumns]})}>{tr('全选指标')}</button><button type="button" onClick={()=>onChange({[field]:[...defaultBrowse[field]],[layout]:defaultBrowse[layout]})}>{tr('恢复默认列')}</button></div>
 </div>
}

export function TableDisplaySettings({browse,onChange}:{browse:Browse;onChange:(patch:Partial<Browse>)=>void}) {
 const [mobileViewport,setMobileViewport]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 720px)').matches)
 const [manualSelection,setManualSelection]=useState(false)
 useEffect(()=>{
  const query=window.matchMedia('(max-width: 720px)'),update=()=>{if(!manualSelection)setMobileViewport(query.matches)}
  update();query.addEventListener('change',update)
  return()=>query.removeEventListener('change',update)
 },[manualSelection])
 return <div className="table-display-settings">
  <div className="table-device-switch" role="group" aria-label={tr('表格显示')}>
   <button type="button" aria-pressed={mobileViewport} onClick={()=>{setManualSelection(true);setMobileViewport(true)}}>{tr('手机表格')}</button>
   <button type="button" aria-pressed={!mobileViewport} onClick={()=>{setManualSelection(true);setMobileViewport(false)}}>{tr('桌面表格')}</button>
  </div>
  <TableDeviceSettings mobile={mobileViewport} browse={browse} onChange={onChange}/>
 </div>
}
