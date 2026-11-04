// node scripts/v5/charshots.mjs <base-url> — all char probe shots in one Chrome lock hold.
import { withChrome, DESKTOP } from '../chrome.mjs'
const base = process.argv[2] || 'http://localhost:5201/char-probe.html'
const shots = [
  ['anim=idle&az=0', 'proofs/v7/char/r-front.png'],
  ['anim=idle&az=90', 'proofs/v7/char/r-side.png'],
  ['anim=idle&az=45', 'proofs/v7/char/r-34.png'],
  ['anim=idle&az=180', 'proofs/v7/char/r-back.png'],
  ['anim=walk&az=0&freeze=0.35', 'proofs/v7/char/r-run.png'],
  ['anim=walk&az=90&freeze=0.35', 'proofs/v7/char/r-walkside.png'],
  ['anim=jump&az=45&freeze=0.5', 'proofs/v7/char/r-jump.png'],
  ['anim=use&az=0&freeze=0.5', 'proofs/v7/char/r-use.png'],
  ['anim=cheer&az=0&freeze=0.5', 'proofs/v7/char/r-cheer.png'],
  ['anim=idle&az=0&night=1', 'proofs/v7/char/r-night.png'],
  ['anim=walk&az=45&freeze=0.35&night=1', 'proofs/v7/char/r-nightwalk.png'],
]
const logs = []
await withChrome(async (b) => {
  const p = await b.newPage()
  await p.setViewport(DESKTOP)
  p.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text()) })
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message))
  for (const [q, out] of shots) {
    await p.goto(base + '?' + q, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise((r) => setTimeout(r, 2200))
    await p.screenshot({ path: out })
    console.log('shot', out)
  }
})
for (const l of logs.slice(0, 10)) console.log(l.slice(0, 300))
process.exit(0)
