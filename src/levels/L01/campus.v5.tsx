/**
 * L01 prop assemblies: the little IIT Patna campus block, the courtyard tree
 * and the desk + laptop the tutorial ends at.
 * The campus block is a clay assembly (cream walls, terracotta hip roof,
 * arched windows that warm); desk + tree use ART pack props.
 * Static clay is merged into one vertex-coloured mesh to keep draw calls low.
 */
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay, Prop, REDUCED, Merged, mergePrims, type Prim } from './shared.v5'

const winLit = new THREE.MeshStandardMaterial({ color: '#ffd489', emissive: '#ffb04e', emissiveIntensity: 0.9, roughness: 0.5 })
const winDark = new THREE.MeshStandardMaterial({ color: '#9db6b3', roughness: 0.92 })

/** Cream campus block with a terracotta hip roof + arched windows. Windows warm up once solved. */
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
  // static clay → one mesh; windows → one mesh sharing the lit/dark material
  const statics = useMemo<Prim[]>(() => [
    { g: 'box', p: [0, 0.08, 0], s: [2.7, 0.16, 1.8], c: C.stone },           // plinth
    { g: 'box', p: [0, 0.72, 0], s: [2.4, 1.15, 1.6], c: C.cream },          // main volume
    { g: 'box', p: [0, 1.33, 0], s: [2.5, 0.12, 1.7], c: C.sand },           // sand band
    { g: 'pyr', p: [0, 2.08, 0], s: [3.6, 0.72, 2.6], r: [0, Math.PI / 4, 0], c: C.terracotta }, // hip roof
    { g: 'box', p: [0, 0.56, 0.78], s: [0.34, 0.62, 0.1], c: C.wood },       // door
    { g: 'box', p: [0, 0.05, 0.9], s: [0.64, 0.08, 0.26], c: C.sand },       // threshold step
    { g: 'box', p: [0.78, 1.98, -0.2], s: [0.2, 0.46, 0.2], c: C.brick },    // chimney
  ], [])
  const winGeo = useMemo(() => mergePrims([
    { g: 'box', p: [-0.72, 0.78, 0.79], s: [0.24, 0.46, 0.08], c: '#fff' },
    { g: 'box', p: [0.72, 0.78, 0.79], s: [0.24, 0.46, 0.08], c: '#fff' },
    { g: 'box', p: [1.2, 0.78, -0.2], s: [0.24, 0.46, 0.08], r: [0, Math.PI / 2, 0], c: '#fff' },
    { g: 'box', p: [-1.2, 0.78, -0.2], s: [0.24, 0.46, 0.08], r: [0, Math.PI / 2, 0], c: '#fff' },
  ]), [])
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
      <Merged items={statics} />
      <mesh geometry={winGeo} material={win} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.78, 2.34, -0.2]} material={puffMats[i]}
          ref={(m) => { puffs.current[i] = m }}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      ))}
      {/* collider */}
      <mesh ref={blk} position={[0, 1.05, 0]} visible={false}>
        <boxGeometry args={[2.5, 2.1, 1.75]} />
      </mesh>
      {/* porch glow once warm */}
      {warm && <pointLight position={[0, 0.9, 1.0]} color="#ffc27e" intensity={2.4} distance={5} decay={2} />}
    </group>
  )
}

/** The courtyard tree the desk sits under — broad oak canopy + trunk collider. */
export function BigTree({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  const blk = useRef<THREE.Mesh>(null)
  core.useBlocker(blk)
  return (
    <group position={position} scale={s}>
      <Prop name="tree_oak" scale={1.9} />
      <mesh ref={blk} position={[0, 0.9, 0]} visible={false}>
        <cylinderGeometry args={[0.26, 0.34, 1.8, 8]} />
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
      <mesh ref={blk} position={[0, top / 2, 0.05]} visible={false}>
        <boxGeometry args={[1.15, top, 0.95]} />
      </mesh>
      {/* warm desk light once used */}
      <pointLight ref={light} position={[0, top + 0.5, 0.3]} color="#ffc27e" intensity={0} distance={4} decay={2} />
    </group>
  )
}
