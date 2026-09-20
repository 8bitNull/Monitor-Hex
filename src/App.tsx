import {RegionPicker} from './components/RegionPicker';
import themeManifest from '../theme.json';
import {useLoadAlerts} from './lib/useLoadAlerts';
import {Flag} from './components/NodeIcons';
import {probeRevision,subscribeProbes,clearNodeProbes} from './lib/nodeProbes';
import { tr, locale, getLanguage, subscribeLanguage, setLanguage } from './lib/i18n.ts'
import { readCollection } from '@/lib/collection';
import { groupRegions, systemKey, UNKNOWN_REGION } from '@/lib/groups';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef, useLayoutEffect, useSyncExternalStore } from "react";
import {  Moon, Sun, Wrench, SlidersHorizontal, Globe, LayoutGrid, ArrowLeft, Radio, Table2, Columns3 } from "lucide-react";
import { Preferences } from '@/components/Preferences';
import { usePreferences, useAppearance } from '@/lib/preferences';
import { type Preferences as ThemePreferences, defaults, restoreAppearance } from '@/lib/appearance';
import { Background, useBackground } from '@/components/Background';
import { readBrowse, browseNodes, sortLabels, defaultBrowse, type Browse, type SortKey } from '@/lib/browse';
import { getPing, watchPing, pingRevision, subscribePing, probeCatalog } from '@/lib/ping';
import { NodeTable } from '@/components/NodeTable';
import { NodeCard } from "@/components/NodeCard";
import { Summary } from "@/components/Summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useNodes } from "@/lib/api";
type Me = {
    authed: boolean;
    github: boolean;
    site_name: string;
    public_page: boolean;
};
// Split out because recharts is most of this bundle and the list page draws no
// chart. The landing page is 242 kB rather than 629 kB (77 kB gzipped against
// 188 kB), with the rest fetched immediately after it paints.
const loadDetail = () => import("@/components/NodeDetail").then((m) => ({ default: m.NodeDetail }));
const NodeDetail = lazy(loadDetail);
const WorldMap = lazy(() => import('@/components/WorldMap').then(m => ({ default: m.WorldMap })));
// `/node/{id}` is a real page: it survives a reload, can be linked to, and back
// leaves the detail view rather than the site. The hub serves index.html for any
// unknown path, so no server-side route is required.
function useNodeRoute() {
    const read = () => {
        const match = location.pathname.match(/^\/node\/(\d+)/);
        return match ? Number(match[1]) : null;
    };
    const [id, setId] = useState(read);
    const home = useRef({y:0,node:0});
    const pending = useRef(false);
    useEffect(() => {
        const previous = history.scrollRestoration;
        history.scrollRestoration = 'manual';
        const sync = () => {pending.current = read() === null; setId(read());};
        addEventListener("popstate", sync);
        return () => {removeEventListener("popstate", sync); history.scrollRestoration = previous;};
    }, []);
    useLayoutEffect(() => {
        if (id !== null || !pending.current) return;
        pending.current = false;
        const frame = requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[data-node-id="${home.current.node}"]`)?.focus({preventScroll:true});
            scrollTo(0,home.current.y);
        });
        return () => cancelAnimationFrame(frame);
    }, [id]);
    return [id, (next: number | null, section?: string, query = "") => {
        if (id === null && next !== null) home.current = {y:scrollY,node:next};
        const anchor = section ?? (id !== null && next !== null ? location.hash.slice(1) : "");
        pending.current = next === null;
        history.pushState({}, "", next === null ? "/" : `/node/${next}${query}${anchor ? "#"+anchor : ""}`);
        setId(next);
        if (next !== null) scrollTo(0,0);
    }] as const;
}
export default function App({ siteDefaults = defaults }: {
    siteDefaults?: ThemePreferences;
}) {
    const language = useSyncExternalStore(subscribeLanguage, getLanguage);
    useEffect(() => { document.documentElement.lang = locale() }, [language]);
    const [me, setMe] = useState<Me | null>(null);
    const [meError, setMeError] = useState("");
    const { nodes, error, closed, connection, lastUpdated } = useNodes();
    const [open, go] = useNodeRoute();
    const [prefs, setPrefs] = usePreferences(siteDefaults);
    const loadAlerts=useLoadAlerts(nodes,prefs.modules.busiest);
    useSyncExternalStore(subscribeProbes,probeRevision);
    const dark = useAppearance(prefs.appearance);
    const toggleTheme = () => setPrefs(prev => ({ ...prev, appearance: dark ? 'light' : 'dark' }));
    const background = useBackground(prefs);
    const [settings, setSettings] = useState(false);
    const [system, setSystem] = useState(() => readCollection().system);
    useEffect(() => { try { sessionStorage.setItem('monitor-next-collection-v1', JSON.stringify({ system })) } catch { /* Optional storage. */ } }, [system]);
    const [browseState, setBrowse] = useState<Browse>(() => {const old=readBrowse();return {...old,status:"all",query:"",sort:old.view === "table" ? old.sort : "default",direction:old.view === "table" ? old.direction : "asc"}});
    const browse = useMemo(()=>({...browseState, probe:prefs.probe}),[browseState,prefs.probe]);
    const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 720px)').matches);
    useEffect(() => {
        const media = window.matchMedia('(max-width: 720px)');
        const update = () => setCompactViewport(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    const mapVisible = browse.view === "cards" && prefs.modules.map && !compactViewport;
    const { status, region } = browse;
    const patchBrowse = (patch: Partial<Browse>) => setBrowse(prev => ({ ...prev, ...patch }));
    const setQuery = (query: string) => patchBrowse({ query });
    const setStatus = (status: string) => patchBrowse({ status });
    const setRegion = (region: string) => patchBrowse({ region });
    const pingVersion = useSyncExternalStore(subscribePing, pingRevision);
    useEffect(() => { try {
        sessionStorage.setItem('monitor-next-browse-v1', JSON.stringify(browse));
    }
    catch { /* Optional storage. */ } }, [browse]);
    const sortBy = (key: SortKey) => patchBrowse({ sort: key, direction: browse.sort === key && browse.direction === 'asc' ? 'desc' : 'asc' });
    const nodeIds = (nodes || []).map(n => n.id).join(',');
    useEffect(() => {
        if (!settings && (browse.sort !== 'latency' || open !== null))
            return;
        return watchPing(nodeIds.split(',').filter(Boolean).map(Number));
    }, [browse.sort, nodeIds, open, settings]);
    void pingVersion;
    const loadMe = useCallback(() => {
        // `|| "..."` because an empty message reads as no error: api() falls back to
        // res.statusText, which HTTP/2 and HTTP/3 removed, so a bodiless 502 from a
        // proxy arrives as "". The check below would then take the loading branch and
        // the retry button would never render.
        return api<Me>("/me")
            .then((next) => { setMe(next); setMeError(""); })
            .catch((e: Error) => setMeError(e.message || tr("网络错误")));
    }, []);
    useEffect(() => {
        loadMe();
        // Warmed here rather than left to Suspense, which requests the chunk only
        // once a render reaches the detail view, itself waiting on /me. Without this
        // the split trades its first paint for a full-page skeleton over the first
        // node opened: 2.6s click-to-chart on 4G against 1.4s unsplit, 1.7s warm.
        void loadDetail();
    }, [loadMe]);
    // The status page was closed while this tab was open. `me` holds whatever it
    // reported at load, so it is re-queried; the effect below then directs an
    // anonymous visitor to the panel rather than leaving them on a list that
    // stopped updating with only a red line to explain it.
    useEffect(() => {
        if (closed)
            void loadMe();
    }, [closed, loadMe]);
    useEffect(() => {
        if (me && !me.public_page && !me.authed)
            location.assign('/admin/');
    }, [me]);
    const sorted = [...(nodes ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id);
    const selected = sorted.find((n) => n.id === open);
    const filtered = browseNodes(sorted, browse.view === "cards" ? {...browse,sort:"default"} : browse).filter(n => (system === 'all' || systemKey(n.os) === system));
    const probes = new Map<number, string>();
    sorted.forEach(n => { const d = getPing(n.id)?.data; if (d)
        probeCatalog(d).forEach(p => probes.set(p.id, p.name)); });
    const viewSwitch = <div className="view-switch"><button className={browse.view === 'cards' ? 'active' : ''} onClick={() => patchBrowse({view:'cards'})} aria-label={tr("卡片视图")} aria-pressed={browse.view === 'cards'}><LayoutGrid size={17}/>{tr("卡片")}</button><button className={browse.view === 'table' ? 'active' : ''} onClick={() => patchBrowse({view:'table'})} aria-label={tr("表格视图")} aria-pressed={browse.view === 'table'}><Table2 size={17}/>{tr("表格")}</button></div>;
    // `/node/{id}` is a page people bookmark and share, so the tab needs the node's
    // name. The site name rather than a fixed string, since the hub lets an operator
    // rename the site.
    useEffect(() => {
        // Updating the browser title is intentional here, inside an effect.
        // oxlint-disable-next-line react/immutability
        document.title = [selected?.name, me?.site_name || "Monitor HEX"].filter(Boolean).join(" · ");
    }, [selected?.name, me?.site_name]);
    // Only while there is nothing else to show. Once `me` has loaded, a later
    // failure belongs beside the page rather than over it.
    if (!me)
        return (<div className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">
      {meError ? <div className="space-y-3 text-center"><p role="alert">{tr("加载失败：")}{meError}</p><Button onClick={loadMe}>{tr("重试")}</Button></div> : tr("加载中…")}
    </div>);
    // The status page is closed and nobody is signed in: redirect to the panel.
    if (!me.public_page && !me.authed)
        return null;
    return (<div className="next-theme min-h-svh" data-skin={prefs.skin} data-palette={prefs.palette} data-graph={prefs.graph} data-layout={prefs.layout} data-card-layout={prefs.cardLayout} data-glass={prefs.glass} data-background={background.ready} data-background-type={prefs.backgroundType} style={background.style}>
      {background.ready && <Background url={prefs.backgroundUrl}/>}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          {/* The site name is the way back to the list, so a node page needs
            no back button of its own. */}
          <button className="brand" onClick={() => go(null)}>
            <span>{me.site_name || "Monitor HEX"}<small>MONITOR HEX</small></span>
          </button>
          <div className="flex-1"/>
          <Button variant="ghost" size="icon" onClick={() => setSettings(!settings)} aria-label={tr("外观设置")} aria-expanded={settings}><SlidersHorizontal /></Button>
          {/* The panel is a separate app built into the hub, not part of this
            theme, so this is a navigation rather than a route. */}
          <Button variant="ghost" size="sm" asChild>
            <a href="/admin/">
              <Wrench /> {me.authed ? tr("进入后台") : tr("登录")}
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} title={tr("切换主题")} aria-label={tr("切换明暗模式")}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

        {settings && <Preferences onClose={()=>setSettings(false)} probes={probes} value={prefs} onChange={setPrefs} siteDefaults={siteDefaults} backgroundError={background.error} onReset={scope => {
                setPrefs(scope === 'all' ? { ...siteDefaults, modules: { ...siteDefaults.modules } } : restoreAppearance(prefs, siteDefaults));
                if (scope === 'all') {
                    clearNodeProbes(); setLanguage('zh');
                    setSystem('all');
                    setBrowse({ ...defaultBrowse });
                    try {
                        localStorage.removeItem('monitor-next-rates-v1');
                        localStorage.removeItem('monitor-next-mode');
                        sessionStorage.removeItem('monitor-next-browse-v1');
                    }
                    catch { /* Optional storage. */ }
                }
            }}/>}

      <main key={language} className="mx-auto max-w-[1400px] space-y-5 px-4 py-4 sm:px-6">
        {(error || meError) && <p role="alert" className="error-banner">{tr("连接异常，正在重试。")}{error || meError}</p>}

        {open !== null && selected && <div className="detail-navigation">
          <Button className="detail-back" variant="ghost" aria-label={tr("返回总览")} title={tr("返回总览")} onClick={()=>go(null)}><ArrowLeft/><span>{tr("返回总览")}</span></Button>
        </div>}
        {open !== null ? (!nodes ? (<Skeleton className="h-96"/>) : selected ? (<Suspense fallback={<Skeleton className="h-96"/>}>
              <NodeDetail key={selected.id} node={selected} probe={prefs.probe} nodes={sorted} onSwitch={id=>{const q=new URLSearchParams(location.search);q.delete("eventStart");q.delete("eventEnd");go(id,location.hash.slice(1),q.size?"?"+q:"")}}/>
            </Suspense>) : (<p className="py-16 text-center text-sm text-muted-foreground">{tr("节点不存在或未公开。")}<button className="underline" onClick={() => go(null)}>{tr("返回列表")}</button>
            </p>)) : !nodes ? (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2].map((i) => (<Skeleton key={i} className="h-72"/>))}
          </div>) : (<>
            <section className="overview-heading"><div className="page-heading"><h1>{tr("服务器总览")}</h1><span className={`live-label connection-${connection}`} role="status" title={[{connecting:tr("正在连接"),realtime:tr("实时连接"),polling:tr("轮询更新"),disconnected:tr("连接中断 \u00B7 数据可能已过期")}[connection],lastUpdated ? new Date(lastUpdated).toLocaleString(locale()) : tr("等待首次数据")].join(" · ")}><Radio size={14}/><span>{{ connecting: tr("正在连接"), realtime: tr("实时连接"), polling: tr("轮询更新"), disconnected: tr("连接中断 \u00B7 数据可能已过期") }[connection]}</span></span></div>
            <p className="update-time">{lastUpdated ? tr("最后更新：{0}", new Date(lastUpdated).toLocaleString(locale())) : tr("等待首次数据")}</p></section>
            <Summary nodes={sorted} prefs={prefs} loadAlerts={loadAlerts} onAlert={event=>go(event.nodeId,"",`?eventStart=${event.start}&eventEnd=${event.end??event.last}`)}/>
            <>{compactViewport&&<div className="mobile-node-toolbar"><RegionPicker nodes={sorted} region={region} onChange={setRegion}/>{viewSwitch}</div>}</>
            <section hidden={(compactViewport || mapVisible) && system==='all' && new Set(sorted.map(n=>systemKey(n.os))).size<2} className="node-browser streamlined-browser" aria-label={tr("节点浏览")}>
            <div className="filters">{!compactViewport && !mapVisible && <div className="restored-regions" role="group" aria-label={tr("地区快速筛选")}><button className="all-regions-icon" aria-label={tr("所有地区")} title={tr("所有地区")} aria-pressed={region==='all'} onClick={()=>setRegion('all')}><Globe size={17}/></button>{groupRegions(sorted).map(r=><button key={r.code} aria-pressed={region===r.code} title={r.code} onClick={()=>setRegion(r.code)}>{r.code!==UNKNOWN_REGION&&<Flag code={r.code}/>}<span>{r.code===UNKNOWN_REGION?tr("未知地区"):r.code}</span><small>{r.total}</small></button>)}</div>}<div className="filter-categories"><div className="system-pills" hidden={new Set(sorted.map(n=>systemKey(n.os))).size < 2 && system==='all'} role="group" aria-label={tr("系统快速筛选")}>{['all',...new Set(sorted.map(n=>systemKey(n.os)))].map(key=><button key={key} aria-pressed={system===key} onClick={()=>setSystem(key)}>{key==='all'?tr("所有系统"):key==='other'?tr("其他 / 未知系统"):key}</button>)}</div>
</div>
{!compactViewport && !mapVisible && viewSwitch}</div>
            <div className="active-filters">
{!compactViewport && !mapVisible && region !== 'all' && <button aria-label={tr("清除地区筛选")} onClick={()=>setRegion('all')}>{region===UNKNOWN_REGION?tr("未知地区"):region} ×</button>}
{system !== 'all' && <button aria-label={tr("清除系统筛选")} onClick={()=>setSystem('all')}>{system} ×</button>}
</div></section>
{browse.view === 'table' && !mapVisible && <details className="column-options"><summary title={tr("显示列")} aria-label={tr("显示列")}><Columns3 size={16}/></summary><div>{defaultBrowse.columns.map(key=><label key={key}><input type="checkbox" checked={browse.columns.includes(key)} onChange={e=>patchBrowse({columns:e.target.checked?defaultBrowse.columns.filter(c=>c===key||browse.columns.includes(c)):browse.columns.filter(c=>c!==key)})}/>{tr(sortLabels[key as SortKey])}</label>)}</div></details>}

            {browse.view === 'table' && browse.sort === 'latency' && <p className="sort-note">{tr("延迟采用所选线路的最新采样桶；超时、旧记录和无数据排在末尾。已读取")}{sorted.filter(n => getPing(n.id)?.data).length}/{sorted.length}{tr("个节点。")}{tr("各节点所选线路可能不同，延迟比较请注意探测目标。")}</p>}
            {mapVisible && <Suspense fallback={<div className="map-placeholder"/>}><WorldMap viewSwitch={viewSwitch} nodes={sorted.filter(n=>(status==='all'||(status==='online'?n.online:!n.online))&&(system==='all'||systemKey(n.os)===system))} region={region} onRegion={setRegion}/></Suspense>}
            {sorted.length === 0 ? (<p className="py-16 text-center text-sm text-muted-foreground">{tr("还没有节点")}</p>) : filtered.length === 0 ? (<div className="empty-state"><p>{tr("没有符合条件的节点")}</p><Button variant="outline" onClick={() => { setQuery(''); setStatus('all'); setRegion('all'); setSystem('all'); }}>{tr("清除筛选")}</Button></div>) : browse.view === "table" ? (<NodeTable nodes={filtered} browse={browse} onSort={sortBy} onOpen={id => go(id)}/>) : (<div className="node-grid">{filtered.map(n=><NodeCard key={n.id} node={n} prefs={prefs} probe={prefs.probe} onOpen={()=>go(n.id)} onOpenRoutes={route=>go(n.id,"latency",route?`?routes=${route}`:"")}/>)}</div>)}
          </>)}
      </main>
      <footer className="site-footer"><span>{themeManifest.name} · {themeManifest.version}</span><span>Powered by monitor-probe</span></footer>
    </div>);
}
