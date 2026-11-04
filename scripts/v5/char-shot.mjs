// node scripts/v5/char-shot.mjs <spec.json>
// Batch character screenshots in ONE shared-chrome hold, one reused tab.
// spec: { "shots": [ {"url": "...", "out": "proofs/char/a.png", "wait": 3000,
//                     "walk": 1200, "run": true, "size": "desktop"|"mobile" } ] }
import { readFileSync, existsSync, statSync } from 'fs'
import { withChrome, DESKTOP, MOBILE } from '../chrome.mjs'
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'))
spec.shots = spec.shots.filter((s) => !existsSync(s.out) || statSync(s.out).size < 30000)
if (!spec.shots.length) { console.log('all shots present'); process.exit(0) }
setTimeout(() => { console.log('timeout'); process.exit(3) }, 20 * 60000).unref()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await withChrome(async (b) => {
  const errs = []
  const p = await b.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)))
  const ready = async (probe) => {
    // cold vite can 504 on mid-reload dep re-optimizes; wait for a real
    // canvas (+ fj:playable on level pages), reloading once if starved.
    for (let a = 0; a < 3; a++) {
      const ok = await p.waitForFunction(
        (probe) => !!document.querySelector('canvas') && (probe || performance.getEntriesByName('fj:playable').length > 0),
        { timeout: 40000, polling: 700 }, probe
      ).then(() => true).catch(() => false)
      if (ok) return true
      try { await p.reload({ waitUntil: 'networkidle2', timeout: 60000 }) } catch {}
    }
    return false
  }
  for (const s of spec.shots) {
    try {
      await p.setViewport(s.size === 'mobile' ? MOBILE : DESKTOP)
      await p.goto(s.url, { waitUntil: 'networkidle2', timeout: 90000 })
      const ok = await ready(s.probe)
      if (!ok) console.log('not-ready', s.out)
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
    } catch (e) { console.log('FAIL', s.out, String(e).slice(0, 140)) }
  }
  for (const e of errs.slice(0, 8)) console.log(e)
  if (!errs.length) console.log('no console errors')
})
process.exit(0)
