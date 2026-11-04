// node scripts/v5/char-shot.mjs <spec.json>
// Batch character screenshots in ONE shared-chrome hold.
// spec: { "shots": [ {"url": "...", "out": "proofs/char/a.png", "wait": 3000,
//                     "walk": 1200, "run": true, "size": "desktop"|"mobile" } ] }
import { readFileSync } from 'fs'
import { withChrome, DESKTOP, MOBILE } from '../chrome.mjs'
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'))
setTimeout(() => { console.log('timeout'); process.exit(3) }, 15 * 60000).unref()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await withChrome(async (b) => {
  const errs = []
  for (const s of spec.shots) {
    const p = await b.newPage()
    await p.setViewport(s.size === 'mobile' ? MOBILE : DESKTOP)
    p.on('console', (m) => { if (m.type() === 'error') errs.push(s.out + ' console: ' + m.text()) })
    p.on('pageerror', (e) => errs.push(s.out + ' pageerror: ' + String(e).slice(0, 200)))
    try {
      await p.goto(s.url, { waitUntil: 'networkidle2', timeout: 60000 })
      await sleep(s.wait ?? 2800)
      if (s.walk || s.run) {
        if (s.run) await p.keyboard.down('ShiftLeft')
        await p.keyboard.down('KeyW')
        await sleep(s.walk || s.run)
        if (!s.freeze) { await p.keyboard.up('KeyW'); if (s.run) await p.keyboard.up('ShiftLeft'); await sleep(400) }
      }
      await p.screenshot({ path: s.out })
      if (s.freeze) { await p.keyboard.up('KeyW'); if (s.run) await p.keyboard.up('ShiftLeft') }
      const dbg = await p.evaluate(() => (window).__pldbg || null).catch(() => null)
      console.log('shot', s.out, 'dbg', JSON.stringify(dbg))
    } catch (e) { console.log('FAIL', s.out, String(e).slice(0, 160)) }
    await p.close()
  }
})
for (const e of errs.slice(0, 8)) console.log(e.slice(0, 220))
if (!errs.length) console.log('no console errors')
process.exit(0)
