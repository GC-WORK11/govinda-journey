// node scripts/v5/probe.mjs [i]   — bridge walkable probe.
// Teleports the player onto bridge i (midpoint + at ends), reports whether they fall
// through, and dumps walkable names + blockers near the exit. QA diagnostic.
import { withChrome, DESKTOP } from '../chrome.mjs'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const i = +(process.argv[2] || 0)
setTimeout(() => process.exit(3), 240000).unref()

await withChrome(async (b) => {
  const p = await b.newPage(); await p.setViewport(DESKTOP)
  p.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 200)))
  await p.goto('http://localhost:5190/?qa', { waitUntil: 'networkidle2' })
  for (let t = 0; ; t++) { if (await p.evaluate(async () => { try { const c = await import('/src/v5/core.ts'); return c.walkables.size > 0 } catch { return false } }).catch(() => false)) break; if (t > 60) { console.log('never ready'); process.exit(2) } await sleep(500) }
  const out = await p.evaluate(async (bi) => {
    const c = await import('/src/v5/core.ts')
    const l = await import('/src/v5/world/layout.ts')
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const st = c.useV5.getState()
    if (!st.done.includes(c.V5_ORDER[bi])) st.complete(c.V5_ORDER[bi])
    await new Promise(r => setTimeout(r, 2600)) // let the bridge build
    const walkNames = [...c.walkables].map((o) => o.name || o.type).filter((n) => /bridge|walk/i.test(n))
    // deck profile mirrors Bridge5's deckAt: flat at top+0.05 inside each rim
    // (RIM_CLEAR), sag only across the open-air span.
    const RIM_CLEAR = 5.85, TOP_OFF = 0.05
    const hdx = to.x - from.x, hdz = to.z - from.z, hlen = Math.hypot(hdx, hdz)
    const rimDist = (e, dx, dz) => { const b = e.x * dx + e.z * dz; return -b + Math.sqrt(Math.max(0, b * b + RIM_CLEAR * RIM_CLEAR - (e.x * e.x + e.z * e.z))) }
    const sA = rimDist({ x: l.EXIT.x, z: l.EXIT.z }, hdx / hlen, hdz / hlen)
    const sB = rimDist({ x: l.ENTRY.x, z: l.ENTRY.z }, -hdx / hlen, -hdz / hlen)
    const span = Math.max(1e-6, hlen - sA - sB)
    const deck = (a, b2, t) => {
      const x = a.x + (b2.x - a.x) * t, z = a.z + (b2.z - a.z) * t, s = t * hlen
      let y
      if (s <= sA) y = a.y + TOP_OFF
      else if (s >= hlen - sB) y = b2.y + TOP_OFF
      else { const u = (s - sA) / span; y = a.y + TOP_OFF + (b2.y - a.y) * u - Math.sin(u * Math.PI) * 0.55 }
      return { x, y, z }
    }
    const from = { x: l.ISLAND_POS[bi].x + l.EXIT.x, y: l.ISLAND_POS[bi].y + l.EXIT.y, z: l.ISLAND_POS[bi].z + l.EXIT.z }
    const to = { x: l.ISLAND_POS[bi + 1].x + l.ENTRY.x, y: l.ISLAND_POS[bi + 1].y + l.ENTRY.y, z: l.ISLAND_POS[bi + 1].z + l.ENTRY.z }
    const nearBlockers = []
    const box = new THREE.Box3()
    for (const o of c.blockers) {
      box.setFromObject(o)
      if (box.isEmpty()) continue
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2
      if (Math.hypot(cx - from.x, cz - from.z) < 4) nearBlockers.push({ name: o.name || o.type, x: +cx.toFixed(1), z: +cz.toFixed(1), y0: +box.min.y.toFixed(1), y1: +box.max.y.toFixed(1) })
    }
    const res = { bi, done: c.useV5.getState().done, walkNames, nearBlockers, tests: [] }
    for (const t of [0.05, 0.5, 0.9]) {
      const d = deck(from, to, t)
      if (window.__journey?.player?.teleport) window.__journey.player.teleport(d.x, d.y + 0.5, d.z)
      else { c.player.pos.set(d.x, d.y + 0.5, d.z); c.player.vel.set(0, 0, 0) }
      c.player.frozen = false
      await new Promise(r => setTimeout(r, 1200))
      res.tests.push({ t, put: d.y.toFixed(2), afterY: c.player.pos.y.toFixed(2), grounded: c.player.grounded, island: c.player.island })
    }
    return res
  }, i)
  console.log(JSON.stringify(out, null, 1))
})
process.exit(0)
