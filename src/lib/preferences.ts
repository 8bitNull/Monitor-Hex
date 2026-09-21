import { useEffect, useState, useMemo, useCallback, type SetStateAction } from 'react'
import { normalizePreferences, preferenceOverrides, type Preferences, type DisplayPatch, defaultCardInfo } from './appearance'
export { palettes } from './appearance'
export type { Preferences } from './appearance'
export function usePreferences(siteDefaults: Preferences) {
  const [overrides, setOverrides] = useState<Record<string,unknown>>(() => {
    try {
      const stored = localStorage.getItem('monitor-next')
      const saved = JSON.parse(stored || '{}')
      const modern = saved?._storageVersion === 1
      const next = normalizePreferences(saved, siteDefaults)
      if (!modern && stored && saved && typeof saved === 'object' && !Array.isArray(saved) && Object.keys(saved).length > 0 && saved.designVersion !== 1) { next.skin = "lumina" }
      if (!modern && !saved?.appearance) {
        const mode = localStorage.getItem('monitor-next-mode')
        if (mode === 'dark' || mode === 'light') next.appearance = mode
      }
      if (!modern && !Object.hasOwn(saved || {}, 'probe')) {
        try { const old = JSON.parse(sessionStorage.getItem('monitor-next-browse-v1') || '{}');
          if (typeof old.probe === 'string' && /^[1-9]\d*$/.test(old.probe) && Number.isSafeInteger(Number(old.probe))) next.probe = old.probe;
        } catch { /* Old browse storage is optional. */ }
      }
      const overrides = preferenceOverrides(next,siteDefaults)
      // A recorded graph choice stays explicit even when it equals the site default.
      if (Object.hasOwn(saved || {}, 'graph') && ['bar','ring','columns','minimal'].includes(saved.graph)) overrides.graph = next.graph
      for(const key of ['mobileInfoMode','desktopColumns','mobileCardInfo'] as const) if(Object.hasOwn(saved || {},key)) overrides[key]=next[key]
      if(saved?.cardInfo && typeof saved.cardInfo==='object') overrides.cardInfo=Object.fromEntries(Object.keys(defaultCardInfo).filter(key=>typeof saved.cardInfo[key]==='boolean').map(key=>[key,saved.cardInfo[key]]))
      return overrides
    } catch { return {} }
  })
  const prefs=useMemo(()=>normalizePreferences(overrides,siteDefaults),[overrides,siteDefaults])
  const setPrefs=useCallback((next:SetStateAction<Preferences>, resetGraph=false, resetDisplay=false)=>setOverrides(current=>{
    const resolved=typeof next==='function'?next(normalizePreferences(current,siteDefaults)):next
    const overrides=preferenceOverrides(resolved,siteDefaults)
    if(!resetGraph && Object.hasOwn(current,'graph')) overrides.graph=resolved.graph
    if(!resetDisplay){
      for(const key of ['mobileInfoMode','desktopColumns','mobileCardInfo'] as const) if(Object.hasOwn(current,key)) overrides[key]=resolved[key]
      if(current.cardInfo && typeof current.cardInfo==='object') overrides.cardInfo={...(overrides.cardInfo as object || {}),...Object.fromEntries(Object.keys(current.cardInfo).filter(key=>key in defaultCardInfo).map(key=>[key,resolved.cardInfo[key as keyof typeof defaultCardInfo]]))}
    }
    return overrides
  }),[siteDefaults])
  const selectGraph=useCallback((graph:Preferences['graph'])=>setOverrides(current=>({...current,graph})),[])
  useEffect(() => { try { localStorage.setItem('monitor-next', JSON.stringify({_storageVersion:1,schemaVersion:2,designVersion:1,...overrides})) } catch { /* Storage may be disabled. */ } }, [overrides])
  const selectDisplay=useCallback((patch:DisplayPatch)=>setOverrides(current=>({...current,...patch,...(patch.cardInfo?{cardInfo:{...(current.cardInfo as object || {}),...patch.cardInfo}}:{})})),[])
  return [prefs, setPrefs, selectGraph, selectDisplay] as const
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

