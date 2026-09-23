export function isRecentPingSample(ts: number, now = Date.now()): boolean {
  const age = now - ts * 1000
  return Number.isFinite(age) && age >= -120000 && age < 120000
}
