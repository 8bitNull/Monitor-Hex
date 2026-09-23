import {normalizeBrowse, type Browse} from './browse'
import {parsePreferences, type Preferences} from './appearance'
import {tr} from './i18n'

export type TableSettings = Pick<Browse,'columns'|'mobileColumns'|'tableLayout'|'mobileTableLayout'|'columnsVersion'>
export type SettingsBackup = {
  format:'monitor-hex-settings'
  version:1
  preferences:Preferences
  table:TableSettings
  language:'zh'|'en'
  nodeProbes:Record<string,string>
  mapHeight:'compact'|'expanded'
}

export function tableSettings(browse:Browse):TableSettings {
  return {columns:browse.columns,mobileColumns:browse.mobileColumns,tableLayout:browse.tableLayout,mobileTableLayout:browse.mobileTableLayout,columnsVersion:browse.columnsVersion}
}

export function createSettingsBackup(input:Omit<SettingsBackup,'format'|'version'>):string {
  const text=JSON.stringify({format:'monitor-hex-settings',version:1,...input} satisfies SettingsBackup,null,2)
  if(new TextEncoder().encode(text).length>262144)throw new Error(tr('配置文件不能超过 256 KB'))
  return text
}

export function parseSettingsBackup(text:string,siteDefaults:Preferences):{kind:'legacy';preferences:Preferences}|{kind:'bundle';settings:SettingsBackup} {
  if(text.length>262144)throw new Error(tr('配置文件不能超过 256 KB'))
  let input:unknown
  try {input=JSON.parse(text)} catch {throw new Error(tr('文件不是有效的 JSON 配置'))}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error(tr('配置必须是一个对象'))
  const data=input as Record<string,unknown>
  if(!Object.hasOwn(data,'format'))return {kind:'legacy',preferences:parsePreferences(text,siteDefaults)}
  if(data.format!=='monitor-hex-settings'||data.version!==1)throw new Error(tr('不支持此配置版本'))
  if(!data.preferences||typeof data.preferences!=='object'||Array.isArray(data.preferences))throw new Error(tr('配置缺少主题设置'))
  const preferences=parsePreferences(JSON.stringify(data.preferences),siteDefaults)
  const table=data.table
  if(!table||typeof table!=='object'||Array.isArray(table))throw new Error(tr('配置缺少表格设置'))
  const rawTable=table as Record<string,unknown>
  if(!Array.isArray(rawTable.columns)||!Array.isArray(rawTable.mobileColumns)||!['grouped','separate'].includes(String(rawTable.tableLayout))||!['grouped','separate'].includes(String(rawTable.mobileTableLayout)))throw new Error(tr('表格设置格式不正确'))
  const normalized=normalizeBrowse(rawTable)
  if(data.language!=='zh'&&data.language!=='en')throw new Error(tr('语言设置格式不正确'))
  if(data.mapHeight!=='compact'&&data.mapHeight!=='expanded')throw new Error(tr('地图设置格式不正确'))
  if(!data.nodeProbes||typeof data.nodeProbes!=='object'||Array.isArray(data.nodeProbes))throw new Error(tr('线路偏好格式不正确'))
  const entries=Object.entries(data.nodeProbes)
  if(entries.length>10000||entries.some(([id,value])=>!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id))||typeof value!=='string'||!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))))throw new Error(tr('线路偏好格式不正确'))
  return {kind:'bundle',settings:{format:'monitor-hex-settings',version:1,preferences,table:tableSettings(normalized),language:data.language,nodeProbes:Object.fromEntries(entries),mapHeight:data.mapHeight}}
}
