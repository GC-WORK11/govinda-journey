// clip-spot: 90-second evidence grab — finale world, teleport to the L06
// mouth (the worst burial measured), screenshot the bridge-on-rim line.
// Usage: node scripts/v5/clip-spot.mjs [baseUrl]
import { withChrome, DESKTOP } from '../chrome.mjs'
const BASE = (process.argv[2] || 'http://localhost:5304/').replace(/\/?$/, '/')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await withChrome(async (b) => {
  const p = await b.newPage()
  await p.setViewport(DESKTOP)
  p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 140)))
  await p.goto(`${BASE}?qa&finale&nomerge&lite`, { waitUntil: 'domcontentloaded' })
  for (let t = 0; t < 150; t++) {
    const ok = await p.evaluate(async () => { try { const c = await import('/src/v5/core.ts'); return c.walkables.size > 0 } catch { return false } }).catch(() => false)
    if (ok) break
    if (t % 15 === 14) console.log('mounting…')
    await sleep(1000)
  }
  // stand just inside the L06 rim looking back down the I02->L06 span
  await p.evaluate(async () => {
    const c = await import('/src/v5/core.ts')
    const l = await import('/src/v5/world/layout.ts')
    const i = c.V5_ORDER.indexOf('L06')
    const pos = l.ISLAND_POS[i]
    c.player.pos.set(pos.x + 1.2, pos.y + 0.1, pos.z + 6.1) // just past the entry lip
    c.player.vel.set(0, 0, 0); c.player.island = 'L06'; c.player.frozen = false
  })
  await sleep(5000) // bridge meshes + follow cam settle
  await p.screenshot({ path: 'proofs/v5/clip-spot-L06-mouth.png' })
  console.log('shot: proofs/v5/clip-spot-L06-mouth.png')
}, { maxWaitMs: 45 * 60000 })
process.exit(0)
