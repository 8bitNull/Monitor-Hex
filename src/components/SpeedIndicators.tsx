import {useMemo} from 'react'
import {MicroTrend,useTrendCeiling} from './MicroTrend'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {ArrowUp, ArrowDown} from 'lucide-react'
import {nodeSpeedPeak, nodeSpeedSamples, type Node} from '@/lib/api'
import {rate} from '@/lib/format'
import {tr, locale} from '@/lib/i18n'

const EMPTY_SAMPLES:ReturnType<typeof nodeSpeedSamples>=[]
/** A shared scale, never a claimed bandwidth utilization percentage. */
export function SpeedIndicators({node, detail=false}: {node:Node; detail?:boolean}) {
  const m=liveMetrics(node)
  const tx=m?.net_tx, rx=m?.net_rx
  const state=nodeState(node)
  const stale=state==='stale'
  const samples=detail?nodeSpeedSamples(node.id):EMPTY_SAMPLES
  const trends=useMemo(()=>({tx:samples.map(p=>({ts:p.ts,value:p.tx})),rx:samples.map(p=>({ts:p.ts,value:p.rx}))}),[samples])
  const end=node.last_seen||Date.now()/1000,start=end-60
  const trendTop=useTrendCeiling(samples,Math.max(0,...samples.flatMap(p=>[p.rx,p.tx])),1024)
  const peak=Math.max(nodeSpeedPeak(node.id),tx??0,rx??0)
  const hint=state==='offline'?tr("离线"):state==='missing'?tr("等待数据"):stale?tr("数据已过期，上次上报：{0}",new Date(node.last_seen*1000).toLocaleString(locale())):tr("上下行共用近期峰值，指示长度不代表带宽使用率")
  return <div className={`speed-pair speed-indicators ${detail?'detail-speed':''}`} data-state={state} aria-label={tr("实时网速")} title={hint}>
    {([['upload',tx,ArrowUp,tr("上行")],['download',rx,ArrowDown,tr("下行")]] as const).map(([direction,value,Icon,label])=>{
      const ratio=value===undefined?0:value/peak*100
      const [amount,unit]=value===undefined?['—','']:rate(value).split(' ')
      return <div className={direction} key={direction} aria-label={`${label} ${amount} ${unit}${stale?' · '+tr("数据已过期"):''}`}>
        <Icon size={16} aria-hidden="true"/><span className="speed-direction">{label}</span><strong><span className="speed-amount">{amount}</span><small>{unit || "\u00a0"}</small></strong>
        <span className="speed-columns" aria-hidden="true">{Array.from({length:20},(_,i)=><span key={i}><i style={{width:`${Math.max(0,Math.min(100,(ratio-i*5)*20))}%`}}/></span>)}</span>
        <svg className="speed-ring" viewBox="0 0 28 28" aria-hidden="true"><circle className="speed-ring-track" cx="14" cy="14" r="11"/><circle cx="14" cy="14" r="11" pathLength="100" strokeDasharray={`${ratio} 100`}/></svg>
        <span className="speed-track" aria-hidden="true"><i style={{width:`${value===undefined?0:value/peak*100}%`}}/></span>
        {detail&&<div className="speed-trend"><MicroTrend rows={m?trends[direction==='upload'?'tx':'rx']:[]} start={start} end={end} top={trendTop} gap={15} label={tr('最近 60 秒网速')} emptyLabel={m?undefined:state==='offline'?tr('离线'):stale?tr('数据已过期'):tr('等待数据')}/><span className="speed-trend-caption">{tr('最近 60 秒')} · 0–{rate(trendTop)}</span></div>}
      </div>
    })}
  </div>
}
