import {DetailIdentity,DetailLiveOverview} from './DetailOverview'
import {DetailFacts} from './DetailFacts'
import {ResourceHistory,type ResourceMetricKey} from './ResourceHistory'
import {DetailToolbar,type HistoryTab} from './DetailToolbar'
import {useNodeProbe} from '@/lib/nodeProbes'
import {primaryPing} from '@/lib/browse'
import { probeCatalog, windowLoss } from '@/lib/ping'
import { tr, locale } from '../lib/i18n.ts'
import { useEffect, useMemo, useState } from "react";
import { median } from "d3-array";
import { Area, Brush, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Node } from "@/lib/api";
import { clockFor, timeTicks, } from "@/lib/format";
type Point = {
    ts: number;
    cpu: number;
    mem_used: number;
    disk_used: number;
    net_rx: number;
    net_tx: number;
};
// `latency` is the bucket's median round trip, null when every probe in it timed
// out. `band` is the range its answers spanned, absent when they spanned nothing.
// `loss` is the percentage that timed out, absent when none did.
type PingPoint = {
    task_id: number;
    ts: number;
    latency: number | null;
    band?: [
        number,
        number
    ];
    loss?: number;
};
/** Probe names by id, sent alongside the samples they label. */
type Probes = Record<string, string>;
/**
 * Proportion of the whole window each probe lost, by id, absent for probes that
 * lost nothing. Sent because it cannot be derived here: every bucket's `loss` is
 * already a percentage of that bucket, so the sample counts it was divided by are
 * unavailable. Averaging them would weight a bucket holding one sample equally
 * with one holding twelve, and the window's first and last buckets are partial
 * regardless of what the probe does.
 */
type Loss = Record<string, number>;
const AXIS = { stroke: "currentColor", fontSize: 11, tickLine: false, axisLine: false };
// No grow-in animation: it would spend 1.5 s drawing a line across the panel on
// every range change, on a page meant to be read at a glance, and on the latency
// chart across seven hundred points per probe.
const SERIES = { dot: false as const, strokeWidth: 1.7, isAnimationActive: false };
// Stable colours identify routes across time windows.
const PALETTE = [
    { stroke: "var(--color-chart-1)" },
    { stroke: "var(--color-chart-3)" },
    { stroke: "var(--color-chart-2)" },
    { stroke: "var(--color-chart-4)" },
    { stroke: "var(--color-chart-5)" },
];
/**
 * Hampel filter (Hampel 1974; MATLAB ships it as `hampel`). A point more than
 * `sigmas` robust deviations from its window's median is replaced by that median,
 * while everything else passes through unchanged, which is what distinguishes it
 * from a rolling median or a moving average.
 *
 * 1.4826 rescales the median absolute deviation to a standard deviation for
 * normally distributed data; 3 sigma is the conventional cut.
 */
function despike(points: PingPoint[], window = 7, sigmas = 3): PingPoint[] {
    const half = window >> 1;
    // ponytail: recomputes the window per point. A few thousand samples is
    // negligible; substitute a rolling structure if a chart ever needs 100k.
    return points.map((p, i) => {
        // A timeout is a gap rather than a high reading: neither smoothed, nor counted
        // towards what its neighbours are compared against.
        if (p.latency === null)
            return p;
        const near = points
            .slice(Math.max(0, i - half), i + half + 1)
            .map((x) => x.latency)
            .filter((v) => v !== null);
        const mid = median(near) ?? p.latency;
        const mad = median(near.map((v) => Math.abs(v - mid))) ?? 0;
        const outlier = mad > 0 && Math.abs(p.latency - mid) > sigmas * 1.4826 * mad;
        return outlier ? { ...p, latency: mid } : p;
    });
}
export function NodeDetail({ node, probe = "auto", nodes, onSwitch }: {
    node: Node;
    probe?:string;
    nodes:Node[];
    onSwitch:(id:number)=>void;
}) {
    const [tab, setTab] = useState<HistoryTab>(()=>location.hash === "#latency" ? "latency" : "resources");
    // Each tab keeps its own range: a 7-day trend and a 1-hour trace answer
    // different questions.
    const params=new URLSearchParams(location.search);
    const eventStart=Number(params.get('eventStart'))||0,eventEnd=Number(params.get('eventEnd'))||eventStart;
    const age=(Date.now()-eventStart)/3600000;
    const eventRange=[1,6,24,168].find(h=>h>=age)??168;
    const initialMetric=params.get('metric') as ResourceMetricKey;
    const [resourceMetric,setResourceMetric]=useState<ResourceMetricKey>(['cpu','mem_used','disk_used','network'].includes(initialMetric)?initialMetric:'cpu');
    const [ranges, setRanges] = useState({ resources:eventStart?eventRange:([1,6,24,168].includes(Number(params.get("rh")))?Number(params.get("rh")):6), latency:[1,6,24].includes(Number(params.get("lh")))?Number(params.get("lh")):6 });
    const hours = ranges[tab];
    const [retry, setRetry] = useState(0);
    const [smooth, setSmooth] = useState(false);
    useEffect(()=>{if(location.hash === "#latency"){const frame=requestAnimationFrame(()=>document.getElementById("latency")?.scrollIntoView());return ()=>cancelAnimationFrame(frame)}},[]);
    // Probes switched off. Hiding a slow one is what makes the fast ones readable,
    // as the axis rescales to what remains.
    const choice = useNodeProbe(node.id,probe);
    const [highlightProbe, setHighlightProbe] = useState<number | null>(null);
    const [selectedProbes, setSelectedProbes] = useState<number[] | null>(()=>params.has("routes")?params.get("routes")!.split(",").map(Number).filter(n=>Number.isInteger(n)&&n>0):null);
    const [data, setData] = useState<{
        metrics: Point[];
        ping: PingPoint[];
        probes: Probes;
        loss?: Loss;
    } | null>(null);
    // Retained rather than folded into an empty result: a refused request and an
    // empty window are different answers, and the hub has reason to refuse this one
    // -- it caps how many history windows it builds concurrently, since each holds
    // the connection the agents report through. Rendered as an empty window, a 503
    // would misdirect the reader.
    const [failed, setFailed] = useState("");
    const [updated,setUpdated]=useState<number|null>(null);
    useEffect(()=>{const q=new URLSearchParams(location.search);q.set('rh',String(ranges.resources));q.set('lh',String(ranges.latency));q.set('metric',resourceMetric);if(selectedProbes===null)q.delete('routes');else q.set('routes',selectedProbes.join(','));history.replaceState({},'',location.pathname+'?'+q+(tab==='latency'?'#latency':''))},[ranges,resourceMetric,selectedProbes,tab]);
    // Where the brush has been dragged, so the axis reticks for the visible span
    // rather than retaining the whole window's ticks.
    const [zoom, setZoom] = useState<[
        number,
        number
    ] | null>(null);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        // The charts must not continue drawing the old range while the new one is in
        // flight.
        // oxlint-disable-next-line react/set-state-in-effect
        setData(null);
        // oxlint-disable-next-line react/set-state-in-effect
        setZoom(null);
        // oxlint-disable-next-line react/set-state-in-effect
        setFailed("");
        // What this screen can resolve, in device pixels, which is the unit the line
        // is drawn in: a 1280-wide retina panel has 2560 of them for a day of minutes.
        // Read here rather than from a ref, since the hub only thins further, an
        // approximate figure suffices, and the viewport is known before layout. A
        // rotation keeps whatever it fetched with.
        //
        // The tab determines which half is requested; the other accounted for a third
        // to two thirds of every response and was never drawn.
        const points = Math.round(globalThis.innerWidth * (globalThis.devicePixelRatio || 1));
        const series = tab === "latency" ? "ping" : "metrics";
        api<{
            metrics: Point[];
            ping: PingPoint[];
            probes: Probes;
            loss?: Loss;
        }>(`/nodes/${node.id}/metrics?hours=${hours}&points=${points}&series=${series}`, { signal: controller.signal, cache: 'no-store' })
            .then((next) => { clearTimeout(timeout); if (active) {setData(next);setUpdated(Date.now());} })
            .catch((e: Error) => {
            // `|| "..."` as in App.tsx: HTTP/2 dropped statusText, so a bodiless
            // failure from a proxy arrives as the empty string and renders as no
            // error.
            clearTimeout(timeout);
            if (active) {
                setFailed(e.message || tr("网络错误"));
                setData({ metrics: [], ping: [], probes: {} });
            }
        });
        return () => { active = false; clearTimeout(timeout); controller.abort(); };
    }, [node.id, hours, tab, retry]);
    // One series per probe that reported, labelled from the names the samples
    // arrived with. Memoised, as are the two below: the node prop changes every few
    // seconds as live metrics arrive, and rebuilding the chart's data array on those
    // renders would reset the brush.
    const pingSeries = useMemo(() => data ? probeCatalog(data).map(({id,name})=>({
        id, name, points: (data.ping ?? []).filter(p=>p.task_id===id).sort((a,b)=>a.ts-b.ts), loss:windowLoss(data,id)
    })) : [], [data]);
    // The hub answers in seconds; the time axis requires milliseconds.
    const metricRows = useMemo(() => (data?.metrics ?? []).map((m) => ({ ...m, ts: m.ts * 1000 })), [data]);
    const defaultProbe = choice.probe === "auto" ? primaryPing(node.id,probe)?.id ?? pingSeries.find(s=>s.points.length)?.id : Number(choice.probe);
    const visibleIds = selectedProbes ?? (defaultProbe === undefined ? [] : [defaultProbe]);
    const shownProbes = pingSeries.filter(s=>visibleIds.includes(s.id));
    // The same probe ID retains its colour when the time window/catalog changes.
    const style = (id:number) => PALETTE[(id-1) % PALETTE.length];
    // The hub stamps every sample with its bucket rather than the second the probe
    // finished, so probes reporting at the bucket's rate share rows instead of each
    // contributing its own: a day of four probes is 717 rows rather than 2,868. A
    // slower probe leaves gaps in its own column. Keep these gaps visible.
    //
    // Every probe and both versions of every sample are held here whether or not
    // they are on screen: recharts resets the brush when the data array changes
    // identity, and re-reads a controlled selection only when the index props
    // change, which they do not. Hiding a probe or enabling despiking therefore
    // selects a `dataKey` rather than rebuilding the array.
    const pingRows = useMemo(() => {
        const rows = new Map<number, {
            ts: number;
        } & Record<string, number | [
            number,
            number
        ] | null>>();
        for (const s of pingSeries) {
            const smoothed = despike(s.points);
            s.points.forEach((p, i) => {
                const previous=s.points[i-1];
                if(previous && p.ts-previous.ts>7200){const gap=(previous.ts+p.ts)/2;const missing=rows.get(gap)??{ts:gap*1000};missing[`t${s.id}`]=null;missing[`s${s.id}`]=null;missing[`b${s.id}`]=null;rows.set(gap,missing)}
                const row = rows.get(p.ts) ?? { ts: p.ts * 1000 };
                row[`t${s.id}`] = p.latency;
                row[`s${s.id}`] = smoothed[i].latency;
                row[`l${s.id}`] = typeof p.loss === "number" && Number.isFinite(p.loss) && p.loss >= 0 && p.loss <= 100 ? p.loss : null;
                // Raw, never despiked: the band exists to show what the line omits, and
                // smoothing it would omit the same points.
                row[`b${s.id}`] = p.band ?? null;
                rows.set(p.ts, row);
            });
        }
        return [...rows.values()].sort((a, b) => a.ts - b.ts);
    }, [pingSeries]);
    // A real time axis rather than the category axis recharts defaults to: on a
    // category axis ticks are selected by index, so a period the agent was offline
    // for collapses to nothing.
    const timeAxis = (rows: {
        ts: number;
    }[], from = 0, to = rows.length - 1) => ({
        dataKey: "ts",
        type: "number" as const,
        domain: ["dataMin", "dataMax"] as const,
        // Explicit, or recharts places them at 05:14 and 10:22. Any that still collide
        // are dropped by `minTickGap`.
        ticks: rows.length ? timeTicks(rows[from].ts, rows[to].ts) : undefined,
        tickFormatter: clockFor(hours),
        minTickGap: hours > 24 ? 72 : 40,
        ...AXIS,
    });
    return (<div className="node-detail">
      <DetailIdentity node={node} nodes={nodes} onSwitch={onSwitch}/>
      <div className="detail-workspace">
      <DetailLiveOverview node={node}/>
      <section className="detail-history" aria-label={tr("历史图表")}>
      <DetailToolbar updated={updated} tab={tab} hours={hours} smooth={smooth} hasProbes={pingSeries.length>0} onTab={setTab} onHours={value=>setRanges(all=>({...all,[tab]:value}))} onSmooth={setSmooth} onProbes={mode=>{setHighlightProbe(null);setSelectedProbes(mode==='home'?null:mode==='all'?pingSeries.map(s=>s.id):[])}} onRefresh={()=>setRetry(n=>n+1)}/>
      {eventStart>0&&<p className="event-context">{tr('告警时段：{0} — {1}',new Date(eventStart).toLocaleString(locale()),new Date(eventEnd).toLocaleString(locale()))}{age>168||hours<age?<span>{tr('当前历史范围无法覆盖完整告警时段。')}</span>:data&&!(data.metrics??[]).some(p=>p.ts*1000>=eventStart&&p.ts*1000<=eventEnd)?<span>{tr('此告警时段没有返回历史样本。')}</span>:null}</p>}
      <div className="detail-history-body" data-history={tab}>
      {!data ? (<Skeleton className="h-40 w-full"/>) : failed ? (<p className="py-8 text-center text-sm text-destructive" role="alert">{tr("读取历史数据失败：")}{failed}<button className="detail-refresh" onClick={() => setRetry(n => n + 1)}>{tr("重试")}</button></p>) : tab === "latency" ? (pingSeries.length === 0 ? (<p className="py-8 text-center text-sm text-muted-foreground">{tr("这段时间没有延迟数据")}</p>) : (
        <div className="latency-view">
            <div className="detail-probe-legend">

              <div className="probe-options">{pingSeries.map(s=>{
                const shown=visibleIds.includes(s.id), latest=s.points.at(-1);
                return <button key={s.id} aria-label={s.name} title={tr("丢包统计范围：{0} 小时",hours)} aria-pressed={shown} onMouseEnter={()=>setHighlightProbe(s.id)} onMouseLeave={()=>setHighlightProbe(null)} onFocus={()=>setHighlightProbe(s.id)} onBlur={()=>setHighlightProbe(null)} onClick={()=>setSelectedProbes(shown ? visibleIds.filter(id=>id!==s.id) : [...visibleIds,s.id])}>
                  <svg width="16" height="6" aria-hidden="true"><line x1="0" y1="3" x2="16" y2="3" stroke={style(s.id).stroke} strokeWidth="2"/></svg>
                  <span className="probe-label">{s.name}</span>
                  <b style={{color:style(s.id).stroke}}>{!latest ? tr("暂无探测记录") : latest.latency === null ? tr("超时") : `${Math.round(latest.latency)} ms`}</b>
                  <span title={tr("丢包统计范围：{0} 小时",hours)} aria-label={tr("丢")}>{tr("丢包")} {s.loss===null || !latest ? '—' : `${s.loss.toFixed(1)}%`}</span>{latest && Date.now()/1000-latest.ts>7200 && <span className="ping-stale">{tr("较旧记录")}</span>}
                </button>;
              })}</div>
            </div>

            <div className="detail-chart-frame text-muted-foreground">
              {shownProbes.length === 0 ? (<p className="py-8 text-center text-sm">{(selectedProbes?.length || selectedProbes === null && choice.probe !== "auto") ? tr("无该线路记录") : tr("没有选中任何探测")}</p>) : !shownProbes.some(s=>s.points.length) ? <p className="py-8 text-center text-sm">{tr("这段时间没有延迟数据")}</p> : (<ResponsiveContainer>
                  <ComposedChart data={pingRows}>
                    <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false}/>
                    <XAxis {...timeAxis(pingRows, Math.min(zoom?.[0] ?? 0, pingRows.length - 1), Math.min(zoom?.[1] ?? pingRows.length - 1, pingRows.length - 1))}/>
                    {/* Not anchored at zero: these lines live in a narrow band
                    far from it, and zero flattens every wobble. */}
                    <YAxis unit="ms" width={52} domain={["auto", "auto"]} {...AXIS}/>
                    <Tooltip allowEscapeViewBox={{x:false,y:false}} cursor={{stroke:"var(--border)",strokeDasharray:"3 4"}} isAnimationActive={false} labelFormatter={(ts) => new Date(Number(ts)).toLocaleString(locale())}
            // The line is drawn from what answered, so without this a
            // bucket that lost most of its packets reads as normal.
            // `dataKey` is `t7`/`s7`; the loss sits at `l7`.
            formatter={(v, name, item) => {
                    const loss = item?.payload?.[`l${String(item.dataKey).slice(1)}`];
                    return [`${Number(v)} ms${loss == null ? ` · ${tr("丢")} —` : loss > 0 ? tr(" \u00B7 丢 {0}%", loss) : ""}`, name];
                }} contentStyle={{ fontSize: 12 }}/>
                    {/* Behind the line, the range that bucket's answers
                    spanned -- Smokeping's "smoke". At the day window a
                    bucket moves 63 ms at the 90th percentile against the
                    25 ms the trend moves, so a line alone draws the smaller
                    of the two.

                    Only with one probe on screen: rendered for four, the
                    bands overlap into a fog and their extremes drag the
                    axis from 165-385 out to 140-420. */}
                    {shownProbes.length === 1 &&
                    shownProbes.map((s) => (<Area key={`band${s.id}`} dataKey={`b${s.id}`} stroke="none" fill={style(s.id).stroke} fillOpacity={0.10} isAnimationActive={false} tooltipType="none" legendType="none" connectNulls={false}/>))}
                    {shownProbes.map((s) => (<Line key={s.id} dataKey={`${smooth ? "s" : "t"}${s.id}`} name={s.name} stroke={style(s.id).stroke} {...SERIES} strokeOpacity={highlightProbe!==null && visibleIds.includes(highlightProbe) && highlightProbe!==s.id ? 0.2 : 1} onMouseEnter={()=>setHighlightProbe(s.id)} onMouseLeave={()=>setHighlightProbe(null)} connectNulls={false}/>))}
                    {/* Drag either handle to zoom into a stretch of the trend. */}
                    <Brush dataKey="ts" height={22} travellerWidth={8} tickFormatter={clockFor(hours)} fill="var(--muted)" className="fill-muted" stroke="var(--color-muted-foreground)" onChange={(r) => setZoom([r.startIndex ?? 0, r.endIndex ?? pingRows.length - 1])}/>
                  </ComposedChart>
                </ResponsiveContainer>)}
            </div>

          </div>)) : (data.metrics ?? []).length === 0 ? (<p className="py-8 text-center text-sm text-muted-foreground">{tr("这段时间没有历史数据")}</p>) : (<ResourceHistory rows={metricRows} node={node} hours={hours} metric={resourceMetric} onMetric={setResourceMetric}/>)}
      </div></section>

      <DetailFacts node={node}/>
      </div>
    </div>);
}
