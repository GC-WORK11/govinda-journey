import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { DioramaProps } from '../types'
import { Scaffold, C, clay } from '../../world/kit'
import * as THREE from 'three'

export default function Diorama({ unlocked }: DioramaProps) {
  const ribbonRef = useRef<THREE.Group>(null)
  
  // Gentle float animation for the ribbon after unlock
  useFrame(({ clock }) => {
    if (ribbonRef.current && unlocked) {
      ribbonRef.current.position.y = 0.58 + Math.sin(clock.elapsedTime * 1.2) * 0.04
      ribbonRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.08
    }
  })
  
  return (
    <group>
      {/* Desk with laptop (left side) */}
      <group position={[-0.7, 0, 0]}>
        {/* Desk surface */}
        <RoundedBox 
          args={[1, 0.08, 0.7]} 
          radius={0.04} 
          position={[0, 0.04, 0]} 
          material={clay(C.sand)} 
          castShadow 
          receiveShadow 
        />
        
        {/* Laptop base */}
        <RoundedBox 
          args={[0.48, 0.02, 0.36]} 
          radius={0.02} 
          position={[0, 0.09, 0]} 
          material={clay(C.cream)} 
          castShadow 
        />
        
        {/* Laptop screen */}
        <group position={[0, 0.1, 0.16]} rotation={[-0.2, 0, 0]}>
          <RoundedBox 
            args={[0.5, 0.32, 0.02]} 
            radius={0.02} 
            material={clay(C.cream)} 
            castShadow 
          />
          {/* Screen display */}
          <mesh position={[0, 0, -0.011]}>
            <planeGeometry args={[0.42, 0.26]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.3} />
          </mesh>
          {/* Document on screen */}
          <mesh position={[0, 0, -0.015]}>
            <planeGeometry args={[0.36, 0.22]} />
            <meshStandardMaterial color={C.paper} />
          </mesh>
          
          {/* Blinking cursor after unlock */}
          {unlocked && (
            <mesh position={[-0.14, -0.06, -0.017]}>
              <planeGeometry args={[0.008, 0.025]} />
              <meshBasicMaterial color={C.ink}>
                <primitive attach="onBeforeCompile" object={(shader: any) => {
                  shader.uniforms.time = { value: 0 }
                  shader.vertexShader = 'uniform float time;\n' + shader.vertexShader
                  shader.fragmentShader = shader.fragmentShader.replace(
                    'void main() {',
                    `uniform float time;
                    void main() {`
                  )
                  shader.fragmentShader = shader.fragmentShader.replace(
                    'vec4 diffuseColor = vec4( diffuse, opacity );',
                    `vec4 diffuseColor = vec4( diffuse, opacity * (0.5 + 0.5 * step(0.5, fract(time * 1.1))) );`
                  )
                }} />
              </meshBasicMaterial>
            </mesh>
          )}
        </group>
      </group>
      
      {/* Phone tower (right side) */}
      <group position={[0.85, 0, 0.3]}>
        {/* Tower base - circular platform */}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.32, 0.1, 16]} />
          <primitive attach="material" object={clay(C.stone)} />
        </mesh>
        
        {/* Tower pole */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 0.9, 8]} />
          <primitive attach="material" object={clay(C.wood)} />
        </mesh>
        
        {/* Cross beams */}
        <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
          <primitive attach="material" object={clay(C.woodLight)} />
        </mesh>
        
        <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
          <primitive attach="material" object={clay(C.woodLight)} />
        </mesh>
        
        {/* Antenna elements at top */}
        <group position={[0, 0.98, 0]}>
          <mesh position={[-0.08, 0, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
            <primitive attach="material" object={clay('#a8a8a8')} />
          </mesh>
          <mesh position={[0.08, 0, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
            <primitive attach="material" object={clay('#a8a8a8')} />
          </mesh>
          {/* Small spheres on top of antennas */}
          <mesh position={[-0.08, 0.07, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 6]} />
            <primitive attach="material" object={clay('#d8d8d8')} />
          </mesh>
          <mesh position={[0.08, 0.07, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 6]} />
            <primitive attach="material" object={clay('#d8d8d8')} />
          </mesh>
        </group>
        
        {/* Phone on stand */}
        <group position={[0, 0.28, 0]}>
          {/* Stand holder */}
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.16, 8]} />
            <primitive attach="material" object={clay('#c9a882')} />
          </mesh>
          
          {/* Phone body */}
          <RoundedBox 
            args={[0.18, 0.32, 0.02]} 
            radius={0.02} 
            position={[0, 0, 0]}
            rotation={[0.15, 0, 0]}
            material={clay(C.terracotta)} 
            castShadow 
          />
          
          {/* Phone screen */}
          <mesh position={[0, 0, -0.011]} rotation={[0.15, 0, 0]}>
            <planeGeometry args={[0.15, 0.26]} />
            <meshStandardMaterial color={C.paper} />
          </mesh>
          
          {/* Mic button on screen (as a soft circle) */}
          <mesh position={[0, -0.02, -0.016]} rotation={[0.15, 0, 0]}>
            <circleGeometry args={[0.05, 16]} />
            <meshStandardMaterial color={unlocked ? C.leaf : C.sand} />
          </mesh>
        </group>
        
        {/* Sign at base */}
        <group position={[0.22, 0.18, 0]} rotation={[0, -0.4, 0]}>
          <RoundedBox 
            args={[0.24, 0.14, 0.02]} 
            radius={0.01} 
            material={clay(C.paper)} 
            castShadow 
          />
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[0.2, 0.08]} />
            <meshBasicMaterial color={C.ink} transparent opacity={0.8} />
          </mesh>
          {/* Pole holding sign */}
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
            <primitive attach="material" object={clay(C.wood)} />
          </mesh>
        </group>
      </group>
      
      {/* Floating paper ribbon after unlock */}
      {unlocked && (
        <group ref={ribbonRef} position={[0.1, 0.58, 0.15]}>
          <mesh rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.45, 0.08, 0.01]} />
            <meshStandardMaterial color={C.paper} />
          </mesh>
          {/* Small words drawn on ribbon */}
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-0.15 + i * 0.15, 0, 0.008]} rotation={[0, 0, 0.3]}>
              <planeGeometry args={[0.08, 0.04]} />
              <meshBasicMaterial color={C.terracotta} transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Small decorative rocks */}
      <mesh position={[-1.4, 0.04, -0.5]} castShadow scale={[0.2, 0.14, 0.2]}>
        <dodecahedronGeometry args={[1, 1]} />
        <primitive attach="material" object={clay(C.stone)} />
      </mesh>
      
      <mesh position={[0.2, 0.03, -0.9]} castShadow scale={[0.15, 0.11, 0.15]}>
        <dodecahedronGeometry args={[1, 1]} />
        <primitive attach="material" object={clay('#d6cab4')} />
      </mesh>
      
      {/* Scaffold around the tower */}
      <Scaffold open={unlocked} position={[0.85, 0, 0.3]} size={[0.8, 1.2, 0.8]} />
    </group>
  )
}
