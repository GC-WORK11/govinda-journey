/**
 * L06 Remote — local art helpers on ART's shared toon material (src/v5/art/material).
 * V6: voxel modern city + a clay helicopter the player boards and flies.
 */
import { useMemo, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { toon } from '../../v5/art/material'
import { HeliModel } from '../../v5/player/HeliModel'

export const C = {
  cream: '#f3e9da', paper: '#fbf6ee', sand: '#e8d6b8', terracotta: '#d9825b', brick: '#b5654a',
  leaf: '#8fb36b', leafDark: '#6f9a55', moss: '#a7bd80', earth: '#b48a63', earthDark: '#8a6748',
  stone: '#c9bfb0', stoneLight: '#ddd5c6', wood: '#a87a52', woodLight: '#c99c6e',
  water: '#8fc1c9', waterLight: '#b8dade', sky: '#cfe3e8', ink: '#3b3330', ink2: '#6b5f57',
  warm: '#f0c98a',
  // city palette — warm, matte, voxel
  glass: '#5d7684', asphalt: '#b7a893', curb: '#d8ccb8', facade1: '#e8d3b4', facade2: '#d9b28e',
  facade3: '#c8bca4', facade4: '#b7c4bd', roof: '#9c8d7c', roofDark: '#7e7263',
}

/** Shared stylized clay material (ART's toon: wrap diffuse + soft ramp + warm rim). */
export function clay(color: string) {
  return toon({ color })
}

type V3 = [number, number, number]
type P = { position?: V3; rotation?: V3; scale?: number | V3 }

/* ---------------------------------- textures ---------------------------------- */

/** Terminal screen texture: warm cream lines on dark ink. draw(fn) repaints + flags upload. */
export function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return { cv, ctx, tex, redraw(fn: (c: CanvasRenderingContext2D) => void) { fn(ctx); tex.needsUpdate = true } }
}

const _rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }

/** Paints one facade tile (64×128) into an atlas context at x-offset `ox`. */
function paintFacade(ctx: CanvasRenderingContext2D, ox: number, base: string, win: string, floors: number, cols: number, seed: number) {
  ctx.fillStyle = base; ctx.fillRect(ox, 0, 64, 128)
  // faint floor bands
  ctx.fillStyle = 'rgba(0,0,0,0.05)'
  for (let f = 1; f < floors; f++) ctx.fillRect(ox, Math.round((f / floors) * 128), 64, 2)
  // parapet
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(ox, 0, 64, 6)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(ox, 6, 64, 2)
  const fh = 128 / floors, cw = 64 / (cols + 1)
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const r = _rnd(seed * 31 + f * 7 + c * 13)
      ctx.fillStyle = r < 0.18 ? '#a8b5b4' : win // a few lit-warm panes
      const w = cw * 0.52, h = fh * 0.42
      ctx.fillRect(ox + Math.round((c + 0.7) * cw - w / 2), Math.round(f * fh + fh * 0.3), Math.max(2, w), Math.max(2, h))
    }
  }
}

/* --------------------------- merged statics --------------------------- */
/* One vertex-coloured mesh instead of dozens — the whole city (minus props)
   bakes into a handful of draw calls. cyl s = [topDiam, height, botDiam],
   torus s = [radius, tube], cone/sph s = [diam, height]. */

const _vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 })
const _mc = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _me = new THREE.Euler()
const _mv = new THREE.Vector3(), _ms = new THREE.Vector3(1, 1, 1), _col = new THREE.Color()

export type BPart = { g: 'box' | 'cyl' | 'sph' | 'cone' | 'torus'; p: V3; s: V3; r?: V3; c: string }

export function bake(parts: BPart[]) {
  const geos: THREE.BufferGeometry[] = []
  for (const it of parts) {
    const [a, b, c] = it.s
    const g =
      it.g === 'cyl' ? new THREE.CylinderGeometry(a / 2, c / 2, b, 10) :
      it.g === 'sph' ? new THREE.SphereGeometry(a / 2, 12, 9) :
      it.g === 'cone' ? new THREE.ConeGeometry(a / 2, b, 6) :
      it.g === 'torus' ? new THREE.TorusGeometry(a, b, 10, 30) :
      new THREE.BoxGeometry(a, b, c)
    _me.set(...(it.r ?? [0, 0, 0])); _mq.setFromEuler(_me)
    _mc.compose(_mv.set(...it.p), _mq, _ms)
    g.applyMatrix4(_mc)
    _col.set(it.c)
    const n = (g.attributes.position as THREE.BufferAttribute).count
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { arr[i * 3] = _col.r; arr[i * 3 + 1] = _col.g; arr[i * 3 + 2] = _col.b }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    geos.push(g)
  }
  const merged = mergeGeometries(geos, false)!
  for (const g of geos) g.dispose()
  return merged
}

/** A cluster of baked prims rendered as ONE vertex-coloured mesh. */
export function Baked({ parts, ...p }: { parts: BPart[] } & P) {
  const geo = useMemo(() => bake(parts), [parts])
  return <mesh geometry={geo} material={_vcMat} castShadow receiveShadow {...p} />
}

/** All tower bodies as ONE mesh: every facade baked into a single 8-tile atlas,
    each box's UVs remapped onto its tile. */
export function CityTowers({ towers, ...p }: { towers: [number, number, number, number, number, string, number][] } & P) {
  const geo = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128
    const ctx = cv.getContext('2d')!
    towers.forEach(([, , w, , h, tone, seed], i) =>
      paintFacade(ctx, i * 64, tone, C.glass, Math.max(2, Math.round(h / 0.55)), Math.max(2, Math.round(w / 0.34)), seed))
    const geos = towers.map(([x, z, w, d, h], i) => {
      const g = new THREE.BoxGeometry(w, h, d)
      const uv = g.attributes.uv as THREE.BufferAttribute
      for (let j = 0; j < uv.count; j++) uv.setXY(j, (i + uv.getX(j)) / 8, uv.getY(j))
      g.translate(x, h / 2, z)
      return g
    })
    const merged = mergeGeometries(geos, false)!
    for (const g of geos) g.dispose()
    ;(merged.userData as any).tex = Object.assign(new THREE.CanvasTexture(cv), { colorSpace: THREE.SRGBColorSpace })
    return merged
  }, [towers])
  const mat = useMemo(() => {
    const m = toon({ color: '#fff' }); m.map = (geo.userData as any).tex as THREE.Texture; return m
  }, [geo])
  return <mesh geometry={geo} material={mat} castShadow receiveShadow {...p} />
}

/* ---------------------------------- props ---------------------------------- */

/** The Remote vignette as baked prims — desk+laptop+phone in their group-local
   spaces (3 draw calls total, was ~17). */
export const DESK_P: BPart[] = [
  { g: 'box', p: [0, 0.46, 0], s: [1.05, 0.055, 0.5], c: C.woodLight },
  { g: 'box', p: [-0.455, 0.22, 0.17], s: [0.05, 0.44, 0.05], c: C.wood },
  { g: 'box', p: [0.455, 0.22, 0.17], s: [0.05, 0.44, 0.05], c: C.wood },
  { g: 'box', p: [-0.455, 0.22, -0.17], s: [0.05, 0.44, 0.05], c: C.wood },
  { g: 'box', p: [0.455, 0.22, -0.17], s: [0.05, 0.44, 0.05], c: C.wood },
  { g: 'box', p: [0, 0.14, 0], s: [0.81, 0.03, 0.36], c: C.wood },
]
/** Laptop baked open (lid rotated -0.34 about the hinge at [0,0.04,-0.2]). */
export const LAPTOP_P: BPart[] = [
  { g: 'box', p: [0, 0.018, 0], s: [0.62, 0.035, 0.44], c: C.stoneLight },
  { g: 'box', p: [0, 0.041, 0.02], s: [0.5, 0.012, 0.3], c: C.stone },
  { g: 'box', p: [0, 0.238, -0.27], s: [0.62, 0.42, 0.024], r: [-0.34, 0, 0], c: C.stoneLight },
  { g: 'box', p: [0, 0.2437, -0.2541], s: [0.5, 0.32, 0.003], r: [-0.34, 0, 0], c: '#2f2a26' },
  { g: 'box', p: [-0.1, 0.2912, -0.2698], s: [0.22, 0.14, 0.003], r: [-0.34, 0, 0], c: '#8fb36b' },
]
export const PHONE_P: BPart[] = [
  { g: 'box', p: [0, 0.21, -0.07], s: [0.22, 0.42, 0.035], r: [0.36, 0, 0], c: C.wood },
  { g: 'box', p: [0, 0.06, 0.02], s: [0.26, 0.13, 0.06], r: [0.42, 0, 0], c: C.wood },
  { g: 'box', p: [0, 0.26, -0.04], s: [0.25, 0.44, 0.028], r: [0.36, 0, 0], c: C.ink },
  { g: 'box', p: [0, 0.263, -0.024], s: [0.21, 0.38, 0.003], r: [0.36, 0, 0], c: '#e6ddc8' },
]

/** The helicopter — PLAYER's CC0 HeliModel (poly.pizza/kazuma, citykit pack),
 * flipped to face -z like the old stub so the flight code is unchanged.
 * `rotorRef`/`tailRef` let the obstacle spin the two pivots itself. */
export function Heli({ rotorRef, tailRef, ...p }: P & { rotorRef?: React.Ref<THREE.Group>; tailRef?: React.Ref<THREE.Group> }) {
  return (
    <group {...p} rotation={[0, Math.PI, 0]}>
      <HeliModel rotorRef={rotorRef} tailRef={tailRef} />
    </group>
  )
}

/** A route ring the helicopter flies through — torus + pennants merged into
   ONE vertex-coloured mesh (still animated per-ring by the obstacle). */
export function RouteRing({ r = 0.85, live = true, ...p }: P & { r?: number; live?: boolean }) {
  const geo = useMemo(() => bake([
    { g: 'torus', p: [0, 0, 0], s: [r, 0.055, 0], c: live ? C.warm : C.stoneLight },
    { g: 'cone', p: [-0.5 * r, r * 0.95, 0], s: [0.1, 0.14, 0], r: [0, 0, -0.1], c: C.terracotta },
    { g: 'cone', p: [0.5 * r, r * 0.95, 0], s: [0.1, 0.14, 0], r: [0, 0, 0.1], c: C.leaf },
  ]), [r, live])
  return <mesh geometry={geo} material={_vcMat} castShadow {...p} />
}

/** Helipad marker ring — the one bit that changes colour (`lit`). Everything
   else about the pad lives in the baked statics (see Obstacle's CITY_PARTS). */
export function HeliPad({ r = 0.95, lit = false, position, ...p }: P & { r?: number; lit?: boolean }) {
  const [x, y, z] = position ?? [0, 0, 0]
  return (
    <mesh position={[x, y + 0.026, z]} rotation={[-Math.PI / 2, 0, 0]} material={clay(lit ? C.warm : C.terracotta)} {...p}>
      <ringGeometry args={[r * 0.62, r * 0.74, 32]} />
    </mesh>
  )
}

/** Flat-topped floating rock that carries the far landing pad. */
export function PadRock({ r = 1.35, seed = 5, ...p }: P & { r?: number; seed?: number }) {
  const geo = useMemo(() => {
    const prof: [number, number][] = [[0.001, 0.06], [0.8, 0.05], [1.0, -0.05], [1.02, -0.2], [0.88, -0.55], [0.7, -0.9], [0.46, -1.2], [0.2, -1.45], [0.001, -1.6]]
    const g = new THREE.LatheGeometry(prof.map(([px, py]) => new THREE.Vector2(px * r, py * r)), 40)
    const pos = g.attributes.position as THREE.BufferAttribute
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const rad = Math.hypot(x, z); if (rad < 1e-3) continue
      const a = Math.atan2(z, x)
      const k = 1 + 0.07 * Math.sin(a * 4 + y * 2 + seed) + 0.06 * (rnd(i) - 0.5)
      pos.setX(i, x * k); pos.setZ(i, z * k)
      if (y < -0.1) pos.setY(i, y + (rnd(i + 31) - 0.5) * 0.08)
    }
    g.computeVertexNormals()
    const arr = new Float32Array(pos.count * 3)
    const top = new THREE.Color(C.curb), rock = new THREE.Color('#b19d82'), dark = new THREE.Color('#8c7055'), tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      tmp.copy(y > -0.03 * r ? top : rock).lerp(dark, Math.min(1, Math.max(0, (-y / r - 0.2) * 0.7)))
      arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    return g
  }, [r, seed])
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }), [])
  return <mesh {...p} geometry={geo} material={vc} castShadow receiveShadow />
}

/** Invisible physics box. `kind` = 'block' | 'walk'; `on` toggles registration. */
export function BlockBox({ position, args = [1, 1, 1] as V3, kind = 'block', on = true }: { position: V3; args?: V3; kind?: 'block' | 'walk'; on?: boolean }) {
  const r = useRef<THREE.Mesh>(null)
  const reg = kind === 'block' ? core.useBlocker : core.useWalkable
  reg(r, on)
  return <mesh ref={r} position={position} visible={false}><boxGeometry args={args} /></mesh>
}
