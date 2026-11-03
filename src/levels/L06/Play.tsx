import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Tappable, burst, blip, chime, glowMat, pulse, Pop, Bob, useLocalToWorld } from '../../world/play'
import { clay, C } from '../../world/kit'

// Task button glyphs: leaf, gear, check
function LeafGlyph() {
  return (
    <group>
      <mesh position={[0, 0.01, 0]}>
        <capsuleGeometry args={[0.05, 0.14, 4, 8]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0.03, 0.05, 0]} rotation={[0, 0, -0.6]}>
        <capsuleGeometry args={[0.025, 0.08, 3, 6]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
    </group>
  )
}

function GearGlyph() {
  const teeth = 8
  return (
    <group>
      {/* Center */}
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
      {/* Teeth */}
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]}>
            <boxGeometry args={[0.04, 0.04, 0.06]} />
            <meshStandardMaterial color={C.cream} roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

function CheckGlyph() {
  return (
    <group>
      <mesh position={[-0.03, -0.02, 0]} rotation={[0, 0, -0.7]}>
        <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0.04, 0.04, 0]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.03, 0.14, 4, 8]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
    </group>
  )
}

// Flying orb particle from phone to laptop
type Orb = { t: number; from: THREE.Vector3; to: THREE.Vector3; color: string; id: number }

export default function Play({ onWin, won }: PlayProps) {
  const [completed, setCompleted] = useState<number[]>([])
  const [orbs, setOrbs] = useState<Orb[]>([])
  const orbIdRef = useRef(0)
  const laptopScreenRef = useRef<THREE.Mesh>(null!)
  const [worldRef, toWorld] = useLocalToWorld()
  const [laptopWorking, setLaptopWorking] = useState(false)
  const workStartRef = useRef(0)
  const wonRef = useRef(false)

  // Task button colors and glyphs
  const tasks = useMemo(
    () => [
      { color: '#8fb36b', glyph: LeafGlyph, pos: [0, 0.28, 0] as [number, number, number], name: 'leaf' },
      { color: '#d9825b', glyph: GearGlyph, pos: [0, 0.08, 0] as [number, number, number], name: 'gear' },
      { color: '#8fc1c9', glyph: CheckGlyph, pos: [0, -0.12, 0] as [number, number, number], name: 'check' },
    ],
    []
  )

  const handleTap = (idx: number) => {
    if (won || completed.includes(idx)) return
    
    // Launch orb from phone to laptop
    const phonePos = new THREE.Vector3(0.25, 0.75, 1.9)
    const laptopPos = new THREE.Vector3(1.95, 0.55, 0.35)
    
    setOrbs((prev) => [
      ...prev,
      { t: 0, from: phonePos, to: laptopPos, color: tasks[idx].color, id: orbIdRef.current++ },
    ])
    
    blip(idx)
  }

  // Glow materials for buttons
  const glowMats = useMemo(
    () => tasks.map((t) => glowMat(t.color, t.color)),
    [tasks]
  )

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime

    // Pulse buttons that aren't completed yet
    tasks.forEach((_, i) => {
      if (!completed.includes(i) && !won) {
        pulse(glowMats[i], true, t, dt, tasks[i].color)
      } else {
        pulse(glowMats[i], false, t, dt)
      }
    })

    // Update orbs
    setOrbs((prev) => {
      const next = prev
        .map((orb) => ({ ...orb, t: orb.t + dt * 0.8 }))
        .filter((orb) => {
          if (orb.t >= 1) {
            // Orb arrived at laptop
            const idx = tasks.findIndex((t) => t.color === orb.color)
            if (idx !== -1 && !completed.includes(idx)) {
              setCompleted((c) => {
                const newCompleted = [...c, idx]
                if (newCompleted.length === 3 && !wonRef.current) {
                  wonRef.current = true
                  setTimeout(() => {
                    chime()
                    burst(toWorld(1.95, 0.55, 0.35), C.leaf, 16, 0.8)
                    onWin()
                  }, 800)
                }
                return newCompleted
              })
              setLaptopWorking(true)
              workStartRef.current = t
              blip(idx + 1)
            }
            return false
          }
          return true
        })
      return next
    })

    // Laptop screen working animation
    if (laptopScreenRef.current) {
      if (laptopWorking && t - workStartRef.current < 1.5) {
        const mat = laptopScreenRef.current.material as THREE.MeshStandardMaterial
        const flicker = 0.8 + Math.sin(t * 20) * 0.15
        mat.emissive.setStyle(completed.length === 3 ? C.leaf : '#f3d58c')
        mat.emissiveIntensity = flicker * 0.6
      } else if (laptopWorking && t - workStartRef.current >= 1.5) {
        setLaptopWorking(false)
        const mat = laptopScreenRef.current.material as THREE.MeshStandardMaterial
        mat.emissive.setStyle(C.leaf)
        mat.emissiveIntensity = 0.4
      } else if (completed.length > 0) {
        const mat = laptopScreenRef.current.material as THREE.MeshStandardMaterial
        mat.emissive.setStyle(C.leaf)
        mat.emissiveIntensity = 0.3
      }
    }
  })

  return (
    <group ref={worldRef}>
      {/* Phone near traveller */}
      <Pop delay={0.1}>
        <Bob amp={0.04} speed={1.8} phase={0}>
          <group position={[0.25, 0.7, 1.9]} rotation={[0, 0.6, 0]} scale={1.35}>
            {/* Phone body */}
            <RoundedBox
              args={[0.42, 0.9, 0.08]}
              radius={0.06}
              smoothness={4}
              material={clay(C.stone)}
              castShadow
            />
            {/* Screen background */}
            <RoundedBox
              args={[0.36, 0.78, 0.01]}
              radius={0.04}
              smoothness={4}
              position={[0, 0, 0.041]}
            >
              <meshStandardMaterial color={C.ink} roughness={0.3} />
            </RoundedBox>

            {/* Task buttons */}
            {tasks.map((task, i) => (
              <Tappable
                key={i}
                position={[0, task.pos[1], 0.08]}
                onTap={() => handleTap(i)}
                disabled={won || completed.includes(i)}
              >
                <group name={task.name}>
                  <RoundedBox
                    args={[0.28, 0.16, 0.04]}
                    radius={0.03}
                    smoothness={4}
                    material={glowMats[i]}
                    castShadow
                  />
                  {/* Check mark overlay when completed */}
                  {completed.includes(i) && (
                    <group position={[0, 0, 0.025]}>
                      <mesh position={[-0.02, -0.01, 0]} rotation={[0, 0, -0.7]}>
                        <capsuleGeometry args={[0.015, 0.04, 3, 6]} />
                        <meshStandardMaterial color={C.cream} roughness={0.9} />
                      </mesh>
                      <mesh position={[0.03, 0.02, 0]} rotation={[0, 0, 0.5]}>
                        <capsuleGeometry args={[0.015, 0.07, 3, 6]} />
                        <meshStandardMaterial color={C.cream} roughness={0.9} />
                      </mesh>
                    </group>
                  )}
                  {/* Original glyph (hidden when completed) */}
                  {!completed.includes(i) && (
                    <group position={[0, 0, 0.025]} scale={0.7}>
                      <task.glyph />
                    </group>
                  )}
                </group>
              </Tappable>
            ))}
          </group>
        </Bob>
      </Pop>

      {/* Laptop on the island */}
      <Pop delay={0.3}>
        <group position={[1.95, 0, 0.35]} rotation={[0, 0.2, 0]} scale={1.7}>
          {/* Laptop base */}
          <RoundedBox
            args={[0.5, 0.03, 0.38]}
            radius={0.015}
            position={[0, 0.015, 0]}
            material={clay(C.stoneLight)}
            castShadow
          />
          {/* Keyboard detail */}
          {Array.from({ length: 3 }).map((_, row) =>
            Array.from({ length: 6 }).map((_, col) => (
              <mesh
                key={`${row}-${col}`}
                position={[-0.15 + col * 0.06, 0.035, -0.08 + row * 0.055]}
              >
                <boxGeometry args={[0.045, 0.008, 0.04]} />
                <meshStandardMaterial color={C.stone} roughness={0.8} />
              </mesh>
            ))
          )}

          {/* Laptop screen */}
          <RoundedBox
            args={[0.5, 0.34, 0.02]}
            radius={0.015}
            position={[0, 0.2, -0.15]}
            rotation={[-0.3, 0, 0]}
            material={clay(C.stone)}
            castShadow
          />
          {/* Screen display */}
          <mesh
            ref={laptopScreenRef}
            position={[0, 0.2, -0.14]}
            rotation={[-0.3, 0, 0]}
          >
            <planeGeometry args={[0.42, 0.28]} />
            <meshStandardMaterial
              color={C.ink}
              emissive={C.leaf}
              emissiveIntensity={0}
              roughness={0.4}
            />
          </mesh>

          {/* Working blocks animation on screen */}
          {laptopWorking &&
            Array.from({ length: 5 }).map((_, i) => (
              <Pop key={i} delay={i * 0.15} from={0}>
                <mesh
                  position={[-0.12 + i * 0.06, 0.16, -0.13]}
                  rotation={[-0.3, 0, 0]}
                >
                  <boxGeometry args={[0.04, 0.04, 0.01]} />
                  <meshStandardMaterial color={C.leaf} roughness={0.7} />
                </mesh>
              </Pop>
            ))}
        </group>
      </Pop>

      {/* Flying orbs */}
      {orbs.map((orb) => {
        // Bezier curve arc
        const t = Math.min(1, orb.t)
        const start = orb.from
        const end = orb.to
        const mid = new THREE.Vector3(
          (start.x + end.x) / 2,
          Math.max(start.y, end.y) + 0.8,
          (start.z + end.z) / 2
        )

        const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * mid.x + t * t * end.x
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * mid.y + t * t * end.y
        const z = (1 - t) * (1 - t) * start.z + 2 * (1 - t) * t * mid.z + t * t * end.z

        return (
          <group key={orb.id} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial
                color={orb.color}
                emissive={orb.color}
                emissiveIntensity={0.8}
                roughness={0.4}
              />
            </mesh>
            {/* Trail sparkles */}
            {Array.from({ length: 3 }).map((_, i) => {
              const trailT = Math.max(0, t - i * 0.08)
              const tx =
                (1 - trailT) * (1 - trailT) * start.x +
                2 * (1 - trailT) * trailT * mid.x +
                trailT * trailT * end.x
              const ty =
                (1 - trailT) * (1 - trailT) * start.y +
                2 * (1 - trailT) * trailT * mid.y +
                trailT * trailT * end.y
              const tz =
                (1 - trailT) * (1 - trailT) * start.z +
                2 * (1 - trailT) * trailT * mid.z +
                trailT * trailT * end.z

              return trailT > 0 ? (
                <mesh key={i} position={[tx - x, ty - y, tz - z]}>
                  <sphereGeometry args={[0.035 * (1 - i * 0.3), 8, 8]} />
                  <meshBasicMaterial
                    color={orb.color}
                    transparent
                    opacity={0.5 * (1 - i * 0.3)}
                  />
                </mesh>
              ) : null
            })}
          </group>
        )
      })}
    </group>
  )
}
