import {useEffect,useRef} from 'react'
import {DefaultTooltipContent,type TooltipContentProps,type TooltipValueType} from 'recharts'
import {X} from 'lucide-react'
import {tr} from '@/lib/i18n'
export function useChartTooltip(resetKey:string,compact:boolean){
 const frame=useRef<HTMLDivElement>(null);
 // This transient attribute only controls the tooltip layer. Keeping it outside
 // chart state avoids resetting Recharts' in-flight click/sample selection.
 const dismiss=()=>frame.current?.setAttribute('data-tooltip-open','false');
 useEffect(()=>{const el=frame.current;if(el)el.setAttribute('data-tooltip-open','false')},[resetKey,compact]);
 useEffect(()=>{if(!compact)return;const outside=(e:PointerEvent)=>{if(!frame.current?.contains(e.target as Node))frame.current?.setAttribute('data-tooltip-open','false')};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[compact]);
 return {frame,dismiss,onChartClick:(e:React.MouseEvent)=>{if(!(e.target as Element).closest('.chart-tooltip'))frame.current?.setAttribute('data-tooltip-open','true')}};
}
export function ChartTooltip(props:TooltipContentProps<TooltipValueType,string|number>&{dismiss:()=>void;compact:boolean}){
 const time=props.labelFormatter?props.labelFormatter(props.label,props.payload):props.label;
 return <div className="chart-tooltip"><div className="chart-tooltip-heading"><span>{time}</span>{props.compact&&<button className="chart-tooltip-close" aria-label={tr('关闭图表提示')} onClick={props.dismiss}><X size={16}/></button>}</div><DefaultTooltipContent {...props} labelStyle={{display:"none"}}/></div>
}
