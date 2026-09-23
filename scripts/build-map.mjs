import {readFileSync,writeFileSync} from 'node:fs'
import {geoNaturalEarth1,geoPath,geoCentroid} from 'd3-geo'
import {feature} from 'topojson-client'
import {gzipSync} from 'node:zlib'
// Project once at build time. A 0.25px tolerance is at most 1.5px at maximum zoom.
const world=JSON.parse(readFileSync(new URL('../src/data/world.json',import.meta.url)))
const countries=feature(world,world.objects.countries).features.filter(f=>f.properties?.name!=='Antarctica')
const projection=geoNaturalEarth1().fitExtent([[28,28],[972,452]],{type:'FeatureCollection',features:countries})
const path=geoPath(projection).digits(1)
const aliases={US:'United States of America',TR:'Turkey',KR:'South Korea',KP:'North Korea',RU:'Russia',TW:'Taiwan',CZ:'Czechia'}
const names=new Intl.DisplayNames(['en'],{type:'region'}),codes=new Map()
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b),name=aliases[code]||names.of(code);if(name!==code)codes.set(name,code)}
function simplify(points,tolerance=.25){
 if(points.length<5)return points
 const list=[...points,points[0]],keep=new Set([0,list.length-1]),stack=[[0,list.length-1]]
 while(stack.length){const [start,end]=stack.pop(),a=list[start],b=list[end],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;let max=tolerance*tolerance,index=-1
 for(let i=start+1;i<end;i++){const p=list[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i}}
 if(index!==-1){keep.add(index);stack.push([start,index],[index,end])}}
 const result=[...keep].sort((a,b)=>a-b).slice(0,-1).map(i=>list[i]);return result.length>=3?result:points
}
function compact(d){return d.replace(/M([^Z]+)Z/g,(_,ring)=>{const numbers=ring.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number),points=[];for(let i=0;i<numbers.length;i+=2)points.push([numbers[i],numbers[i+1]]);return 'M'+simplify(points).map(p=>p.join(',')).join('L')+'Z'})}
const shapes=countries.map(f=>({code:codes.get(f.properties.name)||'',name:f.properties.name,d:compact(path(f)||'')}))
const points={};for(const f of countries){const code=codes.get(f.properties.name);if(code){const p=projection(geoCentroid(f));points[code]=p.map(n=>+n.toFixed(2))}}
for(const [code,ll] of Object.entries({US:[-98,39],RU:[95,60],HK:[114.17,22.32],MO:[113.55,22.2],SG:[103.82,1.35]}))points[code]=projection(ll).map(n=>+n.toFixed(2))
const json=JSON.stringify({shapes,points});writeFileSync(new URL('../src/data/map-paths.json',import.meta.url),json+'\n');console.log(`Map: ${shapes.length} shapes, ${Buffer.byteLength(json)} bytes, gzip ${gzipSync(json).length} bytes`)
