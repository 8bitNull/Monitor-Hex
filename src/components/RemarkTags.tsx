/** Shared, content-stable colours; remark text is rendered as text, never HTML. */
export function RemarkTags({texts, compact=false}: {texts: string[]; compact?:boolean}) {
 return <>{texts.map((text,index)=>{
  const hue=Array.from(text).reduce((hash,char)=>(hash*31+char.codePointAt(0)!)>>>0,0)%4;
  return <span key={`${index}-${text}`} className={`detail-remark-tag remark-hue-${hue}`} title={compact ? text : undefined}>{compact && Array.from(text).length>24 ? Array.from(text).slice(0,24).join('')+'…' : text}</span>
 })}</>
}
