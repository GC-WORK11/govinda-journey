import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Tappable, Pop, burst, blip, chime, glowMat, pulse, REDUCED, useLocalToWorld } from '../../world/play'
import { LAMP_POS, GATE, HEAD_Y, Lantern, haloTexture } from './lanterns'

/* 'The first step': four dark clay lanterns line the front path. Tap each one to
   light it — a warm spark travels from the last lamp (or the gate) to the new one
   and leaves a glowing line on the grass. All four lit wakes the campus. */

type Link = { fx: number; fy: number; fz: number; tx: number; ty: number; tz: number; id: number }

export default function Play({ onWin, won }: PlayProps) {
  const [root, toWorld] = useLocalToWorld()
  const [lit, setLit] = useState<number[]>([])
  const litRef = useRef<Set<number>>(new Set())
  const [links, setLinks] = useState<Link[]>([])
  const heads = useRef(LAMP_POS.map(() => glowMat('#ff9d3c', '#6b5847')))
  const flashes = useRef([0, 0, 0, 0])
  const done = useRef(false)
  const haloTex = useMemo(haloTexture, [])

  const tap = (i: number) => {
    if (won || litRef.current.has(i)) return
    litRef.current.add(i)
    const n = [...lit, i]
    setLit(n)
    flashes.current[i] = 1
    blip(n.length)
    const p = LAMP_POS[i]
    burst(toWorld(p[0], HEAD_Y, p[2]), '#ffc27a', 18, 0.7)
    const prev = n.length > 1 ? LAMP_POS[n[n.length - 2]] : GATE
    setLinks((ls) => [...ls, { fx: prev[0], fy: n.length > 1 ? HEAD_Y : GATE[1], fz: prev[2], tx: p[0], ty: HEAD_Y, tz: p[2], id: i }])
    if (n.length === LAMP_POS.length && !done.current) { done.current = true; chime(); onWin() }
  }

  return (
    <group ref={root}>
      {LAMP_POS.map((p, i) => (
        <LampItem key={i} i={i} pos={p} lit={lit.includes(i)} won={won}
          head={heads.current[i]} haloTex={haloTex} flash={flashes.current} onTap={() => tap(i)} />
      ))}
      {links.map((l) => <Trail key={l.id} l={l} />)}
    </group>
  )
}

function LampItem({ i, pos, lit, won, head, haloTex, flash, onTap }: {
  i: number; pos: [number, number, number]; lit: boolean; won: boolean
  head: THREE.MeshStandardMaterial; haloTex: THREE.Texture; flash: number[]; onTap: () => void
}) {
  const sway = useRef<THREE.Group>(null)
  const halo = useRef<THREE.SpriteMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const amp = useRef(1)
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    pulse(head, lit, t, dt, '#f5b45e')
    amp.current += ((lit ? 0 : 1) - amp.current) * Math.min(1, dt * 3)
    if (sway.current && !REDUCED) {
      sway.current.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.07 * amp.current
      sway.current.position.y = Math.sin(t * 1.4 + i * 2.3) * 0.022 * amp.current
    }
    flash[i] = Math.max(0, flash[i] - dt * 1.8)
    const fl = flash[i]
    if (halo.current) {
      const base = lit ? (won ? 0.5 : 0.33) : 0.18 + Math.sin(t * 2.1 + i * 1.3) * 0.05
      halo.current.opacity += (base + fl * 0.55 - halo.current.opacity) * Math.min(1, dt * 7)
    }
    if (light.current) {
      const want = lit ? (won ? 2.6 : 1.7) : 0
      light.current.intensity += (want + fl * 3.5 - light.current.intensity) * Math.min(1, dt * 6)
    }
  })
  return (
    <Pop delay={i * 0.09} position={pos}>
      <Tappable disabled={lit || won} onTap={onTap}>
        <group ref={sway}>
          <Lantern head={head} />
          <sprite position={[0, HEAD_Y, 0]} scale={[0.9, 0.9, 1]} raycast={() => null}>
            <spriteMaterial ref={halo} map={haloTex} color="#ffc27a" transparent opacity={0.15} depthWrite={false} />
          </sprite>
          <pointLight ref={light} position={[0, HEAD_Y + 0.06, 0]} color="#ffb45e" intensity={0} distance={2.4} decay={2} />
        </group>
        <group name={'l01-lamp-' + i} position={[0, HEAD_Y, 0]} />
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.26, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Tappable>
    </Pop>
  )
}

/* A spark flies head-to-head with a soft arc, leaving a warm line on the grass. */
function Trail({ l }: { l: Link }) {
  const { geo, A, B } = useMemo(() => {
    const A = new THREE.Vector3(l.fx, l.fy, l.fz), B = new THREE.Vector3(l.tx, l.ty, l.tz)
    const a0 = new THREE.Vector3(l.fx, 0.06, l.fz), b0 = new THREE.Vector3(l.tx, 0.06, l.tz)
    const mid = a0.clone().lerp(b0, 0.5); mid.y = 0.14
    return { A, B, geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a0, mid, b0]), 14, 0.02, 6) }
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9a55e', emissive: '#ff9d3c', emissiveIntensity: 0, roughness: 0.6 }), [])
  const spMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd98e', emissive: '#ffab45', emissiveIntensity: 2.4, roughness: 0.4 }), [])
  const spark = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const t0 = useRef(-1)
  useFrame((s, dt) => {
    if (t0.current < 0) t0.current = s.clock.elapsedTime
    const p = Math.min(1, (s.clock.elapsedTime - t0.current) / (REDUCED ? 0.3 : 0.6))
    const e = p * p * (3 - 2 * p)
    if (spark.current) {
      const pos = A.clone().lerp(B, e); pos.y += Math.sin(e * Math.PI) * 0.3
      spark.current.position.copy(pos)
      spark.current.scale.setScalar(Math.max(0.001, Math.sin(Math.min(1, p * 1.06) * Math.PI)))
      spark.current.visible = p < 1
    }
    if (light.current) light.current.intensity = Math.sin(Math.min(1, p) * Math.PI) * 2.4
    mat.emissiveIntensity += ((p >= 1 ? 1.1 : e * 0.4) - mat.emissiveIntensity) * Math.min(1, dt * 8)
  })
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <group ref={spark}>
        <mesh material={spMat}><sphereGeometry args={[0.055, 10, 8]} /></mesh>
        <pointLight ref={light} color="#ffb45e" intensity={0} distance={1.8} decay={2} />
      </group>
    </group>
  )
}
