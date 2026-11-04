import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, clay, Scaffold, Tree, Rock } from '../../world/kit'

const POND_X = 0
const POND_Z = -0.75
const STONE: [number, number, number] = [0.55, 0, 1.85]

/** A few warm fireflies drifting low over the pond. */
function Fireflies({ on, active }: { on: boolean; active: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#eec27e', transparent: true, opacity: 0, depthWrite: false,
  }), [])
  const seeds = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    a: i * 0.9, r: 0.42 + (i % 3) * 0.33, y: 0.3 + (i % 4) * 0.12,
  })), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    mat.opacity += ((on ? 0.9 : 0) - mat.opacity) * Math.min(1, dt * 2)
    ref.current?.children.forEach((m, i) => {
      const f = seeds[i]
      const a = t * (active ? 0.24 : 0.16) + f.a
      m.position.set(POND_X + Math.cos(a) * f.r, f.y + Math.sin(t * 0.8 + f.a) * 0.07, POND_Z + Math.sin(a) * f.r * 0.85)
    })
  })
  return (
    <group ref={ref}>
      {seeds.map((_, i) => <mesh key={i} material={mat}><sphereGeometry args={[0.032, 8, 6]} /></mesh>)}
    </group>
  )
}

/** A small stacked stone lantern, quiet at the pond's edge. */
function StoneLantern(p: JSX.IntrinsicElements['group']) {
  return (
    <group {...p}>
      <mesh position={[0, 0.05, 0]} material={clay(C.stone)} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 8]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={clay(C.stone)} castShadow>
        <cylinderGeometry args={[0.05, 0.065, 0.22, 8]} />
      </mesh>
      <RoundedBox args={[0.2, 0.14, 0.2]} radius={0.025} position={[0, 0.38, 0]} material={clay(C.stoneLight)} castShadow />
      <mesh position={[0, 0.38, 0]} material={clay('#f0dcae')}>
        <boxGeometry args={[0.09, 0.08, 0.205]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]} material={clay(C.stone)} castShadow>
        <coneGeometry args={[0.17, 0.12, 4]} />
      </mesh>
      <mesh position={[0, 0.59, 0]} material={clay(C.stone)} castShadow>
        <sphereGeometry args={[0.045, 8, 6]} />
      </mesh>
    </group>
  )
}

export default function Diorama({ unlocked, active }: DioramaProps) {
  return (
    <group>
      {/* reeds on the obstacle pond's east shore */}
      {[[1.32, -0.78, -0.12], [1.46, -0.6, 0.16]].map(([x, z, r], i) => (
        <mesh key={i} position={[POND_X + x, 0.18, POND_Z + z]} rotation={[0, 0, r]} material={clay(C.moss)} castShadow>
          <cylinderGeometry args={[0.011, 0.018, 0.34, 5]} />
        </mesh>
      ))}

      {/* the stone lantern watching over the water */}
      <StoneLantern position={[-1.82, 0, -1.32]} rotation={[0, 0.5, 0]} />

      {/* flat pebbles along the back bank */}
      {[[-0.62, -2.32, 0.5], [0.18, -2.44, 2.1], [0.92, -2.2, 1.2]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.022, z]} rotation={[0, r, 0]} scale={[1, 0.55, 0.78]} material={clay(i % 2 ? C.stone : '#d6cab4')} castShadow receiveShadow>
          <sphereGeometry args={[0.11, 10, 8]} />
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

      <Tree position={[-1.5, 0, 1.35]} h={0.95} />
      <Rock position={[1.55, 0.06, -1.35]} s={0.2} />
      <Rock position={[-1.5, 0.04, 0.55]} s={0.13} color={C.earthDark} />

      <Fireflies on={unlocked} active={active} />

      <Scaffold open={unlocked} position={STONE} size={[1.05, 0.5, 0.95]} />
    </group>
  )
}
