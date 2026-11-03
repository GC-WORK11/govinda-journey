import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Bob, Draggable, burst, blip, chime, REDUCED, springStep } from '../../world/play'
import { C, clay } from '../../world/kit'

/* Three air sensors, three glowing street spots, a smog cloud that lifts where they land. */
const SPOTS: [number, number, number][] = [
  [-0.45, 0.08, 0.35],
  [0.5, 0.08, 1.9],
  [1.95, 0.08, 1.32],
]
const HOMES: [number, number, number][] = [
  [-1.92, 0.16, 1.18],
  [-1.5, 0.16, 1.82],
  [-0.86, 0.16, 2.02],
]
const TINTS = ['#96bd75', '#e2bd7c', '#aac882']
const DROP_R = 0.7

export default function Play({ onWin, won }: PlayProps) {
  const root = useRef<THREE.Group>(null)
  const [placed, setPlaced] = useState<number[]>([-1, -1, -1])
  const done = useRef(false)
  const wasWon = useRef(false)

  const world = (x: number, y: number, z: number) =>
    root.current ? root.current.localToWorld(new THREE.Vector3(x, y, z)) : new THREE.Vector3(x, y, z)

  const drop = (i: number) => (local: THREE.Vector3) => {
    if (won || placed[i] >= 0) return false
    let best = -1
    let bestD = DROP_R
    SPOTS.forEach((s, j) => {
      if (placed.includes(j)) return
      const d = Math.hypot(local.x - s[0], local.z - s[2])
      if (d < bestD) { bestD = d; best = j }
    })
    if (best < 0) {
      burst(world(local.x, 0.16, local.z), '#c9bfb0', 6, 0.35)
      return false
    }
    const next = placed.slice()
    next[i] = best
    setPlaced(next)
    burst(world(SPOTS[best][0], 0.3, SPOTS[best][2]), TINTS[best], 16, 0.55)
    const n = next.filter((v) => v >= 0).length
    blip(n + 1)
    if (n === 3 && !done.current) { done.current = true; chime(); onWin() }
    return true
  }

  useEffect(() => {
    if (won && !wasWon.current) {
      wasWon.current = true
      burst(world(0.45, 0.75, 1.1), '#f3d58c', 26, 0.9)
    }
  }, [won])

  return (
    <group ref={root} name="L04-play">
      {SPOTS.map((s, j) => (
        <Spot key={j} at={s} tint={TINTS[j]} cleared={placed.includes(j) || won} />
      ))}
      {SPOTS.map((s, j) => (
        <Smog key={'m' + j} at={s} cleared={placed.includes(j) || won} />
      ))}
      {HOMES.map((h, i) => {
        const j = placed[i]
        return (
          <Draggable key={i} name={`L04-sensor-${i}`} home={h} to={j >= 0 ? SPOTS[j] : null}
            lift={0.1} disabled={j >= 0 || won} onDrop={drop(i)}>
            <Bob amp={j >= 0 ? 0.012 : 0.03} speed={1.5} phase={i * 2.1}>
              <Sensor index={i} placed={j >= 0} tint={j >= 0 ? TINTS[j] : '#f2b35e'} />
            </Bob>
          </Draggable>
        )
      })}
    </group>
  )
}

function Sensor({ index, placed, tint }: { index: number; placed: boolean; tint: string }) {
  const g = useRef<THREE.Group>(null)
  const sq = useRef({ x: 1, v: 0 })
  const led = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f0b45e', emissive: new THREE.Color('#ffb15c'), emissiveIntensity: 1, roughness: 0.5, metalness: 0,
  }), [])
  const green = useMemo(() => new THREE.Color(tint), [tint])

  useEffect(() => {
    if (placed) { sq.current.x = 0.55; sq.current.v = 0 }
  }, [placed])

  useFrame((s, dt) => {
    const o = g.current
    const k = sq.current
    k.v = springStep(k.x, k.v, 1, dt, 240, 10)
    k.x += k.v * Math.min(dt, 1 / 30)
    if (o) o.scale.set(1 + (1 - k.x) * 0.4, Math.max(0.2, k.x), 1 + (1 - k.x) * 0.4)
    const want = placed ? 1.15 : 0.55 + Math.sin(s.clock.elapsedTime * 2.6 + index * 2) * 0.25
    led.emissiveIntensity += (want - led.emissiveIntensity) * Math.min(1, dt * 5)
    if (placed) led.emissive.lerp(green, Math.min(1, dt * 4))
  })

  return (
    <group ref={g}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.42, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.075, 0]} material={clay(C.cream)} castShadow receiveShadow>
        <cylinderGeometry args={[0.215, 0.235, 0.15, 20]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} material={clay(C.terracotta)} castShadow>
        <cylinderGeometry args={[0.24, 0.245, 0.045, 20]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={clay(C.paper)}>
        <cylinderGeometry args={[0.18, 0.2, 0.025, 20]} />
      </mesh>
      <mesh position={[0, 0.19, 0]} material={led}>
        <sphereGeometry args={[0.05, 12, 10]} />
      </mesh>
      <mesh position={[0.14, 0.26, 0]} rotation={[0, 0, -0.16]} material={clay(C.earthDark)} castShadow>
        <cylinderGeometry args={[0.014, 0.018, 0.18, 6]} />
      </mesh>
      <mesh position={[0.155, 0.35, 0]} material={clay(C.terracotta)}>
        <sphereGeometry args={[0.027, 8, 6]} />
      </mesh>
    </group>
  )
}

function Spot({ at, tint, cleared }: { at: [number, number, number]; tint: string; cleared: boolean }) {
  const rg = useRef<THREE.Group>(null)
  const pg = useRef<THREE.Mesh>(null)
  const k = useRef(0)
  const patch = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#a9a093', emissive: new THREE.Color(tint), emissiveIntensity: 0, roughness: 0.95, metalness: 0,
  }), [tint])
  const glow = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e8c58e', emissive: new THREE.Color('#f2a94f'), emissiveIntensity: 0.7, roughness: 0.7, metalness: 0,
  }), [])
  const wave = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f6d79c', transparent: true, opacity: 0, depthWrite: false,
  }), [])
  const green = useMemo(() => new THREE.Color(tint), [tint])
  const grey = useMemo(() => new THREE.Color('#a9a093'), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    patch.color.lerp(cleared ? green : grey, Math.min(1, dt * 2.5))
    patch.emissiveIntensity += ((cleared ? 0.22 : 0) - patch.emissiveIntensity) * Math.min(1, dt * 3)

    if (cleared) k.current = Math.min(1, k.current + dt / 0.75)
    else k.current = 0
    const e = 1 - Math.pow(1 - k.current, 3)
    const p = pg.current
    if (p) {
      p.visible = k.current > 0 && k.current < 1
      p.scale.setScalar(0.5 + e * 2.6)
    }
    wave.opacity = 0.75 * (1 - e)

    const want = cleared ? 0 : 0.55 + (REDUCED ? 0 : Math.sin(t * 3 + at[0] * 2) * 0.25)
    glow.emissiveIntensity += (want - glow.emissiveIntensity) * Math.min(1, dt * 6)
    if (rg.current && !REDUCED) rg.current.scale.setScalar(1 + Math.sin(t * 3 + at[2]) * 0.045)
  })

  return (
    <group position={at} name={'L04-spot-' + at[0]}>
      <mesh position={[0, -0.04, 0]} material={patch} receiveShadow castShadow>
        <cylinderGeometry args={[0.35, 0.37, 0.08, 28]} />
      </mesh>
      <group ref={rg}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow}>
          <torusGeometry args={[0.245, 0.024, 8, 26]} />
        </mesh>
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow}>
          <circleGeometry args={[0.2, 24]} />
        </mesh>
      </group>
      <mesh ref={pg} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} material={wave} visible={false}>
        <torusGeometry args={[0.25, 0.02, 6, 28]} />
      </mesh>
    </group>
  )
}

let _smogTex: THREE.Texture | null = null
function smogTex() {
  if (_smogTex) return _smogTex
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const c = cv.getContext('2d')!
  const g = c.createRadialGradient(64, 64, 5, 64, 64, 62)
  g.addColorStop(0, 'rgba(255,255,255,0.92)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.42)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.fillRect(0, 0, 128, 128)
  _smogTex = new THREE.CanvasTexture(cv)
  return _smogTex
}

function Smog({ at, cleared }: { at: [number, number, number]; cleared: boolean }) {
  const g = useRef<THREE.Group>(null)
  const k = useRef(0)
  const mat = useMemo(() => new THREE.SpriteMaterial({
    map: smogTex(), color: '#8d8170', transparent: true, opacity: 0.72, depthWrite: false,
  }), [])

  useFrame((s, dt) => {
    const o = g.current
    if (!o) return
    k.current += ((cleared ? 1 : 0) - k.current) * Math.min(1, dt * (cleared ? 2.4 : 8))
    const e = k.current
    const bob = Math.sin(s.clock.elapsedTime * 0.9 + at[0] * 2) * 0.035 * (1 - e)
    o.position.set(at[0] + e * 0.35, 0.9 + e * 0.8 + bob, at[2] - e * 0.25)
    o.scale.setScalar(Math.max(0.001, 1 - e * 0.98))
    mat.opacity = 0.72 * (1 - e)
    o.visible = e < 0.995
  })

  return (
    <group ref={g} name="L04-smog">
      <sprite scale={[0.98, 0.66, 1]} material={mat} />
      <sprite position={[-0.27, 0.05, 0.02]} scale={[0.72, 0.5, 1]} material={mat} />
      <sprite position={[0.27, -0.03, -0.02]} scale={[0.76, 0.52, 1]} material={mat} />
      <sprite position={[0.04, 0.18, -0.05]} scale={[0.6, 0.42, 1]} material={mat} />
    </group>
  )
}
