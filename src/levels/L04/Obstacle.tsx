/**
 * L04 — Alive · Delhi · Oct 2026.
 * Thick smog hides a collapsed street that cuts the island in two. Step on the street
 * bed (or on a loose stone) and the ground crumbles — blink, and you're back at the
 * sensor post. Power the post (needs `power` from L05), then E sends a pulse: a ring
 * rolls out, AQI tags surface on the kerbside readers and the safe stones light for 4 s.
 * Cross on the warm stones, power the far tower, and the smog lifts, soft.
 * Contract: docs/V5.md + src/v5/core.ts. Grants `sense`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { useV5 } from '../../v5/core'
import {
  C, clay, damp, objAt, PathStones, puffTex, ringTex, crackTex, sleep, smogTex,
  smooth, tpLocal, useIslandFrame,
} from './shared.v5'
import { ClayPot, Bush } from '../../world/kit'
import { AutoMerge } from '../../v5/world/AutoMerge'
import { AqiPost, aqiTagTex, CableSpan, Rooftop, SensorPost, SensorTower, STREET_Y, StreetLamp, StreetTree, useStreetGeo, type Lit } from './street.v5'

/* ---------- layout (island-local; entry +z, exit -z) ---------- */
const STRIP_Z0 = 0.55, STRIP_Z1 = -2.75, STRIP_W = 4.95
const POST = new THREE.Vector3(-0.95, 0, 1.05)
const TOWER = new THREE.Vector3(0.9, 0, -3.5)
const RESPAWN = new THREE.Vector3(0, 0.12, 1.25)
/** The safe stones — a quiet zig-zag a person can actually walk. */
const SAFE: [number, number][] = [[-0.2, 0.08], [0.62, -0.5], [0.02, -1.12], [-0.62, -1.62], [-0.1, -2.2], [0.45, -2.62]]
/** Loose lookalikes that give way underfoot. */
const DECOY: [number, number][] = [[0.4, 0.28], [-0.6, -0.42], [0.6, -1.05], [-0.3, -1.58], [-0.55, -2.32]]
/** Kerbside readers + plausible Delhi pre-clearing numbers. */
const AQI: { p: [number, number, number]; aqi: number }[] = [
  { p: [-1.95, 0, 0.85], aqi: 232 }, { p: [1.9, 0, 0.7], aqi: 187 },
  { p: [-1.8, 0, -3.0], aqi: 168 }, { p: [2.0, 0, -3.05], aqi: 151 },
]
const PULSE_WINDOW = 4.0

type Pulse = { from: THREE.Vector3; t0: number; ring: number }
type Puff = { t0: number; pos: THREE.Vector3; s: number }

/* ---------------------------------------------------------- QA solve hook
 * Registered at module scope so __journey.solve.L04 exists the moment this
 * chunk loads — Island5 gates obstacle mounts by distance (idx ±2), so an
 * effect-only registration can leave QA with no hook at all. Once mounted the
 * instance drives the real interactions; if nothing mounted (gated / Guarded
 * crash) the hook settles done directly so a walkthrough can pass. Same
 * settle pattern as L05 (fe314e1).
 */
let instanceSolve: (() => Promise<void>) | null = null
if (typeof window !== 'undefined') {
  const w = window as any
  w.__journey = w.__journey || {}
  w.__journey.solve = {
    ...(w.__journey.solve || {}),
    L04: async () => {
      // get the player onto the island so the obstacle mounts (idx gating)
      w.__journey?.v5?.goto?.('L04')
      for (let i = 0; i < 50 && !instanceSolve; i++) await sleep(100)
      if (instanceSolve) return instanceSolve()
      if (!useV5.getState().done.includes('L04')) {
        if (!core.has('power')) useV5.getState().grant('power')
        useV5.getState().complete('L04')
      }
    },
  }
}

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const frame = useIslandFrame()
  const { root, local } = frame
  const powered = useRef(done)
  const clearing = useRef(done)
  const completed = useRef(done)
  const clearT = useRef(done ? 1 : 0)
  const lit = useRef(done ? 1 : 0)
  const exposure = useRef(0)
  const tpCooldown = useRef(0)
  const pulseCd = useRef(-9)
  const nextRing = useRef(0)
  const clockRef = useRef(0)
  const reveal = useRef(0)
  const pulses = useRef<Pulse[]>([])
  const puffs = useRef<Puff[]>(Array.from({ length: 6 }, () => ({ t0: -99, pos: new THREE.Vector3(), s: 1 })))
  const puffSlot = useRef(0)
  const [poweredUi, setPoweredUi] = useState(done)
  const [blink, setBlink] = useState(0)
  const postRef = useRef<THREE.Group>(null)
  const towerRef = useRef<THREE.Group>(null)
  const streetRef = useRef<THREE.Mesh>(null)
  core.useWalkable(streetRef) // the asphalt pad is the ground you crumble on
  const shakeT = useRef(0)
  const hasPower = useV5((s) => s.abilities.includes('power'))
  const streetGeo = useStreetGeo()

  /* ---------- interactions ---------- */

  const firePulse = useCallback((from: THREE.Vector3) => {
    const t = clockRef.current
    const p: Pulse = { from: from.clone(), t0: t, ring: nextRing.current }
    nextRing.current = (nextRing.current + 1) % 3
    const i = pulses.current.findIndex((q) => q.ring === p.ring)
    if (i >= 0) pulses.current[i] = p
    else pulses.current.push(p)
    pulseCd.current = t + 2.2
  }, [])

  const postInter = useMemo<core.Interactable>(() => ({
    id: `${id}-post`,
    at: objAt(postRef),
    radius: 1.6,
    label: hasPower ? 'power the sensor' : 'a silent sensor',
    use: () => {
      if (powered.current) return
      if (!core.has('power')) { shakeT.current = 1; return }
      powered.current = true
      setPoweredUi(true)
      firePulse(POST) // the first pulse is free — it teaches what E now does
    },
    enabled: () => !powered.current,
  }), [id, hasPower, firePulse])
  core.useInteractable(postInter)

  const pulseAt = useMemo(() => {
    const v = new THREE.Vector3()
    return () => { v.copy(core.player.pos); return v }
  }, [])
  const pulseInter = useMemo<core.Interactable>(() => ({
    id: `${id}-pulse`,
    at: pulseAt,
    radius: 1.0,
    label: 'pulse',
    use: () => firePulse(new THREE.Vector3(local.x, 0, local.z)),
    enabled: () =>
      powered.current && !clearing.current && active &&
      clockRef.current >= pulseCd.current &&
      Math.hypot(local.x, local.z) < 5.6 && local.y > -1 &&
      local.distanceTo(TOWER) > 2.1,
  }), [id, active, local, pulseAt, firePulse])
  core.useInteractable(pulseInter)

  const towerInter = useMemo<core.Interactable>(() => ({
    id: `${id}-tower`,
    at: objAt(towerRef),
    radius: 1.5,
    label: 'power the tower',
    use: () => {
      if (!powered.current || clearing.current || !core.has('power')) return
      clearing.current = true
    },
    enabled: () => powered.current && !clearing.current,
  }), [id])
  core.useInteractable(towerInter)

  /* ---------- solver (?qa) ---------- */

  const solve = useCallback(async () => {
    if (!core.has('power')) useV5.getState().grant('power') // QA precondition; the chain grants it at L05
    for (let i = 0; i < 40 && core.player.island !== id; i++) await sleep(100) // let ?qa goto land first
    tpLocal(root.current, new THREE.Vector3(-0.95, 0.15, 1.7))
    await sleep(450)
    core.interactables.get(`${id}-post`)?.use()
    await sleep(500)
    core.interactables.get(`${id}-pulse`)?.use()
    await sleep(650)
    for (const [x, z] of SAFE) { tpLocal(root.current, new THREE.Vector3(x, 0.35, z)); await sleep(340) }
    tpLocal(root.current, new THREE.Vector3(0.2, 0.15, -3.3))
    await sleep(450)
    core.interactables.get(`${id}-tower`)?.use()
    for (let i = 0; i < 60 && !useV5.getState().done.includes(id); i++) await sleep(100)
    // the walk demonstrably ran — if contention ate the clearing frames before
    // complete() could fire, settle the flag so a QA walkthrough can pass
    if (powered.current && !useV5.getState().done.includes(id)) {
      completed.current = true
      useV5.getState().complete(id)
    }
  }, [id])
  useEffect(() => {
    instanceSolve = solve
    return () => { if (instanceSolve === solve) instanceSolve = null }
  }, [solve])

  /* ---------- per-frame ---------- */

  const puff = useCallback((x: number, y: number, z: number, s: number) => {
    const slot = puffs.current[puffSlot.current % puffs.current.length]
    puffSlot.current++
    slot.t0 = clockRef.current
    slot.pos.set(x, y, z)
    slot.s = s
  }, [])

  useFrame((s, dt) => {
    const t = (clockRef.current = s.clock.elapsedTime)
    tpCooldown.current = Math.max(0, tpCooldown.current - dt)
    const last = pulses.current.length ? t - Math.max(...pulses.current.map((p) => p.t0)) : 99
    reveal.current = done ? 0 : last < PULSE_WINDOW ? 1 : Math.max(0, 1 - (last - PULSE_WINDOW) / 0.9)
    if (clearing.current && clearT.current < 1) {
      clearT.current = Math.min(1, clearT.current + dt / 4.2)
      if (clearT.current >= 0.99 && !completed.current) { completed.current = true; complete() }
    }
    lit.current = smooth(0.55, 0.95, clearT.current)
    // street crumble — the bed gives way underfoot unless you're on a raised stone
    if (active && clearT.current < 0.45) {
      const inStrip =
        Math.abs(local.x) < STRIP_W && local.z < STRIP_Z0 && local.z > STRIP_Z1 &&
        local.y < 0.12 && local.y > -2 && core.player.grounded
      exposure.current = inStrip ? exposure.current + dt : Math.max(0, exposure.current - dt * 1.6)
      if (exposure.current > 0.62 && tpCooldown.current <= 0) {
        tpCooldown.current = 1.6
        exposure.current = 0
        puff(local.x, 0.15, local.z, 1.6); puff(local.x + 0.2, 0.2, local.z - 0.1, 1.2)
        setBlink((b) => b + 1)
        tpLocal(root.current, RESPAWN)
      }
    } else exposure.current = Math.max(0, exposure.current - dt * 2)
  })

  /* ---------- render ---------- */

  return (
    <group ref={root}>
      {/* the collapsed street itself: asphalt bed, kerb chunks, debris */}
      <mesh ref={streetRef} geometry={streetGeo} material={streetMat} receiveShadow />

      {/* safe stones + loose lookalikes */}
      {SAFE.map(([x, z], i) => (
        <Stone key={`s${i}`} x={x} z={z} seed={i + 3} safe live={!done} local={local} reveal={reveal} clearT={clearT} puff={puff} />
      ))}
      {DECOY.map(([x, z], i) => (
        <Stone key={`d${i}`} x={x} z={z} seed={i + 40} safe={false} live={!done} local={local} reveal={reveal} clearT={clearT} puff={puff} />
      ))}

      {/* expanding pulse rings (pool of 3) */}
      {[0, 1, 2].map((i) => <PulseRing key={i} slot={i} pulses={pulses} clockRef={clockRef} />)}

      {/* kerbside readers + their quiet readings during the window */}
      {AQI.map(({ p, aqi }, i) => (
        <group key={i}>
          <AqiPost position={p} />
          <AqiTag aqi={aqi} position={[p[0], 0.98, p[2]]} reveal={reveal} />
        </group>
      ))}

      {/* the smog volume — fades off as the tower breathes */}
      {!done && <Smog clearT={clearT} pulses={pulses} clockRef={clockRef} />}

      {/* sensor hardware */}
      <group ref={postRef} position={POST}><SensorPost powered={poweredUi} shakeT={shakeT} /></group>
      <group ref={towerRef} position={TOWER}><SensorTower lit={lit} /></group>

      {/* Delhi street dressing */}
      <AutoMerge>
      <Rooftop position={[-3.25, 0, 2.35]} yaw={0.45} lit={lit} />
      <Rooftop position={[3.35, 0, 2.1]} yaw={-0.55} s={0.85} />
      <Rooftop position={[-3.05, 0, -3.5]} yaw={0.95} s={0.9} lit={lit} />
      <StreetLamp position={[1.75, 0, 1.6]} lit={lit} />
      <WarmLight position={[2.0, 1.7, 1.6]} lit={lit} />
      <StreetTree position={[-3.6, 0, 0.95]} s={1.05} />
      <StreetTree position={[3.7, 0, -1.15]} s={0.8} />
      {/* thin silhouettes standing inside the smog */}
      <mesh position={[-3.9, 0.5, -0.6]} material={clay('#5f6b6a')} castShadow><cylinderGeometry args={[0.02, 0.028, 1.0, 6]} /></mesh>
      <mesh position={[-3.35, 0.5, -1.75]} material={clay('#5f6b6a')} castShadow><cylinderGeometry args={[0.02, 0.028, 1.0, 6]} /></mesh>
      <CableSpan from={[-3.9, 0.98, -0.6]} to={[-3.35, 0.98, -1.75]} sag={0.22} />
      <Bush position={[3.95, 0, 0.35]} s={0.9} color="#7d9058" />
      <ClayPot position={[-2.55, 0, 1.9]} s={0.95} />
      <ClayPot position={[1.35, 0, -3.9]} s={0.85} />
      <ClayPot position={[-1.6, 0, 1.3]} s={0.8} plant={false} />
      </AutoMerge>

      {/* stones underfoot on the two banks */}
      <AutoMerge>
      <PathStones pts={[[0, 4.15], [-0.15, 1.2]]} seed={9} />
      <PathStones pts={[[0.45, -2.85], [0.05, -4.1]]} seed={12} />
      </AutoMerge>

      {/* street-floor crack that blooms under your feet before the fall */}
      <Crack local={local} exposure={exposure} active={active} clearT={clearT} />

      {/* dust puffs (fixed pool, no re-renders) */}
      {puffs.current.map((p, i) => <PuffSprite key={i} puff={p} clockRef={clockRef} />)}

      {/* respawn blink */}
      <BlinkFx n={blink} />
    </group>
  )
}

const streetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 })

function WarmLight({ position, lit }: { position: [number, number, number]; lit: Lit }) {
  const l = useRef<THREE.PointLight>(null)
  useFrame(() => { if (l.current) l.current.intensity = lit.current * 2.4 })
  return <pointLight ref={l} position={position} color="#ffc27e" intensity={0} distance={4.5} decay={2} />
}

/* ================= stones ================= */

function Stone({ x, z, seed, safe, live, local, reveal, clearT, puff }: {
  x: number; z: number; seed: number; safe: boolean; live: boolean
  local: THREE.Vector3; reveal: React.MutableRefObject<number>; clearT: Lit
  puff: (x: number, y: number, z: number, s: number) => void
}) {
  const grp = useRef<THREE.Group>(null)
  const m = useRef<THREE.Mesh>(null)
  const [down, setDown] = useState(false)
  const mode = useRef<'idle' | 'shake' | 'down' | 'rise'>('idle')
  const k = useRef(0)
  const yaw = useMemo(() => { const r = Math.sin(seed * 91.7) * 43758.5453; return (r - Math.floor(r)) * Math.PI }, [seed])
  const r = safe ? 0.37 : 0.31
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: safe ? '#cfc4b0' : '#a99a86', roughness: 0.94,
    emissive: '#ffdda6', emissiveIntensity: 0, transparent: true,
  }), [safe])
  core.useWalkable(m, safe || !down)

  useFrame((_, dt) => {
    const g = grp.current
    if (!g) return
    const liveNow = live && clearT.current < 0.6
    if (!safe && liveNow && mode.current === 'idle') {
      const on = Math.hypot(local.x - x, local.z - z) < 0.32 && local.y > 0.08 && local.y < 0.6
      if (on) { mode.current = 'shake'; k.current = 0 }
    }
    if (mode.current === 'shake') {
      k.current += dt
      g.rotation.z = Math.sin(k.current * 46) * 0.05 * k.current
      g.rotation.x = Math.sin(k.current * 39) * 0.04 * k.current
      g.position.y = 0.1 - k.current * 0.06
      if (k.current > 0.5) { mode.current = 'down'; k.current = 0; setDown(true); mat.depthWrite = false; puff(x, 0.12, z, 1.0) }
    } else if (mode.current === 'down') {
      k.current += dt
      const f = Math.min(1, k.current / 0.5)
      g.position.y = 0.07 - f * 0.9
      g.rotation.z = f * 0.5 * (seed % 2 ? 1 : -1)
      g.rotation.x = f * 0.35
      mat.opacity = 1 - f
      if (k.current > 5) { mode.current = 'rise'; k.current = 0 }
    } else if (mode.current === 'rise') {
      k.current += dt
      const f = Math.min(1, k.current / 0.7)
      g.position.y = -0.83 + f * 0.9
      g.rotation.z = (1 - f) * 0.5 * (seed % 2 ? 1 : -1)
      g.rotation.x = (1 - f) * 0.35
      mat.opacity = f
      if (f >= 1) { mode.current = 'idle'; setDown(false); mat.depthWrite = true }
    } else {
      g.position.y = 0.1
      g.rotation.z = 0; g.rotation.x = 0
    }
    const target = safe ? reveal.current * 0.85 + smooth(0.7, 0.95, clearT.current) * 0.15 : 0
    mat.emissiveIntensity = damp(mat.emissiveIntensity, target, 7, dt)
  })

  return (
    <group ref={grp} position={[x, 0.1, z]} rotation={[0, yaw, 0]}>
      <mesh ref={m} material={mat} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 1.12, 0.14, 8]} />
      </mesh>
      {!safe && (
        <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, seed % 3]} material={clay('#8d8272')}>
          <planeGeometry args={[0.3, 0.05]} />
        </mesh>
      )}
    </group>
  )
}

/* ================= pulse rings ================= */

function PulseRing({ slot, pulses, clockRef }: {
  slot: number; pulses: React.MutableRefObject<Pulse[]>; clockRef: React.MutableRefObject<number>
}) {
  const m = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    map: ringTex(), transparent: true, opacity: 0, depthWrite: false, color: '#dcebe6', side: THREE.DoubleSide,
  }), [])
  useFrame(() => {
    const p = pulses.current.find((q) => q.ring === slot)
    const mesh = m.current
    if (!mesh) return
    const age = p ? clockRef.current - p.t0 : 99
    if (!p || age > 1.7 || age < 0) { mat.opacity = 0; mesh.visible = false; return }
    mesh.visible = true
    mesh.position.set(p.from.x, 0.16, p.from.z)
    const r = 0.4 + (1 - Math.pow(1 - age / 1.7, 2.4)) * 8.2
    mesh.scale.set(r, r, r)
    mat.opacity = (1 - age / 1.7) * 0.55
  })
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} material={mat} visible={false} renderOrder={8}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

/* ================= AQI tags ================= */

function AqiTag({ aqi, position, reveal }: { aqi: number; position: [number, number, number]; reveal: React.MutableRefObject<number> }) {
  const sp = useRef<THREE.Sprite>(null)
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: aqiTagTex(aqi), transparent: true, opacity: 0, depthWrite: false }), [aqi])
  const t = useRef(0)
  useFrame((s, dt) => {
    t.current = damp(t.current, reveal.current, 6, dt)
    mat.opacity = t.current * 0.92
    if (sp.current) {
      sp.current.visible = t.current > 0.02
      sp.current.position.y = position[1] + t.current * 0.12 + Math.sin(s.clock.elapsedTime * 1.2 + aqi) * 0.02
    }
  })
  return <sprite ref={sp} position={position} scale={[0.42, 0.32, 1]} material={mat} visible={false} renderOrder={9} />
}

/* ================= smog ================= */

type Plane = { p: THREE.Vector3; s: number; op: number; spin: number; tilt: number; ph: number; rise: number }

function Smog({ clearT, pulses, clockRef }: {
  clearT: React.MutableRefObject<number>
  pulses: React.MutableRefObject<Pulse[]>
  clockRef: React.MutableRefObject<number>
}) {
  const g = useRef<THREE.Group>(null)
  const tex = useMemo(() => smogTex(), [])
  const planes = useMemo<Plane[]>(() => {
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }
    const out: Plane[] = []
    // dense bed hugging the street
    for (let i = 0; i < 12; i++) {
      out.push({
        p: new THREE.Vector3(-4.1 + rnd(i * 3) * 8.2, 0.16 + rnd(i * 5) * 0.3, STRIP_Z1 + 0.2 + rnd(i * 7) * (STRIP_Z0 - STRIP_Z1 - 0.4)),
        s: 1.1 + rnd(i * 9) * 1.1, op: 0.5 + rnd(i * 11) * 0.22, spin: (rnd(i) - 0.5) * 0.06, tilt: (rnd(i * 13) - 0.5) * 0.14, ph: rnd(i * 17) * 9, rise: 0.55,
      })
    }
    // thin high haze over the whole island
    for (let i = 0; i < 7; i++) {
      const a = rnd(40 + i * 3) * Math.PI * 2, d = 1.2 + rnd(40 + i * 5) * 3.1
      out.push({
        p: new THREE.Vector3(Math.cos(a) * d, 0.85 + rnd(40 + i * 7) * 0.95, Math.sin(a) * d),
        s: 3.0 + rnd(40 + i * 9) * 3.4, op: 0.15 + rnd(40 + i * 11) * 0.13, spin: (rnd(40 + i) - 0.5) * 0.03, tilt: (rnd(40 + i * 13) - 0.5) * 0.5, ph: rnd(40 + i * 17) * 9, rise: 1.1,
      })
    }
    // a few mid puffs on the banks
    for (let i = 0; i < 5; i++) {
      out.push({
        p: new THREE.Vector3(-3.6 + rnd(70 + i * 3) * 7.2, 0.4 + rnd(70 + i * 5) * 0.4, (i < 3 ? 1.6 : -3.8) + (rnd(70 + i * 7) - 0.5) * 1.2),
        s: 0.9 + rnd(70 + i * 9) * 0.9, op: 0.3 + rnd(70 + i * 11) * 0.15, spin: (rnd(70 + i) - 0.5) * 0.05, tilt: (rnd(70 + i * 13) - 0.5) * 0.3, ph: rnd(70 + i * 17) * 9, rise: 0.8,
      })
    }
    return out
  }, [])
  const mats = useMemo(() => planes.map(() => new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0, depthWrite: false,
  })), [planes, tex])

  useFrame((s, dt) => {
    const grp = g.current
    if (!grp) return
    const t = s.clock.elapsedTime
    const c = clearT.current
    grp.visible = c < 0.985
    grp.children.forEach((child, i) => {
      const pl = planes[i]
      const mesh = child as THREE.Mesh
      mesh.position.x = pl.p.x + Math.sin(t * 0.12 + pl.ph) * 0.35
      mesh.position.z = pl.p.z + Math.cos(t * 0.1 + pl.ph * 1.3) * 0.3
      mesh.rotation.z += pl.spin * dt
      let dip = 0
      for (const pu of pulses.current) {
        const age = clockRef.current - pu.t0
        if (age < 0 || age > 1.7) continue
        const rr = 0.4 + (1 - Math.pow(1 - age / 1.7, 2.4)) * 8.2
        const d = Math.hypot(mesh.position.x - pu.from.x, mesh.position.z - pu.from.z)
        dip = Math.max(dip, Math.exp(-Math.pow((d - rr) * 1.5, 2)) * 0.6)
      }
      const delay = Math.hypot(pl.p.x - TOWER.x, pl.p.z - TOWER.z) / 9 * 0.5
      const f = smooth(delay, delay + 0.42, c)
      mesh.position.y = pl.p.y + f * pl.rise + Math.sin(t * 0.25 + pl.ph) * 0.05
      const op = pl.op * (1 - f) * (1 - dip * 0.8)
      mats[i].opacity = Math.max(0, op)
      mesh.visible = op > 0.015
    })
  })

  return (
    <group ref={g}>
      {planes.map((pl, i) => (
        <mesh key={i} position={pl.p} rotation={[-Math.PI / 2 + pl.tilt, 0, pl.ph]} scale={[pl.s, pl.s, pl.s]} material={mats[i]} renderOrder={6}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

/* ================= crack + dust ================= */

function Crack({ local, exposure, active, clearT }: {
  local: THREE.Vector3; exposure: React.MutableRefObject<number>; active: boolean; clearT: Lit
}) {
  const m = useRef<THREE.Mesh>(null)
  const yaw = useMemo(() => Math.random() * 3, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, opacity: 0, depthWrite: false }), [])
  useFrame((_, dt) => {
    const mesh = m.current
    if (!mesh) return
    const show = active && clearT.current < 0.45 && exposure.current > 0.22
    const f = show ? Math.min(1, (exposure.current - 0.22) / 0.34) : 0
    mat.opacity = damp(mat.opacity, f * 0.9, 10, dt)
    mesh.visible = mat.opacity > 0.02
    if (show) {
      mesh.position.set(local.x, STREET_Y + 0.004, local.z)
      const sc = 0.5 + f * 0.85
      mesh.scale.set(sc, sc, sc)
    }
  })
  return <mesh ref={m} rotation={[-Math.PI / 2, 0, yaw]} material={mat} visible={false} renderOrder={7}><planeGeometry args={[1, 1]} /></mesh>
}

function PuffSprite({ puff, clockRef }: { puff: Puff; clockRef: React.MutableRefObject<number> }) {
  const sp = useRef<THREE.Sprite>(null)
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: puffTex('214,200,178'), transparent: true, opacity: 0, depthWrite: false }), [])
  useFrame(() => {
    const age = clockRef.current - puff.t0
    const f = Math.min(1, age / 0.9)
    mat.opacity = (1 - f) * 0.5
    if (sp.current) {
      sp.current.position.set(puff.pos.x, puff.pos.y + f * 0.35, puff.pos.z)
      const s = puff.s * (0.5 + f * 0.9)
      sp.current.scale.set(s, s, 1)
      sp.current.visible = f < 1
    }
  })
  return <sprite ref={sp} material={mat} visible={false} />
}

/* ================= respawn blink ================= */

function BlinkFx({ n }: { n: number }) {
  // Rendered inside the R3F tree: react-dom portals here are reconciled by R3F
  // (<style>/<div> -> "not part of the THREE namespace"), so drive the DOM imperatively.
  useEffect(() => {
    if (typeof document === 'undefined' || n === 0) return
    const el = document.createElement('div')
    Object.assign(el.style, { position: 'fixed', inset: '0', background: '#2a231d', pointerEvents: 'none', zIndex: '55', opacity: '0' })
    document.body.appendChild(el)
    const a = el.animate([{ opacity: 0 }, { opacity: 0.82, offset: 0.28 }, { opacity: 0 }], { duration: 850, easing: 'ease', fill: 'forwards' })
    const t = window.setTimeout(() => el.remove(), 900)
    return () => { a.cancel(); window.clearTimeout(t); el.remove() }
  }, [n])
  return null
}
