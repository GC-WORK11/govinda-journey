import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Tappable, Pop, Bob, burst, blip, chime, glowMat, pulse } from '../../world/play'

/* Placeholder until this level's real in-world game lands: tap the three warm stones. */
export default function Play({ onWin, won }: PlayProps) {
  const [lit, setLit] = useState<boolean[]>([false, false, false])
  const mats = useRef([0, 1, 2].map(() => glowMat('#f2b35e', '#b49a80')))
  const g = useRef<THREE.Group>(null)
  useFrame((s, dt) => mats.current.forEach((m, i) => pulse(m, lit[i], s.clock.elapsedTime, dt)))
  const P: [number, number, number][] = [[0.9, 0.35, 1.5], [1.6, 0.35, 0.6], [0.2, 0.35, 2.1]]
  return (
    <group ref={g}>
      {P.map((p, i) => (
        <Pop key={i} delay={i * 0.12} position={p}>
          <Bob phase={i}>
            <Tappable disabled={lit[i] || won} onTap={() => {
              const n = lit.map((v, j) => v || j === i); setLit(n); blip(n.filter(Boolean).length)
              if (g.current) burst(g.current.localToWorld(new THREE.Vector3(...p)), '#f2b35e', 14, 0.6)
              if (n.every(Boolean)) { chime(); onWin() }
            }}>
              <mesh material={mats.current[i]} castShadow><icosahedronGeometry args={[0.2, 1]} /></mesh>
            </Tappable>
          </Bob>
        </Pop>
      ))}
    </group>
  )
}
