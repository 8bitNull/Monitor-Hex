import {useEffect,useState} from 'react'
import type {Node} from './api'
import {LOAD_ALERT_KEY,readLoadAlerts,updateLoadAlerts} from './loadAlerts'
export function useLoadAlerts(nodes:Node[]|null,enabled:boolean){
 const [events,setEvents]=useState(()=>{try{return readLoadAlerts(localStorage.getItem(LOAD_ALERT_KEY))}catch{return []}})
 const [saved,setSaved]=useState(true)
 useEffect(()=>{
  const update=()=>setEvents(old=>{const next=updateLoadAlerts(old,nodes,enabled,Date.now());return JSON.stringify(old)===JSON.stringify(next)?old:next})
  update();const timer=setInterval(update,5000);return()=>clearInterval(timer)
 },[nodes,enabled])
 // Storage availability is external state and must be reported to the UI.
 // eslint-disable-next-line react/set-state-in-effect
 useEffect(()=>{try{localStorage.setItem(LOAD_ALERT_KEY,JSON.stringify(events));setSaved(true)}catch{setSaved(false)}},[events])
 return {events,saved}
}
