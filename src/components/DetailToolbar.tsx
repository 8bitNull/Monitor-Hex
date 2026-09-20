import {RefreshCw,Home,Eye,EyeOff,Waves,Activity,Network} from 'lucide-react'
import {tr,locale} from '@/lib/i18n'
const RANGES = [
    { hours: 1, label: "1 小时" },
    { hours: 6, label: "6 小时" },
    { hours: 24, label: "24 小时" },
    { hours: 168, label: "7 天" },
];
// Latency stops at a day. A week-wide bucket would still carry the spread and the
// loss figure, but a week of probe history is outside this page's purpose, and
// these are the windows in which every ping remains on the chart.
const RANGES_FOR = { resources: RANGES, latency: RANGES.filter((r) => r.hours <= 24) };
const TABS = [
    { key: "resources", label: "资源" },
    { key: "latency", label: "网络延迟" },
] as const;
function Tab({ active, onClick, children, label }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    label?:string;
}) {
    return (<button aria-label={label} onClick={onClick} aria-pressed={active} className={`rounded-md px-2.5 py-1 text-xs transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
      {children}
    </button>);
}
export type HistoryTab='resources'|'latency'
export function DetailToolbar({updated,tab,hours,smooth,hasProbes,onTab,onHours,onSmooth,onProbes,onRefresh}:{updated:number|null;tab:HistoryTab;hours:number;smooth:boolean;hasProbes:boolean;onTab:(tab:HistoryTab)=>void;onHours:(hours:number)=>void;onSmooth:(value:boolean)=>void;onProbes:(mode:'home'|'all'|'none')=>void;onRefresh:()=>void}){
 return (      <div id="latency" className="detail-chart-toolbar">
        <div className="detail-tabs" role="group" aria-label={tr("图表类型")}>{TABS.map(t=><Tab key={t.key} label={tr(t.label)} active={tab===t.key} onClick={()=>onTab(t.key)}>{t.key==="resources" ? <Activity size={15}/> : <Network size={15}/>}<span>{tr(t.key==="resources" ? "资源" : "延迟")}</span></Tab>)}</div>
        <div className="detail-ranges" role="group" aria-label={tr("时间范围")}>{RANGES_FOR[tab].map(r=><Tab key={r.hours} label={tr(r.label)} active={hours===r.hours} onClick={()=>onHours(r.hours)}>{r.hours===168 ? "7d" : `${r.hours}h`}</Tab>)}</div>
        {tab === "latency" && <label className="detail-smooth" title={tr("平滑仅改变图线显示，不修改原始数据。")}><input type="checkbox" aria-label={tr("平滑显示")} checked={smooth} onChange={e=>onSmooth(e.target.checked)}/><Waves size={16} aria-hidden="true"/>{tr("平滑")}</label>}
        {tab === "latency" && hasProbes && <div className="probe-actions"><button aria-label={tr("首页线路")} title={tr("首页线路")} onClick={()=>onProbes("home")}><Home size={16}/></button><button aria-label={tr("显示全部线路")} title={tr("显示全部线路")} onClick={()=>onProbes("all")}><Eye size={16}/></button><button aria-label={tr("隐藏全部线路")} title={tr("隐藏全部线路")} onClick={()=>onProbes("none")}><EyeOff size={16}/></button></div>}
        <button className="detail-refresh" aria-label={tr("刷新历史")} title={updated?tr("最后成功获取：{0}",new Date(updated).toLocaleString(locale())):tr("刷新历史")} onClick={onRefresh}><RefreshCw size={16}/></button>
      </div>
)
}
