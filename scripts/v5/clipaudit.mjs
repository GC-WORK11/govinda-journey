// node scripts/v5/clipaudit.mjs <port> <atID> [doneCSV] [--shots=dir]
// Collision/clipping audit for one V5 island view.
//   at=L02&unlock -> L01,L02 done (steps out), L03 unsolved, bridges 0-1 shown
//   at=I01&unlock -> L01..L03 done, bridges 0-2 shown, L03 pages placed
// Reports (JSON on stdout, plus optional orbit screenshots):
//   pairs    — world Box3 intersections between visible meshes (same-island zone)
//   rockHits — mesh vertices inside an island's rock body (ropes/props through rock)
//   float    — mesh bottoms hovering above the island top
//   sunk     — mesh bottoms buried deep under the island top
import { mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { withChrome, DESKTOP } from '../chrome.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const PORT = argv[0] || '5204'
const AT = argv[1] || 'L02'
const DONE = /^[LI]\d{2}(,[LI]\d{2})*$/.test(argv[2] || '') ? argv[2] : ''
const SHOTS = (process.argv.slice(2).find((a) => a.startsWith('--shots=')) || '').split('=')[1]
const BASE = `http://localhost:${PORT}`

const here = path.dirname(fileURLToPath(import.meta.url))
const outdir = SHOTS ? path.resolve(here, '..', '..', SHOTS) : null
if (outdir) mkdirSync(outdir, { recursive: true })

setTimeout(() => { console.log('hard timeout'); process.exit(3) }, 1500000).unref()

// devtools hook: capture the R3F scene via the wrapped renderer (installed pre-load)
const HOOK = () => {
  window.__scene = null
  window.__THREE_DEVTOOLS__ = new EventTarget()
  window.__THREE_DEVTOOLS__.addEventListener('observe', (e) => {
    const r = e.detail
    if (window.__scene || !r || !r.isWebGLRenderer) return
    const render = r.render
    r.render = function (scene, cam) { window.__scene = scene; return render.call(r, scene, cam) }
  })
}

await withChrome(async (b) => {
  const p = await b.newPage()
  await p.setViewport(DESKTOP)
  p.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 200)))
  await p.evaluateOnNewDocument(HOOK)
  await p.goto(`${BASE}/?qa&fresh&at=${AT}&unlock`, { waitUntil: 'networkidle2', timeout: 90000 })
  for (let t = 0; ; t++) {
    const ok = await p.evaluate(async () => {
      try { const c = await import('/src/v5/core.ts'); return c.walkables.size > 0 } catch { return false }
    }).catch(() => false)
    if (ok) break
    if (t > 60) { console.log('never ready'); process.exit(2) }
    await sleep(500)
  }
  await sleep(4500) // lazy GLB props land

  const audit = await p.evaluate(async (DONE_STR) => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const l = await import('/src/v5/world/layout.ts')
    const c = await import('/src/v5/core.ts')
    const done = DONE_STR ? DONE_STR.split(',') : []
    for (const id of done) { try { c.useV5.getState().complete(id) } catch {} }
    if (done.length) await new Promise((r) => setTimeout(r, 2200))
    const scene = window.__scene
    if (!scene) return { err: 'no scene (devtools hook missed the renderer)' }

    const R = l.ISLAND_R
    // island rock radius profile (from src/world/kit.tsx islandGeo), r=5, wobble ~+17%
    const PROF = [
      [0.0, 0.97], [-0.05, 1.0], [-0.18, 1.04], [-0.36, 0.98], [-0.46, 0.84], [-0.58, 0.9],
      [-0.72, 0.78], [-0.9, 0.83], [-1.05, 0.7], [-1.28, 0.74], [-1.46, 0.6], [-1.72, 0.65],
      [-1.9, 0.51], [-2.14, 0.55], [-2.38, 0.42], [-2.7, 0.35], [-3.0, 0.23], [-3.34, 0.1], [-3.8, 0.001],
    ].map(([y, f]) => [y, f * R])
    const rockR = (y) => {
      if (y >= 0) return PROF[0][1]
      for (let i = 0; i < PROF.length - 1; i++) {
        const [y0, r0] = PROF[i], [y1, r1] = PROF[i + 1]
        if (y <= y0 && y >= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0)
      }
      return 0
    }
    const nearest = (x, z) => {
      let bi = -1, bd = Infinity
      l.ISLAND_POS.forEach((ip, i) => { const d = Math.hypot(x - ip.x, z - ip.z); if (d < bd) { bd = d; bi = i } })
      return { i: bi, d: bd }
    }

    // ancestry path + effective visibility
    const chain = (o) => { const out = []; for (let q = o; q; q = q.parent) out.push(q); return out.reverse() }
    const pathOf = (o) => chain(o).map((q) => q.name || q.type).join('>')
    const visOK = (o) => {
      for (let q = o; q; q = q.parent) if (q.visible === false) return false
      const m = o.material
      if (m && (Array.isArray(m) ? m.some((x) => x && x.visible === false) : m.visible === false)) return false
      return true
    }

    // rig roots: top-level scene children that contain a skinned mesh (player/pet)
    const rigRoots = new Set()
    for (const ch of scene.children) {
      let skinned = false
      ch.traverse((o) => { if (o.isSkinnedMesh) skinned = true })
      if (skinned) rigRoots.add(ch)
    }
    const inRig = (o) => { for (let q = o; q; q = q.parent) if (rigRoots.has(q)) return true; return false }

    const meshes = []
    const V = new THREE.Vector3()
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return
      if (!o.geometry) return
      if (!visOK(o)) return
      if (inRig(o)) return
      const path = pathOf(o)
      if (/SkinnedMesh|Bone|traveller|student|pet_|blob/i.test(path)) return // player + pet rigs
      const box = new THREE.Box3()
      try { box.setFromObject(o) } catch { return }
      if (box.isEmpty()) return
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2
      const { i, d } = nearest(cx, cz)
      if (d > R + 4.5) return // too far from any island to matter here
      const isle = l.ISLAND_POS[i]
      const size = box.getSize(new THREE.Vector3())
      // island base signature: huge, spans full radius, ~4 m tall under the top
      const isBase = size.x > R * 1.7 && size.y > 2.5 && Math.abs(cx - isle.x) < 1 && Math.abs(cz - isle.z) < 1
      // ground-cover signature: wide flat sheet centered on the island (seeded
      // scatter / BloomField) — dresses the grass, overlaps everything by design
      const cover = size.x * size.z > 50 && size.y < 0.7 && Math.abs(cx - isle.x) < 2 && Math.abs(cz - isle.z) < 2
      meshes.push({
        idx: meshes.length, path, o, box, i, isBase, cover,
        cy: +((box.min.y + box.max.y) / 2).toFixed(2),
        lx: +(cx - isle.x).toFixed(2), lz: +(cz - isle.z).toFixed(2),
        min: [+box.min.x.toFixed(2), +box.min.y.toFixed(2), +box.min.z.toFixed(2)],
        max: [+box.max.x.toFixed(2), +box.max.y.toFixed(2), +box.max.z.toFixed(2)],
      })
    })

    const ib = new THREE.Box3()
    const pairs = []
    for (let a = 0; a < meshes.length; a++) {
      const A = meshes[a]
      if (A.isBase || A.cover) continue
      for (let b = a + 1; b < meshes.length; b++) {
        const B = meshes[b]
        if (B.isBase || B.cover || A.i !== B.i) continue
        if (!A.box.intersectsBox(B.box)) continue
        // same prop subtree? LCP depth >=4 -> inside one GLB/primitive, skip
        let lcp = 0
        const ca = chain(A.o), cb = chain(B.o)
        while (lcp < Math.min(ca.length, cb.length) && ca[lcp] === cb[lcp]) lcp++
        if (lcp >= 4) continue
        ib.copy(A.box).intersect(B.box)
        const dx = ib.max.x - ib.min.x, dy = ib.max.y - ib.min.y, dz = ib.max.z - ib.min.z
        if (dx < 0.025 || dy < 0.025 || dz < 0.025) continue
        const vol = dx * dy * dz
        const szA = A.box.getSize(V.clone()), va = szA.x * szA.y * szA.z
        const szB = B.box.getSize(V.clone()), vb = szB.x * szB.y * szB.z
        const cover = vol / Math.min(va, vb)
        if (vol < 0.0035 && cover < 0.12) continue
        const isle = l.ISLAND_POS[A.i]
        pairs.push({
          a: A.path, b: B.path,
          at: [+((ib.min.x + ib.max.x) / 2 - isle.x).toFixed(2), +((ib.min.y + ib.max.y) / 2 - isle.y).toFixed(2), +((ib.min.z + ib.max.z) / 2 - isle.z).toFixed(2)],
          isle: A.i, d: [+dx.toFixed(2), +dy.toFixed(2), +dz.toFixed(2)], vol: +vol.toFixed(3), cover: +cover.toFixed(2),
          la: [A.lx, A.lz], lb: [B.lx, B.lz],
        })
      }
    }
    pairs.sort((x, y) => y.vol * Math.min(1, y.cover + 0.2) - x.vol * Math.min(1, x.cover + 0.2))

    // ---- vertex-in-rock + float/sunk ----
    const rockHits = [], float = [], sunk = []
    for (const m of meshes) {
      if (m.isBase) continue
      const isle = l.ISLAND_POS[m.i]
      const pos = m.o.geometry.attributes?.position
      if (pos) {
        const stride = Math.max(1, Math.floor(pos.count / 450))
        let inside = 0, deep = 0, worst = 0, wx = 0, wz = 0, wy = 0
        for (let k = 0; k < pos.count; k += stride) {
          V.fromBufferAttribute(pos, k).applyMatrix4(m.o.matrixWorld)
          const dx = V.x - isle.x, dz = V.z - isle.z, dy = V.y - isle.y
          const d = Math.hypot(dx, dz)
          if (dy < -0.045 && dy > -4.4) {
            const rr = rockR(dy)
            if (d < rr * 0.9) { // safely inside the rock body (wobble margin)
              inside++
              const dep = rr * 0.9 - d
              if (dep > worst) { worst = dep; wx = dx; wy = dy; wz = dz }
            }
            if (dy < -0.3 && d < rr * 0.8) deep++
          }
        }
        if (inside > 2) rockHits.push({ path: m.path, isle: m.i, n: inside, deep, worst: +worst.toFixed(2), at: [+wx.toFixed(2), +wy.toFixed(2), +wz.toFixed(2)], l: [m.lx, m.lz] })
      }
      const dC = Math.hypot((m.min[0] + m.max[0]) / 2 - isle.x, (m.min[2] + m.max[2]) / 2 - isle.z)
      if (dC < R * 0.97 && !m.cover) {
        const gap = m.box.min.y - isle.y
        if (gap > 0.07 && gap < 3) {
          const span = Math.min(m.box.max.x - m.box.min.x, m.box.max.z - m.box.min.z)
          // supported? some other mesh's top sits just under this bottom, overlapping in xz
          const supported = meshes.some((n) =>
            n !== m && n.i === m.i &&
            n.box.max.y >= m.box.min.y - 0.12 && n.box.max.y <= m.box.min.y + 0.05 &&
            n.box.max.x >= m.box.min.x && n.box.min.x <= m.box.max.x &&
            n.box.max.z >= m.box.min.z && n.box.min.z <= m.box.max.z)
          if (!supported && span < 4.5) float.push({ path: m.path, isle: m.i, gap: +gap.toFixed(2), l: [m.lx, m.lz] })
        }
        if (m.box.max.y - isle.y < 0.15 && m.box.min.y - isle.y < -0.45) {
          sunk.push({ path: m.path, isle: m.i, top: +(m.box.max.y - isle.y).toFixed(2), l: [m.lx, m.lz] })
        }
      }
    }
    rockHits.sort((a, b) => b.n - a.n)
    float.sort((a, b) => b.gap - a.gap)

    const trim = (s) => s.replace(/^Scene>/, '').slice(0, 150)
    return {
      order: c.V5_ORDER,
      meshes: meshes.length,
      pairs: pairs.slice(0, 60).map((p) => ({ ...p, a: trim(p.a), b: trim(p.b) })),
      rockHits: rockHits.slice(0, 40).map((r) => ({ ...r, path: trim(r.path) })),
      float: float.slice(0, 30).map((r) => ({ ...r, path: trim(r.path) })),
      sunk: sunk.slice(0, 30).map((r) => ({ ...r, path: trim(r.path) })),
      done: c.useV5.getState().done,
    }
  }, DONE)

  console.log(JSON.stringify(audit, null, 1))

  // ---- optional screenshots: orbit the pinned player + zoom ----
  if (outdir) {
    const tag = `${AT}${DONE ? '-' + DONE.replace(/,/g, '') : ''}`
    const orbit = async (name, dx, dy, zoom, wait = 900) => {
      await p.evaluate(async ([dx, dy, zoom]) => {
        const { input } = await import('/src/v5/player/input.ts')
        input.camDX += dx; input.camDY += dy; input.zoom += zoom
      }, [dx, dy, zoom])
      await sleep(wait)
      await p.screenshot({ path: path.join(outdir, `${tag}-${name}.png`) })
    }
    await orbit('a', 0, 0, 700, 1400)       // zoomed out, entry view
    await orbit('b', 620, -120, 0)
    await orbit('c', 620, -60, 0)
    await orbit('d', 620, 40, 0)
    await orbit('e', 620, 60, 0)
    await orbit('f', 620, 60, -300)          // back closer
  }
})

process.exit(0)
