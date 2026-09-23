import {Children,isValidElement,useState,useCallback,type ComponentProps,type ReactNode} from 'react'
import {Select as Primitive} from 'radix-ui'
import {Check,ChevronDown,ChevronUp} from 'lucide-react'
type Props=Omit<ComponentProps<'button'>,'value'|'onChange'|'children'|'defaultValue'> & {value?:string|number;onChange?:(event:{target:{value:string}})=>void;children:ReactNode;displayValue?:ReactNode}
type Option={value:string;label:ReactNode;disabled:boolean}
function optionsOf(children:ReactNode):Option[]{return Children.toArray(children).flatMap(child=>{if(!isValidElement<{value?:string|number;children?:ReactNode;disabled?:boolean}>(child))return [];return child.type==='option'?[{value:String(child.props.value??''),label:child.props.children,disabled:!!child.props.disabled}]:optionsOf(child.props.children)})}
const empty='__select_placeholder__'
export function Select({value='',onChange,children,displayValue,className,...props}:Props){
 const [container,setContainer]=useState<Element|null>(null)
 const anchor=useCallback((el:HTMLButtonElement|null)=>{if(el)setContainer(el.closest('dialog')??el.closest('.next-theme'))},[])
 const [pointerFocus,setPointerFocus]=useState(false)
 const options=optionsOf(children),current=String(value),selected=options.find(o=>o.value===current)
 // Escape clipped/glass cards while retaining the owning native dialog and theme variables.
 return <Primitive.Root value={current||empty} onValueChange={v=>onChange?.({target:{value:v===empty?'':v}})} disabled={props.disabled}>
  <Primitive.Trigger {...props} ref={anchor} className={className} data-slot="select" data-value={current} data-pointer-focus={pointerFocus} onPointerDown={e=>{setPointerFocus(true);props.onPointerDown?.(e)}} onBlur={e=>{setPointerFocus(false);props.onBlur?.(e)}} onKeyDown={e=>{setPointerFocus(false);props.onKeyDown?.(e)}} type="button"><span className="select-value">{displayValue??selected?.label??current}</span><Primitive.Icon className="select-chevron"><ChevronDown size={14}/></Primitive.Icon></Primitive.Trigger>
  <Primitive.Portal container={container}><Primitive.Content onPointerDownCapture={()=>setPointerFocus(true)} onKeyDownCapture={()=>setPointerFocus(false)} className="select-menu" position="popper" sideOffset={5} collisionPadding={12} align="start"><Primitive.ScrollUpButton className="select-scroll"><ChevronUp size={14}/></Primitive.ScrollUpButton><Primitive.Viewport className="select-options">{options.filter(o=>o.value!=='' || !o.disabled).map(o=><Primitive.Item className="select-option" key={o.value} value={o.value||empty} disabled={o.disabled} data-value={o.value}><Primitive.ItemText>{o.label}</Primitive.ItemText><Primitive.ItemIndicator className="select-check"><Check size={14}/></Primitive.ItemIndicator></Primitive.Item>)}</Primitive.Viewport><Primitive.ScrollDownButton className="select-scroll"><ChevronDown size={14}/></Primitive.ScrollDownButton></Primitive.Content></Primitive.Portal>
 </Primitive.Root>
}
