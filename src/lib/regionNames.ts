import {tr,locale} from './i18n'
import {UNKNOWN_REGION} from './groups'
export function countryName(code:string){if(code===UNKNOWN_REGION)return tr("未知地区");try{return new Intl.DisplayNames([locale()],{type:'region'}).of(code)||code}catch{return tr("未知地区")}}
