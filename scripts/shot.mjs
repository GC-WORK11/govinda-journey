// node scripts/shot.mjs <out.png> "<url>" [390x844]   (env WAIT ms, default 6000). Goes through scripts/chrome.mjs.
import { withChrome, MOBILE, DESKTOP } from './chrome.mjs'
const [out, url, size] = process.argv.slice(2)
const logs = []
await withChrome(async (b) => {
  const p = await b.newPage(); await p.setViewport(size === '390x844' ? MOBILE : DESKTOP)
  p.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text()) }); p.on('pageerror', (e) => logs.push('pageerror: ' + e.message))
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }); await new Promise((r) => setTimeout(r, +(process.env.WAIT || 6000)))
  await p.screenshot({ path: out })
})
for (const l of logs.slice(0, 10)) console.log(l.slice(0, 300))
process.exit(0)
