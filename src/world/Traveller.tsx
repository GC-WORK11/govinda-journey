import { forwardRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { clay, C } from './kit'

/** Small clay traveller: kurta, backpack, round head. Faces +Z by default. */
export const Traveller = forwardRef<THREE.Group, {}>(function Traveller(_, ref) {
  return (
    <group ref={ref}>
      <group name="body">
        <mesh position={[0, 0.42, 0]} material={clay('#5f86a8')} castShadow><capsuleGeometry args={[0.17, 0.32, 6, 14]} /></mesh>
        <mesh position={[0, 0.86, 0]} material={clay('#e2b48f')} castShadow><sphereGeometry args={[0.17, 20, 16]} /></mesh>
        <mesh position={[0, 0.95, -0.02]} material={clay(C.ink)} castShadow scale={[1.02, 0.7, 1.02]}><sphereGeometry args={[0.165, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <RoundedBox args={[0.26, 0.3, 0.14]} radius={0.05} position={[0, 0.5, -0.2]} material={clay(C.terracotta)} castShadow />
        <mesh name="legL" position={[-0.08, 0.1, 0]} material={clay(C.ink)}><capsuleGeometry args={[0.055, 0.12, 4, 8]} /></mesh>
        <mesh name="legR" position={[0.08, 0.1, 0]} material={clay(C.ink)}><capsuleGeometry args={[0.055, 0.12, 4, 8]} /></mesh>
      </group>
    </group>
  )
})
