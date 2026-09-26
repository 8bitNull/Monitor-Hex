import {SpeedBuffer} from './trends.ts'
import {liveMetrics} from './freshness.ts'
import { useEffect, useState } from "react"

export type Metrics = {
  uptime: number
  cpu: number
  load: [number, number, number]
  mem_total: number
  mem_used: number
  swap_total: number
  swap_used: number
  disk_total: number
  disk_used: number
  net_rx: number
  net_tx: number
  total_rx: number
  total_tx: number
  month_rx: number
  month_tx: number
  tcp: number
  udp: number
  procs: number
}

export type Node = {
  id: number
  name: string
  /** Public backend group name; older hubs omit it. */
  group?: string
  sort: number
  public: boolean
  online: boolean
  /** ISO 3166-1 alpha-2, or empty when the hub could not locate the address. */
  country: string
  received_at?: number
  last_seen: number
  metrics: Metrics | null
  os: string
  kernel: string
  arch: string
  virt: string
  cpu_name: string
  cpu_cores: number
  mem_total: number
  swap_total: number
  disk_total: number
  agent_version: string
  price: number
  currency: string
  billing_cycle: string
  expires_at: string | null
  traffic_limit: number
  traffic_mode: string
  traffic_reset_day: number
  total_rx: number
  total_tx: number
  /** Aggregates for the current traffic-reset period, not necessarily a calendar month. */
  month_rx: number
  month_tx: number
  /** Current reset-period usage after applying traffic_mode, as calculated by the hub. */
  month_used?: number
  /** Local-calendar start date of the current traffic-reset period. */
  month_start: string
  day_rx: number
  day_tx: number
  /** Panel only. */
  hostname?: string
  ipv4?: string
  ipv6?: string
  ipv4_pin?: string
  ipv6_pin?: string
  ip?: string
  remark?: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  })
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText)
  return res.status === 204 ? (undefined as T) : res.json()
}

/**
 * Fleet throughput, one sample per push. Held beside the stream that feeds it
 * rather than in the tile that draws it: the summary unmounts while a node page is
 * open, so a buffer held there would restart empty on every return. Two minutes at
 * the hub's push interval.
 */
const KEEP = 60
export const speedHistory: { rx: number; tx: number }[] = []

const networkSamples = new SpeedBuffer()
export const nodeSpeedSamples = (id:number) => networkSamples.get(id)
const nodeSpeedHistory = new Map<number, number[]>()
export function nodeSpeedPeak(id: number): number {
  return Math.max(1, ...(nodeSpeedHistory.get(id) ?? []))
}
function sample(nodes: Node[]) {
  networkSamples.update(nodes.flatMap(node=>{const m=liveMetrics(node);return m?[{id:node.id,ts:node.last_seen,tx:m.net_tx,rx:m.net_rx}]:[]}),nodes.filter(n=>liveMetrics(n)!==null).map(n=>n.id),Date.now()/1000)
  const ids = new Set(nodes.map(n => n.id))
  for (const id of nodeSpeedHistory.keys()) if (!ids.has(id)) nodeSpeedHistory.delete(id)
  for (const node of nodes) {
    if (!node.online) { nodeSpeedHistory.delete(node.id); continue }
    const metric=liveMetrics(node)
    if (!metric) continue
    const history = nodeSpeedHistory.get(node.id) ?? []
    history.push(Math.max(metric.net_tx, metric.net_rx))
    if (history.length > KEEP) history.shift()
    nodeSpeedHistory.set(node.id, history)
  }
  const live = nodes.filter((n) => liveMetrics(n) !== null)
  speedHistory.push({
    rx: live.reduce((s, n) => s + n.metrics!.net_rx, 0),
    tx: live.reduce((s, n) => s + n.metrics!.net_tx, 0),
  })
  if (speedHistory.length > KEEP) speedHistory.shift()
}

/** A malformed report must not remove every other node from the page. */
export function safeNodes(nodes: Node[]): Node[] {
  if (!Array.isArray(nodes)) throw new Error('节点数据格式不正确')
  const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0
  const fields = ["uptime", "cpu", "mem_total", "mem_used", "swap_total", "swap_used", "disk_total", "disk_used",
    "net_rx", "net_tx", "total_rx", "total_tx", "month_rx", "month_tx", "tcp", "udp", "procs"] as const
  return nodes.filter(node => node && typeof node === 'object' && Number.isFinite(node.id)).map((node) => {
    const m = node.metrics
    return !m || (node.online !== false && fields.every((key) => number(m[key])) && Array.isArray(m.load) && m.load.length === 3 && m.load.every(number))
      ? node : { ...node, metrics: null }
  })
}

/**
 * Live node list. Uses the WebSocket the hub pushes every two seconds, falling
 * back to polling if it cannot be established.
 */
export function useNodes() {
  const [nodes, setNodes] = useState<Node[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  const [connection, setConnection] = useState<'connecting' | 'realtime' | 'polling' | 'disconnected'>('connecting')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  useEffect(() => {
    let socket: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let stopped = false, fetching = false, generation = 0, streamAt = 0, receivedAt = 0, openedAt = 0
    const controller = new AbortController()
    const receive = (list: Node[], source: 'realtime' | 'polling') => {
      if (stopped) return
      const safe = safeNodes(list).map(node=>({...node,received_at:Date.now()}))
      receivedAt = Date.now()
      sample(safe); setNodes(safe); setError(null); setClosed(false)
      setLastUpdated(receivedAt); setConnection(source)
    }
    const fetchOnce = async () => {
      if (stopped || fetching) return
      fetching = true
      const start = generation
      try {
        const d = await api<{ nodes: Node[] }>('/nodes', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
        if (start === generation) receive(d.nodes, 'polling')
      } catch (e) {
        if (!stopped && start === generation) {
          setError(e instanceof Error ? e.message || '网络错误' : '网络错误')
          setConnection('disconnected')
          if (e instanceof ApiError && e.status === 401) setClosed(true)
        }
      } finally { fetching = false }
    }
    const schedule = () => {
      if (stopped || retry) return
      retry = setTimeout(() => { retry = null; connect() }, 5000)
    }
    const connect = () => {
      if (stopped) return
      openedAt = Date.now(); streamAt = 0
      try { socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/ws') }
      catch { void fetchOnce(); schedule(); return }
      const current = socket
      current.onmessage = event => {
        if (stopped || current !== socket) return
        try { receive(JSON.parse(event.data).nodes, 'realtime'); generation++; streamAt = Date.now() }
        catch { setError('实时数据格式异常，正在重新连接'); current.close() }
      }
      current.onerror = () => current.close()
      current.onclose = () => {
        if (stopped || current !== socket) return
        socket = null; streamAt = 0
        setConnection(receivedAt ? 'polling' : 'connecting')
        void fetchOnce(); schedule()
      }
    }
    void fetchOnce(); connect()
    const poll = setInterval(() => { if (!streamAt || Date.now() - streamAt > 12000) void fetchOnce() }, 5000)
    const watchdog = setInterval(() => {
      if (socket && Date.now() - (streamAt || openedAt) > 12000) socket.close()
      if (receivedAt && Date.now() - receivedAt > 15000) { setConnection('disconnected'); setNodes(old=>old ? [...old] : old) }
    }, 3000)
    return () => { stopped = true; controller.abort(); socket?.close(); if (retry) clearTimeout(retry); clearInterval(poll); clearInterval(watchdog) }
  }, [])
  return { nodes, error, closed, connection, lastUpdated }
}
