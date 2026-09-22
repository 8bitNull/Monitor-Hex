import type {Node} from './api.ts'

export type TrafficNode = Pick<Node, 'traffic_mode' | 'month_rx' | 'month_tx' | 'month_used' | 'traffic_reset_day' | 'month_start'>

/**
 * The quota value reported by the API for the node's current traffic period.
 * Older hubs do not expose month_used, so retain the compatible local fallback.
 */
export function trafficUsed(node: Pick<TrafficNode, 'traffic_mode' | 'month_rx' | 'month_tx' | 'month_used'>): number {
  if (typeof node.month_used === 'number' && Number.isFinite(node.month_used) && node.month_used >= 0) return node.month_used
  switch (node.traffic_mode) {
    case 'up': return node.month_tx
    case 'down': return node.month_rx
    case 'max': return Math.max(node.month_rx, node.month_tx)
    default: return node.month_rx + node.month_tx
  }
}

/** Invalid or missing reset days fall back to the calendar-month boundary. */
export function normalizeTrafficResetDay(value: unknown): number {
  const day = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function periodStartFor(year: number, month: number, resetDay: number) {
  return new Date(year, month, Math.min(resetDay, daysInMonth(year, month)))
}

/**
 * Returns the local-calendar start of the current quota period. Reset days
 * beyond a short month's length occur on that month's last day.
 */
export function trafficPeriodStart(resetDay: unknown, now = new Date()): Date {
  const day = normalizeTrafficResetDay(resetDay)
  const current = periodStartFor(now.getFullYear(), now.getMonth(), day)
  return current.getTime() <= now.getTime()
    ? current
    : periodStartFor(now.getFullYear(), now.getMonth() - 1, day)
}

export function trafficPeriodKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3])
  const parsed = new Date(year, month, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day ? parsed : null
}

export function trafficPeriodLabel(node: Pick<TrafficNode, 'traffic_reset_day'>): '本月用量' | '当前周期用量' {
  return normalizeTrafficResetDay(node.traffic_reset_day) === 1 ? '本月用量' : '当前周期用量'
}

/**
 * Keeps the hub's reset-period aggregate together with the period boundary
 * derived from traffic_reset_day. month_start is retained for diagnostics; a
 * theme cannot derive a period total from cumulative totals without a baseline.
 */
export function trafficUsage(node: TrafficNode, now = new Date()) {
  const periodStart = trafficPeriodStart(node.traffic_reset_day, now)
  const reportedStart = parseDateOnly(node.month_start)
  return {
    value: trafficUsed(node),
    resetDay: normalizeTrafficResetDay(node.traffic_reset_day),
    periodStart,
    periodKey: trafficPeriodKey(periodStart),
    reportedPeriodKey: reportedStart ? trafficPeriodKey(reportedStart) : null,
    isCurrentPeriod: !reportedStart || trafficPeriodKey(reportedStart) === trafficPeriodKey(periodStart),
  }
}
