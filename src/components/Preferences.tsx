import {Select} from '@/components/ui/select'
import { tr, getLanguage, subscribeLanguage, setLanguage } from '../lib/i18n.ts'
import {X, Check, Circle, Minus, BarChart3, Hash, Rows2, Rows3} from 'lucide-react';
import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { palettes, graphStyles, moduleLabels, cardInfoLabels, type CardInfo, defaultCardInfo, type DisplayPatch, parsePreferences, safeBackground, type Preferences as Prefs } from '@/lib/appearance';
const slimCardInfo: CardInfo = {...defaultCardInfo,connections:false,uptime:false};
function InfoPresets({value,onChange,mobile=false}:{value:CardInfo;onChange:(next:CardInfo)=>void;mobile?:boolean}) {
    const matches=(preset:CardInfo)=>Object.keys(defaultCardInfo).every(key=>value[key as keyof CardInfo]===preset[key as keyof CardInfo]);
    const full=matches(defaultCardInfo),slim=matches(slimCardInfo);
    return <div className="info-presets"><div className="preset-heading"><span>{tr("显示预设")}</span><small>{full?tr("完整"):slim?tr("精简"):tr("自定义")}</small></div><div role="group" aria-label={mobile?tr("手机显示预设"):tr("通用显示预设")}>
      <button aria-pressed={full} onClick={()=>onChange({...defaultCardInfo})}><span>{full&&<Check size={14}/ >}{tr("完整")}</span><small>{tr("显示全部辅助信息")}</small></button>
      <button aria-pressed={slim} onClick={()=>onChange({...slimCardInfo})}><span>{slim&&<Check size={14}/ >}{tr("精简")}</span><small>{tr("隐藏连接数与在线时长")}</small></button>
    </div></div>;
}
function BackgroundInput({ value, onChange }: {
    value: string;
    onChange: (url: string) => void;
}) {
    const [draft, setDraft] = useState(value);
    const [error, setError] = useState('');
    return <div className="background-input"><label>{tr("背景图片地址")}<input aria-label={tr("背景图片地址")} value={draft} placeholder={tr("https://… 或 /background.svg")} onChange={e => setDraft(e.target.value)}/></label><button onClick={() => { const url = safeBackground(draft); if (draft.trim() && !url)
        setError(tr("请输入 HTTP(S) 地址或站内绝对路径"));
    else {
        setError('');
        onChange(url);
    } }}>{tr("应用背景")}</button>{error && <p role="alert">{error}</p>}</div>;
}
function LatencySettings({value,onChange}:{value:Prefs;onChange:(next:Partial<Prefs>)=>void}) {
    const [warn,setWarn]=useState(String(value.latencyWarn)),[high,setHigh]=useState(String(value.latencyHigh));
    const valid=warn.trim()!==''&&high.trim()!==''&&Number(warn)>=1&&Number(high)>Number(warn)&&Number(high)<=5000;
    return <div className="latency-settings"><div className="latency-presets"><button onClick={()=>onChange({latencyWarn:80,latencyHigh:160})}>{tr("原有分档 80/160ms")}</button><button onClick={()=>onChange({latencyScale:500,latencyWarn:150,latencyHigh:300})}>{tr("跨境参考 150/300ms")}</button></div><p className="preferences-note">{tr("仅用于视觉分档，不改变后台告警阈值。")}</p><div className="preference-grid">
      <label>{tr("延迟统一刻度")}<Select aria-label={tr("延迟统一刻度")} value={value.latencyScale} onChange={e=>onChange({latencyScale:Number(e.target.value) as 200|500})}><option value="200">0–200 ms</option><option value="500">0–500 ms</option></Select></label>
      <label>{tr("黄色阈值（ms）")}<input type="number" min="1" max="4999" value={warn} onChange={e=>setWarn(e.target.value)}/></label>
      <label>{tr("红色阈值（ms）")}<input type="number" min="2" max="5000" value={high} onChange={e=>setHigh(e.target.value)}/></label>
    </div><button disabled={!valid} onClick={()=>onChange({latencyWarn:Number(warn),latencyHigh:Number(high)})}>{tr("应用延迟阈值")}</button>
    {(warn!==String(value.latencyWarn)||high!==String(value.latencyHigh))&&<p className="preferences-note" role="status">{tr("阈值修改尚未应用")}</p>}
    {!valid&&<p role="alert" className="preferences-note">{tr("阈值须满足：1 ≤ 黄色 < 红色 ≤ 5000 ms")}</p>}
    <p className="preferences-note">{tr("所有首页卡片共用刻度。超出刻度的采样封顶标红，实际数值保留；叉号代表超时，空隙代表缺失。")}</p></div>;
}
export function Preferences({ onClose, value, onChange, onGraphChange, onDisplayChange, onReset, siteDefaults, backgroundError, probes }: {
    onClose:()=>void;
    probes: Map<number,string>;
    value: Prefs;
    onChange: (next: Prefs) => void;
    onGraphChange: (graph: Prefs['graph']) => void;
    onDisplayChange: (patch: DisplayPatch) => void;
    onReset: (scope: 'appearance' | 'all') => void;
    siteDefaults: Prefs;
    backgroundError: boolean;
}) {
    const language = useSyncExternalStore(subscribeLanguage, getLanguage);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(()=>{
        const trigger=document.activeElement as HTMLElement | null;
        const overflow=document.body.style.overflow;
        const element=dialog.current!;
        element.showModal(); document.body.style.overflow='hidden';
        return ()=>{element.close(); document.body.style.overflow=overflow; trigger?.focus({preventScroll:true});};
    },[]);
    const [category,setCategory]=useState('appearance');
    const [message, setMessage] = useState('');
    const patch = (next: Partial<Prefs>) => onChange({ ...value, ...next });
    const range = (label: string, key: 'backgroundBlur' | 'backgroundMask' | 'cardOpacity' | 'cardBlur', min: number, max: number, unit: string) => <label className="range-control">{label}<output>{value[key]}{unit}</output><input type="range" aria-label={label} min={min} max={max} value={value[key]} onChange={e => patch({ [key]: Number(e.target.value) })}/></label>;
    return <dialog ref={dialog} className="settings-drawer" aria-label={tr("外观设置")} onCancel={onClose}><section className="preferences" data-category={category} aria-label={tr("外观设置")}>
    <div className="settings-top"><h2>{tr("外观设置")}</h2><button aria-label={tr("关闭设置")} title={tr("关闭设置")} onClick={onClose}><X size={20}/></button></div>
    <div hidden={category!=='other'} className="settings-language"><span>语言 / Language</span><div role="group" aria-label="Language / 语言"><button lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>简体中文</button><button lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button></div></div>
    <p className="preferences-note">{tr("仅保存在当前浏览器；未修改的选项跟随站点默认。")}</p>
    <nav className="settings-nav" aria-label={tr("设置分类")}>{([['appearance','外观'],['cards','卡片'],['network','网络'],['other','其他']] as const).map(([id,label])=><button key={id} aria-pressed={category===id} onClick={()=>setCategory(id)}>{tr(label)}</button>)}</nav>
    <div className="recommended-display" hidden={category!=='cards'}><button onClick={()=>{onChange({...value,infoDensity:'overview',graph:'bar',latencyScale:500,latencyWarn:150,latencyHigh:300});onGraphChange('bar');onDisplayChange({infoDensity:'overview'});setMessage(tr("已应用推荐显示"))}}>{tr("应用本站推荐显示")}</button><p className="preferences-note">{tr("概览资料 · 资源细条 · 500ms 刻度 · 150/300ms 分档；其他偏好保留。")}</p></div>
    <fieldset hidden={category!=='appearance'} data-settings="appearance"><legend>{tr("常用外观")}</legend><div className="preference-grid"><div className="visual-preference"><span>{tr("主题配色")}</span><div className="palette-options" role="group" aria-label={tr("主题配色")}>{Object.entries(palettes).map(([k,v],i)=><button key={k} title={tr(v)} aria-label={tr(v)} aria-pressed={value.palette===k} style={{'--swatch':['#356dcc','#167e90','#b86b3e','#238364','#8664c5','#b45289'][i]} as React.CSSProperties} onClick={()=>patch({palette:k as Prefs['palette']})}><i/></button>)}</div></div>
      <label>{tr("明暗模式")}<Select aria-label={tr("明暗模式")} value={value.appearance} onChange={e => patch({ appearance: e.target.value as Prefs['appearance'] })}><option value="system">{tr("跟随系统")}</option><option value="light">{tr("浅色")}</option><option value="dark">{tr("深色")}</option></Select></label>
    </div></fieldset>
    <fieldset hidden={category!=='cards'} data-settings="card-info"><legend>{tr("卡片信息")}</legend><p className="preferences-note">{tr("仅影响首页卡片，详情页保留完整资料。")}</p><label className="information-density">{tr("资料密度")}<Select aria-label={tr("资料密度")} value={value.infoDensity} onChange={e=>onDisplayChange({infoDensity:e.target.value as Prefs['infoDensity']})}><option value="overview">{tr("概览：辅助资料按需展开")}</option><option value="full">{tr("完整：显示全部已选资料")}</option></Select></label><InfoPresets value={value.cardInfo} onChange={cardInfo=>onDisplayChange({cardInfo})}/><div className="card-info-switches" role="group" aria-label={tr("通用卡片信息")}>{Object.entries(cardInfoLabels).map(([key,label])=><label className="check-control" key={key}><input type="checkbox" checked={value.cardInfo[key as keyof Prefs['cardInfo']]} onChange={e=>onDisplayChange({cardInfo:{[key]:e.target.checked}})}/>{tr(label)}</label>)}</div>
    <div className="mobile-info-control"><label>{tr("手机显示")}<Select aria-label={tr("手机显示")} value={value.mobileInfoMode} onChange={e=>onDisplayChange({mobileInfoMode:e.target.value as Prefs['mobileInfoMode'],...(e.target.value==='custom' && value.mobileCardInfo===null?{mobileCardInfo:{...value.cardInfo}}:{})})}><option value="follow">{tr("跟随通用设置")}</option><option value="custom">{tr("单独设置")}</option></Select></label></div>
    {value.mobileInfoMode==='follow' && <p className="preferences-note mobile-follow-note">{tr("手机正在使用上方通用设置；切换为单独设置后可独立调整。")}</p>}
    {value.mobileInfoMode==='custom' && <div className="mobile-info-options"><InfoPresets mobile value={value.mobileCardInfo || value.cardInfo} onChange={mobileCardInfo=>onDisplayChange({mobileCardInfo})}/><p className="preferences-note">{tr("仅影响宽度不超过 720px 的首页卡片。")}</p><div className="card-info-switches" role="group" aria-label={tr("手机卡片信息")}>{Object.entries(cardInfoLabels).map(([key,label])=><label className="check-control" key={key}><input type="checkbox" checked={(value.mobileCardInfo || value.cardInfo)[key as keyof Prefs['cardInfo']]} onChange={e=>onDisplayChange({mobileCardInfo:{...(value.mobileCardInfo || value.cardInfo),[key]:e.target.checked}})}/>{tr(label)}</label>)}</div></div>}
    <div className="card-layout-controls"><div className="preference-grid">      <div className="visual-preference"><span>{tr("卡片密度")}</span><div className="density-options" role="group" aria-label={tr("卡片密度")}>{(['comfortable','compact'] as const).map(k=><button key={k} aria-pressed={value.layout===k} onClick={()=>patch({layout:k})}>{k==='compact'?<Rows3 size={22}/>:<Rows2 size={22}/>}<small>{tr(k==='compact'?"紧凑":"舒适")}</small></button>)}</div></div>      <label>{tr("桌面列数")}<Select aria-label={tr("桌面列数")} value={value.desktopColumns} onChange={e=>onDisplayChange({desktopColumns:e.target.value as Prefs['desktopColumns']})}><option value="auto">{tr("自动")}</option>{(['2','3','4'] as const).map(n=><option key={n} value={n}>{tr("{0} 列",n)}</option>)}</Select></label></div></div></fieldset>
    <fieldset hidden={category!=='cards'} data-settings="indicators"><legend>{tr("指标与图标")}</legend><div className="preference-grid">      <div className="visual-preference"><span>{tr("指标样式")}</span><div className="graph-options" role="group" aria-label={tr("指标样式")}>{Object.entries(graphStyles).map(([k,v])=>{const Icon=k==='ring'?Circle:k==='bar'?Minus:k==='columns'?BarChart3:Hash;return <button key={k} aria-label={tr(v)} aria-pressed={value.graph===k} onClick={()=>onGraphChange(k as Prefs['graph'])}><Icon size={22}/><small>{tr(v)}</small></button>})}</div></div>      <label className="check-control"><input type="checkbox" checked={value.showTotals} onChange={e => patch({ showTotals: e.target.checked })}/>{tr("显示已用 / 总容量")}</label>      <label className="check-control"><input type="checkbox" checked={value.icons} onChange={e => patch({ icons: e.target.checked })}/>{tr("国旗与系统图标")}</label></div></fieldset>
    <p hidden={category!=='cards'} className="preferences-note">{tr("指标样式仅影响 CPU、内存和硬盘；首页网速固定分段条，延迟固定采样柱条。")}</p>
    <fieldset hidden={category!=='other'} data-settings="home"><legend>{tr("首页模块")}</legend><div className="module-switches">{Object.entries(moduleLabels).filter(([key])=>key!=="busiest").map(([key, label]) => <label className="check-control" key={key}><input type="checkbox" checked={value.modules[key as keyof typeof moduleLabels]} onChange={e => patch({ modules: { ...value.modules, [key]: e.target.checked } })}/>{tr(label)}</label>)}</div></fieldset>
    <fieldset hidden={category!=='cards'} data-settings="detail"><legend>{tr("详情页")}</legend><div className="preference-grid"><label>{tr("设备资料展开方式")}<Select aria-label={tr("设备资料展开方式")} value={value.detailInfoMode} onChange={e=>onDisplayChange({detailInfoMode:e.target.value as Prefs['detailInfoMode']})}><option value="auto">{tr("自动：手机折叠，桌面展开")}</option><option value="expanded">{tr("展开")}</option><option value="collapsed">{tr("折叠")}</option></Select></label></div><p className="preferences-note">{tr("自动模式仅在手机端折叠；PC端始终展开，手动选择会在手机端记住。")}</p></fieldset>
    <fieldset hidden={category!=='network'} data-settings="routes"><legend>{tr("线路")}</legend><p className="preferences-note">{tr("上下行共用近期峰值，指示长度不代表带宽使用率")}</p><div className="preference-grid"><label>{tr("首页线路数量")}<Select aria-label={tr("首页线路数量")} value={value.homeRoutes} onChange={e=>patch({homeRoutes:Number(e.target.value)})}>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</Select></label><label>{tr("主要探测线路")}<Select aria-label={tr("主要探测线路")} value={value.probe} onChange={e=>patch({probe:e.target.value})}><option value="auto">{tr("各节点首条线路")}</option>{[...probes].map(([id,name])=><option key={id} value={id}>{name}</option>)}{value.probe!=="auto"&&!probes.has(Number(value.probe))&&<option value={value.probe}>{tr("线路")}{value.probe}{tr("（等待数据）")}</option>}</Select></label></div><p className="preferences-note">{tr("节点独立选择优先于全局线路；其余线路可在详情查看。")}</p><LatencySettings key={`${value.latencyWarn}:${value.latencyHigh}`} value={value} onChange={patch}/></fieldset>
    <fieldset hidden={category!=='other'} data-settings="alerts"><legend>{tr("提醒")}</legend><label className="check-control"><input type="checkbox" checked={value.modules.busiest} onChange={e=>patch({modules:{...value.modules,busiest:e.target.checked}})}/>{tr("高负载提示")}</label><p className="preferences-note">{tr("CPU 达到 85% 时记录，低于 80% 时标记恢复。记录仅保存在当前浏览器。")}</p></fieldset>
    <details hidden={category!=='appearance'} className="advanced-appearance"><summary>{tr("高级外观")}</summary>    <fieldset><legend>{tr("背景与质感")}</legend>
      <BackgroundInput key={value.backgroundUrl} value={value.backgroundUrl} onChange={backgroundUrl => patch({ backgroundUrl })}/>
      <div className="background-presets"><button onClick={() => patch({ backgroundUrl: '/background.svg' })}>{tr("使用内置山峦")}</button><button onClick={() => patch({ backgroundUrl: '' })}>{tr("清除背景")}</button></div>
      {backgroundError && <p className="preferences-note" role="alert">{tr("背景加载失败，已使用默认底色。请检查图片地址。")}</p>}
      <div className="preference-grid">
        <label>{tr("背景效果")}<Select aria-label={tr("背景效果")} value={value.backgroundType} onChange={e => patch({ backgroundType: e.target.value as Prefs['backgroundType'] })}><option value="soft">{tr("柔和模糊")}</option><option value="glass">{tr("玻璃质感")}</option></Select></label>
        {range(tr("背景模糊"), 'backgroundBlur', 0, 30, 'px')}{range(tr("背景遮罩"), 'backgroundMask', 0, 90, '%')}
        <label className="check-control"><input type="checkbox" checked={value.glass} onChange={e => patch({ glass: e.target.checked })}/>{tr("开启卡片毛玻璃")}</label>
        {range(tr("卡片不透明度"), 'cardOpacity', 55, 100, '%')}{range(tr("卡片模糊"), 'cardBlur', 0, 24, 'px')}
      </div><p className="preferences-note">{tr("手机端会降低模糊强度。外部背景图片仅在设置后加载。")}</p>
    </fieldset></details>
    <div hidden={category!=='other'} className="settings-reset"><h3>{tr("偏好管理")}</h3><p className="preferences-note">{tr("恢复外观保留显示内容与详情展开方式；全部重置将恢复站点默认并清空线路偏好和筛选。")}</p>
    <div className="preference-actions">
      <button onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>!["skin","cardLayout","mobileLayout"].includes(key))), null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'monitor-hex-preferences.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage(tr("外观偏好已导出，不包含节点或账号信息")); }}>{tr("导出外观偏好")}</button>
      <label className="import-control">{tr("导入外观偏好")}<input type="file" accept="application/json,.json" aria-label={tr("导入外观偏好")} onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file)
                return;
            try {
                if (file.size > 65536)
                    throw new Error(tr("配置文件不能超过 64 KB"));
                const imported=parsePreferences(await file.text(), siteDefaults);
                onChange(imported);
                onDisplayChange({infoDensity:imported.infoDensity,cardInfo:imported.cardInfo,mobileCardInfo:imported.mobileCardInfo,mobileInfoMode:imported.mobileInfoMode,desktopColumns:imported.desktopColumns,detailInfoMode:imported.detailInfoMode});
                setMessage(tr("外观偏好已导入"));
            }
            catch (error) {
                setMessage(error instanceof Error ? error.message : tr("导入失败"));
            }
        }}/></label>
      <button onClick={() => { onReset('appearance'); setMessage(tr("外观已恢复站点默认，首页模块和筛选已保留")); }}>{tr("恢复默认外观")}</button>
      <button onClick={() => { onReset('all'); setMessage(tr("全部本地偏好已恢复，浏览筛选已清空")); }}>{tr("重置全部偏好")}</button>
    </div>
    </div>{message && <p role="status" className="preferences-note">{message}</p>}
  </section></dialog>;
}
