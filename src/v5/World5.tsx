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
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { V5_ORDER, useV5, player, cinematic, type IslandId } from './core'
import { ISLAND_POS, ENTRY, PATH_MID, islandIndex, islandPos } from './world/layout'
import { Island5, purgeCorridors } from './world/Island5'
import { Bridge5 } from './world/Bridge5'
import { hasObstacle, Player, ArtWater, Guard } from './world/modules'
import { useWorldUI } from './world/progress'
import { input, now } from './player/input'
import Sky5, { skyDebug } from './world/Sky5'
import { env } from '../world/sky'
import { Clouds } from '../world/Clouds'
import { C, clay } from '../world/kit'
import Chrome from './ui/Chrome'
import Pet from './pet/Pet'
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
    const sweep = () => {
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !(o as THREE.Mesh).geometry) o.visible = false
      })
      purgeCorridors() // nothing may wall off the path corridor
    }
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
/** Keeps the sky dome centred on the camera — a skybox. With the dome at a
 * fixed origin, the finale camera (~160 out) saw its far wall past camera.far
 * and got the background colour as a giant disc; centre it on the camera and
 * the walls are always ~220 m away, safely inside the tight far plane. */
function Skybox() {
  const { scene } = useThree()
  const dome = useRef<THREE.Object3D | null>(null)
  useFrame((s) => {
    if (!dome.current) {
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        const mat = m.material as THREE.MeshStandardMaterial | undefined
        if (!dome.current && m.isMesh && m.geometry?.type === 'SphereGeometry' && mat?.side === THREE.BackSide)
          dome.current = m
      })
    }
    dome.current?.position.copy(s.camera.position)
  })
  return null
}

function FinaleCam() {
  const { camera, scene } = useThree()
  const st = useRef({ seeded: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), sea: null as THREE.Mesh | null })
  useFrame((s, dt) => {
    if (!cinematic.on) { st.current.seeded = false; return }
    const k = st.current
    if (!k.seeded) { k.seeded = true; k.pos.copy(camera.position); k.look.copy(PATH_MID) }
    // Veil the sea plane during the pull-back: the camera's far plane clips it
    // at ~340 m, and past the finale fog band it renders as one huge pale disc
    // with a hard arc edge against the night dome (V4 had no sea at all). It
    // pops back if the cinematic releases ("Keep walking").
    if (!k.sea) {
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (!k.sea && m.isMesh && m.geometry?.type === 'PlaneGeometry' && m.position.y < -10) k.sea = m
      })
    }
    if (k.sea) k.sea.visible = env.finale < 0.55
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

/** ?qa: attach 3D helpers onto window.__journey.v5 (the parent fills the rest —
 * effects run children-first, so write into the shared object, don't replace). */
function QaProbe() {
  const { camera, gl, scene } = useThree()
  const frameDt = useRef(0)
  useFrame((_, dt) => { frameDt.current = dt })
  useEffect(() => {
    const w = window as any
    const v5 = ((w.__journey ??= {}).v5 ??= {})
    const px = (w2: THREE.Vector3) => {
      const r = gl.domElement.getBoundingClientRect(); const v = w2.clone().project(camera)
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }
    }
    v5.project = (x: number, y: number, z: number, id: IslandId) => px(islandPos(id).clone().add(new THREE.Vector3(x, y, z)))
    v5.debug = { pos: () => player.pos.toArray(), cam: () => camera.position.toArray(), cIdx: () => skyDebug.cIdx, night: () => env.night }
    v5.find = (name: string) => {
      const o = scene.getObjectByName(name); if (!o) return null
      const w2 = new THREE.Vector3(); o.getWorldPosition(w2); return px(w2)
    }
    // perf snapshot for the V6 release check — draw calls, triangles, JS ms
    v5.stats = () => ({
      calls: gl.info.render.calls, tris: gl.info.render.triangles,
      geos: gl.info.memory.geometries, progs: gl.info.programs?.length ?? 0,
      dpr: gl.getPixelRatio(), ms: Math.round(frameDt.current * 10000) / 10,
    })
  }, [camera, gl, scene])
  return null
}

/**
 * Perf ladder: on sustained low fps, drop pixel ratio hard and kill the shadow
 * pass + post FX entirely. Sticky for shadows (recompiling them back per
 * incline would thrash); incline only restores a bit of pixel ratio.
 * Software-GL runs (QA, old laptops) reach the floor quickly — that's the
 * difference between 2 fps and playable.
 */
function PerfGuard({ onDpr, slow }: { onDpr: (n: number) => void; slow: () => void }) {
  const gl = useThree((s) => s.gl)
  const declined = useRef(false)
  return (
    <PerformanceMonitor iterations={5}
      onDecline={() => {
        if (declined.current) return
        declined.current = true
        gl.shadowMap.enabled = false
        gl.shadowMap.autoUpdate = false
        slow()
      }}
      onIncline={() => onDpr(Math.min(1.5, window.devicePixelRatio || 1))} />
  )
}

export default function World5() {
  const [dpr, setDpr] = useState(LITE ? 1 : Math.min(1.5, window.devicePixelRatio || 1))
  // the finale pull-back draws the whole chain at once — cap fill on it so
  // software GL survives the widest view in the game
  const finale = useWorldUI((s) => s.finale)
  const [fx, setFx] = useState(!LITE)
  const [water, setWater] = useState(!LITE)
  const slow = useCallback(() => { setDpr(0.6); setFx(false); setWater(false) }, [])

  // ?qa: the V5 side of the test hook. project/find are attached by QaProbe.
  // ?at=<ID> works for everyone (deep links); the rest of the hook is ?qa only.
  useEffect(() => {
    const q0 = new URLSearchParams(location.search)
    if (!QA && !q0.has('at')) return
    const w = window as any
    const j = (w.__journey ??= {})
    const v5 = (j.v5 ??= {})
    Object.assign(v5, {
      state: () => useV5.getState(),
      complete: (id: IslandId) => useV5.getState().complete(id),
      goto: (id: IslandId) => {
        const i = islandIndex(id); if (i < 0) return
        const p = ISLAND_POS[i].clone().add(ENTRY)
        player.pos.copy(p); player.vel.set(0, 0, 0); player.island = id
        w.__journey?.player?.teleport?.(p.x, p.y, p.z)
        // The DOM header/caption key off useWorldUI.idx — normally Sky5's
        // per-frame setIdx follows pos, but a backgrounded page pauses rAF and
        // the UI would stay frozen at 01/11. Drive it here too (it's a no-op
        // write when the value is already right).
        useWorldUI.getState().setIdx(i)
      },
    })
    // &at=<ID> teleports; &unlock marks every island before it complete; &finale completes all
    const q = q0
    if (QA && q.has('finale')) for (const id of V5_ORDER) useV5.getState().complete(id)
    const at = q.get('at') as IslandId | null
    if (at && (V5_ORDER as readonly string[]).includes(at)) {
      if (QA && q.has('unlock')) for (const id of V5_ORDER.slice(0, islandIndex(at))) useV5.getState().complete(id)
      // ?at is a QA pin, not a one-shot teleport. Everything that owns
      // player.pos can displace it later — PLAYER's lazy mount re-seeds, its
      // respawn/reset runs after a backgrounded restore (rAF freeze makes a
      // hidden position look stable right up until it isn't), and island
      // cutscenes (L09's finale lerps player.pos) drag the player at any
      // time. So keep correcting whenever the player is away from the
      // target for the life of the page; yield only to real movement input
      // (keys, joystick, or a live ?qa pressKey hold) so a human who loads
      // ?at=L05 and walks keeps control.
      const target = ISLAND_POS[islandIndex(at)].clone().add(ENTRY)
      const iv = window.setInterval(() => {
        const t = now()
        if (input.keys.size > 0 || input.joy.active ||
          [...input.synth.values()].some((d) => d > t)) {
          window.clearInterval(iv)
          return
        }
        // Near target + visible → nothing to do. Re-goto while hidden too:
        // it re-pins PLAYER's s.pos ahead of the restore frame.
        if (document.visibilityState === 'visible' &&
          player.pos.distanceToSquared(target) < 4) return
        v5.goto?.(at)
      }, 500)
      return () => window.clearInterval(iv)
    }
  }, [])

  return (
    <>
      <Canvas shadows={LITE ? false : 'soft'} dpr={finale ? Math.min(dpr, 0.85) : dpr}
        camera={{ fov: 38, near: 0.1, far: 340, position: [10, 7, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
        {!LITE && <PerfGuard onDpr={setDpr} slow={slow} />}
        <color attach="background" args={['#efe2cb']} />
        <fog attach="fog" args={['#efe2cb', 30, 85]} />
        <Sky5 />
        <Clouds />
        {ArtWater && water && (
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
        <Pet />
        <Skybox />
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
