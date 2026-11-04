// node scripts/v5/charuv.mjs — dump UV cell usage + write repainted atlas via char-tool.html
import { writeFileSync } from 'node:fs'
import { withChrome } from '../chrome.mjs'
const BASE = process.env.BASE || 'http://localhost:5201'
await withChrome(async (b) => {
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 200)))
  await p.goto(`${BASE}/char-tool.html?mask`, { waitUntil: 'networkidle2', timeout: 60000 })
  await p.waitForFunction('window.__uv || window.__err', { timeout: 30000 })
  const uv = await p.evaluate('window.__uv || {err: window.__err}')
  if (uv.err) { console.log('ERR', uv.err); return }
  writeFileSync('/tmp/char-cells.json', JSON.stringify(uv.cells, null, 1))
  writeFileSync('/tmp/char-mask.png', Buffer.from(uv.img.split(',')[1], 'base64'))
  console.log('cells written /tmp/char-cells.json, mask /tmp/char-mask.png')
})
process.exit(0)
