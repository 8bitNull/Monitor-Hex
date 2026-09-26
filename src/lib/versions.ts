export type Versions = {hub:string;hub_latest:string;agent_latest:string;notice:boolean}

/** Unknown/custom builds must not be advertised as either current or outdated. */
export function compareVersion(current:string,latest:string):number|null {
 const parse=(value:string)=>/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim())
 const a=parse(current),b=parse(latest)
 if(!a||!b)return null
 for(let i=1;i<=3;i++){const x=BigInt(a[i]),y=BigInt(b[i]);if(x!==y)return x<y?-1:1}
 if(a[4]===b[4])return 0
 if(!a[4])return 1
 if(!b[4])return -1
 const x=a[4].split('.'),y=b[4].split('.')
 for(let i=0;i<Math.max(x.length,y.length);i++){
  if(x[i]===undefined)return -1
  if(y[i]===undefined)return 1
  if(x[i]===y[i])continue
  const xn=/^\d+$/.test(x[i]),yn=/^\d+$/.test(y[i])
  if(xn&&yn){const left=BigInt(x[i]),right=BigInt(y[i]);if(left===right)continue;return left<right?-1:1}
  if(xn!==yn)return xn?-1:1
  return x[i]<y[i]?-1:1
 }
 return 0
}

export function readVersions(value:unknown):Versions {
 if(!value||typeof value!=='object')throw new Error('Invalid version response')
 const v=value as Record<string,unknown>
 if(typeof v.hub!=='string'||typeof v.hub_latest!=='string'||typeof v.agent_latest!=='string'||typeof v.notice!=='boolean')throw new Error('Invalid version response')
 return v as Versions
}
