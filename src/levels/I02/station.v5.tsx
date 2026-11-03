/**
 * I02 On the road — little country station props (proper assemblies, not boxes).
 * Placeholder clay until src/v5/art lands; swap clay()/C then.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as core from '../../v5/core'
import { C, clay, damp, ghostMat, paintGeo } from '../L04/shared.v5'
import type { Lit } from '../L04/street.v5'

type V3 = [number, number, number]
type P = { position?: V3; rotation?: V3; scale?: number | V3 }

/** Platform slab + terracotta lip. Walkable — you can step up onto it. */
export function Platform({ w = 1.9, ...p }: P & { w?: number }) {
  const slab = useRef<THREE.Mesh>(null)
  core.useWalkable(slab)
  return (
    <group {...p}>
      <RoundedBox ref={slab} args={[w, 0.13, 0.55]} radius={0.045} smoothness={3} position={[0, 0.065, 0]} material={clay(C.stoneLight)} castShadow receiveShadow />
      <RoundedBox args={[w, 0.05, 0.08]} radius={0.02} position={[0, 0.125, 0.26]} material={clay(C.terracotta)} castShadow />
      {[-w / 2 + 0.09, w / 2 - 0.09].map((x, i) => (
        <mesh key={i} position={[x, 0.16, 0.26]} material={clay(C.brick)}><boxGeometry args={[0.07, 0.14, 0.07]} /></mesh>
      ))}
    </group>
  )
}

/** Wooden bench with two legs. */
export function Bench({ yaw = 0, ...p }: P & { yaw?: number }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  return (
    <group {...p} rotation={[0, yaw, 0]}>
      <RoundedBox args={[0.46, 0.045, 0.16]} radius={0.02} position={[0, 0.24, 0]} material={clay(C.woodLight)} castShadow />
      <RoundedBox args={[0.46, 0.15, 0.035]} radius={0.015} position={[0, 0.34, -0.07]} material={clay(C.woodLight)} castShadow />
      {[-0.17, 0.17].map((dx) => (
        <mesh key={dx} position={[dx, 0.11, 0]} material={clay(C.wood)} castShadow><boxGeometry args={[0.04, 0.22, 0.13]} /></mesh>
      ))}
      <mesh ref={blk} position={[0, 0.2, 0]} material={ghostMat()}><boxGeometry args={[0.5, 0.42, 0.24]} /></mesh>
    </group>
  )
}

/** Station nameboard: post + sand board with a paper inset (no words — the registry owns copy). */
export function Nameboard({ yaw = 0, ...p }: P & { yaw?: number }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  return (
    <group {...p} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.32, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.02, 0.026, 0.64, 7]} /></mesh>
      <RoundedBox args={[0.44, 0.26, 0.035]} radius={0.035} position={[0, 0.7, 0]} material={clay(C.sand)} castShadow />
      <RoundedBox args={[0.37, 0.19, 0.04]} radius={0.03} position={[0, 0.7, 0.005]} material={clay(C.paper)} />
      <RoundedBox args={[0.37, 0.035, 0.042]} radius={0.012} position={[0, 0.615, 0.005]} material={clay(C.terracotta)} />
      <RoundedBox args={[0.26, 0.05, 0.042]} radius={0.012} position={[0, 0.72, 0.005]} material={clay(C.ink)} />
      <mesh ref={blk} position={[0, 0.4, 0]} material={ghostMat()}><boxGeometry args={[0.5, 0.8, 0.12]} /></mesh>
    </group>
  )
}

/** Platform lamp — own warm material so it can fade in. */
export function StationLamp({ h = 0.85, lit, ...p }: P & { h?: number; lit: Lit }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f2c07a', emissive: '#e89b4e', emissiveIntensity: 0, roughness: 0.6 }), [])
  useFrame((_, dt) => { mat.emissiveIntensity = damp(mat.emissiveIntensity, lit.current * 1.2, 3, dt) })
  return (
    <group {...p}>
      <mesh position={[0, 0.03, 0]} material={clay(C.stone)} castShadow><cylinderGeometry args={[0.07, 0.09, 0.06, 8]} /></mesh>
      <mesh position={[0, h * 0.5, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.022, 0.03, h * 0.94, 7]} /></mesh>
      <mesh position={[0, h + 0.045, 0]} scale={[1, 0.9, 1]} material={mat} castShadow><sphereGeometry args={[0.07, 12, 9]} /></mesh>
      <mesh position={[0, h + 0.115, 0]} material={clay(C.terracotta)} castShadow><coneGeometry args={[0.062, 0.075, 8]} /></mesh>
    </group>
  )
}

/** A waiting suitcase + a cloth bundle. */
export function Luggage(p: P) {
  return (
    <group {...p}>
      <group rotation={[0, 0.3, 0]}>
        <RoundedBox args={[0.24, 0.16, 0.11]} radius={0.025} position={[0, 0.09, 0]} material={clay(C.brick)} castShadow />
        <RoundedBox args={[0.25, 0.03, 0.115]} radius={0.01} position={[0, 0.145, 0]} material={clay(C.wood)} />
        <mesh position={[0, 0.185, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.wood)}><torusGeometry args={[0.035, 0.009, 5, 12, Math.PI]} /></mesh>
      </group>
      <group position={[0.3, 0, -0.05]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.08, 0]} scale={[1, 0.75, 0.9]} material={clay('#d9c9a8')} castShadow><sphereGeometry args={[0.11, 12, 9]} /></mesh>
        <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0.4]} material={clay(C.wood)}><torusGeometry args={[0.08, 0.012, 6, 14, Math.PI * 1.4]} /></mesh>
      </group>
    </group>
  )
}

/** Brass milk churn by the tea stall. */
export function Churn(p: P) {
  return (
    <group {...p}>
      <mesh position={[0, 0.1, 0]} material={clay('#d9b26a')} castShadow><cylinderGeometry args={[0.055, 0.075, 0.2, 10]} /></mesh>
      <mesh position={[0, 0.21, 0]} material={clay('#d9b26a')} castShadow><sphereGeometry args={[0.055, 10, 8]} /></mesh>
      <mesh position={[0, 0.245, 0]} material={clay(C.brick)}><cylinderGeometry args={[0.018, 0.018, 0.03, 8]} /></mesh>
    </group>
  )
}

/** Little tea stall: cream counter, terracotta awning, kettle, glasses. */
export function TeaStall({ yaw = 0, lit, ...p }: P & { yaw?: number; lit: Lit }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f2c07a', emissive: '#e89b4e', emissiveIntensity: 0, roughness: 0.7 }), [])
  useFrame((_, dt) => { glow.emissiveIntensity = damp(glow.emissiveIntensity, lit.current * 0.9, 3, dt) })
  return (
    <group {...p} rotation={[0, yaw, 0]}>
      <RoundedBox args={[0.62, 0.34, 0.38]} radius={0.04} position={[0, 0.19, 0]} material={clay(C.cream)} castShadow receiveShadow />
      <RoundedBox args={[0.68, 0.05, 0.44]} radius={0.02} position={[0, 0.39, 0]} material={clay(C.woodLight)} castShadow />
      {[-0.3, 0.3].map((dx) => (
        <mesh key={dx} position={[dx, 0.64, 0.2]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.018, 0.02, 0.52, 7]} /></mesh>
      ))}
      <RoundedBox args={[0.76, 0.035, 0.52]} radius={0.015} position={[0, 0.9, 0.07]} rotation={[-0.12, 0, 0]} material={clay(C.terracotta)} castShadow />
      {/* kettle + glasses on the counter */}
      <mesh position={[0.09, 0.5, 0.03]} scale={[1, 0.82, 1]} material={clay(C.brick)} castShadow><sphereGeometry args={[0.095, 16, 12]} /></mesh>
      <mesh position={[0.07, 0.56, 0.03]} material={clay('#d9b26a')}><cylinderGeometry args={[0.032, 0.038, 0.03, 10]} /></mesh>
      <mesh position={[0.22, 0.56, 0.03]} rotation={[0, 0, -0.75]} material={clay(C.brick)} castShadow><cylinderGeometry args={[0.011, 0.018, 0.14, 7]} /></mesh>
      <mesh position={[-0.05, 0.57, 0.03]} rotation={[0, 0, 0.2]} material={clay(C.wood)}><torusGeometry args={[0.052, 0.009, 6, 12, Math.PI]} /></mesh>
      {[[-0.24, 0.02], [-0.17, 0.07], [-0.11, 0.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.445, z]} material={glow}><cylinderGeometry args={[0.028, 0.024, 0.05, 10]} /></mesh>
      ))}
      <mesh position={[-0.17, 0.42, 0.05]} material={clay(C.wood)}><boxGeometry args={[0.2, 0.015, 0.13]} /></mesh>
      <mesh ref={blk} position={[0, 0.45, 0]} material={ghostMat()}><boxGeometry args={[0.8, 0.9, 0.55]} /></mesh>
    </group>
  )
}

/* ---------------- rails + causeway + train ---------------- */

export type TrackSpec = {
  curve: THREE.CatmullRomCurve3
  geo: THREE.BufferGeometry
  len: number
}

/** A floating rail causeway: stone ribbon, twin rails, sleepers, hanging pylons. */
export function useTrack(pts: V3[], seed = 5): TrackSpec {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal')
    const len = curve.getLength()
    const geos: THREE.BufferGeometry[] = []
    const rnd = (n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    const N = 64
    const left: THREE.Vector3[] = [], right: THREE.Vector3[] = []
    const pt = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3()
    for (let i = 0; i <= N; i++) {
      const u = i / N
      curve.getPointAt(u, pt); curve.getTangentAt(u, tan)
      side.set(-tan.z, 0, tan.x).normalize()
      left.push(pt.clone().addScaledVector(side, 0.11))
      right.push(pt.clone().addScaledVector(side, -0.11))
    }
    for (const arr of [left, right]) {
      const rail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arr), 72, 0.018, 6)
      paintGeo(rail, '#6b5a4c', undefined, 0.05)
      geos.push(rail)
    }
    // sleepers
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1)
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 1; i < N; i += 2) {
      const u = i / N
      curve.getPointAt(u, pt); curve.getTangentAt(u, tan)
      const yaw = Math.atan2(tan.x, tan.z)
      const g = new THREE.BoxGeometry(0.34, 0.035, 0.075)
      e.set(0, yaw + Math.PI / 2, 0); q.setFromEuler(e)
      g.applyMatrix4(m.compose(pt.clone().setY(pt.y - 0.035), q, sc))
      paintGeo(g, i % 4 ? C.wood : C.woodLight, undefined, 0.08)
      geos.push(g)
    }
    // stone ribbon under the rails (a narrow floating bed)
    {
      const verts: number[] = [], cols: number[] = []
      const c1 = new THREE.Color('#9a8f80'), c2 = new THREE.Color('#7d7264'), tmp = new THREE.Color()
      for (let i = 0; i <= N; i++) {
        const u = i / N
        curve.getPointAt(u, pt); curve.getTangentAt(u, tan)
        side.set(-tan.z, 0, tan.x).normalize()
        for (const s of [1, -1]) {
          const v = pt.clone().addScaledVector(side, s * 0.24).addScaledVector(up, -0.075)
          verts.push(v.x, v.y, v.z)
          tmp.copy(i % 2 ? c1 : c2).multiplyScalar(0.92 + rnd(i * 3) * 0.16)
          cols.push(tmp.r, tmp.g, tmp.b)
        }
      }
      const idx: number[] = []
      for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
      g.setIndex(idx)
      g.computeVertexNormals()
      // underside lip
      geos.push(g)
      const drop = g.clone()
      drop.translate(0, -0.05, 0)
      geos.push(drop)
    }
    // hanging pylons under the bed — little stacked stones that hold it in the sky
    for (const u of [0.18, 0.5, 0.82]) {
      curve.getPointAt(u, pt)
      for (let j = 0; j < 3; j++) {
        const r = 0.16 - j * 0.045
        const g = new THREE.DodecahedronGeometry(r, 0)
        e.set(rnd(u * 100 + j) * 3, rnd(u * 200 + j) * 3, 0); q.setFromEuler(e)
        g.applyMatrix4(m.compose(new THREE.Vector3(pt.x + (rnd(u * 300 + j) - 0.5) * 0.08, pt.y - 0.18 - j * r * 1.7, pt.z + (rnd(u * 400 + j) - 0.5) * 0.08), q, sc))
        paintGeo(g, '#8c7a66', undefined, 0.1)
        geos.push(g)
      }
    }
    const geo = mergeGeometries(geos, false)!
    geos.forEach((g) => g.dispose())
    return { curve, geo, len }
  }, [pts, seed])
}

/** A short run of track ON the island, pointing at the causeway (station siding). */
export function Siding({ yaw = 0, ...p }: P & { yaw?: number }) {
  const geo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1)
    for (const dz of [-0.11, 0.11]) {
      const g = new THREE.BoxGeometry(1.5, 0.03, 0.035)
      e.set(0, 0, 0); q.setFromEuler(e)
      g.applyMatrix4(m.compose(new THREE.Vector3(0, 0.045, dz), q, s))
      paintGeo(g, '#6b5a4c', undefined, 0.05)
      geos.push(g)
    }
    for (let i = 0; i < 6; i++) {
      const g = new THREE.BoxGeometry(0.34, 0.035, 0.075)
      e.set(0, Math.PI / 2, 0); q.setFromEuler(e)
      g.applyMatrix4(m.compose(new THREE.Vector3(-0.6 + i * 0.26, 0.02, 0), q, s))
      paintGeo(g, i % 2 ? C.wood : C.woodLight, undefined, 0.08)
      geos.push(g)
    }
    // a little buffer stop at the island end
    const g0 = new THREE.BoxGeometry(0.06, 0.2, 0.3)
    g0.applyMatrix4(m.compose(new THREE.Vector3(-0.78, 0.12, 0), q, s))
    paintGeo(g0, C.brick, undefined, 0.06)
    geos.push(g0)
    const g = mergeGeometries(geos, false)!
    geos.forEach((x) => x.dispose())
    return g
  }, [])
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), [])
  return <mesh {...p} rotation={[0, yaw, 0]} geometry={geo} material={vc} castShadow receiveShadow />
}

/** The little train: terracotta loco + two cream cars. Driven along `track` by `u`. */
export function Train({ track, uRef }: { track: TrackSpec; uRef: React.MutableRefObject<number> }) {
  const loco = useRef<THREE.Group>(null)
  const cars = useRef<(THREE.Group | null)[]>([])
  const tmpP = useMemo(() => new THREE.Vector3(), [])
  const tmpT = useMemo(() => new THREE.Vector3(), [])
  useFrame((s) => {
    const u = uRef.current
    const vis = u > 0.005 && u < 0.995
    const t = s.clock.elapsedTime
    const place = (g: THREE.Group | null, uu: number, bob = 1) => {
      if (!g) return
      g.visible = vis && uu > 0 && uu < 1
      if (!g.visible) return
      const uc = Math.min(0.999, Math.max(0.001, uu))
      track.curve.getPointAt(uc, tmpP)
      track.curve.getTangentAt(uc, tmpT)
      g.position.set(tmpP.x, tmpP.y + 0.02 + Math.sin(t * 7 + uu * 40) * 0.004 * bob, tmpP.z)
      g.rotation.y = Math.atan2(tmpT.x, tmpT.z)
      g.rotation.z = Math.sin(t * 2.1 + uu * 30) * 0.01
    }
    place(loco.current, u, 0)
    const spacing = 0.062
    place(cars.current[0], u - spacing, 1)
    place(cars.current[1], u - spacing * 2, 1.3)
  })
  return (
    <group>
      <group ref={loco}>
        {/* boiler + cab + stack */}
        <RoundedBox args={[0.34, 0.2, 0.24]} radius={0.05} position={[0, 0.2, 0.02]} material={clay(C.brick)} castShadow />
        <mesh position={[0, 0.26, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.terracotta)} castShadow><cylinderGeometry args={[0.1, 0.1, 0.3, 12]} /></mesh>
        <RoundedBox args={[0.26, 0.24, 0.16]} radius={0.035} position={[0, 0.3, -0.16]} material={clay(C.terracotta)} castShadow />
        <RoundedBox args={[0.3, 0.07, 0.2]} radius={0.025} position={[0, 0.45, -0.16]} material={clay(C.cream)} castShadow />
        <mesh position={[0, 0.42, 0.2]} material={clay(C.ink)} castShadow><cylinderGeometry args={[0.035, 0.05, 0.14, 8]} /></mesh>
        <mesh position={[0, 0.5, 0.2]} material={clay(C.ink)} castShadow><cylinderGeometry args={[0.055, 0.035, 0.05, 8]} /></mesh>
        <mesh position={[0, 0.16, 0.3]} rotation={[Math.PI / 2.6, 0, 0]} material={clay(C.stone)}><boxGeometry args={[0.22, 0.1, 0.05]} /></mesh>
        <mesh position={[0, 0.28, 0.29]} material={clay('#f2c07a')}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
        {[-0.11, 0.11].map((x) => [-0.12, 0.1, 0.26].map((z, i) => (
          <mesh key={`${x}${i}`} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]} material={clay(C.earthDark)} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
          </mesh>
        )))}
      </group>
      {[0, 1].map((i) => (
        <group key={i} ref={(el) => { cars.current[i] = el }}>
          <RoundedBox args={[0.3, 0.2, 0.46]} radius={0.05} position={[0, 0.22, 0]} material={clay(C.cream)} castShadow receiveShadow />
          <RoundedBox args={[0.34, 0.07, 0.5]} radius={0.03} position={[0, 0.36, 0]} material={clay(C.terracotta)} castShadow />
          {[-0.155, 0.155].map((x) => [-0.13, 0.0, 0.13].map((z) => (
            <RoundedBox key={`${x}${z}`} args={[0.02, 0.08, 0.09]} radius={0.01} position={[x, 0.25, z]} material={clay(C.water)} />
          )))}
          {[-0.11, 0.11].map((x) => [-0.14, 0.14].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.09, z]} rotation={[0, 0, Math.PI / 2]} material={clay(C.earthDark)} castShadow>
              <cylinderGeometry args={[0.065, 0.065, 0.05, 12]} />
            </mesh>
          )))}
        </group>
      ))}
      <TrainSteam track={track} uRef={uRef} />
    </group>
  )
}

/** Soft steam wisp trailing the loco while it moves. */
function TrainSteam({ track, uRef }: { track: TrackSpec; uRef: React.MutableRefObject<number> }) {
  const sprites = useRef<(THREE.Sprite | null)[]>([])
  const mats = useMemo(() => Array.from({ length: 3 }, () => new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false, color: '#e8e0d2' })), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((s) => {
    const u = uRef.current
    const moving = u > 0.02 && u < 0.98
    const t = s.clock.elapsedTime
    sprites.current.forEach((sp, i) => {
      if (!sp) return
      const ph = ((t * 0.9 + i * 0.36) % 1.1) / 1.1
      const uu = u - 0.003 - ph * 0.012
      track.curve.getPointAt(Math.min(0.999, Math.max(0.001, uu)), tmp)
      sp.position.set(tmp.x, tmp.y + 0.58 + ph * 0.35, tmp.z)
      const sc = 0.12 + ph * 0.4
      sp.scale.set(sc, sc, 1)
      mats[i].opacity = moving ? (1 - ph) * 0.4 : 0
      sp.visible = mats[i].opacity > 0.02
    })
  })
  return (
    <group>
      {mats.map((m, i) => <sprite key={i} ref={(el) => { sprites.current[i] = el }} material={m} visible={false} />)}
    </group>
  )
}
