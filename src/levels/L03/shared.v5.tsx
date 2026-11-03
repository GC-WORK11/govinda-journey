/**
 * Shared pieces for the L03/I01 obstacles (ISL-B). Island-local coords, top y=0.
 * Look: ART pack props via <Prop> (src/v5/art/Dressing) + V4 clay (src/world/kit)
 * for the custom assemblies — same seam ISL-A uses.
 */
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay } from '../../world/kit'
import { carryAnchor, carryQuat } from '../../v5/player/anchor'
import { Prop } from '../../v5/art/Dressing'

export { C, clay, Prop }

export const REDUCED =
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- island frame ---------- */

/** Island-local player position, copied into `out` every frame. */
export function useLocalPlayer(root: RefObject<THREE.Group | null>, out: THREE.Vector3) {
  useFrame(() => {
    if (!root.current) return
    out.copy(core.player.pos)
    root.current.worldToLocal(out)
  })
}

/** Move the player to a WORLD-space point. Real Player: its teleport API (writes the
 *  authoritative state). Dev harness fallback: core.player. Safe to call every frame
 *  for short scripted moves (climb hop, bench glide). */
export function tpWorld(w: THREE.Vector3) {
  const tp = (window as any).__journey?.player?.teleport
  if (tp) tp(w.x, w.y, w.z)
  else {
    core.player.pos.copy(w)
    core.player.vel.set(0, 0, 0)
  }
}

/** Teleport the traveller to an island-local point (?qa solvers / my dev harness). */
export function tpLocal(root: THREE.Group | null, local: THREE.Vector3, yaw?: number) {
  if (!root) return
  const w = local.clone()
  root.localToWorld(w)
  tpWorld(w)
  if (yaw !== undefined) core.player.facing = yaw
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Await PLAYER's teleport api before a solver moves the player — the api attaches
 *  lazily and core.player.pos writes are overwritten by the controller each frame. */
export async function waitTp() {
  for (let i = 0; i < 80 && !(window as any).__journey?.player?.teleport; i++) await sleep(100)
}

/** Merge this island's ?qa solver into window.__journey.solve without clobbering others. */
export function useSolver(id: string, fn: () => Promise<void>) {
  useEffect(() => {
    const w = window as any
    w.__journey = w.__journey || {}
    w.__journey.solve = { ...(w.__journey.solve || {}), [id]: fn }
    return () => {
      if (!w.__journey?.solve) return
      const s = { ...w.__journey.solve }
      delete s[id]
      w.__journey.solve = s
    }
  }, [id, fn])
}

/** Stable `at` for an interactable: a world position re-computed from island-local each call. */
export function useAt(root: RefObject<THREE.Group | null>, x: number, y: number, z: number) {
  const v = useMemo(() => new THREE.Vector3(), [])
  return useCallback(() => {
    v.set(x, y, z)
    if (root.current) root.current.localToWorld(v)
    return v
  }, [root, x, y, z, v])
}

/* ---------- carrying ---------- */

const _cw = new THREE.Vector3()
const UP09 = new THREE.Vector3(0, 0.9, 0)
/** World position carried items should float at. Falls back to player.pos+0.9 while
 *  PLAYER's anchor is still at its sentinel (dev harness without a real Player). */
export function carryWorld(out: THREE.Vector3) {
  if (carryAnchor.y > -100) out.copy(carryAnchor)
  else out.copy(core.player.pos).add(UP09)
  return out
}
export { carryQuat }

/* ---------- floating hint label (canvas sprite, Inter, no card) ---------- */

function labelTex(text: string) {
  const fs = 44
  const cv = document.createElement('canvas')
  const draw = () => {
    let ctx = cv.getContext('2d')!
    ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`
    const w = Math.ceil(ctx.measureText(text).width)
    cv.width = w + 48
    cv.height = fs + 30
    ctx = cv.getContext('2d')!
    ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(59,51,48,0.85)'
    ctx.fillText(text, cv.width / 2, cv.height / 2 + 3)
  }
  draw()
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  return tex
}

/** A quiet floating word that fades in/out and bobs gently. `show` is read per frame. */
export function Hint({ text, position, show, size = 0.3 }: {
  text: string
  position: [number, number, number]
  show: () => boolean
  size?: number
}) {
  const ref = useRef<THREE.Sprite>(null)
  const mat = useRef<THREE.SpriteMaterial>(null)
  const tex = useMemo(() => labelTex(text), [text])
  const aspect = tex.image.width / tex.image.height
  const t = useRef(0)
  useFrame((s, dt) => {
    t.current += ((show() ? 1 : 0) - t.current) * Math.min(1, dt * 3.5)
    const k = t.current
    if (mat.current) mat.current.opacity = 0.85 * k
    if (ref.current) {
      ref.current.visible = k > 0.01
      ref.current.position.y = position[1] + (REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 1.4 + position[0] * 2) * 0.035)
    }
  })
  return (
    <sprite ref={ref} position={position} scale={[size * aspect, size, 1]}>
      <spriteMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} />
    </sprite>
  )
}

/* ---------- ground dressing ---------- */

/** Scattered flat stepping stones along a polyline (visual only). */
export function PathStones({ pts, seed = 1, gap = 0.6 }: { pts: [number, number][]; seed?: number; gap?: number }) {
  const items = useMemo(() => {
    const rnd = (n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    const out: { x: number; z: number; r: number; s: number }[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / gap))
      for (let j = 0; j < n; j++) {
        const t = j / n, k = out.length
        out.push({
          x: x0 + (x1 - x0) * t + (rnd(k * 3) - 0.5) * 0.15,
          z: z0 + (z1 - z0) * t + (rnd(k * 3 + 1) - 0.5) * 0.15,
          r: rnd(k * 3 + 2) * Math.PI,
          s: 0.78 + rnd(k * 7) * 0.42,
        })
      }
    }
    return out
  }, [pts, seed, gap])
  return (
    <group>
      {items.map((p, i) => (
        <Prop key={i} name={i % 2 ? 'path_stone' : 'rock_path_round'}
          position={[p.x, 0.02, p.z]} rotation={[0, p.r, 0]}
          scale={i % 2 ? p.s * 0.34 : p.s * 0.26} />
      ))}
    </group>
  )
}

/** Pack boulder (Kenney small / Quaternius big), optionally a blocker + walkable cap. */
const ROCKS_SMALL = ['rock_small_a', 'rock_small_c', 'rock_small_e']
const ROCKS_BIG = ['quat_rock', 'quat_rock_2', 'quat_rock_3']
export function Rock({ position, s = 0.5, yaw = 0, block = true, variant = 0, walk = false }: {
  position: [number, number, number]
  s?: number
  yaw?: number
  block?: boolean
  variant?: number
  walk?: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  core.useBlocker(ref, block)
  core.useWalkable(ref, walk)
  const big = s > 0.55
  const set = big ? ROCKS_BIG : ROCKS_SMALL
  const name = set[variant % set.length]
  const scale = big ? (s * 2) / 3.1 : (s * 2) / 0.36
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Prop name={name} scale={scale} />
      <mesh ref={ref} position={[0, s * 0.62, 0]}>
        <boxGeometry args={[s * 1.5, s * 1.24, s * 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Squashed grass mound (walkable bump). */
export function Mound({ position, r = 0.85, h = 0.42, color = C.moss, block = false }: {
  position: [number, number, number]
  r?: number
  h?: number
  color?: string
  block?: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  core.useWalkable(ref)
  core.useBlocker(ref, block)
  return (
    <mesh ref={ref} position={position} scale={[1, h / r, 1]} material={clay(color)} receiveShadow castShadow>
      <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
  )
}

/* ---------- small structures ---------- */

/** Wooden post + rope span fence between two points (visual). */
export function RopeFence({ pts, h = 0.5 }: { pts: [number, number][]; h?: number }) {
  const ropes = useMemo(() => {
    const out: THREE.BufferGeometry[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]
      const a = new THREE.Vector3(x0, h + 0.06, z0)
      const b = new THREE.Vector3(x1, h + 0.06, z1)
      const mid = a.clone().lerp(b, 0.5); mid.y -= 0.06
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 8, 0.014, 5)
      out.push(g)
    }
    return out
  }, [pts, h])
  return (
    <group>
      {pts.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, h / 2, z]} material={clay(C.wood)} castShadow>
            <cylinderGeometry args={[0.032, 0.04, h, 6]} />
          </mesh>
          <mesh position={[x, h + 0.035, z]} material={clay(C.woodLight)} castShadow>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        </group>
      ))}
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g} material={clay('#dcc7a0')} castShadow />
      ))}
    </group>
  )
}

/** A small stacked stone lantern, quiet at the path's edge. `lit` warms its window. */
export function StoneLantern({ lit = false, ...p }: { lit?: boolean } & JSX.IntrinsicElements['group']) {
  const win = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    if (win.current) win.current.emissiveIntensity += (((lit ? 0.9 : 0.06)) - win.current.emissiveIntensity) * Math.min(1, dt * 2)
  })
  return (
    <group {...p}>
      <mesh position={[0, 0.05, 0]} material={clay(C.stone)} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 8]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} material={clay(C.stone)} castShadow>
        <cylinderGeometry args={[0.05, 0.065, 0.24, 8]} />
      </mesh>
      <RoundedBox args={[0.2, 0.15, 0.2]} radius={0.025} position={[0, 0.42, 0]} material={clay(C.stoneLight)} castShadow />
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.095, 0.085, 0.215]} />
        <meshStandardMaterial ref={win} color="#efe0bd" emissive="#ffb04e" emissiveIntensity={0.06} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.54, 0]} rotation={[0, Math.PI / 4, 0]} material={clay(C.stone)} castShadow>
        <coneGeometry args={[0.17, 0.13, 4]} />
      </mesh>
      <mesh position={[0, 0.63, 0]} material={clay(C.stone)} castShadow>
        <sphereGeometry args={[0.045, 8, 6]} />
      </mesh>
    </group>
  )
}

/** Lathe-formed floating rock with a flattened grassy top (a mini island of one's own). */
export function FloatRock({ r = 0.9, seed = 3, top = C.leaf, ...p }: { r?: number; seed?: number; top?: string } & JSX.IntrinsicElements['group']) {
  const geo = useMemo(() => {
    const prof: [number, number][] = [
      [0.001, 0.05], [0.78, 0.04], [1.0, -0.04], [1.04, -0.16], [0.9, -0.45],
      [0.72, -0.78], [0.5, -1.08], [0.24, -1.32], [0.001, -1.45],
    ]
    const g = new THREE.LatheGeometry(prof.map(([px, py]) => new THREE.Vector2(px * r, py * r)), 36)
    const pos = g.attributes.position as THREE.BufferAttribute
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const rad = Math.hypot(x, z); if (rad < 1e-3) continue
      const a = Math.atan2(z, x)
      const k = 1 + 0.07 * Math.sin(a * 4 + y * 2 + seed) + 0.06 * (rnd(i) - 0.5)
      pos.setX(i, x * k); pos.setZ(i, z * k)
      if (y < -0.1 * r) pos.setY(i, y + (rnd(i + 31) - 0.5) * 0.07)
    }
    g.computeVertexNormals()
    const arr = new Float32Array(pos.count * 3)
    const cTop = new THREE.Color(top), rock = new THREE.Color('#c0af90'), dark = new THREE.Color('#97805f'), tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      tmp.copy(y > -0.02 * r ? cTop : rock).lerp(dark, Math.min(1, Math.max(0, (-y / r - 0.15) * 0.75)))
      arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    return g
  }, [r, seed, top])
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), [])
  return (
    <group {...p}>
      <mesh geometry={geo} material={vc} castShadow receiveShadow />
    </group>
  )
}
