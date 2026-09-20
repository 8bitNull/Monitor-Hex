const GB = 1024 ** 3
const locations = [['JP', 'Tokyo · 东京主节点'], ['HK', 'Hong Kong · 香港边缘'], ['US', 'Los Angeles · 洛杉矶'], ['DE', 'Frankfurt · 法兰克福'], ['SG', 'Singapore · 新加坡'], ['GB', 'London · 伦敦备份']]
export function nodes() {
  return locations.map(([country, name], i) => ({
    id: i + 1, name, country, sort: i, public: true, online: i !== 5, last_seen: Math.floor(Date.now() / 1000) - (i === 5 ? 600 : 0),
    os: 'Debian GNU/Linux 12', kernel: '6.1.0', arch: 'x86_64', virt: 'KVM', cpu_name: 'AMD EPYC 7B13', cpu_cores: i % 2 ? 2 : 4,
    mem_total: 8 * GB, swap_total: 2 * GB, disk_total: 80 * GB, agent_version: 'demo', price: 5 + i * 2, currency: 'USD', billing_cycle: 'monthly', expires_at: null,
    traffic_limit: 1024 * GB, traffic_mode: 'sum', traffic_reset_day: 1, total_rx: (125 + i * 81) * GB, total_tx: (62 + i * 46) * GB,
    month_rx: (42 + i * 8) * GB, month_tx: (12 + i * 4) * GB, month_start: '2026-09-01', day_rx: (3 + i) * GB, day_tx: (1 + i) * GB,
    metrics: i === 5 ? null : { uptime: 1352800 + i * 52342, cpu: [28, 8, 46, 13, 81][i], load: [.28, .41, .32], mem_total: 8 * GB, mem_used: (2 + i * .7) * GB,
      swap_total: 2 * GB, swap_used: 0, disk_total: 80 * GB, disk_used: (13 + i * 9) * GB, net_rx: 124000 + i * 358400, net_tx: 38200 + i * 127500,
      total_rx: 120 * GB, total_tx: 62 * GB, month_rx: 42 * GB, month_tx: 12 * GB, tcp: 102, udp: 24, procs: 156 },
  }))
}
export function metrics() {
  const now = Math.floor(Date.now() / 1000)
  return {
    metrics: Array.from({ length: 60 }, (_, i) => ({ ts: now - (59 - i) * 60, cpu: 22 + Math.sin(i * .3) * 15, mem_used: (2 + .2 * Math.sin(i * .1)) * GB, disk_used: 13 * GB, net_rx: 150000 + 100000 * Math.sin(i * .5), net_tx: 40000 + 20000 * Math.cos(i * .2) })),
    ping: Array.from({ length: 60 }, (_, i) => ({ task_id: 1, ts: now - (59 - i) * 60, latency: 25 + Math.sin(i * .6) * 4 })),
    probes: { '1': 'Tokyo gateway' }, loss: {},
  }
}
