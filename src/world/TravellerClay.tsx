import { forwardRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { clay, C, blobMat } from './kit'

/**
 * Small round clay traveller: cream kurta, terracotta backpack, dark hair.
 * Faces +Z. `body` group bobs/breathes; legL/legR pivot at the hip, armL/armR at the shoulder.
 */
export const Traveller = forwardRef<THREE.Group, {}>(function Traveller(_, ref) {
  return (
    <group ref={ref}>
      <group name="body">
        {/* kurta: flared hem + round torso */}
        <mesh position={[0, 0.4, 0]} material={clay(C.cream)} castShadow><cylinderGeometry args={[0.16, 0.24, 0.34, 14]} /></mesh>
        <mesh position={[0, 0.58, 0]} material={clay(C.cream)} castShadow><capsuleGeometry args={[0.165, 0.14, 6, 14]} /></mesh>
        {/* collar */}
        <mesh position={[0, 0.73, 0]} material={clay('#5f86a8')}><cylinderGeometry args={[0.075, 0.09, 0.05, 10]} /></mesh>
        {/* arms (pivot at shoulder) */}
        <group name="armL" position={[-0.2, 0.66, 0]}>
          <mesh position={[0, -0.1, 0]} material={clay('#5f86a8')} castShadow><capsuleGeometry args={[0.05, 0.13, 4, 8]} /></mesh>
          <mesh position={[0, -0.2, 0]} material={clay('#e2b48f')}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
        </group>
        <group name="armR" position={[0.2, 0.66, 0]}>
          <mesh position={[0, -0.1, 0]} material={clay('#5f86a8')} castShadow><capsuleGeometry args={[0.05, 0.13, 4, 8]} /></mesh>
          <mesh position={[0, -0.2, 0]} material={clay('#e2b48f')}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
        </group>
        {/* head + hair */}
        <group name="head" position={[0, 0.92, 0]}>
          <mesh material={clay('#e2b48f')} castShadow><sphereGeometry args={[0.18, 20, 16]} /></mesh>
          <mesh position={[0, 0.045, -0.02]} material={clay('#3a302a')} castShadow scale={[1.04, 0.78, 1.04]}><sphereGeometry args={[0.175, 20, 14]} /></mesh>
          <mesh position={[0, 0.06, -0.16]} material={clay('#3a302a')}><sphereGeometry args={[0.055, 10, 8]} /></mesh>
        </group>
        {/* backpack + bedroll */}
        <RoundedBox args={[0.3, 0.34, 0.15]} radius={0.06} position={[0, 0.56, -0.22]} material={clay(C.terracotta)} castShadow />
        <mesh position={[0, 0.77, -0.22]} rotation={[0, 0, Math.PI / 2]} material={clay(C.sand)} castShadow><cylinderGeometry args={[0.06, 0.06, 0.28, 10]} /></mesh>
        {/* legs (pivot at hip) */}
        <group name="legL" position={[-0.085, 0.3, 0]}>
          <mesh position={[0, -0.13, 0]} material={clay('#4a3b34')} castShadow><capsuleGeometry args={[0.055, 0.14, 4, 8]} /></mesh>
        </group>
        <group name="legR" position={[0.085, 0.3, 0]}>
          <mesh position={[0, -0.13, 0]} material={clay('#4a3b34')} castShadow><capsuleGeometry args={[0.055, 0.14, 4, 8]} /></mesh>
        </group>
      </group>
      {/* soft contact shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={blobMat()} renderOrder={1}>
        <planeGeometry args={[0.72, 0.72]} />
      </mesh>
    </group>
  )
})
