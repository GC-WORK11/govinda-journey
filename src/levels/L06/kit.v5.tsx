/**
 * L06 Remote — local art helpers on ART's shared toon material (src/v5/art/material).
 * V6: voxel modern city + a clay helicopter the player boards and flies.
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

/** Building facade: warm cladding + a soft window grid (opaque, matte). */
function facadeTexture(base: string, win: string, floors: number, cols: number, seed: number) {
  const kit = makeCanvasTexture(64, 128, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 64, 128)
    // faint floor bands
    ctx.fillStyle = 'rgba(0,0,0,0.05)'
    for (let f = 1; f < floors; f++) ctx.fillRect(0, Math.round((f / floors) * 128), 64, 2)
    // parapet
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, 64, 6)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 6, 64, 2)
    const fh = 128 / floors, cw = 64 / (cols + 1)
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const r = _rnd(seed * 31 + f * 7 + c * 13)
        ctx.fillStyle = r < 0.18 ? '#a8b5b4' : win // a few lit-warm panes
        const w = cw * 0.52, h = fh * 0.42
        ctx.fillRect(Math.round((c + 0.7) * cw - w / 2), Math.round(f * fh + fh * 0.3), Math.max(2, w), Math.max(2, h))
      }
    }
  })
  kit.tex.wrapS = kit.tex.wrapT = THREE.RepeatWrapping
  return kit.tex
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

/** Smartphone standing on a wooden easel stand. */
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

/** Work desk: plank top + legs. */
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

/** Voxel tower: chamfered box + baked facade; roof slab + parapet. */
export function VoxelTower({ w = 1, d = 1, h = 2.4, tone = C.facade1, win = C.glass, seed = 1, ...p }: P & { w?: number; d?: number; h?: number; tone?: string; win?: string; seed?: number }) {
  const tex = useMemo(() => facadeTexture(tone, win, Math.max(2, Math.round(h / 0.55)), Math.max(2, Math.round(w / 0.34)), seed), [w, h, tone, win, seed])
  const mat = useMemo(() => { const m = toon({ color: '#fff' }); m.map = tex; return m }, [tex])
  return (
    <group {...p}>
      <RoundedBox args={[w, h, d]} radius={0.03} smoothness={2} position={[0, h / 2, 0]} material={mat} castShadow receiveShadow />
      <mesh position={[0, h + 0.02, 0]} material={clay(C.roof)} castShadow>
        <boxGeometry args={[w * 0.94, 0.05, d * 0.94]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (w / 2 - 0.02), h + 0.06, 0]} material={clay(C.roofDark)}>
            <boxGeometry args={[0.04, 0.09, d * 0.9]} />
          </mesh>
          <mesh position={[0, h + 0.06, s * (d / 2 - 0.02)]} material={clay(C.roofDark)}>
            <boxGeometry args={[w * 0.9, 0.09, 0.04]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Rooftop AC unit. */
export function AcBox({ s = 1, ...p }: P & { s?: number }) {
  return (
    <group {...p} scale={[s, s, s]}>
      <RoundedBox args={[0.3, 0.18, 0.24]} radius={0.02} material={clay(C.stone)} castShadow />
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay(C.roofDark)}>
        <circleGeometry args={[0.07, 12]} />
      </mesh>
    </group>
  )
}

/** Rooftop antenna with a tiny warm beacon. */
export function Antenna({ h = 0.8, ...p }: P & { h?: number }) {
  return (
    <group {...p}>
      <mesh position={[0, h / 2, 0]} material={clay(C.ink2)}><cylinderGeometry args={[0.012, 0.02, h, 6]} /></mesh>
      <mesh position={[0, h * 0.72, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.ink2)}><cylinderGeometry args={[0.008, 0.008, 0.24, 5]} /></mesh>
      <mesh position={[0, h + 0.03, 0]} material={clay(C.warm)}><sphereGeometry args={[0.035, 10, 8]} /></mesh>
    </group>
  )
}

/** The clay helicopter — stub visual until PLAYER's src/v5/player/Heli.tsx lands.
 * Exposes rotor refs so the obstacle can spin up/down. Faces -z. */
export function Heli({ rotorRef, ...p }: P & { rotorRef?: React.Ref<THREE.Group> }) {
  const tailRotor = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (tailRotor.current) tailRotor.current.rotation.z += dt * 30 })
  return (
    <group {...p}>
      {/* body */}
      <group position={[0, 0.34, 0]}>
        <RoundedBox args={[0.5, 0.34, 0.9]} radius={0.1} material={clay(C.terracotta)} castShadow />
        {/* canopy */}
        <mesh position={[0, 0.1, -0.28]} material={clay(C.glass)} castShadow>
          <sphereGeometry args={[0.21, 14, 10]} />
        </mesh>
        {/* belly */}
        <mesh position={[0, -0.14, 0.05]} material={clay(C.brick)}>
          <boxGeometry args={[0.34, 0.1, 0.6]} />
        </mesh>
      </group>
      {/* tail boom + fin + tail rotor */}
      <group position={[0, 0.38, 0.62]}>
        <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.terracotta)} castShadow>
          <cylinderGeometry args={[0.045, 0.07, 0.62, 8]} />
        </mesh>
        <mesh position={[0, 0.13, 0.56]} material={clay(C.brick)} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.12]} />
        </mesh>
        <group ref={tailRotor} position={[0.05, 0.1, 0.56]}>
          <mesh material={clay(C.ink2)}><boxGeometry args={[0.012, 0.24, 0.03]} /></mesh>
          <mesh material={clay(C.ink2)}><boxGeometry args={[0.012, 0.03, 0.24]} /></mesh>
        </group>
      </group>
      {/* mast + main rotor */}
      <mesh position={[0, 0.56, 0]} material={clay(C.ink2)}><cylinderGeometry args={[0.03, 0.04, 0.12, 8]} /></mesh>
      <group ref={rotorRef} position={[0, 0.64, 0]}>
        <mesh material={clay(C.ink2)} castShadow><boxGeometry args={[1.7, 0.018, 0.09]} /></mesh>
        <mesh material={clay(C.ink2)} castShadow><boxGeometry args={[0.09, 0.018, 1.7]} /></mesh>
        <mesh position={[0, 0.015, 0]} material={clay(C.brick)}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
      </group>
      {/* skids */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, 0.1, -0.02]}>
          <mesh material={clay(C.ink2)} castShadow><boxGeometry args={[0.035, 0.035, 0.85]} /></mesh>
          {[-0.25, 0.28].map((z) => (
            <mesh key={z} position={[0, 0.09, z]} rotation={[z < 0 ? -0.25 : 0.25, 0, 0]} material={clay(C.ink2)}>
              <boxGeometry args={[0.03, 0.18, 0.03]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** A route ring the helicopter flies through. Soft opaque clay, gentle bob. */
export function RouteRing({ r = 0.85, live = true, ...p }: P & { r?: number; live?: boolean }) {
  return (
    <group {...p}>
      <mesh material={clay(live ? C.warm : C.stoneLight)} castShadow>
        <torusGeometry args={[r, 0.055, 10, 30]} />
      </mesh>
      {/* tiny pennants on top */}
      {[-0.5, 0.5].map((s, i) => (
        <mesh key={i} position={[s * r, r * 0.95, 0]} rotation={[0, 0, s * 0.2]} material={clay(i ? C.leaf : C.terracotta)}>
          <coneGeometry args={[0.05, 0.14, 4]} />
        </mesh>
      ))}
    </group>
  )
}

/** Helipad: paved disc + painted circle + corner stones. `lit` warms the ring. */
export function HeliPad({ r = 0.95, lit = false, ...p }: P & { r?: number; lit?: boolean }) {
  return (
    <group {...p}>
      <mesh material={clay(C.curb)} receiveShadow><cylinderGeometry args={[r, r + 0.06, 0.045, 26]} /></mesh>
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay(lit ? C.warm : C.terracotta)}>
        <ringGeometry args={[r * 0.62, r * 0.74, 32]} />
      </mesh>
      <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay(C.stoneLight)}>
        <circleGeometry args={[r * 0.5, 24]} />
      </mesh>
      {[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z], i) => (
        <mesh key={i} position={[x * r * 0.98, 0.045, z * r * 0.98]} material={clay(C.stone)}>
          <boxGeometry args={[0.08, 0.05, 0.08]} />
        </mesh>
      ))}
    </group>
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
