import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { useHoldAnywhere, Bob, Pop, glowMat, pulse, blip, chime, burst, useLocalToWorld, REDUCED } from '../../world/play'
import { C, clay } from '../../world/kit'

const LOTUS_POS: [number, number, number] = [0, 0.12, -0.75]
const PETAL_COUNT = 8
const LAMP_POSITIONS: [number, number, number][] = [
  [-0.48, 0.1, -0.95],
  [0.32, 0.1, -1.12],
  [0.52, 0.1, -0.58],
]

/** A single lotus petal that opens/closes. */
function Petal({ index, open, won }: { index: number; open: number; won: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const angle = (index / PETAL_COUNT) * Math.PI * 2
  const innerLayer = index % 2 === 0
  
  useFrame((_, dt) => {
    if (!ref.current) return
    const target = won ? 1 : open
    const current = ref.current.userData.openness ?? 0
    ref.current.userData.openness = THREE.MathUtils.lerp(current, target, Math.min(1, dt * (won ? 2.5 : 3.5)))
    
    const o = ref.current.userData.openness
    const maxAngle = innerLayer ? Math.PI * 0.38 : Math.PI * 0.52
    const offsetY = innerLayer ? 0.05 : 0
    const scale = innerLayer ? 0.75 : 0.9
    
    ref.current.rotation.x = -o * maxAngle
    ref.current.position.y = offsetY + o * (innerLayer ? 0.08 : 0.15)
    ref.current.scale.setScalar(scale + o * (innerLayer ? 0.1 : 0.15))
  })
  
  return (
    <group rotation={[0, angle, 0]}>
      <group ref={ref} position={[0, innerLayer ? 0.05 : 0, innerLayer ? 0.09 : 0.12]}>
        <mesh
          material={clay(innerLayer ? C.paper : C.cream)}
          castShadow
        >
          <sphereGeometry args={[0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        </mesh>
      </group>
    </group>
  )
}

/** Central lotus stamens. */
function Center({ open, won }: { open: number; won: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => glowMat('#f0b860', '#e9a85c'), [])
  
  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    const target = won ? 1 : open
    const current = ref.current.userData.openness ?? 0
    ref.current.userData.openness = THREE.MathUtils.lerp(current, target, Math.min(1, dt * (won ? 2.5 : 3.5)))
    
    const o = ref.current.userData.openness
    ref.current.position.y = o * 0.16
    ref.current.scale.setScalar(0.7 + o * 0.5)
    
    pulse(mat, o > 0.5, clock.elapsedTime, dt, '#f3d58c')
  })
  
  return (
    <mesh ref={ref} position={[0, 0.08, 0]} material={mat} castShadow>
      <sphereGeometry args={[0.045, 12, 10]} />
    </mesh>
  )
}

/** The halo ring that expands as you hold. */
function Halo({ open, won }: { open: number; won: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f0b860',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), [])
  
  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    const target = won ? 1 : open
    const current = ref.current.userData.openness ?? 0
    ref.current.userData.openness = THREE.MathUtils.lerp(current, target, Math.min(1, dt * (won ? 2.5 : 3)))
    
    const o = ref.current.userData.openness
    const baseScale = 0.35
    const targetScale = baseScale + o * 0.28
    ref.current.scale.setScalar(targetScale)
    
    mat.opacity = o * 0.35 * (1 - o * 0.3)
    if (!REDUCED) {
      mat.opacity *= 0.85 + Math.sin(clock.elapsedTime * 2.5) * 0.15
    }
  })
  
  return (
    <mesh ref={ref} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <ringGeometry args={[0.86, 1, 48]} />
    </mesh>
  )
}

/** A floating lamp/petal that lights up after each breath. */
function Lamp({ position, lit, index }: { position: [number, number, number]; lit: boolean; index: number }) {
  const mat = useMemo(() => glowMat('#f0b860', C.paper), [])
  
  useFrame(({ clock }, dt) => {
    pulse(mat, lit, clock.elapsedTime + index * 0.7, dt, '#f3d58c')
  })
  
  return (
    <Bob amp={0.05} speed={1.4} phase={index * 1.2}>
      <Pop delay={index * 0.15}>
        <mesh position={position} material={mat} castShadow>
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
      </Pop>
    </Bob>
  )
}

/** A ripple ring that spreads when you release a breath. */
function Ripple({ trigger }: { trigger: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: C.water,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), [])
  
  useFrame((_, dt) => {
    if (!ref.current || trigger === 0) return
    
    const elapsed = performance.now() / 1000 - trigger
    if (elapsed < 0 || elapsed > 1.2) {
      mat.opacity = 0
      return
    }
    
    const progress = elapsed / 1.2
    ref.current.scale.setScalar(0.3 + progress * 0.8)
    mat.opacity = 0.5 * (1 - progress)
  })
  
  return (
    <mesh ref={ref} position={[LOTUS_POS[0], 0.085, LOTUS_POS[2]]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <ringGeometry args={[0.85, 0.96, 48]} />
    </mesh>
  )
}

export default function Play({ onWin, won }: PlayProps) {
  const holding = useHoldAnywhere(!won)
  const [breathCount, setBreathCount] = useState(0)
  const [holdProgress, setHoldProgress] = useState(0)
  const [rippleTrigger, setRippleTrigger] = useState(0)
  const holdStartRef = useRef(0)
  const lastHoldingRef = useRef(false)
  const [groupRef, localToWorld] = useLocalToWorld()
  const hasWonRef = useRef(false)
  
  useFrame((_, dt) => {
    if (won || hasWonRef.current) return
    
    if (holding) {
      if (!lastHoldingRef.current) {
        holdStartRef.current = 0
      }
      holdStartRef.current += dt
      const progress = Math.min(1, holdStartRef.current / 2.5)
      setHoldProgress(progress)
      
      // Full breath
      if (progress >= 1 && holdProgress < 1) {
        blip(breathCount)
      }
    } else {
      // Released
      if (lastHoldingRef.current && holdStartRef.current > 0) {
        const wasFullBreath = holdProgress >= 0.98
        
        if (wasFullBreath) {
          const newCount = breathCount + 1
          setBreathCount(newCount)
          
          // Ripple effect
          setRippleTrigger(performance.now() / 1000)
          
          // Burst at lotus position
          const worldPos = localToWorld(LOTUS_POS[0], LOTUS_POS[1] + 0.2, LOTUS_POS[2])
          burst(worldPos, '#f3d58c', 16, 0.6)
          
          if (newCount >= 3) {
            chime()
            hasWonRef.current = true
            setTimeout(() => onWin(), 100)
          } else {
            blip(newCount)
          }
        }
      }
      
      // Ease back down
      holdStartRef.current = Math.max(0, holdStartRef.current - dt * 2.2)
      setHoldProgress(Math.max(0, holdProgress - dt * 2.2))
    }
    
    lastHoldingRef.current = holding
  })
  
  return (
    <group ref={groupRef}>
      {/* Lotus */}
      <group position={LOTUS_POS} scale={2.2}>
        {Array.from({ length: PETAL_COUNT }, (_, i) => (
          <Petal key={i} index={i} open={holdProgress} won={won} />
        ))}
        <Center open={holdProgress} won={won} />
      </group>
      
      {/* Halo ring */}
      <Halo open={holdProgress} won={won} />
      
      {/* Floating lamps */}
      {LAMP_POSITIONS.map((pos, i) => (
        <Lamp key={i} position={pos} lit={i < breathCount} index={i} />
      ))}
      
      {/* Ripple */}
      <Ripple trigger={rippleTrigger} />
      
      {/* Fireflies (payoff) */}
      {won && (
        <Sparkles
          count={REDUCED ? 8 : 16}
          position={[LOTUS_POS[0], LOTUS_POS[1] + 0.3, LOTUS_POS[2]]}
          scale={[0.8, 0.6, 0.8]}
          size={2.5}
          speed={0.3}
          opacity={0.8}
          color="#f3d58c"
        />
      )}
    </group>
  )
}
