import assert from 'node:assert/strict'
import { browseNodes, defaultBrowse, normalizeBrowse, tableColumns, tablePreset, sortValue } from './browse.ts'
import type { Node } from './api.ts'
const create = (id: number, cpu: number | null): Node => ({ id, sort: id, name: `Node ${id}`, country: 'JP', os: 'Debian', arch: 'x86', online: cpu !== null, metrics: cpu === null ? null : { cpu }, expires_at: id === 1 ? '2027-01-01' : null } as Node)
const nodes = [create(3, null), create(2, 20), create(1, 80)]
assert.deepEqual(browseNodes(nodes, defaultBrowse).map(n => n.id), [1,2,3])
assert.deepEqual(browseNodes(nodes, { ...defaultBrowse, sort: 'cpu', direction: 'asc' }).map(n => n.id), [2,1,3])
assert.deepEqual(browseNodes(nodes, { ...defaultBrowse, sort: 'cpu', direction: 'desc' }).map(n => n.id), [1,2,3])
assert.equal(browseNodes(nodes, { ...defaultBrowse, query: '日本' }).length, 3)
assert.deepEqual(browseNodes(nodes, { ...defaultBrowse, sort: 'expiry', direction: 'desc' }).map(n => n.id), [1,2,3])
assert.deepEqual(browseNodes([create(2,20),create(1,20)], { ...defaultBrowse, sort:'cpu' }).map(n=>n.id), [1,2])
console.log('sorting, null-last, default order, ties and region search passed')

assert.deepEqual(tableColumns(defaultBrowse.columns,true,false),['name','cpu','memory','disk','speed','latency','traffic','expiry'])
assert.deepEqual(tableColumns(['download','latency'],true,true),['name','status','speed','latency'])
assert.deepEqual(tableColumns([],false,false),['name','status'])
assert.equal(normalizeBrowse({}).tableLayout,'grouped')
for(const version of [2,3,4]) {
 const old=normalizeBrowse({columnsVersion:version,columns:['cpu','upload'],mobileColumns:[]})
 assert.deepEqual(old.columns,['cpu','upload']);assert.deepEqual(old.mobileColumns,[])
 assert.equal(old.tableLayout,'separate');assert.equal(old.mobileTableLayout,'separate')
}
assert.deepEqual(normalizeBrowse({columns:['cpu']}).columns,['cpu','traffic'])
assert.deepEqual(normalizeBrowse({columnsVersion:3,columns:['download','alien']}).columns,['download'])
assert.equal(normalizeBrowse({columns:[],tableLayout:'grouped'}).tableLayout,'grouped')
assert.deepEqual(tablePreset('network',true),{mobileColumns:['upload','download','latency'],mobileTableLayout:'grouped'})
assert.deepEqual(Object.keys(tablePreset('billing',false)),['columns','tableLayout'])
assert.equal(normalizeBrowse(null).columnsVersion,4)
const {loadPing}=await import('./ping.ts')
globalThis.fetch=(async(input)=>{const id=Number(String(input).match(/nodes\/(\d+)/)![1]);return new Response(JSON.stringify({ping:[{task_id:1,ts:Date.now()/1000-(id===94?8000:0),latency:id===91?null:80}],loss:id===93?undefined:{1:id===91?10:0}}))}) as typeof fetch
await Promise.all([91,92,93,94].map(id=>loadPing(id)))
const qualityNodes=[91,92,93,94].map(id=>create(id,20))
assert.deepEqual(browseNodes(qualityNodes,{...defaultBrowse,sort:'loss',direction:'desc'}).map(n=>n.id),[91,92,93,94])
assert.deepEqual(browseNodes(qualityNodes,{...defaultBrowse,sort:'loss',direction:'asc'}).map(n=>n.id),[92,91,93,94])
assert.equal(sortValue({...qualityNodes[0],online:false},'loss','auto'),null)
assert.equal(sortValue(qualityNodes[0],'latency','auto'),null)
console.log('table grouping, independent presets, legacy columns, missing loss, stale and offline sorting passed')
