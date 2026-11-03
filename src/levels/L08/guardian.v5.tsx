/**
 * The stone guardian of L08 — a small cairn-figure that blocks the exit.
 * Local origin at its feet, facing +z (toward the path).
 */
import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { C, M, ghostMat } from './v5kit.v5'
import { useBlocker } from '../../v5/core'

const S1 = '#b8ac9a', S2 = '#c9bfb0', S3 = '#d6ccbd'

export function Guardian({ awake }: { awake: boolean }) {
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const blocker = useRef<THREE.Mesh>(null)
  const eyeL = useRef<THREE.MeshStandardMaterial>(null)
  const eyeR = useRef<THREE.MeshStandardMaterial>(null)
  useBlocker(blocker)

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 0.85) * 0.008
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.5) * 0.035
      // it tips its head toward the traveller when awake
      const target = awake ? -0.12 : 0.1
      head.current.rotation.x += (target - head.current.rotation.x) * Math.min(1, dt * 1.6)
    }
    for (const m of [eyeL.current, eyeR.current]) {
      if (m) m.emissiveIntensity += ((awake ? 1.5 : 0.06) - m.emissiveIntensity) * Math.min(1, dt * 2.2)
    }
  })

  return (
    <group ref={body}>
      {/* feet */}
      <RoundedBox args={[0.3, 0.16, 0.42]} radius={0.06} position={[-0.2, 0.08, 0.05]} material={M(S1)} castShadow />
      <RoundedBox args={[0.3, 0.16, 0.42]} radius={0.06} position={[0.2, 0.08, 0.05]} material={M(S1)} castShadow />
      {/* stacked body stones, slightly offset like a cairn */}
      <RoundedBox args={[0.82, 0.38, 0.56]} radius={0.09} position={[0, 0.36, 0]} rotation={[0, 0.07, 0]} material={M(S1)} castShadow receiveShadow />
      <RoundedBox args={[0.68, 0.4, 0.5]} radius={0.09} position={[-0.03, 0.74, 0]} rotation={[0, -0.09, 0]} material={M(S2)} castShadow />
      <RoundedBox args={[0.58, 0.4, 0.46]} radius={0.08} position={[0.02, 1.12, 0]} rotation={[0, 0.05, 0]} material={M(S2)} castShadow />
      {/* shoulders */}
      <RoundedBox args={[0.84, 0.2, 0.42]} radius={0.07} position={[0, 1.4, 0]} material={M(S3)} castShadow />
      {/* arms: rounded stones resting against the sides */}
      <RoundedBox args={[0.18, 0.62, 0.22]} radius={0.08} position={[-0.5, 1.02, 0.02]} rotation={[0, 0, 0.1]} material={M(S1)} castShadow />
      <RoundedBox args={[0.18, 0.62, 0.22]} radius={0.08} position={[0.5, 1.02, 0.02]} rotation={[0, 0, -0.1]} material={M(S1)} castShadow />
      {/* head */}
      <group ref={head} position={[0, 1.72, 0]}>
        <RoundedBox args={[0.46, 0.4, 0.4]} radius={0.1} material={M(S3)} castShadow />
        {/* brow */}
        <RoundedBox args={[0.4, 0.09, 0.1]} radius={0.03} position={[0, 0.09, 0.17]} material={M(S1)} castShadow />
        {/* eyes — dark insets that warm when it wakes */}
        <mesh position={[-0.11, -0.02, 0.19]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial ref={eyeL} color="#4a4139" emissive="#e8a35c" emissiveIntensity={0.06} roughness={0.7} />
        </mesh>
        <mesh position={[0.11, -0.02, 0.19]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial ref={eyeR} color="#4a4139" emissive="#e8a35c" emissiveIntensity={0.06} roughness={0.7} />
        </mesh>
        {/* a small moss cap */}
        <mesh position={[-0.12, 0.2, -0.02]} scale={[1, 0.45, 1]} material={M(C.moss)} castShadow>
          <sphereGeometry args={[0.12, 10, 8]} />
        </mesh>
      </group>
      {/* moss patches on the shoulder */}
      <mesh position={[0.3, 1.52, 0.05]} scale={[1, 0.4, 1]} material={M(C.moss)}>
        <sphereGeometry args={[0.09, 8, 7]} />
      </mesh>
      {/* collision volume (invisible to the eye, solid to the traveller) */}
      <mesh ref={blocker} position={[0, 0.95, 0]} material={ghostMat()}>
        <cylinderGeometry args={[0.58, 0.62, 1.9, 10]} />
      </mesh>
    </group>
  )
}
