import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, clay, Scaffold } from '../../world/kit'
import type { DioramaProps } from '../types'
import { put, frame, merged, useVcMat } from './parts.v5'
import { useSignTex } from '../L01/sign.v5'

/* Ent: four laptops around a round table under a big tree, cables running into the soil like roots.
 * All static props are painted + merged into ONE vertex-coloured mesh; only the
 * animated pieces (screens, LED, token) stay separate. */
const TABLE: [number, number, number] = [-0.34, 0, -0.28]
const TOP = 0.56
const TREE: [number, number, number] = [0.85, 0, -1.15]
const LAPS = [
  { x: -0.5, hue: '#c9875f' },
  { x: -0.17, hue: '#7fa7b5' },
  { x: 0.17, hue: '#8fb36b' },
  { x: 0.5, hue: '#9b8bb5' },
]
const LAP_YAW = [-0.3, -0.1, 0.1, 0.3]

/* Four model-share slabs pinned to the scaffold dome while it is up — the same
 * rounded tiles V4's cover wore. One merged mesh; rides the cloth's shrink. */
const DOME_SC: [number, number, number] = [2.35 * 0.56, 1.45 * 1.02, 1.75 * 0.56]
const SLAB_HUES = ['#c9875f', '#7fa7b5', '#8fb36b', '#9b8bb5']
const SLAB_ARC = [
  { az: -0.62, el: 0.30 },
  { az: -0.20, el: 0.48 },
  { az: 0.22, el: 0.40 },
  { az: 0.60, el: 0.24 },
]

function DomeBlocks({ open }: { open: boolean }) {
  const g = useRef<THREE.Mesh>(null)
  const t = useRef(open ? 1 : 0)
  const geo = useMemo(() => {
    const bag: THREE.BufferGeometry[] = []
    SLAB_ARC.forEach(({ az, el }, i) => {
      const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      const pos = new THREE.Vector3(d.x * DOME_SC[0], d.y * DOME_SC[1], d.z * DOME_SC[2])
      const nrm = new THREE.Vector3(d.x / DOME_SC[0], d.y / DOME_SC[1], d.z / DOME_SC[2]).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm)
      pos.addScaledVector(nrm, 0.035)
      const w = 0.34 + (i % 2) * 0.05
      put(bag, new THREE.BoxGeometry(w, 0.26, 0.07), SLAB_HUES[i], 0, 0, 0, {
        pre: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)),
      })
    })
    return merged(bag)
  }, [])
  const vc = useVcMat()
  useFrame((_, dt) => {
    const target = open ? 1 : 0
    t.current += (target - t.current) * Math.min(1, dt * 2.2)
    if (g.current) {
      g.current.scale.y = Math.max(0.001, 1 - t.current)
      g.current.visible = t.current < 0.995
    }
  })
  return <mesh ref={g} geometry={geo ?? undefined} material={vc} castShadow />
}

/** Every static prop — tree, table, laptop shells, router, mugs, note, cushion,
 *  cables and roots — merged into a single vertex-coloured mesh. */
function useStaticGeo() {
  return useMemo(() => {
    const bag: THREE.BufferGeometry[] = []

    // the Ent tree (group rotation rz 0.05 baked in)
    const treePre = new THREE.Matrix4().compose(
      new THREE.Vector3(...TREE),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.05)),
      new THREE.Vector3(1, 1, 1),
    )
    put(bag, new THREE.CylinderGeometry(0.09, 0.16, 1.5, 9), C.wood, 0, 0.75, 0, { pre: treePre })
    put(bag, new THREE.CylinderGeometry(0.035, 0.05, 0.45, 7), C.wood, 0.16, 1.15, 0.05, { rz: -0.7, pre: treePre })
    put(bag, new THREE.CylinderGeometry(0.03, 0.045, 0.4, 7), C.wood, -0.14, 1.3, -0.04, { rx: 0.3, rz: 0.75, pre: treePre })
    put(bag, new THREE.SphereGeometry(0.68, 18, 14), C.leafDark, 0, 2.05, 0, { s: [1, 0.82, 1], pre: treePre })
    put(bag, new THREE.SphereGeometry(0.45, 16, 12), C.leaf, 0.5, 1.75, 0.12, { s: [1, 0.8, 1], pre: treePre })
    put(bag, new THREE.SphereGeometry(0.42, 16, 12), C.moss, -0.45, 1.8, -0.05, { s: [1, 0.78, 1], pre: treePre })
    put(bag, new THREE.SphereGeometry(0.4, 16, 12), C.leaf, 0.14, 2.5, 0.05, { s: [1, 0.75, 1], pre: treePre })
    put(bag, new THREE.SphereGeometry(0.36, 14, 12), C.leafDark, -0.15, 2.42, -0.18, { s: [1, 0.75, 1], pre: treePre })
    ;[[0.22, 0.12, 0.5], [-0.2, 0.1, -0.6], [0.02, -0.2, 2.8]].forEach(([x, z, r]) =>
      put(bag, new THREE.SphereGeometry(0.1, 10, 8), C.wood, x, 0.05, z, { ry: r, s: [1.6, 0.5, 0.7], pre: treePre }),
    )

    // round wooden table
    const tPre = frame(TABLE[0], TABLE[1], TABLE[2])
    put(bag, new THREE.CylinderGeometry(0.82, 0.82, 0.07, 28), C.woodLight, 0, TOP - 0.035, 0, { pre: tPre })
    put(bag, new THREE.TorusGeometry(0.72, 0.025, 8, 28), C.wood, 0, TOP - 0.085, 0, { rx: Math.PI / 2, pre: tPre })
    put(bag, new THREE.CylinderGeometry(0.07, 0.1, 0.5, 10), C.wood, 0, 0.26, 0, { pre: tPre })
    put(bag, new THREE.CylinderGeometry(0.3, 0.34, 0.06, 20), C.wood, 0, 0.03, 0, { pre: tPre })

    // laptop shells (base + lid back); the screens stay separate animated meshes
    LAPS.forEach((l, i) => {
      const pre = frame(TABLE[0] + l.x, TOP, TABLE[2] + 0.28, LAP_YAW[i])
      put(bag, new THREE.BoxGeometry(0.3, 0.025, 0.21), '#e2cdaa', 0, 0.013, 0, { pre })
      const lid = frame(0, 0.028, -0.092)
      lid.premultiply(pre)
      lid.multiply(new THREE.Matrix4().makeRotationX(-0.32))
      put(bag, new THREE.BoxGeometry(0.3, 0.21, 0.015), C.paper, 0, 0.1, 0, { pre: lid })
    })

    // little home router at the back of the table
    const rPre = frame(TABLE[0], TOP, TABLE[2] - 0.42, 0.15)
    put(bag, new THREE.BoxGeometry(0.17, 0.05, 0.12), C.cream, 0, 0.025, 0, { pre: rPre })
    put(bag, new THREE.CylinderGeometry(0.006, 0.006, 0.13, 6), C.ink, -0.05, 0.11, -0.04, { rz: 0.35, pre: rPre })
    put(bag, new THREE.CylinderGeometry(0.006, 0.006, 0.13, 6), C.ink, 0.05, 0.11, -0.04, { rz: -0.35, pre: rPre })

    // cables running off the table and into the soil like roots
    const spread = [[-0.75, 0.72], [-0.3, 0.95], [0.35, 0.95], [0.8, 0.68]]
    LAPS.forEach((l, i) => {
      const ax = TABLE[0] + l.x, az = TABLE[2] + 0.28
      const [sx, sz] = spread[i]
      const pts = [
        new THREE.Vector3(ax, TOP + 0.01, az - 0.11),
        new THREE.Vector3(ax * 0.55 + TABLE[0] * 0.45, TOP - 0.07, az - 0.26),
        new THREE.Vector3(TABLE[0] + sx * 0.1, 0.3, TABLE[2] + 0.08),
        new THREE.Vector3(TABLE[0] + sx * 0.5, 0.028, TABLE[2] + 0.32),
        new THREE.Vector3(TABLE[0] + sx, 0.014, TABLE[2] + sz),
      ]
      put(bag, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 6), C.earthDark, 0, 0, 0)
    })
    const mk = (pts: [number, number, number][]) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 20, 0.02, 6)
    put(bag, mk([[TREE[0], 0.05, TREE[2] + 0.05], [0.5, 0.02, -0.75], [0.1, 0.012, -0.55]]), C.wood, 0, 0, 0)
    put(bag, mk([[TREE[0] + 0.08, 0.05, TREE[2] + 0.1], [1.3, 0.02, -0.7], [1.55, 0.012, -0.35]]), C.wood, 0, 0, 0)

    // two mugs and a folded note
    ;[[-0.44, -0.34, '#c9875f'], [0.4, -0.38, '#7fa7b5']].forEach(([x, z, c]) => {
      const pre = frame(TABLE[0] + (x as number), TOP, TABLE[2] + (z as number))
      put(bag, new THREE.CylinderGeometry(0.042, 0.036, 0.07, 10), c as string, 0, 0.035, 0, { pre })
      put(bag, new THREE.TorusGeometry(0.026, 0.008, 6, 12, Math.PI), c as string, 0.05, 0.038, 0, { rx: Math.PI / 2, pre })
    })
    put(bag, new THREE.BoxGeometry(0.2, 0.025, 0.15), C.paper, TABLE[0] - 0.28, TOP + 0.012, TABLE[2] - 0.52, { ry: 0.45 })

    // the floor cushion someone pulled up to the table
    put(bag, new THREE.SphereGeometry(0.3, 14, 10), '#b5654a', -1.32, 0.055, 0.42, { s: [1, 0.32, 1] })

    return merged(bag)
  }, [])
}

function Note() {
  const tex = useSignTex(512, 384, 'Four laptops.\nOne 27B model.', false)
  return (
    <group position={[TABLE[0] - 0.28, TOP + 0.0265, TABLE[2] - 0.52]} rotation={[0, 0.45, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.15]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  )
}

export default function Diorama({ unlocked }: DioramaProps) {
  const token = useRef<THREE.Mesh>(null)
  const staticGeo = useStaticGeo()
  const vc = useVcMat()

  // the four screens glow softly once solved — one instanced draw call,
  // per-screen colour via instanceColor
  const scrIM = useRef<THREE.InstancedMesh>(null)
  const scrGeo = useMemo(() => new THREE.BoxGeometry(0.26, 0.165, 0.016), [])
  const scrMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), [])
  const scrI = useMemo(() => new Float32Array(4), [])
  const scrArgs = useMemo(() => [scrGeo, scrMat, 4] as const, [scrGeo, scrMat])
  const _c = useMemo(() => new THREE.Color('#eadfc9'), [])
  const _hue = useMemo(() => LAPS.map((l) => new THREE.Color(l.hue)), [])
  useEffect(() => {
    const im = scrIM.current
    if (!im) return
    const m = new THREE.Matrix4()
    const tmp = new THREE.Matrix4()
    LAPS.forEach((l, i) => {
      m.makeTranslation(TABLE[0] + l.x, TOP, TABLE[2] + 0.28)
        .multiply(tmp.makeRotationY(LAP_YAW[i]))
        .multiply(tmp.makeTranslation(0, 0.028, -0.092))
        .multiply(tmp.makeRotationX(-0.32))
        .multiply(tmp.makeTranslation(0, 0.1, 0.003))
      im.setMatrixAt(i, m)
      im.setColorAt(i, _c)
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [_c])
  const led = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e9dfcf', roughness: 0.5, emissive: C.leafDark, emissiveIntensity: 0 }),
    [],
  )
  const ledP = useMemo(() => {
    const p = new THREE.Vector3(0, 0.052, 0.055).applyMatrix4(frame(TABLE[0], TOP, TABLE[2] - 0.42, 0.15))
    return p
  }, [])

  const tops = useMemo(
    () => LAPS.map((l, i) => new THREE.Vector3(TABLE[0] + l.x - Math.sin(LAP_YAW[i]) * 0.1, TOP + 0.26, TABLE[2] + 0.28 - 0.09)),
    [],
  )

  useFrame((st) => {
    const t = st.clock.elapsedTime
    const sim = scrIM.current
    if (sim) {
      for (let i = 0; i < 4; i++) {
        scrI[i] = unlocked ? 0.8 + Math.sin(t * 1.8 + i * 1.4) * 0.15 : 0
        _c.set('#eadfc9').lerp(_hue[i], Math.min(1, scrI[i] * 1.1))
        sim.setColorAt(i, _c)
      }
      if (sim.instanceColor) sim.instanceColor.needsUpdate = true
    }
    led.emissiveIntensity = unlocked ? 0.7 + (Math.sin(t * 5) > 0 ? 0.6 : 0.1) : 0
    const tk = token.current
    if (tk) {
      if (!unlocked) { tk.visible = false; return }
      tk.visible = true
      const cyc = t % 4.0
      if (cyc < 2.4) {
        const k = Math.min(2, Math.floor(cyc / 0.8)), f = cyc / 0.8 - k
        const a = tops[k], b = tops[k + 1]
        tk.position.lerpVectors(a, b, f)
        tk.position.y += Math.sin(f * Math.PI) * 0.16
        tk.scale.setScalar(Math.min(1, cyc / 0.15))
      } else if (cyc < 3.0) {
        tk.position.copy(tops[3]); tk.scale.setScalar(Math.max(0, 1 - (cyc - 2.4) * 1.8))
      } else tk.scale.setScalar(0)
    }
  })

  return (
    <group>
      {/* every static prop in one draw call */}
      <mesh geometry={staticGeo ?? undefined} material={vc} castShadow receiveShadow />
      <Note />

      {/* the four screens — one instanced draw call */}
      <instancedMesh ref={scrIM} args={scrArgs as unknown as [THREE.BufferGeometry, THREE.Material, number]} frustumCulled={false} />
      <mesh position={ledP} material={led}>
        <sphereGeometry args={[0.011, 8, 8]} />
      </mesh>

      {/* the word that hops laptop to laptop */}
      <mesh ref={token} position={tops[0]} material={clay(C.paper)} visible={false} castShadow>
        <sphereGeometry args={[0.045, 12, 10]} />
      </mesh>

      {/* share-coloured slabs pinned on the dust-sheet dome, gone with it */}
      <group position={[TABLE[0], 0, TABLE[2] - 0.05]}>
        <DomeBlocks open={unlocked} />
      </group>
      <Scaffold open={unlocked} position={[TABLE[0], 0, TABLE[2] - 0.05]} size={[2.35, 1.45, 1.75]} />
    </group>
  )
}
