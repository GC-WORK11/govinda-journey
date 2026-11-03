/**
 * One V5 island: its base (ART's IslandBase once it lands; until then the V4
 * clay island scaled up with a quiet seeded dressing), the island's Obstacle
 * (lazy; a draped placeholder until ISL-* lands it), a small gate at the exit
 * that swings open once done, and lantern stands that warm up after dark.
 * Local frame: top surface y = 0, path enters (0,0,4.2) → exits (0,0,-4.2).
 */
import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { C, Island, Tree, Rock, Bush, ClayPot, clay, clayVC, paint } from '../../world/kit'
import { Lanterns } from '../../world/Lanterns'
import { env } from '../../world/sky'
import { useV5, useWalkable, useBlocker, V5_ORDER, type IslandId } from '../core'
import { ISLAND_R, ISLAND_POS } from './layout'
import { OBSTACLES, ArtIslandBase, hasObstacle } from './modules'
import { useWorldUI } from './progress'
import { LEVELS } from '../../levels/registry'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const LAST = V5_ORDER.length - 1
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]))

const rnd = (seed: number, n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }

/* ---------- fallback island base (until ART's IslandBase lands) ---------- */

/** Seeded rim dressing — kept clear of the entry/exit z-path corridor. */
function FallbackDressing({ seed }: { seed: number }) {
  const items = useMemo(() => {
    const out: { x: number; z: number; kind: number; s: number; r: number }[] = []
    for (let k = 0; k < 70 && out.length < 10; k++) {
      const ang = rnd(seed, k * 3 + 1) * Math.PI * 2, d = 3.2 + rnd(seed, k * 3 + 2) * 1.35
      const x = Math.cos(ang) * d, z = Math.sin(ang) * d
      if (Math.abs(x) < 1.35 && Math.abs(z) > 2.1) continue // path corridor
      out.push({ x, z, kind: Math.floor(rnd(seed, k * 5 + 4) * 5), s: 0.8 + rnd(seed, k * 3 + 3) * 0.55, r: rnd(seed, k * 7) * Math.PI * 2 })
    }
    return out
  }, [seed])
  return (
    <group>
      {items.map((it, i) => {
        const p: [number, number, number] = [it.x, 0.03, it.z]
        const rot: [number, number, number] = [0, it.r, 0]
        switch (it.kind) {
          case 0: return <Rock key={i} position={p} s={it.s * 0.5} />
          case 1: return <Bush key={i} position={p} s={it.s} />
          case 2: return <ClayPot key={i} position={p} s={it.s * 0.9} />
          default: return <Tree key={i} position={p} rotation={rot} h={it.s * 1.15} color={it.kind === 4 ? C.moss : undefined} />
        }
      })}
    </group>
  )
}

/** Stepping stones along the local z-path (entry → exit), one merged mesh. */
function PathStones({ seed }: { seed: number }) {
  const geo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < 9; i++) {
      const t = i / 8, z = 3.55 - t * 7.1, x = Math.sin(t * Math.PI * 2 + seed * 2) * 0.3
      const g = new THREE.CylinderGeometry(0.19 + rnd(seed, i) * 0.07, 0.22 + rnd(seed, i + 1) * 0.07, 0.07, 7)
      e.set((rnd(seed, i + 2) - 0.5) * 0.1, rnd(seed, i + 3) * Math.PI, (rnd(seed, i + 4) - 0.5) * 0.1)
      q.setFromEuler(e)
      g.applyMatrix4(m.compose(new THREE.Vector3(x + (rnd(seed, i + 5) - 0.5) * 0.14, 0.035, z), q, s))
      paint(g, rnd(seed, i + 8) > 0.5 ? '#d6cab4' : '#c9bfb0', undefined, 0.08)
      geos.push(g)
    }
    const merged = mergeGeometries(geos, false)
    geos.forEach((x) => x.dispose())
    return merged
  }, [seed])
  if (!geo) return null
  return <mesh geometry={geo} material={clayVC()} castShadow receiveShadow />
}

function FallbackBase({ id, seed }: { id: IslandId; seed: number }) {
  const L = LEVEL_BY_ID[id]
  const top = useRef<THREE.Mesh>(null)
  const whole = useRef<THREE.Group>(null)
  useWalkable(top)
  useWalkable(whole)
  return (
    <group>
      {/* invisible flat walk surface — raycastable, never drawn */}
      <mesh ref={top} name={`walk-${id}`} position={[0, -0.06, 0]}>
        <cylinderGeometry args={[ISLAND_R - 0.15, ISLAND_R - 0.15, 0.12, 36]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <group ref={whole}>
        <Island radius={ISLAND_R} ground={L?.palette.ground ?? C.leaf} seed={seed} />
      </group>
      <PathStones seed={seed} />
      <FallbackDressing seed={seed} />
    </group>
  )
}

/* ---------- exit gate ---------- */

/**
 * A small wooden hurdle across the exit path. While the island is unsolved it
 * blocks the way out; on completion it swings slowly open around its hinge post.
 */
function ExitGate({ id, open }: { id: IslandId; open: boolean }) {
  const hinge = useRef<THREE.Group>(null)
  const block = useRef<THREE.Mesh>(null)
  useBlocker(block, !open)
  const t = useRef(open ? 1 : 0)
  useFrame((_, dt) => {
    t.current += ((open ? 1 : 0) - t.current) * Math.min(1, dt * (RM ? 100 : 1.8))
    if (hinge.current) hinge.current.rotation.y = -t.current * 1.9
  })
  return (
    <group position={[0, 0, -4.55]}>
      {/* invisible blocker wall spanning the exit gap */}
      <mesh ref={block} name={`gate-${id}`} position={[0, 0.8, 0]}>
        <boxGeometry args={[2.6, 1.7, 0.5]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh position={[-0.95, 0.42, 0]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.84, 7]} />
      </mesh>
      <group ref={hinge} position={[-0.95, 0, 0]}>
        <RoundedBox args={[1.9, 0.09, 0.09]} radius={0.03} position={[0.95, 0.62, 0]} material={clay(C.woodLight)} castShadow />
        <RoundedBox args={[1.9, 0.09, 0.09]} radius={0.03} position={[0.95, 0.3, 0]} material={clay(C.wood)} castShadow />
        <mesh position={[1.86, 0.45, 0]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.6, 7]} />
        </mesh>
        <mesh position={[1.72, 0.5, 0.02]} rotation={[0, 0, 0.15]} material={clay(C.terracotta)}>
          <boxGeometry args={[0.09, 0.13, 0.015]} />
        </mesh>
      </group>
    </group>
  )
}

/* ---------- lanterns ---------- */

function IslandLanterns5({ done }: { done: boolean }) {
  const light = useRef<THREE.PointLight>(null)
  const spots = useMemo(() => [
    { p: new THREE.Vector3(0.95, 0, 3.35), tall: 1 },
    { p: new THREE.Vector3(-0.95, 0, -3.35), tall: 1 },
    { p: new THREE.Vector3(-1.7, 0, 0.7), tall: 1 },
  ], [])
  useFrame(() => {
    const l = light.current; if (!l) return
    l.intensity = env.night * 2.1
  })
  if (!done) return null
  return (
    <group>
      <Lanterns spots={spots} />
      <pointLight ref={light} position={[0, 1.7, 0]} color="#ffb45e" intensity={0} distance={9} decay={1.8} />
    </group>
  )
}

/* ---------- placeholder until an ISL lands the real obstacle ---------- */

function ObstaclePlaceholder({ seed }: { seed: number }) {
  const p = useMemo(() => ({
    x: (rnd(seed, 1) - 0.5) * 1.6, z: -0.6 + rnd(seed, 2) * 1.4, r: rnd(seed, 3) * Math.PI,
  }), [seed])
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, p.r, 0]}>
      {/* a small draped shape under a dust sheet — something is being built here */}
      <mesh position={[0, 0.42, 0]} material={clay(C.paper)} castShadow receiveShadow>
        <sphereGeometry args={[0.62, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.86, 0]} material={clay(C.terracotta)}>
        <sphereGeometry args={[0.06, 10, 8]} />
      </mesh>
      <mesh position={[0.5, 0.05, 0.42]} rotation={[0.2, 0.4, 0]} material={clay(C.woodLight)} castShadow>
        <boxGeometry args={[0.34, 0.05, 0.22]} />
      </mesh>
    </group>
  )
}

/* ---------- the island ---------- */

export function Island5({ id, i }: { id: IslandId; i: number }) {
  const done = useV5((s) => s.done.includes(id))
  const active = useWorldUI((s) => s.idx === i)
  const Obstacle = OBSTACLES[id]
  const open = done || !hasObstacle(id)
  const complete = useMemo(() => () => useV5.getState().complete(id), [id])
  return (
    <group position={ISLAND_POS[i]} name={`island-${id}`}>
      {ArtIslandBase ? (
        <Suspense fallback={null}>
          <ArtIslandBase id={id} radius={ISLAND_R} palette={LEVEL_BY_ID[id]?.palette} />
        </Suspense>
      ) : (
        <FallbackBase id={id} seed={i + 1} />
      )}
      {Obstacle ? (
        <Suspense fallback={null}>
          <Obstacle id={id} active={active} complete={complete} done={done} />
        </Suspense>
      ) : (
        <ObstaclePlaceholder seed={i + 3} />
      )}
      {i < LAST && <ExitGate id={id} open={open} />}
      <IslandLanterns5 done={done} />
    </group>
  )
}
