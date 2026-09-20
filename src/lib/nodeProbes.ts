import { useSyncExternalStore } from 'react'
const key='monitor-next-node-probes-v1'
const listeners=new Set<()=>void>()
let selections:Record<string,string>={}
try { const raw=JSON.parse(localStorage.getItem(key)||'{}'); if(raw && typeof raw==='object' && !Array.isArray(raw)) for(const [id,value] of Object.entries(raw).slice(0,10000)) if(/^[1-9]\d*$/.test(id)&&Number.isSafeInteger(Number(id))&&typeof value==='string'&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value))) selections[id]=value } catch { /* Optional storage. */ }
let revision=0
export const probeRevision=()=>revision
export const subscribeProbes=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
export const resolveProbe=(id:number,fallback:string)=>selections[id]||fallback
export function selectNodeProbe(id:number,value:string) { if(!Number.isSafeInteger(id)||id<1)return; if(value==='auto')delete selections[id];else if(/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value)))selections[id]=value;else return;save() }
function save(){try{localStorage.setItem(key,JSON.stringify(selections))}catch{/* Optional storage. */}revision++;listeners.forEach(f=>f())}
export function clearNodeProbes(){selections={};save()}
export function useNodeProbe(id:number,fallback:string){useSyncExternalStore(subscribeProbes,probeRevision);return {probe:resolveProbe(id,fallback),selected:selections[id]||'auto',select:(value:string)=>selectNodeProbe(id,value)}}
