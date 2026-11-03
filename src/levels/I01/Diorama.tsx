import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, clay, Scaffold, Tree, Rock } from '../../world/kit'

const POND_X = 0
const POND_Z = -0.75
const POND_R = 1.45
const STONE: [number, number, number] = [1.4, 0, 0.85]

const PADS: [number, number, number, number][] = [
  [-0.55, -1.15, 0.26, 0.4],
  [0.45, -0.72, 0.2, 2.6],
  [0.1, -1.35, 0.17, 4.4],
  [0.85, -0.4, 0.15, 5.6],
]

/** Slow rings spreading over the water once the island is open. */
function Ripples({ on }: { on: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const geo = useMemo(() => new THREE.RingGeometry(0.82, 0.885, 48), [])
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({
    color: C.paper, transparent: true, opacity: 0, depthWrite: false,
  })), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current?.children.forEach((child, i) => {
      const k = (t * 0.14 + i / 3) % 1
      child.scale.setScalar(0.36 + k * 0.94)
      mats[i].opacity = on ? 0.3 * (1 - k) : 0
    })
  })
  return (
    <group ref={ref} position={[POND_X, 0.09, POND_Z]} rotation={[-Math.PI / 2, 0, 0]}>
      {mats.map((m, i) => <mesh key={i} geometry={geo} material={m} />)}
    </group>
  )
}

/** A few warm fireflies drifting low over the pond. */
function Fireflies({ on, active }: { on: boolean; active: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f2d09a', transparent: true, opacity: 0, depthWrite: false,
  }), [])
  const seeds = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    a: i * 0.9, r: 0.42 + (i % 3) * 0.33, y: 0.3 + (i % 4) * 0.12,
  })), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    mat.opacity += ((on ? 0.82 : 0) - mat.opacity) * Math.min(1, dt * 2)
    ref.current?.children.forEach((m, i) => {
      const f = seeds[i]
      const a = t * (active ? 0.24 : 0.16) + f.a
      m.position.set(POND_X + Math.cos(a) * f.r, f.y + Math.sin(t * 0.8 + f.a) * 0.07, POND_Z + Math.sin(a) * f.r * 0.85)
    })
  })
  return (
    <group ref={ref}>
      {seeds.map((_, i) => <mesh key={i} material={mat}><sphereGeometry args={[0.027, 8, 6]} /></mesh>)}
    </group>
  )
}

export default function Diorama({ unlocked, active }: DioramaProps) {
  const padGeo = useMemo(() => new THREE.CircleGeometry(1, 24, 0.5, 5.55), [])
  return (
    <group>
      {/* pond bank and water */}
      <mesh position={[POND_X, 0.018, POND_Z]} material={clay(C.sand)} receiveShadow>
        <cylinderGeometry args={[POND_R + 0.17, POND_R + 0.21, 0.05, 44]} />
      </mesh>
      <mesh position={[POND_X, 0.045, POND_Z]} material={clay(C.water)} receiveShadow>
        <cylinderGeometry args={[POND_R, POND_R + 0.04, 0.08, 44]} />
      </mesh>

      {/* lily pads, one with a small flower */}
      {PADS.map(([x, z, r, rot], i) => (
        <group key={i} position={[POND_X + x, 0.094, POND_Z + z]} rotation={[-Math.PI / 2, 0, rot]}>
          <mesh geometry={padGeo} scale={[r, r, 1]} material={clay(i % 2 ? C.leaf : C.leafDark)} castShadow />
        </group>
      ))}
      <mesh position={[POND_X - 0.55, 0.13, POND_Z - 1.15]} material={clay(C.paper)} castShadow>
        <sphereGeometry args={[0.045, 10, 8]} />
      </mesh>

      {/* reeds at the far edge */}
      {[[-1.34, -1.5, 0.1], [-1.22, -1.62, -0.14], [-1.44, -1.42, 0.24]].map(([x, z, r], i) => (
        <mesh key={i} position={[POND_X + x, 0.2, POND_Z + z]} rotation={[0, 0, r]} material={clay(C.leafDark)} castShadow>
          <cylinderGeometry args={[0.012, 0.02, 0.4, 5]} />
        </mesh>
      ))}

      {/* flat meditation stone with a folded cloth */}
      <group position={STONE}>
        <mesh position={[0, 0.03, 0]} scale={[1, 1, 0.82]} material={clay(C.stone)} castShadow receiveShadow>
          <cylinderGeometry args={[0.46, 0.5, 0.14, 28]} />
        </mesh>
        <mesh position={[0, 0.135, 0]} scale={[1, 1, 0.82]} material={clay(C.cream)} castShadow>
          <cylinderGeometry args={[0.41, 0.45, 0.05, 28]} />
        </mesh>
        <RoundedBox args={[0.48, 0.06, 0.3]} radius={0.028} position={[0, 0.18, 0]} material={clay(C.terracotta)} castShadow />
      </group>

      <Tree position={[-1.85, 0, -0.5]} h={0.95} />
      <Rock position={[1.55, 0.06, -1.35]} s={0.2} />
      <Rock position={[-1.5, 0.04, 0.55]} s={0.13} color={C.earthDark} />

      <Ripples on={unlocked} />
      <Fireflies on={unlocked} active={active} />

      <Scaffold open={unlocked} position={STONE} size={[1.1, 0.85, 0.9]} />
    </group>
  )
}
