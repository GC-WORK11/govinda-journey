/**
 * The bridge moment, V5: it appears only once the island behind it is complete.
 * Posts and rope rails sweep out first, then planks drop in one by one with a
 * soft squash; a dust puff at the far end. The deck is registered walkable the
 * whole time it is building (the controller lands on whichever planks exist)
 * via an invisible strip that follows the same sag — plus the plank meshes.
 * Heights interpolate between the two island tops, so bridges can climb.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { C, clay, clayVC, paint } from '../../world/kit'
import { Lanterns, bridgeLampSpots } from '../../world/Lanterns'
import { useWalkable } from '../core'
import { exitWorld, entryWorld } from './layout'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Deck height along the bridge: endpoint lerp + a gentle sag. */
const deckY = (from: THREE.Vector3, to: THREE.Vector3, t: number) =>
  THREE.MathUtils.lerp(from.y, to.y, t) - 0.06 - Math.sin(t * Math.PI) * 0.55

function bridgeGeo(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from); const len = dir.length(); dir.normalize()
  const lat = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.44)
  const ang = Math.atan2(dir.x, dir.z)
  const n = Math.max(4, Math.floor(len / 0.38))
  const planks: { p: THREE.Vector3; r: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = from.clone().lerp(to, t)
    p.y = deckY(from, to, t)
    planks.push({ p, r: ang })
  }
  const geos: THREE.BufferGeometry[] = []
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1)
  const put = (g: THREE.BufferGeometry, v: THREE.Vector3, ry: number, hex: string, rx = 0, rz = 0) => {
    eu.set(rx, ry, rz); q.setFromEuler(eu); g.applyMatrix4(mtx.compose(v, q, sc)); paint(g, hex, undefined, 0.06); geos.push(g)
  }
  for (const end of [from, to]) for (const s of [-1, 1]) {
    const base = end.clone().addScaledVector(lat, s)
    put(new THREE.CylinderGeometry(0.05, 0.065, 0.7, 7), base.clone().setY(end.y + 0.24), ang, C.wood, 0, s * 0.07)
    put(new THREE.SphereGeometry(0.08, 10, 8), base.clone().setY(end.y + 0.62), ang, C.woodLight)
  }
  for (const s of [-1, 1]) {
    const pts: THREE.Vector3[] = []
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, p = from.clone().lerp(to, t).addScaledVector(lat, s)
      p.y = deckY(from, to, t) + 0.58 - Math.sin(t * Math.PI) * 0.3
      pts.push(p)
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.022, 6)
    paint(tube, '#dcc7a0', undefined, 0.05); geos.push(tube)
  }
  const rails = mergeGeometries(geos, false)!
  geos.forEach((x) => x.dispose())
  // invisible walk strip following the deck profile — at least plank width
  // (planks are 0.95 across; a hair over for forgiveness at the edges).
  // The strip runs a touch past both ends so it always overlaps the island
  // walk discs — no seam to catch a foot on.
  const w = 0.98, strip: number[] = []
  const idx: number[] = []
  const T0 = -0.05, T1 = 1.05
  for (let i = 0; i <= 40; i++) {
    const t = T0 + (i / 40) * (T1 - T0), p = from.clone().lerp(to, t)
    const tc = Math.min(1, Math.max(0, t))
    const y = deckY(from, to, tc) + 0.045
    strip.push(p.x - lat.x * (w / 0.44) * 0.5, y, p.z - lat.z * (w / 0.44) * 0.5, p.x + lat.x * (w / 0.44) * 0.5, y, p.z + lat.z * (w / 0.44) * 0.5)
    if (i < 40) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  }
  const walk = new THREE.BufferGeometry()
  walk.setAttribute('position', new THREE.BufferAttribute(new Float32Array(strip), 3))
  walk.setIndex(idx)
  walk.computeVertexNormals()
  return { planks, rails, walk, lat }
}

export function Bridge5({ i, shown }: { i: number; shown: boolean }) {
  const { planks, rails, walk, spots, yaw, mid } = useMemo(() => {
    const from = exitWorld(i), to = entryWorld(i + 1)
    const g = bridgeGeo(from, to)
    return {
      ...g,
      spots: bridgeLampSpots(from, to),
      yaw: Math.atan2(-(to.z - from.z), to.x - from.x),
      mid: from.clone().lerp(to, 0.5),
    }
  }, [i])
  const walkRef = useRef<THREE.Mesh>(null)
  useWalkable(walkRef, shown)
  const railsWrap = useRef<THREE.Group>(null)
  const lampWrap = useRef<THREE.Group>(null)
  const plRef = useRef<(THREE.Group | null)[]>([])
  const st = useRef({ p: shown ? 1 : 0, landed: shown })
  useFrame((_, dt) => {
    const k = st.current
    k.p = RM ? (shown ? 1 : 0) : shown ? Math.min(1, k.p + dt / 1.45) : 0
    const rp = Math.min(1, Math.max(0, (k.p - 0.02) / 0.3))
    const re = 1 - Math.pow(1 - rp, 3)
    if (railsWrap.current) { railsWrap.current.scale.set(Math.max(0.0001, re), 1, 1); railsWrap.current.visible = rp > 0.001 }
    if (lampWrap.current) { const s = Math.max(0.0001, re); lampWrap.current.scale.setScalar(s); lampWrap.current.visible = s > 0.3 }
    const n = planks.length
    for (let j = 0; j < n; j++) {
      const g = plRef.current[j]; if (!g) continue
      const k2 = RM ? k.p : Math.min(1, Math.max(0, (k.p * 1.08 - (j / (n + 1)) * 0.9) / 0.18))
      g.visible = k2 > 0.001
      g.position.y = planks[j].p.y + (1 - k2) * (1 - k2) * 0.85
      const sc = Math.max(0.0001, 1 + Math.sin(Math.min(1, k2) * Math.PI) * 0.14)
      g.scale.set(sc, k2 < 0.92 ? Math.max(0.0001, 0.6 + 0.4 * (k2 / 0.92)) : 1, sc)
    }
    if (shown && k.p >= 1 && !k.landed) { k.landed = true }
    if (!shown) k.landed = false
  })
  return (
    <group name={`bridge-${i}`}>
      {/* walk surface: invisible strip (draws nothing, still raycastable; DoubleSide so the down-ray can't miss) */}
      <mesh ref={walkRef} geometry={walk} name={`walk-bridge-${i}`}>
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      <group position={exitWorld(i)} rotation={[0, yaw, 0]}>
        <group ref={railsWrap}>
          <group rotation={[0, -yaw, 0]}>
            <group position={exitWorld(i).negate()}>
              <mesh geometry={rails} material={clayVC()} castShadow />
            </group>
          </group>
        </group>
      </group>
      <group position={mid}>
        <group ref={lampWrap}>
          <group position={mid.clone().negate()}>
            <Lanterns spots={spots} />
          </group>
        </group>
      </group>
      {planks.map((pl, j) => (
        <group key={j} ref={(el) => { plRef.current[j] = el }} position={pl.p} rotation={[0, pl.r, (j % 3 - 1) * 0.03]} visible={st.current.p > 0}>
          <RoundedBox args={[0.95, 0.07, 0.26]} radius={0.03} material={clay(j % 2 ? C.wood : C.woodLight)} castShadow receiveShadow />
        </group>
      ))}
    </group>
  )
}
