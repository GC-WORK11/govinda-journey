import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { DioramaProps } from '../types'
import { Scaffold, clay, C } from '../../world/kit'
import * as THREE from 'three'

export default function Diorama({ unlocked }: DioramaProps) {
  const leftGateRef = useRef<THREE.Group>(null)
  const rightGateRef = useRef<THREE.Group>(null)
  const t = useRef(unlocked ? 1 : 0)

  useFrame((_, dt) => {
    const target = unlocked ? 1 : 0
    t.current += (target - t.current) * Math.min(1, dt * 1.8)
    const angle = t.current * Math.PI / 2.2

    if (leftGateRef.current) {
      leftGateRef.current.rotation.y = angle
    }
    if (rightGateRef.current) {
      rightGateRef.current.rotation.y = -angle
    }
  })

  return (
    <group>
      {/* Stone pillars */}
      <RoundedBox
        args={[0.5, 1.8, 0.5]}
        radius={0.08}
        position={[-0.8, 0.9, -0.8]}
        material={clay(C.stone)}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.5, 1.8, 0.5]}
        radius={0.08}
        position={[0.8, 0.9, -0.8]}
        material={clay(C.stone)}
        castShadow
        receiveShadow
      />

      {/* Pillar tops */}
      <mesh position={[-0.8, 1.84, -0.8]} material={clay(C.sand)} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 8]} />
      </mesh>
      <mesh position={[0.8, 1.84, -0.8]} material={clay(C.sand)} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 8]} />
      </mesh>

      {/* Left gate */}
      <group ref={leftGateRef} position={[-0.55, 0, -0.8]}>
        <group position={[0.275, 0, 0]}>
          <RoundedBox
            args={[0.55, 1.6, 0.1]}
            radius={0.06}
            position={[0, 0.8, 0]}
            material={clay(C.wood)}
            castShadow
          />
          {/* Horizontal planks */}
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.4, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.8, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 1.2, 0]} material={clay(C.woodLight)} castShadow />
        </group>
      </group>

      {/* Right gate */}
      <group ref={rightGateRef} position={[0.55, 0, -0.8]}>
        <group position={[-0.275, 0, 0]}>
          <RoundedBox
            args={[0.55, 1.6, 0.1]}
            radius={0.06}
            position={[0, 0.8, 0]}
            material={clay(C.wood)}
            castShadow
          />
          {/* Horizontal planks */}
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.4, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.8, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 1.2, 0]} material={clay(C.woodLight)} castShadow />
        </group>
      </group>

      {/* Scattered letters on ground (before unlock) */}
      {!unlocked && (
        <>
          <RoundedBox
            args={[0.22, 0.01, 0.16]}
            radius={0.01}
            position={[-1.4, 0.01, -0.3]}
            rotation={[0, 0.3, 0]}
            material={clay(C.paper)}
            castShadow
          />
          <RoundedBox
            args={[0.22, 0.01, 0.16]}
            radius={0.01}
            position={[1.2, 0.01, 0.2]}
            rotation={[0, -0.5, 0]}
            material={clay(C.paper)}
            castShadow
          />
          <RoundedBox
            args={[0.22, 0.01, 0.16]}
            radius={0.01}
            position={[0.3, 0.01, 0.8]}
            rotation={[0, 1.2, 0]}
            material={clay(C.paper)}
            castShadow
          />
        </>
      )}

      {/* Stepping stones pond (after unlock) */}
      {unlocked && (
        <group position={[0, -0.05, 0.6]}>
          {/* Water surface */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={clay(C.water)} receiveShadow>
            <circleGeometry args={[1.6, 32]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={clay(C.sky)}>
            <circleGeometry args={[1.4, 32]} />
          </mesh>

          {/* Stepping stones */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
            <group key={i} position={[x, 0.02, Math.sin(i * 1.2) * 0.15]}>
              <mesh material={clay(C.stone)} castShadow>
                <cylinderGeometry args={[0.18, 0.2, 0.08, 16]} />
              </mesh>
              <mesh position={[0, 0.04, 0]} material={clay(C.sand)}>
                <cylinderGeometry args={[0.16, 0.16, 0.01, 16]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Scaffold */}
      <Scaffold open={unlocked} position={[0, 0, -0.8]} size={[2, 2.2, 1.2]} />
    </group>
  )
}
