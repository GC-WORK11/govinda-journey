import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { LEVELS } from '../levels/registry'
import { useJourney } from '../state/store'
import { CENTERS, standPoint, walkCurve, edge } from './layout'
import { Island, Bridge, Tree, Rock, C, clay } from './kit'
import { Traveller } from './Traveller'

const SKY = '#e9dfcf'

function Clouds() {
  const items = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const z = 6 - i * 6.2, x = (i % 2 ? 1 : -1) * (9 + (i * 37 % 7)), y = -3.5 - (i * 13 % 5)
    return { p: [x, y, z] as [number, number, number], s: 1 + (i * 17 % 10) / 8 }
  }), [])
  return (
    <group>
      {items.map((c, i) => (
        <group key={i} position={c.p} scale={c.s}>
          {[[0, 0, 0, 1], [0.9, -0.15, 0.1, 0.75], [-0.85, -0.2, -0.1, 0.7]].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} material={clay(C.paper)}><sphereGeometry args={[r, 16, 12]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Decor({ i }: { i: number }) {
  // A few trees and rocks around the rim so every island feels lived in. Deterministic per island.
  const r = (n: number) => { const x = Math.sin((i + 1) * 91.7 + n * 13.1) * 43758.5; return x - Math.floor(x) }
  const spots = useMemo(() => Array.from({ length: 6 }, (_, k) => {
    const a = r(k) * Math.PI * 2, d = 2.1 + r(k + 10) * 0.7
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, h: 0.7 + r(k + 20) * 0.6, tree: k % 3 !== 2 }
  }), [i])
  return (
    <group>
      {spots.map((s, k) => {
        // keep the front-left stand area and the bridge sides clear
        if (s.z > 0.6 && s.x < 0.4) return null
        return s.tree ? <Tree key={k} position={[s.x, 0, s.z]} h={s.h} /> : <Rock key={k} position={[s.x, 0.05, s.z]} s={0.22 * s.h} />
      })}
    </group>
  )
}

function Islands() {
  const current = useJourney((s) => s.current)
  const target = useJourney((s) => s.target)
  const solved = useJourney((s) => s.solved)
  const phase = useJourney((s) => s.phase)
  const near = (i: number) => i >= Math.min(current, target) - 1 && i <= Math.max(current, target) + 2
  return (
    <group>
      {LEVELS.map((L, i) => (
        <group key={L.id} position={CENTERS[i]}>
          <Island ground={L.palette.ground} seed={i + 1} />
          <Decor i={i} />
          {near(i) && (
            <Suspense fallback={null}>
              <L.Diorama unlocked={solved.includes(L.id)} active={i === current && (phase === 'playing' || phase === 'panel')} />
            </Suspense>
          )}
        </group>
      ))}
      {LEVELS.slice(0, -1).map((_, i) => <Bridge key={i} from={edge(i, i + 1)} to={edge(i + 1, i)} />)}
    </group>
  )
}

function TravellerRig() {
  const ref = useRef<THREE.Group>(null)
  const current = useJourney((s) => s.current)
  const target = useJourney((s) => s.target)
  const walk = useRef<{ curve: THREE.CatmullRomCurve3; t: number; to: number } | null>(null)
  const { camera, size } = useThree()
  const look = useRef(standPoint(current).clone())
  const phase = useJourney((s) => s.phase)

  useEffect(() => {
    if (!ref.current) return
    const st = useJourney.getState()
    if (target === current) { ref.current.position.copy(standPoint(current)); return }
    if (Math.abs(target - current) === 1 && target > current) walk.current = { curve: walkCurve(current), t: 0, to: target }
    else { // long jump (skip / restart): glide the camera, place the traveller
      ref.current.position.copy(standPoint(target)); st.goto(target); st.setPhase('arrived')
    }
  }, [target, current])

  useFrame((state, dt) => {
    const g = ref.current; if (!g) return
    const w = walk.current
    if (w) {
      const len = w.curve.getLength()
      w.t = Math.min(1, w.t + (dt * 2.1) / len)
      const e = w.t < 0.5 ? 2 * w.t * w.t : 1 - Math.pow(-2 * w.t + 2, 2) / 2
      const p = w.curve.getPointAt(e); const ahead = w.curve.getPointAt(Math.min(1, e + 0.02))
      g.position.copy(p)
      g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z)
      const step = Math.sin(state.clock.elapsedTime * 14)
      const body = g.getObjectByName('body')
      if (body) body.position.y = Math.abs(step) * 0.06
      const L = g.getObjectByName('legL'), R = g.getObjectByName('legR')
      if (L && R) { L.rotation.x = step * 0.6; R.rotation.x = -step * 0.6 }
      if (w.t >= 1) {
        walk.current = null
        const st = useJourney.getState(); st.goto(w.to); st.setPhase('arrived')
      }
    } else {
      g.rotation.y += (0.35 - g.rotation.y) * Math.min(1, dt * 3)
      const body = g.getObjectByName('body'); if (body) body.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.012
    }
    // camera: tilt-shift style high angle, closer while playing
    const portrait = size.width < size.height
    const close = phase === 'playing' || phase === 'panel'
    const dist = (portrait ? 1.55 : 1) * (close ? 0.78 : 1)
    look.current.lerp(g.position.clone().add(new THREE.Vector3(0.9, 0.4, -1.4)), Math.min(1, dt * 2.4))
    const want = look.current.clone().add(new THREE.Vector3(7.5 * dist, 8.2 * dist, 10.5 * dist))
    camera.position.lerp(want, Math.min(1, dt * 1.8))
    camera.lookAt(look.current)
  })
  return <Traveller ref={ref} />
}

function Sun() {
  const light = useRef<THREE.DirectionalLight>(null)
  const current = useJourney((s) => s.current)
  useFrame(() => {
    const l = light.current; if (!l) return
    const c = CENTERS[current]
    l.position.set(c.x + 6, c.y + 12, c.z + 5); l.target.position.copy(c); l.target.updateMatrixWorld()
  })
  return (
    <directionalLight ref={light} intensity={2.1} color="#fff1dc" castShadow
      shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03}
      shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-far={40} />
  )
}

const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')

export default function World() {
  const [dpr, setDpr] = useState(LITE ? 1 : 1.5)
  return (
    <Canvas shadows={!LITE} dpr={dpr} camera={{ fov: 28, near: 0.5, far: 160, position: [8, 9, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
      {!LITE && <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))} />}
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 26, 62]} />
      <hemisphereLight args={['#fff6e8', '#b9a58a', 1.15]} />
      <Sun />
      <Clouds />
      <Islands />
      <TravellerRig />
    </Canvas>
  )
}
