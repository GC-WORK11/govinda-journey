import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, clay, Scaffold, Rock, Fence, Bush } from '../../world/kit'
import { LAMP_POS, HEAD_Y, Lantern, lampLit, lampDark, haloTexture } from './lanterns'

/* A small IIT Patna-style campus block: cream walls, a terracotta hip roof,
   arched windows, a tiny gate and a banyan. Four lamp posts along the path
   wake up when the level is solved, and the chimney starts to breathe. */

const REDUCED = typeof window !== 'undefined' &&
  !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const winOn = new THREE.MeshStandardMaterial({ color: '#ffd489', emissive: '#ffb04e', emissiveIntensity: 0.85, roughness: 0.5 })
const winOff = new THREE.MeshStandardMaterial({ color: '#9db6b3', roughness: 0.92 })

const winGeo = new THREE.CapsuleGeometry(0.11, 0.2, 4, 10)
const puffGeo = new THREE.SphereGeometry(1, 10, 8)

export default function Diorama({ unlocked, active }: DioramaProps) {
  const puffs = useRef<(THREE.Mesh | null)[]>([])
  const haloTex = useMemo(haloTexture, [])
  const roofGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1.33, 0.56, 4)
    g.rotateY(Math.PI / 4) // square footprint, axis-aligned so the z-squash below stays a rectangle
    return g
  }, [])
  const puffMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#f1e7d7', transparent: true, opacity: 0, roughness: 1 })),
    [])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (!REDUCED) {
      lampLit.emissiveIntensity = unlocked ? 1.5 + Math.sin(t * 8.7) * 0.16 + Math.sin(t * 21.3) * 0.08 : 0
      winOn.emissiveIntensity = 0.85 + Math.sin(t * 2.6) * 0.06
    }
    puffs.current.forEach((m, i) => {
      if (!m) return
      const e = (t * 0.2 + i * 0.36) % 1
      m.position.y = 1.7 + e * 0.55
      m.scale.setScalar(0.045 + e * 0.12)
      puffMats[i].opacity = unlocked && !REDUCED ? (1 - e) * 0.42 : 0
    })
  })

  const win = unlocked ? winOn : winOff

  return (
    <group>
      {/* campus block */}
      <group position={[0.35, 0, -0.7]}>
        <RoundedBox args={[1.92, 0.14, 1.22]} radius={0.05} position={[0, 0.07, 0]} material={clay(C.stone)} receiveShadow castShadow />
        <RoundedBox args={[1.7, 0.86, 1.02]} radius={0.07} position={[0, 0.57, 0]} material={clay(C.cream)} castShadow receiveShadow />
        <RoundedBox args={[1.78, 0.1, 1.1]} radius={0.04} position={[0, 1.03, 0]} material={clay(C.sand)} castShadow />
        <mesh geometry={roofGeo} position={[0, 1.34, 0]} scale={[1, 1, 0.62]} material={clay(C.terracotta)} castShadow />
        {/* arched door + step */}
        <mesh position={[0, 0.42, 0.49]} scale={[1, 1, 0.35]} material={clay(C.wood)} castShadow>
          <capsuleGeometry args={[0.15, 0.36, 4, 10]} />
        </mesh>
        <RoundedBox args={[0.5, 0.07, 0.2]} radius={0.03} position={[0, 0.035, 0.64]} material={clay(C.sand)} castShadow />
        {/* arched windows, front + sides */}
        <mesh geometry={winGeo} position={[-0.52, 0.62, 0.5]} scale={[1, 1, 0.32]} material={win} />
        <mesh geometry={winGeo} position={[0.52, 0.62, 0.5]} scale={[1, 1, 0.32]} material={win} />
        <mesh geometry={winGeo} position={[0.86, 0.62, -0.15]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 0.32]} material={win} />
        <mesh geometry={winGeo} position={[-0.86, 0.62, -0.15]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 0.32]} material={win} />
        {/* chimney + smoke */}
        <RoundedBox args={[0.15, 0.34, 0.15]} radius={0.03} position={[0.55, 1.5, -0.14]} material={clay(C.brick)} castShadow />
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={puffGeo} material={puffMats[i]} position={[0.55, 1.7, -0.14]}
            ref={(m) => { puffs.current[i] = m }} />
        ))}
      </group>
      <Scaffold open={unlocked} position={[0.35, 0, -0.7]} size={[2.4, 2.05, 1.62]} />

      {/* tiny gate where the path begins */}
      <group position={[1.02, 0, 0.92]} rotation={[0, -0.45, 0]}>
        {[-0.26, 0.26].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <RoundedBox args={[0.11, 0.46, 0.11]} radius={0.03} position={[0, 0.23, 0]} material={clay(C.cream)} castShadow />
            <mesh position={[0, 0.5, 0]} material={clay(C.terracotta)} castShadow><coneGeometry args={[0.09, 0.09, 4]} /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.46, 0]} material={clay(C.terracotta)} castShadow>
          <torusGeometry args={[0.26, 0.035, 8, 18, Math.PI]} />
        </mesh>
      </group>

      {/* stepping stones from the gate to the door */}
      {([[0.82, 0.62, 0.2], [0.6, 0.4, -0.15], [0.5, 0.16, 0.1], [0.42, -0.04, -0.08]] as const).map(([x, z, r], i) => (
        <RoundedBox key={i} args={[0.3, 0.05, 0.24]} radius={0.03} position={[x, 0.025, z]}
          rotation={[0, r - 0.6, 0]} material={clay(C.sand)} receiveShadow castShadow />
      ))}

      {/* the banyan */}
      <group position={[-1.45, 0, -0.55]}>
        <mesh position={[0, 0.26, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.07, 0.11, 0.52, 7]} /></mesh>
        {[[0.3, 0.06], [-0.26, -0.04], [0.05, -0.3]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.18, z]} rotation={[0.06 * (i - 1), 0, 0.08 * (i % 2 ? 1 : -1)]}
            material={clay(C.wood)} castShadow><cylinderGeometry args={[0.014, 0.02, 0.4, 5]} /></mesh>
        ))}
        <mesh position={[0, 0.82, 0]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.5, 14, 11]} /></mesh>
        <mesh position={[0.36, 0.68, 0.12]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.33, 12, 10]} /></mesh>
        <mesh position={[-0.34, 0.7, -0.06]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.36, 12, 10]} /></mesh>
        <mesh position={[0.02, 1.02, -0.05]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.3, 12, 10]} /></mesh>
      </group>

      {/* the four lanterns along the path — hidden while the game borrows them */}
      {!active && LAMP_POS.map((p, i) => (
        <group key={i} position={p}>
          <Lantern head={unlocked ? lampLit : lampDark} />
          {unlocked && (
            <sprite position={[0, HEAD_Y, 0]} scale={[0.9, 0.9, 1]}>
              <spriteMaterial map={haloTex} color="#ffc27a" transparent opacity={0.32} depthWrite={false} />
            </sprite>
          )}
        </group>
      ))}
      {unlocked && (
        <pointLight position={[0.85, 0.9, 1.35]} color="#ffc27e" intensity={2.2} distance={3.4} decay={2} />
      )}

      {/* dressing */}
      <mesh position={[-0.72, 0.14, 0.12]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.17, 10, 8]} /></mesh>
      <mesh position={[1.62, 0.16, -0.45]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.2, 10, 8]} /></mesh>
      <Rock position={[1.72, 0.05, -0.85]} s={0.16} />

      {/* low fence curving around the back-left rim, shrubs by the wall */}
      <Fence pts={[new THREE.Vector3(-2.35, 0, -0.7), new THREE.Vector3(-2.15, 0, -1.55), new THREE.Vector3(-1.45, 0, -2.15)]} seed={4} />
      <Bush position={[2.08, 0, -0.3]} s={0.95} />
      <Bush position={[-1.9, 0, 0.35]} s={0.8} color={C.leaf} />
    </group>
  )
}

