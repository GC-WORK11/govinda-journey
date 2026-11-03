/**
 * L07 Wispr Wrap — local art helpers on ART's shared toon material (src/v5/art/material).
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { toon } from '../../v5/art/material'

export const C = {
  cream: '#f3e9da', paper: '#fbf6ee', sand: '#e8d6b8', terracotta: '#d9825b', brick: '#b5654a',
  leaf: '#8fb36b', leafDark: '#6f9a55', moss: '#a7bd80', earth: '#b48a63', earthDark: '#8a6748',
  stone: '#c9bfb0', stoneLight: '#ddd5c6', wood: '#a87a52', woodLight: '#c99c6e',
  water: '#8fc1c9', waterLight: '#b8dade', sky: '#cfe3e8', ink: '#3b3330', ink2: '#6b5f57',
  warm: '#f0c98a', violet: '#8a6fb0',
}

/** Shared stylized clay material (ART's toon: wrap diffuse + soft ramp + warm rim). */
export function clay(color: string) {
  return toon({ color })
}

type V3 = [number, number, number]
type P = { position?: V3; rotation?: V3; scale?: number | V3 }

/** Invisible physics box. */
export function BlockBox({ position, args = [1, 1, 1] as V3, kind = 'block', on = true }: { position: V3; args?: V3; kind?: 'block' | 'walk'; on?: boolean }) {
  const r = useRef<THREE.Mesh>(null)
  const reg = kind === 'block' ? core.useBlocker : core.useWalkable
  reg(r, on)
  return <mesh ref={r} position={position} visible={false}><boxGeometry args={args} /></mesh>
}

/** Canvas texture helper. */
export function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return { cv, ctx, tex, redraw(fn: (c: CanvasRenderingContext2D) => void) { fn(ctx); tex.needsUpdate = true } }
}

/* ------------------------------- the door ------------------------------- */

/** A low garden wall with an arched wooden double door in the middle.
 *  doorT ref drives the swing (0 closed → 1 open). `frame` is the arch. */
const GLOW_DARK = new THREE.Color('#4a3d2f')
const GLOW_WARM = new THREE.Color('#f0c98a')
const _lampC = new THREE.Color()

export function DoorWall({ w = 6.4, doorT, ...p }: P & { w?: number; doorT: React.MutableRefObject<number> }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const k = doorT.current
    if (left.current) left.current.rotation.y = -k * 1.9
    if (right.current) right.current.rotation.y = k * 1.9
    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial
      m.color.lerpColors(GLOW_DARK, GLOW_WARM, k)
    }
  })
  const seg = (w - 1.5) / 2
  return (
    <group {...p}>
      {/* wall segments either side of the doorway */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (1.5 / 2 + seg / 2), 0, 0]}>
          <RoundedBox args={[seg, 0.7, 0.34]} radius={0.06} position={[0, 0.35, 0]} material={clay(C.stone)} castShadow receiveShadow />
          <RoundedBox args={[seg, 0.14, 0.42]} radius={0.05} position={[0, 0.76, 0]} material={clay(C.stoneLight)} castShadow />
          {/* a little vine on the wall */}
          {Array.from({ length: Math.floor(seg * 2) }).map((_, i) => (
            <mesh key={i} position={[-seg / 2 + 0.3 + i * 0.55, 0.82 + Math.sin(i * 2.2) * 0.04, (i % 2 ? 0.14 : -0.12)]} material={clay(i % 3 ? C.leaf : C.leafDark)} castShadow>
              <sphereGeometry args={[0.09 + (i % 2) * 0.03, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* doorway posts + lintel */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.82, 0.95, 0]} material={clay(C.wood)} castShadow>
          <boxGeometry args={[0.16, 1.9, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, 1.86, 0]} material={clay(C.wood)} castShadow>
        <boxGeometry args={[1.8, 0.16, 0.4]} />
      </mesh>
      {/* arch stones over the door */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = Math.PI - (i / 6) * Math.PI
        return (
          <mesh key={i} position={[Math.cos(a) * 0.72, 1.86 + Math.sin(a) * 0.34, 0]} rotation={[0, 0, a + Math.PI / 2]} material={clay(C.stoneLight)} castShadow>
            <boxGeometry args={[0.2, 0.15, 0.42]} />
          </mesh>
        )
      })}
      {/* warm light inside the doorway — an opaque panel that warms as it opens */}
      <mesh ref={glow} position={[0, 0.95, -0.1]}>
        <planeGeometry args={[1.44, 1.9]} />
        <meshBasicMaterial color={GLOW_DARK} side={THREE.DoubleSide} />
      </mesh>
      {/* the double doors on hinges */}
      <group ref={left} position={[-0.72, 0, 0.02]}>
        <group position={[0.36, 0, 0]}>
          <DoorLeaf />
        </group>
      </group>
      <group ref={right} position={[0.72, 0, 0.02]}>
        <group position={[-0.36, 0, 0]}>
          <DoorLeaf mirror />
        </group>
      </group>
    </group>
  )
}

function DoorLeaf({ mirror = false }: { mirror?: boolean }) {
  return (
    <group scale={[mirror ? -1 : 1, 1, 1]}>
      <RoundedBox args={[0.7, 1.76, 0.07]} radius={0.025} position={[0, 0.92, 0]} material={clay(C.wood)} castShadow />
      {[0.42, 0.92, 1.42].map((y) => (
        <mesh key={y} position={[0, y, 0.045]} material={clay(C.woodLight)}>
          <boxGeometry args={[0.62, 0.07, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0.26, 0.9, 0.05]} material={clay(C.ink2)}>
        <sphereGeometry args={[0.035, 10, 8]} />
      </mesh>
    </group>
  )
}

/* ------------------------------- the robot ------------------------------- */

/** Small wheeled clay robot holding a phone up in one mittened hand.
 *  `phoneRef` marks the phone for the letter-flight origin. */
export function Robot({ phoneRef, children, ...p }: P & { phoneRef?: React.Ref<THREE.Group>; children?: React.ReactNode }) {
  const body = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (body.current) body.current.rotation.z = Math.sin(state.clock.elapsedTime * 2.2) * 0.05
  })
  return (
    <group {...p}>
      {/* wheel */}
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.ink2)} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
      </mesh>
      <group ref={body}>
        {/* body */}
        <RoundedBox args={[0.3, 0.34, 0.24]} radius={0.09} position={[0, 0.32, 0]} material={clay(C.stoneLight)} castShadow />
        {/* head */}
        <RoundedBox args={[0.24, 0.2, 0.2]} radius={0.07} position={[0, 0.58, 0]} material={clay(C.cream)} castShadow />
        {/* eyes */}
        <mesh position={[-0.05, 0.6, 0.1]} material={clay(C.ink)}><sphereGeometry args={[0.022, 8, 6]} /></mesh>
        <mesh position={[0.05, 0.6, 0.1]} material={clay(C.ink)}><sphereGeometry args={[0.022, 8, 6]} /></mesh>
        {/* antenna */}
        <mesh position={[0, 0.73, 0]} material={clay(C.ink2)}><cylinderGeometry args={[0.008, 0.01, 0.1, 5]} /></mesh>
        <mesh position={[0, 0.79, 0]} material={clay(C.terracotta)}><sphereGeometry args={[0.024, 8, 6]} /></mesh>
        {/* left arm down */}
        <mesh position={[-0.19, 0.36, 0]} rotation={[0, 0, 0.3]} material={clay(C.stone)} castShadow>
          <capsuleGeometry args={[0.03, 0.12, 4, 8]} />
        </mesh>
        {/* right arm up, holding the phone */}
        <mesh position={[0.19, 0.44, 0]} rotation={[0, 0, -0.9]} material={clay(C.stone)} castShadow>
          <capsuleGeometry args={[0.03, 0.14, 4, 8]} />
        </mesh>
        <group ref={phoneRef} position={[0.3, 0.56, 0.02]} rotation={[0, 0, -0.12]}>
          <RoundedBox args={[0.1, 0.17, 0.018]} radius={0.02} material={clay(C.ink)} castShadow />
          <mesh position={[0, 0, 0.011]}>
            <planeGeometry args={[0.08, 0.14]} />
            <meshBasicMaterial color="#dff0d8" />
          </mesh>
          {children}
        </group>
      </group>
    </group>
  )
}

/* ------------------------------- the console ------------------------------- */

/** A little wooden console pedestal with a brass-ish button that calls the robot. */
export function Console({ on, ...p }: P & { on?: boolean }) {
  const lamp = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!lamp.current) return
    const m = lamp.current.material as THREE.MeshBasicMaterial
    m.color.lerp(_lampC.set(on ? C.warm : '#a89a80'), 0.08)
    lamp.current.scale.setScalar(on ? 1.15 + Math.sin(state.clock.elapsedTime * 3) * 0.12 : 1)
  })
  return (
    <group {...p}>
      <mesh position={[0, 0.3, 0]} material={clay(C.wood)} castShadow><boxGeometry args={[0.34, 0.6, 0.28]} /></mesh>
      <RoundedBox args={[0.4, 0.07, 0.34]} radius={0.02} position={[0, 0.63, 0]} material={clay(C.woodLight)} castShadow />
      <mesh position={[0, 0.69, 0]} material={clay(C.terracotta)} castShadow><cylinderGeometry args={[0.07, 0.09, 0.05, 10]} /></mesh>
      <mesh ref={lamp} position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color="#a89a80" />
      </mesh>
      {/* signal dashes etched on the front */}
      {[0.1, 0.16, 0.22].map((r, i) => (
        <mesh key={i} position={[0, 0.34, 0.141]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.008, 5, 12, Math.PI]} />
          <meshStandardMaterial color={C.ink2} />
        </mesh>
      ))}
    </group>
  )
}

/* --------------------------- letters that fly --------------------------- */

/** A sprite letter drawn on a small canvas — ink on paper, no emoji. */
export function letterTexture(ch: string) {
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 64
  const ctx = cv.getContext('2d')!
  ctx.font = '600 44px Fraunces, Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#3b3330'
  ctx.fillText(ch, 24, 34)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ------------------------------- small table ------------------------------- */

/** A small two-legged side table for the door's laptop. */
export function SideTable(p: P) {
  return (
    <group {...p}>
      <RoundedBox args={[0.56, 0.045, 0.4]} radius={0.015} position={[0, 0.42, 0]} material={clay(C.woodLight)} castShadow receiveShadow />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.22, 0.2, sz * 0.14]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.022, 0.026, 0.4, 6]} />
        </mesh>
      ))}
    </group>
  )
}

/** Laptop (smaller cousin of the L06 one, kept local so each island is self-contained). */
export function Laptop({ children, open = 0.36, s = 1, ...p }: P & { children?: React.ReactNode; open?: number; s?: number }) {
  return (
    <group {...p} scale={[s, s, s]}>
      <RoundedBox args={[0.62, 0.035, 0.44]} radius={0.012} position={[0, 0.018, 0]} material={clay(C.stoneLight)} castShadow />
      <group position={[0, 0.04, -0.2]} rotation={[-open, 0, 0]}>
        <RoundedBox args={[0.62, 0.42, 0.024]} radius={0.012} position={[0, 0.21, 0]} material={clay(C.stoneLight)} castShadow />
        <group position={[0, 0.21, 0.016]}>{children}</group>
      </group>
    </group>
  )
}

/* ------------------------- V4's floating word chips ------------------------- */

/** Whole chip face baked into one opaque canvas: cream tile + ink word (V4's look). */
function chipTexture(word: string) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 72
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#f6ecd9'; ctx.fillRect(0, 0, 128, 72)
  ctx.fillStyle = '#3b3330'; ctx.font = '600 32px Fraunces, Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(word, 64, 38)
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** A drifting row of soft speech pebbles — the same chips V4 floats on this island. */
export function WordChips({ words, pos, ...p }: P & { words: string[]; pos: [number, number, number][] }) {
  const g = useRef<THREE.Group>(null)
  const texs = useMemo(() => words.map(chipTexture), [words])
  useFrame((s) => {
    if (!g.current) return
    const t = s.clock.elapsedTime
    g.current.children.forEach((c, i) => {
      c.position.y = pos[i][1] + Math.sin(t * 1.6 + i * 1.9) * 0.06
      c.rotation.y = 0.55 + Math.sin(t * 0.9 + i) * 0.06
    })
  })
  return (
    <group ref={g} {...p}>
      {words.map((w, i) => (
        <group key={i} position={pos[i]} rotation={[-0.24, 0.55, 0]}>
          <RoundedBox args={[0.62, 0.36, 0.13]} radius={0.1} smoothness={3} material={clay('#f6ecd9')} castShadow />
          <mesh position={[-0.15, -0.2, 0]} rotation={[0, 0, Math.PI]} material={clay('#f6ecd9')}>
            <coneGeometry args={[0.07, 0.12, 4]} />
          </mesh>
          <mesh position={[0, 0.01, 0.066]}>
            <planeGeometry args={[0.56, 0.31]} />
            <meshBasicMaterial map={texs[i]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
