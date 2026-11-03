/**
 * Soft volumetric-looking clouds for V5, in two layers: a broad flattened sea
 * below the islands and a handful of slow puffs drifting on lanes around the
 * path. One shared MeshStandardMaterial is tinted toward the scene fog colour
 * every frame, so clouds pick up whatever sky WORLD sets (cream by day, mauve
 * at dusk, indigo at night) without this file importing the sky module.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { env } from '../../world/sky'

const RM =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches
const PAPER = new THREE.Color('#fbf6ee')

/** One merged puff: squashed spheres in a row, middle ones lifted slightly. */
function puffGeo(seed: number, n: number, spread: number, flat: number, lift: number) {
  const rnd = (k: number) => {
    const x = Math.sin(seed * 47.3 + k * 7.77) * 43758.5453
    return x - Math.floor(x)
  }
  const m = new THREE.Matrix4()
  const geos: THREE.BufferGeometry[] = []
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

type Item = {
  p: [number, number, number]
  s: [number, number, number]
  geo: THREE.BufferGeometry
  v: number
  lane: [number, number]
  /** how far this cloud sinks during the finale pull-back */
  sink: number
}

export function Clouds5({
  /** y of the cloud-sea layer; puffs ride above it. */
  seaY = -9,
  /** x/z extent of the cloud sea. */
  span = 60,
  /** extra drifting puffs: position, scale, drift speed, x-lane */
  puffs = [] as { p: [number, number, number]; s?: number; v?: number; lane?: [number, number] }[],
  speed = 0.05,
}: {
  seaY?: number
  span?: number
  puffs?: { p: [number, number, number]; s?: number; v?: number; lane?: [number, number] }[]
  speed?: number
}) {
  const g = useRef<THREE.Group>(null)
  useThree()
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    [],
  )
  const op = useRef(0.95)
  const items = useMemo<Item[]>(() => {
    const sea: Item[] = []
    const k = Math.max(3, Math.round(span / 18))
    for (let i = 0; i < k * k; i++) {
      const gx = (i % k) - k / 2
      const gz = Math.floor(i / k) - k / 2
      sea.push({
        p: [gx * 18 + (i % 3) * 4, seaY - (i % 4) * 0.8, gz * 18],
        s: [4 + (i % 5), 1.3 + (i % 3) * 0.3, 3 + (i % 4)],
        geo: puffGeo(i * 13 + 5, 7, 3.1, 0.4, 0.32),
        v: speed * (0.7 + (i % 3) * 0.3),
        lane: [-span, span],
        sink: 1,
      })
    }
    const ps = puffs.map((o, i) => ({
      p: o.p,
      s: [o.s ?? 1, (o.s ?? 1) * 0.95, o.s ?? 1] as [number, number, number],
      geo: puffGeo(i * 29 + 40, 5, 2.3, 0.5, 0.26),
      v: o.v ?? speed,
      lane: o.lane ?? ([o.p[0] - 10, o.p[0] + 10] as [number, number]),
      sink: 0.55,
    }))
    return [...sea, ...ps]
  }, [seaY, span, puffs, speed])
  const tint = useMemo(() => new THREE.Color(), [])
  useFrame((s, dt) => {
    const g0 = g.current
    if (!g0) return
    // V4's tint: paper by day, then deep into the dusk/night sky so clouds
    // blend into the dome instead of reading as dark blobs.
    tint.copy(env.mid).lerp(env.top, 0.42).lerp(PAPER, (1 - env.night) * 0.5)
    mat.color.copy(tint)
    mat.emissive.copy(tint).multiplyScalar(0.12)
    // the pull-back sees the whole cloud layer edge-on as one dark mass —
    // dissolve it as the finale opens so only the lit path remains
    op.current += ((0.95 * (1 - env.finale * 0.92)) - op.current) * (1 - Math.exp(-dt * 2))
    mat.opacity = op.current
    const t = s.clock.elapsedTime
    g0.children.forEach((c, i) => {
      const it = items[i]
      if (!it) return
      if (!RM) {
        c.position.x += dt * it.v
        if (c.position.x > it.lane[1]) c.position.x = it.lane[0]
        c.position.y = it.p[1] + Math.sin(t * 0.2 + i * 2.1) * 0.3 - it.sink * env.finale * 14
      } else {
        c.position.y = it.p[1] - it.sink * env.finale * 14
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
    </>
  )
}
