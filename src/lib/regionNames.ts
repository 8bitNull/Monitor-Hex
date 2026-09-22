import {tr,locale} from './i18n'
import {UNKNOWN_REGION} from './groups'
const names=new Map<string,Intl.DisplayNames>()
export function countryName(code:string){if(code===UNKNOWN_REGION)return tr("未知地区");try{return (names.get(locale())||names.set(locale(),new Intl.DisplayNames([locale()],{type:'region'})).get(locale())!).of(code)||code}catch{return tr("未知地区")}}
