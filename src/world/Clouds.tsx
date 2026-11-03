/**
 * Soft clay clouds, in two layers:
 *  - a calm sea of broad flattened slabs drifting far below the islands (the intro
 *    camera starts above it and descends toward it; in the finale pull-back it
 *    reads as a quiet floor of cloud tops),
 *  - a few slow puffs on lanes left and right of the path, at varied depths.
 * One shared material is tinted from the damped sky every frame — cream by day,
 * peach at golden hour, mauve at dusk, deep indigo at night — so a cloud is never
 * a grey lump. When the finale pull-back begins the drifting puffs sink under the
 * vista, so nothing big sits in the middle of the frame. A faint flock of distant
 * birds glides across the far sky by day and fades away by dusk.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { env } from './sky'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const PAPER = new THREE.Color('#fbf6ee')

/**
 * One merged soft cloud: several squashed spheres in a row, middle ones lifted —
 * smoother and flatter than a pile of round blobs, so it reads as layered clay
 * rather than a lumpy grey ball.
 */
function puffGeo(seed: number, n: number, spread: number, flat: number, lift: number) {
  const rnd = (k: number) => { const x = Math.sin(seed * 47.3 + k * 7.77) * 43758.5453; return x - Math.floor(x) }
  const m = new THREE.Matrix4(), geos: THREE.BufferGeometry[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const g = new THREE.SphereGeometry(0.6 + rnd(i + 1) * 0.45, 16, 12)
    g.scale(1.55, flat + rnd(i + 9) * 0.14, 1.05)
    m.makeTranslation(
      (t - 0.5) * spread + (rnd(i + 5) - 0.5) * 0.4,
      Math.sin(t * Math.PI) * lift + (rnd(i + 3) - 0.5) * 0.18,
      (rnd(i + 7) - 0.5) * 0.6,
    )
    g.applyMatrix4(m)
    geos.push(g)
  }
  const g = mergeGeometries(geos, false)!
  geos.forEach((x) => x.dispose())
  return g
}

type Item = { p: [number, number, number]; s: [number, number, number]; geo: THREE.BufferGeometry; v: number; lane: [number, number]; sink: number }

// Broad slabs of the cloud sea: spread under the whole path and out to the sides,
// low enough that they never touch an island (tops sit y ≈ -5 … -8).
const SEA: Item[] = [
  [-26, -6.4, 16], [8, -7.2, 6], [-13, -6.8, -8], [23, -7.6, -20], [-31, -8.2, -34],
  [4, -7.0, -46], [-19, -8.6, -62], [17, -8.0, -78], [-7, -7.4, -97],
].map((p, i) => ({
  p: p as [number, number, number],
  s: [3.6 + ((i * 23) % 30) / 9, 1.35 + ((i * 31) % 10) / 12, 2.7 + ((i * 41) % 22) / 9] as [number, number, number],
  geo: puffGeo(i * 13 + 5, 7, 3.1, 0.4, 0.32),
  v: 0.045 + (i % 3) * 0.03, lane: [-42, 42], sink: 0,
}))

// Drifting puffs on side lanes — near the path but never over it; deep-zone puffs
// stay wide of the finale camera corridor and all sink out of frame in the finale.
const PUFFS: Item[] = [
  // left lanes
  { p: [-17, 2.3, -8], lane: [-27, -12] },
  { p: [-21, 4.2, -24], lane: [-28, -13] },
  { p: [-14, 1.6, -46], lane: [-30, -14] },
  { p: [-24, 5.6, -70], lane: [-34, -16] },
  // right lanes (one low puff sits ahead-right so the intro glide sweeps past it)
  { p: [16, 5.6, 13], lane: [13, 23] },
  { p: [15, 3.1, -18], lane: [12, 26] },
  { p: [22, 4.8, -40], lane: [14, 30] },
  { p: [18, 2.4, -60], lane: [16, 34] },
  { p: [26, 5.2, -84], lane: [20, 38] },
].map((o, i) => ({
  ...o, p: o.p as [number, number, number],
  s: [1 + ((i * 17) % 8) / 9, 0.95 + ((i * 11) % 6) / 10, 1 + ((i * 13) % 7) / 9] as [number, number, number],
  geo: puffGeo(i * 29 + 40, 5, 2.3, 0.5, 0.26),
  v: 0.06 + (i % 4) * 0.035, lane: o.lane as [number, number], sink: 1,
}))

// One swept-back wing triangle; mirrored pair flaps around the body.
function wingGeo(side: 1 | -1) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0.09, side * 0.5, 0, -0.05, side * 0.14, 0, -0.13,
  ]), 3))
  g.computeVertexNormals()
  return g
}
const WING_L = wingGeo(-1)
const WING_R = wingGeo(1)

/** A loose V of tiny distant birds — a few pixels each, gone by dusk. */
function Birds() {
  const g = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#5c4f42', transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false, depthWrite: false,
  }), [])
  useFrame((s) => {
    const g0 = g.current; if (!g0) return
    const t = RM ? 0 : s.clock.elapsedTime
    mat.opacity = Math.max(0, 0.55 - env.night * 0.85)
    g0.visible = mat.opacity > 0.01
    const th = t * 0.045 + 1.2 // one slow lap every ~140 s
    for (let i = 0; i < g0.children.length; i++) {
      const b = g0.children[i]
      const a = th - i * 0.055, row = (i % 2 ? 1 : -1) * Math.ceil(i / 2)
      const x = 1 + Math.cos(a) * 40 + row * 1.1, z = -46 + Math.sin(a) * 24 + row * 0.9
      b.position.set(x, 11.8 + Math.sin(t * 0.4 + i * 1.7) * 0.5 + row * 0.35, z)
      b.rotation.y = Math.atan2(-Math.sin(a) * 40, Math.cos(a) * 24) + Math.PI
      const flap = RM ? 0.15 : Math.sin(t * 7 + i * 2.4) * 0.55
      b.children[0].rotation.z = -0.15 - flap * 0.5
      b.children[1].rotation.z = 0.15 + flap * 0.5
    }
  })
  return (
    <group ref={g}>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} scale={0.85}>
          <mesh geometry={WING_L} material={mat} />
          <mesh geometry={WING_R} material={mat} />
        </group>
      ))}
    </group>
  )
}

export function Clouds() {
  const g = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 }), [])
  const tint = useMemo(() => new THREE.Color(), [])
  const items = useMemo(() => [...SEA, ...PUFFS], [])
  useFrame((s, dt) => {
    const g0 = g.current; if (!g0) return
    // ride the damped sky: bright paper by day, then deeper into the dusk/night sky
    tint.copy(env.mid).lerp(env.top, 0.42).lerp(PAPER, (1 - env.night) * 0.5)
    mat.color.copy(tint)
    const t = s.clock.elapsedTime
    g0.children.forEach((c, i) => {
      const it = items[i]; if (!it) return
      if (!RM) {
        c.position.x += dt * it.v
        if (c.position.x > it.lane[1]) c.position.x = it.lane[0]
        c.position.y = it.p[1] + Math.sin(t * 0.22 + i * 2.1) * 0.3 - it.sink * env.finale * 10
      } else {
        c.position.y = it.p[1] - it.sink * env.finale * 10
      }
    })
  })
  return (
    <>
      <group ref={g}>
        {items.map((c, i) => (
          <mesh key={i} geometry={c.geo} position={c.p} scale={c.s} material={mat} />
        ))}
      </group>
      <Birds />
    </>
  )
}
