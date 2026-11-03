/**
 * V5 island base. One stylized floating island, island-local frame:
 * top surface at y = 0, usable radius `radius` (default 5), path corridor
 * along z. The grass cap is a gently domed lathe with a soft overhanging lip
 * and two-tone grass mottling; underneath, banded sedimentary cliffs taper to
 * a point, with a dark soil band right under the lip and thin roots hanging
 * from the rim. The cap mesh registers itself in core.walkables.
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useWalkable } from '../core'
import { toonVC } from './material'
import { Scatter } from './Dressing'

export type IslandPalette = { ground: string; accent?: string }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const mulberry = (seed: number) => (n: number) => {
  const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Height of the grass surface at distance d from centre (dome + lip profile). */
export const topY = (d: number, radius = 5) =>
  d > radius * 0.96 ? 0 : 0.06 * Math.max(0, 1 - (d / (radius * 0.96)) ** 1.7)

function paint(
  g: THREE.BufferGeometry,
  hex: string,
  fn?: (c: THREE.Color, x: number, y: number, z: number) => void,
  jitter = 0,
) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const arr = new Float32Array(pos.count * 3)
  const c = new THREE.Color(hex)
  const t = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    t.copy(c)
    if (fn) fn(t, pos.getX(i), pos.getY(i), pos.getZ(i))
    if (jitter) t.multiplyScalar(1 + Math.sin(i * 37.13 + t.r * 40) * jitter * 0.5)
    arr[i * 3] = t.r
    arr[i * 3 + 1] = t.g
    arr[i * 3 + 2] = t.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

/** Grass cap: domed lathe with a soft overhanging lip and mottled colouring. */
function capGeo(radius: number, ground: string, seed: number) {
  const r = radius
  const lip = new THREE.CatmullRomCurve3([
    new THREE.Vector3(r * 0.78, -0.62, 0),
    new THREE.Vector3(r * 0.97, -0.45, 0),
    new THREE.Vector3(r * 1.04, -0.22, 0),
    new THREE.Vector3(r * 1.0, -0.06, 0),
    new THREE.Vector3(r * 0.94, 0, 0),
  ]).getPoints(14).slice(1)
  const pts = [
    new THREE.Vector2(0, -0.62),
    new THREE.Vector2(r * 0.78, -0.62),
    ...lip.map((v) => new THREE.Vector2(v.x, v.y)),
    new THREE.Vector2(r * 0.62, 0.028),
    new THREE.Vector2(r * 0.3, 0.05),
    new THREE.Vector2(0, 0.06),
  ]
  const darker = new THREE.Color(ground).multiplyScalar(0.86)
  const lighter = new THREE.Color(ground).lerp(new THREE.Color('#f6f0d8'), 0.12)
  const top = paint(new THREE.LatheGeometry(pts, 72), ground, (c, x, y, z) => {
    // two-tone grass blotches, then dark under the lip
    const blotch = Math.sin(x * 1.7 + seed * 3.1) * Math.sin(z * 1.9 + seed * 1.3)
    if (blotch > 0.45) c.copy(lighter)
    else if (blotch < -0.55) c.copy(darker)
    c.multiplyScalar(0.55 + 0.48 * smooth(-0.58, 0.02, y))
  }, 0.05)
  // low-frequency wobble on the rim band only; the playfield stays flat
  const tp = top.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i)
    const z = tp.getZ(i)
    const rad = Math.hypot(x, z)
    if (rad < r * 0.72) continue
    const a = Math.atan2(z, x)
    const k = 1 + 0.045 * Math.sin(a * 3 + seed * 2.1) + 0.035 * Math.sin(a * 7 + seed * 5.3)
    tp.setX(i, x * k)
    tp.setZ(i, z * k)
  }
  top.computeVertexNormals()
  return top
}

/** Rock strata underside + a soil band under the lip + hanging roots, merged. */
function underGeo(radius: number, palette: IslandPalette, seed: number) {
  const r = radius
  const rnd = mulberry(seed)
  const depth = Math.max(3.8, r * 0.9)
  // lathe profile: soil band just under the lip, then stepped strata to a point
  const prof: [number, number][] = [
    [0.95, -0.6], [0.97, -0.78], [0.9, -0.92], [0.86, -1.06],
    [0.8, -1.2], [0.74, -1.38], [0.68, -1.56], [0.63, -1.78],
    [0.56, -2.0], [0.5, -2.24], [0.44, -2.5], [0.37, -2.78],
    [0.3, -3.06], [0.24, -3.34], [0.17, -3.62], [0.1, -3.9],
    [0.045, -depth + 0.15], [0.001, -depth],
  ]
  const under = new THREE.LatheGeometry(
    prof.map(([px, py]) => new THREE.Vector2(px * r, py)),
    64,
  )
  const up = under.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < up.count; i++) {
    const x = up.getX(i)
    const y = up.getY(i)
    const z = up.getZ(i)
    const rad = Math.hypot(x, z)
    if (rad < 1e-3) continue
    const a = Math.atan2(z, x)
    // stepped shelves + harmonic wobble + a little per-vertex noise
    const k =
      1 +
      0.07 * Math.sin(a * 4 + y * 2.2 + seed) +
      0.05 * Math.sin(a * 9 + seed * 3.7) +
      0.07 * (rnd(i) - 0.5)
    up.setX(i, x * k)
    up.setZ(i, z * k)
    up.setY(i, y + (rnd(i + 57) - 0.5) * 0.12)
  }
  under.computeVertexNormals()
  // sedimentary bands, tinted slightly by the island accent; darker under the
  // lip shadow and toward the tip
  const accent = new THREE.Color(palette.accent || '#c9b79a')
  const base = new THREE.Color('#c9b79a').lerp(accent, 0.15)
  const bands = [base, base.clone().multiplyScalar(0.88), base.clone().multiplyScalar(0.76), base.clone().multiplyScalar(0.64)]
  const soil = new THREE.Color('#8a6748')
  paint(under, '#c9b79a', (c, x, y) => {
    if (y > -1.06) { c.copy(soil); } // soil band right under the grass lip
    else {
      const b = Math.abs(Math.floor(-y * 1.9 + Math.sin(x * 2.1 + seed) * 0.6)) % bands.length
      c.copy(bands[b])
    }
    c.multiplyScalar(
      (0.52 + 0.5 * smooth(-depth, -0.6, y)) * (1 - 0.34 * (1 - smooth(-1.2, -0.6, y))),
    )
  }, 0.07)

  // a few thin roots hanging from the rim underside
  const geos: THREE.BufferGeometry[] = [under]
  const nRoots = 4 + Math.floor(rnd(11) * 3)
  for (let i = 0; i < nRoots; i++) {
    const a = rnd(100 + i * 7) * Math.PI * 2
    const d = r * (0.82 + rnd(101 + i * 7) * 0.14)
    const sx = Math.cos(a) * d
    const sz = Math.sin(a) * d
    const len = 0.4 + rnd(102 + i * 7) * 0.7
    const curl = (rnd(103 + i * 7) - 0.5) * 0.5
    const pts = [
      new THREE.Vector3(sx, -0.55, sz),
      new THREE.Vector3(sx + Math.cos(a) * 0.12, -0.55 - len * 0.4, sz + curl * 0.3),
      new THREE.Vector3(sx + Math.cos(a) * 0.05 + curl * 0.2, -0.55 - len, sz + Math.sin(a) * 0.08),
    ]
    const root = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.02 + rnd(104 + i * 7) * 0.012, 5)
    paint(root, '#6b4f37', undefined, 0.1)
    geos.push(root)
  }
  const g = mergeGeometries(geos, false)!
  geos.forEach((x) => x.dispose())
  return g
}

export function IslandBase({
  id,
  radius = 5,
  palette,
  seed,
}: {
  id: string
  radius?: number
  palette: IslandPalette
  seed?: number
}) {
  const s = seed ?? [...id].reduce((a, c) => a + c.charCodeAt(0), 0)
  const cap = useMemo(() => capGeo(radius, palette.ground, s), [radius, palette.ground, s])
  const under = useMemo(() => underGeo(radius, palette, s), [radius, palette, s])
  const walkRef = useRef<THREE.Mesh>(null)
  useWalkable(walkRef)
  const mat = useMemo(() => toonVC(), [])
  return (
    <group>
      <mesh ref={walkRef} geometry={cap} material={mat} castShadow receiveShadow />
      <mesh geometry={under} material={mat} castShadow receiveShadow />
      {/* seeded pack dressing on the rim — trees, rocks, tufts, flowers, bushes */}
      <Scatter radius={radius} seed={s} />
    </group>
  )
}
