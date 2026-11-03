/**
 * L06 Remote — local art helpers on ART's shared toon material (src/v5/art/material).
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
  warm: '#f0c98a',
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

function paintTerminal(ctx: CanvasRenderingContext2D, live: boolean, t: number) {
  const w = ctx.canvas.width, h = ctx.canvas.height
  ctx.fillStyle = '#2f2a26'; ctx.fillRect(0, 0, w, h)
  ctx.font = '600 11px "SF Mono", ui-monospace, Menlo, monospace'
  ctx.textBaseline = 'top'
  const line = (y: number, s: string, c = '#d9c9a8') => { ctx.fillStyle = c; ctx.fillText(s, 10, y) }
  line(9, '$ remote --daemon', '#8fb36b')
  line(24, 'listening on :7777', '#9b8f80')
  line(39, 'link  phone ⇄ laptop', '#d9c9a8')
  if (live) {
    line(54, '> task: drone.fly()', '#e8d6b8')
    const dots = '.'.repeat(1 + Math.floor(t * 2) % 3)
    line(69, '  uplink' + dots, '#8fb36b')
  } else {
    line(54, '> idle', '#9b8f80')
  }
}

/** A laptop screen with a live terminal texture. Returns mesh; caller animates via `live`. */
export function useTerminalScreen(live: boolean) {
  const ref = useRef<THREE.Mesh>(null)
  const kit = useMemo(() => makeCanvasTexture(128, 84, (c) => paintTerminal(c, false, 0)), [])
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    if (Math.floor(t.current * 4) !== Math.floor((t.current - dt) * 4)) {
      kit.redraw((c) => paintTerminal(c, live, t.current))
    }
  })
  return { ref, tex: kit.tex }
}

/* ---------------------------------- props ---------------------------------- */

/** Laptop: base + angled screen. `screen` slot for a custom material/texture mesh. */
export function Laptop({ children, open = 0.32, s = 1, ...p }: P & { children?: React.ReactNode; open?: number; s?: number }) {
  return (
    <group {...p} scale={[s, s, s]}>
      <RoundedBox args={[0.62, 0.035, 0.44]} radius={0.012} position={[0, 0.018, 0]} material={clay(C.stoneLight)} castShadow />
      <RoundedBox args={[0.5, 0.012, 0.3]} radius={0.01} position={[0, 0.041, 0.02]} material={clay(C.stone)} />
      <group position={[0, 0.04, -0.2]} rotation={[-open, 0, 0]}>
        <RoundedBox args={[0.62, 0.42, 0.024]} radius={0.012} position={[0, 0.21, 0]} material={clay(C.stoneLight)} castShadow />
        <group position={[0, 0.21, 0.016]}>{children}</group>
      </group>
    </group>
  )
}

/** Small smartphone standing on a wooden easel stand. */
export function PhoneOnStand({ glow = false, ...p }: P & { glow?: boolean }) {
  return (
    <group {...p}>
      <mesh position={[0, 0.21, -0.07]} rotation={[0.36, 0, 0]} material={clay(C.wood)} castShadow>
        <boxGeometry args={[0.22, 0.42, 0.035]} />
      </mesh>
      <mesh position={[0, 0.06, 0.02]} rotation={[0.42, 0, 0]} material={clay(C.wood)} castShadow>
        <boxGeometry args={[0.26, 0.13, 0.06]} />
      </mesh>
      <RoundedBox args={[0.25, 0.44, 0.028]} radius={0.035} position={[0, 0.26, -0.04]} rotation={[0.36, 0, 0]} material={clay(C.ink)} castShadow />
      <mesh position={[0, 0.263, -0.024]} rotation={[0.36, 0, 0]}>
        <planeGeometry args={[0.21, 0.38]} />
        <meshBasicMaterial color={glow ? '#dff0d8' : '#e6ddc8'} />
      </mesh>
    </group>
  )
}

/** Work desk: plank top + legs + a low shelf. */
export function Desk({ w = 1.15, ...p }: P & { w?: number }) {
  return (
    <group {...p}>
      <RoundedBox args={[w, 0.055, 0.5]} radius={0.015} position={[0, 0.46, 0]} material={clay(C.woodLight)} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (w / 2 - 0.07), 0.22, 0.17]} material={clay(C.wood)} castShadow><boxGeometry args={[0.05, 0.44, 0.05]} /></mesh>
          <mesh position={[s * (w / 2 - 0.07), 0.22, -0.17]} material={clay(C.wood)} castShadow><boxGeometry args={[0.05, 0.44, 0.05]} /></mesh>
        </group>
      ))}
      <RoundedBox args={[w - 0.24, 0.03, 0.36]} radius={0.01} position={[0, 0.14, 0]} material={clay(C.wood)} castShadow />
    </group>
  )
}

/** Simple stool. */
export function Stool(p: P) {
  return (
    <group {...p}>
      <mesh position={[0, 0.26, 0]} material={clay(C.woodLight)} castShadow><cylinderGeometry args={[0.16, 0.15, 0.045, 10]} /></mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        return <mesh key={i} position={[Math.cos(a) * 0.09, 0.12, Math.sin(a) * 0.09]} rotation={[Math.cos(a) * 0.14, 0, -Math.sin(a) * 0.14]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.016, 0.02, 0.25, 6]} /></mesh>
      })}
    </group>
  )
}

/** Pergola: 4 posts + slatted top over the desk area. */
export function Pergola({ w = 1.7, d = 1.1, h = 1.35, ...p }: P & { w?: number; d?: number; h?: number }) {
  return (
    <group {...p}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * w / 2, h / 2, sz * d / 2]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.035, 0.045, h, 7]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, h + 0.02, s * d / 2]} material={clay(C.wood)} castShadow>
          <boxGeometry args={[w + 0.24, 0.05, 0.07]} />
        </mesh>
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (i / 6) * w, h + 0.055, 0]} material={clay(C.woodLight)} castShadow>
          <boxGeometry args={[0.05, 0.03, d + 0.3]} />
        </mesh>
      ))}
    </group>
  )
}

/** Wooden pier deck on posts, extending -x over the rim. */
export function Dock({ len = 1.5, w = 1.0, ...p }: P & { len?: number; w?: number }) {
  return (
    <group {...p}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-(i / 7) * len + len / 2, 0.02, (i % 2 ? 0.006 : -0.006)]} material={clay(i % 2 ? C.wood : C.woodLight)} castShadow receiveShadow>
          <boxGeometry args={[len / 8 - 0.025, 0.045, w]} />
        </mesh>
      ))}
      {[[-len / 2 + 0.08, -w / 2 + 0.08], [-len / 2 + 0.08, w / 2 - 0.08], [len / 2 - 0.3, -w / 2 + 0.08], [len / 2 - 0.3, w / 2 - 0.08]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.35, z]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 0.8, 7]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[-len / 2 + 0.06, 0.3, s * (w / 2 - 0.05)]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.03, 0.036, 0.56, 6]} /></mesh>
          <mesh position={[0.1, 0.3, s * (w / 2 - 0.05)]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.03, 0.036, 0.56, 6]} /></mesh>
          <mesh position={[-len / 4 + 0.08, 0.5, s * (w / 2 - 0.05)]} rotation={[0, 0, Math.PI / 2.15]} material={clay(C.woodLight)}>
            <cylinderGeometry args={[0.018, 0.018, len * 0.72, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Small floating rock with a flattened grassy top (the unreachable switch island). */
export function SwitchRock({ r = 1.15, seed = 3, ...p }: P & { r?: number; seed?: number }) {
  const geo = useMemo(() => {
    const prof: [number, number][] = [[0.001, 0.05], [0.75, 0.04], [0.98, -0.06], [1.0, -0.18], [0.86, -0.5], [0.68, -0.85], [0.45, -1.15], [0.2, -1.4], [0.001, -1.55]]
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
    const top = new THREE.Color(C.leaf), rock = new THREE.Color('#b19d82'), dark = new THREE.Color('#8c7055'), tmp = new THREE.Color()
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

/** The big friendly switch on a post: a lever you fly into. */
export const SwitchPost = ({ hitRef, ...p }: P & { hitRef?: React.Ref<THREE.Group> }) => (
  <group {...p}>
    <mesh position={[0, 0.32, 0]} material={clay(C.stone)} castShadow><cylinderGeometry args={[0.09, 0.12, 0.64, 8]} /></mesh>
    <mesh position={[0, 0.66, 0]} material={clay(C.stoneLight)} castShadow><cylinderGeometry args={[0.17, 0.19, 0.06, 10]} /></mesh>
    <group ref={hitRef} position={[0, 0.72, 0]}>
      {/* lever arm tips toward -z when struck */}
      <mesh position={[0, 0.14, 0]} material={clay(C.terracotta)} castShadow><cylinderGeometry args={[0.028, 0.036, 0.3, 7]} /></mesh>
      <mesh position={[0, 0.31, 0]} material={clay(C.brick)} castShadow><sphereGeometry args={[0.075, 12, 10]} /></mesh>
    </group>
  </group>
)

/** Little clay quadcopter drone. Exposes refs for tilt + rotor spin. */
export function Drone({ ...p }: P) {
  const rotors = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (rotors.current) rotors.current.children.forEach((r) => (r.rotation.y += dt * 28)) })
  const arm = (x: number, z: number) => (
    <group position={[x, 0.02, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={clay(C.ink2)}><cylinderGeometry args={[0.014, 0.014, 0.13, 6]} /></mesh>
    </group>
  )
  return (
    <group {...p}>
      <RoundedBox args={[0.2, 0.09, 0.26]} radius={0.03} material={clay(C.cream)} castShadow />
      <mesh position={[0, -0.01, 0.15]} material={clay(C.ink)}><sphereGeometry args={[0.032, 10, 8]} /></mesh>
      <group ref={rotors}>
        {[[-0.16, -0.14], [0.16, -0.14], [-0.16, 0.14], [0.16, 0.14]].map(([x, z], i) => (
          <group key={i} position={[x, 0.055, z]}>
            <mesh material={clay(C.ink2)}><boxGeometry args={[0.2, 0.008, 0.024]} /></mesh>
            <mesh material={clay(C.ink2)}><boxGeometry args={[0.024, 0.008, 0.2]} /></mesh>
          </group>
        ))}
      </group>
      {arm(-0.11, -0.1)}{arm(0.11, -0.1)}{arm(-0.11, 0.1)}{arm(0.11, 0.1)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, -0.07, 0]} material={clay(C.ink2)}><boxGeometry args={[0.014, 0.06, 0.18]} /></mesh>)}
    </group>
  )
}

/** Landing pad: stone disc with a soft painted ring. */
export function Pad(p: P) {
  return (
    <group {...p}>
      <mesh material={clay(C.stoneLight)} receiveShadow castShadow><cylinderGeometry args={[0.24, 0.26, 0.035, 18]} /></mesh>
      <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay(C.terracotta)}><ringGeometry args={[0.13, 0.17, 24]} /></mesh>
    </group>
  )
}

/** Invisible physics box. `kind` = 'block' | 'walk'; `on` toggles registration. */
export function BlockBox({ position, args = [1, 1, 1] as V3, kind = 'block', on = true }: { position: V3; args?: V3; kind?: 'block' | 'walk'; on?: boolean }) {
  const r = useRef<THREE.Mesh>(null)
  const reg = kind === 'block' ? core.useBlocker : core.useWalkable
  reg(r, on)
  return <mesh ref={r} position={position} visible={false}><boxGeometry args={args} /></mesh>
}
