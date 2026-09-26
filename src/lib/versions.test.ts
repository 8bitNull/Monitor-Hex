/// <reference types="node" />
import assert from 'node:assert/strict'
import {compareVersion,readVersions} from './versions.ts'
for(const [a,b,result] of [['1.9.0','1.10.0',-1],['v1.2.3','1.2.3+build',0],['2.0.0','1.9.0',1],['1.0.0-rc.2','1.0.0-rc.10',-1],['1.0.0-rc.1','1.0.0',-1],['custom','1.0.0',null],['','1.0.0',null]] as const)assert.equal(compareVersion(a,b),result)
assert.throws(()=>readVersions({hub:'1.0.0'}))
assert.equal(readVersions({hub:'1.0.0',hub_latest:'',agent_latest:'',notice:false}).notice,false)
