import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { LEVELS } from '../levels/registry'
import { useJourney } from '../state/store'
import { CENTERS, standPoint, walkCurve, edge, pathLocal } from './layout'
import { Island, Bridge, Scatter, C, clay, cloudGeo } from './kit'
import { Traveller, type Anim } from './Traveller'
import { Bursts, burst, springStep } from './play'

const Effects = lazy(() => import('./Effects').catch(() => ({ default: () => null as unknown as JSX.Element })))

const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const HORIZON = '#efe2cb'

// stable references so merged geometry is built once, not per render
const PATHS = LEVELS.map((_, i) => pathLocal(i))
const BRIDGES = LEVELS.slice(0, -1).map((_, i) => ({ from: edge(i, i + 1), to: edge(i + 1, i) }))

/** Soft warm vertical sky gradient on a big dome (distant islands fade into the horizon haze). */
function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#bcd6da') },
      mid: { value: new THREE.Color(HORIZON) },
      bot: { value: new THREE.Color('#dcc2a0') },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;' +
      'void main(){ float h = normalize(vP).y;' + // camera looks down: frame spans roughly h in [-0.75, -0.25]
      ' vec3 c = mix(bot, mid, smoothstep(-0.75, -0.4, h));' +
      ' c = mix(c, top, smoothstep(-0.52, -0.22, h));' +
      ' gl_FragColor = vec4(c, 1.0);' +
      '\n#include <colorspace_fragment>\n}',
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

/** Squash-stretch pop of the building the moment its level is solved, plus leaves and a warm flare. */
function Unlock({ on, children }: { on: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const st = useRef({ was: on, x: 1, v: 0 })
  const flare = useRef<THREE.PointLight>(null)
  useFrame((_, dt) => {
    const o = g.current; if (!o) return
    const k = st.current
    if (on && !k.was) {
      k.was = true; k.x = 0.72; k.v = 0
      if (!RM) burst(o.localToWorld(new THREE.Vector3(0, 1.4, 0)), undefined, 60, 1.25)
      if (flare.current) flare.current.intensity = 9
    }
    if (!on) k.was = false
    k.v = springStep(k.x, k.v, 1, dt, 190, 7); k.x += k.v * Math.min(dt, 1 / 30)
    const x = RM ? 1 : k.x
    o.scale.set(1 + (1 - x) * 0.45, x, 1 + (1 - x) * 0.45)
    if (flare.current) flare.current.intensity *= Math.exp(-dt * 2.2)
  })
  return (
    <>
      <group ref={g}>{children}</group>
      <pointLight ref={flare} position={[0, 2.2, 0.6]} color="#ffc27a" intensity={0} distance={9} decay={1.6} />
    </>
  )
}

/** A bridge that builds itself out from `from` toward `to` the first time it is shown. */
function BridgeReveal({ from, to, shown }: { from: THREE.Vector3; to: THREE.Vector3; shown: boolean }) {
  const inner = useRef<THREE.Group>(null)
  const st = useRef({ p: shown ? 1 : 0, v: 0, landed: shown })
  const yaw = Math.atan2(-(to.z - from.z), to.x - from.x) // aligns local +X with the bridge direction
  const tip = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const o = inner.current; if (!o) return
    const k = st.current
    const want = shown ? 1 : 0
    if (RM) k.p = want
    else if (shown) k.p = Math.min(1, k.p + dt / 1.5)
    else k.p = 0
    const e = 1 - Math.pow(1 - k.p, 3)
    o.scale.set(Math.max(0.0001, e), 1, 1)
    o.visible = k.p > 0.001
    if (shown && k.p >= 1 && !k.landed) { k.landed = true; burst(to.clone().add(new THREE.Vector3(0, 0.3, 0)), '#e6c38f', 18, 0.6) }
    if (!shown) k.landed = false
  })
  return (
    <group position={from} rotation={[0, yaw, 0]}>
      <group ref={inner}>
        <group rotation={[0, -yaw, 0]}>
          <group position={from.clone().negate()}><Bridge from={from} to={to} /></group>
        </group>
      </group>
      <group ref={tip} />
    </group>
  )
}

function Islands() {
  const current = useJourney((s) => s.current)
  const target = useJourney((s) => s.target)
  const solved = useJourney((s) => s.solved)
  const phase = useJourney((s) => s.phase)
  const win = useJourney((s) => s.win)
  const near = (i: number) => i >= Math.min(current, target) - 1 && i <= Math.max(current, target) + 2
  const playing = phase === 'playing' || phase === 'won'
  return (
    <group>
      {LEVELS.map((L, i) => (
        <group key={L.id} position={CENTERS[i]}>
          <Island ground={L.palette.ground} seed={i + 1} />
          <Scatter ground={L.palette.ground} accent={L.palette.accent} seed={i * 7 + 2} path={PATHS[i]} />
          {near(i) && (
            <Suspense fallback={null}>
              <Unlock on={solved.includes(L.id)}>
                <L.Diorama unlocked={solved.includes(L.id)} active={i === current && playing} />
              </Unlock>
            </Suspense>
          )}
          {i === current && target === current && playing && (
            <Suspense fallback={null}>
              <L.Play onWin={win} won={phase === 'won'} />
            </Suspense>
          )}
        </group>
      ))}
      {BRIDGES.map((b, i) => (
        <BridgeReveal key={i} from={b.from} to={b.to} shown={solved.includes(LEVELS[i].id) || i < current} />
      ))}
      <Bursts />
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
    if (w) {
      const len = w.curve.getLength()
      w.t = Math.min(1, w.t + (dt * 2.1) / len)
      w.e = w.t < 0.5 ? 2 * w.t * w.t : 1 - Math.pow(-2 * w.t + 2, 2) / 2
      const p = w.curve.getPointAt(w.e); const ahead = w.curve.getPointAt(Math.min(1, w.e + 0.02))
      g.position.copy(p)
      g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z)
      if (w.t >= 1) {
        walk.current = null
        const st = useJourney.getState(); st.goto(w.to); st.setPhase('arrived')
      }
    } else {
      g.rotation.y += (0.35 - g.rotation.y) * Math.min(1, dt * 3)
    }
    // cinematic camera: follows the traveller, keeps the island framed
    const portrait = size.width < size.height
    const close = phase === 'playing' || phase === 'won'
    const ci = w ? w.to : current
    const ctr = CENTERS[ci]
    const aim = g.position.clone().lerp(new THREE.Vector3(ctr.x, ctr.y + 0.55, ctr.z), w ? 0.4 : portrait ? 0.65 : 0.55)
    if (portrait) aim.y -= 1.3 // building sits in the top half, text at the bottom
    else { aim.addScaledVector(SIDE, -1.05); aim.y -= 0.25 } // building in the right two-thirds, text bottom-left
    const dist = (portrait ? 2.3 : 1) * (close ? (portrait ? 0.88 : 0.78) : 1)
    const want = aim.clone().addScaledVector(OFF, dist)
    if (w && !RM) { const a = Math.sin(w.e * Math.PI); want.addScaledVector(SIDE, a * 1.4); want.y += a * 0.6 } // gentle arc while gliding
    camera.position.lerp(want, Math.min(1, dt * 1.7))
    look.current.lerp(aim, Math.min(1, dt * 2.3))
    camera.lookAt(look.current)
  })
  const id = LEVELS[current]?.id
  const anim: Anim = target !== current ? 'walk' : phase === 'won' ? 'cheer' : phase === 'playing' && id === 'I01' ? 'sit' : 'idle'
  return <Traveller ref={ref} anim={anim} />
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

/** ?qa only: lets the headless playthrough find 3D objects. __journey.project(x,y,z) → CSS px of an
 *  island-local point on the current island; __journey.find(name) → CSS px of a named object. */
function QaProbe() {
  const { camera, gl, scene } = useThree()
  useEffect(() => {
    const j = (window as any).__journey; if (!j) return
    const px = (w: THREE.Vector3) => {
      const r = gl.domElement.getBoundingClientRect(); const v = w.clone().project(camera)
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }
    }
    j.project = (x: number, y: number, z: number) => px(CENTERS[useJourney.getState().current].clone().add(new THREE.Vector3(x, y, z)))
    j.find = (name: string) => { const o = scene.getObjectByName(name); if (!o) return null; const w = new THREE.Vector3(); o.getWorldPosition(w); return px(w) }
  }, [camera, gl, scene])
  return null
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
      <QaProbe />
      {!LITE && fx && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  )
}
