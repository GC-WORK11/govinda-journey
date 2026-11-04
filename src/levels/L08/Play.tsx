import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Tappable, Pop, burst, blip, chime, glowMat, pulse, REDUCED, useLocalToWorld } from '../../world/play'
import { clay, C, blobMat } from '../../world/kit'

/* L08 "Sign Flow" — the laptop projects a glowing hand sign; tap the floating clay
   hand that matches it. The right hand flies into the screen and a letter-tile pops. */

type Pose = 'palm' | 'fist' | 'peace' | 'point'

const HAND_C = '#d9825b'
const CAM_YAW = 0.62 // face the camera (it sits at +x,+z)

const ROUNDS: { target: Pose; hands: Pose[] }[] = [
  { target: 'peace', hands: ['palm', 'peace', 'fist'] },
  { target: 'palm', hands: ['point', 'palm', 'fist'] },
  { target: 'point', hands: ['peace', 'fist', 'point'] },
]

const SLOTS = [
  new THREE.Vector3(-0.35, 0.6, 2.0),
  new THREE.Vector3(0.6, 0.68, 2.2),
  new THREE.Vector3(1.6, 0.6, 1.95),
]
const GHOST_POS = new THREE.Vector3(0.47, 0.46, 1.3)
const HAND_SCALE = 1.25

// index -> pinky: knuckle x, capsule radius, finger length
const FINGERS = [
  { x: -0.115, w: 0.046, len: 0.235 },
  { x: -0.038, w: 0.049, len: 0.265 },
  { x: 0.04, w: 0.047, len: 0.245 },
  { x: 0.118, w: 0.041, len: 0.185 },
]
// curl per finger (0 = straight, ~1.5 = folded over the palm), sideways lean, thumb pose
const POSES: Record<Pose, { c: number[]; l: number[]; thumb: [number, number, number]; tc: number }> = {
  palm: { c: [0.08, 0.05, 0.07, 0.12], l: [-0.2, -0.06, 0.07, 0.24], thumb: [0.15, 0, 0.95], tc: 0.1 },
  fist: { c: [1.45, 1.5, 1.5, 1.45], l: [-0.04, 0, 0.01, 0.05], thumb: [0.6, 0, 1.35], tc: 1.15 },
  peace: { c: [0.05, 0.05, 1.5, 1.55], l: [-0.19, 0.17, 0, 0], thumb: [0.35, 0, 1.05], tc: 0.5 },
  point: { c: [0.05, 1.5, 1.5, 1.5], l: [-0.07, 0, 0, 0.06], thumb: [0.2, 0, 1.15], tc: 0.45 },
}

function HandMeshes({ pose, mat, solid = true }: { pose: Pose; mat: THREE.Material; solid?: boolean }) {
  const d = POSES[pose]
  return (
    <group>
      <mesh position={[0, -0.02, 0]} material={mat} castShadow={solid}>
        <capsuleGeometry args={[0.1, 0.2, 4, 10]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} scale={[1.14, 1.25, 0.62]} material={mat} castShadow={solid}>
        <sphereGeometry args={[0.155, 18, 14]} />
      </mesh>
      {FINGERS.map((f, i) => (
        <group key={i} position={[f.x, 0.36, 0]} rotation={[0, 0, d.l[i]]}>
          <group rotation={[d.c[i], 0, 0]}>
            <mesh position={[0, f.len * 0.27, 0]} material={mat} castShadow={solid}>
              <capsuleGeometry args={[f.w, f.len * 0.5, 4, 10]} />
            </mesh>
            <group position={[0, f.len * 0.54, 0]} rotation={[d.c[i] * 0.85, 0, 0]}>
              <mesh position={[0, f.len * 0.23, 0]} material={mat} castShadow={solid}>
                <capsuleGeometry args={[f.w * 0.86, f.len * 0.4, 4, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
      <group position={[-0.15, 0.16, 0.03]} rotation={d.thumb}>
        <mesh position={[0, 0.08, 0]} material={mat} castShadow={solid}>
          <capsuleGeometry args={[0.052, 0.15, 4, 10]} />
        </mesh>
        <group position={[0, 0.18, 0]} rotation={[d.tc, 0, 0]}>
          <mesh position={[0, 0.05, 0]} material={mat} castShadow={solid}>
            <capsuleGeometry args={[0.045, 0.11, 4, 10]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function FloatingHand({ pose, slot, lean, mat, flying, wobble, settled, disabled, onTap, onArrived }: {
  pose: Pose; slot: THREE.Vector3; lean: number; mat: THREE.Material; flying: boolean; wobble: number;
  settled: boolean; disabled: boolean; onTap: () => void; onArrived: () => void
}) {
  const g = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const st = useRef({ t: Math.random() * 6, fly: 0, wob: -1, seen: 0, done: false })
  useFrame((_, dt) => {
    const o = g.current
    if (!o) return
    const k = st.current
    k.t += dt
    if (flying) {
      if (k.done) return
      k.fly = Math.min(1, k.fly + dt * 1.6)
      const e = 1 - Math.pow(1 - k.fly, 3)
      o.position.lerpVectors(slot, GHOST_POS, e)
      o.scale.setScalar(1 - e * 0.75)
      o.rotation.y = CAM_YAW + e * 2.6
      if (k.fly >= 1) { k.done = true; onArrived() }
      return
    }
    const rest = settled ? slot.y - 0.16 : slot.y
    const bob = REDUCED || settled ? 0 : Math.sin(k.t * 1.8 + slot.x * 3) * 0.05
    o.position.set(slot.x, THREE.MathUtils.lerp(o.position.y, rest + bob, Math.min(1, dt * 8)), slot.z)
    if (wobble !== k.seen) { k.seen = wobble; k.wob = 0 }
    if (k.wob >= 0 && k.wob < 0.55) {
      k.wob += dt
      if (inner.current) inner.current.rotation.z = Math.sin(k.wob * 26) * 0.32 * Math.max(0, 1 - k.wob / 0.55)
    }
  })
  return (
    <group ref={g} position={slot.toArray()} rotation={[0.12, CAM_YAW, lean]}>
      <Tappable onTap={onTap} disabled={disabled || flying}>
        <group ref={inner}>
          <group scale={HAND_SCALE}>
            <HandMeshes pose={pose} mat={mat} />
          </group>
        </group>
        {/* fat invisible target: taps anywhere near the hand count */}
        <mesh name={`l08-hand-${pose}`} position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.34, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Tappable>
    </group>
  )
}

const KEYS: [number, number][] = []
for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) KEYS.push([c * 0.075 - 0.19, r * 0.055 - 0.12])
const TILE_C = [C.leaf, C.terracotta, C.water]

function Laptop({ progress, won }: { progress: number; won: boolean }) {
  const screen = useRef<THREE.MeshStandardMaterial>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const st = useRef({ flash: 0, last: 0 })
  useFrame((s, dt) => {
    const k = st.current
    if (progress !== k.last) { k.last = progress; k.flash = 1 }
    k.flash = Math.max(0, k.flash - dt * 1.5)
    const t = s.clock.elapsedTime
    if (screen.current) {
      screen.current.emissiveIntensity = (won ? 0.65 : 0.12) + k.flash * 1.5
      screen.current.emissive.set(won ? '#a9c78a' : '#f2b35e')
    }
    if (led.current) {
      led.current.emissiveIntensity = 0.55 + k.flash * 2.2 + (REDUCED ? 0 : Math.sin(t * 2.4) * 0.2 + 0.2)
    }
  })
  return (
    <group position={[0.55, 0.36, 1.35]} rotation={[0, CAM_YAW, 0]}>
      <RoundedBox args={[0.62, 0.04, 0.44]} radius={0.02} position={[0, 0.02, 0]} material={clay(C.stoneLight)} castShadow />
      {KEYS.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.043, z]}>
          <boxGeometry args={[0.05, 0.006, 0.038]} />
          <meshStandardMaterial color={C.stone} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.043, 0.14]}>
        <boxGeometry args={[0.17, 0.006, 0.08]} />
        <meshStandardMaterial color={C.stone} roughness={0.8} />
      </mesh>
      <group position={[0, 0.045, -0.185]} rotation={[-0.42, 0, 0]}>
        <RoundedBox args={[0.62, 0.46, 0.028]} radius={0.03} position={[0, 0.24, 0]} material={clay('#463e39')} castShadow />
        <mesh position={[0, 0.24, 0.016]}>
          <planeGeometry args={[0.54, 0.37]} />
          <meshStandardMaterial ref={screen} color="#2b2420" emissive="#f2b35e" emissiveIntensity={0.12} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.435, 0.016]}>
          <sphereGeometry args={[0.013, 8, 8]} />
          <meshStandardMaterial ref={led} color="#241f1c" emissive="#f2b35e" emissiveIntensity={0.6} />
        </mesh>
        {[0, 1, 2].map((i) => i < progress && (
          <Pop key={i} delay={0.05}>
            <RoundedBox args={[0.11, 0.075, 0.014]} radius={0.015}
              position={[-0.15 + i * 0.15, 0.22, 0.024]} material={clay(TILE_C[i])} />
          </Pop>
        ))}
      </group>
    </group>
  )
}

function GhostFloat({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    const o = g.current
    if (!o) return
    const t = s.clock.elapsedTime
    o.position.y = REDUCED ? 0 : Math.sin(t * 1.7) * 0.04
    o.scale.setScalar(0.8 * (REDUCED ? 1 : 1 + Math.sin(t * 2.3) * 0.035))
  })
  return <group ref={g} scale={0.8}>{children}</group>
}

function WaveIn({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const t0 = useRef(0)
  useFrame((s, dt) => {
    const o = g.current
    if (!o) return
    t0.current += dt
    const e = Math.min(1, t0.current / 0.45)
    o.scale.setScalar(0.72 * e * (2 - e))
    o.rotation.z = REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 5) * 0.3 * e
  })
  return <group ref={g}>{children}</group>
}

/** ?qa hook: taps the hand the laptop asks for (real tap path, no state poke). */
export const l08qa = { tapTarget: null as null | (() => void) }

export default function Play({ onWin, won }: PlayProps) {
  const [round, setRound] = useState(0)
  const [absorb, setAbsorb] = useState<Pose | null>(null)
  const [done, setDone] = useState(0)
  const [wob, setWob] = useState<Partial<Record<Pose, number>>>({})
  const [worldRef, toWorld] = useLocalToWorld()
  const winOnce = useRef(false)

  const handMat = useMemo(() => clay(HAND_C), [])
  const ghostMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffe3ba', emissive: new THREE.Color('#f0a95e'), emissiveIntensity: 1,
    transparent: true, opacity: 0.6, roughness: 0.6, depthWrite: false,
  }), [])
  const discMats = useMemo(() => SLOTS.map(() => glowMat('#f2b35e', '#d8c8ae')), [])

  const cfg = ROUNDS[Math.min(round, ROUNDS.length - 1)]
  const absorbedSlot = absorb ? cfg.hands.indexOf(absorb) : -1

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    pulse(ghostMat, !absorb && !won, t, dt)
    discMats.forEach((m, i) => pulse(m, !absorb && !won && i !== absorbedSlot, t, dt))
  })

  const tap = (pose: Pose) => {
    if (won || absorb) return
    if (pose === cfg.target) {
      setAbsorb(pose)
      blip(done + 2)
    } else {
      setWob((w) => ({ ...w, [pose]: (w[pose] || 0) + 1 }))
      blip(0)
    }
  }

  l08qa.tapTarget = () => tap(cfg.target)

  const arrived = () => {
    burst(toWorld(GHOST_POS.x, GHOST_POS.y + 0.35, GHOST_POS.z), '#f2b35e', 24, 0.9)
    const d = done + 1
    setDone(d)
    if (d >= ROUNDS.length) {
      if (!winOnce.current) { winOnce.current = true; chime(); setTimeout(onWin, 550) }
    } else {
      blip(d + 2)
      setTimeout(() => { setAbsorb(null); setRound(d) }, 600)
    }
  }

  return (
    <group ref={worldRef}>
      {/* little wooden crate the laptop sits on */}
      <RoundedBox args={[0.8, 0.36, 0.56]} radius={0.05} position={[0.55, 0.18, 1.35]}
        material={clay(C.woodLight)} castShadow receiveShadow />
      <mesh position={[0.55, 0.22, 1.64]} material={clay(C.wood)}>
        <sphereGeometry args={[0.035, 10, 8]} />
      </mesh>

      <Laptop progress={done} won={won} />

      {/* warm pads under each floating hand */}
      {SLOTS.map((s, i) => (
        <group key={'d' + i} position={[s.x, 0.02, s.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]} material={blobMat()}>
            <circleGeometry args={[0.34, 20]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={discMats[i]}>
            <circleGeometry args={[0.25, 24]} />
          </mesh>
        </group>
      ))}

      {/* the sign the laptop asks for */}
      {!absorb && !won && (
        <group name={`l08-ghost-${cfg.target}`} position={GHOST_POS.toArray()} rotation={[0, CAM_YAW, 0]}>
          <GhostFloat><HandMeshes pose={cfg.target} mat={ghostMat} solid={false} /></GhostFloat>
          <Sparkles count={9} scale={[0.55, 0.7, 0.35]} size={3.2} speed={0.45} position={[0, 0.32, 0]} color="#f2b35e" />
        </group>
      )}

      {/* the three candidate hands */}
      {cfg.hands.map((pose, i) => (
        <Pop key={round + '-' + pose} delay={0.15 + i * 0.1}>
          <FloatingHand
            pose={pose} slot={SLOTS[i]} lean={(i - 1) * 0.07} mat={handMat}
            flying={absorb === pose} wobble={wob[pose] || 0} settled={won}
            disabled={won || !!absorb} onTap={() => tap(pose)} onArrived={arrived}
          />
        </Pop>
      ))}

      {/* payoff: the learned sign waves back from the screen */}
      {won && (
        <group position={[GHOST_POS.x, GHOST_POS.y - 0.04, GHOST_POS.z]} rotation={[0, CAM_YAW, 0]}>
          <WaveIn><HandMeshes pose="palm" mat={ghostMat} solid={false} /></WaveIn>
        </group>
      )}
      {won && <Sparkles count={30} scale={[1.6, 1.2, 1.4]} position={[0.5, 1.05, 1.4]} size={4.5} speed={0.55} color="#f2b35e" />}
    </group>
  )
}
