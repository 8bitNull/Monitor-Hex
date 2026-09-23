import type { Node } from './api.ts'
export const UNKNOWN_REGION = 'unknown'
const names = new Intl.DisplayNames(['en'], { type: 'region' })
export function regionKey(value: unknown): string {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return /^[A-Z]{2}$/.test(code) && code !== 'ZZ' && names.of(code) !== code ? code : UNKNOWN_REGION
}
export function systemKey(value: string): string {
  const os = (value || '').toLowerCase()
  if (/windows/.test(os)) return 'Windows'
  if (/debian|ubuntu|centos|fedora|rocky|alma|alpine|linux|arch|suse|gentoo|openwrt|nix/.test(os)) return 'Linux'
  if (/freebsd|openbsd|netbsd/.test(os)) return 'BSD'
  if (/macos|darwin|mac os/.test(os)) return 'macOS'
  return 'other'
}
export function groupRegions<T extends Pick<Node, 'country'|'online'>>(nodes: T[]) {
  const groups = new Map<string, T[]>()
  for (const node of nodes) { const key = regionKey(node.country); if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(node) }
  return [...groups].sort(([a], [b]) => a === UNKNOWN_REGION ? 1 : b === UNKNOWN_REGION ? -1 : a.localeCompare(b)).map(([code, nodes]) => ({ code, nodes, total: nodes.length, online: nodes.filter(n => n.online).length }))
}
