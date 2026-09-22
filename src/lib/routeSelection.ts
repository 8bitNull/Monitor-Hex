export type OpenRoutes = {kind:'single';id:number} | {kind:'all'}
export type RouteSelection = number[] | 'all' | null
export function readRouteSelection(value:string|null):RouteSelection {
  if(value===null)return null
  if(value==='all')return 'all'
  return [...new Set(value.split(',').map(Number).filter(id=>Number.isSafeInteger(id)&&id>0))]
}
export function selectedRouteIds(selection:RouteSelection,available:number[],primary?:number):number[] {
  return selection==='all'?available:selection??(primary===undefined?[]:[primary])
}
