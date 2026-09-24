import { useEffect, useState, useMemo, useCallback, type SetStateAction } from 'react'
import { normalizePreferences, type Preferences, type DisplayPatch } from './appearance'
export { palettes } from './appearance'
export type { Preferences } from './appearance'
const personalKeys = ['appearance', 'probe', 'summaryCollapsed', 'detailInfoMode'] as const

export function usePreferences(siteDefaults: Preferences) {
  const [overrides, setOverrides] = useState<Record<string,unknown>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('monitor-next') || '{}')
      const next = normalizePreferences(saved, siteDefaults)
      const personal: Record<string,unknown> = {}
      for (const key of personalKeys) if (Object.hasOwn(saved || {},key) && saved[key] === next[key]) personal[key] = next[key]
      if (!Object.hasOwn(saved || {},'appearance')) {
        const mode = localStorage.getItem('monitor-next-mode')
        if (mode === 'dark' || mode === 'light') personal.appearance = mode
      }
      if (!Object.hasOwn(saved || {},'probe')) {
        try { const old = JSON.parse(sessionStorage.getItem('monitor-next-browse-v1') || '{}');
          if (typeof old.probe === 'string' && /^[1-9]\d*$/.test(old.probe) && Number.isSafeInteger(Number(old.probe))) personal.probe = old.probe;
        } catch { /* Old browse storage is optional. */ }
      }
      return personal
    } catch { return {} }
  })
  const prefs=useMemo(()=>normalizePreferences(overrides,siteDefaults),[overrides,siteDefaults])
  const setPrefs=useCallback((next:SetStateAction<Preferences>)=>setOverrides(current=>{
    const resolved=typeof next==='function'?next(normalizePreferences(current,siteDefaults)):next
    return Object.fromEntries(personalKeys.filter(key=>Object.hasOwn(current,key) || resolved[key] !== siteDefaults[key]).map(key=>[key,resolved[key]]))
  }),[siteDefaults])
  useEffect(() => { try { localStorage.setItem('monitor-next', JSON.stringify({_storageVersion:1,schemaVersion:3,designVersion:1,...overrides})) } catch { /* Storage may be disabled. */ } }, [overrides])
  const selectDisplay=useCallback((patch:DisplayPatch)=>setOverrides(current=>patch.detailInfoMode ? {...current,detailInfoMode:patch.detailInfoMode} : current),[])
  return [prefs, setPrefs, selectDisplay] as const
}
export function useAppearance(mode: Preferences['appearance']) {
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const dark = mode === 'system' ? systemDark : mode === 'dark'
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light' }, [dark])
  return dark
}

