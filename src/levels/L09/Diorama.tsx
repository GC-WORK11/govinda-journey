import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, clay, Scaffold, Rock, ClayPot, Bush } from '../../world/kit'

const SCHOOL_POS: [number, number, number] = [0.2, 0, -0.7]

/** Small lamp at the gate that glows warmly after unlock (dusk feeling). */
function GateLamp({ on }: { on: boolean }) {
  const light = useRef<THREE.PointLight>(null)
  useFrame((_, dt) => {
    if (light.current) {
      const target = on ? 0.85 : 0
      light.current.intensity += (target - light.current.intensity) * Math.min(1, dt * 1.8)
    }
  })
  return (
    <group position={[1.6, 0.62, 0.9]}>
      {/* Lamp post */}
      <mesh position={[0, 0.31, 0]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.62, 6]} />
      </mesh>
      {/* Lamp housing */}
      <mesh position={[0, 0.66, 0]} material={clay(C.terracotta)} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.12, 8]} />
      </mesh>
      {/* Warm glow */}
      <pointLight ref={light} color="#f2d09a" intensity={0} distance={2.5} decay={2} position={[0, 0.66, 0]} />
      <mesh position={[0, 0.66, 0]} material={new THREE.MeshBasicMaterial({ color: '#f2d09a', transparent: true, opacity: on ? 0.7 : 0 })}>
        <sphereGeometry args={[0.06, 10, 8]} />
      </mesh>
    </group>
  )
}

/** The school gate that slides open after unlock. */
function SchoolGate({ open }: { open: boolean }) {
  const leftRef = useRef<THREE.Group>(null)
  const rightRef = useRef<THREE.Group>(null)
  
  useFrame((_, dt) => {
    const target = open ? 1 : 0
    if (leftRef.current) {
      const current = leftRef.current.position.x
      const newPos = current + ((-0.3 - current) * target + (0 - current) * (1 - target)) * Math.min(1, dt * 2.5)
      leftRef.current.position.x = newPos
    }
    if (rightRef.current) {
      const current = rightRef.current.position.x
      const newPos = current + ((0.3 - current) * target + (0 - current) * (1 - target)) * Math.min(1, dt * 2.5)
      rightRef.current.position.x = newPos
    }
  })

  return (
    <group position={[1.6, 0, 0.9]}>
      {/* Gate posts */}
      <mesh position={[-0.35, 0.4, 0]} material={clay(C.brick)} castShadow>
        <boxGeometry args={[0.12, 0.8, 0.12]} />
      </mesh>
      <mesh position={[0.35, 0.4, 0]} material={clay(C.brick)} castShadow>
        <boxGeometry args={[0.12, 0.8, 0.12]} />
      </mesh>
      {/* Left gate door */}
      <group ref={leftRef} position={[0, 0, 0]}>
        <RoundedBox args={[0.32, 0.65, 0.04]} radius={0.02} position={[-0.16, 0.33, 0]} material={clay(C.woodLight)} castShadow />
      </group>
      {/* Right gate door */}
      <group ref={rightRef} position={[0, 0, 0]}>
        <RoundedBox args={[0.32, 0.65, 0.04]} radius={0.02} position={[0.16, 0.33, 0]} material={clay(C.woodLight)} castShadow />
      </group>
    </group>
  )
}

export default function Diorama({ unlocked, active }: DioramaProps) {
  // Blackboard on the wall
  const blackboard = useMemo(() => (
    <group position={[0.65, 0.55, -0.9]}>
      <RoundedBox args={[0.35, 0.28, 0.03]} radius={0.02} material={clay(C.wood)} castShadow />
      <mesh position={[0, 0, 0.02]} material={clay('#2a3e2e')} castShadow>
        <planeGeometry args={[0.3, 0.23]} />
      </mesh>
    </group>
  ), [])

  return (
    <group>
      {/* Main school building: cream + terracotta */}
      <group position={SCHOOL_POS}>
        {/* Main structure */}
        <RoundedBox
          args={[1.5, 0.9, 1.2]}
          radius={0.06}
          smoothness={3}
          position={[0, 0.45, 0]}
          material={clay(C.cream)}
          castShadow
          receiveShadow
        />
        
        {/* Terracotta roof */}
        <mesh position={[0, 0.98, 0]} rotation={[0, Math.PI / 4, 0]} material={clay(C.terracotta)} castShadow>
          <coneGeometry args={[1.15, 0.35, 4]} />
        </mesh>

        {/* Door */}
        <RoundedBox
          args={[0.28, 0.52, 0.05]}
          radius={0.03}
          position={[0, 0.28, 0.61]}
          material={clay(C.wood)}
          castShadow
        />

        {/* Windows */}
        <RoundedBox
          args={[0.22, 0.22, 0.04]}
          radius={0.03}
          position={[-0.45, 0.55, 0.61]}
          material={clay(C.water)}
          castShadow
        />
        <RoundedBox
          args={[0.22, 0.22, 0.04]}
          radius={0.03}
          position={[0.45, 0.55, 0.61]}
          material={clay(C.water)}
          castShadow
        />

        {blackboard}
      </group>

      {/* Courtyard floor (slightly lighter patch) */}
      <mesh position={[0.8, 0.005, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.1, 32]} />
        <meshStandardMaterial color={C.sand} roughness={0.95} metalness={0} />
      </mesh>

      {/* Flag pole (no flag symbol) */}
      <group position={[1.2, 0, -0.3]}>
        <mesh position={[0, 0.5, 0]} material={clay(C.stone)} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 1, 8]} />
        </mesh>
        <mesh position={[0, 1.02, 0]} material={clay(C.stone)} castShadow>
          <sphereGeometry args={[0.04, 10, 8]} />
        </mesh>
      </group>

      {/* Small rocks around */}
      <Rock position={[-1.4, 0.04, 0.6]} s={0.15} />
      <Rock position={[1.7, 0.05, -1.2]} s={0.18} color={C.earthDark} />

      {/* Gate and lamp */}
      <SchoolGate open={unlocked} />
      <GateLamp on={unlocked} />

      {/* pots flanking the gate, shrubs at the school corners */}
      <ClayPot position={[1.12, 0, 0.58]} s={0.9} />
      <ClayPot position={[2.08, 0, 0.58]} s={0.85} />
      <Bush position={[-0.72, 0, -0.1]} s={0.95} />
      <Bush position={[1.02, 0, 0.02]} s={0.75} color={C.leaf} />

      {/* a school satchel waiting by the door */}
      <group position={[0.58, 0, -0.06]} rotation={[0, -0.35, 0]}>
        <RoundedBox args={[0.15, 0.13, 0.07]} radius={0.025} position={[0, 0.07, 0]} material={clay(C.terracotta)} castShadow />
        <RoundedBox args={[0.15, 0.05, 0.075]} radius={0.02} position={[0, 0.115, 0]} material={clay(C.brick)} castShadow />
        <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.wood)}>
          <torusGeometry args={[0.045, 0.008, 6, 12, Math.PI]} />
        </mesh>
      </group>

      {/* Permanent scaffolding in one corner (level is still being built) */}
      <group position={[-0.55, 0, -1.1]}>
        {/* Scaffolding poles */}
        <mesh position={[0, 0.45, 0]} material={clay(C.woodLight)} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
        </mesh>
        <mesh position={[0.3, 0.45, 0]} material={clay(C.woodLight)} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
        </mesh>
        <mesh position={[0.15, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.woodLight)} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.35, 6]} />
        </mesh>
        {/* Cloth draped */}
        <mesh position={[0.15, 0.4, 0]} material={clay(C.sand)} castShadow>
          <boxGeometry args={[0.32, 0.5, 0.08]} />
        </mesh>
      </group>

      {/* Main building scaffold that drops on unlock */}
      <Scaffold open={unlocked} position={SCHOOL_POS} size={[1.7, 1.4, 1.4]} />
    </group>
  )
}
