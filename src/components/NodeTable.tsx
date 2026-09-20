import {useEffect,useState} from 'react';
import {useNodeProbe} from '../lib/nodeProbes'
import { tr, locale } from '../lib/i18n.ts'
import type { Node } from '@/lib/api';
import { type Browse, type SortKey, sortLabels, sortValue, primaryPing } from '@/lib/browse';
import { usePing } from '@/lib/usePing';
import { bytes, daysUntil, FOREVER, rate } from '@/lib/format';
import { Status } from './NodeIdentity';
function Latency({ id, probe, online }: {id:number;probe:string;online:boolean}) {
    useNodeProbe(id,probe);
    const { ref, snapshot, retry } = usePing(id);
    const ping = primaryPing(id, probe);
    const stale = ping && Date.now()/1000-ping.latest.ts>7200;
    return <div ref={ref} className="table-ping">
      <div className="table-ping-value" title={ping ? `${tr("采样")}: ${new Date(ping.latest.ts*1000).toLocaleString(locale())}` : undefined}>
      {snapshot?.failed ? <button onClick={retry}>{tr("读取失败 \u00B7 重试")}</button> : !snapshot?.data ? tr("读取中…") : !ping ? tr("无该线路记录") : <><strong>{ping.latest.latency===null?tr("超时"):`${Math.round(ping.latest.latency)} ms`}</strong><small>{tr("24h 丢包")} {ping.loss===null?'—':`${ping.loss.toFixed(1)}%`}</small></>}
      </div>
      {ping && <small className="table-route" title={ping.name}>{ping.name}{!online ? ` · ${tr("历史数据")}` : stale ? ` · ${tr("较旧记录")}` : ''}</small>}
    </div>;
}
function Expiry({date}:{date:string|null}) {
    const days=daysUntil(date);
    const label=days===null ? (date?tr("未知"):tr("未设到期")) : days<0 ? tr("已过期 {0} 天",-days) : days===0 ? tr("今天到期") : tr("{0} 天后到期",days);
    return <div className="table-expiry" data-state={days===null?'unknown':days<0?'expired':days<=7?'soon':'normal'}>{date && <time dateTime={date}>{date}</time>}<small>{label}</small></div>;
}
export function NodeTable({ nodes, browse, onSort, onOpen }: {
    nodes: Node[];
    browse: Browse;
    onSort: (key: SortKey) => void;
    onOpen: (id: number) => void;
}) {
    const [,tick]=useState(0);
    useEffect(()=>{const timer=setInterval(()=>tick(value=>value+1),60000);return()=>clearInterval(timer)},[]);
    const keys = ['name', 'status', ...browse.columns] as SortKey[];
    return <div className="table-scroll" tabIndex={0} role="region" aria-label={tr("节点表格，可横向滚动")}><table className="node-table">
    <thead><tr>{keys.map(key => <th key={key} aria-sort={browse.sort === key ? browse.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button onClick={() => onSort(key)}>{tr(sortLabels[key])}{browse.sort === key ? browse.direction === 'asc' ? ' ↑' : ' ↓' : ''}</button></th>)}</tr></thead>
    <tbody>{nodes.map(n => <tr key={n.id}>{keys.map(key => {
                const v = sortValue(n, key, browse.probe);
                return <td key={key}>{key === 'name' ? <><button data-node-id={n.id} className="table-node-name" onClick={() => onOpen(n.id)}>{n.name}<small>{n.country} · {n.os}</small></button></> : key === 'status' ? <Status node={n}/> : key === 'latency' ? <Latency id={n.id} probe={browse.probe} online={n.online}/> : key === 'traffic' ? <span className="table-traffic">{bytes(Number(v))}<small> / {n.traffic_limit > 0 ? bytes(n.traffic_limit) : FOREVER}</small></span> : key === 'expiry' ? <Expiry date={n.expires_at}/> : v === null ? '—' : key === 'upload' || key === 'download' ? rate(Number(v))  : <div className="table-metric"><span>{Math.round(Number(v))}%</span><progress aria-label={tr(sortLabels[key])} max={100} value={Math.min(100,Math.max(0,Number(v)))}/></div>}</td>;
            })}</tr>)}</tbody>
  </table></div>;
}
