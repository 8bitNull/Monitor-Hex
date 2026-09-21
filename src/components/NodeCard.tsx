import {liveMetrics} from '@/lib/freshness'
import {RemarkTags} from './RemarkTags'
import {SpeedIndicators} from './SpeedIndicators'
import {ResourceMetric} from './ResourceMetric'
import {Status} from './NodeIdentity'
import { tr } from '../lib/i18n.ts'
import { Clock3, Server, CalendarDays, ArrowUpRight, Network, ChevronDown } from 'lucide-react';
import type { Node } from '@/lib/api';
import type { Preferences, CardInfo } from '@/lib/appearance';
import { Flag, OsIcon } from './NodeIcons';
import { PingStats } from '@/components/PingStats';
import { bytes, daysUntil, FOREVER, osName, pair, percent, uptime, money, CYCLES } from '@/lib/format';
export function NodeCard({ node, onOpen, onOpenRoutes, probe = 'auto', prefs, info = prefs.cardInfo, mobile = false }: {
    node: Node;
    onOpen: () => void;
    onOpenRoutes: (route?:number) => void;
    probe?: string;
    prefs: Preferences;
    info?: CardInfo;
    mobile?: boolean;
}) {
    const notes = (info.remarks ? node.remark ?? "" : "").split(/[;；]/).map(text=>text.trim()).filter(Boolean);
    const m = liveMetrics(node);
    const used = node.traffic_mode === 'up' ? node.month_tx : node.traffic_mode === 'down' ? node.month_rx : node.traffic_mode === 'max' ? Math.max(node.month_rx, node.month_tx) : node.month_rx + node.month_tx;
    const days = daysUntil(node.expires_at);
    const expiry = days === null ? tr("未设到期") : days < 0 ? tr("已过期 {0} 天", -days) : tr("{0} 天后到期", days);
    const hasSecondary = info.traffic || info.connections || info.uptime || (info.expiry && days !== null) || (info.price && node.price > 0) || notes.length > 0;
    const secondary = hasSecondary && <div className="node-secondary">
      {info.traffic && <div className="network-box traffic-summary"><div><span><CalendarDays size={14}/><small>{tr("本月用量")}</small></span><b>{bytes(used)} / {node.traffic_limit > 0 ? bytes(node.traffic_limit) : FOREVER}</b></div>{node.traffic_limit > 0 && <div className="quota"><i style={{ width: `${Math.min(100, percent(used, node.traffic_limit))}%` }}/></div>}</div>}
      {info.connections && <div className="node-connections">{([ ["TCP",m?.tcp], ["UDP",m?.udp] ] as const).map(([label,value])=><div key={label}><span><Network size={14}/>{label}</span><b>{value === undefined ? "—" : value.toLocaleString()}</b></div>)}</div>}
      {(info.uptime || (info.expiry && days!==null) || (info.price && node.price>0) || notes.length>0) && <section className="node-more" aria-label={tr("更多信息")}>
      {(info.uptime || (info.expiry && days!==null)) && <div className="node-timing">{info.uptime && <span title={tr("在线时长")}><Clock3 size={14}/><b>{m ? uptime(m.uptime) : '—'}</b></span>}{info.expiry && days !== null && <span className={days <= 7 ? 'expiring' : ''}><CalendarDays size={14}/><b>{expiry}</b></span>}</div>}
      {((info.price && node.price > 0) || notes.length > 0) && <div className="node-footer">{info.price && node.price > 0 && <span className="tag node-price">{money(node.price, node.currency)} / {tr(Object.hasOwn(CYCLES, node.billing_cycle) ? CYCLES[node.billing_cycle] : node.billing_cycle)}</span>}{notes.length > 0 && <div className="node-remarks" aria-label={tr("备注")}><RemarkTags texts={notes.slice(0,3)} compact/>{(notes.length>3 || notes.some(text=>Array.from(text).length>24)) && <button className="remark-more" onClick={onOpen} aria-label={tr("查看完整备注")} title={tr("查看完整备注")}>{notes.length>3?`+${notes.length-3}`:<ArrowUpRight size={14}/>}</button>}</div>}</div>}
      </section>}
    </div>;
    return <article data-indicator={prefs.graph} className={`node-card graphic-card ${!node.online ? 'node-offline' : ''}`}>
    <button data-node-id={node.id} className="node-open" onClick={onOpen} aria-label={tr("查看 {0}", node.name)}>
      <div className="node-heading"><div className="node-symbol">{node.country ? (prefs.icons ? <Flag code={node.country} key={node.country}/> : node.country) : <Server size={20}/>}</div><div className="node-identity"><h3 title={node.name}>{node.name}</h3><p>{prefs.icons && node.os && <OsIcon os={node.os} key={node.os}/>}{node.os ? osName(node.os) : tr("等待首次上报")}</p></div><div className="node-status-group">{(node.ipv4 || node.ipv4_pin || node.ipv6 || node.ipv6_pin) && <div className="node-ip-tags" aria-label={tr("IP 协议")} >{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div>}<Status node={node}/></div></div>


      <div className="resources"><ResourceMetric label="CPU" value={m?.cpu ?? null} foot={tr("{0} 核", node.cpu_cores)}/><ResourceMetric label={tr("内存")} value={m ? percent(m.mem_used, m.mem_total) : null} foot={m ? (prefs.showTotals ? pair(m.mem_used, m.mem_total) : bytes(m.mem_used)) : tr("容量 {0}", bytes(node.mem_total))}/><ResourceMetric label={tr("硬盘")} value={m ? percent(m.disk_used, m.disk_total) : null} foot={m ? (prefs.showTotals ? pair(m.disk_used, m.disk_total) : bytes(m.disk_used)) : tr("容量 {0}", bytes(node.disk_total))}/><ResourceMetric label={tr("负载")} value={m && node.cpu_cores > 0 ? m.load[0] / node.cpu_cores * 100 : null} displayValue={m ? m.load[0].toFixed(2) : "—"} foot={tr("1 分钟 · {0} 核",node.cpu_cores)}/></div>
      <SpeedIndicators key={node.id} node={node}/>
    </button>
      <PingStats count={prefs.homeRoutes} online={node.online} id={node.id} probe={probe} onOpenRoutes={onOpenRoutes}/>
      {hasSecondary && (mobile ? <details className="node-secondary-disclosure"><summary><span>{tr("更多信息")}</span><ChevronDown size={16}/></summary>{secondary}</details> : secondary)}

  </article>;
}
