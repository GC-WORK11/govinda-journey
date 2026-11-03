/**
 * L01 prop assemblies: the little IIT Patna campus block, the courtyard tree
 * and the desk + laptop the tutorial ends at.
 * Landmarks are ART pack props (src/v5/art/Dressing); colliders and the tiny
 * payoff extras (smoke, porch glow, mug) stay clay.
 */
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay, Prop, REDUCED } from './shared.v5'

const invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

/** Pack building + plinth + smoking chimney + porch light that warms once solved. */
export function CampusBlock({ position, yaw = 0, warm }: {
  position: [number, number, number]
  yaw?: number
  warm: boolean
}) {
  const puffs = useRef<(THREE.Mesh | null)[]>([])
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  const puffMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#f1e7d7', transparent: true, opacity: 0, roughness: 1 })),
    [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    puffs.current.forEach((m, i) => {
      if (!m) return
      const e = (t * 0.16 + i * 0.37) % 1
      m.position.y = 3.3 + e * 0.7
      m.scale.setScalar(0.07 + e * 0.17)
      puffMats[i].opacity = warm && !REDUCED ? (1 - e) * 0.4 : 0
    })
  })
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* plinth the building sits on */}
      <RoundedBox args={[2.9, 0.16, 3.0]} radius={0.06} position={[0, 0.08, 0]} material={clay(C.stone)} castShadow receiveShadow />
      {/* the campus building itself (KayKit city) */}
      <Prop name="building_a" position={[0, 0.16, 0]} scale={1.9} />
      {/* collider for the building */}
      <mesh ref={blk} position={[0, 1.55, 0]} material={invisible}>
        <boxGeometry args={[2.5, 3.1, 2.9]} />
      </mesh>
      {/* chimney smoke once warm */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.9, 3.3, -0.7]} material={puffMats[i]}
          ref={(m) => { puffs.current[i] = m }}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      ))}
      {/* porch light + glow once warm */}
      {warm && <pointLight position={[0, 1.3, 1.6]} color="#ffc27e" intensity={2.6} distance={5.5} decay={2} />}
    </group>
  )
}

/** The courtyard tree the desk sits under — broad oak canopy over the desk. */
export function BigTree({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  return (
    <group position={position} scale={s}>
      <Prop name="tree_oak" scale={2.55} />
      {/* trunk collider */}
      <mesh ref={blk} position={[0, 1.1, 0]} material={invisible}>
        <cylinderGeometry args={[0.3, 0.4, 2.2, 8]} />
      </mesh>
    </group>
  )
}

/** Pack desk + open laptop + chair + books. Screen/lamp glow warms once used. */
export function LaptopDesk({ position, yaw = 0, lit, laptopRef }: {
  position: [number, number, number]
  yaw?: number
  lit: boolean
  laptopRef: RefObject<THREE.Group>
}) {
  const t = useRef(lit ? 1 : 0)
  const light = useRef<THREE.PointLight>(null)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  useFrame((s, dt) => {
    t.current += ((lit ? 1 : 0) - t.current) * Math.min(1, dt * 2.2)
    const k = t.current
    if (light.current) light.current.intensity = k * (1.9 + (REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 2.3) * 0.1))
    if (glow.current) glow.current.opacity = k * 0.85
  })
  const top = 0.57 // desk top height at scale 1.5
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* desk — model is off-centre (+x,-z), shifted back so it reads centred */}
      <Prop name="desk" position={[-0.54, 0, 0.15]} scale={1.5} />
      {/* open laptop on the desk, screen tilted toward the stool side (+z) */}
      <group ref={laptopRef} position={[-0.08, top, 0.02]} rotation={[0, Math.PI, 0]}>
        <Prop name="laptop" position={[-0.19, 0, 0.17]} scale={0.62} />
        {/* soft screen glow once used */}
        <mesh position={[0.0, 0.14, -0.1]} rotation={[-0.5, Math.PI, 0]}>
          <planeGeometry args={[0.24, 0.16]} />
          <meshBasicMaterial ref={glow} color="#ffd9a0" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {/* chair pulled up to the desk + a book stack at the corner */}
      <Prop name="chair_desk" position={[-0.02, 0, 0.62]} rotation={[0, Math.PI, 0]} scale={1.05} />
      <Prop name="books" position={[0.34, top + 0.01, -0.12]} rotation={[0, 0.4, 0]} scale={1.7} />
      {/* mug (clay, tiny) */}
      <mesh position={[0.42, top + 0.055, 0.16]} material={clay(C.terracotta)} castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.09, 10]} />
      </mesh>
      {/* desk collider */}
      <mesh ref={blk} position={[0, top / 2, 0.05]} material={invisible}>
        <boxGeometry args={[1.15, top, 0.95]} />
      </mesh>
      {/* warm desk light once used */}
      <pointLight ref={light} position={[0, top + 0.5, 0.3]} color="#ffc27e" intensity={0} distance={4} decay={2} />
    </group>
  )
}
