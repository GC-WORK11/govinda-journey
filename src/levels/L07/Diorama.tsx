/**
 * L07 Wispr Wrap — the recording studio, built in V4 island units (V5 mounts it scaled by K).
 * A small clay studio hut whose door swings open once the island is done, a side table with
 * a laptop whose screen shows the words that landed, a mic on a stand with a soft halo, and
 * sound-wave ribbons. Positions come from layout.ts; the Obstacle drives the mic and chips.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { DioramaProps } from '../types'
import { C, clay, BlockBox, makeCanvasTexture } from './kit.v5'
import { HUT, HUT_SIZE, DOOR_X, TABLE, SCREEN, MIC_BASE, MIC_HEAD } from './layout'
import { studio } from './studio'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const RIBBON = [C.moss, C.water, C.cream]

/** A soft wave band: a thin tube, squashed flat by the mesh scale so it reads as a ribbon. */
function band(pts: THREE.Vector3[]) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.02, 6, false)
}
/** Concentric arc around the mic head, bowing toward the path (-x). */
function arc(r: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI - 0.95 + (i / 20) * 1.9
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0))
  }
  return band(pts)
}
/** Sine wave hovering over the studio roof. */
function wave(amp: number, cycles: number, phase: number, y: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    pts.push(new THREE.Vector3(HUT[0] - 0.95 + u * 1.9, y + Math.sin(u * Math.PI * 2 * cycles + phase) * amp, HUT[2]))
  }
  return band(pts)
}

/** Laptop screen: a warm dark frame with the landed words on a paper page. */
function paint(c: CanvasRenderingContext2D, words: string[]) {
  const w = c.canvas.width, h = c.canvas.height
  c.fillStyle = '#2f2a26'; c.fillRect(0, 0, w, h)
  c.fillStyle = C.paper; c.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.8)
  c.textAlign = 'left'; c.textBaseline = 'middle'
  if (!words.length) {
    c.fillStyle = '#9b8f80'; c.font = '400 15px Inter, sans-serif'
    c.fillText('waiting…', w * 0.16, h * 0.5)
    return
  }
  c.fillStyle = C.ink; c.font = '600 26px Fraunces, Georgia, serif'
  c.fillText(words.slice(0, 2).join(' '), w * 0.16, h * 0.38)
  if (words.length > 2) c.fillText(words.slice(2).join(' '), w * 0.16, h * 0.62)
}

const FOAM: [number, number][] = [[0.22, -0.5], [0.4, -0.5], [0.22, 0.5], [0.4, 0.5]]
const TABLE_LEGS: [number, number][] = [[-0.19, -0.28], [0.19, -0.28], [-0.19, 0.28], [0.19, 0.28]]

export default function Diorama({ unlocked }: DioramaProps) {
  const door = useRef<THREE.Group>(null)
  const lamp = useRef<THREE.MeshBasicMaterial>(null)
  const halo = useRef<THREE.MeshBasicMaterial>(null)
  const arcs = useRef<THREE.Group>(null)
  const waves = useRef<THREE.Group>(null)
  const swing = useRef(unlocked ? 1 : 0)
  const seen = useRef(-1)
  const col = useMemo(() => new THREE.Color(), [])
  const screen = useMemo(() => makeCanvasTexture(256, 160, (c) => paint(c, studio.landed)), [])
  const geo = useMemo(() => ({
    arcs: [0.2, 0.32, 0.44].map(arc),
    waves: [wave(0.09, 1.5, 0, 1.08), wave(0.07, 1.1, 1.7, 0.98)],
  }), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    swing.current += ((unlocked ? 1 : 0) - swing.current) * Math.min(1, dt * 2)
    if (door.current) door.current.rotation.y = swing.current * 1.25
    if (lamp.current) lamp.current.color.lerp(col.set(unlocked ? C.warm : '#8a7f6d'), Math.min(1, dt * 2.4))
    if (halo.current) halo.current.color.lerp(col.set(studio.listening ? C.warm : C.stoneLight), Math.min(1, dt * 6))
    if (arcs.current) arcs.current.scale.setScalar(studio.listening && !RM ? 1 + Math.sin(t * 6) * 0.06 : 1)
    if (waves.current) waves.current.position.y = RM ? 0 : Math.sin(t * 0.9) * 0.02
    if (studio.v !== seen.current) { seen.current = studio.v; screen.redraw((c) => paint(c, studio.landed)) }
  })

  return (
    <group>
      {/* studio hut: wall, pyramid roof, round window, door that swings open, foam on the front */}
      <RoundedBox args={HUT_SIZE} radius={0.07} smoothness={3} position={[HUT[0], HUT_SIZE[1] / 2, HUT[2]]} material={clay(C.sand)} castShadow receiveShadow />
      <mesh position={[HUT[0], HUT_SIZE[1] + 0.19, HUT[2]]} rotation={[0, Math.PI / 4, 0]} material={clay(C.terracotta)} castShadow>
        <coneGeometry args={[0.95, 0.38, 4]} />
      </mesh>
      <mesh position={[HUT[0], 0.36, HUT[2] + HUT_SIZE[2] / 2 + 0.005]}>
        <circleGeometry args={[0.12, 20]} />
        <meshBasicMaterial color={C.warm} />
      </mesh>
      <mesh position={[HUT[0], 0.36, HUT[2] + HUT_SIZE[2] / 2 + 0.01]} material={clay(C.wood)}>
        <torusGeometry args={[0.12, 0.02, 6, 20]} />
      </mesh>
      <group ref={door} position={[DOOR_X + 0.01, 0, HUT[2] - 0.2]}>
        <RoundedBox args={[0.05, 0.5, 0.36]} radius={0.02} position={[0, 0.25, 0.19]} material={clay(C.wood)} castShadow />
      </group>
      <mesh position={[DOOR_X + 0.03, 0.57, HUT[2]]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial ref={lamp} color="#8a7f6d" />
      </mesh>
      {FOAM.map(([y, dz], i) => (
        <mesh key={i} position={[DOOR_X + 0.02, y, HUT[2] + dz]} rotation={[0, 0, -Math.PI / 2]} material={clay(C.paper)}>
          <coneGeometry args={[0.05, 0.1, 6]} />
        </mesh>
      ))}

      {/* side table with the laptop; the screen faces the path */}
      <RoundedBox args={[0.46, 0.04, 0.66]} radius={0.015} position={[TABLE[0], 0.36, TABLE[2]]} material={clay(C.woodLight)} castShadow receiveShadow />
      {TABLE_LEGS.map(([dx, dz], i) => (
        <mesh key={i} position={[TABLE[0] + dx, 0.18, TABLE[2] + dz]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.022, 0.026, 0.36, 6]} />
        </mesh>
      ))}
      <RoundedBox args={[0.3, 0.02, 0.5]} radius={0.008} position={[TABLE[0], 0.39, TABLE[2]]} material={clay(C.stoneLight)} castShadow />
      <group position={SCREEN} rotation={[0, Math.PI / 2, 0]}>
        <RoundedBox args={[0.5, 0.3, 0.022]} radius={0.01} position={[0, 0, -0.012]} material={clay(C.stoneLight)} castShadow />
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[0.44, 0.27]} />
          <meshBasicMaterial map={screen.tex} toneMapped={false} />
        </mesh>
      </group>

      {/* mic on a wooden stand, pop filter, and a halo that lights while the sheet is open */}
      <mesh position={[MIC_BASE.x, 0.02, MIC_BASE.z]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 16]} />
      </mesh>
      <mesh position={[MIC_BASE.x, 0.42, MIC_BASE.z]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.024, 0.028, 0.8, 8]} />
      </mesh>
      <mesh position={MIC_HEAD} scale={[1, 1.5, 1]} material={clay(C.ink2)} castShadow>
        <sphereGeometry args={[0.07, 14, 10]} />
      </mesh>
      <mesh position={[MIC_HEAD.x - 0.072, MIC_HEAD.y, MIC_HEAD.z]} rotation={[0, -Math.PI / 2, 0]} material={clay(C.paper)}>
        <circleGeometry args={[0.055, 16]} />
      </mesh>
      <mesh position={[MIC_HEAD.x - 0.13, MIC_HEAD.y, MIC_HEAD.z]} rotation={[0, -Math.PI / 2, 0]} material={clay(C.cream)}>
        <torusGeometry args={[0.095, 0.012, 6, 18]} />
      </mesh>
      <mesh position={[MIC_HEAD.x - 0.2, MIC_HEAD.y, MIC_HEAD.z]} rotation={[0, -Math.PI / 2, 0]}>
        <torusGeometry args={[0.14, 0.008, 6, 28]} />
        <meshBasicMaterial ref={halo} color={C.stoneLight} />
      </mesh>

      {/* sound-wave ribbons: arcs rippling out from the mic, waves over the studio roof */}
      <group ref={arcs} position={MIC_HEAD}>
        {geo.arcs.map((g, i) => (
          <mesh key={i} geometry={g} material={clay(RIBBON[i])} scale={[1, 1, 0.4]} />
        ))}
      </group>
      <group ref={waves}>
        {geo.waves.map((g, i) => (
          <mesh key={i} geometry={g} material={clay(i ? C.moss : C.water)} scale={[1, 1, 0.4]} />
        ))}
      </group>

      {/* soft planting on the far side of the studio */}
      <mesh position={[-2.45, 0.2, 0.55]} material={clay(C.leaf)} castShadow>
        <sphereGeometry args={[0.26, 12, 9]} />
      </mesh>
      <mesh position={[-2.15, 0.13, 0.95]} material={clay(C.leafDark)} castShadow>
        <sphereGeometry args={[0.18, 10, 8]} />
      </mesh>
      <mesh position={[-2.6, 0.08, -0.5]} material={clay(C.stone)} castShadow>
        <dodecahedronGeometry args={[0.12, 0]} />
      </mesh>

      {/* physics: the hut, the table and the mic stand stay off the path */}
      <BlockBox position={[HUT[0], HUT_SIZE[1] / 2, HUT[2]]} args={HUT_SIZE} />
      <BlockBox position={[TABLE[0], 0.2, TABLE[2]]} args={[0.46, 0.4, 0.66]} />
      <BlockBox position={[MIC_BASE.x, 0.45, MIC_BASE.z]} args={[0.2, 0.9, 0.2]} />
    </group>
  )
}
