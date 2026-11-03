/** L05 Ent — shared layout constants + presentational pieces for the V5 obstacle. */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { C, clay } from '../../world/kit'
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

/** One laptop on its stone plinth. Screen glows the slab's hue once loaded. */
export function PlinthLaptop({
  lap,
  screenMat,
}: {
  lap: (typeof LAPTOPS)[number]
  screenMat: THREE.Material
}) {
  const s = LAP_SCALE[lap.size]
  const block = useRef<THREE.Mesh>(null)
  useBlocker(block)
  const ledMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#efe4d2', roughness: 0.5, emissive: HUES[lap.size], emissiveIntensity: 0.55 }),
    [lap.size],
  )
  const w = 0.42 * s
  return (
    <group position={lap.p} rotation={[0, lap.yaw, 0]}>
      <mesh ref={block} position={[0, PLINTH_TOP / 2 - 0.03, 0]} material={clay(C.stone)} castShadow receiveShadow>
        <cylinderGeometry args={[0.2 * s + 0.09, 0.24 * s + 0.11, PLINTH_TOP, 14]} />
      </mesh>
      <mesh position={[0, PLINTH_TOP + 0.008, 0]} material={clay(C.stoneLight)} receiveShadow>
        <cylinderGeometry args={[0.21 * s + 0.09, 0.21 * s + 0.09, 0.016, 14]} />
      </mesh>
      <group position={[0, PLINTH_TOP + 0.016, 0]}>
        <RoundedBox args={[w, 0.032 * s, 0.3 * s]} radius={0.012} position={[0, 0.016 * s, 0.02]} material={clay('#e2cdaa')} castShadow />
        <group position={[0, 0.034 * s, -0.115 * s]} rotation={[-0.34, 0, 0]}>
          <RoundedBox args={[w, 0.28 * s, 0.02]} radius={0.01} position={[0, 0.14 * s, 0]} material={clay(C.paper)} castShadow />
          <RoundedBox args={[w * 0.86, 0.22 * s, 0.021]} radius={0.008} position={[0, 0.145 * s, 0.004]} material={screenMat} />
        </group>
        <mesh position={[0, 0.036 * s, 0.15 * s]} material={ledMat}>
          <sphereGeometry args={[0.013, 8, 8]} />
        </mesh>
      </group>
    </group>
  )
}

/** Glowing translucent model slab. */
export function ChunkSlab({ size, mat }: { size: number; mat: THREE.Material }) {
  const w = CHUNK_W[size]
  return (
    <group>
      <RoundedBox args={[w, CHUNK_T[size], w * 1.25]} radius={0.03} material={mat} castShadow />
      <RoundedBox args={[w * 0.82, CHUNK_T[size] + 0.008, w]} radius={0.02} position={[0, 0.002, 0]} material={mat} />
    </group>
  )
}

/** Dark lift platform: charcoal pad, rust trim, mast with the 4-segment balance dial, cable hub. */
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
  return (
    <group ref={padRef} position={LIFT_C}>
      <mesh ref={walk} position={[0, PAD_TOP - 0.07, 0]} material={clay('#46403c')} castShadow receiveShadow>
        <boxGeometry args={[PAD_W, 0.14, PAD_D]} />
      </mesh>
      <RoundedBox args={[PAD_W - 0.18, 0.02, PAD_D - 0.18]} radius={0.01} position={[0, PAD_TOP + 0.004, 0]} material={clay('#524a45')} receiveShadow />
      {([
        [0, PAD_D / 2 - 0.045, PAD_W, 0.05],
        [0, -PAD_D / 2 + 0.045, PAD_W, 0.05],
        [PAD_W / 2 - 0.045, 0, 0.05, PAD_D - 0.1],
        [-PAD_W / 2 + 0.045, 0, 0.05, PAD_D - 0.1],
      ] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, PAD_TOP + 0.002, z]} material={trimMat}>
          <boxGeometry args={[w, 0.02, d]} />
        </mesh>
      ))}
      <mesh position={[0, 0.035, PAD_D / 2 + 0.02]} material={clay('#3b3533')} castShadow>
        <boxGeometry args={[0.5, 0.07, 0.12]} />
      </mesh>
      <group position={[-PAD_W / 2 + 0.18, 0, -PAD_D / 2 + 0.2]}>
        <mesh position={[0, 0.55, 0]} material={clay('#3b3533')} castShadow>
          <cylinderGeometry args={[0.028, 0.038, 1.1, 8]} />
        </mesh>
        <group position={[0, 1.18, 0.02]}>
          {segMats.map((m, i) => (
            <mesh key={i} rotation={[0, 0, i * (Math.PI / 2) + 0.07]} material={m}>
              <torusGeometry args={[0.3, 0.026, 6, 14, Math.PI / 2 - 0.14]} />
            </mesh>
          ))}
          <mesh material={clay('#3b3533')}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/** Slim call post beside the lift so it can be brought back down. */
export function CallPost({ litMat }: { litMat: THREE.Material }) {
  const block = useRef<THREE.Mesh>(null)
  useBlocker(block)
  return (
    <group position={[1.25, 0, -3.3]}>
      <mesh ref={block} position={[0, 0.32, 0]} material={clay('#4a423d')} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.64, 8]} />
      </mesh>
      <mesh position={[0, 0.68, 0]} material={litMat}>
        <sphereGeometry args={[0.05, 12, 10]} />
      </mesh>
    </group>
  )
}

/** High exit deck on a stone pier at the back rim, with chunky slab steps
 *  winding down its east face to the exit pad. Lantern warms once the lift docks. */
export const STAIR: { p: [number, number, number]; yaw: number; w: number }[] = [
  { p: [1.42, 1.7, -4.62], yaw: 0.1, w: 0.62 },
  { p: [1.62, 1.4, -4.4], yaw: -0.15, w: 0.6 },
  { p: [1.8, 1.1, -4.14], yaw: 0.12, w: 0.6 },
  { p: [1.92, 0.8, -3.86], yaw: -0.08, w: 0.58 },
  { p: [2.0, 0.5, -3.55], yaw: 0.1, w: 0.58 },
  { p: [2.02, 0.2, -3.24], yaw: -0.05, w: 0.6 },
]
export function ExitDeck({ lanternMat }: { lanternMat: THREE.Material }) {
  const walk = useRef<THREE.Mesh>(null)
  const rW = useRef<THREE.Mesh>(null)
  const rB = useRef<THREE.Mesh>(null)
  const rE = useRef<THREE.Mesh>(null)
  useWalkable(walk)
  useBlocker(rW)
  useBlocker(rB)
  useBlocker(rE)
  const posts = (x: number, zs: number[]) =>
    zs.map((z, i) => (
      <mesh key={i} position={[x, DECK_Y + 0.2, z]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.028, 0.034, 0.4, 7]} />
      </mesh>
    ))
  return (
    <group>
      {/* stone pier */}
      <mesh position={[0, 0.72, -5.3]} material={clay('#9d8469')} castShadow>
        <cylinderGeometry args={[0.5, 0.82, 2.35, 12]} />
      </mesh>
      <mesh position={[0, 0.22, -5.3]} material={clay('#8c7055')} castShadow>
        <cylinderGeometry args={[0.86, 1.02, 0.5, 12]} />
      </mesh>
      {/* top slab */}
      <RoundedBox ref={walk} args={[2.4, 0.26, 1.7]} radius={0.06} position={[0, DECK_Y - 0.13, -5.1]} material={clay(C.stoneLight)} castShadow receiveShadow />
      {/* west rail */}
      {posts(-1.12, [-4.55, -5.15, -5.75])}
      <mesh ref={rW} position={[-1.12, DECK_Y + 0.4, -5.15]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.woodLight)} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.55, 7]} />
      </mesh>
      {/* back rail */}
      {[-1.12, 1.12].map((x, i) => (
        <mesh key={i} position={[x, DECK_Y + 0.2, -5.9]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.028, 0.034, 0.4, 7]} />
        </mesh>
      ))}
      <mesh ref={rB} position={[0, DECK_Y + 0.4, -5.9]} rotation={[0, 0, Math.PI / 2]} material={clay(C.woodLight)} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 7]} />
      </mesh>
      {/* short east rail over the stair head */}
      {posts(1.12, [-5.5, -5.9])}
      <mesh ref={rE} position={[1.12, DECK_Y + 0.4, -5.68]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.woodLight)} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.62, 7]} />
      </mesh>
      {/* slab steps down the east face */}
      {STAIR.map((s, i) => (
        <StairSlab key={i} p={s.p} yaw={s.yaw} w={s.w} />
      ))}
      {/* lantern warms when the lift has docked */}
      <group position={[-1.02, DECK_Y, -5.62]}>
        <mesh position={[0, 0.46, 0]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.024, 0.034, 0.92, 7]} />
        </mesh>
        <mesh position={[0, 0.95, 0]} material={lanternMat} castShadow>
          <sphereGeometry args={[0.075, 12, 10]} />
        </mesh>
        <mesh position={[0, 1.04, 0]} material={clay(C.terracotta)}>
          <coneGeometry args={[0.09, 0.08, 8]} />
        </mesh>
      </group>
    </group>
  )
}

function StairSlab({ p, yaw, w }: { p: [number, number, number]; yaw: number; w: number }) {
  const walk = useRef<THREE.Mesh>(null)
  useWalkable(walk)
  return (
    <RoundedBox ref={walk} args={[w, 0.14, 0.52]} radius={0.05} position={p} rotation={[0, yaw, 0]} material={clay('#b8ab97')} castShadow receiveShadow />
  )
}

/** Little floating ledge beyond the east gap — one slab sits here. */
export function Shard() {
  const walk = useRef<THREE.Mesh>(null)
  useWalkable(walk)
  const { c, r } = SHARD
  const rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const tufts = useMemo(
    () => [...Array(5)].map((_, i) => { const a = rnd(i) * Math.PI * 2, d = r * (0.45 + rnd(i + 9) * 0.4); return [Math.cos(a) * d, Math.sin(a) * d, rnd(i + 4)] as const }),
    [r],
  )
  return (
    <group position={c}>
      <mesh ref={walk} position={[0, -0.055, 0]} material={clay('#8fae6d')} receiveShadow castShadow>
        <cylinderGeometry args={[r, r * 0.96, 0.14, 22]} />
      </mesh>
      <mesh position={[0, -0.62, 0]} rotation={[Math.PI, 0, 0]} material={clay('#9d8469')} castShadow>
        <coneGeometry args={[r * 0.92, 1.15, 12]} />
      </mesh>
      <mesh position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay('#b19d82')}>
        <torusGeometry args={[r * 0.86, 0.05, 6, 22]} />
      </mesh>
      {tufts.map(([x, z, k], i) => (
        <mesh key={i} position={[x, 0.05, z]} rotation={[(k - 0.5) * 0.4, k * 3, (k - 0.5) * 0.4]} material={clay(i % 2 ? C.leafDark : C.moss)}>
          <coneGeometry args={[0.05 + k * 0.03, 0.16 + k * 0.1, 5]} />
        </mesh>
      ))}
    </group>
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

/** Home desk landmark: router with antennae, rust desk lamp, mug, stool. */
export function HomeDesk({
  ledMat,
  lampMat,
  wifiMat,
}: {
  ledMat: THREE.MeshStandardMaterial
  lampMat: THREE.MeshStandardMaterial
  wifiMat: THREE.MeshStandardMaterial
}) {
  const block = useRef<THREE.Mesh>(null)
  useBlocker(block)
  return (
    <group position={DESK_P} rotation={[0, DESK_YAW, 0]}>
      <mesh ref={block} position={[0, 0.59, 0]} material={clay(C.woodLight)} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.06, 0.72]} />
      </mesh>
      {[[-0.66, -0.28], [0.66, -0.28], [-0.66, 0.28], [0.66, 0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.28, z]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.56, 7]} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} material={clay(C.wood)}>
        <boxGeometry args={[1.2, 0.04, 0.5]} />
      </mesh>
      <group position={[-0.3, 0.62, -0.05]}>
        <RoundedBox args={[0.3, 0.07, 0.2]} radius={0.015} position={[0, 0.035, 0]} material={clay(C.cream)} castShadow />
        <mesh position={[-0.09, 0.16, -0.06]} rotation={[0, 0, 0.3]} material={clay(C.ink)}>
          <cylinderGeometry args={[0.007, 0.007, 0.2, 6]} />
        </mesh>
        <mesh position={[0.09, 0.16, -0.06]} rotation={[0, 0, -0.3]} material={clay(C.ink)}>
          <cylinderGeometry args={[0.007, 0.007, 0.2, 6]} />
        </mesh>
        <mesh position={[0.11, 0.05, 0.08]} material={ledMat}>
          <sphereGeometry args={[0.012, 8, 8]} />
        </mesh>
        {[0.09, 0.15, 0.21].map((rr, i) => (
          <mesh key={i} position={[0, 0.1, -0.02]} rotation={[0, 0, Math.PI * 0.2]} material={wifiMat}>
            <torusGeometry args={[rr, 0.008, 6, 16, Math.PI * 0.6]} />
          </mesh>
        ))}
      </group>
      <group position={[0.45, 0.62, -0.1]}>
        <mesh position={[0, 0.015, 0]} material={clay(C.terracotta)} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.03, 10]} />
        </mesh>
        <mesh position={[0.02, 0.14, 0]} rotation={[0, 0, -0.25]} material={clay(C.terracotta)} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.24, 6]} />
        </mesh>
        <mesh position={[-0.04, 0.26, 0.02]} rotation={[0.5, 0, 0.35]} material={clay(C.terracotta)} castShadow>
          <coneGeometry args={[0.07, 0.09, 10, 1, true]} />
        </mesh>
        <mesh position={[-0.045, 0.235, 0.028]} material={lampMat}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
      </group>
      <group position={[0.12, 0.62, 0.18]}>
        <mesh position={[0, 0.04, 0]} material={clay('#b5654a')} castShadow>
          <cylinderGeometry args={[0.045, 0.038, 0.08, 10]} />
        </mesh>
        <mesh position={[0.05, 0.045, 0]} rotation={[0, Math.PI / 2, 0]} material={clay('#b5654a')}>
          <torusGeometry args={[0.03, 0.009, 6, 12, Math.PI]} />
        </mesh>
      </group>
      <RoundedBox args={[0.24, 0.03, 0.18]} radius={0.01} position={[0.02, 0.635, -0.22]} rotation={[0, 0.4, 0]} material={clay(C.paper)} castShadow />
      <group position={[0.15, 0, 0.75]}>
        <mesh position={[0, 0.3, 0]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.55, 8]} />
        </mesh>
        <mesh position={[0, 0.6, 0]} material={clay('#c9875f')} castShadow>
          <cylinderGeometry args={[0.2, 0.17, 0.08, 12]} />
        </mesh>
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
