/**
 * HeliModel — the rideable helicopter's visual: "Helicopter" by kazuma via
 * poly.pizza (CC0 — public/models/packs/citykit/helicopter.glb, 49 KB, see
 * packs/LICENSES.md). The GLB is one merged node in four material groups;
 * `loadHeliCraft()` re-assembles it for play — every primitive is retinted
 * onto the clay palette and baked into a single vertex-coloured body mesh,
 * the main-rotor group moves onto a spin pivot on the mast, the merged
 * tail-rotor disc is cut out of the body and replaced by a small procedural
 * rotor on its own pivot. Nose faces +z, skids rest on y = 0, craft centre
 * is origin, ~2.8 m nose-to-tail, 3 draw calls total.
 *
 * Mount inside a <Heli> rig (it is the default visual when no children are
 * passed) or inside an obstacle's own flight group:
 *
 *   <HeliModel />                         // self-spins: lazy idle, full
 *                                         // throttle while heli.flying
 *   <HeliModel rotorRef={r} tailRef={t} />   // caller drives the pivots
 *
 * `loadHeliCraft()` is the imperative twin — same assembly, no React — so
 * QA harnesses can add the craft to any live scene.
 */
import { useEffect, useRef, useState, type MutableRefObject, type Ref } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toonVC } from '../art/material'
import { C, paint } from '../../world/kit'
import { heli } from './Heli'

const URL = '/models/packs/citykit/helicopter.glb'

/* glb-space measurements (metres, decoded offline): skids bottom ~y 0.075,
   main-rotor mast axis at (0.02, −0.07) with blades ~y 1.38, merged
   tail-rotor disc centre (0, 0.77, −2.885) thin in z, nose +z, length ~4.6. */
const SCALE = 0.6
const MAST = new THREE.Vector3(0.02, 0, -0.07)
const TAIL = new THREE.Vector3(0, 0.77, -2.885)
const SKID_Y = 0.075

/** source material name -> clay tint (baked as vertex colours) */
const TINT: Record<string, string> = {
  'Material.001': C.terracotta, // fuselage + tail boom + skids (was near-black)
  'Material.003': C.brick,      // cabin band / accent (was red)
  'Material.004': '#5d7684',    // canopy glass (was white)
  'Material.002': C.ink,        // rotor assembly (was dark grey)
}
const ROTOR_MAT = 'Material.002'
const BODY_MAT = 'Material.001'

/** Drop every triangle wholly inside the tail-rotor disc zone (thin XY disc
    at the tail tip — verts z < −2.86, y < 0.91, |x| < 0.30; 24 tris). */
function exciseTailDisc(src: THREE.BufferGeometry) {
  const pos = src.attributes.position
  const idx = src.index
  const triN = idx ? idx.count / 3 : pos.count / 3
  const at = (i: number) => (idx ? idx.getX(i) : i)
  const keep: number[] = []
  const v = new THREE.Vector3()
  for (let t = 0; t < triN; t++) {
    let inZone = true
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, at(t * 3 + k))
      if (!(v.z < -2.86 && v.y < 0.91 && Math.abs(v.x) < 0.3)) { inZone = false; break }
    }
    if (!inZone) keep.push(at(t * 3), at(t * 3 + 1), at(t * 3 + 2))
  }
  src.setIndex(keep)
}

export type HeliCraft = {
  /** craft root — add under any group; skids on local y = 0, nose +z */
  root: THREE.Group
  /** main-rotor pivot — spin `.rotation.y` */
  main: THREE.Group
  /** tail-rotor pivot — spin `.rotation.z` */
  tail: THREE.Group
}

/** Re-assemble one craft from a (cloned) GLB scene. */
function assemble(scene: THREE.Group): HeliCraft {
  const bodyGeos: THREE.BufferGeometry[] = []
  let rotorGeo: THREE.BufferGeometry | null = null
  scene.updateMatrixWorld(true)
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const matName = (m.material as THREE.Material).name
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    paint(g, TINT[matName] ?? C.ink)
    if (matName === ROTOR_MAT) rotorGeo = g
    else {
      if (matName === BODY_MAT) exciseTailDisc(g)
      bodyGeos.push(g)
    }
  })

  const root = new THREE.Group()
  const inner = new THREE.Group()
  inner.position.set(0, -SKID_Y, -0.1)

  const vc = toonVC()
  const body = new THREE.Mesh(mergeGeometries(bodyGeos, false)!, vc)
  body.castShadow = body.receiveShadow = true
  inner.add(body)
  for (const g of bodyGeos) g.dispose()

  const main = new THREE.Group()
  main.position.copy(MAST)
  if (rotorGeo) {
    const rotor = new THREE.Mesh(rotorGeo, vc)
    rotor.castShadow = true
    rotor.position.set(-MAST.x, -MAST.y, -MAST.z)
    main.add(rotor)
  }
  inner.add(main)

  // procedural tail rotor — the source disc was merged into the body
  const tail = new THREE.Group()
  tail.position.copy(TAIL)
  const tg = mergeGeometries([
    paint(new THREE.BoxGeometry(0.44, 0.045, 0.02), C.ink),
    paint(new THREE.BoxGeometry(0.05, 0.28, 0.02), C.ink),
    paint(new THREE.SphereGeometry(0.045, 8, 6), C.brick),
  ], false)!
  const tailMesh = new THREE.Mesh(tg, vc)
  tailMesh.castShadow = true
  tail.add(tailMesh)
  inner.add(tail)

  root.add(inner)
  return { root, main, tail }
}

/* ------------------------------- loading ------------------------------- */

let gltfP: Promise<THREE.Group> | null = null
function loadScene() {
  return (gltfP ??= new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(URL, (g) => resolve(g.scene), undefined, reject)
  }))
}

/** Assemble a fresh craft (fresh geometries + pivots) from the cached GLB. */
export async function loadHeliCraft(): Promise<HeliCraft> {
  return assemble((await loadScene()).clone(true))
}

/* ------------------------------- component ------------------------------ */

const setRef = (r: Ref<THREE.Group> | undefined, v: THREE.Group | null) => {
  if (typeof r === 'function') r(v)
  else if (r) (r as MutableRefObject<THREE.Group | null>).current = v
}

export function HeliModel({ rotorRef, tailRef, scale = SCALE, ...p }: {
  /** main-rotor pivot — caller spins `.rotation.y` (unset → self-spins) */
  rotorRef?: Ref<THREE.Group>
  /** tail-rotor pivot — caller spins `.rotation.z` (unset → self-spins) */
  tailRef?: Ref<THREE.Group>
  scale?: number
} & Omit<JSX.IntrinsicElements['group'], 'ref'>) {
  const [craft, setCraft] = useState<HeliCraft | null>(null)
  useEffect(() => {
    let on = true
    loadHeliCraft().then((c) => { if (on) setCraft(c) })
    return () => { on = false }
  }, [])
  useEffect(() => {
    if (!craft) return
    setRef(rotorRef, craft.main)
    setRef(tailRef, craft.tail)
    return () => { setRef(rotorRef, null); setRef(tailRef, null) }
  }, [craft, rotorRef, tailRef])

  // self-spin whichever pivots the caller didn't take: parked = lazy idle,
  // full throttle while the shared `heli` state says flying.
  const speed = useRef(0)
  useFrame((_, dt) => {
    const target = heli.flying ? 26 : 3.5
    speed.current += (target - speed.current) * Math.min(1, dt * 2.2)
    if (!rotorRef && craft) craft.main.rotation.y += dt * speed.current
    if (!tailRef && craft) craft.tail.rotation.z -= dt * speed.current * 5
  })

  if (!craft) return null
  return <group scale={scale} {...p}><primitive object={craft.root} /></group>
}

// kick the (tiny) fetch as soon as the chunk lands — the pad never pops in
if (typeof window !== 'undefined') void loadScene()
