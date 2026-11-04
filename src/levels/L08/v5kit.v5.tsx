/**
 * Shared helpers for the V5 obstacles in L08 + L09 (area ISL-F).
 * Everything that must later be swapped for another area's real module is marked STUB.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createRoot, type Root } from 'react-dom/client'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { C, paint as paintGeo } from '../../world/kit'
import { toon, toonVC } from '../../v5/art/material'
import { carryAnchor, carryQuat } from '../../v5/player/anchor'
import { player, useInteractable, useV5, type Interactable } from '../../v5/core'

export { C, carryAnchor, carryQuat }

/** Material seam — ART's shared toon material, cached per colour. */
export const M = (color: string) => toon({ color })

/** Collision-only mesh material: participates in raycasts, draws nothing. */
let _ghost: THREE.MeshBasicMaterial | null = null
export function ghostMat() {
  if (!_ghost) _ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  return _ghost
}

/** Island-local <-> world conversion anchored at the obstacle's root group. */
export function useIslandFrame<T extends THREE.Object3D = THREE.Group>() {
  const ref = useRef<T>(null)
  const api = useMemo(() => {
    const toWorld = (v: THREE.Vector3) => (ref.current ? ref.current.localToWorld(v.clone()) : v.clone())
    const toLocal = (v: THREE.Vector3) => (ref.current ? ref.current.worldToLocal(v.clone()) : v.clone())
    return { toWorld, toLocal, at: (x: number, y: number, z: number) => toWorld(new THREE.Vector3(x, y, z)) }
  }, [])
  return { ref, ...api }
}

type Frame = ReturnType<typeof useIslandFrame>
export type LocalPt = THREE.Vector3 | (() => THREE.Vector3)

/**
 * Register an Interactable whose `at` is given in ISLAND-LOCAL coords.
 * `cfg` is rebuilt by the caller each render so use()/enabled() never see stale state —
 * registration into the Map is idempotent and cheap.
 */
export function useLocalInteractable(frame: Frame, cfg: (Omit<Interactable, 'at'> & { at: LocalPt }) | null) {
  // rebuilt every render so use()/enabled() always see fresh state; re-registering is cheap
  const inter: Interactable | null = cfg
    ? { ...cfg, at: () => frame.toWorld(typeof cfg.at === 'function' ? (cfg.at as () => THREE.Vector3)() : cfg.at) }
    : null
  useInteractable(inter)
}

/**
 * Call once inside an obstacle (in the Canvas). PLAYER drives carryAnchor from a chest
 * socket every frame; this only stub-drives it when nobody does (solo preview harness).
 */
export function useCarryAnchor() {
  useFrame(() => {
    if (carryAnchor.y > -500) return
    carryAnchor.copy(player.pos).setY(player.pos.y + 0.9)
    carryQuat.identity()
  })
}

/** Damped approach used everywhere in the codebase's feel: cur += (t-c)*min(1,k*dt). */
export const damp = (cur: number, target: number, k: number, dt: number) => cur + (target - cur) * Math.min(1, k * dt)
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Quiet one-line guidance under the ribbon; auto-clears. */
let capT: ReturnType<typeof setTimeout> | null = null
export function caption(text: string, ms = 3800) {
  const s = useV5.getState()
  s.setCaption(text)
  if (capT) clearTimeout(capT)
  capT = setTimeout(() => { if (useV5.getState().caption === text) s.setCaption(null) }, ms)
}

/** Set player.frozen while `open`; restores on close/unmount. */
export function useFrozen(open: boolean) {
  useEffect(() => {
    if (!open) return
    player.frozen = true
    return () => { player.frozen = false }
  }, [open])
}

/* ------------------------------ QA helpers ------------------------------ */

export const isQa = () => typeof window !== 'undefined' && new URLSearchParams(location.search).has('qa')
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Merge this island's solver into window.__journey.solve (WORLD's object, if present). */
export function installSolve(id: string, fn: () => Promise<void>) {
  const w = window as any
  const j = (w.__journey ??= {})
  j.solve = { ...(j.solve || {}), [id]: fn }
}

/** Teleport the traveller to an island-local point (uses PLAYER's api when mounted). */
export function teleportTo(frame: Frame, x: number, y: number, z: number) {
  const w = frame.toWorld(new THREE.Vector3(x, y, z))
  const tp = (window as any).__journey?.player?.teleport
  if (tp) tp(w.x, w.y, w.z)
  else { player.pos.copy(w); player.vel.set(0, 0, 0) }
}

export async function waitFor<T>(fn: () => T | null | undefined | false, ms = 6000): Promise<T> {
  const t0 = Date.now()
  for (;;) {
    const v = fn()
    if (v) return v
    if (Date.now() - t0 > ms) throw new Error('waitFor timeout')
    await sleep(90)
  }
}

/** Set a React-controlled input's value the honest way (native setter + input event). */
export function fillInput(el: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** QA: draw the template stroke on a mounted sign-pad canvas via real pointer events. */
export async function tracePad(cv: HTMLCanvasElement) {
  const pts = JSON.parse(cv.dataset.template || '[]') as { x: number; y: number }[]
  if (!pts.length) return
  const r = cv.getBoundingClientRect()
  const send = (type: string, p: { x: number; y: number }) =>
    cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + p.x, clientY: r.top + p.y, pointerId: 7, isPrimary: true }))
  send('pointerdown', pts[0])
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    for (let k = 1; k <= 6; k++) send('pointermove', { x: a.x + ((b.x - a.x) * k) / 6, y: a.y + ((b.y - a.y) * k) / 6 })
    await sleep(14)
  }
  send('pointerup', pts[pts.length - 1])
}

/* ------------------------------ DOM overlay shell ------------------------------ */

const CSS = `
.jov5-veil { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 18px;
  background: radial-gradient(120% 100% at 50% 42%, rgba(43,35,28,.16), rgba(43,35,28,.36));
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  animation: jov5veil .45s ease both; font-family: 'Inter', system-ui, sans-serif; color: #2f2925; }
@keyframes jov5veil { from { opacity: 0 } to { opacity: 1 } }
.jov5-card { position: relative; width: min(440px, 94vw); background: rgba(251,246,238,.95);
  border-radius: 30px; padding: 26px 26px 22px;
  box-shadow: 0 40px 90px -42px rgba(60,40,20,.55), 0 1px 0 rgba(255,255,255,.7) inset; }
.jov5-title { font: 500 20px 'Fraunces', Georgia, serif; letter-spacing: -.01em; }
.jov5-sub { font-size: 13.5px; color: #6b5f55; margin-top: 6px; line-height: 1.5; }
.jov5-row { display: flex; gap: 16px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
.jov5-btn { padding: 11px 22px; border-radius: 999px; background: #2f2925; color: #fbf6ee; border: 0;
  font: 500 13.5px 'Inter', sans-serif; cursor: pointer; transition: transform .2s; }
.jov5-btn:hover { transform: translateY(-1px); } .jov5-btn:active { transform: translateY(1px) scale(.98); }
.jov5-link { font-size: 13px; color: #6b5f55; border: 0; border-bottom: 1px solid rgba(47,41,37,.18);
  padding: 0 0 1px; cursor: pointer; background: none; }
.jov5-link:hover { color: #2f2925; border-color: #2f2925; }
.jov5-x { position: absolute; top: 12px; right: 14px; width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; color: #6b5f55; background: none; border: 0; cursor: pointer; font-size: 17px; }
.jov5-x:hover { color: #2f2925; background: rgba(47,41,37,.06); }
.jov5-input { width: 100%; padding: 12px 16px; border-radius: 16px; border: 1px solid rgba(47,41,37,.16);
  background: #fffdf9; font: 400 15px 'Inter', sans-serif; color: #2f2925; outline: none; }
.jov5-input:focus { border-color: rgba(47,41,37,.55); }
.jov5-note { font-size: 12px; color: #6b5f55; margin-top: 10px; text-align: center; min-height: 15px; }
.jov5-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #c8704a;
  margin-right: 9px; vertical-align: 0; animation: jov5pulse 2.4s ease-in-out infinite; }
@keyframes jov5pulse { 0%,100% { transform: scale(.6); opacity: .4 } 50% { transform: scale(1.15); opacity: 1 } }
.jov5-pad-wrap { position: relative; margin-top: 14px; border-radius: 22px; overflow: hidden;
  background: #f3e9da; box-shadow: inset 0 0 0 1px rgba(47,41,37,.09); }
canvas.jov5-pad { display: block; width: 100%; touch-action: none; cursor: crosshair; }
video.jov5-cam { position: absolute; left: 10px; bottom: 10px; width: 96px; height: 72px; object-fit: cover;
  border-radius: 14px; opacity: .8; transform: scaleX(-1); pointer-events: none;
  box-shadow: 0 6px 18px -8px rgba(47,41,37,.5); }
.jov5-center { text-align: center; }
@media (max-width: 520px) { .jov5-card { padding: 20px 18px; border-radius: 26px; } }
`
let cssDone = false
function ensureCss() {
  if (cssDone || typeof document === 'undefined') return
  cssDone = true
  const el = document.createElement('style')
  el.textContent = CSS
  document.head.appendChild(el)
}

/**
 * Render DOM overlay JSX from inside an R3F component. ReactDOM.createPortal can't cross
 * reconcilers (the div would be created in the THREE namespace), so overlays mount on
 * their own react-dom root attached to <body> — same trick as drei's <Html>.
 */
export function useDomOverlay(node: React.ReactNode) {
  const host = useRef<{ el: HTMLDivElement; root: Root } | null>(null)
  useEffect(() => {
    ensureCss()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    host.current = { el, root }
    return () => {
      host.current = null
      setTimeout(() => { try { root.unmount() } catch {} el.remove() })
    }
  }, [])
  useEffect(() => { host.current?.root.render(<>{node}</>) })
}

/** Soft full-screen veil with a rounded paper card. Click outside / × / Esc closes. */
export function Veil({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  ensureCss()
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="jov5-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="jov5-card" role="dialog" aria-modal="true">
        <button className="jov5-x" aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------ static bake ------------------------------ */

type BakedPart = { geo: THREE.BufferGeometry; mat: THREE.Material }

const isPlainStandard = (m: THREE.Material): m is THREE.MeshStandardMaterial =>
  (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true &&
  !(m as THREE.MeshStandardMaterial).map &&
  !(m as THREE.MeshStandardMaterial).emissiveMap &&
  !(m as THREE.MeshStandardMaterial).normalMap &&
  !(m as THREE.MeshStandardMaterial).vertexColors &&
  // toon() and friends override these on the instance — keep them on their own
  // material so their shader stays intact (merged per shared material instead)
  !Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile') &&
  !Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') &&
  (m as THREE.MeshStandardMaterial).emissiveIntensity === 0 &&
  !(m as THREE.MeshStandardMaterial).transparent

/**
 * Normalise a geometry for merging: non-indexed, world transform applied,
 * canonical attribute set only (position/normal/uv/color) — GLB extras like
 * tangents, skin weights and morph targets are what make mergeGeometries()
 * return null (and a `!` would turn that into a renderer crash).
 */
const BAKE_ATTRS = ['position', 'normal', 'uv', 'color']
const cleanGeo = (g0: THREE.BufferGeometry, world?: THREE.Matrix4) => {
  const g = g0.index ? g0.toNonIndexed() : g0.clone()
  if (world) g.applyMatrix4(world)
  ;(g as unknown as { morphAttributes: Record<string, unknown> }).morphAttributes = {}
  for (const name of Object.keys(g.attributes)) if (!BAKE_ATTRS.includes(name)) g.deleteAttribute(name)
  const n = g.getAttribute('position').count
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2))
  if (!g.getAttribute('color')) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3))
  return g
}

/** mergeGeometries that can never crash: null result → parts stay unmerged. */
export { cleanGeo }
export const mergeSafe = (geos: THREE.BufferGeometry[]) => {
  if (!geos.length) return null
  if (geos.length === 1) return geos[0]
  try { return mergeGeometries(geos, false) } catch { return null }
}

/**
 * Bakes every static Mesh under `children` into a handful of merged meshes —
 * one vertex-coloured mesh for all the plain clay materials plus one merged
 * mesh per special material (emissive, mapped). Waits until the child mesh
 * count is stable across two passes so async GLB props get baked too, then
 * unmounts the originals. ~295-call islands collapse to a few draws.
 */
export function StaticBake({ children, shadow = true, delay = 0 }: { children: ReactNode; shadow?: boolean; delay?: number }) {
  const host = useRef<THREE.Group>(null)
  const [parts, setParts] = useState<BakedPart[] | null>(null)
  useEffect(() => {
    // ?nomerge — collision audits need the originals visible (same flag as AutoMerge)
    if (new URLSearchParams(location.search).has('nomerge')) return
    let lastN = -1, stable = 0, tries = 0
    const bake = () => {
      const root = host.current
      if (!root) return
      root.updateWorldMatrix(true, true)
      const inv = root.matrixWorld.clone().invert()
      const std: THREE.BufferGeometry[] = []
      const other = new Map<THREE.Material, THREE.BufferGeometry[]>()
      const world = new THREE.Matrix4()
      const ws = new THREE.Vector3()
      root.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh || !m.visible) return
        for (let a = o.parent; a && a !== root; a = a.parent) if (!a.visible) return
        m.getWorldScale(ws)
        if (Math.min(Math.abs(ws.x), Math.abs(ws.y), Math.abs(ws.z)) < 0.01) return // shrunk away
        const geo = cleanGeo(m.geometry, world.copy(inv).multiply(m.matrixWorld))
        const mat = Array.isArray(m.material) ? m.material[0] : m.material
        if (isPlainStandard(mat)) {
          paintGeo(geo, `#${mat.color.getHexString()}`)
          std.push(geo)
        } else {
          const arr = other.get(mat) ?? []
          arr.push(geo)
          other.set(mat, arr)
        }
      })
      const out: BakedPart[] = []
      const push = (geos: THREE.BufferGeometry[], mat: THREE.Material) => {
        const merged = mergeSafe(geos)
        if (merged) out.push({ geo: merged, mat })
        else geos.forEach((g) => out.push({ geo: g, mat }))
      }
      push(std, toonVC())
      other.forEach((geos, mat) => push(geos, mat))
      if (out.length) setParts(out)
    }
    let iv: ReturnType<typeof setInterval>
    const start = () => { iv = setInterval(() => {
      const root = host.current
      if (!root) return
      let n = 0
      root.traverse((o) => { if ((o as THREE.Mesh).isMesh) n++ })
      if (n > 0 && n === lastN) { if (++stable >= 2) { clearInterval(iv); bake() } }
      else { stable = 0; lastN = n }
      if (++tries > 50) clearInterval(iv)
    }, 350) }
    const to = setTimeout(start, delay)
    return () => { clearTimeout(to); clearInterval(iv) }
  }, [])
  if (!parts) return <group ref={host}>{children}</group>
  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={p.mat} castShadow={shadow} receiveShadow />
      ))}
    </group>
  )
}
