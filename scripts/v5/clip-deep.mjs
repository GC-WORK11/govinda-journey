// node scripts/v5/clip-audit.mjs [baseUrl] --only=I02,L06,L07 [--shots] [--done] [--size=1440|390] [--lite]
// Clip-audit for one level at a time:
//   * loads /?qa&fresh&at=<ID>&unlock, waits for the island subtree to mount
//   * computes world Box3 for every mesh under island-<ID> (and bridge meshes at its mouths)
//   * reports: prop-vs-prop box overlaps, props floating above / sunk into the island
//     top surface, solid meshes sitting on the walk corridor, and bridge rope/plank
//     vertices buried inside the island rock volume
//   * --shots: multi-angle screenshots (teleport + camDX orbit) into proofs/v7/clipC/
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { withChrome } from '../chrome.mjs'

const argv = process.argv.slice(2)
const base = (argv.find((a) => !a.startsWith('--')) || 'http://localhost:5206/').replace(/\/?$/, '/')
const opt = (n) => (argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1]
const flag = (n) => argv.includes('--' + n)
const ONLY = (opt('only') || 'I02,L06,L07').split(',')
const SIZE = opt('size') || '1440'
const SHOTS = flag('shots')
const DONE = flag('done')
const LITE = flag('lite') ? '&lite' : ''

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const outdir = path.join(root, 'proofs', 'v7', 'clipC')
mkdirSync(outdir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const VP = SIZE === '390' ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 }

/* Audit library — evaluated once inside the page; defines window.__clipAudit.
 * Everything works off live objects (no THREE import needed): Vector3/Box3
 * constructors are grabbed from a walkable mesh. */
const PAGE_LIB = `
window.__clipAudit = (id) => {
  const T = window.__clipT, core = T.core, layout = T.layout
  const idx = core.V5_ORDER.indexOf(id)
  const isl = T.isl[id] || null
  if (!isl) return { err: 'island-' + id + ' not mounted' }
  const center = layout.ISLAND_POS[idx], R = layout.ISLAND_R
  const V3 = T.V3, B3 = T.B3

  // island top surface approx (lathe profile, in island radii)
  const prof = [[0, 0.04], [0.34, 0.036], [0.68, 0.022], [0.95, 0], [1.0, -0.05], [1.04, -0.18], [1.2, -0.35]]
  const surfY = (d) => {
    const u = d / R
    for (let i = 0; i < prof.length - 1; i++) { const [a, ya] = prof[i], [b, yb] = prof[i + 1]; if (u <= b) return ya + (yb - ya) * ((u - a) / (b - a)) }
    return -0.35
  }
  // island radial bound at local height y (lip + underside envelope)
  const rimR = (y) => y >= -0.02 ? R * 0.96 : y >= -0.25 ? R * 1.06 : y >= -0.55 ? R * 1.0 :
    y >= -0.95 ? R * 0.86 : y >= -1.35 ? R * 0.72 : y >= -1.8 ? R * 0.62 : y >= -2.2 ? R * 0.52 :
    y >= -2.7 ? R * 0.4 : y >= -3.3 ? R * 0.22 : 0.02

  const B = new B3(), v = new V3()
  // layer roots: direct children of island-<ID>; diorama = the ×1.5625 group
  const layerRootOf = (ch) => (Math.abs((ch.scale?.x || 1) - 1.5625) < 0.01 && ch.children[0]) || ch
  const kinds = isl.children.map((ch, ci) => {
    let hasWalk = false, hasGate = false
    ch.traverse((o) => { if ((o.name || '').startsWith('walk-')) hasWalk = true; if ((o.name || '').startsWith('gate-')) hasGate = true })
    if (hasWalk) return 'base'
    if (hasGate) return 'gate'
    if (Math.abs((ch.scale?.x || 1) - 1.5625) < 0.01) return 'diorama'
    let meshN = 0, hasBlock = false
    ch.traverse((o) => { if (o.isMesh) meshN++ })
    for (const b of core.blockers) { let n = b; while (n.parent) { if (n.parent === ch) { hasBlock = true; break } n = n.parent } }
    return (meshN > 12 || hasBlock) ? 'obstacle' : 'deco'
  })

  const meshes = []
  isl.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return
    const mat = Array.isArray(o.material) ? o.material[0] : o.material
    const ghost = !o.visible || (mat && (mat.visible === false || mat.opacity === 0 || mat.colorWrite === false))
    B.setFromObject(o)
    if (B.isEmpty()) return
    // walk up: mesh -> ... -> prop -> layerRoot -> child -> isl
    let child = o; while (child.parent && child.parent !== isl) child = child.parent
    const ci = isl.children.indexOf(child)
    const lr = layerRootOf(child)
    let prop = o; while (prop.parent && prop.parent !== lr && prop !== lr) prop = prop.parent
    const cx = (B.min.x + B.max.x) / 2 - center.x, cz = (B.min.z + B.max.z) / 2 - center.z
    const d = Math.hypot(cx, cz)
    meshes.push({
      i: meshes.length, name: o.name || '', geo: o.geometry?.type || '?', child: ci, prop,
      ghost, box: { min: B.min.toArray().map((x) => +x.toFixed(3)), max: B.max.toArray().map((x) => +x.toFixed(3)) },
      c: [+cx.toFixed(2), +cz.toFixed(2)], d: +d.toFixed(2),
      gap: +(B.min.y - center.y - surfY(d)).toFixed(3),
    })
  })
  for (const m of meshes) m.layer = kinds[m.child] ?? '?'
  // prop id by subtree position (index inside its layer root)
  for (const m of meshes) m.pid = m.layer + ':' + (m.prop === m ? 'self' : (m.prop?.uuid || m.prop?.id || '?').toString().slice(-6))

  const out = { island: id, kinds, nMesh: meshes.length, overlaps: [], floats: [], sunk: [], corridor: [], rim: [], ropes: [] }

  const inter = (a, b) => {
    const ox = Math.min(a.box.max[0], b.box.max[0]) - Math.max(a.box.min[0], b.box.min[0])
    const oy = Math.min(a.box.max[1], b.box.max[1]) - Math.max(a.box.min[1], b.box.min[1])
    const oz = Math.min(a.box.max[2], b.box.max[2]) - Math.max(a.box.min[2], b.box.min[2])
    if (ox <= 0 || oy <= 0 || oz <= 0) return null
    return { ox: +ox.toFixed(3), oy: +oy.toFixed(3), oz: +oz.toFixed(3), vol: +(ox * oy * oz).toFixed(4) }
  }
  for (let i = 0; i < meshes.length; i++) for (let j = i + 1; j < meshes.length; j++) {
    const a = meshes[i], b = meshes[j]
    if (a.ghost && b.ghost) continue
    if (a.prop === b.prop) continue // same assembly
    const hit = inter(a, b)
    if (hit && hit.vol > 0.004 && Math.min(hit.ox, hit.oy, hit.oz) > 0.03)
      out.overlaps.push({ a: a.i, b: b.i, la: a.layer, lb: b.layer, pa: a.pid, pb: b.pid, ga: a.geo, gb: b.geo, ...hit, ca: a.c, cb: b.c })
  }
  out.overlaps.sort((x, y) => y.vol - x.vol)

  for (const m of meshes) {
    if (m.ghost) continue
    if (m.d < R * 1.04) {
      if (m.gap > 0.16 && m.box.max[1] - center.y < 2.5) out.floats.push({ i: m.i, layer: m.layer, geo: m.geo, c: m.c, d: m.d, gap: m.gap })
      if (m.gap < -0.12) out.sunk.push({ i: m.i, layer: m.layer, geo: m.geo, c: m.c, d: m.d, gap: m.gap })
    }
    if (m.d > R * 0.9 && m.d < R * 1.25) out.rim.push({ i: m.i, layer: m.layer, geo: m.geo, c: m.c, d: m.d, gap: m.gap })
    const x0 = m.box.min[0] - center.x, x1 = m.box.max[0] - center.x, y0 = m.box.min[1] - center.y, y1 = m.box.max[1] - center.y
    const zc = (m.box.min[2] + m.box.max[2]) / 2 - center.z
    if (x0 < 1.05 && x1 > -1.05 && y1 > 0.25 && y0 < 1.8 && Math.abs(zc) < 4.4 && m.d < R)
      out.corridor.push({ i: m.i, layer: m.layer, geo: m.geo, c: m.c, xw: [+x0.toFixed(2), +x1.toFixed(2)], y: [+y0.toFixed(2), +y1.toFixed(2)], zc: +zc.toFixed(2) })
  }

  // bridges at this island's mouths: mesh verts buried inside the island volume
  for (const bi of [idx - 1, idx]) {
    if (bi < 0 || bi >= core.V5_ORDER.length - 1) continue
    const bg = T.scene.getObjectByName('bridge-' + bi)
    if (!bg) continue
    bg.traverse((o) => {
      if (!o.isMesh) return
      const g = o.geometry; if (!g?.attributes?.position) return
      o.updateWorldMatrix(true, false)
      const pa = g.attributes.position
      const step = Math.max(1, Math.floor(pa.count / 600))
      let buried = 0, tested = 0
      for (let k = 0; k < pa.count; k += step) {
        v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld)
        const lx = v.x - center.x, ly = v.y - center.y, lz = v.z - center.z
        const d = Math.hypot(lx, lz)
        if (d > R * 1.25) continue
        tested++
        if (ly < surfY(d) - 0.03 && d < rimR(ly)) buried++
      }
      if (tested > 0) out.ropes.push({ bridge: 'bridge-' + bi, mesh: o.name || g.type, ghost: (o.name || '').startsWith('walk-'), tested, buried })
    })
  }
  return out
}
`

await withChrome(async (browser) => {
  const page = await browser.newPage()
  await page.setViewport(VP)
  page.on('pageerror', (e) => console.log('  pageerror: ' + e.message.slice(0, 200)))
  for (const id of ONLY) {
    const url = `${base}?qa&fresh&at=${id}&unlock${LITE}`
    console.log(`\n=== ${id} (${SIZE}${LITE ? ' lite' : ''}${DONE ? ' done' : ''}) ===`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    for (let t = 0; t < 60; t++) {
      const ok = await page.evaluate(() => !!(window.__journey && window.__journey.v5 && document.querySelector('canvas'))).catch(() => false)
      if (ok) break
      await sleep(750)
    }
    // inject audit lib once
    await page.evaluate((lib) => { eval(lib) }, PAGE_LIB)
    // self-healing ensure(): (re)grabs modules, constructors, scene root + the island handle
    const ensure = async () => page.evaluate(async (id, done) => {
      const T = (window.__clipT = window.__clipT || {})
      if (!T.core) {
        const [core, layout] = await Promise.all([import('/src/v5/core.ts'), import('/src/v5/world/layout.ts')])
        T.core = core; T.layout = layout
      }
      if (!T.V3 || !T.B3 || !T.scene) {
        let any = null
        for (const o of T.core.walkables) { any = o; break }
        if (!any) return 0
        T.V3 = any.position.constructor
        any.geometry.computeBoundingBox?.()
        T.B3 = any.geometry.boundingBox ? any.geometry.boundingBox.constructor : null
        let r = any; while (r.parent) r = r.parent; T.scene = r
      }
      if (done && !T.didDone) { T.didDone = true; try { window.__journey.v5.complete(id) } catch {} }
      T.isl = T.isl || {}
      const g = T.scene.getObjectByName('island-' + id)
      if (!g) return 0
      T.isl[id] = g
      let n = 0; g.traverse((o) => { if (o.isMesh) n++ })
      return n
    }, id, DONE).catch(() => 0)
    for (let t = 0; t < 40; t++) {
      await sleep(800)
      if ((await ensure()) > 8) break
    }
    await sleep(2500)
    const res = await page.evaluate((id) => window.__clipAudit(id), id).catch((e) => ({ err: String(e).slice(0, 300) }))
    const tag = `${id}${DONE ? '-done' : ''}${SIZE === '390' ? '-390' : ''}`
    writeFileSync(path.join(outdir, `audit-${tag}.json`), JSON.stringify(res, null, 1))
    if (res.err) console.log('  ERR ' + res.err)
    else {
      console.log(`  kinds: ${JSON.stringify(res.kinds)}  meshes: ${res.nMesh}`)
      console.log(`  overlaps(${res.overlaps.length}):`)
      for (const o of res.overlaps.slice(0, 26)) console.log(`    ${o.la}[${o.a}] ${o.ga} x ${o.lb}[${o.b}] ${o.gb} vol=${o.vol} axes=${o.ox},${o.oy},${o.oz} @${o.ca}`)
      console.log(`  floats(${res.floats.length}):`)
      for (const f of res.floats.slice(0, 20)) console.log(`    ${f.layer}[${f.i}] ${f.geo} @(${f.c}) d=${f.d} gap=+${f.gap}`)
      console.log(`  sunk(${res.sunk.length}):`)
      for (const s of res.sunk.slice(0, 20)) console.log(`    ${s.layer}[${s.i}] ${s.geo} @(${s.c}) d=${s.d} gap=${s.gap}`)
      console.log(`  corridor(${res.corridor.length}):`)
      for (const c of res.corridor.slice(0, 22)) console.log(`    ${c.layer}[${c.i}] ${c.geo} x=[${c.xw}] y=[${c.y}] zc=${c.zc}`)
      console.log(`  rim(${res.rim.length}):`)
      for (const r of res.rim.slice(0, 14)) console.log(`    ${r.layer}[${r.i}] ${r.geo} @(${r.c}) d=${r.d} gap=${r.gap}`)
      console.log(`  ropes(${res.ropes.length}):`)
      for (const r of res.ropes) console.log(`    ${r.bridge} ${r.mesh}${r.ghost ? ' (strip)' : ''} buried=${r.buried}/${r.tested}`)
    }
    if (SHOTS && !res.err) {
      const views = [
        { n: 'ne', yaw: 0.62, pitch: 0.5, dist: 1 }, { n: 'se', yaw: 2.2, pitch: 0.45, dist: 1 },
        { n: 'sw', yaw: 3.7, pitch: 0.5, dist: 1 }, { n: 'nw', yaw: 5.2, pitch: 0.45, dist: 1 },
        { n: 'low', yaw: 0.9, pitch: 0.12, dist: 0.6 }, { n: 'top', yaw: 0.62, pitch: 1.1, dist: 1.5 },
      ]
      for (const w of views) {
        await page.evaluate(async ({ yaw, pitch, dist, id }) => {
          const [inp, , layout] = await Promise.all([
            import('/src/v5/player/input.ts'), import('/src/v5/core.ts'), import('/src/v5/world/layout.ts')])
          const i = layout.V5_ORDER.indexOf(id)
          const c = layout.ISLAND_POS[i]
          window.__journey?.player?.teleport?.(c.x + 0.4, c.y + 0.2, c.z + 3.4)
          const curYaw = window.__clipYaw ?? 0, curPitch = window.__clipPitch ?? 0.42, curZoom = window.__clipZoom ?? 1
          inp.input.camDX += (curYaw - yaw) / -0.0052
          inp.input.camDY += (pitch - curPitch) / 0.0044
          inp.input.zoom += Math.log(dist / curZoom) * 1000
          window.__clipYaw = yaw; window.__clipPitch = pitch; window.__clipZoom = dist
        }, { ...w, id })
        await sleep(1500)
        await page.screenshot({ path: path.join(outdir, `${tag}-${w.n}.png`) })
        console.log(`  shot ${tag}-${w.n}`)
      }
    }
  }
})
console.log('\ndone → ' + outdir)
