import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { DioramaProps } from '../types'
import { Scaffold, clay, C } from '../../world/kit'
import * as THREE from 'three'

// Greenhouse with glass panels, Delhi rooftops, small India Gate arch, hazy puffs that clear on unlock.
export default function Diorama({ unlocked, active }: DioramaProps) {
  return (
    <group>
      {/* greenhouse at center-back */}
      <Greenhouse position={[0, 0, -1.2]} unlocked={unlocked} />
      <Scaffold open={unlocked} position={[0, 0, -1.2]} size={[1.8, 1.6, 1.4]} />
      
      {/* Delhi rooftops left and right */}
      <Rooftop position={[-1.3, 0, 0.2]} />
      <Rooftop position={[1.4, 0, -0.3]} scale={0.85} />
      
      {/* small India Gate arch front-right */}
      <Arch position={[1.1, 0, 1.2]} />
      
      {/* hazy puffs that disappear when unlocked (the mini-game brings its own smog) */}
      {!unlocked && !active && (
        <>
          <HazePuff position={[-0.8, 0.9, -0.6]} />
          <HazePuff position={[0.6, 1.2, -0.4]} scale={0.8} />
          <HazePuff position={[0, 0.7, 0.3]} scale={0.7} />
        </>
      )}
    </group>
  )
}

function Greenhouse({ unlocked, ...p }: { unlocked: boolean } & JSX.IntrinsicElements['group']) {
  const plants = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (!plants.current || !unlocked) return
    const t = state.clock.elapsedTime
    plants.current.children.forEach((child, i) => {
      child.rotation.z = Math.sin(t * 1.2 + i * 0.8) * 0.08
    })
  })
  
  return (
    <group {...p}>
      {/* base */}
      <mesh position={[0, 0.04, 0]} material={clay(C.stone)} castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.82, 0.08, 16]} />
      </mesh>
      
      {/* glass frame */}
      <mesh position={[0, 0.5, 0]} material={clay(C.earth)} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.92, 8]} />
      </mesh>
      
      {/* glass panels (soft blue, matte) */}
      <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.8, 8, 1, false]} />
        <meshStandardMaterial
          color="#a8c5d0"
          transparent
          opacity={0.35}
          roughness={0.88}
          metalness={0}
        />
      </mesh>
      
      {/* dome top */}
      <mesh position={[0, 1.06, 0]} castShadow>
        <sphereGeometry args={[0.72, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#a8c5d0"
          transparent
          opacity={0.32}
          roughness={0.88}
          metalness={0}
        />
      </mesh>
      
      {/* frame ribs */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, 0.56, 0]}
          rotation={[0, (i * Math.PI) / 4, 0]}
          material={clay(C.earth)}
        >
          <boxGeometry args={[0.03, 0.85, 1.46]} />
        </mesh>
      ))}
      
      {/* plants inside (sway when unlocked) */}
      <group ref={plants} position={[0, 0.12, 0]}>
        <Plant position={[-0.25, 0, 0.15]} h={0.4} />
        <Plant position={[0.18, 0, -0.22]} h={0.35} />
        <Plant position={[0.08, 0, 0.28]} h={0.38} />
        <Plant position={[-0.15, 0, -0.25]} h={0.32} />
      </group>
    </group>
  )
}

function Plant({ h = 0.35, ...p }: { h?: number } & JSX.IntrinsicElements['group']) {
  return (
    <group {...p}>
      <mesh position={[0, h / 2, 0]} material={clay(C.leaf)} castShadow>
        <cylinderGeometry args={[0.02, 0.03, h, 6]} />
      </mesh>
      <mesh position={[0, h, 0]} material={clay(C.leafDark)} castShadow>
        <sphereGeometry args={[0.08, 8, 6]} />
      </mesh>
      <mesh position={[-0.05, h - 0.08, 0.04]} material={clay(C.leafDark)} castShadow>
        <sphereGeometry args={[0.05, 8, 6]} />
      </mesh>
      <mesh position={[0.05, h - 0.06, -0.03]} material={clay(C.leafDark)} castShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
      </mesh>
    </group>
  )
}

function Rooftop(p: JSX.IntrinsicElements['group']) {
  return (
    <group {...p}>
      {/* building block */}
      <RoundedBox
        args={[0.7, 0.6, 0.6]}
        radius={0.06}
        smoothness={3}
        position={[0, 0.3, 0]}
        material={clay(C.cream)}
        castShadow
        receiveShadow
      />
      
      {/* flat roof */}
      <mesh position={[0, 0.64, 0]} material={clay(C.terracotta)} castShadow>
        <boxGeometry args={[0.74, 0.08, 0.64]} />
      </mesh>
      
      {/* roof edge */}
      <mesh position={[0, 0.68, 0]} material={clay(C.brick)} castShadow>
        <boxGeometry args={[0.78, 0.04, 0.68]} />
      </mesh>
      
      {/* small water tank */}
      <mesh position={[-0.18, 0.82, -0.12]} material={clay(C.stone)} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.22, 8]} />
      </mesh>
      
      {/* window */}
      <RoundedBox
        args={[0.18, 0.22, 0.04]}
        radius={0.02}
        position={[0, 0.36, 0.32]}
        material={clay(C.water)}
      />
    </group>
  )
}

function Arch(p: JSX.IntrinsicElements['group']) {
  return (
    <group {...p}>
      {/* base platform */}
      <mesh position={[0, 0.03, 0]} material={clay(C.stone)} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.48, 0.06, 16]} />
      </mesh>
      
      {/* main pillars */}
      <RoundedBox
        args={[0.12, 0.58, 0.12]}
        radius={0.02}
        position={[-0.22, 0.35, 0]}
        material={clay(C.sand)}
        castShadow
      />
      <RoundedBox
        args={[0.12, 0.58, 0.12]}
        radius={0.02}
        position={[0.22, 0.35, 0]}
        material={clay(C.sand)}
        castShadow
      />
      
      {/* arch top */}
      <mesh position={[0, 0.64, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.sand)} castShadow>
        <torusGeometry args={[0.24, 0.06, 8, 16, Math.PI]} />
      </mesh>
      
      {/* small dome on top */}
      <mesh position={[0, 0.82, 0]} material={clay(C.terracotta)} castShadow>
        <sphereGeometry args={[0.1, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  )
}

function HazePuff(p: JSX.IntrinsicElements['group']) {
  const ref = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const baseY = (p.position as [number, number, number])?.[1] || 0
    ref.current.position.y = baseY + Math.sin(t * 0.8) * 0.08
  })
  
  return (
    <group ref={ref} {...p}>
      <mesh castShadow>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial
          color="#a0a0a0"
          transparent
          opacity={0.48}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  )
}
