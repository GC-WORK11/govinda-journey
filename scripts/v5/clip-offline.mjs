// node scripts/v5/clip-offline.mjs
// Offline bridge-vs-island clip check. Rebuilds the EXACT island lathe
// (kit.tsx islandGeo, incl. rim + underside wobble) and the exact bridge
// deck/rope curves (Bridge5.tsx bridgeGeo) in node with the repo's three,
// then down-raycasts every deck plank + rope point against the island body.
// No browser needed — deterministic geometry audit.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const ISLAND_R = 5
const ENTRY = new THREE.Vector3(0, 0, 4.2)
const EXIT = new THREE.Vector3(0, 0, -4.2)
const V5_ORDER = ['L01', 'L02', 'L03', 'I01', 'L05', 'L04', 'I02', 'L06', 'L07', 'L08', 'L09']
const ISLAND_POS = V5_ORDER.map((_, i) => new THREE.Vector3(
  Math.sin(i * 0.62) * 6.8 + Math.sin(i * 0.23) * 2.2,
  i * 1.05 + Math.sin(i * 1.7 + 0.6) * 0.75,
  -i * 14,
))
const exitWorld = (i) => ISLAND_POS[i].clone().add(EXIT)
const entryWorld = (i) => ISLAND_POS[i].clone().add(ENTRY)

// --- verbatim from kit.tsx ---------------------------------------------------
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
function paint() {} // colours don't matter for the clip test — skip attribute
function islandGeo(radius, ground, seed) {
  const r = radius
  const rnd = (n) => { const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) }
  const lip = new THREE.CatmullRomCurve3([
    new THREE.Vector3(r * 0.8, -0.5, 0), new THREE.Vector3(r * 0.98, -0.36, 0),
    new THREE.Vector3(r * 1.04, -0.18, 0), new THREE.Vector3(r * 1.0, -0.05, 0),
    new THREE.Vector3(r * 0.95, 0, 0),
  ]).getPoints(12).slice(1)
  const pts = [new THREE.Vector2(0, -0.5), new THREE.Vector2(r * 0.8, -0.5),
    ...lip.map((v) => new THREE.Vector2(v.x, v.y)),
    new THREE.Vector2(r * 0.68, 0.022), new THREE.Vector2(r * 0.34, 0.036), new THREE.Vector2(0, 0.04)]
  const top = new THREE.LatheGeometry(pts, 56)
  const tp = top.attributes.position
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i)
    const rad = Math.hypot(x, z); if (rad < r * 0.72) continue
    const a = Math.atan2(z, x)
    const k = 1 + 0.05 * Math.sin(a * 3 + seed * 2.1) + 0.038 * Math.sin(a * 7 + seed * 5.3)
    tp.setX(i, x * k); tp.setZ(i, z * k)
  }
  top.computeVertexNormals()
  const prof = [
    [0.84, -0.46], [0.9, -0.58], [0.78, -0.72], [0.83, -0.9],
    [0.7, -1.05], [0.74, -1.28], [0.6, -1.46], [0.65, -1.72],
    [0.51, -1.9], [0.55, -2.14], [0.42, -2.38], [0.35, -2.7],
    [0.23, -3.0], [0.1, -3.34], [0.001, -3.8],
  ]
  const under = new THREE.LatheGeometry(prof.map(([px, py]) => new THREE.Vector2(px * r, py)), 48)
  const up = under.attributes.position
  for (let i = 0; i < up.count; i++) {
    const x = up.getX(i), y = up.getY(i), z = up.getZ(i)
    const rad = Math.hypot(x, z); if (rad < 1e-3) continue
    const a = Math.atan2(z, x)
    const k = 1 + 0.09 * Math.sin(a * 4 + y * 2.6 + seed) + 0.08 * (rnd(i) - 0.5)
    up.setX(i, x * k); up.setZ(i, z * k)
    up.setY(i, y + (rnd(i + 57) - 0.5) * 0.13)
  }
  under.computeVertexNormals()
  const g = mergeGeometries([top, under], false)
  top.dispose(); under.dispose()
  return g
}
// --- verbatim from Bridge5.tsx ------------------------------------------------
const RIM_CLEAR = 5.85
const TOP_OFF = 0.05

function bridgePoints(from, to) {
  const dir = to.clone().sub(from); const len = dir.length(); dir.normalize()
  const lat = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.44)
  const n = Math.max(4, Math.floor(len / 0.38))
  const hdx = to.x - from.x, hdz = to.z - from.z
  const hlen = Math.hypot(hdx, hdz)
  const dhx = hdx / hlen, dhz = hdz / hlen
  const rimDist = (e, dx, dz) => {
    const b = e.x * dx + e.z * dz
    return -b + Math.sqrt(Math.max(0, b * b + RIM_CLEAR * RIM_CLEAR - (e.x * e.x + e.z * e.z)))
  }
  const sA = rimDist(EXIT, dhx, dhz)
  const sB = rimDist(ENTRY, -dhx, -dhz)
  const span = Math.max(1e-6, hlen - sA - sB)
  const deckAt = (t) => {
    const s = t * hlen
    if (s <= sA) return from.y + TOP_OFF
    if (s >= hlen - sB) return to.y + TOP_OFF
    const u = (s - sA) / span
    return THREE.MathUtils.lerp(from.y + TOP_OFF, to.y + TOP_OFF, u) - Math.sin(u * Math.PI) * 0.55
  }
  const spanU = (t) => Math.min(1, Math.max(0, (t * hlen - sA) / span))
  const deck = []
  for (let i = 0; i <= n * 4; i++) { // 4x oversample between plank centres
    const t = i / (n * 4), p = from.clone().lerp(to, t)
    p.y = deckAt(t)
    deck.push(p)
  }
  const ropes = { '-1': [], '1': [] }
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 13 }, (_, k) => {
        const t = k / 12, p = from.clone().lerp(to, t).addScaledVector(lat, s)
        p.y = deckAt(t) + 0.58 - Math.sin(spanU(t) * Math.PI) * 0.3
        return p
      }))
    for (let i = 0; i <= 60; i++) ropes[String(s)].push(curve.getPointAt(i / 60))
  }
  // post cylinders+finials at both ends
  const posts = []
  for (const end of [from, to]) for (const s of [-1, 1]) {
    const base = end.clone().addScaledVector(lat, s)
    posts.push(base.clone().setY(end.y + 0.24))
  }
  return { deck, ropes, posts }
}
// --- inside test: down-raycast the island body ------------------------------
const rc = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)
function insideDepth(bodyMesh, lp, pos) { // lp: island-local point; pos: island world pos
  if (Math.hypot(lp.x, lp.z) > 6.4) return null
  // cast in WORLD space (intersectObject is world-space), convert hit y back to local
  rc.set(new THREE.Vector3(lp.x + pos.x, 4 + pos.y, lp.z + pos.z), DOWN); rc.far = 10
  const hits = rc.intersectObject(bodyMesh, false)
  if (!hits.length) return null
  const above = hits.filter((h) => h.point.y - pos.y > lp.y + 1e-4).length
  if (above % 2 !== 1) return null
  return hits[0].point.y - pos.y - lp.y // depth below nearest surface
}

const bodies = ISLAND_POS.map((p, i) => {
  const m = new THREE.Mesh(islandGeo(ISLAND_R, '#8fb36b', i + 1))
  m.position.copy(p); m.updateMatrixWorld(true)
  return { id: V5_ORDER[i], m, pos: p }
})
const findings = []
for (let i = 0; i < V5_ORDER.length - 1; i++) {
  const from = exitWorld(i), to = entryWorld(i + 1)
  const { deck, ropes, posts } = bridgePoints(from, to)
  for (const isl of [bodies[i], bodies[i + 1]]) {
    const check = (kind, p) => {
      const lp = p.clone().sub(isl.pos)
      const d = insideDepth(isl.m, lp, isl.pos)
      if (d !== null) findings.push({
        bridge: `${V5_ORDER[i]}->${V5_ORDER[i + 1]}`, island: isl.id, kind,
        depth: +d.toFixed(3), local: [+lp.x.toFixed(2), +lp.y.toFixed(2), +lp.z.toFixed(2)],
        r: +Math.hypot(lp.x, lp.z).toFixed(2),
        world: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)],
      })
    }
    deck.forEach((p) => { check('deck', p); check('deckLo', p.clone().setY(p.y - 0.035)) })
    for (const s of ['-1', '1']) ropes[s].forEach((p) => check(`rope${s}`, p))
    // posts are planted: only a problem if sunk deeper than ~0.2
    posts.forEach((p) => check('post', p))
  }
}
console.log(JSON.stringify(findings, null, 1))
console.log(`\n${findings.length} bridge-geometry vertices inside island bodies`)
