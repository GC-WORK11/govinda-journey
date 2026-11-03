/**
 * World5 — the V5 shell. A walkable chain of floating islands, one per chapter
 * of 2023 → Nov 2026. Canvas mirrors the V4 World setup (soft shadows, ACES,
 * PerformanceMonitor); sky time-of-day follows the timeline; bridges build
 * themselves only after the island behind them is complete.
 *
 * Everything optional comes through module globs: ART (IslandBase / Water /
 * Clouds5 / Effects5), PLAYER (Player / Controls), and each island's Obstacle —
 * until they land, quiet fallbacks keep the world whole.
 */
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { V5_ORDER, useV5, player, cinematic, type IslandId } from './core'
import { ISLAND_POS, ENTRY, PATH_MID, islandIndex, islandPos } from './world/layout'
import { Island5 } from './world/Island5'
import { Bridge5 } from './world/Bridge5'
import { hasObstacle, Player, ArtWater, Guard } from './world/modules'
import { useWorldUI } from './world/progress'
import Sky5, { skyDebug } from './world/Sky5'
import { env } from '../world/sky'
import { Clouds } from '../world/Clouds'
import { C, clay } from '../world/kit'
import Chrome from './ui/Chrome'
import './ui/v5.css'

/** V4's tilt-shift finish — parity baseline until ART's Effects5 clears the bar. */
const Effects = lazy(() => import('../world/Effects'))

const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
const QA = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa')
const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// ?qa&fresh — start from a clean journey (before persist state is read anywhere)
if (QA && new URLSearchParams(location.search).has('fresh')) {
  localStorage.removeItem('govinda-journey-v5')
  useV5.getState().reset()
}

function Islands5() {
  const done = useV5((s) => s.done)
  const broken = useWorldUI((s) => s.broken)
  return (
    <group>
      {V5_ORDER.map((id, i) => <Island5 key={id} id={id} i={i} />)}
      {V5_ORDER.slice(0, -1).map((id, i) => (
        <Bridge5 key={id} i={i} shown={done.includes(id) || !hasObstacle(id) || !!broken[id]} />
      ))}
    </group>
  )
}

/**
 * Islands merge many small geometries into single meshes; if any merge fails
 * (mixed attributes) it returns null and three's frustum culling crashes on
 * `geometry.boundingSphere` every frame — the canvas freezes while the DOM
 * overlay looks fine. Sweep null-geometry meshes out of the render path so a
 * single island bug can never freeze the whole world.
 */
function Hygiene() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const sweep = () =>
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !(o as THREE.Mesh).geometry) o.visible = false
      })
    sweep()
    const t = window.setInterval(sweep, 1600)
    return () => window.clearInterval(t)
  }, [scene])
  return null
}

/**
 * Stand-in traveller + follow cam, rendered only until PLAYER's Player.tsx
 * lands (module glob). The capsule reads core.player.pos so ?qa goto works,
 * and the cam yields whenever core.cinematic.on is set.
 */
function FallbackRig() {
  const me = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3())
  const seeded = useRef(false)
  useEffect(() => {
    if (player.pos.lengthSq() < 0.01) {
      player.pos.copy(ISLAND_POS[0]).add(ENTRY)
      player.island = V5_ORDER[0]
    }
    seeded.current = false
  }, [])
  useFrame((s, dt) => {
    if (me.current) me.current.position.copy(player.pos)
    if (cinematic.on) return
    const idx = useWorldUI.getState().idx
    const c = ISLAND_POS[idx]
    const az = 0.62 + (RM ? 0 : Math.sin(s.clock.elapsedTime * 0.045) * 0.05)
    const want = _fw.set(c.x + Math.sin(az) * 10.6, c.y + 6.3, c.z + Math.cos(az) * 10.6)
    if (!seeded.current) { seeded.current = true; camera.position.copy(want); look.current.set(c.x, c.y + 0.6, c.z) }
    camera.position.lerp(want, 1 - Math.exp(-dt * 1.8))
    look.current.lerp(_fa.set(c.x, c.y + 0.6, c.z), Math.min(1, dt * 2.4))
    camera.lookAt(look.current)
  })
  return (
    <group ref={me} name="traveller">
      <mesh castShadow position={[0, 0.52, 0]} material={clay(C.ink)}>
        <capsuleGeometry args={[0.21, 0.62, 6, 12]} />
      </mesh>
    </group>
  )
}
const _fw = new THREE.Vector3(), _fa = new THREE.Vector3()

/** Foam rings around each island for ART's water plane. */
const WATER_ISLANDS = ISLAND_POS.map((p) => [p.x, p.z, 6.2] as [number, number, number])

/**
 * The finale pull-back. When core.cinematic.on flips true (L09 complete), this
 * eases the camera up and back past the last island until the whole lit path
 * lies in frame, then holds a very slow drift. Releases when it flips off.
 */
function FinaleCam() {
  const { camera } = useThree()
  const st = useRef({ seeded: false, pos: new THREE.Vector3(), look: new THREE.Vector3() })
  useFrame((s, dt) => {
    if (!cinematic.on) { st.current.seeded = false; return }
    const k = st.current
    if (!k.seeded) { k.seeded = true; k.pos.copy(camera.position); k.look.copy(PATH_MID) }
    const az = 2.86 + (RM ? 0 : Math.sin(s.clock.elapsedTime * 0.04) * 0.09)
    _fw.set(PATH_MID.x + Math.sin(az) * 76, PATH_MID.y + 27, PATH_MID.z + Math.cos(az) * 76)
    k.pos.lerp(_fw, 1 - Math.exp(-dt * 1.1))
    _fa.set(PATH_MID.x, PATH_MID.y + 1.5, PATH_MID.z - 10)
    k.look.lerp(_fa, 1 - Math.exp(-dt * 1.5))
    camera.position.copy(k.pos)
    camera.lookAt(k.look)
  })
  return null
}

/** ?qa: attach 3D helpers onto window.__journey.v5 (set up below). */
function QaProbe() {
  const { camera, gl, scene } = useThree()
  useEffect(() => {
    const j = (window as any).__journey?.v5; if (!j) return
    const px = (w: THREE.Vector3) => {
      const r = gl.domElement.getBoundingClientRect(); const v = w.clone().project(camera)
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }
    }
    j.project = (x: number, y: number, z: number, id: IslandId) => px(islandPos(id).clone().add(new THREE.Vector3(x, y, z)))
    j.debug = { pos: () => player.pos.toArray(), cam: () => camera.position.toArray(), cIdx: () => skyDebug.cIdx, night: () => env.night }
    j.find = (name: string) => {
      const o = scene.getObjectByName(name); if (!o) return null
      const w = new THREE.Vector3(); o.getWorldPosition(w); return px(w)
    }
  }, [camera, gl, scene])
  return null
}

export default function World5() {
  const [dpr, setDpr] = useState(LITE ? 1 : Math.min(1.5, window.devicePixelRatio || 1))
  const [fx, setFx] = useState(!LITE)

  // ?qa: the V5 side of the test hook. project/find are attached by QaProbe.
  useEffect(() => {
    if (!QA) return
    const w = window as any
    const j = (w.__journey ??= {})
    j.v5 = {
      state: () => useV5.getState(),
      complete: (id: IslandId) => useV5.getState().complete(id),
      goto: (id: IslandId) => {
        const i = islandIndex(id); if (i < 0) return
        const p = ISLAND_POS[i].clone().add(ENTRY)
        player.pos.copy(p); player.vel.set(0, 0, 0); player.island = id
        w.__journey?.player?.teleport?.(p.x, p.y, p.z)
      },
      project: null, find: null,
    }
    // &at=<ID> teleports; &unlock marks every island before it complete; &finale completes all
    const q = new URLSearchParams(location.search)
    if (q.has('finale')) for (const id of V5_ORDER) useV5.getState().complete(id)
    const at = q.get('at') as IslandId | null
    if (at && (V5_ORDER as readonly string[]).includes(at)) {
      if (q.has('unlock')) for (const id of V5_ORDER.slice(0, islandIndex(at))) useV5.getState().complete(id)
      // let the canvas mount first so the teleport lands after PLAYER seeds its spawn
      window.setTimeout(() => j.v5.goto(at), 400)
    }
  }, [])

  return (
    <>
      <Canvas shadows={LITE ? false : 'soft'} dpr={dpr}
        camera={{ fov: 38, near: 0.1, far: 340, position: [10, 7, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
        {!LITE && (
          <PerformanceMonitor
            onDecline={() => { setDpr(1); setFx(false) }}
            onIncline={() => setDpr(Math.min(1.75, window.devicePixelRatio || 1))} />
        )}
        <color attach="background" args={['#efe2cb']} />
        <fog attach="fog" args={['#efe2cb', 30, 85]} />
        <Sky5 />
        <Clouds />
        {ArtWater && (
          <Suspense fallback={null}>
            <Guard><ArtWater y={-14} islands={WATER_ISLANDS} /></Guard>
          </Suspense>
        )}
        <Hygiene />
        <Islands5 />
        {Player ? (
          <Suspense fallback={<FallbackRig />}>
            <Guard fallback={<FallbackRig />}><Player /></Guard>
          </Suspense>
        ) : (
          <FallbackRig />
        )}
        <FinaleCam />
        {QA && <QaProbe />}
        {!LITE && fx && (
          <Suspense fallback={null}><Guard><Effects /></Guard></Suspense>
        )}
      </Canvas>
      <Chrome />
    </>
  )
}
