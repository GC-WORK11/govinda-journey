/**
 * One V5 island: the V4 clay island (base + seeded scatter + its diorama,
 * scaled up to the V5 radius), the island's Obstacle layered on top (lazy;
 * a draped placeholder until ISL-* lands it), a small gate at the exit that
 * swings open once done, and lantern stands that warm up after dark.
 * Local frame: top surface y = 0, path enters (0,0,4.2) → exits (0,0,-4.2).
 */
import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { C, Island, clay, clayVC, scatterGeo } from '../../world/kit'
import { Lanterns } from '../../world/Lanterns'
import { env } from '../../world/sky'
import { useV5, useWalkable, useBlocker, walkables, blockers, interactables, V5_ORDER, type IslandId } from '../core'
import { ISLAND_R, ISLAND_POS } from './layout'
import { OBSTACLES, DIORAMAS, hasObstacle, Guard } from './modules'
import { useWorldUI } from './progress'
import { LEVELS } from '../../levels/registry'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const LAST = V5_ORDER.length - 1
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]))

/** V4 dioramas were composed for radius 3.2 — scale them onto the V5 base. */
const D_SCALE = ISLAND_R / 3.2

const rnd = (seed: number, n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }

/* ---------- V4 island visuals (parity base; ART packs layer on top) ---------- */

function IslandBase5({ id, seed }: { id: IslandId; seed: number }) {
  const L = LEVEL_BY_ID[id]
  const ground = L?.palette.ground ?? C.leaf
  const accent = L?.palette.accent ?? C.terracotta
  const top = useRef<THREE.Mesh>(null)
  useWalkable(top)
  const scatter = useMemo(
    () =>
      scatterGeo({
        radius: ISLAND_R, ground, accent, seed: seed * 7 + 2,
        path: [new THREE.Vector3(0, 0, 4.4), new THREE.Vector3(0, 0, 0.3), new THREE.Vector3(0, 0, -4.4)],
      }),
    [seed, ground, accent],
  )
  return (
    <group>
      {/* invisible flat walk surface — raycastable, never drawn */}
      <mesh ref={top} name={`walk-${id}`} position={[0, -0.06, 0]}>
        <cylinderGeometry args={[ISLAND_R - 0.15, ISLAND_R - 0.15, 0.12, 36]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <Island radius={ISLAND_R} ground={ground} seed={seed} />
      {scatter && <mesh geometry={scatter} material={clayVC()} castShadow receiveShadow />}
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
    // swings outward (over the void) so the open leaf never lies across the path
    if (hinge.current) hinge.current.rotation.y = t.current * 1.9
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

/* ---------- registry hygiene ----------

 * The z path corridor is WORLD's: |x| < 1.15, |z| < 4.45 island-local must
 * never hold a wall — anything else blocks the through-walk (obstacles should
 * gate via interactables, not corridor blockers). `walk-`/`gate-` names are
 * ours and always kept. A blocker whose box crosses the corridor is dropped.
 */
const _pb = new THREE.Box3(), _pc = new THREE.Box3(), _wb = new THREE.Box3()
const own = (o: THREE.Object3D) => /^(walk|gate)-/.test(o.name)

/** A blocker crowned by a walkable surface is a climbing route, not a wall —
 *  the path goes over it (L02's ledge). Only true walls get purged. */
function walkableOnTop(b: THREE.Box3) {
  for (const w of walkables) {
    _wb.setFromObject(w)
    if (_wb.isEmpty()) continue
    if (_wb.min.y < b.max.y - 0.45 || _wb.min.y > b.max.y + 0.6) continue
    if (_wb.min.x <= b.max.x && _wb.max.x >= b.min.x && _wb.min.z <= b.max.z && _wb.max.z >= b.min.z) return true
  }
  return false
}

export function purgeCorridors() {
  for (const c of ISLAND_POS) {
    _pc.set(new THREE.Vector3(c.x - 1.15, c.y - 1, c.z - 4.45), new THREE.Vector3(c.x + 1.15, c.y + 4.5, c.z + 4.45))
    for (const o of [...blockers]) {
      if (own(o)) continue
      _pb.setFromObject(o)
      if (_pb.isEmpty() || !_pb.intersectsBox(_pc)) continue
      if (!walkableOnTop(_pb)) blockers.delete(o)
    }
  }
}

/** A crashed obstacle can leave half-registered collision behind — sweep the
 * whole island volume (obstacle bits only; our named pieces stay). */
export function purgeIsland(i: number) {
  const c = ISLAND_POS[i]
  _pc.set(
    new THREE.Vector3(c.x - ISLAND_R - 1.5, c.y - 6, c.z - ISLAND_R - 1.5),
    new THREE.Vector3(c.x + ISLAND_R + 1.5, c.y + 6, c.z + ISLAND_R + 1.5),
  )
  const hit = (o: THREE.Object3D) => { _pb.setFromObject(o); return !_pb.isEmpty() && _pb.intersectsBox(_pc) }
  for (const set of [walkables, blockers] as const)
    for (const o of [...set]) if (!own(o) && hit(o)) set.delete(o)
  for (const [k, it] of [...interactables]) {
    try {
      const p = it.at()
      if (Math.abs(p.x - c.x) < ISLAND_R + 1.5 && Math.abs(p.z - c.z) < ISLAND_R + 1.5) interactables.delete(k)
    } catch { interactables.delete(k) }
  }
}

/* ---------- the island ---------- */

export function Island5({ id, i }: { id: IslandId; i: number }) {
  const done = useV5((s) => s.done.includes(id))
  const idx = useWorldUI((s) => s.idx)
  const finale = useWorldUI((s) => s.finale)
  const Obstacle = OBSTACLES[id]
  const Diorama = DIORAMAS[id]
  // If the obstacle module crashes (Guard caught it), don't let its gate
  // strand the traveller — the path stays walkable (bridge too, via `broken`).
  const broken = useWorldUI((s) => s.broken[id])
  const open = done || !hasObstacle(id) || broken
  const complete = useMemo(() => () => useV5.getState().complete(id), [id])
  // obstacles + dioramas mount when the player could see them (and stay mounted
  // — island state must not be lost by walking away); the finale mounts all.
  const near = finale || (i >= idx - 1 && i <= idx + 2)
  const mounted = useRef(false)
  if (near) mounted.current = true
  return (
    <group position={ISLAND_POS[i]} name={`island-${id}`}>
      <IslandBase5 id={id} seed={i + 1} />
      {Diorama && mounted.current && (
        <Suspense fallback={null}>
          <Guard>
            <group scale={[D_SCALE, D_SCALE, D_SCALE]}>
              <Diorama unlocked={done} active={idx === i} />
            </group>
          </Guard>
        </Suspense>
      )}
      {Obstacle ? (
        mounted.current && (
          <Suspense fallback={null}>
            <Guard onError={() => { useWorldUI.getState().markBroken(id); purgeIsland(i) }}>
              <Obstacle id={id} active={idx === i} complete={complete} done={done} />
            </Guard>
          </Suspense>
        )
      ) : (
        <ObstaclePlaceholder seed={i + 3} />
      )}
      {i < LAST && <ExitGate id={id} open={open} />}
      <IslandLanterns5 done={done} />
    </group>
  )
}
