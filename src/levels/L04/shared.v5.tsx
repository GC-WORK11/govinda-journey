/**
 * Shared pieces for the L04 obstacle (ISL-D). Island-local coords, island top y=0, radius 5.
 * Look: placeholder V4 clay (src/world/kit) until ART's src/v5/art lands — then swap
 * clay()/C for the toon material + <Prop> dressing (see docs/notes/V5-ISL-D.md).
 * Conventions match ISL-A's shared.v5 so the whole game feels written by one hand.
 */
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay, paint } from '../../world/kit'

export { C, clay }

/** Re-export of kit's vertex-paint helper under a geometry-y name. */
export const paintGeo = paint

export const REDUCED =
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const damp = (cur: number, target: number, k: number, dt: number) =>
  cur + (target - cur) * Math.min(1, k * dt)
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** ART IslandBase cap height (src/v5/art/IslandBase.tsx topY, replicated) — the grass
 *  domes up to 0.06 at centre, so island dressing must sit on this, not on y=0. */
export const domeY = (x: number, z: number, radius = 5) => {
  const d = Math.hypot(x, z)
  return d > radius * 0.96 ? 0 : 0.06 * Math.max(0, 1 - (d / (radius * 0.96)) ** 1.7)
}
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/* ---------- island frame: local <-> world ---------- */

/** Root ref + converters. `local` is the player's island-local position, written per frame. */
export function useIslandFrame() {
  const root = useRef<THREE.Group>(null)
  const local = useMemo(() => new THREE.Vector3(0, -999, 0), [])
  const api = useMemo(() => {
    const toWorld = (v: THREE.Vector3) => (root.current ? root.current.localToWorld(v.clone()) : v.clone())
    const toLocal = (v: THREE.Vector3) => (root.current ? root.current.worldToLocal(v.clone()) : v.clone())
    return { toWorld, toLocal }
  }, [])
  useFrame(() => {
    if (!root.current) return
    local.copy(core.player.pos)
    root.current.worldToLocal(local)
  })
  return { root, local, ...api }
}

/** Teleport the traveller to an island-local point (?qa solvers + respawns). */
export function tpLocal(root: THREE.Group | null, local: THREE.Vector3) {
  if (!root) return
  const w = root.localToWorld(local.clone())
  const p = (window as any).__journey?.player
  if (p?.teleport) p.teleport(w.x, w.y, w.z)
  else { core.player.pos.copy(w); core.player.vel.set(0, 0, 0) }
}

/** A world-space `at` for an interactable, from an island-local point or a live object. */
export function localAt(frame: { toWorld: (v: THREE.Vector3) => THREE.Vector3 }, pt: THREE.Vector3) {
  const out = new THREE.Vector3()
  return () => { out.copy(pt); frame.toWorld(out); return out }
}
export function objAt(obj: RefObject<THREE.Object3D | null>) {
  const out = new THREE.Vector3()
  return () => { if (obj.current) obj.current.getWorldPosition(out); return out }
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

/* ---------- materials ---------- */

/** Invisible mesh material: still raycastable, draws nothing (blockers / hit areas). */
let _ghost: THREE.MeshBasicMaterial | null = null
export function ghostMat() {
  if (!_ghost) _ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  return _ghost
}

/* ---------- canvas textures ---------- */

export function makeTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  draw(cv.getContext('2d')!)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Soft irregular haze blob (warm Delhi smog, not clean smoke). */
export function smogTex() {
  return makeTex(256, 256, (ctx) => {
    const blob = (x: number, y: number, r: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, r * 0.08, x, y, r)
      g.addColorStop(0, `rgba(191,180,163,${a})`)
      g.addColorStop(0.62, `rgba(178,168,152,${a * 0.55})`)
      g.addColorStop(1, 'rgba(170,161,148,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 256)
    }
    blob(128, 138, 112, 0.85)
    blob(84, 108, 62, 0.5)
    blob(176, 118, 70, 0.55)
    blob(122, 176, 58, 0.42)
  })
}

/** Perfectly soft round puff (dust, steam, pulse glow). */
export function puffTex(rgb = '243,233,218') {
  return makeTex(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
    g.addColorStop(0, `rgba(${rgb},0.85)`)
    g.addColorStop(0.55, `rgba(${rgb},0.34)`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  })
}

/** Quiet word sprite (Inter, ink on nothing — no card). */
export function wordTex(text: string, fs = 44, color = 'rgba(59,51,48,0.92)') {
  const cv = document.createElement('canvas')
  let ctx = cv.getContext('2d')!
  ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`
  const w = Math.ceil(ctx.measureText(text).width)
  cv.width = w + 40
  cv.height = fs + 30
  ctx = cv.getContext('2d')!
  ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 3)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/* ---------- path stones (same quiet stones as L01) ---------- */

export function PathStones({ pts, seed = 1 }: { pts: [number, number][]; seed?: number }) {
  const items = useMemo(() => {
    const rnd = (n: number) => { const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    const out: { x: number; z: number; y: number; r: number; s: number }[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.62))
      for (let j = 0; j < n; j++) {
        const t = j / n, k = out.length
        const x = x0 + (x1 - x0) * t + (rnd(k * 3) - 0.5) * 0.16
        const z = z0 + (z1 - z0) * t + (rnd(k * 3 + 1) - 0.5) * 0.16
        out.push({ x, z, y: domeY(x, z) + 0.012, r: rnd(k * 3 + 2) * Math.PI, s: 0.8 + rnd(k * 7) * 0.4 })
      }
    }
    return out
  }, [pts, seed])
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[0, p.r, 0]} scale={[p.s, 1, p.s * 0.8]}
          material={clay(i % 2 ? '#d6cab4' : '#c9bfb0')} receiveShadow castShadow>
          <cylinderGeometry args={[0.19, 0.21, 0.05, 7]} />
        </mesh>
      ))}
    </group>
  )
}

/** Soft annulus texture for the expanding pulse ring. */
export function ringTex() {
  return makeTex(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 88, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.62, 'rgba(255,255,255,0.08)')
    g.addColorStop(0.8, 'rgba(255,255,255,0.85)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
  })
}

/** Jagged crack splat for the crumbling street. */
export function crackTex(seed = 3) {
  return makeTex(256, 256, (ctx) => {
    ctx.strokeStyle = 'rgba(40,32,26,0.9)'
    ctx.lineCap = 'round'
    const rnd = (n: number) => { const x = Math.sin(seed * 37.7 + n * 91.13) * 43758.5453; return x - Math.floor(x) }
    for (let arm = 0; arm < 7; arm++) {
      const a0 = (arm / 7) * Math.PI * 2 + rnd(arm) * 0.9
      let x = 128, y = 128, a = a0
      ctx.lineWidth = 7 - arm * 0.6
      ctx.beginPath(); ctx.moveTo(x, y)
      const steps = 4 + Math.floor(rnd(arm * 3) * 3)
      for (let i = 0; i < steps; i++) {
        a += (rnd(arm * 7 + i) - 0.5) * 1.1
        const l = 16 + rnd(arm * 11 + i) * 22
        x += Math.cos(a) * l; y += Math.sin(a) * l
        ctx.lineWidth = Math.max(1.5, ctx.lineWidth * 0.72)
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 46)
    g.addColorStop(0, 'rgba(40,32,26,0.55)'); g.addColorStop(1, 'rgba(40,32,26,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
  })
}

/* ---------- little floating word (fades + bobs) ---------- */

export function Hint({ text, position, show, size = 0.34 }: {
  text: string
  position: [number, number, number]
  show: () => boolean
  size?: number
}) {
  const ref = useRef<THREE.Sprite>(null)
  const mat = useRef<THREE.SpriteMaterial>(null)
  const tex = useMemo(() => wordTex(text), [text])
  const aspect = tex.image.width / tex.image.height
  const t = useRef(0)
  useFrame((s, dt) => {
    t.current = damp(t.current, show() ? 1 : 0, 3.5, dt)
    if (mat.current) mat.current.opacity = 0.85 * t.current
    if (ref.current) {
      ref.current.visible = t.current > 0.02
      ref.current.position.y = position[1] + (REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 1.4 + position[0] * 2) * 0.035)
    }
  })
  return (
    <sprite ref={ref} position={position} scale={[size * aspect, size, 1]} visible={false}>
      <spriteMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} />
    </sprite>
  )
}
