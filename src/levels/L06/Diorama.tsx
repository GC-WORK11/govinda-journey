import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { DioramaProps } from '../types'
import { Scaffold, clay, C } from '../../world/kit'
import * as THREE from 'three'

export default function Diorama({ unlocked, active }: DioramaProps) {
  const laptopScreenRef = useRef<THREE.Mesh>(null)
  const signalRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    
    // Laptop screen flicker when unlocked and active
    if (laptopScreenRef.current && unlocked && active) {
      const flicker = 0.85 + Math.sin(t * 8) * 0.08 + Math.sin(t * 13.7) * 0.07
      const mat = laptopScreenRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = flicker
    }

    // Signal line pulse
    if (signalRef.current && unlocked) {
      signalRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const offset = i * 0.3
          const pulse = 0.5 + Math.sin(t * 2 + offset) * 0.5
          const mat = child.material as THREE.MeshBasicMaterial
          mat.opacity = pulse * 0.6
        }
      })
    }
  })

  return (
    <group>
      {/* House with window */}
      <group position={[0.8, 0, -1.2]}>
        {/* Main house structure */}
        <RoundedBox
          args={[1.3, 1, 1.1]}
          radius={0.08}
          smoothness={3}
          position={[0, 0.5, 0]}
          material={clay(C.cream)}
          castShadow
          receiveShadow
        />
        {/* Roof */}
        <mesh position={[0, 1.28, 0]} rotation={[0, Math.PI / 4, 0]} material={clay(C.terracotta)} castShadow>
          <coneGeometry args={[1.05, 0.62, 4]} />
        </mesh>
        {/* Door */}
        <RoundedBox
          args={[0.3, 0.5, 0.06]}
          radius={0.04}
          position={[0.4, 0.27, 0.56]}
          material={clay(C.wood)}
        />
        
        {/* Open window showing desk inside */}
        <RoundedBox
          args={[0.4, 0.35, 0.05]}
          radius={0.04}
          position={[-0.35, 0.62, 0.56]}
          material={clay(C.water)}
        />

        {/* Desk visible through window */}
        <group position={[-0.35, 0.15, 0.35]}>
          {/* Desk surface */}
          <RoundedBox
            args={[0.32, 0.04, 0.2]}
            radius={0.01}
            position={[0, 0.3, 0]}
            material={clay(C.woodLight)}
            castShadow
          />
          {/* Desk legs */}
          <mesh position={[-0.12, 0.15, 0.06]} material={clay(C.wood)}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
          </mesh>
          <mesh position={[0.12, 0.15, 0.06]} material={clay(C.wood)}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
          </mesh>

          {/* Laptop on desk */}
          <group position={[0, 0.35, 0]}>
            {/* Laptop base */}
            <RoundedBox
              args={[0.18, 0.01, 0.14]}
              radius={0.01}
              position={[0, 0, 0]}
              material={clay(C.stone)}
              castShadow
            />
            {/* Laptop screen */}
            <RoundedBox
              args={[0.18, 0.12, 0.01]}
              radius={0.01}
              position={[0, 0.06, -0.06]}
              rotation={[-0.2, 0, 0]}
              material={clay(C.stoneLight)}
              castShadow
            />
            {/* Screen display */}
            <mesh
              ref={laptopScreenRef}
              position={[0, 0.06, -0.055]}
              rotation={[-0.2, 0, 0]}
            >
              <planeGeometry args={[0.15, 0.1]} />
              <meshBasicMaterial
                color={unlocked ? C.leaf : C.earth}
                transparent
                opacity={unlocked ? 0.9 : 0.7}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* Phone tower on island edge */}
      <group position={[-1.8, 0, 1.6]}>
        {/* Tower base platform */}
        <mesh position={[0, 0.06, 0]} material={clay(C.stone)} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.28, 0.12, 8]} />
        </mesh>
        
        {/* Tower pole */}
        <mesh position={[0, 0.5, 0]} material={clay(C.stoneLight)} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.88, 8]} />
        </mesh>

        {/* Phone icon/shape on top */}
        <RoundedBox
          args={[0.15, 0.24, 0.05]}
          radius={0.03}
          position={[0, 1.0, 0]}
          material={clay(C.terracotta)}
          castShadow
        />
        
        {/* Phone screen */}
        <mesh position={[0, 1.0, 0.026]}>
          <planeGeometry args={[0.11, 0.18]} />
          <meshBasicMaterial color={unlocked ? C.leaf : C.sand} />
        </mesh>

        {/* Antenna elements */}
        <mesh position={[-0.08, 0.7, 0]} material={clay(C.woodLight)}>
          <cylinderGeometry args={[0.01, 0.01, 0.15, 6]} />
        </mesh>
        <mesh position={[0.08, 0.7, 0]} material={clay(C.woodLight)}>
          <cylinderGeometry args={[0.01, 0.01, 0.15, 6]} />
        </mesh>

        {/* Small bench/platform */}
        <RoundedBox
          args={[0.35, 0.08, 0.2]}
          radius={0.02}
          position={[0, 0.16, 0.22]}
          material={clay(C.wood)}
          castShadow
        />
      </group>

      {/* Dotted signal line between phone tower and house (when unlocked) */}
      {unlocked && (
        <group ref={signalRef}>
          {Array.from({ length: 12 }).map((_, i) => {
            const t = i / 11
            // Arc from phone tower to house window
            const start = new THREE.Vector3(-1.8, 0.9, 1.6)
            const end = new THREE.Vector3(0.45, 0.62, -0.64)
            const mid = new THREE.Vector3(
              (start.x + end.x) / 2,
              Math.max(start.y, end.y) + 0.8,
              (start.z + end.z) / 2
            )
            
            // Quadratic bezier
            const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * mid.x + t * t * end.x
            const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * mid.y + t * t * end.y
            const z = (1 - t) * (1 - t) * start.z + 2 * (1 - t) * t * mid.z + t * t * end.z

            return (
              <mesh key={i} position={[x, y, z]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshBasicMaterial
                  color={C.water}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            )
          })}
        </group>
      )}

      {/* Scaffold wrapper */}
      <Scaffold open={unlocked} position={[0.8, 0, -1.2]} size={[1.6, 1.8, 1.6]} />
    </group>
  )
}
