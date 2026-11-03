import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LEVELS } from '../levels/registry'
import { useJourney } from '../state/store'
import { CENTERS, standPoint, walkCurve, edge, pathLocal } from './layout'
import { Island, Scatter, C, clay, clayVC, cloudGeo, bridgeParts } from './kit'
import { Traveller, type Anim } from './Traveller'
import { Bursts, burst, springStep } from './play'
import { Lanterns, IslandLanterns, bridgeLampSpots } from './Lanterns'
import Atmosphere from './Atmosphere'

const Effects = lazy(() => import('./Effects').catch(() => ({ default: () => null as unknown as JSX.Element })))

const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const HORIZON = '#efe2cb'

// stable references so merged geometry is built once, not per render
const PATHS = LEVELS.map((_, i) => pathLocal(i))
const BRIDGES = LEVELS.slice(0, -1).map((_, i) => ({ from: edge(i, i + 1), to: edge(i + 1, i) }))

/**
 * Clay puff clouds: a low sea of them under the islands (the intro camera starts
 * above it) plus a few side puffs drifting on lanes left/right of the path so the
 * world has depth without ever covering an island.
 */
function Clouds() {
  const g = useRef<THREE.Group>(null)
  const items = useMemo(() => {
    const below = Array.from({ length: 16 }, (_, i) => ({
      p: [((i % 2 ? 1 : -1) * (8 + (i * 37 % 8))), -3.6 - (i * 13 % 5) * 0.9, 12 - i * 7.2] as [number, number, number],
      s: 1 + (i * 17 % 10) / 7, geo: cloudGeo(i + 3), v: 0.1 + (i % 4) * 0.05, lane: [-18, 18] as [number, number],
    }))
    const side = Array.from({ length: 6 }, (_, i) => {
      const left = i % 2 === 0
      return {
        p: [(left ? -1 : 1) * (13 + (i * 29 % 6)), 1.2 + (i * 11 % 5) * 1.5, -6 - i * 16] as [number, number, number],
        s: 0.9 + (i * 13 % 8) / 8, geo: cloudGeo(i + 30), v: 0.07 + (i % 3) * 0.04, lane: (left ? [-24, -11] : [11, 24]) as [number, number],
      }
    })
    return [...below, ...side]
  }, [])
  useFrame((s, dt) => {
    const g0 = g.current; if (!g0 || RM) return
    const t = s.clock.elapsedTime
    g0.children.forEach((c, i) => {
      const it = items[i]
      c.position.x += dt * it.v
      if (c.position.x > it.lane[1]) c.position.x = it.lane[0]
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
      k.was = true; k.x = 0.84; k.v = 0
      if (!RM) burst(o.localToWorld(new THREE.Vector3(0, 1.4, 0)), undefined, 26, 0.9)
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

/**
 * The bridge moment: posts and rope rails sweep out from our side first, then the
 * planks drop in one by one with a soft squash on landing and a dust puff at the
 * far end. Well under two seconds; if the visitor taps Walk on early it simply
 * finishes behind them — `shown` never goes back.
 */
function BridgeReveal({ from, to, shown }: { from: THREE.Vector3; to: THREE.Vector3; shown: boolean }) {
  const { planks, rails } = useMemo(() => bridgeParts(from, to), [from, to])
  const spots = useMemo(() => bridgeLampSpots(from, to), [from, to])
  const yaw = Math.atan2(-(to.z - from.z), to.x - from.x) // aligns local +X with the bridge direction
  const mid = useMemo(() => from.clone().lerp(to, 0.5), [from, to])
  const railsWrap = useRef<THREE.Group>(null)
  const lampWrap = useRef<THREE.Group>(null)
  const plRef = useRef<(THREE.Group | null)[]>([])
  const st = useRef({ p: shown ? 1 : 0, landed: shown })
  useFrame((_, dt) => {
    const k = st.current
    k.p = RM ? (shown ? 1 : 0) : shown ? Math.min(1, k.p + dt / 1.45) : 0
    // posts + ropes sweep out in the first beat; lanterns grow up with them
    const rp = Math.min(1, Math.max(0, (k.p - 0.02) / 0.3))
    const re = 1 - Math.pow(1 - rp, 3)
    if (railsWrap.current) { railsWrap.current.scale.set(Math.max(0.0001, re), 1, 1); railsWrap.current.visible = rp > 0.001 }
    if (lampWrap.current) { const s = Math.max(0.0001, re); lampWrap.current.scale.setScalar(s); lampWrap.current.visible = s > 0.3 }
    const n = planks.length
    for (let i = 0; i < n; i++) {
      const g = plRef.current[i]; if (!g) continue
      const k2 = RM ? k.p : Math.min(1, Math.max(0, (k.p * 1.08 - (i / (n + 1)) * 0.9) / 0.18))
      g.visible = k2 > 0.001
      g.position.y = planks[i].p.y + (1 - k2) * (1 - k2) * 0.85
      const sc = Math.max(0.0001, 1 + Math.sin(Math.min(1, k2) * Math.PI) * 0.14)
      g.scale.set(sc, k2 < 0.92 ? Math.max(0.0001, 0.6 + 0.4 * (k2 / 0.92)) : 1, sc)
    }
    if (shown && k.p >= 1 && !k.landed) { k.landed = true; burst(to.clone().add(new THREE.Vector3(0, 0.3, 0)), '#e6c38f', 18, 0.6) }
    if (!shown) k.landed = false
  })
  return (
    <group>
      <group position={from} rotation={[0, yaw, 0]}>
        <group ref={railsWrap}>
          <group rotation={[0, -yaw, 0]}>
            <group position={from.clone().negate()}>
              <mesh geometry={rails} material={clayVC()} castShadow />
            </group>
          </group>
        </group>
      </group>
      <group position={mid}>
        <group ref={lampWrap}>
          <group position={mid.clone().negate()}>
            <Lanterns spots={spots} />
          </group>
        </group>
      </group>
      {planks.map((pl, i) => (
        <group key={i} ref={(el) => { plRef.current[i] = el }} position={pl.p} rotation={[0, pl.r, (i % 3 - 1) * 0.03]} visible={st.current.p > 0}>
          <RoundedBox args={[0.9, 0.07, 0.24]} radius={0.03} material={clay(i % 2 ? C.wood : C.woodLight)} castShadow receiveShadow />
        </group>
      ))}
    </group>
  )
}

function Islands() {
  const current = useJourney((s) => s.current)
  const target = useJourney((s) => s.target)
  const solved = useJourney((s) => s.solved)
  const phase = useJourney((s) => s.phase)
  const win = useJourney((s) => s.win)
  const last = LEVELS.length - 1
  // the finale pull-back shows the whole lit path, so every diorama stays mounted
  const finale = phase === 'arrived' && current === last && solved.includes(LEVELS[last].id)
  const near = (i: number) => finale || (i >= Math.min(current, target) - 1 && i <= Math.max(current, target) + 2)
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
          {solved.includes(L.id) && near(i) && <IslandLanterns index={i} />}
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
const UP = new THREE.Vector3(0, 1, 0)
const PLAY_C = new THREE.Vector3(0.3, 0, 0.95) // island-local centre of the play space x[-1.6,2.2] z[-0.5,2.4]
const LAST = LEVELS.length - 1
const PATH_MID = CENTERS.reduce((a, c) => a.add(c), new THREE.Vector3()).multiplyScalar(1 / CENTERS.length)
const INTRO_OFF = OFF.clone().normalize().multiplyScalar(40) // intro starts far up the camera axis, above the clouds
const INTRO_S = 4.6

function TravellerRig() {
  const ref = useRef<THREE.Group>(null)
  const current = useJourney((s) => s.current)
  const target = useJourney((s) => s.target)
  const phase = useJourney((s) => s.phase)
  const walk = useRef<{ curve: THREE.CatmullRomCurve3; t: number; e: number; to: number } | null>(null)
  const { camera, size } = useThree()
  const look = useRef(standPoint(useJourney.getState().current).clone())
  const intro = useRef(0)
  const glance = useRef(0)   // 1 → decays: a short look at the next island when its bridge builds
  const fin = useRef(0)      // 0 → 1: finale pull-back blend
  const shownCnt = useRef(-1)
  const snap = useRef(true)  // first frame + teleports: set the camera, don't lerp
  const T = useRef({ aim: new THREE.Vector3(), want: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), fa: new THREE.Vector3(), fw: new THREE.Vector3() })

  useEffect(() => {
    if (!ref.current) return
    const st = useJourney.getState()
    if (target === current) { ref.current.position.copy(standPoint(current)); return }
    if (Math.abs(target - current) === 1 && target > current) walk.current = { curve: walkCurve(current), t: 0, e: 0, to: target }
    else { // long jump (skip / restart): snap the camera, place the traveller
      ref.current.position.copy(standPoint(target)); st.goto(target); st.setPhase('arrived'); snap.current = true
    }
  }, [target, current])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const g = ref.current; if (!g) return
    const t = state.clock.elapsedTime
    const st = useJourney.getState()
    const { current: cur, target: tg, phase: ph, solved, started } = st
    const portrait = size.width < size.height
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
        const sj = useJourney.getState(); sj.goto(w.to); sj.setPhase('arrived')
      }
    } else {
      g.rotation.y += (0.35 - g.rotation.y) * Math.min(1, dt * 3)
    }

    const { aim, want, v, r, fa, fw } = T.current
    const ci = w ? w.to : cur
    const ctr = CENTERS[ci]
    let dist: number
    if (ph === 'playing' || ph === 'won') {
      // the toy space stays centre-frame, clear of the title above and the hint pill below
      aim.set(ctr.x + PLAY_C.x, ctr.y + 0.15, ctr.z + PLAY_C.z)
      if (portrait) { aim.y -= 0.55; dist = 1.55 }
      else { aim.addScaledVector(SIDE, -0.35); aim.y -= 0.1; dist = 0.78 }
    } else {
      aim.copy(g.position).lerp(v.set(ctr.x, ctr.y + 0.55, ctr.z), w ? 0.4 : portrait ? 0.65 : 0.55)
      if (portrait) { aim.y -= 1.3; dist = 2.15 } // building in the top half, text at the bottom
      else { aim.addScaledVector(SIDE, -1.05); aim.y -= 0.25; dist = 0.95 } // building right two-thirds, card bottom-left
    }
    want.copy(aim).addScaledVector(OFF, dist)
    if (w && !RM) { const a = Math.sin(w.e * Math.PI); want.addScaledVector(SIDE, a * 1.4); want.y += a * 0.6 } // gentle arc while gliding

    // a new bridge just built itself — glance at the island it reaches, then settle back
    const ns = solved.length
    if (shownCnt.current < 0) shownCnt.current = ns
    if (ns > shownCnt.current && tg === cur && cur < LAST && (ph === 'arrived' || ph === 'won')) glance.current = 1
    shownCnt.current = ns
    if (glance.current > 0.002 && !w && cur < LAST) {
      const nx = CENTERS[cur + 1]
      aim.lerp(v.set(nx.x, nx.y + 0.5, nx.z), Math.min(0.5, glance.current * 0.45))
      glance.current *= Math.exp(-dt * 1.6)
    }

    // grand finale: pull slowly up and back until the whole lit path is in frame, orbiting gently
    const finale = ph === 'arrived' && cur === LAST && solved.includes(LEVELS[LAST].id)
    fin.current += ((finale ? 1 : 0) - fin.current) * (1 - Math.exp(-dt * 1.4))
    if (fin.current > 0.002) {
      // beyond the last island, looking back down the lit path: L09 close at right, the rest receding
      const az = (portrait ? 3.08 : 2.9) + (RM ? 0 : Math.sin(t * 0.05) * 0.12)
      fw.set(PATH_MID.x + Math.sin(az) * 64, 21, PATH_MID.z + Math.cos(az) * 64)
      fa.copy(PATH_MID); fa.z -= 4
      r.crossVectors(v.copy(fa).sub(fw).normalize(), UP)
      fa.addScaledVector(r, portrait ? -2 : -2.5).y -= portrait ? 3.4 : 2.4 // story card sits low: path reads top-right
      want.lerp(fw, fin.current); aim.lerp(fa, fin.current)
    }

    // cinematic opening: high above the cloud sea, gliding down to the first island
    if (!started) {
      intro.current += dt
      const u = RM ? 1 : Math.min(1, Math.max(0, (intro.current - 0.9) / (INTRO_S - 0.9))) // hold aloft, then descend
      const e = u * u * (3 - 2 * u)
      v.copy(CENTERS[0]).add(INTRO_OFF)
      want.lerpVectors(v, want, e)
      r.set(CENTERS[0].x, CENTERS[0].y + 0.4, CENTERS[0].z)
      aim.lerpVectors(r, aim, e)
    }

    if (snap.current) { camera.position.copy(want); look.current.copy(aim); snap.current = false }
    camera.position.lerp(want, Math.min(1, dt * 1.7))
    look.current.lerp(aim, Math.min(1, dt * 2.3))
    camera.lookAt(look.current)
  })
  const id = LEVELS[current]?.id
  const anim: Anim = target !== current ? 'walk' : phase === 'won' ? 'cheer' : phase === 'playing' && id === 'I01' ? 'sit' : 'idle'
  return <Traveller ref={ref} anim={anim} />
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
      <Atmosphere />
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
