// node scripts/clipD-audit.mjs [baseUrl] [--jobs=...]
// clipD collision/clipping audit. Per island, computes world-space AABBs of every
// rendered mesh under island-<ID>, its bridges and its dressing group; reports
// suspicious interpenetrating pairs, items sunk into island rock, near-ground
// hovers, and bridge rope/deck vertices piercing an island. Then orbits the
// camera and saves multi-angle screenshots under proofs/v7/clipD/.
// Shares the single box Chrome via scripts/chrome.mjs withChrome (lock).
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { withChrome, DESKTOP, MOBILE } from './chrome.mjs'

const argv = process.argv.slice(2)
const base = (argv.find((a) => !a.startsWith('--')) || 'http://localhost:5207/').replace(/\/?$/, '/')
const opt = (n) => (argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1]
const JOBS = opt('jobs') || 'L08-unsolved,L08-solved,L09-unsolved,L09-solved,finale,finale-lite'

const here = path.dirname(fileURLToPath(import.meta.url))
const outdir = path.resolve(here, '..', 'proofs', 'v7', 'clipD')
mkdirSync(outdir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const T0 = Date.now()
const log = (m) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, m)
setTimeout(() => { log('clipD-audit hard timeout'); process.exit(3) }, 1500000).unref()

// ---- in-page audit (plain JS — geometry.boundingBox and matrixWorld come from
//      the app's own objects; no three import needed) -------------------------
const AUDIT_FN = String.raw`(id) => {
  const lay = window.__clipLay
  const scene = window.__clipScene
  const ORDER = window.__clipCore.V5_ORDER
  const i = ORDER.indexOf(id)
  const C = lay.ISLAND_POS[i]
  const R = lay.ISLAND_R
  const topY = (d) => d > R * 0.96 ? 0 : 0.04 * Math.max(0, 1 - (d / (R * 0.96)) ** 1.7)

  // scene children placed exactly at this island's position = dressing groups
  // (IslandDressing5 mounts world-space <group position={islandPos(id)}>)
  const roots = [scene.getObjectByName('island-' + id), scene.getObjectByName('bridge-' + i), scene.getObjectByName('bridge-' + (i - 1))].filter(Boolean)
  scene.children.forEach((o) => {
    if (roots.includes(o) || !o.position) return
    if (Math.abs(o.position.x - C.x) < 0.02 && Math.abs(o.position.z - C.z) < 0.02 && Math.abs(o.position.y - C.y) < 0.02) roots.push(o)
  })

  const invisible = (o) => {
    for (let p = o; p; p = p.parent) if (p.visible === false) return true
    const m = o.material
    if (!m) return false
    const ms = Array.isArray(m) ? m : [m]
    return ms.every((x) => x.visible === false || x.colorWrite === false || (x.transparent && (x.opacity ?? 1) <= 0.01))
  }
  const tag = (o) => o.name || (o.type + (o.parent ? ':' + o.parent.children.indexOf(o) : ''))
  const rootOf = (o) => { for (let p = o; p; p = p.parent) if (roots.includes(p)) return p; return null }
  const pathOf = (o) => {
    const bits = []
    for (let p = o; p; p = p.parent) { if (roots.includes(p)) { bits.unshift(p.name || 'dressing'); break } bits.unshift(tag(p)) }
    return bits.join('/')
  }
  const topOf = (o, r) => { // first node under the scope root — the "prop" it belongs to
    let top = o
    for (let p = o; p && p !== r; p = p.parent) top = p
    return tag(top)
  }

  const meshes = []
  for (const root of roots) {
    root.updateWorldMatrix(true, true)
    root.traverse((o) => {
      if (!o.isMesh || o.userData.autoMerged || invisible(o) || o.isSkinnedMesh) return
      const g = o.geometry
      if (!g || !g.attributes || !g.attributes.position) return
      if (!g.boundingBox) { try { g.computeBoundingBox() } catch { return } }
      const bb = g.boundingBox
      if (!bb || bb.isEmpty()) return
      const we = o.matrixWorld.elements
      const rootEl = rootOf(o)
      const push = (ie) => {
        const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]
        for (const cx of [bb.min.x, bb.max.x]) for (const cy of [bb.min.y, bb.max.y]) for (const cz of [bb.min.z, bb.max.z]) {
          let x = cx, y = cy, z = cz
          if (ie) { const a = ie; const nx = a[0] * x + a[4] * y + a[8] * z + a[12]; const ny = a[1] * x + a[5] * y + a[9] * z + a[13]; const nz = a[2] * x + a[6] * y + a[10] * z + a[14]; x = nx; y = ny; z = nz }
          const wx = we[0] * x + we[4] * y + we[8] * z + we[12]
          const wy = we[1] * x + we[5] * y + we[9] * z + we[13]
          const wz = we[2] * x + we[6] * y + we[10] * z + we[14]
          min[0] = Math.min(min[0], wx); min[1] = Math.min(min[1], wy); min[2] = Math.min(min[2], wz)
          max[0] = Math.max(max[0], wx); max[1] = Math.max(max[1], wy); max[2] = Math.max(max[2], wz)
        }
        meshes.push({ o, ie, min, max, root: rootEl.name || 'dressing', top: topOf(o, rootEl), path: pathOf(o), geo: g.type })
      }
      if (o.isInstancedMesh) for (let k = 0; k < o.count; k++) push(o.instanceMatrix.array.slice(k * 16, k * 16 + 16))
      else push(null)
    })
  }

  const ctr = (m) => [(m.min[0] + m.max[0]) / 2, (m.min[1] + m.max[1]) / 2, (m.min[2] + m.max[2]) / 2]
  const size = (m) => [m.max[0] - m.min[0], m.max[1] - m.min[1], m.max[2] - m.min[2]]
  const vol = (m) => { const s = size(m); return Math.max(1e-6, s[0] * s[1] * s[2]) }
  const desc = (m) => {
    const c = ctr(m), s = size(m)
    return (m.o.name || m.geo) + '@(' + c.map((v) => +v.toFixed(2)).join(',') + ')s(' + s.map((v) => +v.toFixed(2)).join(',') + ') ' + m.path
  }
  const vertInside = (m, box, step = 3) => {
    const pos = m.o.geometry.attributes.position
    const we = m.o.matrixWorld.elements
    const n = pos.count
    const st = Math.max(1, Math.floor(n / 400))
    for (let k = 0; k < n; k += st) {
      let x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k)
      if (m.ie) {
        const a = m.ie
        const nx = a[0] * x + a[4] * y + a[8] * z + a[12]; const ny = a[1] * x + a[5] * y + a[9] * z + a[13]; const nz = a[2] * x + a[6] * y + a[10] * z + a[14]
        x = nx; y = ny; z = nz
      }
      const wx = we[0] * x + we[4] * y + we[8] * z + we[12]
      const wy = we[1] * x + we[5] * y + we[9] * z + we[13]
      const wz = we[2] * x + we[6] * y + we[10] * z + we[14]
      if (wx > box.min[0] && wx < box.max[0] && wy > box.min[1] && wy < box.max[1] && wz > box.min[2] && wz < box.max[2]) return true
    }
    return false
  }

  // ---- 1. pairwise AABB overlaps ----
  const pairs = []
  for (let a = 0; a < meshes.length; a++) for (let b = a + 1; b < meshes.length; b++) {
    const A = meshes[a], B = meshes[b]
    if (A.o === B.o) continue
    const dx = Math.min(A.max[0], B.max[0]) - Math.max(A.min[0], B.min[0])
    const dy = Math.min(A.max[1], B.max[1]) - Math.max(A.min[1], B.min[1])
    const dz = Math.min(A.max[2], B.max[2]) - Math.max(A.min[2], B.min[2])
    if (dx < 0.02 || dy < 0.02 || dz < 0.02) continue
    const minD = Math.min(dx, dy, dz)
    const ov = dx * dy * dz
    const ratio = ov / Math.min(vol(A), vol(B))
    const sameTop = A.top === B.top && A.root === B.root
    const thr = sameTop ? 0.16 : 0.05
    if (minD < thr || ratio < 0.03) continue
    const deep = vertInside(A, B) || vertInside(B, A)
    if (!deep && minD < 0.25) continue
    pairs.push({ a: desc(A), b: desc(B), sameTop, d: [dx, dy, dz].map((v) => +v.toFixed(2)), minD: +minD.toFixed(2), ratio: +ratio.toFixed(2), vi: deep })
  }
  pairs.sort((x, y) => (y.vi - x.vi) || (y.minD - x.minD) || (y.ratio - x.ratio))

  // ---- 2. sunk into the island rock / hovering just above it ----
  const sunk = [], hover = []
  for (const m of meshes) {
    const c = ctr(m)
    const d = Math.hypot(c[0] - C.x, c[2] - C.z)
    if (d > R * 1.04) continue
    const surf = C.y + topY(d)
    const minGap = m.min[1] - surf
    if (m.min[1] < surf - 0.09) {
      if (m.max[1] > surf + 0.02) sunk.push({ m: desc(m), ctr: c.map((v) => +v.toFixed(2)), depth: +(surf - m.min[1]).toFixed(2) })
    } else if (minGap > 0.09 && minGap < 0.55 && (m.max[1] - m.min[1]) < 2.5) {
      hover.push({ m: desc(m), ctr: c.map((v) => +v.toFixed(2)), gap: +minGap.toFixed(2) })
    }
  }
  sunk.sort((a, b) => b.depth - a.depth); hover.sort((a, b) => b.gap - a.gap)

  // ---- 3. bridge/rope vertices inside either neighbouring island ----
  const insideIsle = []
  for (const rootName of ['bridge-' + i, 'bridge-' + (i - 1)]) {
    const root = scene.getObjectByName(rootName); if (!root) continue
    root.traverse((o) => {
      if (!o.isMesh || o.userData.autoMerged || invisible(o)) return
      const pos = o.geometry.attributes && o.geometry.attributes.position; if (!pos) return
      const we = o.matrixWorld.elements
      const st = Math.max(1, Math.floor(pos.count / 900))
      for (let k = 0; k < pos.count; k += st) {
        const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k)
        const wx = we[0] * x + we[4] * y + we[8] * z + we[12]
        const wy = we[1] * x + we[5] * y + we[9] * z + we[13]
        const wz = we[2] * x + we[6] * y + we[10] * z + we[14]
        for (const ii of [i, i - 1, i + 1]) {
          if (ii < 0 || ii >= lay.ISLAND_POS.length) continue
          const P = lay.ISLAND_POS[ii]
          const d = Math.hypot(wx - P.x, wz - P.z)
          if (d < R * 0.97 && wy < P.y + topY(d) - 0.06) {
            insideIsle.push({ bridge: rootName, isle: ORDER[ii], mesh: o.name || o.geometry.type, at: [wx, wy, wz].map((v) => +v.toFixed(2)), d: +d.toFixed(2), below: +(P.y + topY(d) - wy).toFixed(2) })
          }
        }
      }
    })
  }

  // ---- 4. prop centres hanging over the void ----
  const overVoid = []
  for (const m of meshes) {
    const c = ctr(m)
    const d = Math.hypot(c[0] - C.x, c[2] - C.z)
    const s = size(m)
    if (d > R * 1.05 && c[1] < C.y + 1.6 && c[1] > C.y - 3 && Math.max(s[0], s[2]) > 0.25)
      overVoid.push({ m: desc(m), ctr: c.map((v) => +v.toFixed(2)), d: +d.toFixed(2) })
  }

  return { id, n: meshes.length, roots: roots.map((r) => r.name || 'dressing'), pairs: pairs.slice(0, 80), sunk: sunk.slice(0, 40), hover: hover.slice(0, 40), insideIsle: insideIsle.slice(0, 60), overVoid: overVoid.slice(0, 30) }
}`

async function bootPage(browser, url, vp = DESKTOP) {
  log('boot ' + url)
  const page = await browser.newPage()
  await page.setViewport(vp)
  page.setDefaultTimeout(90000)
  page.on('pageerror', (e) => log('  pageerror: ' + String(e).slice(0, 160)))
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  log('  goto done')
  for (let t = 0; t < 60; t++) {
    const ok = await page.evaluate(() => {
      const j = window.__journey
      return !!(j && j.v5 && j.player && document.querySelector('canvas'))
    }).catch(() => false)
    if (ok) break
    if (t === 59) log('  warn: app never ready, continuing anyway')
    await sleep(750)
  }
  log('  app ready')
  await page.evaluate(async () => {
    const core = await import('/src/v5/core.ts')
    const lay = await import('/src/v5/world/layout.ts')
    const inp = await import('/src/v5/player/input.ts')
    window.__clipCore = core; window.__clipLay = lay; window.__clipInput = inp.input
    let scene = null
    const climb = (o) => { let p = o; while (p.parent) p = p.parent; return p }
    for (const o of core.walkables) { const p = climb(o); if (p.isScene) { scene = p; break } }
    if (!scene) for (const o of core.blockers) { const p = climb(o); if (p.isScene) { scene = p; break } }
    window.__clipScene = scene
    // defeat the ?at re-pin: a far-future synthetic key counts as live input
    inp.input.synth.set('KeyQ', performance.now() + 1e9)
  })
  log('  scene hooked')
  // let lazy chunks, GLB props and merges settle — poll mesh count stability
  let last = -1, stable = 0
  for (let t = 0; t < 40 && stable < 3; t++) {
    const n = await page.evaluate(() => { let n = 0; window.__clipScene?.traverse((o) => { if (o.isMesh) n++ }); return n })
    if (n === last) stable++; else { stable = 0; last = n }
    await sleep(700)
  }
  log(`  settled (${last} meshes)`)
  await sleep(1200)
  return page
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(outdir, file), type: 'jpeg', quality: 62 })
  console.log('  shot', file)
}

async function orbit(page, file, { yaw = 0, pitch = null, zoom = null, settle = 950 }) {
  await page.evaluate(({ yaw, pitch, zoom }) => {
    const inp = window.__clipInput
    inp.camDX += -yaw / 0.0052
    if (pitch !== null) inp.camDY += pitch / 0.0044
    if (zoom !== null) inp.zoom += zoom
  }, { yaw, pitch, zoom })
  await sleep(settle)
  await shot(page, file)
}

async function auditAndOrbit(page, id, tag, orbits = true) {
  const rep = await page.evaluate(`(${AUDIT_FN})('${id}')`)
  console.log(`  audit ${tag}: meshes=${rep.n} pairs=${rep.pairs.length} sunk=${rep.sunk.length} hover=${rep.hover.length} insideIsle=${rep.insideIsle.length} overVoid=${rep.overVoid.length} roots=${rep.roots.join(',')}`)
  const C = await page.evaluate((lid) => {
    const lay = window.__clipLay
    const i = window.__clipCore.V5_ORDER.indexOf(lid)
    return { x: lay.ISLAND_POS[i].x, y: lay.ISLAND_POS[i].y, z: lay.ISLAND_POS[i].z }
  }, id)
  if (!orbits) return rep
  await shot(page, `${tag}-entry.jpg`)
  await page.evaluate(([x, y, z]) => window.__journey.player.teleport(x, y, z), [C.x, C.y + 1, C.z])
  await sleep(800)
  await orbit(page, `${tag}-n.jpg`, { zoom: 520 })
  await orbit(page, `${tag}-e.jpg`, { yaw: -Math.PI / 2 })
  await orbit(page, `${tag}-s.jpg`, { yaw: -Math.PI / 2 })
  await orbit(page, `${tag}-w.jpg`, { yaw: -Math.PI / 2 })
  await orbit(page, `${tag}-top.jpg`, { yaw: -Math.PI / 4, pitch: 0.55, zoom: 500 })
  await orbit(page, `${tag}-low.jpg`, { pitch: -1.0, zoom: -1200 })
  return rep
}

const report = {}
const jobs = JOBS.split(',')
log('waiting for chrome...')
await withChrome(async (browser) => {
  log('chrome acquired')
  for (const job of jobs) {
    const t0 = Date.now()
    if (job === 'L08-unsolved') {
      const page = await bootPage(browser, `${base}?qa&fresh&at=L08&unlock&nomerge`)
      report['L08-unsolved'] = await auditAndOrbit(page, 'L08', 'L08u')
      await page.close().catch(() => {})
    } else if (job === 'L08-solved') {
      // at L09 with &unlock → L08 mounted already-done: guardian aside, gate open
      const page = await bootPage(browser, `${base}?qa&fresh&at=L09&unlock&nomerge`)
      report['L08-solved'] = await auditAndOrbit(page, 'L08', 'L08s')
      report['L09-unsolved'] = await auditAndOrbit(page, 'L09', 'L09u')
      await page.close().catch(() => {})
    } else if (job === 'L09-unsolved') {
      if (!report['L09-unsolved']) {
        const page = await bootPage(browser, `${base}?qa&fresh&at=L09&unlock&nomerge`)
        report['L09-unsolved'] = await auditAndOrbit(page, 'L09', 'L09u')
        await page.close().catch(() => {})
      }
    } else if (job === 'L09-solved' || job === 'finale') {
      const page = await bootPage(browser, `${base}?qa&fresh&at=L09&finale&nomerge`)
      // vista shots while the pull-back settles
      await sleep(4500); await shot(page, 'finale-vista1.jpg')
      await sleep(5000); await shot(page, 'finale-vista2.jpg')
      await sleep(5000); await shot(page, 'finale-card.jpg')
      report['L09-solved'] = await page.evaluate(`(${AUDIT_FN})('L09')`)
      report['L08-finalestate'] = await page.evaluate(`(${AUDIT_FN})('L08')`)
      console.log(`  audit L09-solved: pairs=${report['L09-solved'].pairs.length} sunk=${report['L09-solved'].sunk.length} insideIsle=${report['L09-solved'].insideIsle.length}`)
      // release the cinematic and orbit the school close-up
      await page.evaluate(async () => {
        const core = await import('/src/v5/core.ts')
        const prog = await import('/src/v5/world/progress.ts')
        core.cinematic.on = false; prog.useWorldUI.setState({ finale: false })
      })
      await sleep(800)
      const C = await page.evaluate(() => {
        const lay = window.__clipLay
        const i = window.__clipCore.V5_ORDER.indexOf('L09')
        return { x: lay.ISLAND_POS[i].x, y: lay.ISLAND_POS[i].y, z: lay.ISLAND_POS[i].z }
      })
      await page.evaluate(([x, y, z]) => window.__journey.player.teleport(x, y, z), [C.x, C.y + 1, C.z])
      await sleep(900)
      await orbit(page, `L09s-n.jpg`, { zoom: 520 })
      await orbit(page, `L09s-e.jpg`, { yaw: -Math.PI / 2 })
      await orbit(page, `L09s-s.jpg`, { yaw: -Math.PI / 2 })
      await orbit(page, `L09s-w.jpg`, { yaw: -Math.PI / 2 })
      await page.close().catch(() => {})
    } else if (job === 'finale-lite') {
      const page = await bootPage(browser, `${base}?qa&fresh&at=L09&finale&lite`, MOBILE)
      await sleep(5000); await shot(page, 'finale-lite-vista.jpg')
      await page.close().catch(() => {})
    } else if (job === 'L08-lite' || job === 'L09-lite') {
      const id = job.slice(0, 3)
      const page = await bootPage(browser, `${base}?qa&fresh&at=${id}&unlock&lite&nomerge`, MOBILE)
      report[job] = await page.evaluate(`(${AUDIT_FN})('${id}')`)
      console.log(`  audit ${job}: pairs=${report[job].pairs.length} sunk=${report[job].sunk.length} insideIsle=${report[job].insideIsle.length}`)
      await shot(page, `${job}.jpg`)
      await page.close().catch(() => {})
    }
    console.log(`[${job}] ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
}, { maxWaitMs: 1200000 })

writeFileSync(path.join(outdir, 'audit.json'), JSON.stringify(report, null, 2))
console.log('\nwrote', path.join(outdir, 'audit.json'))
process.exit(0)
