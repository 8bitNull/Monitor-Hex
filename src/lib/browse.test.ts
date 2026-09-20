import assert from 'node:assert/strict'
import { browseNodes, defaultBrowse } from './browse.ts'
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
