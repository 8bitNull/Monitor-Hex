import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
import { english } from '../src/lib/en.ts'
let checked=0
function scan(dir) {
 for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  const file=path.join(dir,entry.name)
  if(entry.isDirectory()) { scan(file); continue }
  if(!/\.tsx?$/.test(file)||file.includes('.test.')||entry.name==='en.ts') continue
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true)
  function visit(node) {
   if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='tr'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])) {
    const key=node.arguments[0].text
    if(!Object.hasOwn(english,key)) throw new Error(`Missing English text in ${file}: ${key}`)
    checked++
   }
   ts.forEachChild(node,visit)
  }
  visit(source)
 }
}
scan('src')
console.log(`${checked} literal translation calls covered`)
