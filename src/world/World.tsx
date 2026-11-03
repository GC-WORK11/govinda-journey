import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { LEVELS } from '../levels/registry'
import { useJourney } from '../state/store'
import { CENTERS, standPoint, walkCurve, edge, pathLocal } from './layout'
import { Island, Bridge, Scatter, C, clay, cloudGeo } from './kit'
import { Traveller } from './Traveller'

const Effects = lazy(() => import('./Effects'))

const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const HORIZON = '#efe2cb'

/** Soft warm vertical sky gradient on a big dome (distant islands fade into the horizon haze). */
function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#b6d1d7') },
      mid: { value: new THREE.Color(HORIZON) },
      bot: { value: new THREE.Color('#dfc9a8') },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;' +
      'void main(){ float h = normalize(vP).y;' +
      ' vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.5, h)) : mix(mid, bot, smoothstep(0.0, 0.4, -h));' +
      ' gl_FragColor = vec4(c, 1.0); }',
  }), [])
  return (
    <mesh material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[120, 32, 20]} />
    </mesh>
  )
}

/** Clay puff clouds drifting slowly below and around the islands. */
function Clouds() {
  const g = useRef<THREE.Group>(null)
  const items = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    p: [((i % 2 ? 1 : -1) * (8 + (i * 37 % 8))), -3.6 - (i * 13 % 5) * 0.9, 8 - i * 7.4] as [number, number, number],
    s: 1 + (i * 17 % 10) / 7, geo: cloudGeo(i + 3), v: 0.1 + (i % 4) * 0.05,
  })), [])
  useFrame((s, dt) => {
    const g0 = g.current; if (!g0 || RM) return
    const t = s.clock.elapsedTime
    g0.children.forEach((c, i) => {
      const it = items[i]
      c.position.x += dt * it.v
      if (c.position.x > 18) c.position.x = -18
      c.position.y = it.p[1] + Math.sin(t * 0.22 + i * 2.1) * 0.3
    })
  })
  return (
    <group ref={g}>
      {items.map((c, i) => (
        <mesh key={i} geometry={c.geo} position={c.p} scale={c.s} material={clay(C.paper)} />
      ))}
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
          <Scatter ground={L.palette.ground} accent={L.palette.accent} seed={i * 7 + 2} path={pathLocal(i)} />
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

const OFF = new THREE.Vector3(7.5, 8.2, 10.5) // camera offset from the look target
const SIDE = new THREE.Vector3(0.81, 0, -0.58) // screen-right in world space for OFF

function TravellerRig() {
  const ref = useRef<THREE.Group>(null)
  const current = useJourney((s) => s.current)
  const target = useJourney((s) => s.target)
  const walk = useRef<{ curve: THREE.CatmullRomCurve3; t: number; e: number; to: number } | null>(null)
  const { camera, size } = useThree()
  const look = useRef(standPoint(current).clone())
  const phase = useJourney((s) => s.phase)

  useEffect(() => {
    if (!ref.current) return
    const st = useJourney.getState()
    if (target === current) { ref.current.position.copy(standPoint(current)); return }
    if (Math.abs(target - current) === 1 && target > current) walk.current = { curve: walkCurve(current), t: 0, e: 0, to: target }
    else { // long jump (skip / restart): glide the camera, place the traveller
      ref.current.position.copy(standPoint(target)); st.goto(target); st.setPhase('arrived')
    }
  }, [target, current])

  useFrame((state, dt) => {
    const g = ref.current; if (!g) return
    const t = state.clock.elapsedTime
    const w = walk.current
    const body = g.getObjectByName('body')
    const L = g.getObjectByName('legL'), R = g.getObjectByName('legR')
    const AL = g.getObjectByName('armL'), AR = g.getObjectByName('armR')
    if (w) {
      const len = w.curve.getLength()
      w.t = Math.min(1, w.t + (dt * 2.1) / len)
      w.e = w.t < 0.5 ? 2 * w.t * w.t : 1 - Math.pow(-2 * w.t + 2, 2) / 2
      const p = w.curve.getPointAt(w.e); const ahead = w.curve.getPointAt(Math.min(1, w.e + 0.02))
      g.position.copy(p)
      g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z)
      const step = Math.sin(t * 12) * (RM ? 0.5 : 1)
      if (body) { body.position.y = Math.abs(step) * 0.05; body.rotation.x = 0.05 }
      if (L && R) { L.rotation.x = step * 0.55; R.rotation.x = -step * 0.55 }
      if (AL && AR) { AL.rotation.x = -step * 0.4; AR.rotation.x = step * 0.4 }
      if (w.t >= 1) {
        walk.current = null
        const st = useJourney.getState(); st.goto(w.to); st.setPhase('arrived')
      }
    } else {
      g.rotation.y += (0.35 - g.rotation.y) * Math.min(1, dt * 3)
      if (body) {
        body.position.y = RM ? 0 : 0.01 + Math.sin(t * 2.1) * 0.012
        body.rotation.x *= Math.max(0, 1 - dt * 5)
        const b = RM ? 1 : 1 + Math.sin(t * 2.1) * 0.012
        body.scale.set(1, b, 1)
      }
      for (const l of [L, R, AL, AR]) if (l) l.rotation.x += (0 - l.rotation.x) * Math.min(1, dt * 8)
    }
    // cinematic camera: follows the traveller, keeps the island framed
    const portrait = size.width < size.height
    const close = phase === 'playing' || phase === 'panel'
    const ci = w ? w.to : current
    const ctr = CENTERS[ci]
    const aim = g.position.clone().lerp(new THREE.Vector3(ctr.x, ctr.y + 0.55, ctr.z), w ? 0.4 : 0.55)
    if (portrait) aim.y -= 1.3 // building sits in the top half, text at the bottom
    else { aim.addScaledVector(SIDE, -1.05); aim.y -= 0.25 } // building in the right two-thirds, text bottom-left
    const dist = (portrait ? 1.95 : 1) * (close ? (portrait ? 0.85 : 0.78) : 1)
    const want = aim.clone().addScaledVector(OFF, dist)
    if (w && !RM) { const a = Math.sin(w.e * Math.PI); want.addScaledVector(SIDE, a * 1.4); want.y += a * 0.6 } // gentle arc while gliding
    camera.position.lerp(want, Math.min(1, dt * 1.7))
    look.current.lerp(aim, Math.min(1, dt * 2.3))
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
    <>
      <directionalLight ref={light} intensity={1.9} color="#ffe2b6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-far={40} />
      <directionalLight position={[-7, 5, -6]} intensity={0.4} color="#dfe9e4" />
    </>
  )
}

export default function World() {
  const [dpr, setDpr] = useState(LITE ? 1 : Math.min(1.5, window.devicePixelRatio || 1))
  const [fx, setFx] = useState(!LITE)
  return (
    <Canvas shadows={LITE ? false : 'soft'} dpr={dpr} camera={{ fov: 28, near: 0.5, far: 160, position: [8, 9, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
      {!LITE && (
        <PerformanceMonitor
          onDecline={() => { setDpr(1); setFx(false) }}
          onIncline={() => setDpr(Math.min(1.75, window.devicePixelRatio || 1))} />
      )}
      <color attach="background" args={[HORIZON]} />
      <fog attach="fog" args={[HORIZON, 26, 62]} />
      <hemisphereLight args={['#fff3e0', '#b7a086', 1.1]} />
      <Sun />
      <SkyDome />
      <Clouds />
      <Islands />
      <TravellerRig />
      {!LITE && fx && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  )
}
