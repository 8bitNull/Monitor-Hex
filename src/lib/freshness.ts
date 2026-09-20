import type {Node} from './api.ts'
export function nodeState(node: Node, now=Date.now()): 'live'|'stale'|'offline'|'missing' {
 if (!node.online) return 'offline'
 if (!node.metrics) return 'missing'
 if ((node.last_seen > 0 && now-node.last_seen*1000>60000) || (node.received_at !== undefined && now-node.received_at>15000)) return 'stale'
 return 'live'
}
export function liveMetrics(node: Node) { return nodeState(node)==='live' ? node.metrics : null }
