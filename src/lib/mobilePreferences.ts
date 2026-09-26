import {useEffect,useState} from 'react'
export type MobilePreferences={detailed:boolean;totals:boolean;hours:1|6|24}
export const mobileDefaults:MobilePreferences={detailed:false,totals:true,hours:6}
export function useMobilePreferences(){
 const [value,setValue]=useState<MobilePreferences>(()=>{try{const v=JSON.parse(localStorage.getItem('hex-mobile-v1')||'{}');return {detailed:v.detailed===true,totals:v.totals!==false,hours:[1,6,24].includes(v.hours)?v.hours:6}}catch{return mobileDefaults}})
 useEffect(()=>{try{localStorage.setItem('hex-mobile-v1',JSON.stringify(value))}catch{/* Optional local preferences. */}},[value])
 return [value,setValue] as const
}
