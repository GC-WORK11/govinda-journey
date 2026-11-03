import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Draggable, Pop, Bob, burst, blip, chime, glowMat, pulse, REDUCED, useLocalToWorld } from '../../world/play'
import { clay, C } from '../../world/kit'

// Stream runs across the open front of the island (z≈2.05), slots at x=0.3, 1.0, 1.7
const SLOTS = [
  new THREE.Vector3(0.3, 0.07, 2.05),
  new THREE.Vector3(1.0, 0.07, 2.05),
  new THREE.Vector3(1.7, 0.07, 2.05),
]

// Letters start near the traveller at (-0.9, 0, 1.4) - spread them out more
const HOMES: [number, number, number][] = [
  [0.9, 0.55, 0.95],
  [1.55, 0.55, 1.05],
  [2.15, 0.55, 1.35],
]

export default function Play({ onWin, won }: PlayProps) {
  const [placed, setPlaced] = useState<(number | null)[]>([null, null, null])
  const winFired = useRef(false)
  const [worldRef, localToWorld] = useLocalToWorld()

  const allPlaced = placed.every((s) => s !== null)

  // Fire onWin once
  if (allPlaced && !winFired.current && !won) {
    winFired.current = true
    chime()
    setTimeout(() => onWin(), 200)
  }

  const handleDrop = (letterIdx: number) => (pos: THREE.Vector3) => {
    if (won) return false

    // Find nearest slot that is empty
    let nearest = -1
    let nearestDist = 0.7 // snap threshold

    SLOTS.forEach((slot, i) => {
      if (placed[i] !== null) return // already filled
      const d = Math.hypot(pos.x - slot.x, pos.z - slot.z)
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    })

    if (nearest >= 0) {
      // Accept drop
      blip(nearest)
      setPlaced((p) => {
        const n = [...p]
        n[nearest] = letterIdx
        return n
      })
      // Burst at the slot
      setTimeout(() => {
        burst(localToWorld(SLOTS[nearest].x, SLOTS[nearest].y + 0.12, SLOTS[nearest].z), C.waterLight, 20, 0.7)
      }, 100)
      return true
    }

    return false // spring back
  }

  return (
    <group ref={worldRef} name="L02-play">
      {/* Stream bed - a shallow curved depression across the island */}
      <mesh position={[1.0, 0.03, 2.05]} rotation={[-Math.PI / 2, 0, -0.08]} scale={[1.42, 0.44, 1]} receiveShadow>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color={C.earth} roughness={0.7} />
      </mesh>

      {/* Water surface */}
      <mesh position={[1.0, 0.045, 2.05]} rotation={[-Math.PI / 2, 0, -0.08]} scale={[1.32, 0.36, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial
          color={C.waterLight}
          roughness={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Slot indicators (glow when hovered) */}
      {SLOTS.map((slot, i) => (
        <SlotGlow key={i} position={slot.toArray()} filled={placed[i] !== null} won={won} />
      ))}

      {/* Stepping stones (appear when letters are placed) */}
      {placed.map((letterIdx, slotIdx) => {
        if (letterIdx === null) return null
        return (
          <Stone key={`stone-${slotIdx}`} position={SLOTS[slotIdx].toArray()} won={won} delay={slotIdx * 0.1} />
        )
      })}

      {/* Draggable letters */}
      {HOMES.map((home, i) => {
        const slotIdx = placed.indexOf(i)
        if (slotIdx >= 0) return null // already placed

        return (
          <Draggable
            key={i}
            home={home}
            y={0.4}
            onDrop={handleDrop(i)}
            disabled={won}
            lift={0.2}
          >
            <group name={`letter-${i}`}>
              <Bob amp={0.1} speed={1.3 + i * 0.3} phase={i * 1.2}>
                <Letter />
              </Bob>
            </group>
          </Draggable>
        )
      })}
    </group>
  )
}

function Letter() {
  return (
    <group>
      {/* Envelope body - bigger for tapping */}
      <RoundedBox
        args={[0.5, 0.35, 0.06]}
        radius={0.02}
        material={clay(C.paper)}
        castShadow
      />
      {/* Wax seal */}
      <mesh position={[0, 0, 0.04]} material={clay(C.terracotta)} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.025, 16]} />
      </mesh>
      {/* Seal detail */}
      <mesh position={[0, 0, 0.053]} material={clay(C.brick)} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.005, 8]} />
      </mesh>
    </group>
  )
}

function SlotGlow({ position, filled, won }: { position: [number, number, number]; filled: boolean; won: boolean }) {
  const matRef = useRef(glowMat(C.terracotta, C.sand))

  useFrame((state, dt) => {
    if (!matRef.current) return
    const on = !filled && !won
    pulse(matRef.current, on, state.clock.elapsedTime, dt)
  })

  if (filled) return null

  return (
    <mesh position={[position[0], position[1] + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]} material={matRef.current}>
      <circleGeometry args={[0.25, 32]} />
    </mesh>
  )
}

function Stone({ position, won, delay }: { position: [number, number, number]; won: boolean; delay: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const t = useRef(0)

  useFrame((state, dt) => {
    if (!groupRef.current) return
    t.current += dt

    if (t.current < delay) {
      groupRef.current.scale.setScalar(0.0001)
      return
    }

    // Pop in with squash-stretch
    const elapsed = t.current - delay
    if (elapsed < 0.4) {
      const s = Math.min(1, elapsed / 0.15)
      const sq = 1 + (1 - s) * 0.4 // squash factor
      groupRef.current.scale.set(sq, Math.max(0.0001, s * (2 - s)), sq)
    } else if (won && elapsed > 0.5) {
      // Payoff: gentle settle
      const wobble = Math.exp(-(elapsed - 0.5) * 4) * Math.sin((elapsed - 0.5) * 20) * 0.05
      groupRef.current.scale.set(1 + wobble, 1 - wobble * 0.5, 1 + wobble)
    } else {
      groupRef.current.scale.set(1, 1, 1)
    }
  })

  return (
    <Pop delay={delay}>
      <group ref={groupRef} position={position}>
        <mesh material={clay(C.stone)} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.12, 16]} />
        </mesh>
        <mesh position={[0, 0.065, 0]} material={clay(C.sand)} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.01, 16]} />
        </mesh>
      </group>
    </Pop>
  )
}
