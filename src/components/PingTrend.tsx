import { tr, locale } from '../lib/i18n.ts'
import { useId, useState } from 'react';
import type { PingPoint } from '@/lib/ping';
export function PingTrend({ rows, inline = false }: {
    inline?: boolean;
    rows: PingPoint[];
}) {
    const [opened, setOpened] = useState(false);
    const panelId = useId();
    const values = rows.filter(p => p.latency !== null);
    const top = Math.max(1, ...values.map(p => p.latency!));
    const start = rows[0]?.ts || 0, span = Math.max(1, (rows.at(-1)?.ts || 0) - start);
    const x = (p: PingPoint) => 8 + (p.ts - start) / span * 264;
    const y = (p: PingPoint) => 68 - p.latency! / top * 56;

    return <div className={`ping-trend ${inline ? "inline-trend" : ""}`}>
    {!inline && <button type="button" aria-expanded={opened} aria-controls={panelId} onClick={() => setOpened(!opened)}>{tr("历史曲线")}</button>}
    {(inline || opened) && <div id={panelId} className="ping-trend-panel">
      <p>{tr("24h 窗口内采样 \u00B7")}{values.length ? tr("纵轴上限 {0} ms", Math.ceil(top)) : tr("全部超时")}</p>
      <svg preserveAspectRatio={inline ? "none" : undefined} viewBox="0 0 280 80" role="img" aria-label={tr("探测延迟历史曲线")}>
        <title>{tr("纵轴上限 {0} ms", Math.ceil(top))}</title>
        {rows.map((p, i) => {
                const prev = rows[i - 1];
                return p.latency === null ? <path key={i} d={`M${x(p) - 2},65 l4,8 m0,-8 l-4,8`} stroke="var(--destructive)"/> : <g key={i}>
            {prev?.latency !== null && prev && p.ts - prev.ts <= 7200 && <line x1={x(prev)} y1={y(prev)} x2={x(p)} y2={y(p)} stroke="var(--tone)" strokeWidth={inline ? 1.5 : 1} vectorEffect="non-scaling-stroke"/>}
            <circle cx={x(p)} cy={y(p)} r="2" fill="var(--tone)"><title>{new Date(p.ts * 1000).toLocaleString(locale())} · {p.latency} ms</title></circle>
          </g>;
            })}
      </svg>
      <p>{new Date(start * 1000).toLocaleString(locale())} — {new Date((rows.at(-1)?.ts || 0) * 1000).toLocaleString(locale())}</p>
      <p>{tr("横轴按采样时间；红叉为超时，长缺口断开。")}</p>
    </div>}
  </div>;
}
