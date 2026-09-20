import assert from 'node:assert/strict'
import { tr, setLanguage, locale } from './i18n.ts'
import { english } from './en.ts'
import { uptime, clockFor } from './format.ts'
for(const [key,value] of Object.entries(english)) {
  assert.ok(value.trim(),key)
  assert.deepEqual([...key.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),[...value.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),key)
}
setLanguage('en')
assert.equal(tr('服务器总览'),'Server overview')
assert.equal(tr('查看 {0}','我的节点'),'View 我的节点')
assert.equal(tr('未登记词条'),'未登记词条')
assert.equal(locale(),'en-US')
assert.equal(uptime(90061),'1d 1h')
assert.ok(clockFor(168)(Date.UTC(2026,8,19)))
setLanguage('zh')
assert.equal(tr('服务器总览'),'服务器总览')
assert.equal(uptime(90061),'1 天 1 小时')
console.log('translation coverage placeholders, fallback, user text preservation and locale formats passed')
