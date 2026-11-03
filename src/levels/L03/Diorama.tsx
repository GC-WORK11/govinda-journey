import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { C, clay, Scaffold } from '../../world/kit'
import type { DioramaProps } from '../types'

const STALLS = [
  { p: [-1.5, 0, -0.55] as [number, number, number], r: 0.42, accent: '#d9825b', body: C.cream },
  { p: [-0.52, 0, -0.95] as [number, number, number], r: 0.14, accent: '#8fb36b', body: C.paper },
  { p: [0.55, 0, -0.95] as [number, number, number], r: -0.14, accent: '#8fc1c9', body: C.cream },
  { p: [1.55, 0, -0.55] as [number, number, number], r: -0.42, accent: '#b5654a', body: C.paper },
]

const postGeo = new THREE.CylinderGeometry(0.03, 0.035, 1.05, 6)
const scallopGeo = new THREE.SphereGeometry(0.065, 10, 8)
const cobbleGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.05, 12)
const planeGeo = new THREE.ConeGeometry(0.075, 0.26, 4)

function Stall({ p, r, accent, body, live, i }: { p: [number, number, number]; r: number; accent: string; body: string; live: boolean; i: number }) {
  const awn = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!awn.current) return
    const target = 0.17 + (live ? Math.sin(s.clock.elapsedTime * 2.6 + i * 1.7) * 0.05 : 0)
    awn.current.rotation.x += (target - awn.current.rotation.x) * 0.15
  })
  return (
    <group position={p} rotation={[0, r, 0]}>
      <RoundedBox args={[0.8, 0.42, 0.5]} radius={0.05} position={[0, 0.21, 0]} material={clay(body)} castShadow receiveShadow />
      <RoundedBox args={[0.88, 0.06, 0.58]} radius={0.03} position={[0, 0.45, 0]} material={clay(C.wood)} castShadow />
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} geometry={postGeo} position={[x, 0.55, -0.16]} material={clay(C.woodLight)} castShadow />
      ))}
      <group ref={awn} position={[0, 1.06, 0.02]}>
        <RoundedBox args={[0.95, 0.045, 0.56]} radius={0.02} position={[0, 0, 0.05]} material={clay(accent)} castShadow />
        {[-0.34, 0, 0.34].map((x, j) => (
          <mesh key={j} geometry={scallopGeo} position={[x, -0.04, 0.3]} scale={[1, 0.6, 1]} material={clay(j === 1 ? body : C.paper)} castShadow />
        ))}
        <RoundedBox args={[0.44, 0.15, 0.035]} radius={0.02} position={[0, -0.22, 0.32]} material={clay(C.paper)} castShadow />
        <RoundedBox args={[0.44, 0.05, 0.037]} radius={0.015} position={[0, -0.185, 0.32]} material={clay(accent)} />
      </group>
      <RoundedBox args={[0.16, 0.12, 0.14]} radius={0.03} position={[-0.2, 0.54, 0.05]} material={clay(accent)} castShadow />
    </group>
  )
}

function PaperPlane({ live }: { live: boolean }) {
  const g = useRef<THREE.Group>(null)
  const k = useRef(0)
  useFrame((s, dt) => {
    if (!g.current) return
    k.current += ((live ? 1 : 0) - k.current) * Math.min(1, dt * 1.6)
    const t = s.clock.elapsedTime, a = t * 0.5
    g.current.scale.setScalar(Math.max(0.001, k.current))
    g.current.position.set(Math.cos(a) * 1.7, 1.45 + Math.sin(t * 1.8) * 0.07, -0.65 + Math.sin(a) * 1.15)
    g.current.rotation.y = -a
    g.current.rotation.z = 0.15 + Math.sin(t * 2.2) * 0.06
  })
  return (
    <group ref={g} position={[1.7, 1.45, -0.65]}>
      <mesh geometry={planeGeo} rotation={[Math.PI / 2, 0, 0]} scale={[1.9, 1, 0.55]} material={clay(C.paper)} castShadow />
    </group>
  )
}

export default function Diorama({ unlocked }: DioramaProps) {
  return (
    <group>
      {STALLS.map((s, i) => <Stall key={i} {...s} live={unlocked} i={i} />)}
      {[-1.3, -0.65, 0, 0.65, 1.3].map((x, i) => (
        <mesh key={i} geometry={cobbleGeo} position={[x, 0.025, 0.32 + (i % 2) * 0.12]} rotation={[0, i * 0.7, 0]} material={clay(C.stone)} receiveShadow />
      ))}
      <RoundedBox args={[0.2, 0.2, 0.2]} radius={0.04} position={[-2.05, 0.1, 0.15]} material={clay(C.wood)} castShadow />
      <RoundedBox args={[0.15, 0.15, 0.15]} radius={0.04} position={[-2.0, 0.28, 0.1]} rotation={[0, 0.5, 0]} material={clay(C.woodLight)} castShadow />
      <PaperPlane live={unlocked} />
      <Scaffold open={unlocked} position={[0, 0, -0.68]} size={[4.5, 1.95, 1.75]} />
    </group>
  )
}
