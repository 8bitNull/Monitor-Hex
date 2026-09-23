import type {OpenRoutes} from '@/lib/routeSelection'
import {liveMetrics} from '@/lib/freshness'
import {RemarkTags} from './RemarkTags'
import {SpeedIndicators} from './SpeedIndicators'
import {ResourceMetric} from './ResourceMetric'
import {Status} from './NodeIdentity'
import { tr, locale } from '../lib/i18n.ts'
import { Clock3, Server,  ArrowDownUp, CalendarDays } from 'lucide-react';
import type { Node } from '@/lib/api';
import type { Preferences, CardInfo } from '@/lib/appearance';
import { Flag, OsIcon } from './NodeIcons';
import { PingStats } from '@/components/PingStats';
import { bytes, daysUntil, FOREVER, osName, pair, percent, uptime, money, CYCLES } from '@/lib/format';
import { trafficPeriodLabel, trafficUsage, nextTrafficReset } from '@/lib/traffic';
export function NodeCard({ node, onOpen, onOpenRoutes, probe = 'auto', prefs, info = prefs.cardInfo }: {
    node: Node;
    onOpen: () => void;
    onOpenRoutes: (route:OpenRoutes) => void;
    probe?: string;
    prefs: Preferences;
    info?: CardInfo;
    mobile?: boolean;
}) {
    const notes = (info.remarks ? node.remark ?? "" : "").split(/[;；]/).map(text=>text.trim()).filter(Boolean);
    const m = liveMetrics(node);
    const traffic = trafficUsage(node);
    const used = traffic.value;
    const trafficLabel = tr(trafficPeriodLabel(node));
    const trafficHint = tr("流量周期：每月 {0} 日重置，本周期自 {1} 起", traffic.resetDay, traffic.periodKey);
    const quotaPercent = node.traffic_limit > 0 ? used / node.traffic_limit * 100 : null;
    const quotaState = quotaPercent === null ? 'unlimited' : quotaPercent > 100 ? 'over' : quotaPercent >= 80 ? 'near' : 'normal';
    const nextReset = nextTrafficReset(node.traffic_reset_day);
    const days = daysUntil(node.expires_at);
    const expiry = days === null ? tr("未设到期") : days < 0 ? tr("已到期") : days === 0 ? tr("今天到期") : tr("剩余 {0} 天", days);
    const hasSecondary = info.uptime || (info.price && node.price > 0) || notes.length > 0;
    const secondary = hasSecondary && <div className="node-secondary"><section className="node-more" aria-label={tr("更多信息")}>
      {(info.uptime || (info.price && node.price > 0)) && <div className="node-timing">
        {info.uptime && <span title={tr("在线时长")}><Clock3 size={14}/><b>{m ? uptime(m.uptime) : '—'}</b></span>}
        {info.price && node.price > 0 && <span className="tag node-price">{money(node.price, node.currency)} / {tr(Object.hasOwn(CYCLES, node.billing_cycle) ? CYCLES[node.billing_cycle] : node.billing_cycle)}</span>}
      </div>}
      {notes.length > 0 && <div className="node-footer"><div className={`node-remarks${notes.length<=3&&notes.every(text=>Array.from(text).length<=10)?" short-remarks":""}`} aria-label={tr("备注")}><RemarkTags texts={notes}/></div></div>}
    </section></div>;
    return <article data-density={prefs.layout==='compact'?'overview':'full'} data-indicator={prefs.graph} className={`node-card compact-network-card graphic-card ${!node.online ? 'node-offline' : ''}`}>
    <button data-node-id={node.id} className="node-open" onClick={onOpen} aria-label={tr("查看 {0}", node.name)}>
      <div className="node-heading"><div className="node-symbol">{node.country ? (prefs.icons ? <Flag code={node.country} key={node.country}/> : node.country) : <Server size={20}/>}</div><div className="node-identity"><h3 title={node.name}>{node.name}</h3><p>{prefs.icons && node.os && <OsIcon os={node.os} key={node.os}/>}{node.os ? osName(node.os) : tr("等待首次上报")}</p></div><div className="node-status-group">{(node.ipv4 || node.ipv4_pin || node.ipv6 || node.ipv6_pin) && <div className="node-ip-tags" aria-label={tr("IP 协议")} >{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div>}<Status node={node}/></div></div>


      <div className="resources"><ResourceMetric label="CPU" value={m?.cpu ?? null} foot={tr("{0} 核", node.cpu_cores)}/><ResourceMetric label={tr("内存")} value={m ? percent(m.mem_used, m.mem_total) : null} foot={m ? (prefs.showTotals ? pair(m.mem_used, m.mem_total) : bytes(m.mem_used)) : tr("容量 {0}", bytes(node.mem_total))}/><ResourceMetric label={tr("硬盘")} value={m ? percent(m.disk_used, m.disk_total) : null} foot={m ? (prefs.showTotals ? pair(m.disk_used, m.disk_total) : bytes(m.disk_used)) : tr("容量 {0}", bytes(node.disk_total))}/><ResourceMetric label={tr("负载")} value={m && node.cpu_cores > 0 ? m.load[0] / node.cpu_cores * 100 : null} displayValue={m ? m.load[0].toFixed(2) : "—"} foot={tr("1 分钟 · {0} 核",node.cpu_cores)}/></div>
      <div className="card-network">
        <SpeedIndicators key={node.id} node={node}/>
        {info.connections && <div className="node-connections">{([['TCP',m?.tcp],['UDP',m?.udp]] as const).map(([label,value])=><div key={label}><span>{label}</span><b>{value === undefined ? '—' : value.toLocaleString()}</b></div>)}</div>}
        {(info.traffic || info.expiry) && <div className="card-billing">
          {info.traffic && <div className="network-box traffic-summary" data-quota-state={quotaState} title={trafficHint}><div><span className="billing-label"><ArrowDownUp size={13} aria-hidden="true"/><small>{trafficLabel}</small></span><b>{bytes(used)} <small>/ {node.traffic_limit > 0 ? bytes(node.traffic_limit) : FOREVER}</small></b></div>{quotaPercent !== null ? <div className="quota-meter"><div className="quota" role="progressbar" aria-label={tr("流量额度使用率")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,quotaPercent))} aria-valuetext={`${quotaPercent.toFixed(1)}%`}><i style={{width:`${Math.min(100,Math.max(0,quotaPercent))}%`}}/></div><span className="quota-percent">{Number(quotaPercent.toFixed(1))}%</span></div> : nextReset && <small className="traffic-reset">{tr("{0}重置",nextReset.toLocaleDateString(locale(),{month:'numeric',day:'numeric'}))}</small>}</div>}
          {info.expiry && <div className={`card-expiry ${days !== null && days <= 7 ? 'expiring' : ''}`} data-expiry-state={days===null?'unknown':days<0?'expired':days<=7?'soon':'normal'}><span className="billing-label"><CalendarDays size={13} aria-hidden="true"/>{tr("到期时间")}</span><b>{days !== null && node.expires_at ? node.expires_at.replaceAll('-','.') : '—'}</b><small>{days!==null&&days>=0&&days<=7&&<i className="expiry-dot" aria-hidden="true"/>}{expiry}</small></div>}
        </div>}
      </div>
    </button>
      <PingStats scale={prefs.latencyScale} latencyWindow={prefs.latencyWindow} warn={prefs.latencyWarn} high={prefs.latencyHigh} count={prefs.homeRoutes} online={node.online} id={node.id} probe={probe} onOpenRoutes={onOpenRoutes}/>
      {secondary}
  </article>;
}
