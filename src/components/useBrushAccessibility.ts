import {useEffect,type RefObject} from 'react'
import {tr} from '@/lib/i18n'

/** Recharts exposes pixel offsets on its two slider wrappers. Adapt those
 * wrappers to sample times without replacing its pointer/keyboard handlers. */
export function useBrushAccessibility(frame:RefObject<HTMLDivElement|null>,rows:{ts:number}[],start:number,end:number,language:string){
 useEffect(()=>{
  const root=frame.current
  if(!root||!rows.length)return
  const update=()=>{
   root.querySelectorAll<SVGGElement>('.recharts-brush-traveller').forEach((el,i)=>{
    const index=i===0?start:end
    const attrs:Record<string,string>={'aria-label':i===0?tr('开始时间'):tr('结束时间'),'aria-valuemin':String(i===0?0:start),'aria-valuemax':String(i===0?end:rows.length-1),'aria-valuenow':String(index),'aria-valuetext':new Date(rows[index]?.ts??rows[0].ts).toLocaleString(language)}
    for(const [key,value] of Object.entries(attrs))if(el.getAttribute(key)!==value)el.setAttribute(key,value)
   })
  }
  update()
  const observer=new MutationObserver(update)
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label','aria-valuenow']})
  return()=>observer.disconnect()
 },[frame,rows,start,end,language])
}
