import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Preferences } from '@/lib/appearance'
export function useBackground(prefs: Preferences) {
  const [loaded, setLoaded] = useState('')
  const [failed, setFailed] = useState('')
  useEffect(() => {
    if (!prefs.backgroundUrl) return
    const url = prefs.backgroundUrl
    let active = true
    const img = new Image()
    // Do not send the monitoring page URL to external image hosts.
    img.referrerPolicy = 'no-referrer'
    const timer = setTimeout(() => { if (active) { setFailed(url); img.onload = null; img.onerror = null } }, 12000)
    img.onload = () => { clearTimeout(timer); if (active) { setLoaded(url); setFailed('') } }
    img.onerror = () => { clearTimeout(timer); if (active) setFailed(url) }
    img.src = url
    return () => { active = false; clearTimeout(timer); img.onload = null; img.onerror = null }
  }, [prefs.backgroundUrl])
  const ready = !!prefs.backgroundUrl && loaded === prefs.backgroundUrl && failed !== prefs.backgroundUrl
  const style = {
    '--photo-blur': `${prefs.backgroundBlur}px`, '--photo-mask': prefs.backgroundMask / 100,
    '--card-opacity': `${prefs.cardOpacity}%`, '--glass-blur': `${prefs.cardBlur}px`,
  } as CSSProperties
  return { ready, error: !!prefs.backgroundUrl && failed === prefs.backgroundUrl, style }
}
export function Background({ url }: { url: string }) {
  return <div className="site-background" aria-hidden="true"><img src={url} alt="" referrerPolicy="no-referrer" /><div className="photo-mask" /></div>
}
