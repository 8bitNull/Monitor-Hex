import {writeFile} from 'node:fs/promises'
const input=process.argv[2]
if(!input)throw new Error('Usage: node scripts/check-map-delivery.mjs https://your-site/')
const base=new URL(input),results=[]
async function inspect(url){const response=await fetch(url,{headers:{'Accept-Encoding':'gzip, br'},signal:AbortSignal.timeout(15000)});const body=await response.text();results.push({url:String(url),status:response.status,encoding:response.headers.get('content-encoding'),cache:response.headers.get('cache-control'),vary:response.headers.get('vary'),decodedBytes:Buffer.byteLength(body)});if(!response.ok)throw new Error(`HTTP ${response.status}: ${url}`);return body}
const html=await inspect(base)
const sources=[...html.matchAll(/(?:src|href)=["']([^"']+\.js)["']/g)].map(m=>new URL(m[1],base))
for(const url of sources){const js=await inspect(url);const match=js.match(/(?:\.\/|\/assets\/)?WorldMap-[\w-]+\.js/);if(match)await inspect(new URL(match[0],url))}
console.log(JSON.stringify(results,null,2))
if(!results.some(r=>r.url.includes('WorldMap-')))throw new Error('Map chunk not found; inspect the deployed entry bundle.')
await writeFile('map-delivery-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2))
