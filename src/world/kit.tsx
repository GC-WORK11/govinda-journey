import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/** Shared palette. Matte clay, warm daylight. Use these, not random hex codes. */
export const C = {
  cream: '#f3e9da', paper: '#fbf6ee', sand: '#e8d6b8', terracotta: '#d9825b', brick: '#b5654a',
  leaf: '#8fb36b', leafDark: '#6f9a55', moss: '#a7bd80', earth: '#b48a63', earthDark: '#8a6748',
  stone: '#c9bfb0', wood: '#a87a52', woodLight: '#c99c6e', water: '#8fc1c9', sky: '#cfe3e8', ink: '#3b3330',
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
/** One cached matte "clay" material per colour. */
export function clay(color: string) {
  let m = matCache.get(color)
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }); matCache.set(color, m) }
  return m
}

type P = { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number] }

/** Floating island: soft grass top on a rocky earth underside. Top surface sits at y = 0. */
export function Island({ radius = 3.2, ground = C.leaf, seed = 1, ...p }: P & { radius?: number; ground?: string; seed?: number }) {
  const top = useMemo(() => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, -0.35), new THREE.Vector2(radius, -0.35)]
    const b = 0.26
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(radius - b + Math.cos(a) * b, -0.35 + (0.35 - b) + Math.sin(a) * b)) }
    pts.push(new THREE.Vector2(0, 0))
    return new THREE.LatheGeometry(pts, 48)
  }, [radius])
  const under = useMemo(() => {
    const g = new THREE.ConeGeometry(radius * 0.98, radius * 1.15, 14, 4)
    g.rotateX(Math.PI); g.translate(0, -0.35 - radius * 0.575, 0)
    const pos = g.attributes.position as THREE.BufferAttribute
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); if (y > -0.4) continue
      const k = 1 + (rnd(i) - 0.5) * 0.28
      pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); pos.setY(i, y + (rnd(i + 99) - 0.5) * 0.25)
    }
    g.computeVertexNormals(); return g
  }, [radius, seed])
  return (
    <group {...p}>
      <mesh geometry={top} material={clay(ground)} receiveShadow castShadow />
      <mesh geometry={under} material={clay(C.earth)} castShadow />
      <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay(C.earthDark)}>
        <circleGeometry args={[radius - 0.02, 48]} />
      </mesh>
    </group>
  )
}

export function Tree({ h = 1, color = C.leafDark, ...p }: P & { h?: number; color?: string }) {
  return (
    <group {...p}>
      <mesh position={[0, 0.25 * h, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.06 * h, 0.08 * h, 0.5 * h, 8]} /></mesh>
      <mesh position={[0, 0.72 * h, 0]} material={clay(color)} castShadow><sphereGeometry args={[0.38 * h, 16, 12]} /></mesh>
      <mesh position={[0.18 * h, 0.58 * h, 0.1 * h]} material={clay(color)} castShadow><sphereGeometry args={[0.24 * h, 14, 10]} /></mesh>
    </group>
  )
}

export function Rock({ s = 0.3, color = C.stone, ...p }: P & { s?: number; color?: string }) {
  return <mesh {...p} material={clay(color)} castShadow scale={[s, s * 0.7, s]}><dodecahedronGeometry args={[1, 1]} /></mesh>
}

/** A simple clay house. Good default building; levels should make their own. */
export function ClayHouse({ wall = C.cream, roof = C.terracotta, ...p }: P & { wall?: string; roof?: string }) {
  return (
    <group {...p}>
      <RoundedBox args={[1.3, 1, 1.1]} radius={0.08} smoothness={3} position={[0, 0.5, 0]} material={clay(wall)} castShadow receiveShadow />
      <mesh position={[0, 1.28, 0]} rotation={[0, Math.PI / 4, 0]} material={clay(roof)} castShadow><coneGeometry args={[1.05, 0.62, 4]} /></mesh>
      <RoundedBox args={[0.3, 0.5, 0.06]} radius={0.04} position={[0, 0.27, 0.56]} material={clay(C.wood)} />
      <RoundedBox args={[0.26, 0.26, 0.05]} radius={0.04} position={[0.4, 0.62, 0.56]} material={clay(C.water)} />
    </group>
  )
}

/**
 * Scaffolding wrapped in cloth. When `open` turns true the cloth drops and the poles fold away.
 * Wrap a level's building: put it at the same position and give it a size a bit larger than the building.
 */
export function Scaffold({ open, size = [1.6, 1.8, 1.6], ...p }: P & { open: boolean; size?: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  const cloth = useRef<THREE.Group>(null)
  const t = useRef(open ? 1 : 0)
  useFrame((_, dt) => {
    const target = open ? 1 : 0
    t.current += (target - t.current) * Math.min(1, dt * 2.2)
    const k = t.current
    if (cloth.current) { cloth.current.scale.y = Math.max(0.001, 1 - k); cloth.current.position.y = 0 }
    if (g.current) { g.current.visible = k < 0.995; g.current.children.forEach((c, i) => { if (c !== cloth.current) { c.position.y = -k * size[1] * 1.1; c.rotation.z = (i % 2 ? 1 : -1) * k * 0.6 } }) }
  })
  const [w, h, d] = size
  const poles: [number, number][] = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]
  return (
    <group {...p} ref={g}>
      {poles.map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]} material={clay(C.woodLight)} castShadow><cylinderGeometry args={[0.035, 0.035, h, 6]} /></mesh>
      ))}
      {[0.35, 0.7].map((f, i) => (
        <group key={'r' + i}>
          <mesh position={[0, h * f, -d / 2]} rotation={[0, 0, Math.PI / 2]} material={clay(C.woodLight)}><cylinderGeometry args={[0.025, 0.025, w, 6]} /></mesh>
          <mesh position={[0, h * f, d / 2]} rotation={[0, 0, Math.PI / 2]} material={clay(C.woodLight)}><cylinderGeometry args={[0.025, 0.025, w, 6]} /></mesh>
        </group>
      ))}
      <group ref={cloth}>
        <RoundedBox args={[w * 0.96, h * 0.92, d * 0.96]} radius={0.12} smoothness={3} position={[0, h * 0.46, 0]} material={clay(C.sand)} castShadow />
      </group>
    </group>
  )
}

/** Wooden plank bridge between two points on island edges (y = 0). */
export function Bridge({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const planks = useMemo(() => {
    const out: { p: THREE.Vector3; r: number }[] = []
    const dir = to.clone().sub(from); const len = dir.length(); const n = Math.max(3, Math.floor(len / 0.34))
    const ang = Math.atan2(dir.x, dir.z)
    for (let i = 0; i <= n; i++) {
      const t = i / n; const p = from.clone().lerp(to, t); p.y = -0.05 - Math.sin(t * Math.PI) * 0.35
      out.push({ p, r: ang })
    }
    return out
  }, [from, to])
  return (
    <group>
      {planks.map((k, i) => (
        <RoundedBox key={i} args={[0.9, 0.07, 0.24]} radius={0.03} position={k.p} rotation={[0, k.r, (i % 3 - 1) * 0.03]} material={clay(i % 2 ? C.wood : C.woodLight)} castShadow receiveShadow />
      ))}
    </group>
  )
}
