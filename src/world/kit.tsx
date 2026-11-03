import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Shared palette. Matte clay, warm daylight. Use these, not random hex codes. */
export const C = {
  cream: '#f3e9da', paper: '#fbf6ee', sand: '#e8d6b8', terracotta: '#d9825b', brick: '#b5654a',
  leaf: '#8fb36b', leafDark: '#6f9a55', moss: '#a7bd80', earth: '#b48a63', earthDark: '#8a6748',
  stone: '#c9bfb0', stoneLight: '#ddd5c6', wood: '#a87a52', woodLight: '#c99c6e', water: '#8fc1c9', waterLight: '#b8dade', sky: '#cfe3e8', ink: '#3b3330',
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
/** One cached matte "clay" material per colour. */
export function clay(color: string) {
  let m = matCache.get(color)
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }); matCache.set(color, m) }
  return m
}

let _vc: THREE.MeshStandardMaterial | null = null
/** Shared matte material for merged geometry that bakes its own colours as vertex colours. */
export function clayVC() {
  if (!_vc) _vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 })
  return _vc
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Fill a geometry's `color` attribute with `hex`, optionally shaded per-vertex via `fn`. */
export function paint(g: THREE.BufferGeometry, hex: string, fn?: (c: THREE.Color, x: number, y: number, z: number) => void, jitter = 0) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const arr = new Float32Array(pos.count * 3)
  const c = new THREE.Color(hex), t = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    t.copy(c)
    if (fn) fn(t, pos.getX(i), pos.getY(i), pos.getZ(i))
    if (jitter) t.multiplyScalar(1 + Math.sin(i * 37.13 + t.r * 40) * jitter * 0.5)
    arr[i * 3] = t.r; arr[i * 3 + 1] = t.g; arr[i * 3 + 2] = t.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

type P = { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number] }

/** Height of the grass surface at distance d from the island centre (dome + lip profile). */
export const topY = (d: number, radius = 3.2) => d > radius * 0.96 ? 0 : 0.04 * Math.max(0, 1 - (d / (radius * 0.96)) ** 1.7)

/** Island geometry: grass cap lathe with an overhanging lip + layered strata rock underside, AO baked into vertex colours. */
function islandGeo(radius: number, ground: string, seed: number) {
  const r = radius
  const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) }
  const lip = new THREE.CatmullRomCurve3([
    new THREE.Vector3(r * 0.8, -0.5, 0), new THREE.Vector3(r * 0.98, -0.36, 0),
    new THREE.Vector3(r * 1.04, -0.18, 0), new THREE.Vector3(r * 1.0, -0.05, 0),
    new THREE.Vector3(r * 0.95, 0, 0),
  ]).getPoints(12).slice(1)
  const pts = [new THREE.Vector2(0, -0.5), new THREE.Vector2(r * 0.8, -0.5),
    ...lip.map((v) => new THREE.Vector2(v.x, v.y)),
    new THREE.Vector2(r * 0.68, 0.022), new THREE.Vector2(r * 0.34, 0.036), new THREE.Vector2(0, 0.04)]
  const top = paint(new THREE.LatheGeometry(pts, 56), ground, (c, _x, y) => {
    // dark underside of the lip -> soft daylight on top
    c.multiplyScalar(0.58 + 0.46 * smooth(-0.48, 0.01, y))
  }, 0.05)
  // soften the silhouette: a low-frequency radial wobble on the rim band only, so the top stays flat
  const tp = top.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i)
    const rad = Math.hypot(x, z); if (rad < r * 0.72) continue
    const a = Math.atan2(z, x)
    const k = 1 + 0.05 * Math.sin(a * 3 + seed * 2.1) + 0.038 * Math.sin(a * 7 + seed * 5.3)
    tp.setX(i, x * k); tp.setZ(i, z * k)
  }
  top.computeVertexNormals()
  // rocky underside: a lathe profile that shelves in and out, giving stepped strata ledges
  const prof: [number, number][] = [
    [0.84, -0.46], [0.9, -0.58], [0.78, -0.72], [0.83, -0.9],
    [0.7, -1.05], [0.74, -1.28], [0.6, -1.46], [0.65, -1.72],
    [0.51, -1.9], [0.55, -2.14], [0.42, -2.38], [0.35, -2.7],
    [0.23, -3.0], [0.1, -3.34], [0.001, -3.8],
  ]
  const under = new THREE.LatheGeometry(prof.map(([px, py]) => new THREE.Vector2(px * r, py)), 48)
  const up = under.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < up.count; i++) {
    const x = up.getX(i), y = up.getY(i), z = up.getZ(i)
    const rad = Math.hypot(x, z); if (rad < 1e-3) continue
    const a = Math.atan2(z, x)
    const k = 1 + 0.09 * Math.sin(a * 4 + y * 2.6 + seed) + 0.08 * (rnd(i) - 0.5)
    up.setX(i, x * k); up.setZ(i, z * k)
    up.setY(i, y + (rnd(i + 57) - 0.5) * 0.13)
  }
  under.computeVertexNormals()
  // sedimentary bands, darker in the lip shadow and toward the tip
  const bands = ['#c9b79a', '#b19d82', '#9d8469', '#8c7055']
  paint(under, bands[0], (c, x, y) => {
    const b = Math.abs(Math.floor(-y * 2.2 + Math.sin(x * 2.3 + seed) * 0.55)) % bands.length
    c.set(bands[b])
    c.multiplyScalar((0.58 + 0.44 * smooth(-4.0, -0.55, y)) * (1 - 0.36 * (1 - smooth(-1.0, -0.44, y))))
  }, 0.08)
  const g = mergeGeometries([top, under], false)!
  top.dispose(); under.dispose()
  return g
}

/** Floating island: grass dome with a darker overhanging lip on a rocky underside. Top surface ~y = 0. */
export function Island({ radius = 3.2, ground = C.leaf, seed = 1, ...p }: P & { radius?: number; ground?: string; seed?: number }) {
  const geo = useMemo(() => islandGeo(radius, ground, seed), [radius, ground, seed])
  return (
    <group {...p}>
      <mesh geometry={geo} material={clayVC()} castShadow receiveShadow />
    </group>
  )
}

export function Tree({ h = 1, color = C.leafDark, ...p }: P & { h?: number; color?: string }) {
  return (
    <group {...p}>
      <mesh position={[0, 0.25 * h, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.06 * h, 0.08 * h, 0.5 * h, 8]} /></mesh>
      <mesh position={[0, 0.72 * h, 0]} material={clay(color)} castShadow><sphereGeometry args={[0.38 * h, 16, 12]} /></mesh>
      <mesh position={[0.18 * h, 0.58 * h, 0.1 * h]} material={clay(color)} castShadow><sphereGeometry args={[0.24 * h, 14, 10]} /></mesh>
    </group>
  )
}

export function Rock({ s = 0.3, color = C.stone, ...p }: P & { s?: number; color?: string }) {
  return <mesh {...p} material={clay(color)} castShadow scale={[s, s * 0.7, s]}><dodecahedronGeometry args={[1, 1]} /></mesh>
}

/**
 * All the little set dressing of one island, merged into a single vertex-coloured mesh:
 * trees, rocks, flower clusters, grass tufts, pebbles and a stepping-stone path.
 * `path` = island-local waypoints (bridge edge -> stand point -> next bridge edge).
 */
export function scatterGeo({ radius = 3.2, ground = C.leaf, accent = C.terracotta, seed = 1, path = [] as THREE.Vector3[] }) {
  const geos: THREE.BufferGeometry[] = []
  const rnd = (n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3()
  const put = (g0: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, sc = 1, rx = 0, rz = 0, hex?: string, jit = 0) => {
    const g = g0.index ? g0.toNonIndexed() : g0 // keep index layout uniform for merging
    if (g !== g0) g0.dispose()
    e.set(rx, ry, rz); q.setFromEuler(e); s.setScalar(sc)
    g.applyMatrix4(m.compose(new THREE.Vector3(x, y, z), q, s))
    if (hex) paint(g, hex, undefined, jit)
    geos.push(g)
  }
  const pathPts: THREE.Vector3[] = []
  if (path.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal')
    curve.getPoints(48).forEach((p) => pathPts.push(p))
    const len = curve.getLength(), n = Math.max(3, Math.round(len / 0.52))
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n)
      const d = Math.hypot(p.x, p.z); if (d > radius * 0.99) continue
      const j = i + 7
      const sc = 0.8 + rnd(j) * 0.45
      put(new THREE.CylinderGeometry(0.17 + rnd(j + 1) * 0.06, 0.19 + rnd(j + 1) * 0.06, 0.07, 6 + Math.floor(rnd(j + 2) * 3)),
        p.x + (rnd(j + 3) - 0.5) * 0.12, topY(d, radius) + 0.012, p.z + (rnd(j + 4) - 0.5) * 0.12,
        rnd(j + 5) * Math.PI, sc, (rnd(j + 6) - 0.5) * 0.12, (rnd(j + 7) - 0.5) * 0.12,
        rnd(j + 8) > 0.5 ? '#d6cab4' : '#c9bfb0', 0.08)
    }
  }
  const nearPath = (x: number, z: number, r: number) => pathPts.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r)
  const stand = { x: -0.9, z: 1.4 }
  const clear = (x: number, z: number, rStand: number, rPath: number) =>
    (x - stand.x) ** 2 + (z - stand.z) ** 2 > rStand * rStand && !nearPath(x, z, rPath)
  const greens = [C.leafDark, C.leaf, C.moss]
  // trees + big rocks around the rim (diorama keeps centre free)
  for (let k = 0, placed = 0; k < 40 && placed < 5; k++) {
    const a = rnd(k * 4 + 1) * Math.PI * 2, d = 2.25 + rnd(k * 4 + 2) * 0.62
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (!clear(x, z, 1.15, 0.85) || d > radius * 0.94) continue
    const h = 0.75 + rnd(k * 4 + 3) * 0.55, y = topY(d, radius)
    const gc = greens[Math.floor(rnd(k * 4 + 4) * 3)]
    if (rnd(k * 4 + 5) > 0.25) { // tree: trunk + two canopy blobs
      put(new THREE.CylinderGeometry(0.055, 0.08, 0.55, 7), x, y + 0.24 * h, z, 0, h, 0, 0, C.wood, 0.06)
      put(new THREE.SphereGeometry(0.4, 14, 11), x, y + 0.72 * h, z, 0, h, 0, 0, gc, 0.05)
      put(new THREE.SphereGeometry(0.26, 12, 9), x + 0.19 * h, y + 0.57 * h, z + 0.09 * h, 0, h, 0, 0, gc, 0.05)
      if (rnd(k * 4 + 6) > 0.6) { // a tiny mushroom sheltering at the trunk
        const ma = rnd(k * 13) * Math.PI * 2
        put(new THREE.CylinderGeometry(0.022, 0.028, 0.07, 6), x + Math.cos(ma) * 0.2, y + 0.035, z + Math.sin(ma) * 0.2, 0, 1, 0, 0, C.paper, 0.05)
        put(new THREE.SphereGeometry(0.05, 10, 7), x + Math.cos(ma) * 0.2, y + 0.085, z + Math.sin(ma) * 0.2, 0, 1, 0, 0, C.terracotta, 0.06)
      }
    } else { // boulder
      put(new THREE.DodecahedronGeometry(0.24, 1), x, y + 0.1 * h, z, rnd(k) * 3, h * 1.1, 0, 0, C.stone, 0.08)
    }
    placed++
  }
  // pebbles hugging the lip
  for (let k = 0; k < 10; k++) {
    const a = rnd(60 + k * 3) * Math.PI * 2, d = (2.45 + rnd(60 + k * 3 + 1) * 0.6) * (radius / 3.2)
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (!clear(x, z, 0.7, 0.4)) continue
    put(new THREE.DodecahedronGeometry(0.05 + rnd(60 + k * 3 + 2) * 0.07, 0), x, topY(d, radius) + 0.015, z, rnd(k * 9) * 3, 1, 0, 0, rnd(k) > 0.5 ? C.stone : '#d6cab4', 0.1)
  }
  // grass tufts
  const dark = new THREE.Color(ground).multiplyScalar(0.78)
  for (let k = 0; k < 26; k++) {
    const a = rnd(100 + k * 2) * Math.PI * 2, d = (0.9 + rnd(101 + k * 2) * 2.0) * (radius / 3.2)
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (d > radius * 0.93 || !clear(x, z, 0.75, 0.3)) continue
    const hex = '#' + (rnd(k) > 0.5 ? dark : new THREE.Color(ground).multiplyScalar(1.06)).getHexString()
    put(new THREE.ConeGeometry(0.06 + rnd(k + 5) * 0.05, 0.16 + rnd(k + 9) * 0.12, 5), x, topY(d, radius) + 0.07, z,
      rnd(k * 7) * 3, 1, (rnd(k * 3) - 0.5) * 0.35, (rnd(k * 5) - 0.5) * 0.35, hex, 0.08)
  }
  // thin blades at the rim leaning outward, so the grass cap reads as an overhang
  for (let k = 0, placed = 0; k < 40 && placed < 12; k++) {
    const a = rnd(150 + k * 3) * Math.PI * 2, d = (2.7 + rnd(151 + k * 3) * 0.3) * (radius / 3.2)
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (!clear(x, z, 0.5, 0.6)) continue
    const near = Math.min(1, Math.max(0, (d / radius - 0.84) / 0.1)) // leans harder at the edge
    const lean = 0.3 + near * 0.65 + (rnd(k * 11) - 0.5) * 0.3
    const hex = '#' + (rnd(k + 3) > 0.4 ? dark : new THREE.Color(ground)).getHexString()
    const dx = x / d, dz = z / d
    put(new THREE.ConeGeometry(0.028 + rnd(k + 7) * 0.022, 0.15 + rnd(k + 5) * 0.13, 5), x, topY(d, radius) + 0.04, z,
      rnd(k * 17) * 3, 1, dz * lean, -dx * lean, hex, 0.08)
    placed++
  }
  // flower clusters: a few blossoms on leafy dots, like the reference
  const petals = [C.paper, '#e9b3a5', '#eec978', accent]
  for (let k = 0, placed = 0; k < 60 && placed < 13; k++) {
    const a = rnd(200 + k * 5) * Math.PI * 2, d = (1.1 + rnd(201 + k * 5) * 1.7) * (radius / 3.2)
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (d > radius * 0.92 || !clear(x, z, 0.95, 0.5)) continue
    const y = topY(d, radius), b = 3 + Math.floor(rnd(202 + k * 5) * 3)
    put(new THREE.SphereGeometry(0.07, 8, 6), x + 0.08, y + 0.03, z - 0.04, 0, 1, 0, 0, C.leafDark, 0.06)
    for (let j = 0; j < b; j++) {
      const ja = (j / b) * Math.PI * 2 + rnd(k * 31 + j) * 2
      const pc = petals[Math.floor(rnd(k * 17 + j * 3) * petals.length)]
      put(new THREE.SphereGeometry(0.032 + rnd(j * 11 + k) * 0.016, 8, 6),
        x + Math.cos(ja) * 0.11, y + 0.055, z + Math.sin(ja) * 0.11, 0, 1, 0, 0, pc, 0.06)
    }
    placed++
  }
  const g = geos.length ? mergeGeometries(geos, false) : null
  geos.forEach((x) => x.dispose())
  return g
}

/** Merged scatter mesh for one island. */
export function Scatter({ ground, accent, seed, path }: { ground: string; accent: string; seed: number; path: THREE.Vector3[] }) {
  const geo = useMemo(() => scatterGeo({ ground, accent, seed, path }), [ground, accent, seed, path])
  if (!geo) return null
  return <mesh geometry={geo} material={clayVC()} castShadow receiveShadow />
}

/** One merged puffy cloud blob (still matte clay, so it belongs in the same world). */
export function cloudGeo(seed: number) {
  const rnd = (n: number) => { const x = Math.sin(seed * 47.3 + n * 7.77) * 43758.5453; return x - Math.floor(x) }
  const m = new THREE.Matrix4(), geos: THREE.BufferGeometry[] = []
  const n = 3 + Math.floor(rnd(0) * 2)
  for (let i = 0; i < n; i++) {
    const g = new THREE.SphereGeometry(0.7 + rnd(i + 1) * 0.55, 14, 10)
    g.scale(1.25, 0.62, 1)
    m.makeTranslation((i - n / 2) * (0.75 + rnd(i + 5) * 0.3) + rnd(i + 9) * 0.3, (rnd(i + 3) - 0.5) * 0.3, (rnd(i + 7) - 0.5) * 0.5)
    g.applyMatrix4(m); geos.push(g)
  }
  const g = mergeGeometries(geos, false)!
  geos.forEach((x) => x.dispose())
  return g
}

let _blobMat: THREE.MeshBasicMaterial | null = null
/** Soft round contact shadow (radial gradient sprite, no lighting needed). */
export function blobMat() {
  if (_blobMat) return _blobMat
  const cv = document.createElement('canvas'); cv.width = cv.height = 128
  const ctx = cv.getContext('2d')!
  const gr = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
  gr.addColorStop(0, 'rgba(43,32,22,0.5)'); gr.addColorStop(0.7, 'rgba(43,32,22,0.22)'); gr.addColorStop(1, 'rgba(43,32,22,0)')
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(cv)
  _blobMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  return _blobMat
}

/** A simple clay house. Good default building; levels should make their own. */
export function ClayHouse({ wall = C.cream, roof = C.terracotta, ...p }: P & { wall?: string; roof?: string }) {
  return (
    <group {...p}>
      <RoundedBox args={[1.3, 1, 1.1]} radius={0.08} smoothness={3} position={[0, 0.5, 0]} material={clay(wall)} castShadow receiveShadow />
      <mesh position={[0, 1.28, 0]} rotation={[0, Math.PI / 4, 0]} material={clay(roof)} castShadow><coneGeometry args={[1.05, 0.62, 4]} /></mesh>
      <RoundedBox args={[0.3, 0.5, 0.06]} radius={0.04} position={[0, 0.27, 0.56]} material={clay(C.wood)} />
      <RoundedBox args={[0.26, 0.26, 0.05]} radius={0.04} position={[0.4, 0.62, 0.56]} material={clay(C.water)} />
    </group>
  )
}

/**
 * Scaffolding wrapped in cloth. When `open` turns true the cloth drops and the poles fold away.
 * Wrap a level's building: put it at the same position and give it a size a bit larger than the building.
 */
export function Scaffold({ open, size = [1.6, 1.8, 1.6], ...p }: P & { open: boolean; size?: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  const cloth = useRef<THREE.Group>(null)
  const t = useRef(open ? 1 : 0)
  useFrame((_, dt) => {
    const target = open ? 1 : 0
    t.current += (target - t.current) * Math.min(1, dt * 2.2)
    const k = t.current
    if (cloth.current) { cloth.current.scale.y = Math.max(0.001, 1 - k); cloth.current.position.y = 0 }
    if (g.current) { g.current.visible = k < 0.995; g.current.children.forEach((c, i) => { if (c !== cloth.current) { c.position.y = -k * size[1] * 1.1; c.rotation.z = (i % 2 ? 1 : -1) * k * 0.6 } }) }
  })
  const [w, h, d] = size
  const poles: [number, number][] = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]
  return (
    <group {...p} ref={g}>
      {poles.map(([x, z], i) => (
        <mesh key={i} position={[x, h * 0.35, z]} material={clay(C.woodLight)} castShadow><cylinderGeometry args={[0.035, 0.035, h * 0.7, 6]} /></mesh>
      ))}
      <group ref={cloth}>
        {/* a soft draped dust sheet, tied with a terracotta cord */}
        <mesh scale={[w * 0.56, h * 1.02, d * 0.56]} material={clay(C.paper)} castShadow receiveShadow>
          <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, h * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[w * 0.5, d * 0.5, 1]} material={clay(C.terracotta)}>
          <torusGeometry args={[1, 0.035 / Math.max(w, d) * 2, 6, 32]} />
        </mesh>
        <mesh position={[0, h * 1.02, 0]} material={clay(C.terracotta)}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
      </group>
    </group>
  )
}

/** Geometry data for a bridge: per-plank transforms + the merged posts/ropes mesh. */
export function bridgeParts(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from); const len = dir.length(); dir.normalize()
  const lat = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.42)
  const ang = Math.atan2(dir.x, dir.z)
  const n = Math.max(3, Math.floor(len / 0.34))
  const planks: { p: THREE.Vector3; r: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = from.clone().lerp(to, t)
    p.y = -0.05 - Math.sin(t * Math.PI) * 0.35
    planks.push({ p, r: ang })
  }
  const geos: THREE.BufferGeometry[] = []
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1)
  const put = (g: THREE.BufferGeometry, v: THREE.Vector3, ry: number, hex: string, rx = 0, rz = 0) => {
    eu.set(rx, ry, rz); q.setFromEuler(eu); g.applyMatrix4(mtx.compose(v, q, sc)); paint(g, hex, undefined, 0.06); geos.push(g)
  }
  for (const end of [from, to]) for (const s of [-1, 1]) {
    const base = end.clone().addScaledVector(lat, s)
    put(new THREE.CylinderGeometry(0.045, 0.058, 0.62, 7), base.clone().setY(0.31 - 0.1), ang, C.wood, 0, s * 0.07)
    put(new THREE.SphereGeometry(0.075, 10, 8), base.clone().setY(0.56), ang, C.woodLight)
  }
  for (const s of [-1, 1]) {
    const pts: THREE.Vector3[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, p = from.clone().lerp(to, t).addScaledVector(lat, s)
      p.y = 0.52 - Math.sin(t * Math.PI) * 0.34
      pts.push(p)
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.02, 6)
    paint(tube, '#dcc7a0', undefined, 0.05); geos.push(tube)
  }
  const rails = mergeGeometries(geos, false)!
  geos.forEach((x) => x.dispose())
  return { planks, rails }
}

/** Wooden plank bridge with posts and sagging rope rails between two island edges (y = 0). */
export function Bridge({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const { planks, rails } = useMemo(() => bridgeParts(from, to), [from, to])
  return (
    <group>
      {planks.map((k, i) => (
        <RoundedBox key={i} args={[0.9, 0.07, 0.24]} radius={0.03} position={k.p} rotation={[0, k.r, (i % 3 - 1) * 0.03]} material={clay(i % 2 ? C.wood : C.woodLight)} castShadow receiveShadow />
      ))}
      <mesh geometry={rails} material={clayVC()} castShadow />
    </group>
  )
}

/* ---- Small shared set dressing (procedural, warm clay) -------------------- */

/** Posts at each waypoint + two rails between them, all merged into one mesh. */
export function fenceGeo(pts: THREE.Vector3[], seed = 1) {
  const rnd = (n: number) => { const x = Math.sin(seed * 57.7 + n * 11.13) * 43758.5453; return x - Math.floor(x) }
  const geos: THREE.BufferGeometry[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1)
  const put = (g: THREE.BufferGeometry, p: THREE.Vector3, ry: number, hex: string, rx = 0, rz = 0) => {
    e.set(rx, ry, rz); q.setFromEuler(e)
    g.applyMatrix4(m.compose(p, q, s)); paint(g, hex, undefined, 0.07); geos.push(g)
  }
  pts.forEach((p, i) => {
    const h = 0.38 + rnd(i * 3) * 0.08
    put(new THREE.CylinderGeometry(0.032, 0.042, h, 7), new THREE.Vector3(p.x, p.y + h / 2, p.z), rnd(i) * 3,
      i % 2 ? C.wood : C.woodLight, (rnd(i * 3 + 1) - 0.5) * 0.12, (rnd(i * 3 + 2) - 0.5) * 0.12)
    put(new THREE.SphereGeometry(0.05, 8, 6), new THREE.Vector3(p.x, p.y + h + 0.014, p.z), 0, C.woodLight)
  })
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const d = b.clone().sub(a), len = d.length()
    const mid = a.clone().lerp(b, 0.5)
    const yaw = Math.atan2(d.x, d.z)
    for (const hy of [0.16, 0.29]) {
      const g = new THREE.CylinderGeometry(0.019, 0.019, len, 6)
      g.rotateX(Math.PI / 2)
      put(g, new THREE.Vector3(mid.x, mid.y + hy, mid.z), yaw, C.woodLight)
    }
  }
  const g = mergeGeometries(geos, false)
  geos.forEach((x) => x.dispose())
  return g
}

/** A short run of wooden fence along the given island-local points. */
export function Fence({ pts, seed = 1, ...p }: P & { pts: THREE.Vector3[]; seed?: number }) {
  const key = pts.map((v) => `${v.x},${v.y},${v.z}`).join('|')
  const geo = useMemo(() => fenceGeo(pts, seed), [key, seed])
  if (!geo) return null
  return <mesh geometry={geo} material={clayVC()} castShadow receiveShadow {...p} />
}

const lampLitMat = new THREE.MeshStandardMaterial({ color: '#f2c07a', emissive: '#e89b4e', emissiveIntensity: 1.0, roughness: 0.6 })
/** Small clay lamp for paths and doorways. `lit` gives it a warm head. */
export function LampPost({ h = 0.66, lit = false, ...p }: P & { h?: number; lit?: boolean }) {
  return (
    <group {...p}>
      <mesh position={[0, 0.03, 0]} material={clay(C.stone)} castShadow><cylinderGeometry args={[0.07, 0.09, 0.06, 8]} /></mesh>
      <mesh position={[0, h * 0.5, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.022, 0.03, h * 0.94, 7]} /></mesh>
      <mesh position={[0, h + 0.045, 0]} scale={[1, 0.9, 1]} material={lit ? lampLitMat : clay('#e2cfa6')} castShadow>
        <sphereGeometry args={[0.07, 12, 9]} />
      </mesh>
      <mesh position={[0, h + 0.115, 0]} material={clay(C.terracotta)} castShadow><coneGeometry args={[0.062, 0.075, 8]} /></mesh>
    </group>
  )
}

/** Terracotta pot with a little leafy plant. */
export function ClayPot({ s = 1, plant = true, ...p }: P & { s?: number; plant?: boolean }) {
  return (
    <group {...p}>
      <group scale={s}>
        <mesh position={[0, 0.055, 0]} material={clay(C.terracotta)} castShadow><cylinderGeometry args={[0.085, 0.06, 0.11, 10]} /></mesh>
        <mesh position={[0, 0.115, 0]} material={clay(C.brick)} castShadow><cylinderGeometry args={[0.096, 0.09, 0.035, 10]} /></mesh>
        {plant && (
          <>
            <mesh position={[0, 0.19, 0]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.09, 10, 8]} /></mesh>
            <mesh position={[0.055, 0.165, 0.03]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.06, 9, 7]} /></mesh>
          </>
        )}
      </group>
    </group>
  )
}

/** A small two-tone shrub. */
export function Bush({ s = 1, color = C.leafDark, ...p }: P & { s?: number; color?: string }) {
  return (
    <group {...p}>
      <group scale={s}>
        <mesh position={[0, 0.15, 0]} material={clay(color)} castShadow><sphereGeometry args={[0.2, 12, 9]} /></mesh>
        <mesh position={[0.15, 0.1, 0.05]} material={clay(color)} castShadow><sphereGeometry args={[0.12, 10, 8]} /></mesh>
        <mesh position={[-0.13, 0.1, -0.04]} material={clay(color)} castShadow><sphereGeometry args={[0.1, 10, 8]} /></mesh>
      </group>
    </group>
  )
}

/** A small folded paper letter with a wax seal. */
export function Letter({ seal = C.terracotta, ...p }: P & { seal?: string }) {
  return (
    <group {...p}>
      <RoundedBox args={[0.22, 0.016, 0.15]} radius={0.007} material={clay(C.paper)} castShadow receiveShadow />
      <mesh position={[0, 0.0095, -0.026]} rotation={[-Math.PI / 2, 0, 0]} material={clay('#efe3cd')}>
        <planeGeometry args={[0.19, 0.1]} />
      </mesh>
      <mesh position={[0, 0.013, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={clay(seal)}>
        <cylinderGeometry args={[0.021, 0.021, 0.008, 9]} />
      </mesh>
    </group>
  )
}
