import {RefreshCw,Activity,Network} from 'lucide-react'
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
export function DetailToolbar({busy,updated,failed,tab,hours,onTab,onHours,onRefresh}:{busy:boolean;updated:number|null;failed:boolean;tab:HistoryTab;hours:number;onTab:(tab:HistoryTab)=>void;onHours:(hours:number)=>void;onRefresh:()=>void}){
 return (      <><div id="latency" className="detail-chart-toolbar">
        <div className="detail-tabs" role="group" aria-label={tr("图表类型")}>{TABS.map(t=><Tab key={t.key} label={tr(t.label)} active={tab===t.key} onClick={()=>onTab(t.key)}>{t.key==="resources" ? <Activity size={15}/> : <Network size={15}/>}<span>{tr(t.key==="resources" ? "资源" : "延迟")}</span></Tab>)}</div>
        <span className="detail-update" data-failed={failed} title={updated?tr("最后成功获取：{0}",new Date(updated).toLocaleString(locale())):undefined}>{busy?tr("正在更新"):failed?(updated?tr("保留上次记录"):tr("更新失败")):updated?tr("更新于 {0}",new Date(updated).toLocaleTimeString(locale(),{hour:"2-digit",minute:"2-digit",second:"2-digit"})):tr("等待数据")}</span><div className="detail-ranges" role="group" aria-label={tr("时间范围")}>{RANGES_FOR[tab].map(r=><Tab key={r.hours} label={tr(r.label)} active={hours===r.hours} onClick={()=>onHours(r.hours)}>{r.hours===168 ? "7d" : `${r.hours}h`}</Tab>)}</div>
        <button className="detail-refresh" disabled={busy} aria-busy={busy} aria-label={tr("刷新历史")} title={updated?tr("最后成功获取：{0}",new Date(updated).toLocaleString(locale())):tr("刷新历史")} onClick={onRefresh}><RefreshCw size={16}/></button>
      </div></>
 )
 }
