import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { C, clay, Scaffold } from '../../world/kit'
import type { DioramaProps } from '../types'

/* Ent: four laptops around a round table under a big tree, cables running into the soil like roots. */
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

function Laptop({ p, yaw, scr }: { p: [number, number, number]; yaw: number; scr: THREE.MeshStandardMaterial }) {
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <RoundedBox args={[0.3, 0.025, 0.21]} radius={0.008} position={[0, 0.013, 0]} material={clay('#e2cdaa')} castShadow />
      <group position={[0, 0.028, -0.092]} rotation={[-0.32, 0, 0]}>
        <RoundedBox args={[0.3, 0.21, 0.015]} radius={0.007} position={[0, 0.1, 0]} material={clay(C.paper)} castShadow />
        <RoundedBox args={[0.26, 0.165, 0.016]} radius={0.005} position={[0, 0.1, 0.003]} material={scr} />
      </group>
    </group>
  )
}

export default function Diorama({ unlocked }: DioramaProps) {
  const token = useRef<THREE.Mesh>(null)

  // screen materials glow softly once the split is solved
  const screens = useMemo(
    () => LAPS.map((l) => new THREE.MeshStandardMaterial({ color: '#eadfc9', roughness: 0.55, emissive: l.hue, emissiveIntensity: 0 })),
    [],
  )
  const led = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e9dfcf', roughness: 0.5, emissive: C.leafDark, emissiveIntensity: 0 }),
    [],
  )
  const cables = useMemo(() => {
    // each cable leaves its laptop, gathers at the table leg, then fans out on the soil like a root
    const spread = [[-0.75, 0.72], [-0.3, 0.95], [0.35, 0.95], [0.8, 0.68]]
    return LAPS.map((l, i) => {
      const ax = TABLE[0] + l.x, az = TABLE[2] + 0.28
      const [sx, sz] = spread[i]
      const pts = [
        new THREE.Vector3(ax, TOP + 0.01, az - 0.11),
        new THREE.Vector3(ax * 0.55 + TABLE[0] * 0.45, TOP - 0.07, az - 0.26),
        new THREE.Vector3(TABLE[0] + sx * 0.1, 0.3, TABLE[2] + 0.08),
        new THREE.Vector3(TABLE[0] + sx * 0.5, 0.028, TABLE[2] + 0.32),
        new THREE.Vector3(TABLE[0] + sx, 0.014, TABLE[2] + sz),
      ]
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 6)
    })
  }, [])
  const roots = useMemo(() => {
    const mk = (pts: [number, number, number][]) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 20, 0.02, 6)
    return [
      mk([[TREE[0], 0.05, TREE[2] + 0.05], [0.5, 0.02, -0.75], [0.1, 0.012, -0.55]]),
      mk([[TREE[0] + 0.08, 0.05, TREE[2] + 0.1], [1.3, 0.02, -0.7], [1.55, 0.012, -0.35]]),
    ]
  }, [])

  const tops = useMemo(
    () => LAPS.map((l, i) => new THREE.Vector3(TABLE[0] + l.x - Math.sin(LAP_YAW[i]) * 0.1, TOP + 0.26, TABLE[2] + 0.28 - 0.09)),
    [],
  )

  useFrame((st) => {
    const t = st.clock.elapsedTime
    screens.forEach((m, i) => {
      m.emissiveIntensity = unlocked ? 0.8 + Math.sin(t * 1.8 + i * 1.4) * 0.15 : 0
    })
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
      {/* the Ent tree */}
      <group position={TREE} rotation={[0, 0, 0.05]}>
        <mesh position={[0, 0.75, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.09, 0.16, 1.5, 9]} /></mesh>
        <mesh position={[0.16, 1.15, 0.05]} rotation={[0, 0, -0.7]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.035, 0.05, 0.45, 7]} /></mesh>
        <mesh position={[-0.14, 1.3, -0.04]} rotation={[0.3, 0, 0.75]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.03, 0.045, 0.4, 7]} /></mesh>
        <mesh position={[0, 2.05, 0]} material={clay(C.leafDark)} castShadow scale={[1, 0.82, 1]}><sphereGeometry args={[0.68, 18, 14]} /></mesh>
        <mesh position={[0.5, 1.75, 0.12]} material={clay(C.leaf)} castShadow scale={[1, 0.8, 1]}><sphereGeometry args={[0.45, 16, 12]} /></mesh>
        <mesh position={[-0.45, 1.8, -0.05]} material={clay(C.moss)} castShadow scale={[1, 0.78, 1]}><sphereGeometry args={[0.42, 16, 12]} /></mesh>
        <mesh position={[0.14, 2.5, 0.05]} material={clay(C.leaf)} castShadow scale={[1, 0.75, 1]}><sphereGeometry args={[0.4, 16, 12]} /></mesh>
        <mesh position={[-0.15, 2.42, -0.18]} material={clay(C.leafDark)} castShadow scale={[1, 0.75, 1]}><sphereGeometry args={[0.36, 14, 12]} /></mesh>
        {[[0.22, 0.02, 0.12, 0.5], [-0.2, 0.02, 0.1, -0.6], [0.02, 0.02, -0.2, 2.8]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y + 0.03, z]} rotation={[0, r, 0]} material={clay(C.wood)} castShadow scale={[1.6, 0.5, 0.7]}>
            <sphereGeometry args={[0.1, 10, 8]} />
          </mesh>
        ))}
      </group>

      {/* round wooden table */}
      <group position={TABLE}>
        <mesh position={[0, TOP - 0.035, 0]} material={clay(C.woodLight)} castShadow receiveShadow><cylinderGeometry args={[0.82, 0.82, 0.07, 28]} /></mesh>
        <mesh position={[0, TOP - 0.085, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.wood)}><torusGeometry args={[0.72, 0.025, 8, 28]} /></mesh>
        <mesh position={[0, 0.26, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.07, 0.1, 0.5, 10]} /></mesh>
        <mesh position={[0, 0.03, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.3, 0.34, 0.06, 20]} /></mesh>
      </group>

      {/* four laptops in a row, facing the traveller */}
      {LAPS.map((l, i) => (
        <Laptop key={i} p={[TABLE[0] + l.x, TOP, TABLE[2] + 0.28]} yaw={LAP_YAW[i]} scr={screens[i]} />
      ))}

      {/* little home router at the back of the table */}
      <group position={[TABLE[0], TOP, TABLE[2] - 0.42]} rotation={[0, 0.15, 0]}>
        <RoundedBox args={[0.17, 0.05, 0.12]} radius={0.015} position={[0, 0.025, 0]} material={clay(C.cream)} castShadow />
        <mesh position={[-0.05, 0.11, -0.04]} rotation={[0, 0, 0.35]} material={clay(C.ink)}><cylinderGeometry args={[0.006, 0.006, 0.13, 6]} /></mesh>
        <mesh position={[0.05, 0.11, -0.04]} rotation={[0, 0, -0.35]} material={clay(C.ink)}><cylinderGeometry args={[0.006, 0.006, 0.13, 6]} /></mesh>
        <mesh position={[0, 0.052, 0.055]} material={led}><sphereGeometry args={[0.011, 8, 8]} /></mesh>
      </group>

      {/* cables running off the table and into the soil like roots */}
      {cables.map((g, i) => <mesh key={'c' + i} geometry={g} material={clay(C.earthDark)} castShadow />)}
      {roots.map((g, i) => <mesh key={'r' + i} geometry={g} material={clay(C.wood)} castShadow />)}

      {/* two mugs and a folded note — the home-lab feel */}
      {[[-0.44, -0.34, '#c9875f'], [0.4, -0.38, '#7fa7b5']].map(([x, z, c], i) => (
        <group key={i} position={[TABLE[0] + (x as number), TOP, TABLE[2] + (z as number)]}>
          <mesh position={[0, 0.035, 0]} material={clay(c as string)} castShadow>
            <cylinderGeometry args={[0.042, 0.036, 0.07, 10]} />
          </mesh>
          <mesh position={[0.05, 0.038, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay(c as string)}>
            <torusGeometry args={[0.026, 0.008, 6, 12, Math.PI]} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.2, 0.025, 0.15]} radius={0.01} position={[TABLE[0] - 0.28, TOP + 0.012, TABLE[2] - 0.52]} rotation={[0, 0.45, 0]} material={clay(C.paper)} castShadow />

      {/* a floor cushion someone pulled up to the table */}
      <mesh position={[-1.32, 0.055, 0.42]} scale={[1, 0.32, 1]} material={clay('#b5654a')} castShadow receiveShadow>
        <sphereGeometry args={[0.3, 14, 10]} />
      </mesh>

      {/* the word that hops laptop to laptop */}
      <mesh ref={token} position={tops[0]} material={clay(C.paper)} visible={false} castShadow>
        <sphereGeometry args={[0.045, 12, 10]} />
      </mesh>

      <Scaffold open={unlocked} position={[TABLE[0], 0, TABLE[2] - 0.05]} size={[2.35, 1.45, 1.75]} />
    </group>
  )
}
