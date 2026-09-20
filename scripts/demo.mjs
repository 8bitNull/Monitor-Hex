// A separate local-only fixture server. Never included in dist or theme.tar.gz.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { nodes, metrics } from './fixtures.mjs'
const root = resolve(process.env.THEME_DEMO_ROOT || resolve(import.meta.dirname, '../dist'))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const reply = value => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)) }
  if (url.pathname === '/api/me') return reply({ authed: false, github: false, site_name: 'Monitor HEX · 演示', public_page: true })
  if (url.pathname === '/api/nodes') return reply({ nodes: nodes() })
  if (/^\/api\/nodes\/\d+\/metrics$/.test(url.pathname)) return reply(metrics())
  if (url.pathname.startsWith('/api/')) { res.writeHead(404); return res.end() }
  try {
    const name = url.pathname === '/' || /^\/node\//.test(url.pathname) ? '/index.html' : decodeURIComponent(url.pathname)
    const file = resolve(root, '.' + name)
    if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403); return res.end() }
    const data = await readFile(file)
    res.setHeader('content-type', types[extname(file)] || 'application/octet-stream'); res.end(data)
  } catch { res.writeHead(404); res.end('Not found') }
}).listen(Number(process.env.THEME_DEMO_PORT || 4173), '127.0.0.1', () => console.log(`Demo (sample data only): http://127.0.0.1:${process.env.THEME_DEMO_PORT || 4173}`))
