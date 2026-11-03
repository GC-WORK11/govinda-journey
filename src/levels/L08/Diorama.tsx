import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, Scaffold, clay } from '../../world/kit'

const HAND_C = '#d9825b'

// x position, base height, radius, total length, sideways fan
const FINGERS = [
  { x: -0.26, y: 1.54, w: 0.085, len: 0.6, spread: -0.14 },
  { x: -0.09, y: 1.58, w: 0.09, len: 0.7, spread: -0.04 },
  { x: 0.09, y: 1.57, w: 0.088, len: 0.64, spread: 0.05 },
  { x: 0.26, y: 1.48, w: 0.072, len: 0.5, spread: 0.17 },
]

export default function Diorama({ unlocked, active }: DioramaProps) {
  const joints = useRef<THREE.Group[]>([])
  const curl = useRef(0)
  const led = useRef<THREE.Mesh>(null)

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const speed = active ? 0.85 : 0.5
    const target = unlocked ? 0.6 - 0.6 * Math.sin(t * speed) : 0
    curl.current += (target - curl.current) * Math.min(1, dt * 1.6)
    for (const j of joints.current) j.rotation.x = j.userData.b + curl.current * j.userData.k
    if (led.current) led.current.scale.setScalar(unlocked ? 1 + 0.35 * Math.sin(t * 4.5) : 1)
  })
  const reg = (k: number, b = 0) => (g: THREE.Group | null) => {
    if (g && !joints.current.includes(g)) { g.userData.k = k; g.userData.b = b; joints.current.push(g) }
  }

  return (
    <group>
      {/* wooden deck under the little open-air studio */}
      <RoundedBox args={[2.2, 0.07, 2.3]} radius={0.03} position={[0.65, 0.03, -0.2]}
        material={clay(C.woodLight)} castShadow receiveShadow />

      {/* clay hand sculpture on a stone plinth */}
      <group position={[0.55, 0, -0.95]} rotation={[0, -0.2, 0]}>
        <mesh position={[0, 0.28, 0]} material={clay(C.stone)} castShadow receiveShadow>
          <cylinderGeometry args={[0.52, 0.6, 0.56, 12]} />
        </mesh>
        <mesh position={[0, 0.86, 0]} material={clay(HAND_C)} castShadow>
          <capsuleGeometry args={[0.2, 0.34, 6, 12]} />
        </mesh>
        <mesh position={[0, 1.16, 0]} scale={[0.44, 0.52, 0.3]} material={clay(HAND_C)} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
        </mesh>
        {FINGERS.map((f, i) => (
          <group key={i} position={[f.x, f.y, 0.03]} rotation={[0, 0, f.spread]}>
            <group ref={reg(1)}>
              <mesh position={[0, f.len * 0.28, 0]} material={clay(HAND_C)} castShadow>
                <capsuleGeometry args={[f.w, f.len * 0.55, 6, 10]} />
              </mesh>
              <group position={[0, f.len * 0.55, 0]} ref={reg(1.45)}>
                <mesh position={[0, f.len * 0.25, 0]} material={clay(HAND_C)} castShadow>
                  <capsuleGeometry args={[f.w * 0.85, f.len * 0.5, 6, 10]} />
                </mesh>
              </group>
            </group>
          </group>
        ))}
        <group position={[-0.37, 1.02, 0.06]} rotation={[0.1, 0, 0.95]}>
          <group ref={reg(0.55, 0.2)}>
            <mesh position={[0, 0.18, 0]} material={clay(HAND_C)} castShadow>
              <capsuleGeometry args={[0.1, 0.34, 6, 10]} />
            </mesh>
            <group position={[0, 0.38, 0]} ref={reg(0.9, 0.15)}>
              <mesh position={[0, 0.15, 0]} material={clay(HAND_C)} castShadow>
                <capsuleGeometry args={[0.085, 0.26, 6, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* phone on a wooden tripod, filming the sculpture */}
      <group position={[0.1, 0, 0.75]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, i * 2.1, 0]}>
            <mesh position={[0.2, 0.46, 0]} rotation={[0, 0, 0.4]} material={clay(C.wood)} castShadow>
              <cylinderGeometry args={[0.026, 0.034, 1.0, 6]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.98, 0]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.45, 6]} />
        </mesh>
        <group position={[0, 1.25, 0]} rotation={[0.14, -0.26, 0]}>
          <RoundedBox args={[0.36, 0.5, 0.05]} radius={0.03} material={clay('#3b3330')} castShadow />
          <mesh position={[0, 0, -0.028]}>
            <boxGeometry args={[0.3, 0.44, 0.012]} />
            <meshStandardMaterial color="#241f1c" roughness={0.55} />
          </mesh>
          <mesh ref={led} position={[-0.11, 0.18, -0.038]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#d9825b" emissive="#d9825b" emissiveIntensity={0.9} />
          </mesh>
        </group>
      </group>

      {/* a stool with clay waiting to be shaped */}
      <group position={[1.5, 0, 0.5]}>
        <RoundedBox args={[0.5, 0.34, 0.5]} radius={0.04} position={[0, 0.2, 0]} material={clay(C.wood)} castShadow receiveShadow />
        <mesh position={[-0.1, 0.44, 0.05]} scale={[1, 0.8, 1]} material={clay(HAND_C)} castShadow>
          <sphereGeometry args={[0.14, 12, 10]} />
        </mesh>
        <mesh position={[0.12, 0.42, -0.08]} scale={[1, 0.75, 1]} material={clay(C.earth)} castShadow>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>
      </group>

      <Scaffold open={unlocked} position={[0.55, 0, -0.95]} size={[1.7, 2.7, 1.7]} />
    </group>
  )
}
