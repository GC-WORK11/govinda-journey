// node scripts/v5/clip-audit.mjs [baseUrl] [--only=L01,L02] [--shots]
// CLIP audit: ropes / bridges / props must never pass through islands or each other.
//
// Loads ?qa&nomerge once (nomerge keeps per-prop meshes so Box3s are granular),
// then for each island in V5 order teleports the player to it, audits the
// UNSOLVED scene, completes the island, lets the bridge build, and audits the
// SOLVED scene. Finally loads ?qa&finale for a fully-mounted chain audit.
//
// Two detectors, geometry-real (not just AABB):
//   1. ISLAND CLIP — for every mesh whose Box3 touches an island body Box3,
//      sample its vertices and down-raycast against the island's lathe body:
//      a vertex is INSIDE the solid when an odd number of surface hits sit
//      above it. Reports inside-vertex count, worst depth, world point.
//   2. PROP-VS-PROP — Box3 overlaps across different prop owners within the
//      same island (or bridge-vs-island), filtered by depth/volume to kill
//      resting-contact and planted-base false positives.
//
// Output: proofs/v5/clip-audit.json + summary lines. --shots drops a red
// Box3 marker at each finding, teleports the player so the follow cam frames
// it, and writes proofs/v5/clip-<n>-<phase>-<id>.png.
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { withChrome, DESKTOP } from '../chrome.mjs'

const argv = process.argv.slice(2)
const BASE = (argv.find((a) => !a.startsWith('--')) || 'http://localhost:5304/').replace(/\/?$/, '/')
const flag = (n) => argv.includes('--' + n)
const opt = (n) => (argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1]
const ONLY = opt('only') ? opt('only').split(',') : null
const SHOTS = flag('shots')

const here = path.dirname(fileURLToPath(import.meta.url))
const outdir = path.resolve(here, '..', '..', 'proofs', 'v5')
mkdirSync(outdir, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
setTimeout(() => { console.log('clip-audit hard timeout'); process.exit(3) }, 1200000).unref()

const CORE = `/src/v5/core.ts`

// ---------- the in-page audit (runs in the live R3F scene) ----------
async function audit(page, phase) {
  return page.evaluate(async ({ phase, coreSrc }) => {
    const c = await import(coreSrc)
    const THREE = await import('/node_modules/.vite/deps/three.js')
    let scene = null
    for (const set of [c.walkables, c.blockers]) {
      for (const o of set) { let p = o; while (p.parent) p = p.parent; scene = p; break }
      if (scene) break
    }
    if (!scene) return { phase, error: 'no scene' }
    scene.updateWorldMatrix(true, true)

    const _b = new THREE.Box3()
    const meshes = []
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return
      const mat = Array.isArray(o.material) ? o.material[0] : o.material
      if (mat && mat.visible === false) return // invisible colliders (walk strips, gate walls)
      if (o.geometry?.type === 'SphereGeometry' && mat?.side === THREE.BackSide) return // sky dome
      const box = new THREE.Box3().setFromObject(o)
      if (box.isEmpty()) return
      const size = box.getSize(new THREE.Vector3())
      if (Math.max(size.x, size.y, size.z) > 60) return // sea plane / fog cards
      let p = o; const names = []
      while (p) { if (p.name) names.push(p.name); p = p.parent }
      const owner = names.find((n) => /^(island|bridge)-/.test(n)) || names[names.length - 1] || '(scene)'
      meshes.push({ o, box, owner, label: `${o.name || '?'}[${o.geometry?.type || '?'}]#${o.geometry?.attributes?.position?.count ?? 0}` })
    })

    // ---- island bodies: the lathe mesh under each island-<id> (the one that dips deep)
    const islands = []
    const islandGroup = {}
    scene.traverse((o) => {
      const m = /^island-(\w+)$/.exec(o.name || '')
      if (m) islandGroup[m[1]] = o
    })
    for (const [id, g] of Object.entries(islandGroup)) {
      let body = null; const scatter = []
      const centre = new THREE.Vector3(); g.getWorldPosition(centre)
      g.traverse((o) => {
        if (!o.isMesh) return
        const b = new THREE.Box3().setFromObject(o)
        const sz = b.getSize(new THREE.Vector3())
        if (b.min.y < centre.y - 1.5) body = o
        else if (Math.max(sz.x, sz.z) > 6 && b.min.y > centre.y - 0.6) scatter.push(o)
      })
      if (body) islands.push({ id, g, body, box: new THREE.Box3().setFromObject(body), scatter, pos: centre })
    }

    const islandOf = (m) => {
      let p = m.o
      while (p) { const mm = /^island-(\w+)$/.exec(p.name || ''); if (mm) return mm[1]; p = p.parent }
      return null
    }

    // ---- detector 1: mesh vertices inside an island body
    const rc = new THREE.Raycaster()
    const down = new THREE.Vector3(0, -1, 0)
    const clips = []
    const bodySet = new Set(islands.map((i) => i.body))
    const scatSet = new Set(islands.flatMap((i) => i.scatter))
    for (const isl of islands) {
      const probe = _b.copy(isl.box).expandByScalar(0.06)
      for (const m of meshes) {
        if (bodySet.has(m.o) || scatSet.has(m.o)) continue
        if (!m.box.intersectsBox(probe)) continue
        const pos = m.o.geometry?.attributes?.position
        if (!pos || !pos.count) continue
        const stride = Math.max(1, Math.floor(pos.count / 128))
        const v = new THREE.Vector3()
        const insidePts = []
        for (let k = 0; k < pos.count && insidePts.length < 40; k += stride) {
          v.fromBufferAttribute(pos, k)
          m.o.localToWorld(v)
          const lv = isl.body.worldToLocal(v.clone())
          if (Math.hypot(lv.x, lv.z) > 6.2) continue
          // raycast in WORLD space (intersectObject is world-space); compare local y
          rc.set(new THREE.Vector3(v.x, isl.pos.y + 4, v.z), down)
          rc.far = 10
          const hits = rc.intersectObject(isl.body, false)
          if (!hits.length) continue
          const above = hits.filter((h) => h.point.y - isl.pos.y > lv.y + 1e-4).length
          if (above % 2 === 1) insidePts.push({ w: [lv.x, lv.y, lv.z], depth: hits[0].point.y - isl.pos.y - lv.y })
        }
        if (insidePts.length) {
          insidePts.sort((a, b) => b.depth - a.depth)
          const top = insidePts[0]
          // planted bases (post/rock bottom sunk <~0.3, verts only in the mesh's
          // bottom third) are intended anchors; grazing contacts (<0.08) are
          // surface noise. What remains: geometry piercing through the island.
          const h = Math.max(0.01, m.box.max.y - m.box.min.y)
          const minFrac = Math.min(...insidePts.map((ip) => (isl.pos.y + ip.w[1] - m.box.min.y) / h))
          if (top.depth < 0.08) continue
          if (minFrac < 0.35 && top.depth < 0.3 && !/^bridge/.test(m.owner)) continue
          const wp = isl.body.localToWorld(new THREE.Vector3(top.w[0], top.w[1], top.w[2]))
          clips.push({
            island: isl.id, mesh: m.label, owner: m.owner, meshIsland: islandOf(m),
            inside: insidePts.length, maxDepth: +top.depth.toFixed(3), baseFrac: +minFrac.toFixed(2),
            at: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)],
            local: [+top.w[0].toFixed(2), +top.w[1].toFixed(2), +top.w[2].toFixed(2)],
          })
        }
      }
    }

    // ---- detector 2: prop-vs-prop Box3 overlaps
    let pairs = []
    const cand = meshes.filter((m) => !bodySet.has(m.o) && !scatSet.has(m.o))
    const inter = new THREE.Box3()
    for (let a = 0; a < cand.length; a++) {
      for (let b2 = a + 1; b2 < cand.length; b2++) {
        const A = cand[a], B = cand[b2]
        const ia = islandOf(A), ib = islandOf(B)
        const bridgeA = /^bridge-(\d+)$/.exec(A.owner)
        const bridgeB = /^bridge-(\d+)$/.exec(B.owner)
        let near = false
        if (ia && ib) near = ia === ib
        else if ((bridgeA && ib) || (ia && bridgeB)) near = true
        else if (bridgeA && bridgeB) near = bridgeA[1] === bridgeB[1]
        if (!near) continue
        if (!A.box.intersectsBox(B.box)) continue
        // siblings inside one prop cluster commonly touch — only flag deep engulf
        let shared = false
        let pa = A.o.parent, pb = B.o.parent
        if (pa && pa === pb) shared = true
        inter.copy(A.box).intersect(B.box)
        const s = inter.getSize(new THREE.Vector3())
        if (s.x < 0.08 || s.y < 0.08 || s.z < 0.08) continue // grazing contact
        const va = A.box.getSize(new THREE.Vector3()), vb = B.box.getSize(new THREE.Vector3())
        const vol = s.x * s.y * s.z
        const minV = Math.min(va.x * va.y * va.z, vb.x * vb.y * vb.z)
        const frac = vol / Math.max(minV, 1e-6)
        if (shared && frac < 0.6) continue
        if (vol < 0.006 && frac < 0.55) continue
        if (A.owner === B.owner && !/^bridge/.test(A.owner)) continue // one prop cluster's parts overlap by construction
        const ctr = inter.getCenter(new THREE.Vector3())
        pairs.push({
          a: `${A.owner}::${A.label}`, b: `${B.owner}::${B.label}`,
          shared, frac: +frac.toFixed(2), vol: +vol.toFixed(4),
          pen: [+s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)],
          at: [+ctr.x.toFixed(2), +ctr.y.toFixed(2), +ctr.z.toFixed(2)],
        })
      }
    }
    // one row per owner-pair (worst overlap wins) — identical prop clusters
    // otherwise drown the report in duplicates
    const byOwner = new Map()
    for (const p of pairs) {
      const key = [p.a.split('::')[0], p.b.split('::')[0]].sort().join(' × ')
      const cur = byOwner.get(key)
      if (!cur || p.vol > cur.vol) byOwner.set(key, p)
    }
    pairs = [...byOwner.values()]
    pairs.sort((x, y) => y.vol - x.vol)
    return { phase, clips, pairs: pairs.slice(0, 60), meshCount: meshes.length }
  }, { phase, coreSrc: CORE })
}

// teleport player near a world point + drop a marker box; the follow cam frames it
async function markAndShot(page, pt, file, lift = 0.8) {
  await page.evaluate(async ({ pt, coreSrc, lift }) => {
    const c = await import(coreSrc)
    const THREE = await import('/node_modules/.vite/deps/three.js')
    let scene = null
    for (const o of c.walkables) { let p = o; while (p.parent) p = p.parent; scene = p; break }
    if (scene) {
      const b = new THREE.Box3(
        new THREE.Vector3(pt[0] - 0.5, pt[1] - 0.5, pt[2] - 0.5),
        new THREE.Vector3(pt[0] + 0.5, pt[1] + 0.5, pt[2] + 0.5))
      const h = new THREE.Box3Helper(b, new THREE.Color('#ff2222'))
      h.name = 'clip-marker'; h.renderOrder = 9999
      h.material.depthTest = false; h.material.transparent = true
      scene.add(h)
      setTimeout(() => scene.remove(h), 20000)
    }
    c.player.pos.set(pt[0], pt[1] + lift, pt[2] + 1.4)
    c.player.vel.set(0, 0, 0); c.player.frozen = false
  }, { pt, coreSrc: CORE, lift })
  await sleep(1500)
  await page.screenshot({ path: path.join(outdir, file) }).catch(() => {})
}

// ---------- run ----------
const results = []
await withChrome(async (browser) => {
  const page = await browser.newPage()
  await page.setViewport(DESKTOP)
  page.setDefaultTimeout(120000)
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message.slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|WebGL|swiftshader|GPU stall|deprecation/i.test(m.text())) errors.push(m.text().slice(0, 160)) })
  page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url().slice(-70) + ' ' + (r.failure()?.errorText || '')))

  const ready = async () => {
    for (let t = 0; t < 240; t++) {
      const st = await page.evaluate(async (src) => {
        try { const c = await import(src); return { w: c.walkables.size, err: window.__err || null } }
        catch (e) { return { w: -1, err: String(e).slice(0, 120) } }
      }, CORE).catch(() => ({ w: -2 }))
      if (st.w > 0) return true
      if (t % 20 === 19) console.log(`[audit] still mounting… walkables=${st.w}${st.err ? ' err=' + st.err : ''}`)
      await sleep(1000)
    }
    return false
  }
  const settle = async (ms = 3200) => { await sleep(ms); await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) }).catch(() => {}) }
  const gotoIsland = (id) => page.evaluate(async ({ src, id }) => {
    const c = await import(src)
    const l = await import('/src/v5/world/layout.ts')
    const i = c.V5_ORDER.indexOf(id)
    const p = l.ISLAND_POS[i].clone().add(l.ENTRY)
    c.player.pos.copy(p); c.player.vel.set(0, 0, 0); c.player.island = id; c.player.frozen = false
    try { window.__journey?.player?.teleport?.(p.x, p.y, p.z) } catch {}
    try { (await import('/src/v5/world/progress.ts')).useWorldUI.getState().setIdx(i) } catch {}
  }, { src: CORE, id })

  const ORDER = ['L01', 'L02', 'L03', 'I01', 'L05', 'L04', 'I02', 'L06', 'L07', 'L08', 'L09']
  const ids = ONLY || ORDER
  let shotN = 0
  const shotKeys = new Set()
  const shootFindings = async (r) => {
    if (!SHOTS) return
    let n = 0
    for (const cl of (r.clips || [])) {
      const key = `${cl.owner}::${cl.mesh}@${cl.island}`
      if (shotKeys.has(key) || n >= 8) continue
      shotKeys.add(key); n++; shotN++
      await markAndShot(page, cl.at, `clip-${String(shotN).padStart(2, '0')}-${r.phase}.png`)
    }
    for (const pr of (r.pairs || []).slice(0, 3)) { shotN++; await markAndShot(page, pr.at, `clip-${String(shotN).padStart(2, '0')}-${r.phase}-pair.png`) }
  }

  for (let boot = 0; boot < 2; boot++) {
    console.log('[audit] goto', `${BASE}?qa&fresh&nomerge&lite`)
    await page.goto(`${BASE}?qa&fresh&nomerge&lite`, { waitUntil: 'domcontentloaded' }).catch((e) => console.log('goto fail', e.message))
    console.log('[audit] loaded, waiting for world')
    if (await ready()) break
    console.log(`[audit] never ready (boot ${boot}); errors:`, errors.slice(0, 10).join(' ;; ') || 'none')
    if (boot === 1) process.exit(2)
  }
  console.log('[audit] world ready')

  const NAV_DEAD = /Execution context was destroyed|Cannot find name|Session closed/
  for (const id of ids) {
    const t0 = Date.now()
    let done = false
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      try {
        if (attempt) { console.log(`${id}: retry ${attempt} after reload`); await ready(); await settle(2500) }
        await gotoIsland(id)
        await settle(4200) // lazy obstacle/diorama chunks + dressing
        const pre = await audit(page, `${id}-pre`)
        results.push(pre)
        console.log(`${id} pre : clips=${pre.clips?.length ?? '-'} pairs=${pre.pairs?.length ?? '-'} meshes=${pre.meshCount}`)
        for (const cl of (pre.clips || [])) console.log(`   CLIP ${pre.phase} ${cl.island}: ${cl.owner}::${cl.mesh} inside=${cl.inside} depth=${cl.maxDepth} @${cl.at}`)
        await shootFindings(pre)
        await page.evaluate(async ({ src, id }) => { const c = await import(src); c.useV5.getState().complete(id) }, { src: CORE, id })
        await settle(3800) // bridge build anim + scaffold drop
        const post = await audit(page, `${id}-post`)
        results.push(post)
        console.log(`${id} post: clips=${post.clips?.length ?? '-'} pairs=${post.pairs?.length ?? '-'} meshes=${post.meshCount} (${Date.now() - t0}ms)`)
        for (const cl of (post.clips || [])) console.log(`   CLIP ${post.phase} ${cl.island}: ${cl.owner}::${cl.mesh} inside=${cl.inside} depth=${cl.maxDepth} @${cl.at}`)
        await shootFindings(post)
        done = true
      } catch (e) {
        if (!NAV_DEAD.test(String(e))) throw e
        // vite HMR reload mid-audit — wait for the world and re-do this island
      }
    }
    if (!done) console.log(`${id}: SKIPPED (reload loop)`)
    if (id === 'L09') break
  }

  // finale: everything mounted + pulled back (wide shot only; cam is cinematic)
  await page.goto(`${BASE}?qa&finale&nomerge`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  if (await ready()) {
    await settle(6500)
    const fin = await audit(page, 'finale')
    results.push(fin)
    console.log(`finale: clips=${fin.clips?.length ?? '-'} pairs=${fin.pairs?.length ?? '-'}`)
    for (const cl of (fin.clips || [])) console.log(`   CLIP finale ${cl.island}: ${cl.owner}::${cl.mesh} inside=${cl.inside} depth=${cl.maxDepth} @${cl.at}`)
    await page.screenshot({ path: path.join(outdir, 'clip-finale.png') }).catch(() => {})
  }

  writeFileSync(path.join(outdir, 'clip-audit.json'), JSON.stringify({ ts: new Date().toISOString(), base: BASE, results, errors }, null, 1))
  const nClips = results.reduce((a, r) => a + (r.clips?.length || 0), 0)
  const nPairs = results.reduce((a, r) => a + (r.pairs?.length || 0), 0)
  console.log(`\n==== clip audit: ${nClips} island-clip findings, ${nPairs} prop pairs ====`)
  if (errors.length) console.log('console errors:', [...new Set(errors)].slice(0, 6).join(' ;; '))
}, { maxWaitMs: 45 * 60000 }) // shared box: many agents queue on the one Chrome
process.exit(0)
