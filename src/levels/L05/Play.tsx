import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { C, clay } from '../../world/kit'
import { Draggable, Pop, Bob, burst, blip, chime, glowMat, pulse, useLocalToWorld, REDUCED } from '../../world/play'
import type { PlayProps } from '../types'

/* Ent: one large model split across four laptops on Wi-Fi.
   Verb: DRAG. Drag each glowing layer-slab off the floating stack onto a laptop.
   A laptop takes one slice; when all four hold a slice, warm arcs connect the
   ring and a pulse travels laptop to laptop. */

const HUES = ['#c4683a', '#3f87a3', '#6f9f3e', '#7a62a8']
const LIFT = 0.28
/** Four separate pieces of the model, floating apart in a gentle arc above the grass. */
const HOMES: [number, number, number][] = [[-0.35, 1.05, 0.8], [0.2, 1.22, 0.62], [0.75, 1.08, 0.72], [1.3, 1.24, 0.98]]
const REACH = 0.58

const LAPS = [
  { p: [-1.25, 0, 2.12], yaw: 0.5 },
  { p: [-0.4, 0, 2.28], yaw: 0.18 },
  { p: [0.45, 0, 2.3], yaw: -0.1 },
  { p: [1.15, 0, 2.2], yaw: -0.42 },
] as const

export default function Play({ onWin, won }: PlayProps) {
  const [dock, setDock] = useState<(number | null)[]>([null, null, null, null]) // dock[block] = laptop
  const [hoverLap, setHoverLap] = useState(-1)
  const done = dock.every((d) => d !== null)
  const tDone = useRef(-1)
  const fired = useRef(false)
  const [root, toWorld] = useLocalToWorld()
  const lapRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  const lapFx = useRef(LAPS.map(() => ({ bump: 0, deny: 0 })))
  const squash = useRef([0, 0, 0, 0])
  const blockInner = useRef<(THREE.Group | null)[]>([null, null, null, null])
  const token = useRef<THREE.Mesh>(null)

  const blockMats = useMemo(() => HUES.map((h) => { const m = glowMat(h, h); m.color.multiplyScalar(0.55); return m }), [])
  const scrMats = useMemo(() => LAPS.map((_, j) => glowMat(HUES[j], '#e9dcc4')), [])
  const arcMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f6e6c8', emissive: new THREE.Color('#f2b35e'), emissiveIntensity: 0.85, transparent: true, opacity: 0, roughness: 0.55 }),
    [],
  )
  const tokMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#fff3da', emissive: new THREE.Color('#f2b35e'), emissiveIntensity: 1.5, roughness: 0.5 }),
    [],
  )
  const arcs = useMemo(() => {
    const tops = LAPS.map((l) => new THREE.Vector3(l.p[0], 0.52, l.p[2]))
    return LAPS.map((_, k) => {
      const a = tops[k], b = tops[(k + 1) % LAPS.length]
      const mid = a.clone().lerp(b, 0.5)
      mid.y += 0.34 + a.distanceTo(b) * 0.06
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      const geo = new THREE.TubeGeometry(curve, 40, 0.013, 6)
      geo.setDrawRange(0, 0)
      return { geo, curve }
    })
  }, [])

  const nearestLap = (hx: readonly [number, number, number], l: THREE.Vector3) => {
    const ix = l.x + hx[0], iz = l.z + hx[2]
    let best = -1, bd = REACH
    LAPS.forEach((lap, j) => {
      const d = Math.hypot(ix - lap.p[0], iz - lap.p[2])
      if (d < bd) { bd = d; best = j }
    })
    return best
  }

  const dropBlock = (i: number, hx: [number, number, number], l: THREE.Vector3) => {
    const best = nearestLap(hx, l)
    setHoverLap(-1)
    if (best < 0) { blip(0); return false }
    if (dock.includes(best)) { lapFx.current[best].deny = 1; blip(0); return false }
    setDock((prev) => prev.map((v, k) => (k === i ? best : v)))
    lapFx.current[best].bump = 1
    blip(dock.filter((d) => d !== null).length + 1)
    burst(toWorld(LAPS[best].p[0], 0.3, LAPS[best].p[2]), HUES[i], 18, 0.7)
    return true
  }

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime
    if (done && tDone.current < 0) tDone.current = t
    const td = tDone.current
    blockMats.forEach((m, i) => {
      if (dock[i] === null) pulse(m, !won, t, dt)
      else m.emissiveIntensity += (0.4 - m.emissiveIntensity) * Math.min(1, dt * 5)
    })
    scrMats.forEach((m, j) => {
      const bi = dock.findIndex((d) => d === j)
      const want = bi >= 0 ? 1 + (REDUCED ? 0 : Math.sin(t * 2.2 + j) * 0.12) : hoverLap === j ? 0.8 + Math.sin(t * 9) * 0.2 : 0.14
      m.emissiveIntensity += (want - m.emissiveIntensity) * Math.min(1, dt * 7)
      if (bi >= 0) m.emissive.lerp(new THREE.Color(HUES[bi]), Math.min(1, dt * 4))
    })
    LAPS.forEach((lap, j) => {
      const g = lapRefs.current[j]; if (!g) return
      const fx = lapFx.current[j]
      fx.bump = Math.max(0, fx.bump - dt * 3.2); fx.deny = Math.max(0, fx.deny - dt * 4)
      const b = REDUCED ? 0 : fx.bump
      g.scale.set(1 + b * 0.1, 1 - b * 0.12, 1 + b * 0.1)
      g.rotation.y = lap.yaw + (fx.deny > 0 && !REDUCED ? Math.sin(t * 34) * 0.05 * fx.deny : 0)
    })
    dock.forEach((d, i) => {
      const g = blockInner.current[i]; if (!g) return
      squash.current[i] += ((d === null ? 0 : 1) - squash.current[i]) * Math.min(1, dt * 7)
      const k = squash.current[i]
      g.scale.set(1 - k * 0.26, 1 - k * 0.74, 1 - k * 0.26)
    })
    if (td >= 0) {
      arcs.forEach((a, k) => {
        const r = Math.min(1, Math.max(0, (t - td - 0.15 - k * 0.13) / 0.5))
        const idx = a.geo.index!.count
        a.geo.setDrawRange(0, Math.floor((idx * r) / 3) * 3)
      })
      arcMat.opacity = Math.min(0.92, Math.max(0, (t - td - 0.15) * 2.4))
      const tk = token.current
      if (tk) {
        const u = ((t - td - 0.3) / 1.15) * LAPS.length
        tk.visible = u > 0
        if (u > 0) {
          const seg = Math.floor(u) % LAPS.length, f = u - Math.floor(u)
          tk.position.copy(arcs[seg].curve.getPoint(f))
          tk.scale.setScalar(Math.min(1, u * 2 + 0.2))
        }
      }
      if (!fired.current && t > td + 1.15) { fired.current = true; chime(); onWin() }
    }
  })

  return (
    <group ref={root}>
      {/* the model, split into four floating layers */}
      {[0, 1, 2, 3].map((i) => {
        const home = HOMES[i]
        const d = dock[i]
        const to: [number, number, number] | null =
          d === null ? null : [LAPS[d].p[0] - home[0], 0.078 - home[1], LAPS[d].p[2] + 0.01 - home[2]]
        return (
          <Pop key={i} delay={0.08 + i * 0.09} position={home}>
            <Draggable
              name={`block${i}`}
              home={[0, 0, 0]}
              to={to}
              lift={LIFT}
              disabled={d !== null || won}
              onMove={(l) => setHoverLap(nearestLap(home, l))}
              onDrop={(l) => dropBlock(i, home, l)}>
              <group ref={(g) => { blockInner.current[i] = g }}>
                <Bob phase={i * 1.4} amp={0.045}>
                  <group rotation={[0.35, 0.6 + i * 0.4, 0.2]}>
                    <RoundedBox args={[0.32, 0.32, 0.32]} radius={0.07} smoothness={4} material={blockMats[i]} castShadow />
                  </group>
                </Bob>
              </group>
            </Draggable>
          </Pop>
        )
      })}

      {/* four laptops in an arc on the grass */}
      {LAPS.map((lap, j) => (
        <group key={'l' + j} name={`lap${j}`} position={lap.p} rotation={[0, lap.yaw, 0]} ref={(g) => { lapRefs.current[j] = g }}>
          <RoundedBox args={[0.62, 0.05, 0.44]} radius={0.018} position={[0, 0.045, 0]} material={clay('#e6d3b0')} castShadow receiveShadow />
          <RoundedBox args={[0.46, 0.014, 0.25]} radius={0.008} position={[0, 0.073, -0.04]} material={clay(C.earthDark)} />
          <RoundedBox args={[0.16, 0.013, 0.1]} radius={0.006} position={[0, 0.074, 0.13]} material={clay('#d8c6a4')} />
          <group position={[0, 0.058, -0.19]} rotation={[-0.42, 0, 0]}>
            <RoundedBox args={[0.62, 0.44, 0.028]} radius={0.014} position={[0, 0.22, 0]} material={clay(C.paper)} castShadow />
            <RoundedBox args={[0.53, 0.35, 0.03]} radius={0.012} position={[0, 0.22, 0.004]} material={scrMats[j]} />
          </group>
        </group>
      ))}

      {/* Wi-Fi arcs + the pulse that hops laptop to laptop */}
      {arcs.map((a, k) => <mesh key={'a' + k} geometry={a.geo} material={arcMat} />)}
      <mesh ref={token} visible={false} material={tokMat}>
        <sphereGeometry args={[0.055, 12, 10]} />
      </mesh>
      {won && !REDUCED && <Sparkles count={26} scale={[3.4, 1.1, 1.4]} position={[0.1, 0.9, 1.75]} size={3} speed={0.35} color="#f2d9a0" opacity={0.6} />}
    </group>
  )
}
