import assert from 'node:assert/strict'
import {trafficPeriodKey, trafficPeriodLabel, trafficPeriodStart, trafficUsed, trafficUsage} from './traffic.ts'

const at = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour)

assert.equal(trafficUsed({traffic_mode: 'up', month_rx: 42, month_tx: 12}), 12)
assert.equal(trafficUsed({traffic_mode: 'down', month_rx: 42, month_tx: 12}), 42)
assert.equal(trafficUsed({traffic_mode: 'max', month_rx: 42, month_tx: 12}), 42)
assert.equal(trafficUsed({traffic_mode: 'sum', month_rx: 42, month_tx: 12}), 54)
assert.equal(trafficUsed({traffic_mode: 'up', month_rx: 42, month_tx: 12, month_used: 99}), 99)

assert.equal(trafficPeriodKey(trafficPeriodStart(15, at(2026, 9, 22))), '2026-09-15')
assert.equal(trafficPeriodKey(trafficPeriodStart(15, at(2026, 9, 14, 23))), '2026-08-15')
assert.equal(trafficPeriodKey(trafficPeriodStart(31, at(2026, 2, 10))), '2026-01-31')
assert.equal(trafficPeriodKey(trafficPeriodStart(31, at(2026, 2, 28))), '2026-02-28')
assert.equal(trafficPeriodKey(trafficPeriodStart('invalid', at(2026, 9, 22))), '2026-09-01')

const node = {traffic_mode: 'sum', month_rx: 42, month_tx: 12, month_used: 99, traffic_reset_day: 15, month_start: '2026-09-15'}
const usage = trafficUsage(node, at(2026, 9, 22))
assert.equal(usage.value, 99)
assert.equal(usage.periodKey, '2026-09-15')
assert.equal(usage.reportedPeriodKey, '2026-09-15')
assert.equal(usage.isCurrentPeriod, true)
assert.equal(trafficPeriodLabel(node), '当前周期用量')

const calendarMonthReport = trafficUsage({...node, month_start: '2026-09-01'}, at(2026, 9, 22))
assert.equal(calendarMonthReport.value, 99)
assert.equal(calendarMonthReport.isCurrentPeriod, false)
assert.equal(trafficPeriodLabel({...node, traffic_reset_day: 1}), '本月用量')

console.log('traffic reset-day periods and accounting modes passed')
