import {Select} from '@/components/ui/select'
import { tr, getLanguage, subscribeLanguage, setLanguage } from '../lib/i18n.ts'
import {X, Circle, Minus, BarChart3, Hash, Rows2, Rows3} from 'lucide-react';
import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { palettes, graphStyles, moduleLabels, parsePreferences, safeBackground, type Preferences as Prefs } from '@/lib/appearance';
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
export function Preferences({ onClose, value, onChange, onGraphChange, onReset, siteDefaults, backgroundError, probes }: {
    onClose:()=>void;
    probes: Map<number,string>;
    value: Prefs;
    onChange: (next: Prefs) => void;
    onGraphChange: (graph: Prefs['graph']) => void;
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
    const jump=(id:string)=>dialog.current?.querySelector(`[data-settings="${id}"]`)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    const [message, setMessage] = useState('');
    const patch = (next: Partial<Prefs>) => onChange({ ...value, ...next });
    const range = (label: string, key: 'backgroundBlur' | 'backgroundMask' | 'cardOpacity' | 'cardBlur', min: number, max: number, unit: string) => <label className="range-control">{label}<output>{value[key]}{unit}</output><input type="range" aria-label={label} min={min} max={max} value={value[key]} onChange={e => patch({ [key]: Number(e.target.value) })}/></label>;
    return <dialog ref={dialog} className="settings-drawer" aria-label={tr("外观设置")} onCancel={onClose}><section className="preferences" aria-label={tr("外观设置")}>
    <div className="settings-top"><h2>{tr("外观设置")}</h2><button aria-label={tr("关闭设置")} title={tr("关闭设置")} onClick={onClose}><X size={20}/></button></div>
    <div className="settings-language"><span>语言 / Language</span><div role="group" aria-label="Language / 语言"><button lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>简体中文</button><button lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button></div></div>
    <p className="preferences-note">{tr("即时预览；未单独修改的选项跟随站点默认")}</p>
    <nav className="settings-nav" aria-label={tr("设置分类")}><button onClick={()=>jump('appearance')}>{tr("外观")}</button><button onClick={()=>jump('home')}>{tr("首页")}</button><button onClick={()=>jump('routes')}>{tr("线路")}</button></nav>
    <fieldset data-settings="appearance"><legend>{tr("全局外观")}</legend><div className="preference-grid"><div className="visual-preference"><span>{tr("主题配色")}</span><div className="palette-options" role="group" aria-label={tr("主题配色")}>{Object.entries(palettes).map(([k,v],i)=><button key={k} title={tr(v)} aria-label={tr(v)} aria-pressed={value.palette===k} style={{'--swatch':['#356dcc','#167e90','#b86b3e','#238364','#8664c5','#b45289'][i]} as React.CSSProperties} onClick={()=>patch({palette:k as Prefs['palette']})}><i/></button>)}</div></div>
      <label>{tr("明暗模式")}<Select aria-label={tr("明暗模式")} value={value.appearance} onChange={e => patch({ appearance: e.target.value as Prefs['appearance'] })}><option value="system">{tr("跟随系统")}</option><option value="light">{tr("浅色")}</option><option value="dark">{tr("深色")}</option></Select></label>
      <div className="visual-preference"><span>{tr("指标样式")}</span><div className="graph-options" role="group" aria-label={tr("指标样式")}>{Object.entries(graphStyles).map(([k,v])=>{const Icon=k==='ring'?Circle:k==='bar'?Minus:k==='columns'?BarChart3:Hash;return <button key={k} aria-label={tr(v)} aria-pressed={value.graph===k} onClick={()=>onGraphChange(k as Prefs['graph'])}><Icon size={22}/><small>{tr(v)}</small></button>})}</div></div>
      <div className="visual-preference"><span>{tr("卡片密度")}</span><div className="density-options" role="group" aria-label={tr("卡片密度")}>{(['comfortable','compact'] as const).map(k=><button key={k} aria-pressed={value.layout===k} onClick={()=>patch({layout:k})}>{k==='compact'?<Rows3 size={22}/>:<Rows2 size={22}/>}<small>{tr(k==='compact'?"紧凑":"舒适")}</small></button>)}</div></div>
      <label className="check-control"><input type="checkbox" checked={value.showTotals} onChange={e => patch({ showTotals: e.target.checked })}/>{tr("显示已用 / 总容量")}</label>
      <label className="check-control"><input type="checkbox" checked={value.icons} onChange={e => patch({ icons: e.target.checked })}/>{tr("国旗与系统图标")}</label>
    </div></fieldset>
    <fieldset data-settings="routes"><legend>{tr("线路")}</legend><div className="preference-grid"><label>{tr("首页线路数量")}<Select aria-label={tr("首页线路数量")} value={value.homeRoutes} onChange={e=>patch({homeRoutes:Number(e.target.value)})}>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</Select></label><label>{tr("主要探测线路")}<Select aria-label={tr("主要探测线路")} value={value.probe} onChange={e=>patch({probe:e.target.value})}><option value="auto">{tr("各节点首条线路")}</option>{[...probes].map(([id,name])=><option key={id} value={id}>{name}</option>)}{value.probe!=="auto"&&!probes.has(Number(value.probe))&&<option value={value.probe}>{tr("线路")}{value.probe}{tr("（等待数据）")}</option>}</Select></label></div><p className="preferences-note">{tr("节点独立选择优先于全局线路；其余线路可在详情查看。")}</p></fieldset>
    <fieldset><legend>{tr("背景与质感")}</legend>
      <BackgroundInput key={value.backgroundUrl} value={value.backgroundUrl} onChange={backgroundUrl => patch({ backgroundUrl })}/>
      <div className="background-presets"><button onClick={() => patch({ backgroundUrl: '/background.svg' })}>{tr("使用内置山峦")}</button><button onClick={() => patch({ backgroundUrl: '' })}>{tr("清除背景")}</button></div>
      {backgroundError && <p className="preferences-note" role="alert">{tr("背景加载失败，已使用默认底色。请检查图片地址。")}</p>}
      <div className="preference-grid">
        <label>{tr("背景效果")}<Select aria-label={tr("背景效果")} value={value.backgroundType} onChange={e => patch({ backgroundType: e.target.value as Prefs['backgroundType'] })}><option value="soft">{tr("柔和模糊")}</option><option value="glass">{tr("玻璃质感")}</option></Select></label>
        {range(tr("背景模糊"), 'backgroundBlur', 0, 30, 'px')}{range(tr("背景遮罩"), 'backgroundMask', 0, 90, '%')}
        <label className="check-control"><input type="checkbox" checked={value.glass} onChange={e => patch({ glass: e.target.checked })}/>{tr("开启卡片毛玻璃")}</label>
        {range(tr("卡片不透明度"), 'cardOpacity', 55, 100, '%')}{range(tr("卡片模糊"), 'cardBlur', 0, 24, 'px')}
      </div><p className="preferences-note">{tr("手机端会降低模糊强度。外部背景图片仅在设置后加载。")}</p>
    </fieldset>
    <fieldset data-settings="home"><legend>{tr("首页模块")}</legend><div className="module-switches">{Object.entries(moduleLabels).map(([key, label]) => <label className="check-control" key={key}><input type="checkbox" checked={value.modules[key as keyof typeof moduleLabels]} onChange={e => patch({ modules: { ...value.modules, [key]: e.target.checked } })}/>{tr(label)}</label>)}</div></fieldset>
    <p className="preferences-note">{tr("恢复外观仅重置配色、背景与样式；全部重置还会清空线路偏好和筛选。")}</p>
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
                onChange(parsePreferences(await file.text(), siteDefaults));
                setMessage(tr("外观偏好已导入"));
            }
            catch (error) {
                setMessage(error instanceof Error ? error.message : tr("导入失败"));
            }
        }}/></label>
      <button onClick={() => { onReset('appearance'); setMessage(tr("外观已恢复站点默认，首页模块和筛选已保留")); }}>{tr("恢复默认外观")}</button>
      <button onClick={() => { onReset('all'); setMessage(tr("全部本地偏好已恢复，浏览筛选已清空")); }}>{tr("重置全部偏好")}</button>
    </div>{message && <p role="status" className="preferences-note">{message}</p>}
  </section></dialog>;
}
