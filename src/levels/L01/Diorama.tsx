import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, clay, Scaffold, Rock, Fence } from '../../world/kit'
import { LAMP_POS, HEAD_Y, Lantern, lampLit, lampDark, haloTexture } from './lanterns'
import { Merged, mergePrims, type Prim } from './shared.v5'
import { AutoMerge } from '../../v5/world/AutoMerge'

/* A small IIT Patna-style campus block: cream walls, a terracotta hip roof,
   arched windows, a tiny gate and a banyan. Four lamp posts along the path
   wake up when the level is solved, and the chimney starts to breathe.
   Static clay is merged into single vertex-coloured meshes to keep draws low. */

const REDUCED = typeof window !== 'undefined' &&
  !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const winOn = new THREE.MeshStandardMaterial({ color: '#ffd489', emissive: '#ffb04e', emissiveIntensity: 0.85, roughness: 0.5 })
const winOff = new THREE.MeshStandardMaterial({ color: '#9db6b3', roughness: 0.92 })

const puffGeo = new THREE.SphereGeometry(1, 10, 8)

/* V6: the wrap-cloth dome only belongs to the V4 route — V5 shows the campus. */
const IS_V4 = typeof location !== 'undefined' && new URLSearchParams(location.search).has('v4')

/* campus block statics (local to its group at [0.35,0,-0.7]) */
const BLOCK: Prim[] = [
  { g: 'box', p: [0, 0.07, 0], s: [1.92, 0.14, 1.22], c: C.stone },          // plinth
  { g: 'box', p: [0, 0.57, 0], s: [1.7, 0.86, 1.02], c: C.cream },          // walls
  { g: 'box', p: [0, 1.03, 0], s: [1.78, 0.1, 1.1], c: C.sand },            // cornice
  { g: 'pyr', p: [0, 1.62, 0], s: [2.66, 0.56, 1.65], r: [0, Math.PI / 4, 0], c: C.terracotta }, // hip roof
  { g: 'box', p: [0, 0.42, 0.49], s: [0.3, 0.52, 0.07], c: C.wood },        // door
  { g: 'box', p: [0, 0.035, 0.64], s: [0.5, 0.07, 0.2], c: C.sand },        // step
  { g: 'box', p: [0.55, 1.5, -0.14], s: [0.15, 0.34, 0.15], c: C.brick },   // chimney
]

/* arched windows share one geometry + one lit/dark material */
const WIN_GEO = mergePrims([
  { g: 'box', p: [-0.52, 0.62, 0.5], s: [0.19, 0.42, 0.07], c: '#fff' },
  { g: 'box', p: [0.52, 0.62, 0.5], s: [0.19, 0.42, 0.07], c: '#fff' },
  { g: 'box', p: [0.86, 0.62, -0.15], s: [0.19, 0.42, 0.07], r: [0, Math.PI / 2, 0], c: '#fff' },
  { g: 'box', p: [-0.86, 0.62, -0.15], s: [0.19, 0.42, 0.07], r: [0, Math.PI / 2, 0], c: '#fff' },
])

/* flag, benches, gate pillars, stepping stones, bushes — the quad's statics */
const QUAD: Prim[] = (() => {
  const p: Prim[] = [
    // institute flag pole + pennant
    { g: 'cyl', p: [0.95, 1.3, -1.1], s: [0.028, 1.1, 0.04], c: C.wood },
    { g: 'box', p: [1.09, 1.68, -1.1], s: [0.26, 0.13, 0.015], c: C.terracotta },
    // the tiny gate where the path begins (at [1.02,0,0.92], yaw -0.45)
    { g: 'box', p: [0.87, 0.23, 1.04], s: [0.11, 0.46, 0.11], r: [0, -0.45, 0], c: C.cream },
    { g: 'box', p: [1.17, 0.23, 0.8], s: [0.11, 0.46, 0.11], r: [0, -0.45, 0], c: C.cream },
    { g: 'pyr', p: [0.87, 0.5, 1.04], s: [0.17, 0.09, 0.17], r: [0, -0.45 + Math.PI / 4, 0], c: C.terracotta },
    { g: 'pyr', p: [1.17, 0.5, 0.8], s: [0.17, 0.09, 0.17], r: [0, -0.45 + Math.PI / 4, 0], c: C.terracotta },
    // shrubs by the wall
    { g: 'sph', p: [-0.72, 0.14, 0.12], s: [0.34, 0.3, 0.34], c: C.leaf },
    { g: 'sph', p: [1.62, 0.16, -0.45], s: [0.4, 0.34, 0.4], c: C.leafDark },
    { g: 'sph', p: [2.08, 0.35, -0.3], s: [0.95, 0.85, 0.95], c: '#8fae6a' },
    { g: 'sph', p: [2.2, 0.55, -0.2], s: [0.55, 0.45, 0.55], c: '#9cba74' },
    { g: 'sph', p: [-1.9, 0.3, 0.35], s: [0.8, 0.7, 0.8], c: C.leaf },
    { g: 'sph', p: [-2.0, 0.5, 0.45], s: [0.45, 0.38, 0.45], c: '#8fae6a' },
  ]
  // two benches on the quad
  for (const [x, z, r] of [[-0.35, 1.15, 0.35], [0.95, 1.0, 0.5]] as const) {
    const cs = Math.cos(r), sn = Math.sin(r)
    p.push(
      { g: 'box', p: [x, 0.21, z], s: [0.44, 0.045, 0.16], r: [0, r, 0], c: C.woodLight },
      { g: 'box', p: [x - cs * 0.16, 0.1, z + sn * 0.16], s: [0.045, 0.2, 0.14], r: [0, r, 0], c: C.wood },
      { g: 'box', p: [x + cs * 0.16, 0.1, z - sn * 0.16], s: [0.045, 0.2, 0.14], r: [0, r, 0], c: C.wood },
    )
  }
  // stepping stones from the gate to the door
  for (const [x, z, r] of [[0.82, 0.62, 0.2], [0.6, 0.4, -0.15], [0.5, 0.16, 0.1], [0.42, -0.04, -0.08]] as const) {
    p.push({ g: 'box', p: [x, 0.025, z], s: [0.3, 0.05, 0.24], r: [0, r - 0.6, 0], c: C.sand })
  }
  // the banyan — trunk, aerial roots, canopy
  p.push(
    { g: 'cyl', p: [-1.45, 0.26, -0.55], s: [0.14, 0.52, 0.22], c: C.wood },
    { g: 'cyl', p: [-1.15, 0.18, -0.49], s: [0.028, 0.4, 0.04], r: [0.06, 0, -0.08], c: C.wood },
    { g: 'cyl', p: [-1.71, 0.18, -0.59], s: [0.028, 0.4, 0.04], r: [0, 0, 0.08], c: C.wood },
    { g: 'cyl', p: [-1.4, 0.18, -0.85], s: [0.028, 0.4, 0.04], r: [-0.06, 0, -0.08], c: C.wood },
    { g: 'sph', p: [-1.45, 0.82, -0.55], s: [1.0, 0.9, 1.0], c: C.leafDark },
    { g: 'sph', p: [-1.09, 0.68, -0.43], s: [0.66, 0.6, 0.66], c: C.leafDark },
    { g: 'sph', p: [-1.79, 0.7, -0.61], s: [0.72, 0.66, 0.72], c: C.leafDark },
    { g: 'sph', p: [-1.43, 1.02, -0.6], s: [0.6, 0.55, 0.6], c: C.leaf },
  )
  return p
})()

export default function Diorama({ unlocked, active }: DioramaProps) {
  const puffs = useRef<(THREE.Mesh | null)[]>([])
  const haloTex = useMemo(haloTexture, [])
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
      {/* campus block — one merged mesh + one shared-material window mesh */}
      <group position={[0.35, 0, -0.7]}>
        <Merged items={BLOCK} />
        <mesh geometry={WIN_GEO} material={win} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={puffGeo} material={puffMats[i]} position={[0.55, 1.7, -0.14]}
            ref={(m) => { puffs.current[i] = m }} />
        ))}
      </group>
      {IS_V4 && <Scaffold open={unlocked} position={[0.35, 0, -0.7]} size={[2.4, 2.05, 1.62]} />}

      {/* quad statics: flag, benches, gate, stepping stones, banyan, shrubs */}
      <AutoMerge>
      <Merged items={QUAD} />
      {/* the gate's torus arch */}
      <mesh position={[1.02, 0.46, 0.92]} rotation={[0, -0.45, 0]} material={clay(C.terracotta)} castShadow>
        <torusGeometry args={[0.26, 0.035, 8, 18, Math.PI]} />
      </mesh>

      <Rock position={[1.72, 0.05, -0.85]} s={0.16} />

      {/* low fence curving around the back-left rim */}
      <Fence pts={[new THREE.Vector3(-2.35, 0, -0.7), new THREE.Vector3(-2.15, 0, -1.55), new THREE.Vector3(-1.45, 0, -2.15)]} seed={4} />
      </AutoMerge>

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
    </group>
  )
}
