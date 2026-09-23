import {ChartNoAxesCombined,LoaderCircle,CircleAlert} from 'lucide-react'
export function HistoryState({message,loading=false,failed=false,action,onAction}:{message:string;loading?:boolean;failed?:boolean;action?:string;onAction?:()=>void}){
 const Icon=loading?LoaderCircle:failed?CircleAlert:ChartNoAxesCombined;
 return <div className={`history-state ${loading?'history-loading':'history-empty'}`} aria-label={message} aria-busy={loading||undefined}>{loading&&<div className="history-skeleton" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>}<div className="history-state-message"><Icon size={22} aria-hidden="true"/><p>{message}</p>{action&&onAction&&!loading&&<button onClick={onAction}>{action}</button>}</div></div>
}
