/// <reference types="node" />
import assert from "node:assert/strict"
import { safeNodes, type Node } from "./api.ts"
import { nodeState } from "./freshness.ts"

const node = { id: 1, metrics: { uptime: 100, cpu: 1, load: [0.1, 0.2, 0.3],
  mem_total: 1024, mem_used: 512, swap_total: 0, swap_used: 0, disk_total: 2048, disk_used: 1024,
  net_rx: 10, net_tx: 20, total_rx: 100, total_tx: 200, month_rx: 50, month_tx: 100,
  tcp: 3, udp: 4, procs: 20 } } as Node
assert.equal(safeNodes([node])[0], node)
for (const patch of [{ load: null }, { load: [1, "bad", 3] }, { cpu: "bad" }, { net_rx: Infinity }]) {
  const bad = { ...node, metrics: { ...node.metrics, ...patch } } as unknown as Node
  const result = safeNodes([bad, node])
  assert.equal(result[0].metrics, null)
  assert.equal(result[1], node)
}
console.log("invalid live reports are isolated")
assert.deepEqual(safeNodes([null, node] as unknown as Node[]), [node])
assert.throws(() => safeNodes(null as unknown as Node[]))
assert.equal(safeNodes([{ ...node, online: false }])[0].metrics, null)
const stamp=1_000_000
const live={...node,online:true,last_seen:(stamp-60000)/1000,received_at:stamp-15000}
assert.equal(nodeState(live,stamp),'live')
assert.equal(nodeState(live,stamp+1),'stale')
assert.equal(nodeState({...live,last_seen:stamp/1000},stamp+1),'stale')
assert.equal(nodeState({...live,received_at:stamp},stamp+1),'stale')
assert.equal(nodeState({...live,metrics:null},stamp),'missing')
assert.equal(nodeState({...live,online:false},stamp),'offline')
