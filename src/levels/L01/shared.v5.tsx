/**
 * Shared pieces for the L01/L02 obstacles (ISL-A). Island-local coords, top y=0.
 * Look: ART pack props via <Prop> (src/v5/art/Dressing) + V4 clay for gameplay
 * geometry that needs exact collider sizes (walls, ledge, gate, mound, letter).
 */
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay } from '../../world/kit'
import { Prop } from '../../v5/art/Dressing'

export { C, clay, Prop }

export const REDUCED =
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- small helpers ---------- */

/** Island-local player position, copied into `out` every frame. */
export function useLocalPlayer(root: RefObject<THREE.Group>, out: THREE.Vector3) {
  useFrame(() => {
    if (!root.current) return
    out.copy(core.player.pos)
    root.current.worldToLocal(out)
  })
}

/** Teleport the traveller to an island-local point (?qa solvers). */
export function tpLocal(root: THREE.Group | null, local: THREE.Vector3) {
  if (!root) return
  const w = local.clone()
  root.localToWorld(w)
  const tp = (window as any).__journey?.player?.teleport
  if (tp) tp(w.x, w.y, w.z)
  else {
    core.player.pos.copy(w)
    core.player.vel.set(0, 0, 0)
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

/* ---------- floating hint label (canvas sprite, Inter, no card) ---------- */

function labelTex(text: string) {
  const fs = 46
  const cv = document.createElement('canvas')
  const draw = () => {
    let ctx = cv.getContext('2d')!
    ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`
    const w = Math.ceil(ctx.measureText(text).width)
    cv.width = w + 52
    cv.height = fs + 30
    ctx = cv.getContext('2d')!
    ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(59,51,48,0.88)'
    ctx.fillText(text, cv.width / 2, cv.height / 2 + 3)
  }
  draw()
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  return tex
}

/** A quiet floating word that fades in/out and bobs gently. `show` is read per frame. */
export function Hint({ text, position, show, size = 0.32 }: {
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

/* ---------- path stones ---------- */

export function PathStones({ pts, seed = 1 }: { pts: [number, number][]; seed?: number }) {
  const items = useMemo(() => {
    const rnd = (n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    const out: { x: number; z: number; r: number; s: number }[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.62))
      for (let j = 0; j < n; j++) {
        const t = j / n, k = out.length
        out.push({
          x: x0 + (x1 - x0) * t + (rnd(k * 3) - 0.5) * 0.16,
          z: z0 + (z1 - z0) * t + (rnd(k * 3 + 1) - 0.5) * 0.16,
          r: rnd(k * 3 + 2) * Math.PI,
          s: 0.8 + rnd(k * 7) * 0.4,
        })
      }
    }
    return out
  }, [pts, seed])
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

/* ---------- swinging gate (closed until `open`) ---------- */

export function Gate({ position, yaw = 0, open, instant, width = 2.0, height = 1.4 }: {
  position: [number, number, number]
  yaw?: number
  open: boolean
  instant?: boolean
  width?: number
  height?: number
}) {
  const L = useRef<THREE.Group>(null)
  const R = useRef<THREE.Group>(null)
  const blk = useRef<THREE.Mesh>(null)
  const t = useRef(instant ? 1 : 0)
  core.useBlocker(blk, !open)
  useFrame((_, dt) => {
    t.current += ((open ? 1 : 0) - t.current) * Math.min(1, dt * 1.7)
    const k = t.current * t.current * (3 - 2 * t.current)
    const a = k * Math.PI * 0.56
    // swing outward (toward the exit / bridge), away from the arriving player
    if (L.current) L.current.rotation.y = a
    if (R.current) R.current.rotation.y = -a
  })
  const hw = width / 2
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (hw + 0.16), 0, 0]}>
          <RoundedBox args={[0.3, height + 0.4, 0.3]} radius={0.06} position={[0, (height + 0.4) / 2, 0]}
            material={clay(C.stone)} castShadow receiveShadow />
          <mesh position={[0, height + 0.5, 0]} material={clay(C.sand)} castShadow>
            <cylinderGeometry args={[0.21, 0.25, 0.1, 8]} />
          </mesh>
        </group>
      ))}
      <group ref={L} position={[-hw, 0, 0]}>
        <GateLeaf w={hw} h={height} side={1} />
      </group>
      <group ref={R} position={[hw, 0, 0]}>
        <GateLeaf w={hw} h={height} side={-1} />
      </group>
      <RoundedBox args={[width + 0.7, 0.06, 0.5]} radius={0.03} position={[0, 0.03, 0]}
        material={clay(C.sand)} receiveShadow castShadow />
      <mesh ref={blk} position={[0, height / 2 + 0.1, 0]}>
        <boxGeometry args={[width + 0.7, height + 0.9, 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function GateLeaf({ w, h, side }: { w: number; h: number; side: 1 | -1 }) {
  return (
    <group position={[side * w * 0.5, 0, 0]}>
      <RoundedBox args={[w - 0.06, h, 0.07]} radius={0.03} position={[0, h / 2, 0]}
        material={clay(C.wood)} castShadow />
      {[0.3, 0.72].map((f) => (
        <RoundedBox key={f} args={[w - 0.14, 0.09, 0.1]} radius={0.02} position={[0, h * f, 0]}
          material={clay(C.woodLight)} castShadow />
      ))}
      <mesh position={[-side * (w * 0.5 - 0.13), h * 0.52, 0.06]} rotation={[Math.PI / 2, 0, 0]}
        material={clay(C.earthDark)}>
        <torusGeometry args={[0.05, 0.013, 6, 14]} />
      </mesh>
    </group>
  )
}

/* ---------- rock ---------- */

const ROCKS_SMALL = ['rock_small_a', 'rock_small_c', 'rock_small_e']
const ROCKS_BIG = ['quat_rock', 'quat_rock_2', 'quat_rock_3']

export function Rock({ position, s = 0.5, yaw = 0, block = true, variant }: {
  position: [number, number, number]
  s?: number
  yaw?: number
  block?: boolean
  variant?: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  core.useBlocker(ref, block)
  // small rocks come from the Kenney set (0.36 wide), big ones from Quaternius (~3.1 wide)
  const big = s > 0.55
  const set = big ? ROCKS_BIG : ROCKS_SMALL
  const name = set[(variant ?? 0) % set.length]
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

/* ---------- grassy rise (walkable bump) ---------- */

export function Mound({ position, r = 0.85, h = 0.42, color = C.moss }: {
  position: [number, number, number]
  r?: number
  h?: number
  color?: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  core.useWalkable(ref)
  return (
    <mesh ref={ref} position={position} scale={[1, h / r, 1]} material={clay(color)} receiveShadow castShadow>
      <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
  )
}

/* ---------- low hop wall ---------- */

export function LowWall({ position, len = 9, h = 0.56 }: {
  position: [number, number, number]
  len?: number
  h?: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  core.useBlocker(ref)
  core.useWalkable(ref)
  return (
    <group position={position}>
      <RoundedBox ref={ref} args={[len, h, 0.3]} radius={0.05} position={[0, h / 2, 0]}
        material={clay(C.stone)} castShadow receiveShadow />
      <RoundedBox args={[len + 0.08, 0.07, 0.36]} radius={0.035} position={[0, h + 0.02, 0]}
        material={clay(C.sand)} castShadow receiveShadow />
    </group>
  )
}

/* ---------- paper letter ---------- */

export function PaperLetter({ seal = C.terracotta, ...p }: {
  seal?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  return (
    <group {...p}>
      <RoundedBox args={[0.3, 0.02, 0.21]} radius={0.008} material={clay(C.paper)} castShadow receiveShadow />
      <mesh position={[0, 0.013, -0.035]} rotation={[-Math.PI / 2, 0, 0]} material={clay('#efe3cd')}>
        <planeGeometry args={[0.26, 0.14]} />
      </mesh>
      <mesh position={[0, 0.017, 0.016]} rotation={[Math.PI / 2, 0, 0]} material={clay(seal)}>
        <cylinderGeometry args={[0.028, 0.028, 0.009, 9]} />
      </mesh>
    </group>
  )
}
