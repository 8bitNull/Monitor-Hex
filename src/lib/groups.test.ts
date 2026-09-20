import assert from 'node:assert/strict'
import { groupRegions, regionKey, systemKey } from './groups.ts'
import { browseNodes, defaultBrowse } from './browse.ts'
import type { Node } from './api.ts'
assert.equal(regionKey(' jp '),'JP');assert.equal(regionKey('ZZ'),'unknown');assert.equal(regionKey('XX'),'unknown');assert.equal(regionKey(null),'unknown')
assert.equal(systemKey('Ubuntu 24.04'),'Linux');assert.equal(systemKey('Microsoft Windows'),'Windows');assert.equal(systemKey('Darwin'),'macOS');assert.equal(systemKey('FreeBSD'),'BSD');assert.equal(systemKey(''),'other')
const nodes = ['JP','jp','HK','','XX'].map((country,i)=>({id:i+1,name:`node${i}`,country,online:i%2===0,sort:i,os:'Debian Linux',arch:'x86_64'} as Node))
const groups=groupRegions(nodes)
assert.equal(groups.reduce((s,g)=>s+g.total,0),nodes.length)
assert.equal(groups.reduce((s,g)=>s+g.online,0),3)
assert.equal(groups.find(g=>g.code==='unknown')!.total,2)
assert.equal(groups.find(g=>g.code==='JP')!.total,2)
assert.equal(browseNodes(nodes,{...defaultBrowse,region:'unknown'}).length,2)
assert.equal(browseNodes(nodes,{...defaultBrowse,query:'Japan'}).length,2)
console.log('region normalization, unknown counts, groups and bilingual search passed')
