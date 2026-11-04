/** L05 Ent — shared layout constants + presentational pieces for the V5 obstacle.
 *  Draw-call budget: every static piece is painted + merged into ONE vertex-coloured
 *  mesh (<Statics>, <WalkStatics>, the pad's merged shell). Only pieces with animated
 *  materials or that move with the lift stay separate meshes. */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { C, clay, clayVC, paint } from '../../world/kit'
import { useBlocker, useWalkable } from '../../v5/core'

export const DECK_Y = 2.0
export const LIFT_C = new THREE.Vector3(0, 0, -3.42)
export const PAD_W = 1.7
export const PAD_D = 1.5
export const PAD_TOP = 0.11
export const EXIT_PT = new THREE.Vector3(0, 0, -4.2)

/** Chunk hues keyed by memory size (teal, leaf, plum, rust). */
export const HUES = ['#7fa7b5', '#8fb36b', '#9b8bb5', '#d9825b'] as const
export const CHUNK_T = [0.1, 0.17, 0.25, 0.35]
export const CHUNK_W = [0.5, 0.56, 0.64, 0.74]
export const LAP_SCALE = [0.6, 0.78, 0.96, 1.18]
export const PLINTH_TOP = 0.52

/** The four laptops, size = memory tier, shuffled around the ring so position is no hint. */
export const LAPTOPS: { size: number; p: [number, number, number]; yaw: number }[] = [
  { size: 1, p: [-1.65, 0, 1.0], yaw: 0.55 },
  { size: 0, p: [1.1, 0, 1.62], yaw: -0.55 },
  { size: 3, p: [2.0, 0, -1.05], yaw: -1.0 },
  { size: 2, p: [-0.95, 0, -1.92], yaw: 0.75 },
]

export const SHARD = { c: new THREE.Vector3(8.15, -0.74, 0.55), r: 1.28 }
export const GAP_EDGE = new THREE.Vector3(4.85, 0, 0.32)
export const PLANK_A = new THREE.Vector3(4.62, 0.04, 0.3)
export const PLANK_B = new THREE.Vector3(7.3, -0.66, 0.55)

export const DESK_P: [number, number, number] = [-2.75, 0, -0.3]
export const DESK_YAW = 1.85

/** Where the story lectern stands — just east of the entry path. */
export const STORY_P: [number, number, number] = [1.28, 0, 3.35]

export type ChunkDef = { size: number; home: THREE.Vector3; groundY: number }
export const CHUNKS: ChunkDef[] = [
  { size: 2, home: new THREE.Vector3(2.35, 0, 2.85), groundY: 0 },
  { size: 0, home: new THREE.Vector3(-2.45, 0, 1.85), groundY: 0 },
  { size: 3, home: new THREE.Vector3(3.15, 0, -0.55), groundY: 0 },
  { size: 1, home: new THREE.Vector3(8.15, 0, 0.55), groundY: SHARD.c.y },
]

/** World-space dock point above a laptop where a slab settles. */
export const dockLocal = (lap: (typeof LAPTOPS)[number], size: number) =>
  new THREE.Vector3(lap.p[0], PLINTH_TOP + 0.34 * LAP_SCALE[lap.size] + CHUNK_T[size] / 2 + 0.06, lap.p[2] + 0.04)

/* ------------------------------------------------------------------ */
/* merged-geometry helpers — one draw call for all static pieces        */
/* ------------------------------------------------------------------ */

const _e = new THREE.Euler()
const _q = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _pre = new THREE.Matrix4()

export type PutBag = THREE.BufferGeometry[]

/** transformed + painted geo pushed into `bag`; `pre` = parent frame baked in first. */
export function put(
  bag: PutBag,
  g0: THREE.BufferGeometry,
  hex: string,
  x: number, y: number, z: number,
  o: { rx?: number; ry?: number; rz?: number; s?: number | [number, number, number]; pre?: THREE.Matrix4 } = {},
) {
  const g = g0.index ? g0.toNonIndexed() : g0
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  const [sx, sy, sz] = Array.isArray(o.s) ? o.s : [o.s ?? 1, o.s ?? 1, o.s ?? 1]
  _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  _s.set(sx, sy, sz)
  _m.compose(_p, _q, _s)
  if (o.pre) _m.premultiply(o.pre)
  g.applyMatrix4(_m)
  paint(g, hex, undefined, 0.04)
  bag.push(g)
}

/** frame matrix for a positioned+rotated group (so sub-specs stay in local coords). */
export const frame = (x: number, y: number, z: number, ry = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1))

export function merged(specs: PutBag) {
  const g = mergeGeometries(specs, false)
  specs.forEach((x) => x.dispose())
  return g
}

/** The single vertex-coloured material for every merged static. */
export const useVcMat = () => useMemo(() => clayVC(), [])

/** Shared invisible material for colliders + the pad walk mesh — zero draw calls. */
export const INVIS = new THREE.MeshBasicMaterial({ visible: false })

/* ------------------------------------------------------------------ */
/* the giant static merge — desk, plinths, lift shell, deck, shard,     */
/* yard, lectern, entry disc: ONE mesh, ONE draw call                   */
/* ------------------------------------------------------------------ */

export const STAIR: { p: [number, number, number]; yaw: number; w: number }[] = [
  { p: [1.42, 1.7, -4.62], yaw: 0.1, w: 0.62 },
  { p: [1.62, 1.4, -4.4], yaw: -0.15, w: 0.6 },
  { p: [1.8, 1.1, -4.14], yaw: 0.12, w: 0.6 },
  { p: [1.92, 0.8, -3.86], yaw: -0.08, w: 0.58 },
  { p: [2.0, 0.5, -3.55], yaw: 0.1, w: 0.58 },
  { p: [2.02, 0.2, -3.24], yaw: -0.05, w: 0.6 },
]

function deskSpecs(bag: PutBag) {
  const pre = frame(DESK_P[0], DESK_P[1], DESK_P[2], DESK_YAW)
  put(bag, new THREE.BoxGeometry(1.5, 0.06, 0.72), C.woodLight, 0, 0.59, 0, { pre })
  for (const [x, z] of [[-0.66, -0.28], [0.66, -0.28], [-0.66, 0.28], [0.66, 0.28]] as const)
    put(bag, new THREE.CylinderGeometry(0.035, 0.045, 0.56, 7), C.wood, x, 0.28, z, { pre })
  put(bag, new THREE.BoxGeometry(1.2, 0.04, 0.5), C.wood, 0, 0.3, 0, { pre })
  // router
  put(bag, new RoundedBoxGeometry(0.3, 0.07, 0.2, 2, 0.015), C.cream, -0.3, 0.655, -0.05, { pre })
  put(bag, new THREE.CylinderGeometry(0.007, 0.007, 0.2, 6), C.ink, -0.39, 0.78, -0.11, { rz: 0.3, pre })
  put(bag, new THREE.CylinderGeometry(0.007, 0.007, 0.2, 6), C.ink, -0.21, 0.78, -0.11, { rz: -0.3, pre })
  // desk lamp
  put(bag, new THREE.CylinderGeometry(0.07, 0.08, 0.03, 10), C.terracotta, 0.45, 0.635, -0.1, { pre })
  put(bag, new THREE.CylinderGeometry(0.014, 0.014, 0.24, 6), C.terracotta, 0.47, 0.76, -0.1, { rz: -0.25, pre })
  put(bag, new THREE.ConeGeometry(0.07, 0.09, 10, 1, true), C.terracotta, 0.41, 0.88, -0.08, { rx: 0.5, rz: 0.35, pre })
  // mug
  put(bag, new THREE.CylinderGeometry(0.045, 0.038, 0.08, 10), '#b5654a', 0.12, 0.66, 0.18, { pre })
  put(bag, new THREE.TorusGeometry(0.03, 0.009, 6, 12, Math.PI), '#b5654a', 0.17, 0.665, 0.18, { ry: Math.PI / 2, pre })
  // folded note + stool
  put(bag, new RoundedBoxGeometry(0.24, 0.03, 0.18, 2, 0.01), C.paper, 0.02, 0.635, -0.22, { ry: 0.4, pre })
  put(bag, new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8), C.wood, 0.15, 0.3, 0.75, { pre })
  put(bag, new THREE.CylinderGeometry(0.2, 0.17, 0.08, 12), '#c9875f', 0.15, 0.6, 0.75, { pre })
}

function plinthSpecs(bag: PutBag) {
  LAPTOPS.forEach((lap) => {
    const s = LAP_SCALE[lap.size]
    const pre = frame(lap.p[0], lap.p[1], lap.p[2], lap.yaw)
    const w = 0.42 * s
    put(bag, new THREE.CylinderGeometry(0.2 * s + 0.09, 0.24 * s + 0.11, PLINTH_TOP, 14), C.stone, 0, PLINTH_TOP / 2 - 0.03, 0, { pre })
    put(bag, new THREE.CylinderGeometry(0.21 * s + 0.09, 0.21 * s + 0.09, 0.016, 14), C.stoneLight, 0, PLINTH_TOP + 0.008, 0, { pre })
    put(bag, new RoundedBoxGeometry(w, 0.032 * s, 0.3 * s, 2, 0.012), '#e2cdaa', 0, PLINTH_TOP + 0.016 + 0.016 * s, 0.02, { pre })
    const lid = frame(0, PLINTH_TOP + 0.016 + 0.034 * s, -0.115 * s, 0)
    lid.premultiply(pre)
    lid.multiply(_pre.makeRotationX(-0.34))
    put(bag, new RoundedBoxGeometry(w, 0.28 * s, 0.02, 2, 0.01), C.paper, 0, 0.14 * s, 0, { pre: lid })
    // the hue-coded size LED — painted, not emissive (screens carry the glow)
    put(bag, new THREE.SphereGeometry(0.013, 8, 8), HUES[lap.size], 0, PLINTH_TOP + 0.016 + 0.036 * s, 0.15 * s, { pre })
  })
}

function liftStatics(bag: PutBag) {
  // the dark "cradle" slot the lift rises out of — stays on the ground
  put(bag, new THREE.BoxGeometry(PAD_W + 0.12, 0.024, PAD_D + 0.12), '#57504b', LIFT_C.x, 0.012, LIFT_C.z, { ry: 0.02 })
}

function deckStatics(bag: PutBag) {
  put(bag, new THREE.CylinderGeometry(0.5, 0.82, 2.35, 12), '#9d8469', 0, 0.72, -5.3)
  put(bag, new THREE.CylinderGeometry(0.86, 1.02, 0.5, 12), '#8c7055', 0, 0.22, -5.3)
  for (const z of [-4.55, -5.15, -5.75])
    put(bag, new THREE.CylinderGeometry(0.028, 0.034, 0.4, 7), C.wood, -1.12, DECK_Y + 0.2, z)
  for (const x of [-1.12, 1.12])
    put(bag, new THREE.CylinderGeometry(0.028, 0.034, 0.4, 7), C.wood, x, DECK_Y + 0.2, -5.9)
  for (const z of [-5.5, -5.9])
    put(bag, new THREE.CylinderGeometry(0.028, 0.034, 0.4, 7), C.wood, 1.12, DECK_Y + 0.2, z)
  put(bag, new THREE.CylinderGeometry(0.03, 0.03, 1.55, 7), C.woodLight, -1.12, DECK_Y + 0.4, -5.15, { rx: Math.PI / 2 })
  put(bag, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 7), C.woodLight, 0, DECK_Y + 0.4, -5.9, { rz: Math.PI / 2 })
  put(bag, new THREE.CylinderGeometry(0.03, 0.03, 0.62, 7), C.woodLight, 1.12, DECK_Y + 0.4, -5.68, { rx: Math.PI / 2 })
  // lantern pole + cap (bulb stays an animated mesh)
  put(bag, new THREE.CylinderGeometry(0.024, 0.034, 0.92, 7), C.wood, -1.02, DECK_Y + 0.46, -5.62)
  put(bag, new THREE.ConeGeometry(0.09, 0.08, 8), C.terracotta, -1.02, DECK_Y + 1.04, -5.62)
}

function shardStatics(bag: PutBag) {
  const { c, r } = SHARD
  const rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }
  put(bag, new THREE.ConeGeometry(r * 0.92, 1.15, 12), '#9d8469', c.x, c.y - 0.62, c.z, { rx: Math.PI })
  put(bag, new THREE.TorusGeometry(r * 0.86, 0.05, 6, 22), '#b19d82', c.x, c.y - 0.14, c.z, { rx: Math.PI / 2 })
  for (let i = 0; i < 5; i++) {
    const a = rnd(i) * Math.PI * 2
    const d = r * (0.45 + rnd(i + 9) * 0.4)
    const k = rnd(i + 4)
    put(bag, new THREE.ConeGeometry(0.05 + k * 0.03, 0.16 + k * 0.1, 5), i % 2 ? C.leafDark : C.moss,
      c.x + Math.cos(a) * d, c.y + 0.05, c.z + Math.sin(a) * d,
      { rx: (k - 0.5) * 0.4, ry: k * 3, rz: (k - 0.5) * 0.4 })
  }
}

function callStatics(bag: PutBag) {
  put(bag, new THREE.CylinderGeometry(0.045, 0.06, 0.64, 8), '#4a423d', 1.25, 0.32, -3.3)
}

function rackStatics(bag: PutBag) {
  const pre = frame(-3.3, 0, -1.85, 0.62)
  for (const x of [-0.34, 0.34])
    put(bag, new THREE.BoxGeometry(0.05, 1.04, 0.44), C.wood, x, 0.52, 0, { pre })
  for (const y of [0.14, 0.5, 0.86])
    put(bag, new THREE.BoxGeometry(0.72, 0.035, 0.44), C.woodLight, 0, y, 0, { pre })
  for (const y of [0.22, 0.58, 0.94])
    put(bag, new RoundedBoxGeometry(0.52, 0.09, 0.34, 2, 0.02), '#4a4340', 0, y, 0.01, { pre })
  put(bag, new THREE.BoxGeometry(0.2, 0.012, 0.14), C.paper, 0, 1.1, -0.06, { rx: 0.25, pre })
}

function crateStatics(bag: PutBag) {
  const pre = frame(-1.85, 0, -3.8, -0.2)
  put(bag, new RoundedBoxGeometry(0.62, 0.34, 0.62, 2, 0.03), '#b39872', 0, 0.17, 0, { pre })
  put(bag, new RoundedBoxGeometry(0.44, 0.26, 0.44, 2, 0.025), '#c4a87e', 0.14, 0.47, 0.08, { ry: 0.35, pre })
  put(bag, new RoundedBoxGeometry(0.3, 0.2, 0.3, 2, 0.02), '#a98c68', -0.38, 0.1, 0.3, { ry: -0.3, pre })
  put(bag, new THREE.BoxGeometry(0.16, 0.012, 0.11), C.paper, 0.02, 0.34, 0.32, { rx: 0.4, ry: 0.1, pre })
  put(bag, new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), '#8c7055', 0.32, 0.1, -0.34, { ry: 0.2, rz: Math.PI / 2, pre })
}

function lightStatics(bag: PutBag) {
  const pre = frame(-1.55, 0, -3.1, 0.5)
  put(bag, new THREE.CylinderGeometry(0.035, 0.055, 1.2, 8), C.wood, 0, 0.6, 0, { pre })
  put(bag, new THREE.CylinderGeometry(0.025, 0.032, 0.4, 7), C.wood, 0.16, 1.18, 0, { rz: -0.85, pre })
  put(bag, new THREE.ConeGeometry(0.1, 0.11, 12, 1, true), '#c9875f', 0.3, 1.14, 0, { pre })
  put(bag, new THREE.CylinderGeometry(0.14, 0.17, 0.12, 10), '#8c7055', 0, 0.06, 0, { pre })
}

function storyStatics(bag: PutBag) {
  const pre = frame(STORY_P[0], STORY_P[1], STORY_P[2], -2.5)
  put(bag, new THREE.CylinderGeometry(0.045, 0.065, 0.84, 8), C.wood, 0, 0.42, 0, { pre })
  const board = frame(0, 0.86, 0, 0)
  board.premultiply(pre)
  board.multiply(_pre.makeRotationX(-0.42))
  put(bag, new RoundedBoxGeometry(0.44, 0.03, 0.32, 2, 0.015), C.woodLight, 0, 0, 0, { pre: board })
  put(bag, new RoundedBoxGeometry(0.34, 0.008, 0.24, 2, 0.006), '#efe3cd', 0, 0.018, 0, { pre: board })
  put(bag, new THREE.CylinderGeometry(0.13, 0.16, 0.1, 10), '#8c7055', 0, 0.05, 0, { pre })
}

/** One merged mesh for every static, non-walkable piece — a single draw call. */
export function Statics() {
  const g = useMemo(() => {
    const bag: PutBag = []
    deskSpecs(bag)
    plinthSpecs(bag)
    liftStatics(bag)
    deckStatics(bag)
    shardStatics(bag)
    callStatics(bag)
    rackStatics(bag)
    crateStatics(bag)
    lightStatics(bag)
    storyStatics(bag)
    put(bag, new THREE.CircleGeometry(0.5, 20), '#d6cab4', 0, 0.02, 4.2, { rx: -Math.PI / 2 })
    return merged(bag)
  }, [])
  const mat = useVcMat()
  return <mesh geometry={g ?? undefined} material={mat} castShadow receiveShadow />
}

/** Walkable statics: deck slab + the six stair slabs + the shard top — one mesh. */
export function WalkStatics() {
  const walk = useRef<THREE.Mesh>(null)
  useWalkable(walk)
  const g = useMemo(() => {
    const bag: PutBag = []
    put(bag, new RoundedBoxGeometry(2.4, 0.26, 1.7, 2, 0.06), C.stoneLight, 0, DECK_Y - 0.13, -5.1)
    for (const s of STAIR)
      put(bag, new RoundedBoxGeometry(s.w, 0.14, 0.52, 2, 0.05), '#b8ab97', s.p[0], s.p[1], s.p[2], { ry: s.yaw })
    put(bag, new THREE.CylinderGeometry(SHARD.r, SHARD.r * 0.96, 0.14, 22), '#8fae6d', SHARD.c.x, SHARD.c.y - 0.055, SHARD.c.z)
    return merged(bag)
  }, [])
  const mat = useVcMat()
  return <mesh ref={walk} geometry={g ?? undefined} material={mat} castShadow receiveShadow />
}

/* ------------------------------------------------------------------ */
/* small pieces that stay separate (animated mats / moving parts)       */
/* ------------------------------------------------------------------ */

/** Glowing translucent model slab — two boxes merged into one geometry. */
export const chunkGeo = (size: number) => {
  const w = CHUNK_W[size]
  const bag: PutBag = []
  put(bag, new RoundedBoxGeometry(w, CHUNK_T[size], w * 1.25, 2, 0.03), '#ffffff', 0, 0, 0)
  put(bag, new RoundedBoxGeometry(w * 0.82, CHUNK_T[size] + 0.008, w, 2, 0.02), '#ffffff', 0, 0.002, 0)
  return merged(bag)!
}

/** Dark lift pad: merged shell (walkable) + trim ring + the 4-segment dial. */
export function LiftPad({
  trimMat,
  segMats,
  padRef,
}: {
  trimMat: THREE.MeshStandardMaterial
  segMats: THREE.MeshStandardMaterial[]
  padRef: React.RefObject<THREE.Group>
}) {
  const walk = useRef<THREE.Mesh>(null)
  useWalkable(walk)
  const vc = useVcMat()
  const padGeo = useMemo(() => {
    const bag: PutBag = []
    put(bag, new THREE.BoxGeometry(PAD_W, 0.14, PAD_D), '#46403c', 0, PAD_TOP - 0.07, 0)
    put(bag, new RoundedBoxGeometry(PAD_W - 0.18, 0.02, PAD_D - 0.18, 2, 0.01), '#524a45', 0, PAD_TOP + 0.004, 0)
    put(bag, new THREE.BoxGeometry(0.5, 0.07, 0.12), '#3b3533', 0, 0.035, PAD_D / 2 + 0.02)
    put(bag, new THREE.CylinderGeometry(0.028, 0.038, 1.1, 8), '#3b3533', -PAD_W / 2 + 0.18, 0.55, -PAD_D / 2 + 0.2)
    put(bag, new THREE.SphereGeometry(0.035, 10, 8), '#3b3533', -PAD_W / 2 + 0.18, 1.18, -PAD_D / 2 + 0.22)
    return merged(bag)!
  }, [])
  const trimGeo = useMemo(() => {
    const bag: PutBag = []
    put(bag, new THREE.BoxGeometry(PAD_W, 0.02, 0.05), '#ffffff', 0, PAD_TOP + 0.002, PAD_D / 2 - 0.045)
    put(bag, new THREE.BoxGeometry(PAD_W, 0.02, 0.05), '#ffffff', 0, PAD_TOP + 0.002, -PAD_D / 2 + 0.045)
    put(bag, new THREE.BoxGeometry(0.05, 0.02, PAD_D - 0.1), '#ffffff', PAD_W / 2 - 0.045, PAD_TOP + 0.002, 0)
    put(bag, new THREE.BoxGeometry(0.05, 0.02, PAD_D - 0.1), '#ffffff', -PAD_W / 2 + 0.045, PAD_TOP + 0.002, 0)
    return merged(bag)!
  }, [])
  return (
    <group ref={padRef} position={LIFT_C}>
      <mesh ref={walk} position={[0, PAD_TOP - 0.07, 0]} material={INVIS}>
        <boxGeometry args={[PAD_W, 0.14, PAD_D]} />
      </mesh>
      <mesh geometry={padGeo} material={vc} castShadow receiveShadow />
      <mesh geometry={trimGeo} material={trimMat} />
      <group position={[-PAD_W / 2 + 0.18, 1.18, -PAD_D / 2 + 0.22]}>
        {segMats.map((m, i) => (
          <mesh key={i} rotation={[0, 0, i * (Math.PI / 2) + 0.07]} material={m}>
            <torusGeometry args={[0.3, 0.026, 6, 14, Math.PI / 2 - 0.14]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The invisible colliders — same footprint as the merged visuals, zero draws. */
export function Colliders() {
  const desk = useRef<THREE.Mesh>(null)
  const rack = useRef<THREE.Mesh>(null)
  const crates = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.Mesh>(null)
  const post = useRef<THREE.Mesh>(null)
  const call = useRef<THREE.Mesh>(null)
  const rW = useRef<THREE.Mesh>(null)
  const rB = useRef<THREE.Mesh>(null)
  const rE = useRef<THREE.Mesh>(null)
  useBlocker(desk); useBlocker(rack); useBlocker(crates); useBlocker(light); useBlocker(post)
  useBlocker(call); useBlocker(rW); useBlocker(rB); useBlocker(rE)
  const inv = INVIS
  return (
    <group>
      <mesh ref={desk} position={[DESK_P[0], 0.59, DESK_P[2]]} rotation={[0, DESK_YAW, 0]} material={inv}>
        <boxGeometry args={[1.5, 1.18, 0.72]} />
      </mesh>
      <mesh ref={rack} position={[-3.3, 0.52, -1.85]} rotation={[0, 0.62, 0]} material={inv}>
        <boxGeometry args={[0.72, 1.04, 0.44]} />
      </mesh>
      <mesh ref={crates} position={[-1.77, 0.3, -3.78]} material={inv}>
        <boxGeometry args={[0.95, 0.6, 0.95]} />
      </mesh>
      <mesh ref={light} position={[-1.55, 0.6, -3.1]} material={inv}>
        <cylinderGeometry args={[0.035, 0.055, 1.2, 8]} />
      </mesh>
      <mesh ref={post} position={[STORY_P[0], 0.42, STORY_P[2]]} material={inv}>
        <cylinderGeometry args={[0.045, 0.065, 0.84, 8]} />
      </mesh>
      <mesh ref={call} position={[1.25, 0.32, -3.3]} material={inv}>
        <cylinderGeometry args={[0.045, 0.06, 0.64, 8]} />
      </mesh>
      <mesh ref={rW} position={[-1.12, DECK_Y + 0.4, -5.15]} rotation={[Math.PI / 2, 0, 0]} material={inv}>
        <cylinderGeometry args={[0.03, 0.03, 1.55, 7]} />
      </mesh>
      <mesh ref={rB} position={[0, DECK_Y + 0.4, -5.9]} rotation={[0, 0, Math.PI / 2]} material={inv}>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 7]} />
      </mesh>
      <mesh ref={rE} position={[1.12, DECK_Y + 0.4, -5.68]} rotation={[Math.PI / 2, 0, 0]} material={inv}>
        <cylinderGeometry args={[0.03, 0.03, 0.62, 7]} />
      </mesh>
    </group>
  )
}

/** Per-laptop invisible plinth collider. */
export function PlinthBlock({ lap }: { lap: (typeof LAPTOPS)[number] }) {
  const block = useRef<THREE.Mesh>(null)
  useBlocker(block)
  const s = LAP_SCALE[lap.size]
  return (
    <mesh ref={block} position={[lap.p[0], PLINTH_TOP / 2 - 0.03, lap.p[2]]} material={INVIS}>
      <cylinderGeometry args={[0.2 * s + 0.09, 0.24 * s + 0.11, PLINTH_TOP, 14]} />
    </mesh>
  )
}

/** Plank that extends from the rim to the shard once the player builds it. */
export function Plank() {
  const walk = useRef<THREE.Mesh>(null)
  const grow = useRef<THREE.Group>(null)
  useWalkable(walk)
  const { len, yaw, pitch } = useMemo(() => {
    const d = PLANK_B.clone().sub(PLANK_A)
    return { len: Math.hypot(d.x, d.z) + 0.3, yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y / d.length()) }
  }, [])
  useFrame((_, dt) => {
    const g = grow.current
    if (g && g.scale.z < 1) {
      g.scale.z = Math.min(1, g.scale.z + dt * 1.8)
      g.visible = g.scale.z > 0.02
    }
  })
  return (
    <group position={PLANK_A} rotation={[0, yaw, 0]}>
      <group ref={grow} scale={[1, 1, 0.001]} rotation={[-pitch, 0, 0]}>
        <mesh ref={walk} position={[0, 0, len / 2]} material={clay(C.woodLight)} castShadow receiveShadow>
          <boxGeometry args={[0.52, 0.06, len]} />
        </mesh>
        {[0.3, len - 0.3].map((z, i) => (
          <mesh key={i} position={[0, 0.045, z]} material={clay(C.wood)}>
            <boxGeometry args={[0.56, 0.03, 0.07]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Cable curve from a plinth to the lift hub, hugging the ground. */
export function cableCurve(lap: (typeof LAPTOPS)[number]) {
  const a = new THREE.Vector3(lap.p[0], 0.035, lap.p[2])
  const b = new THREE.Vector3(LIFT_C.x + (lap.p[0] - LIFT_C.x) * 0.22, 0.03, LIFT_C.z + PAD_D / 2 + 0.05)
  const mid = a.clone().lerp(b, 0.5); mid.y = 0.02
  return new THREE.CatmullRomCurve3([a, mid, b])
}

/* ------- small animated-material props (each = 1 draw call) -------- */

/** Router LED + desk-lamp bulb + the three wifi arcs (one merged geo). */
export function DeskFx({ ledMat, lampMat, wifiMat }: { ledMat: THREE.Material; lampMat: THREE.Material; wifiMat: THREE.Material }) {
  const pre = useMemo(() => frame(DESK_P[0], DESK_P[1], DESK_P[2], DESK_YAW), [])
  const ledP = useMemo(() => new THREE.Vector3(-0.19, 0.67, 0.03).applyMatrix4(pre), [pre])
  const lampP = useMemo(() => new THREE.Vector3(0.405, 0.855, -0.072).applyMatrix4(pre), [pre])
  const wifiGeo = useMemo(() => {
    const bag: PutBag = []
    for (const rr of [0.09, 0.15, 0.21])
      put(bag, new THREE.TorusGeometry(rr, 0.008, 6, 16, Math.PI * 0.6), '#ffffff', -0.3, 0.72, -0.07, { rz: Math.PI * 0.2, pre })
    return merged(bag)!
  }, [pre])
  return (
    <group>
      <mesh geometry={wifiGeo} material={wifiMat} />
      <mesh position={ledP} material={ledMat}>
        <sphereGeometry args={[0.012, 8, 8]} />
      </mesh>
      <mesh position={lampP} material={lampMat}>
        <sphereGeometry args={[0.02, 8, 8]} />
      </mesh>
    </group>
  )
}

/** Six ember status lights on the rack — one shared mat, one merged geo. */
export function RackLeds({ mat }: { mat: THREE.Material }) {
  const geo = useMemo(() => {
    const pre = frame(-3.3, 0, -1.85, 0.62)
    const bag: PutBag = []
    const ys = [0.22, 0.58, 0.94]
    ys.forEach((y) => {
      for (let i = 0; i < 2; i++)
        put(bag, new THREE.CircleGeometry(0.014, 8), '#ffffff', -0.26 + 0.07 + i * 0.09, y + 0.012, 0.19, { rx: Math.PI / 2, pre })
    })
    return merged(bag)!
  }, [])
  return <mesh geometry={geo} material={mat} />
}

/** Warm work-light bulb (pole lives in the statics merge). */
export function YardBulb({ mat }: { mat: THREE.Material }) {
  const pre = useMemo(() => frame(-1.55, 0, -3.1, 0.5), [])
  const p = useMemo(() => new THREE.Vector3(0.3, 1.08, 0).applyMatrix4(pre), [pre])
  return (
    <mesh position={p} material={mat}>
      <sphereGeometry args={[0.055, 12, 10]} />
    </mesh>
  )
}

/** Call-post bulb (pole lives in the statics merge). */
export function CallBulb({ mat }: { mat: THREE.Material }) {
  return (
    <mesh position={[1.25, 0.68, -3.3]} material={mat}>
      <sphereGeometry args={[0.05, 12, 10]} />
    </mesh>
  )
}

/** Deck lantern bulb (pole + cap live in the statics merge). */
export function LanternBulb({ mat }: { mat: THREE.Material }) {
  return (
    <mesh position={[-1.02, DECK_Y + 0.95, -5.62]} material={mat} castShadow>
      <sphereGeometry args={[0.075, 12, 10]} />
    </mesh>
  )
}
