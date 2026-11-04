/**
 * L04 Alive — Delhi street props (proper assemblies, not boxes).
 * Placeholder clay until src/v5/art lands; swap clay()/C then.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as core from '../../v5/core'
import { C, clay, damp, ghostMat, makeTex, paintGeo } from './shared.v5'

type V3 = [number, number, number]
type P = { position?: V3; rotation?: V3; scale?: number | V3 }
/** Shared live 0..1 "warmth" — a ref read per frame so parents never re-render for light. */
export type Lit = React.MutableRefObject<number>

/** Lit window / lamp warmth. */
export const lampWarm = (on: number) =>
  new THREE.MeshStandardMaterial({ color: '#e8d3a8', emissive: '#e8a84e', emissiveIntensity: 1.15 * on, roughness: 0.7 })

/* ------------------------------ house ------------------------------ */

/** Small Delhi rooftop: cream block, flat terracotta slab with a brick lip,
 *  black water tank, stair bulkhead, a couple of windows. Blocks the player. */
export function Rooftop({ s = 1, yaw = 0, lit, ...p }: P & { s?: number; yaw?: number; lit?: Lit }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  const litMat = useMemo(() => lampWarm(0), [])
  useFrame((_, dt) => { litMat.emissiveIntensity = damp(litMat.emissiveIntensity, (lit?.current ?? 0) * 1.1, 4, dt) })
  return (
    <group {...p} rotation={[0, yaw, 0]} scale={[s, s, s]}>
      <RoundedBox args={[1.05, 0.78, 0.9]} radius={0.05} position={[0, 0.39, 0]} material={clay(C.cream)} castShadow receiveShadow />
      {/* flat roof slab + raised brick lip (Delhi terraces) */}
      <mesh position={[0, 0.8, 0]} material={clay(C.terracotta)}><boxGeometry args={[1.11, 0.07, 0.96]} /></mesh>
      {[[0, -0.46, 1.11, 0.05], [0, 0.46, 1.11, 0.05]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.875, z]} material={clay(C.brick)}><boxGeometry args={[w, 0.08, d]} /></mesh>
      ))}
      {[[-0.53, 0, 0.05, 0.96], [0.53, 0, 0.05, 0.96]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.875, z]} material={clay(C.brick)}><boxGeometry args={[w, 0.08, d]} /></mesh>
      ))}
      {/* stair bulkhead + the black water tank every roof has */}
      <RoundedBox args={[0.34, 0.3, 0.4]} radius={0.03} position={[-0.28, 0.98, -0.2]} material={clay(C.sand)} />
      <group position={[0.26, 0.95, 0.14]}>
        <mesh position={[0, 0.05, 0]} material={clay('#4c4640')}><cylinderGeometry args={[0.14, 0.14, 0.1, 12]} /></mesh>
        <mesh position={[0, 0.16, 0]} material={clay('#4c4640')}><cylinderGeometry args={[0.135, 0.14, 0.14, 12]} /></mesh>
        <mesh position={[0, 0.245, 0]} material={clay('#5a534c')}><cylinderGeometry args={[0.06, 0.1, 0.03, 12]} /></mesh>
        {[0.07, -0.07].map((y, i) => (
          <mesh key={i} position={[0, 0.16 + y * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay('#3c3733')}>
            <torusGeometry args={[0.142, 0.008, 5, 14]} />
          </mesh>
        ))}
      </group>
      {/* door + windows (one warms at the end) */}
      <RoundedBox args={[0.24, 0.44, 0.05]} radius={0.03} position={[0.12, 0.22, 0.455]} material={clay(C.wood)} />
      <RoundedBox args={[0.2, 0.2, 0.05]} radius={0.02} position={[-0.3, 0.5, 0.455]} material={lit ? litMat : clay(C.water)} />
      <RoundedBox args={[0.24, 0.03, 0.055]} radius={0.01} position={[-0.3, 0.62, 0.455]} material={clay(C.terracotta)} />
      <RoundedBox args={[0.16, 0.14, 0.04]} radius={0.02} position={[0.3, 0.52, 0.46]} material={clay(C.water)} />
      {/* clothesline on the roof: two posts + a line + two tiny cloth bits */}
      <mesh position={[-0.44, 1.06, 0.3]} material={clay(C.wood)}><cylinderGeometry args={[0.014, 0.016, 0.42, 5]} /></mesh>
      <mesh position={[0.05, 1.06, 0.38]} material={clay(C.wood)}><cylinderGeometry args={[0.014, 0.016, 0.4, 5]} /></mesh>
      <mesh position={[-0.195, 1.245, 0.34]} rotation={[Math.PI / 2 - 0.08, 0, Math.PI / 2 + 0.17]} material={clay('#efe3cd')}>
        <cylinderGeometry args={[0.005, 0.005, 0.5, 4]} />
      </mesh>
      <RoundedBox args={[0.1, 0.13, 0.012]} radius={0.02} position={[-0.31, 1.18, 0.325]} rotation={[0.05, 0.1, 0.04]} material={clay('#e9b3a5')} />
      <RoundedBox args={[0.09, 0.11, 0.012]} radius={0.02} position={[-0.09, 1.19, 0.352]} rotation={[-0.04, -0.08, -0.05]} material={clay('#b8dade')} />
      <mesh ref={blk} position={[0, 0.5, 0]} material={ghostMat()}><boxGeometry args={[1.2, 1.0, 1.05]} /></mesh>
    </group>
  )
}

/* ------------------------------ street lamp ------------------------------ */

/** Municipal street lamp: fluted-ish pole, curved arm, warm head. `lit` 0..1, self-damping. */
export function StreetLamp({ h = 1.55, lit, ...p }: P & { h?: number; lit: Lit }) {
  const mat = useMemo(() => lampWarm(0), [])
  useFrame((_, dt) => { mat.emissiveIntensity = damp(mat.emissiveIntensity, lit.current * 1.35, 3, dt) })
  return (
    <group {...p}>
      <mesh position={[0, 0.05, 0]} material={clay(C.stone)}><cylinderGeometry args={[0.09, 0.12, 0.1, 8]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={clay('#5f6b6a')}><cylinderGeometry args={[0.026, 0.04, h, 8]} /></mesh>
      <mesh position={[0.14, h + 0.02, 0]} rotation={[0, 0, Math.PI / 2.4]} material={clay('#5f6b6a')}><cylinderGeometry args={[0.02, 0.026, 0.34, 7]} /></mesh>
      <mesh position={[0.3, h + 0.11, 0]} material={mat}><sphereGeometry args={[0.075, 14, 10]} /></mesh>
      <mesh position={[0.3, h + 0.17, 0]} material={clay('#4c5a58')}><coneGeometry args={[0.09, 0.07, 10]} /></mesh>
    </group>
  )
}

/* ------------------------------ sensor hardware ------------------------------ */

/** The field sensor post the player powers: stone footing, steel post, tilted solar
 *  wing, glass sensor head and a little wind vane that spins once it has power. */
export function SensorPost({ powered, shakeT, ...p }: P & { powered: boolean; shakeT: React.MutableRefObject<number> }) {
  const g = useRef<THREE.Group>(null)
  const vane = useRef<THREE.Group>(null)
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  const headMat = useMemo(() => lampWarm(0), [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0c98a', transparent: true, opacity: 0 }), [])
  useFrame((s, dt) => {
    const k = damp(headMat.emissiveIntensity, powered ? 1.25 : 0, 3, dt)
    headMat.emissiveIntensity = k
    ringMat.opacity = damp(ringMat.opacity, powered ? 0.4 : 0, 3, dt)
    if (vane.current) vane.current.rotation.y += dt * (powered ? 2.4 : 0.35)
    if (g.current && shakeT.current > 0) {
      shakeT.current = Math.max(0, shakeT.current - dt)
      g.current.rotation.z = Math.sin(shakeT.current * 55) * 0.05 * shakeT.current
    } else if (g.current) g.current.rotation.z = 0
  })
  return (
    <group {...p}>
      <group ref={g}>
        <mesh position={[0, 0.06, 0]} material={clay(C.stone)}><cylinderGeometry args={[0.16, 0.2, 0.12, 10]} /></mesh>
        <mesh position={[0, 0.52, 0]} material={clay('#66787a')}><cylinderGeometry args={[0.035, 0.05, 0.94, 8]} /></mesh>
        {/* tilted solar wing */}
        <group position={[0, 0.98, 0]} rotation={[0, -0.5, 0]}>
          <RoundedBox args={[0.42, 0.025, 0.3]} radius={0.012} position={[-0.1, 0.05, 0]} rotation={[0, 0, 0.42]} material={clay('#3d5468')} />
          {[0.07, -0.07].map((z, i) => (
            <mesh key={i} position={[-0.1, 0.062, z]} rotation={[0, 0, 0.42]} material={clay('#54708a')}><boxGeometry args={[0.4, 0.008, 0.05]} /></mesh>
          ))}
        </group>
        {/* sensor head: glass dome on a collar */}
        <mesh position={[0, 1.02, 0]} material={clay(C.ink)}><cylinderGeometry args={[0.055, 0.065, 0.06, 10]} /></mesh>
        <mesh position={[0, 1.1, 0]} material={headMat}><sphereGeometry args={[0.07, 14, 10]} /></mesh>
        {/* wind vane */}
        <group ref={vane} position={[0, 1.2, 0]}>
          <mesh position={[0, 0, 0]} material={clay('#8a9799')}><cylinderGeometry args={[0.008, 0.008, 0.1, 5]} /></mesh>
          <mesh position={[0.05, 0.05, 0]} material={clay('#8a9799')}><boxGeometry args={[0.12, 0.012, 0.012]} /></mesh>
          <mesh position={[-0.055, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.terracotta)}><coneGeometry args={[0.03, 0.06, 6]} /></mesh>
        </group>
        {/* power ring at the base */}
        <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
          <ringGeometry args={[0.2, 0.24, 28]} />
        </mesh>
      </group>
      <mesh ref={blk} position={[0, 0.6, 0]} material={ghostMat()}><cylinderGeometry args={[0.24, 0.24, 1.2, 8]} /></mesh>
    </group>
  )
}

/** The far relay tower: lattice mast, glass dome, small dish. Warms when powered. */
export function SensorTower({ lit, ...p }: P & { lit: Lit }) {
  const vane = useRef<THREE.Group>(null)
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  const domeMat = useMemo(() => lampWarm(0), [])
  const bandMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0c98a', transparent: true, opacity: 0 }), [])
  useFrame((_, dt) => {
    const k = lit.current
    domeMat.emissiveIntensity = damp(domeMat.emissiveIntensity, k * 1.4, 2.6, dt)
    bandMat.opacity = damp(bandMat.opacity, k * 0.55, 2.6, dt)
    if (vane.current) vane.current.rotation.y += dt * (0.4 + k * 2.2)
  })
  return (
    <group {...p}>
      {/* footings + tapered lattice mast */}
      {[[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]].map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 0.045, z]} material={clay(C.stone)}><cylinderGeometry args={[0.05, 0.065, 0.09, 7]} /></mesh>
          <mesh position={[x * 0.72, 0.85, z * 0.72]} rotation={[z * 0.16, 0, -x * 0.16]} material={clay('#66787a')}>
            <cylinderGeometry args={[0.018, 0.024, 1.62, 6]} />
          </mesh>
        </group>
      ))}
      {[0.45, 0.85, 1.25].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} material={clay('#7c8b8d')}>
          <boxGeometry args={[0.26 - i * 0.05, 0.022, 0.26 - i * 0.05]} />
        </mesh>
      ))}
      {/* instrument box + dish + dome */}
      <RoundedBox args={[0.2, 0.16, 0.16]} radius={0.025} position={[0, 1.52, 0]} material={clay(C.sand)} />
      <mesh position={[0.16, 1.56, 0]} rotation={[0, 0, -0.9]} material={clay('#8a9799')}><sphereGeometry args={[0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 1.66, 0]} material={clay(C.ink)}><cylinderGeometry args={[0.05, 0.06, 0.05, 10]} /></mesh>
      <mesh position={[0, 1.73, 0]} material={domeMat}><sphereGeometry args={[0.08, 16, 12]} /></mesh>
      <group ref={vane} position={[0, 1.86, 0]}>
        <mesh material={clay('#8a9799')}><cylinderGeometry args={[0.007, 0.007, 0.1, 5]} /></mesh>
        <mesh position={[0.05, 0.05, 0]} material={clay('#8a9799')}><boxGeometry args={[0.12, 0.01, 0.01]} /></mesh>
        <mesh position={[-0.05, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.terracotta)}><coneGeometry args={[0.026, 0.05, 6]} /></mesh>
      </group>
      <mesh position={[0, 1.52, 0]} rotation={[-Math.PI / 2, 0, 0]} material={bandMat}>
        <ringGeometry args={[0.16, 0.19, 26]} />
      </mesh>
      <mesh ref={blk} position={[0, 0.95, 0]} material={ghostMat()}><cylinderGeometry args={[0.3, 0.3, 1.9, 8]} /></mesh>
    </group>
  )
}

/** Small kerbside air-quality reader: stub post + hooded reader. The AQI tag appears above it. */
export function AqiPost({ ...p }: P) {
  return (
    <group {...p}>
      <mesh position={[0, 0.035, 0]} material={clay(C.stone)}><cylinderGeometry args={[0.06, 0.075, 0.07, 8]} /></mesh>
      <mesh position={[0, 0.3, 0]} material={clay('#66787a')}><cylinderGeometry args={[0.02, 0.028, 0.55, 7]} /></mesh>
      <RoundedBox args={[0.13, 0.1, 0.09]} radius={0.02} position={[0, 0.6, 0]} material={clay(C.cream)} />
      <mesh position={[0, 0.665, 0]} material={clay(C.terracotta)}><boxGeometry args={[0.14, 0.025, 0.1]} /></mesh>
      <mesh position={[0, 0.585, 0.048]} material={clay('#3d5468')}><boxGeometry args={[0.08, 0.05, 0.012]} /></mesh>
    </group>
  )
}

/* ------------------------------ street dressing ------------------------------ */

/** A street tree in a little square soil pit, sparse dusty canopy. */
export function StreetTree({ s = 1, ...p }: P & { s?: number }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  return (
    <group {...p} scale={[s, s, s]}>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay('#9a8468')} receiveShadow>
        <planeGeometry args={[0.62, 0.62]} />
      </mesh>
      {[0.31, -0.31].map((v, i) => (
        <group key={i}>
          <mesh position={[v, 0.03, 0]} material={clay(C.stone)}><boxGeometry args={[0.03, 0.06, 0.62]} /></mesh>
          <mesh position={[0, 0.03, v]} material={clay(C.stone)}><boxGeometry args={[0.62, 0.06, 0.03]} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.06]} material={clay(C.wood)}><cylinderGeometry args={[0.05, 0.075, 0.62, 8]} /></mesh>
      <mesh position={[0.1, 0.62, 0.02]} rotation={[0, 0, -0.5]} material={clay(C.wood)}><cylinderGeometry args={[0.03, 0.045, 0.35, 7]} /></mesh>
      <mesh position={[0, 0.88, 0]} material={clay('#87a05e')}><sphereGeometry args={[0.4, 16, 12]} /></mesh>
      <mesh position={[0.28, 0.72, 0.1]} material={clay('#7a9455')}><sphereGeometry args={[0.27, 13, 10]} /></mesh>
      <mesh position={[-0.24, 0.7, -0.06]} material={clay('#87a05e')}><sphereGeometry args={[0.22, 12, 9]} /></mesh>
      <mesh ref={blk} position={[0, 0.5, 0]} material={ghostMat()}><cylinderGeometry args={[0.4, 0.3, 1.0, 8]} /></mesh>
    </group>
  )
}

/** Asphalt pad height — must clear the domed grass cap (max 0.06, see domeY). */
export const STREET_Y = 0.075

/** Broken kerb chunks + asphalt patch + scattered debris, all merged into ONE vertex-coloured mesh. */
export function useStreetGeo(seed = 11, z0 = 0.55, z1 = -2.75, halfW = 4.7) {
  return useMemo(() => {
    const rnd = (n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    const geos: THREE.BufferGeometry[] = []
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1)
    const put = (g0: THREE.BufferGeometry, x: number, y: number, z: number, ry: number, hex: string, rx = 0, rz = 0, sc = 1, jit = 0.07) => {
      const g = g0.index ? g0.toNonIndexed() : g0
      if (g !== g0) g0.dispose()
      e.set(rx, ry, rz); q.setFromEuler(e); s.setScalar(sc)
      g.applyMatrix4(m.compose(new THREE.Vector3(x, y, z), q, s))
      paintGeo(g, hex, undefined, jit)
      geos.push(g)
    }
    // the slumped asphalt slab: a wobbly flat shape covering the whole strip
    const shape = new THREE.Shape()
    const wob = (x: number, z: number, i: number, k = 0.16) =>
      [x + (rnd(i * 2) - 0.5) * k * 2, z + (rnd(i * 2 + 1) - 0.5) * k] as const
    const edge: [number, number][] = []
    const N = 26
    for (let i = 0; i <= N; i++) { const t = i / N; edge.push([ -halfW + t * halfW * 2, z0 + (rnd(i) - 0.5) * 0.3 ]) }
    for (let i = 0; i <= N; i++) { const t = i / N; edge.push([ halfW - t * halfW * 2, z1 + (rnd(40 + i) - 0.5) * 0.3 ]) }
    edge.forEach(([x, z], i) => { const [wx, wz] = wob(x, z, i); i === 0 ? shape.moveTo(wx, -wz) : shape.lineTo(wx, -wz) })
    shape.closePath()
    const slab = new THREE.ShapeGeometry(shape, 4)
    slab.rotateX(-Math.PI / 2) // shape +y maps to -z; we built shape with y = -z so z comes out right
    put(slab, 0, STREET_Y, 0, 0, '#6f675c', 0, 0, 1, 0.05)
    // faint lane line fragments, half buried
    for (let i = 0; i < 9; i++) {
      const x = -halfW + 0.7 + i * (halfW * 2 - 1.4) / 8
      put(new THREE.BoxGeometry(0.34, 0.008, 0.05), x, STREET_Y + 0.005, -1.1 + (rnd(90 + i) - 0.5) * 0.5, 0.02, '#cfc4a8', 0, 0, 1, 0.05)
    }
    // broken kerb chunks along both edges of the strip
    for (let i = 0, k = 0; i < 60 && k < 30; i++) {
      const side = rnd(i * 3) > 0.5
      const z = side ? z0 + 0.08 : z1 - 0.08
      const x = -halfW + rnd(i * 7 + 2) * halfW * 2
      if (Math.abs(x) < 0.75 && (side || z1 + 0.5 > z)) continue // leave the path mouth open
      const L = 0.3 + rnd(i * 5) * 0.5
      put(new THREE.BoxGeometry(L, 0.11, 0.14), x, STREET_Y + 0.055, z + (rnd(i * 11) - 0.5) * 0.14, (rnd(i * 13) - 0.5) * 0.5, rnd(i) > 0.5 ? '#9a8f80' : '#8a7f70',
        (rnd(i * 17) - 0.5) * 0.14, (rnd(i * 19) - 0.5) * 0.14)
      k++
    }
    // scattered debris stones inside the street
    for (let i = 0; i < 26; i++) {
      const x = -halfW + 0.4 + rnd(120 + i * 3) * (halfW * 2 - 0.8)
      const z = z1 + 0.3 + rnd(130 + i * 5) * (z0 - z1 - 0.6)
      const r = 0.04 + rnd(i * 7) * 0.1
      put(new THREE.DodecahedronGeometry(r, 0), x, STREET_Y + r * 0.3, z, rnd(i) * 3, rnd(i + 4) > 0.5 ? '#7d7264' : '#8d8272', (rnd(i * 9) - 0.5) * 0.5, (rnd(i * 11) - 0.5) * 0.5, 1, 0.12)
    }
    // a couple of half-buried bricks
    for (let i = 0; i < 10; i++) {
      const x = -halfW + 0.5 + rnd(200 + i * 3) * (halfW * 2 - 1)
      const z = z1 + 0.3 + rnd(210 + i * 5) * (z0 - z1 - 0.6)
      put(new THREE.BoxGeometry(0.16, 0.08, 0.1), x, STREET_Y + 0.03, z, rnd(i) * 3, '#a06a52', (rnd(i * 9) - 0.5) * 0.4, (rnd(i * 11) - 0.5) * 0.4, 1, 0.1)
    }
    const g = mergeGeometries(geos, false)!
    geos.forEach((x) => x.dispose())
    return g
  }, [seed, z0, z1, halfW])
}

/** Lone silhouettes that stand in the smog: a drooping cable between two poles. */
export function CableSpan({ from, to, sag = 0.3, ...p }: P & { from: V3; to: V3; sag?: number }) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
    const mid = a.clone().lerp(b, 0.5); mid.y -= sag
    const curve = new THREE.CatmullRomCurve3([a, mid, b])
    return new THREE.TubeGeometry(curve, 14, 0.012, 5)
  }, [from, to, sag])
  return <mesh {...p} geometry={geo} material={clay('#4c4640')} />
}

/** Small sign texture with an AQI label. */
export function aqiTagTex(aqi: number) {
  return makeTex(128, 96, (ctx) => {
    ctx.fillStyle = 'rgba(251,246,238,0.94)'
    const r = 16
    ctx.beginPath()
    ctx.roundRect(10, 8, 108, 80, r)
    ctx.fill()
    ctx.fillStyle = '#6b5f57'
    ctx.font = '500 22px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('AQI', 64, 36)
  })
}
