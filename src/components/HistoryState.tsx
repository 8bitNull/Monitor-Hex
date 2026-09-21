import {ChartNoAxesCombined,LoaderCircle,CircleAlert} from 'lucide-react'
export function HistoryState({message,loading=false,failed=false}:{message:string;loading?:boolean;failed?:boolean}){
 const Icon=loading?LoaderCircle:failed?CircleAlert:ChartNoAxesCombined;
 return <div className={`history-state ${loading?'history-loading':'history-empty'}`} aria-label={message} aria-busy={loading||undefined}><div><Icon size={22} aria-hidden="true"/><p>{message}</p></div></div>
}
