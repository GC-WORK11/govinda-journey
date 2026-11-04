/**
 * HeliModel — the rideable helicopter's visual: "Helicopter" by kazuma via
 * poly.pizza (CC0 — public/models/packs/citykit/helicopter.glb, see
 * packs/LICENSES.md). The GLB ships as one merged node in four material
 * groups; here it is re-assembled for play — the main-rotor group moves onto
 * a spin pivot on the mast, the merged tail-rotor disc is cut out of the body
 * and replaced by a small procedural rotor on its own pivot, and every
 * material is retinted onto the clay palette (body terracotta, cabin glass,
 * rotors ink). Nose faces +z, skids rest on y = 0, craft centre is origin.
 *
 * Spin: pass `rotorRef`/`tailRef` to drive the pivots yourself (L06), or
 * leave them unset and the model self-spins — lazy idle while parked, full
 * throttle when `heli.flying` (Heli.tsx's shared state) is set.
 */
import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { toon } from '../art/material'
import { C } from '../../world/kit'
import { heli } from './Heli'

const URL = '/models/packs/citykit/helicopter.glb'

/* glb-space measurements (metres): skids bottom ~y 0.075, main-rotor mast axis
   at (0.02, −0.07) with blades ~y 1.38, tail-rotor disc centre (0, 0.77,
   −2.885), nose +z, overall length ~4.6. */
const SCALE = 0.6
const MAST = new THREE.Vector3(0.02, 0, -0.07)
const TAIL = new THREE.Vector3(0, 0.77, -2.885)
const SKID_Y = 0.075

/** source material name -> clay tint */
const TINT: Record<string, string> = {
  'Material.001': C.terracotta,  // fuselage + tail boom + skids (was near-black)
  'Material.003': C.brick,       // cabin band / accent (was red)
  'Material.004': '#5d7684',     // canopy glass (was white)
  'Material.002': C.ink,         // rotor assembly (was dark grey)
}
/** material name of the main-rotor primitive */
const ROTOR_MAT = 'Material.002'
/** material name of the body primitive that hides the merged tail-rotor disc */
const BODY_MAT = 'Material.001'

/** Drop every triangle wholly inside the tail-rotor disc zone (thin XY disc at
    the tail tip — verts z < −2.86, y < 0.91, |x| < 0.30). */
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

function Inner({ rotorRef, tailRef, scale = SCALE, ...p }: {
  /** main-rotor pivot — caller spins `.rotation.y` (unset → self-spins) */
  rotorRef?: React.Ref<THREE.Group>
  /** tail-rotor pivot — caller spins `.rotation.z` (unset → self-spins) */
  tailRef?: React.Ref<THREE.Group>
  scale?: number
} & Omit<JSX.IntrinsicElements['group'], 'ref'>) {
  const { scene } = useGLTF(URL)
  const ownMain = useRef<THREE.Group>(null)
  const ownTail = useRef<THREE.Group>(null)
  const main = rotorRef ?? ownMain
  const tail = tailRef ?? ownTail

  const { body, rotor } = useMemo(() => {
    const body = new THREE.Group()
    let rotor: THREE.Mesh | null = null
    const root = scene.clone(true)
    root.updateMatrixWorld(true)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const matName = (m.material as THREE.Material).name
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
      const mesh = new THREE.Mesh(g, toon({ color: TINT[matName] ?? C.ink }))
      mesh.castShadow = mesh.receiveShadow = true
      if (matName === ROTOR_MAT) rotor = mesh
      else {
        if (matName === BODY_MAT) exciseTailDisc(g)
        body.add(mesh)
      }
    })
    return { body, rotor }
  }, [scene])

  // self-spin whichever pivots the caller didn't take: parked = lazy idle,
  // full throttle while the shared `heli` state says flying.
  const speed = useRef(0)
  useFrame((_, dt) => {
    const target = heli.flying ? 26 : 3.5
    speed.current += (target - speed.current) * Math.min(1, dt * 2.2)
    if (!rotorRef && ownMain.current) ownMain.current.rotation.y += dt * speed.current
    if (!tailRef && ownTail.current) ownTail.current.rotation.z -= dt * speed.current * 5
  })

  return (
    <group scale={scale} {...p}>
      <group position={[0, -SKID_Y, -0.1]}>
        <primitive object={body} />
        {rotor && (
          <group ref={main as React.Ref<THREE.Group>} position={MAST.toArray()}>
            <primitive object={rotor} position={[-MAST.x, -MAST.y, -MAST.z]} />
          </group>
        )}
        {/* procedural tail rotor — the source disc was merged into the body */}
        <group ref={tail as React.Ref<THREE.Group>} position={TAIL.toArray()}>
          <mesh material={toon({ color: C.ink })} castShadow>
            <boxGeometry args={[0.44, 0.045, 0.02]} />
          </mesh>
          <mesh material={toon({ color: C.ink })} castShadow>
            <boxGeometry args={[0.05, 0.28, 0.02]} />
          </mesh>
          <mesh material={toon({ color: C.brick })}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/** The CC0 helicopter, ready to mount inside a <Heli> rig or an obstacle's own
    flight group. Suspends on first load (renders nothing until ready). */
export function HeliModel(props: Parameters<typeof Inner>[0]) {
  return <Suspense fallback={null}><Inner {...props} /></Suspense>
}

useGLTF.preload(URL)
