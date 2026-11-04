// node scripts/clip-audit.mjs <ID[,ID...]|all> [--shots] [--done] [baseUrl]
// Collision/clipping audit for V5 islands: loads /?qa&fresh&at=<ID>&unlock,
// captures the R3F scene via the __THREE_DEVTOOLS__ hook, and reports:
//   pairs    — world Box3 intersections between visible meshes on this island
//              (big merged meshes are voxelized per-triangle to kill AABB noise)
//   rockHits — mesh vertices inside the island's rock body (ropes/props through rock)
//   float    — mesh bottoms hovering above the island top
//   sunk     — mesh bottoms buried deep under the island top
// One browser session audits every listed island (the chrome lock is contended).
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { withChrome, DESKTOP } from './chrome.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const IDS = (argv[0] || 'I01') === 'all' ? ['I01', 'L05', 'L04'] : argv[0].split(',')
const BASE = argv.find((a) => a.startsWith('http')) || 'http://localhost:5205/'
const SHOTS = process.argv.slice(2).includes('--shots')
const DONE = process.argv.slice(2).includes('--done')

const here = path.dirname(fileURLToPath(import.meta.url))
const outdir = path.join(here, '..', 'proofs', 'v7', 'clipB')
mkdirSync(outdir, { recursive: true })

setTimeout(() => { console.log('hard timeout'); process.exit(3) }, 1200000).unref()

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

const AUDIT = async ({ ID }) => {
  const THREE = await import('/node_modules/.vite/deps/three.js')
  const l = await import('/src/v5/world/layout.ts')
  const c = await import('/src/v5/core.ts')
  let scene = window.__scene
  if (!scene) {
    for (const o of c.walkables) { let root = o; while (root.parent) root = root.parent; scene = root; break }
  }
  if (!scene || !scene.isScene) return { err: 'no scene' }

  const i = c.V5_ORDER.indexOf(ID)
  const R = l.ISLAND_R
  const isle = l.ISLAND_POS[i]
  const isleGrp = scene.getObjectByName(`island-${ID}`)
  if (!isleGrp) return { err: `island-${ID} not mounted` }

  const PROF = [
    [0.0, 0.97], [-0.05, 1.0], [-0.18, 1.04], [-0.36, 0.98], [-0.46, 0.84], [-0.58, 0.9],
    [-0.72, 0.78], [-0.9, 0.83], [-1.05, 0.7], [-1.28, 0.74], [-1.46, 0.6], [-1.72, 0.65],
    [-1.9, 0.51], [-2.14, 0.55], [-2.38, 0.42], [-2.7, 0.35], [-3.0, 0.23], [-3.34, 0.1], [-3.8, 0.001],
  ].map(([y, f]) => [y, f * R])
  const rockR = (y) => {
    if (y >= -0.46) return PROF[0][1]
    for (let k = 0; k < PROF.length - 1; k++) {
      const [y0, r0] = PROF[k], [y1, r1] = PROF[k + 1]
      if (y <= y0 && y >= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0)
    }
    return 0
  }
  const topY = (d) => (d > R * 0.96 ? 0 : 0.06 * Math.max(0, 1 - (d / (R * 0.96)) ** 1.7))

  const chain = (o) => { const out = []; for (let q = o; q; q = q.parent) out.push(q); return out.reverse() }
  const pathOf = (o) => chain(o).map((q) => q.name || q.type).join('>')
  const visOK = (o) => {
    for (let q = o; q; q = q.parent) if (q.visible === false) return false
    const m = o.material
    if (m && (Array.isArray(m) ? m.some((x) => x && x.visible === false) : m.visible === false)) return false
    if (m && !Array.isArray(m) && (m.colorWrite === false || (m.transparent && m.opacity === 0))) return false
    return true
  }
  const lcp = (a, b) => { const ca = chain(a), cb = chain(b); let k = 0; while (k < Math.min(ca.length, cb.length) && ca[k] === cb[k]) k++; return k }

  const wanted = [isleGrp]
  for (const bi of [i - 1, i]) {
    const b = scene.getObjectByName(`bridge-${bi}`)
    if (b) wanted.push(b)
  }

  const meshes = []
  const V = new THREE.Vector3(), SZ = new THREE.Vector3()
  scene.updateMatrixWorld(true)
  for (const root of wanted) {
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return
      if (!visOK(o)) return
      const path = pathOf(o)
      if (/SkinnedMesh|traveller|student|pet_/i.test(path)) return
      const box = new THREE.Box3()
      try { box.setFromObject(o) } catch { return }
      if (box.isEmpty()) return
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2
      const size = box.getSize(SZ)
      const tris = ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) | 0
      const isBase = size.x > R * 1.5 && size.y > 2.2 && Math.abs(cx - isle.x) < 1.5 && Math.abs(cz - isle.z) < 1.5
      meshes.push({ o, path, box, tris, isBase, big: tris > 90 || size.x > 3.4 || size.z > 3.4, layer: root === isleGrp ? 'isle' : root.name, lx: +(cx - isle.x).toFixed(2), lz: +(cz - isle.z).toFixed(2) })
    })
  }

  const CS = 0.22
  function voxels(m) {
    const pos = m.o.geometry.attributes.position
    const idx = m.o.geometry.index
    const n = idx ? idx.count : pos.count
    const cells = new Map()
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3()
    for (let t = 0; t < n; t += 3) {
      const ia = idx ? idx.getX(t) : t, ib = idx ? idx.getX(t + 1) : t + 1, ic = idx ? idx.getX(t + 2) : t + 2
      a.fromBufferAttribute(pos, ia).applyMatrix4(m.o.matrixWorld)
      b.fromBufferAttribute(pos, ib).applyMatrix4(m.o.matrixWorld)
      d.fromBufferAttribute(pos, ic).applyMatrix4(m.o.matrixWorld)
      const x0 = Math.floor(Math.min(a.x, b.x, d.x) / CS), x1 = Math.floor(Math.max(a.x, b.x, d.x) / CS)
      const y0 = Math.floor(Math.min(a.y, b.y, d.y) / CS), y1 = Math.floor(Math.max(a.y, b.y, d.y) / CS)
      const z0 = Math.floor(Math.min(a.z, b.z, d.z) / CS), z1 = Math.floor(Math.max(a.z, b.z, d.z) / CS)
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const k2 = `${x},${y},${z}`
        const cl = cells.get(k2)
        if (cl) { cl.y0 = Math.min(cl.y0, Math.min(a.y, b.y, d.y)); cl.y1 = Math.max(cl.y1, Math.max(a.y, b.y, d.y)) }
        else cells.set(k2, { y0: Math.min(a.y, b.y, d.y), y1: Math.max(a.y, b.y, d.y) })
      }
    }
    return cells
  }
  for (const m of meshes) if (m.big) m.cells = voxels(m)

  const ib = new THREE.Box3()
  const pairs = []
  for (let a = 0; a < meshes.length; a++) {
    const A = meshes[a]
    for (let b = a + 1; b < meshes.length; b++) {
      const B = meshes[b]
      if (A.isBase && B.isBase) continue
      if (!A.box.intersectsBox(B.box)) continue
      const depth = lcp(A.o, B.o)
      if (depth >= 4) continue
      ib.copy(A.box).intersect(B.box)
      const dx = ib.max.x - ib.min.x, dy = ib.max.y - ib.min.y, dz = ib.max.z - ib.min.z
      if (dx < 0.03 || dy < 0.03 || dz < 0.03) continue
      const vol = dx * dy * dz
      const szA = A.box.getSize(SZ.clone()), va = szA.x * szA.y * szA.z
      const szB = B.box.getSize(SZ.clone()), vb = szB.x * szB.y * szB.z
      const cover = vol / Math.min(va, vb)
      const at = [+((ib.min.x + ib.max.x) / 2 - isle.x).toFixed(2), +((ib.min.y + ib.max.y) / 2 - isle.y).toFixed(2), +((ib.min.z + ib.max.z) / 2 - isle.z).toFixed(2)]
      if (A.big || B.big) {
        const big = A.big ? A : B
        let hits = 0
        const x0 = Math.floor(ib.min.x / CS), x1 = Math.floor(ib.max.x / CS)
        const y0 = Math.floor(ib.min.y / CS), y1 = Math.floor(ib.max.y / CS)
        const z0 = Math.floor(ib.min.z / CS), z1 = Math.floor(ib.max.z / CS)
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
          if (big.cells.get(`${x},${y},${z}`)) hits++
        if (hits < 4 || (vol < 0.004 && cover < 0.1)) continue
        pairs.push({ kind: big.isBase ? 'into-island' : 'into-merged', a: A.path, b: B.path, hits, cover: +cover.toFixed(2), d: [+dx.toFixed(2), +dy.toFixed(2), +dz.toFixed(2)], at, la: [A.lx, A.lz], lb: [B.lx, B.lz] })
      } else {
        if (vol < 0.004 && cover < 0.12) continue
        pairs.push({ kind: 'pair', a: A.path, b: B.path, cover: +cover.toFixed(2), d: [+dx.toFixed(2), +dy.toFixed(2), +dz.toFixed(2)], at, la: [A.lx, A.lz], lb: [B.lx, B.lz] })
      }
    }
  }
  pairs.sort((x, y) => (y.hits || 0) - (x.hits || 0) || y.cover - x.cover)

  const rockHits = [], float = [], sunk = []
  for (const m of meshes) {
    if (m.isBase) continue
    const pos = m.o.geometry.attributes?.position
    if (pos) {
      const stride = Math.max(1, Math.floor(pos.count / 500))
      let inside = 0, deep = 0, worst = 0, wx = 0, wz = 0, wy = 0
      for (let k = 0; k < pos.count; k += stride) {
        V.fromBufferAttribute(pos, k).applyMatrix4(m.o.matrixWorld)
        const dx = V.x - isle.x, dz = V.z - isle.z, dy = V.y - isle.y
        const d = Math.hypot(dx, dz)
        if (dy < -0.05 && dy > -4.4) {
          const rr = rockR(dy)
          if (d < rr * 0.88) {
            inside++
            const dep = rr * 0.88 - d
            if (dep > worst) { worst = dep; wx = dx; wy = dy; wz = dz }
          }
          if (dy < -0.3 && d < rr * 0.8) deep++
        }
      }
      if (inside > 2) rockHits.push({ path: m.path, n: inside, deep, worst: +worst.toFixed(2), at: [+wx.toFixed(2), +wy.toFixed(2), +wz.toFixed(2)], l: [m.lx, m.lz] })
    }
    const dC = Math.hypot((m.box.min.x + m.box.max.x) / 2 - isle.x, (m.box.min.z + m.box.max.z) / 2 - isle.z)
    if (dC < R * 0.97) {
      const gap = m.box.min.y - isle.y - topY(dC)
      const span = Math.min(m.box.max.x - m.box.min.x, m.box.max.z - m.box.min.z)
      if (gap > 0.12 && m.box.max.y - isle.y < 3 && span < 4.5 && m.tris > 12 && !m.o.isSprite)
        float.push({ path: m.path, gap: +gap.toFixed(2), l: [m.lx, m.lz] })
      if (m.box.max.y - isle.y < 0.15 && m.box.min.y - isle.y < -0.45)
        sunk.push({ path: m.path, top: +(m.box.max.y - isle.y).toFixed(2), l: [m.lx, m.lz] })
    }
  }
  rockHits.sort((a, b) => b.n - a.n)
  float.sort((a, b) => b.gap - a.gap)
  const trim = (s) => s.replace(/^Scene>/, '').slice(0, 140)
  const mapM = (p) => ({ ...p, a: p.a && trim(p.a), b: p.b && trim(p.b), path: p.path && trim(p.path) })
  return {
    island: ID, meshes: meshes.length,
    pairs: pairs.slice(0, 70).map(mapM),
    rockHits: rockHits.slice(0, 40).map(mapM),
    float: float.slice(0, 30).map(mapM),
    sunk: sunk.slice(0, 30).map(mapM),
  }
}

await withChrome(async (b) => {
  const p = await b.newPage()
  await p.setViewport(DESKTOP)
  p.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 200)))
  await p.evaluateOnNewDocument(HOOK)
  for (const ID of IDS) {
    let ready = false
    for (let attempt = 0; attempt < 3 && !ready; attempt++) {
      await p.goto(`${BASE}?qa&fresh&at=${ID}&unlock`, { waitUntil: 'networkidle2', timeout: 90000 }).catch((e) => console.log('goto:', e.message.slice(0, 120)))
      for (let t = 0; t < 80 && !ready; t++) {
        ready = await p.evaluate(async () => {
          try { const c = await import('/src/v5/core.ts'); return c.walkables.size > 0 } catch { return false }
        }).catch(() => false)
        if (!ready) await sleep(600)
      }
    }
    if (!ready) { console.log(`${ID}: never ready`); continue }
    await sleep(4000)
    const rep = await p.evaluate(AUDIT, { ID })
    writeFileSync(path.join(outdir, `audit-${ID}.json`), JSON.stringify(rep, null, 1))
    console.log(`=== ${ID} (${rep.meshes ?? '?'} meshes) ===`)
    for (const k of ['pairs', 'rockHits', 'float', 'sunk']) {
      const arr = rep[k] || []
      console.log(` ${k} (${arr.length})`)
      for (const it of arr.slice(0, 18)) console.log('   ', JSON.stringify(it))
    }

    if (DONE) {
      await p.evaluate((id) => { try { window.__journey?.v5?.complete?.(id) } catch {} }, ID)
      await sleep(2400)
      const rep2 = await p.evaluate(AUDIT, { ID })
      writeFileSync(path.join(outdir, `audit-${ID}-done.json`), JSON.stringify(rep2, null, 1))
      console.log(`=== ${ID} DONE (${rep2.meshes ?? '?'} meshes) ===`)
      for (const k of ['pairs', 'rockHits', 'float', 'sunk']) {
        const arr = rep2[k] || []
        console.log(` ${k} (${arr.length})`)
        for (const it of arr.slice(0, 14)) console.log('   ', JSON.stringify(it))
      }
    }

    if (SHOTS) {
      await p.evaluate(async (id) => {
        const c = await import('/src/v5/core.ts')
        const l = await import('/src/v5/world/layout.ts')
        const i = c.V5_ORDER.indexOf(id)
        const pt = l.ISLAND_POS[i].clone().add(l.ENTRY)
        window.__journey?.player?.teleport?.(pt.x, pt.y + 0.3, pt.z)
        c.player.island = id
      }, ID)
      await sleep(900)
      const orbit = async (name, dx, dy, zoom, wait = 1200) => {
        await p.evaluate(async ([dx, dy, zoom]) => {
          const { input } = await import('/src/v5/player/input.ts')
          input.camDX += dx; input.camDY += dy; input.zoom += zoom
        }, [dx, dy, zoom])
        await sleep(wait)
        await p.screenshot({ path: path.join(outdir, `${ID}-${name}.png`) })
      }
      await orbit('a', 0, 0, 800, 1500)
      await orbit('b', 700, -100, 0)
      await orbit('c', 700, -40, 0)
      await orbit('d', 700, 0, 0)
      await orbit('e', 700, 40, 0)
      await orbit('f', 700, 60, -300)
      await orbit('top', 0, -500, -600)
    }

    // fallback solve-check: real goto + teleport + the island's own solver,
    // then verify the store flags it done (covers passability if play.mjs
    // can't win a second lock slot before the deadline)
    const solved = await p.evaluate(async (id) => {
      const c = await import('/src/v5/core.ts')
      const l = await import('/src/v5/world/layout.ts')
      const i = c.V5_ORDER.indexOf(id)
      window.__journey?.v5?.goto?.(id)
      const pt = l.ISLAND_POS[i].clone().add(l.ENTRY)
      window.__journey?.player?.teleport?.(pt.x, pt.y + 0.3, pt.z)
      try { await window.__journey?.solve?.[id]?.() } catch (e) { return 'solve threw: ' + e.message }
      for (let t = 0; t < 100; t++) {
        if (c.useV5.getState().done.includes(id)) return 'done'
        await new Promise((r) => setTimeout(r, 200))
      }
      return 'not-done'
    }, ID).catch((e) => 'eval failed: ' + e.message.slice(0, 80))
    console.log(` ${ID}: solve-check -> ${solved}`)
    await p.screenshot({ path: path.join(outdir, `${ID}-solved.png`) }).catch(() => {})
  }
}, { maxWaitMs: 20 * 60000 })
process.exit(0)
