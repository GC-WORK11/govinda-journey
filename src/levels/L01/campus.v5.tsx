/**
 * L01 prop assemblies: the little IIT Patna campus block, the courtyard tree
 * and the desk + laptop the tutorial ends at. Clay placeholders until ART lands.
 */
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { C, clay, REDUCED } from './shared.v5'

const winLit = new THREE.MeshStandardMaterial({ color: '#ffd489', emissive: '#ffb04e', emissiveIntensity: 0.9, roughness: 0.5 })
const winDark = new THREE.MeshStandardMaterial({ color: '#9db6b3', roughness: 0.92 })
const archGeo = new THREE.CapsuleGeometry(0.13, 0.24, 4, 10)

/** Cream campus block with a terracotta hip roof + arched windows. Windows warm up once solved. */
export function CampusBlock({ position, yaw = 0, warm }: {
  position: [number, number, number]
  yaw?: number
  warm: boolean
}) {
  const puffs = useRef<(THREE.Mesh | null)[]>([])
  const puffMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#f1e7d7', transparent: true, opacity: 0, roughness: 1 })),
    [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (!REDUCED) winLit.emissiveIntensity = warm ? 0.9 + Math.sin(t * 2.4) * 0.07 : 0
    puffs.current.forEach((m, i) => {
      if (!m) return
      const e = (t * 0.16 + i * 0.37) % 1
      m.position.y = 2.34 + e * 0.6
      m.scale.setScalar(0.06 + e * 0.15)
      puffMats[i].opacity = warm && !REDUCED ? (1 - e) * 0.4 : 0
    })
  })
  const win = warm ? winLit : winDark
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* plinth + main volume + sand band + hip roof */}
      <RoundedBox args={[2.7, 0.16, 1.8]} radius={0.06} position={[0, 0.08, 0]} material={clay(C.stone)} castShadow receiveShadow />
      <RoundedBox args={[2.4, 1.15, 1.6]} radius={0.08} position={[0, 0.72, 0]} material={clay(C.cream)} castShadow receiveShadow />
      <RoundedBox args={[2.5, 0.12, 1.7]} radius={0.05} position={[0, 1.33, 0]} material={clay(C.sand)} castShadow />
      <mesh position={[0, 1.72, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.72]} material={clay(C.terracotta)} castShadow>
        <coneGeometry args={[1.8, 0.72, 4]} />
      </mesh>
      {/* arched door + threshold step */}
      <mesh position={[0, 0.56, 0.78]} scale={[1, 1, 0.4]} material={clay(C.wood)} castShadow>
        <capsuleGeometry args={[0.19, 0.42, 4, 10]} />
      </mesh>
      <RoundedBox args={[0.64, 0.08, 0.26]} radius={0.03} position={[0, 0.05, 0.9]} material={clay(C.sand)} castShadow receiveShadow />
      {/* arched windows */}
      <mesh geometry={archGeo} position={[-0.72, 0.78, 0.79]} scale={[1, 1, 0.32]} material={win} />
      <mesh geometry={archGeo} position={[0.72, 0.78, 0.79]} scale={[1, 1, 0.32]} material={win} />
      <mesh geometry={archGeo} position={[1.2, 0.78, -0.2]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 0.32]} material={win} />
      <mesh geometry={archGeo} position={[-1.2, 0.78, -0.2]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 0.32]} material={win} />
      {/* chimney + quiet smoke once warm */}
      <RoundedBox args={[0.2, 0.46, 0.2]} radius={0.04} position={[0.78, 1.98, -0.2]} material={clay(C.brick)} castShadow />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.78, 2.34, -0.2]} material={puffMats[i]}
          ref={(m) => { puffs.current[i] = m }}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/** The courtyard tree the desk sits under — broad canopy, a few low branches. */
export function BigTree({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.62, 0]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.3, 8]} />
      </mesh>
      {[[0.5, 1.05, 0.12, 0.5], [-0.45, 1.0, -0.2, -0.55], [0.05, 1.12, -0.45, 0.15]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x * 0.6, y, z * 0.6]} rotation={[0, 0, r]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.03, 0.05, 0.85, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 1.85, 0]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.95, 16, 12]} /></mesh>
      <mesh position={[0.78, 1.55, 0.25]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.62, 14, 10]} /></mesh>
      <mesh position={[-0.7, 1.6, -0.15]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.66, 14, 10]} /></mesh>
      <mesh position={[0.15, 1.5, -0.72]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.5, 12, 9]} /></mesh>
      <mesh position={[0.1, 2.35, 0.05]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.5, 12, 9]} /></mesh>
    </group>
  )
}

/** Wooden desk + open laptop + stool + a notebook. Laptop screen glows warm once used. */
export function LaptopDesk({ position, yaw = 0, lit, laptopRef }: {
  position: [number, number, number]
  yaw?: number
  lit: boolean
  laptopRef: RefObject<THREE.Group>
}) {
  const screenMat = useRef<THREE.MeshStandardMaterial>(null)
  const t = useRef(lit ? 1 : 0)
  useFrame((s, dt) => {
    t.current += ((lit ? 1 : 0) - t.current) * Math.min(1, dt * 2.2)
    if (screenMat.current) {
      screenMat.current.emissiveIntensity = 0.22 + t.current * 0.85 + (REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 2.3) * 0.05 * t.current)
    }
  })
  const top = 0.74
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* desktop + trestle legs */}
      <RoundedBox args={[1.2, 0.06, 0.62]} radius={0.025} position={[0, top, 0]} material={clay(C.wood)} castShadow receiveShadow />
      {[-0.5, 0.5].map((x) => (
        <RoundedBox key={x} args={[0.07, top, 0.5]} radius={0.02} position={[x, top / 2, 0]} material={clay(C.earthDark)} castShadow />
      ))}
      {/* laptop */}
      <group ref={laptopRef} position={[-0.14, top + 0.03, 0.04]}>
        <RoundedBox args={[0.4, 0.028, 0.28]} radius={0.012} material={clay('#c9c2b6')} castShadow />
        <group position={[0, 0.012, -0.135]} rotation={[-Math.PI * 0.62, 0, 0]}>
          <RoundedBox args={[0.4, 0.28, 0.018]} radius={0.012} position={[0, 0.14, 0]} material={clay('#c9c2b6')} castShadow />
          <mesh position={[0, 0.14, 0.011]}>
            <planeGeometry args={[0.35, 0.23]} />
            <meshStandardMaterial ref={screenMat} color="#3a3430" emissive="#ffd9a0" emissiveIntensity={0.22} roughness={0.6} />
          </mesh>
        </group>
      </group>
      {/* notebook + mug */}
      <RoundedBox args={[0.2, 0.025, 0.15]} radius={0.01} position={[0.36, top + 0.045, 0.08]} rotation={[0, 0.3, 0]} material={clay(C.paper)} castShadow />
      <mesh position={[0.42, top + 0.075, -0.12]} material={clay(C.terracotta)} castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.09, 10]} />
      </mesh>
      {/* stool */}
      <group position={[0.1, 0, 0.62]}>
        <mesh position={[0, 0.4, 0]} material={clay(C.woodLight)} castShadow><cylinderGeometry args={[0.19, 0.17, 0.06, 10]} /></mesh>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.5
          return <mesh key={i} position={[Math.cos(a) * 0.11, 0.19, Math.sin(a) * 0.11]} rotation={[Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.02, 0.025, 0.4, 6]} /></mesh>
        })}
      </group>
    </group>
  )
}
