import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { DioramaProps } from '../types'
import { Scaffold, clay, C, Letter, Rock } from '../../world/kit'
import * as THREE from 'three'
import { Merged, type Prim } from '../L01/shared.v5'
import { AutoMerge, NoMerge } from '../../v5/world/AutoMerge'

/* V6: the wrap-cloth dome only belongs to the V4 route — V5 shows the gates. */
const IS_V4 = typeof location !== 'undefined' && new URLSearchParams(location.search).has('v4')

/* pillars + caps — the gate line's statics as ONE mesh. V4's wall wings are
   dropped on V5: at D_SCALE they reach x 1.64..3.2 island-local, exactly where
   the obstacle's letter steps grow — they interpenetrated visibly. */
const GATE_LINE: Prim[] = (() => {
  const p: Prim[] = []
  for (const s of [-1, 1]) {
    p.push(
      { g: 'box', p: [s * 0.8, 0.9, -0.8], s: [0.5, 1.8, 0.5], c: C.stone },
      { g: 'cyl', p: [s * 0.8, 1.84, -0.8], s: [0.56, 0.12, 0.64], c: C.sand },
    )
  }
  return p
})()

/* loose papers + receiving pond + stepping stones (conditional clusters) */
const PAPERS: Prim[] = [
  { g: 'box', p: [-1.4, 0.01, -0.3], s: [0.22, 0.01, 0.16], r: [0, 0.3, 0], c: '#f4e6c4' },
  { g: 'box', p: [1.2, 0.01, 0.2], s: [0.22, 0.01, 0.16], r: [0, -0.5, 0], c: '#f4e6c4' },
  { g: 'box', p: [0.3, 0.01, 0.8], s: [0.22, 0.01, 0.16], r: [0, 1.2, 0], c: '#f4e6c4' },
]
const POND: Prim[] = (() => {
  const p: Prim[] = [
    { g: 'cyl', p: [0, 0.005, 0], s: [3.2, 0.02, 3.2], c: C.water },
    { g: 'cyl', p: [0, 0.015, 0], s: [2.8, 0.02, 2.8], c: C.sky },
  ]
  ;[-0.8, -0.4, 0, 0.4, 0.8].forEach((x, i) => {
    p.push(
      { g: 'cyl', p: [x, 0.06, Math.sin(i * 1.2) * 0.15], s: [0.36, 0.08, 0.4], c: C.stone },
      { g: 'cyl', p: [x, 0.1, Math.sin(i * 1.2) * 0.15], s: [0.32, 0.02, 0.32], c: C.sand },
    )
  })
  return p
})()

export default function Diorama({ unlocked }: DioramaProps) {
  const leftGateRef = useRef<THREE.Group>(null)
  const rightGateRef = useRef<THREE.Group>(null)
  const t = useRef(unlocked ? 1 : 0)

  useFrame((_, dt) => {
    const target = unlocked ? 1 : 0
    t.current += (target - t.current) * Math.min(1, dt * 1.8)
    const angle = t.current * Math.PI / 2.2

    if (leftGateRef.current) {
      leftGateRef.current.rotation.y = angle
    }
    if (rightGateRef.current) {
      rightGateRef.current.rotation.y = -angle
    }
  })

  return (
    <group>
      <AutoMerge>
      {/* V5: squat the gate line so it reads as a gate, not a wall over the island (visual only) */}
      <group scale={[1, IS_V4 ? 1 : 0.6, 1]}>
      {/* Stone pillars + caps + wall wings — ONE merged mesh */}
      <Merged items={GATE_LINE} />

      {/* Left gate */}
      <NoMerge><group ref={leftGateRef} position={[-0.55, 0, -0.8]}>
        <group position={[0.275, 0, 0]}>
          <RoundedBox
            args={[0.55, 1.6, 0.1]}
            radius={0.06}
            position={[0, 0.8, 0]}
            material={clay(C.wood)}
            castShadow
          />
          {/* Horizontal planks */}
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.4, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.8, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 1.2, 0]} material={clay(C.woodLight)} castShadow />
        </group>
      </group></NoMerge>

      {/* Right gate */}
      <NoMerge><group ref={rightGateRef} position={[0.55, 0, -0.8]}>
        <group position={[-0.275, 0, 0]}>
          <RoundedBox
            args={[0.55, 1.6, 0.1]}
            radius={0.06}
            position={[0, 0.8, 0]}
            material={clay(C.wood)}
            castShadow
          />
          {/* Horizontal planks */}
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.4, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 0.8, 0]} material={clay(C.woodLight)} castShadow />
          <RoundedBox args={[0.5, 0.08, 0.12]} radius={0.02} position={[0, 1.2, 0]} material={clay(C.woodLight)} castShadow />
        </group>
      </group></NoMerge>

      {/* Scattered letters on ground (before unlock) — one mesh */}
      {!unlocked && <Merged items={PAPERS} />}

      </group>
      {/* letters that never got through — one slipped under the closed gate, a few kept by the pillars */}
      <Letter position={[0, 0.008, -0.5]} rotation={[0, 0.12, 0]} />
      <Letter position={[-0.8, 0.09, -0.47]} rotation={[-0.5, 0.08, 0.06]} />
      <Letter position={[-1.35, 0.01, -0.2]} rotation={[0, 0.65, 0]} />
      <group position={[1.3, 0, -0.25]}>
        <Letter position={[0, 0.009, 0]} rotation={[0, -0.35, 0]} />
        <Letter position={[0.03, 0.027, -0.02]} rotation={[0, -0.2, 0]} seal={C.brick} />
      </group>
      <Rock position={[-1.9, 0.05, -0.9]} s={0.15} />
      <Rock position={[1.85, 0.04, 0.35]} s={0.11} color={C.earthDark} />

      {/* Stepping stones pond (after unlock) — one mesh */}
      {unlocked && (
        <group position={[0, -0.05, 0.6]}>
          <Merged items={POND} />
        </group>
      )}
      {/* a small heap of letters that never got through (kept clear of the
          obstacle's stone-step run that grows along x≈1.6..2.8, z≈-0.7..-2.4) */}
      <group position={[1.05, 0, -0.28]}>
        <Letter position={[0, 0.008, 0]} rotation={[0, 0.4, 0]} />
        <Letter position={[0.04, 0.026, -0.03]} rotation={[0, -0.3, 0.04]} seal={C.brick} />
        <Letter position={[-0.05, 0.044, 0.04]} rotation={[0, 0.9, -0.03]} />
      </group>
      </AutoMerge>

      {/* Scaffold (V4 route only — the V6 island keeps its gates bare) */}
      {IS_V4 && <Scaffold open={unlocked} position={[0, 0, -0.8]} size={[2, 2.2, 1.2]} />}
    </group>
  )
}
