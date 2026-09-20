import { english } from './en.ts'
export type Language = 'zh' | 'en'
let language: Language = 'zh'
try { if (typeof localStorage !== 'undefined' && localStorage.getItem('monitor-next-language') === 'en') language = 'en' } catch { /* Storage is optional. */ }
const listeners = new Set<() => void>()
export const getLanguage = () => language
export const subscribeLanguage = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setLanguage(next: Language) {
  language = next === 'en' ? 'en' : 'zh'
  try { localStorage.setItem('monitor-next-language', language) } catch { /* Storage is optional. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = locale()
  listeners.forEach(listener => listener())
}
export const locale = () => language === 'en' ? 'en-US' : 'zh-CN'
/** Source-language fallback; values are inserted after translation, never translated as UI. */
export function tr(source: string, ...values: unknown[]): string {
  const text = language === 'en' ? english[source] ?? source : source
  return text.replace(/\{(\d+)\}/g, (match, index: string) => Number(index) < values.length ? String(values[Number(index)]) : match)
}
