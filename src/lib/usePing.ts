import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getPing, loadPing, subscribeNodePing, watchPing } from './ping'
export function usePing(id: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const subscribe = useCallback((listener:()=>void)=>subscribeNodePing(id,listener),[id])
  const snapshot = useSyncExternalStore(subscribe,()=>getPing(id))
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '150px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!visible) return
    return watchPing([id])
  }, [id, visible])
  return { ref, snapshot, retry: () => { void loadPing(id, true).catch(() => {}) } }
}
