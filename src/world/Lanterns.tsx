/**
 * Small clay lanterns: round paper-glass spheres perched on the bridge end posts
 * and on wooden stands dotted along the paths of islands you've already opened.
 * The glass is one shared MeshBasicMaterial and the halo one shared PointsMaterial,
 * so Atmosphere can dial every lantern in the world with two uniform writes as
 * `env.night` rises — lit by day they stay pale clay, at dusk they warm up, at
 * night they glow and bloom catches them (never neon: the colour stays ~#ffc27a).
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { C, clayVC, paint, topY } from './kit'
import { pathLocal } from './layout'
import { env } from './sky'

const LAMP_BASE = new THREE.Color('#ffc27a')
/** Shared lantern glass — colour is scaled past 1 at night so bloom picks it up. */
export const lampGlass = new THREE.MeshBasicMaterial({ color: LAMP_BASE.clone() })

let _glowTex: THREE.Texture | null = null
/** Soft warm radial sprite used for lantern halos. */
export function glowTex() {
  if (_glowTex) return _glowTex
  const cv = document.createElement('canvas'); cv.width = cv.height = 64
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31)
  g.addColorStop(0, 'rgba(255,214,150,0.85)'); g.addColorStop(0.4, 'rgba(255,178,105,0.32)'); g.addColorStop(1, 'rgba(255,170,95,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  _glowTex = new THREE.CanvasTexture(cv)
  return _glowTex
}

let _lampGlow: THREE.PointsMaterial | null = null
/** One halo material for every lantern — opacity follows env.night. */
export function lampGlowMat() {
  if (!_lampGlow) _lampGlow = new THREE.PointsMaterial({
    map: glowTex(), color: '#ffab54', size: 0.85, sizeAttenuation: true,
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  return _lampGlow
}

/** Called once per frame by Atmosphere. */
export function driveLamps(night: number) {
  lampGlass.color.copy(LAMP_BASE).multiplyScalar(0.42 + night * 1.55)
  lampGlowMat().opacity = night * 0.7
}

type Spot = { p: THREE.Vector3; tall: number; /** ground height override — for stands on raised surfaces (ledges) */ gy?: number }

/** Merged wooden stands + caps (vertex-coloured) and glass spheres for a set of lantern spots. */
function lanternGeos(spots: Spot[]) {
  const frames: THREE.BufferGeometry[] = []
  const glass: THREE.BufferGeometry[] = []
  const pts: number[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1)
  const put = (g: THREE.BufferGeometry, x: number, y: number, z: number, hex: string) => {
    g.applyMatrix4(m.compose(new THREE.Vector3(x, y, z), q, s1)); paint(g, hex, undefined, 0.05); frames.push(g)
  }
  for (const { p, tall, gy: gyo } of spots) {
    // tall: p.xz is island-local and we stand on the grass (or gy override);
    // short: p.y is already the glass height
    const gy = tall ? (gyo ?? topY(Math.hypot(p.x, p.z))) : 0
    if (tall) put(new THREE.CylinderGeometry(0.035, 0.05, 0.62, 7), p.x, gy + 0.31, p.z, C.wood)
    const y = tall ? gy + 0.68 : p.y
    put(new THREE.CylinderGeometry(0.028, 0.045, 0.05, 7), p.x, y + 0.085, p.z, C.wood)        // cap
    put(new THREE.SphereGeometry(0.018, 8, 6), p.x, y + 0.125, p.z, C.wood)                  // knob
    put(new THREE.CylinderGeometry(0.045, 0.032, 0.03, 7), p.x, y - 0.078, p.z, '#96704e') // base
    const gl = new THREE.SphereGeometry(0.082, 12, 9)
    gl.applyMatrix4(m.compose(new THREE.Vector3(p.x, y, p.z), q, s1)); glass.push(gl)
    pts.push(p.x, y, p.z)
  }
  const frameGeo = mergeGeometries(frames, false)
  const glassGeo = mergeGeometries(glass, false)
  frames.forEach((g) => g.dispose()); glass.forEach((g) => g.dispose())
  const ptsGeo = new THREE.BufferGeometry()
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
  return { frameGeo, glassGeo, ptsGeo }
}

/** Lantern mesh trio for a set of spots (world or island-local coordinates). */
export function Lanterns({ spots }: { spots: Spot[] }) {
  const { frameGeo, glassGeo, ptsGeo } = useMemo(() => lanternGeos(spots), [spots])
  return (
    <group>
      <mesh geometry={frameGeo} material={clayVC()} castShadow />
      <mesh geometry={glassGeo} material={lampGlass} />
      <points geometry={ptsGeo} material={lampGlowMat()} />
    </group>
  )
}

/**
 * Standing lanterns on a solved island: one by the stand spot, one guarding each
 * bridge end that exists here. Island-local coordinates.
 */
export function IslandLanterns({ index }: { index: number }) {
  const light = useRef<THREE.PointLight>(null)
  const { spots, lampAt } = useMemo(() => {
    const path = pathLocal(index) // [in-edge?, stand, out-edge?]
    const stand = new THREE.Vector3(-0.9, 0, 1.4)
    const list: Spot[] = []
    // a lantern beside each bridge landing, stepped off the walking path to one side
    const landings = path.length === 3 ? [path[0], path[2]] : index === 0 ? [path[1]] : [path[0]]
    for (let k = 0; k < landings.length; k++) {
      const d = stand.clone().sub(landings[k]).setY(0).normalize()
      const side = k === 0 ? 1 : -1
      list.push({ p: landings[k].clone().addScaledVector(d, 0.55).addScaledVector(new THREE.Vector3(-d.z, 0, d.x), 0.55 * side), tall: 1 })
    }
    list.push({ p: new THREE.Vector3(stand.x - 0.72, 0, stand.z + 0.62), tall: 1 })
    return { spots: list, lampAt: stand.clone().add(new THREE.Vector3(-0.4, 1.3, 0.35)) }
  }, [index])
  useFrame(() => {
    const l = light.current; if (!l) return
    l.visible = env.night > 0.04
    l.intensity = env.night * 1.6
  })
  return (
    <group>
      <Lanterns spots={spots} />
      <pointLight ref={light} position={lampAt} color="#ffb45e" intensity={0} distance={7} decay={1.8} />
    </group>
  )
}

/** Lanterns sitting on a bridge's four end-post tops. World coordinates. */
export function bridgeLampSpots(from: THREE.Vector3, to: THREE.Vector3): Spot[] {
  const dir = to.clone().sub(from).setY(0).normalize()
  const lat = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.42)
  const spots: Spot[] = []
  for (const end of [from, to]) for (const s of [-1, 1])
    spots.push({ p: end.clone().addScaledVector(lat, s).setY(0.68), tall: 0 })
  return spots
}
