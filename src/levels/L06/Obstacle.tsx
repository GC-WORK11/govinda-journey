/**
 * L06 Remote — V6: a tiny voxel city. The player boards the helicopter on the
 * pad (E), follows the warm route rings out over the rooftops, and sets down on
 * the far landing rock — a plank bridge folds out so they can walk back.
 * The flight is the challenge (~30–40 s). Grants `remote`.
 *
 * PLAYER's src/v5/player/Heli.tsx is not landed yet — the local <Heli> in
 * kit.v5.tsx + the flight loop here are the stub with the same job: board via
 * interactable, fly with real input (input.ts / joystick), land to finish.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { input, isDown, now } from '../../v5/player/input'
import { Prop } from '../../v5/art/Dressing'
import { LEVELS } from '../registry'
import { PillHint } from '../L01/shared.v5'
import { C, clay, CityTowers, Baked, Heli, RouteRing, HeliPad, PadRock, BlockBox, DESK_P, LAPTOP_P, PHONE_P, type BPart } from './kit.v5'

const V3 = THREE.Vector3
type V3T = [number, number, number]

const HINT = LEVELS.find((l) => l.id === 'L06')?.hint ?? 'Board the helicopter'

/* soft paper scrim behind the caption band — same trick as .v5::before, but
   island-side so the shared chrome stays untouched. z 5 sits under .v5 (z 6). */
let scrimCSSIn = false
function useCapScrim(on: boolean) {
  useEffect(() => {
    if (!on || typeof document === 'undefined') return
    if (!scrimCSSIn) {
      scrimCSSIn = true
      const s = document.createElement('style')
      s.textContent = `.gjv5-l06-capscrim{position:fixed;top:110px;left:50%;transform:translateX(-50%);width:min(700px,94vw);height:150px;z-index:5;pointer-events:none;background:radial-gradient(ellipse 55% 60% at 50% 55%,color-mix(in srgb,var(--paper) 66%,transparent),color-mix(in srgb,var(--paper) 0%,transparent) 76%)}`
      document.head.appendChild(s)
    }
    const el = document.createElement('div')
    el.className = 'gjv5-l06-capscrim'
    document.body.appendChild(el)
    return () => { el.remove() }
  }, [on])
}

/* ---------------------------------- layout ---------------------------------- */

const PAD_HOME = new V3(1.7, 0.045, 2.6)                 // helipad on the island
const ROCK = new V3(-9.0, -0.06, -3.0)                   // the far landing rock
const PAD_FAR = ROCK.clone().add(new V3(0, 0.1, 0))      // pad centre on the rock
const STEP_OUT = ROCK.clone().add(new V3(0.9, 0.12, 0.6))
const BRIDGE_A = new V3(-5.35, 0.08, -2.35)              // rim mouth
const BRIDGE_B = new V3(-7.75, 0.08, -2.85)              // rock edge
/** Plank centres + shared yaw for the instanced bridge. */
const PLANKS = Array.from({ length: 6 }, (_, i) => BRIDGE_A.clone().lerp(BRIDGE_B, (i + 0.5) / 6))
const PLANK_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(BRIDGE_B.x - BRIDGE_A.x, BRIDGE_B.z - BRIDGE_A.z) + Math.PI / 2, 0))
const EXIT_L = new V3(0, 0, -4.0)

/** Route rings — ONE clear flight line: lift off, arc out over the west rim,
 *  set down on the far rock. */
const RINGS: V3T[] = [
  [-1.5, 1.7, 3.1], [-3.8, 1.9, 2.3], [-5.8, 1.7, 0.2], [-7.4, 1.4, -1.7], [-8.4, 1.0, -2.7],
]

/** Towers: pos, w, d, h, tone, seed. All |x|>1.5 — clear of the walk corridor.
 *  The deep-north pair sits at |x|>3.3 and everything stays low, so the band
 *  behind the caption is open sky. */
const TOWERS: [number, number, number, number, number, string, number][] = [
  [2.95, 1.35, 1.35, 1.1, 2.2, C.facade1, 3],
  [3.75, -0.7, 1.25, 1.25, 1.5, C.facade2, 7],
  [3.5, -2.5, 1.15, 1.0, 1.0, C.facade3, 11],
  [-3.4, -2.55, 1.45, 1.2, 1.0, C.facade1, 5],
  [-3.75, -0.9, 1.25, 1.15, 1.5, C.facade2, 13],
  [-3.5, 1.75, 1.15, 1.05, 1.8, C.facade4, 17],
  [-2.6, 3.4, 1.0, 0.9, 1.3, C.facade3, 19],
  [4.35, 1.6, 0.9, 0.9, 1.5, C.facade4, 23],
]

/** Everything static bakes into ONE vertex-coloured mesh (see kit's Baked):
    street + curbs + plaza, tower roofs/parapets, ACs, antennas, both pads. */
const CITY_PARTS: BPart[] = (() => {
  const parts: BPart[] = [
    { g: 'box', p: [-1.7, 0.012, 0.3], s: [1.3, 0.024, 6.6], c: C.asphalt },
    { g: 'box', p: [-2.42, 0.014, 0.3], s: [0.14, 0.028, 6.6], c: C.curb },
    { g: 'box', p: [-0.98, 0.014, 0.3], s: [0.14, 0.028, 6.6], c: C.curb },
    { g: 'cyl', p: [1.7, 0.014, 2.4], s: [3.4, 0.028, 3.4], c: C.curb },
  ]
  for (const [x, z, w, d, h] of TOWERS) {
    parts.push(
      { g: 'box', p: [x, h + 0.02, z], s: [w * 0.94, 0.05, d * 0.94], c: C.roof },
      { g: 'box', p: [x - (w / 2 - 0.02), h + 0.06, z], s: [0.04, 0.09, d * 0.9], c: C.roofDark },
      { g: 'box', p: [x + (w / 2 - 0.02), h + 0.06, z], s: [0.04, 0.09, d * 0.9], c: C.roofDark },
      { g: 'box', p: [x, h + 0.06, z - (d / 2 - 0.02)], s: [w * 0.9, 0.09, 0.04], c: C.roofDark },
      { g: 'box', p: [x, h + 0.06, z + (d / 2 - 0.02)], s: [w * 0.9, 0.09, 0.04], c: C.roofDark },
    )
  }
  // rooftop AC units (body + flat fan disc)
  for (const [x, y, z, s] of [[2.95, 2.28, 1.1, 1], [3.75, 1.58, -0.9, 1.2], [-3.5, 1.86, 1.75, 0.9]] as const) {
    parts.push(
      { g: 'box', p: [x, y, z], s: [0.3 * s, 0.18 * s, 0.24 * s], c: C.stone },
      { g: 'cyl', p: [x, y + 0.1 * s, z], s: [0.14 * s, 0.015, 0.14 * s], c: C.roofDark },
    )
  }
  // rooftop antennas (mast + crossbar + warm beacon)
  for (const [x, y, z, h] of [[3.5, 1.04, -2.5, 0.9], [-3.4, 1.06, -2.55, 0.7]] as const) {
    parts.push(
      { g: 'cyl', p: [x, y + h / 2, z], s: [0.024, h, 0.04], c: C.ink2 },
      { g: 'cyl', p: [x, y + h * 0.72, z], s: [0.016, 0.24, 0.016], r: [0, 0, Math.PI / 2], c: C.ink2 },
      { g: 'sph', p: [x, y + h + 0.03, z], s: [0.07, 0.07, 0.07], c: C.warm },
    )
  }
  // both helipads' paving + corner stones (the lit marker ring stays a mesh)
  for (const [cx, cy, cz, r] of [[PAD_HOME.x, PAD_HOME.y, PAD_HOME.z, 0.95], [ROCK.x, ROCK.y + 0.09, ROCK.z, 0.8]] as const) {
    parts.push(
      { g: 'cyl', p: [cx, cy, cz], s: [r * 2, 0.045, r * 2 + 0.12], c: C.curb },
      { g: 'cyl', p: [cx, cy + 0.027, cz], s: [r, 0.006, r], c: C.stoneLight },
    )
    for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]] as const)
      parts.push({ g: 'box', p: [cx + sx * r * 0.98, cy + 0.045, cz + sz * r * 0.98], s: [0.08, 0.05, 0.08], c: C.stone })
  }
  return parts
})()

const ACCEL = 8.0, DAMP = 2.3, VMAX = 4.4, ALT_K = 3.2
const BOUND = 11.5, Y_MIN = 0.4, Y_MAX = 5.6

/* ---------------------------------- obstacle ---------------------------------- */

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  useCapScrim(active)
  const root = useRef<THREE.Group>(null)
  const heli = useRef<THREE.Group>(null)
  const rotor = useRef<THREE.Group>(null)
  const tailRotor = useRef<THREE.Group>(null)
  const ringsG = useRef<THREE.Group>(null)
  const bridgeG = useRef<THREE.InstancedMesh>(null)
  const bridgeWalk = useRef<THREE.Mesh>(null)
  const boardMarker = useRef<THREE.Object3D>(null)
  const cam = useThree((s) => s.camera)

  const [phase, setPhase] = useState<'walk' | 'fly' | 'land' | 'done'>(done ? 'done' : 'walk')
  const [passed, setPassed] = useState(done ? RINGS.length : 0)

  const sim = useRef({
    pos: (done ? PAD_FAR : PAD_HOME).clone().add(new V3(0, 0.02, 0)),
    vel: new V3(), yaw: done ? 0.8 : 2.4, rotor: 0,
    t: 0, landT: 0, boardT: 0,
    auto: null as THREE.Vector3[] | null,       // solver autopilot waypoints
    leftPad: false,                             // set once the heli leaves the home pad zone
  })
  const phaseRef = useRef(phase); phaseRef.current = phase
  const passedRef = useRef(passed); passedRef.current = passed
  const cineOwned = useRef(false)
  const solved = useRef(done)
  const J = () => (window as any).__journey

  // static tower AABBs for heli bump-collide
  const boxes = useMemo(() => TOWERS.map(([x, z, w, d, h]) =>
    ({ minX: x - w / 2 - 0.32, maxX: x + w / 2 + 0.32, minZ: z - d / 2 - 0.32, maxZ: z + d / 2 + 0.32, maxY: h + 0.1 })), [])

  // the bridge is one InstancedMesh: geometry+material shared, colour per plank
  const plankGeo = useMemo(() => new THREE.BoxGeometry(1.05, 0.05, 0.34), [])
  const plankMat = useMemo(() => clay('#ffffff'), [])
  useEffect(() => {
    const m = bridgeG.current
    if (!m) return
    for (let i = 0; i < 6; i++) {
      m.setColorAt(i, _col.set(i % 2 ? C.wood : C.woodLight))
      _pm.compose(_pv.copy(PLANKS[i]), PLANK_Q, _pv2.setScalar(0.001))
      m.setMatrixAt(i, _pm)
    }
    m.instanceColor!.needsUpdate = true
    m.instanceMatrix.needsUpdate = true
  }, [plankGeo, plankMat])

  useEffect(() => { if (done) { setPhase('done'); setPassed(RINGS.length) } }, [done])

  /* ------------------------------- interactable ------------------------------- */
  const board = useMemo<core.Interactable>(() => {
    const at = new V3()
    return {
      id: `${id}-heli`,
      at: () => (boardMarker.current ? (boardMarker.current as THREE.Object3D).getWorldPosition(at) : at.set(0, -99, 0)),
      radius: 1.5,
      label: 'Board the helicopter',
      enabled: () => phaseRef.current === 'walk' && !solved.current,
      use: () => {
        if (phaseRef.current !== 'walk') return
        setPhase('fly')
        sim.current.boardT = sim.current.t
        core.player.frozen = true
        core.playerEmote.name = 'sit'
        if (!core.cinematic.on) { core.cinematic.on = true; cineOwned.current = true }
      },
    }
  }, [id])
  core.useInteractable(board)

  /* --------------------------------- flight --------------------------------- */
  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = sim.current, ph = phaseRef.current
    s.t += dt

    const h = heli.current
    if (h) {
      if (ph === 'walk' || ph === 'done') {
        // parked: gentle idle on the pad
        s.rotor = THREE.MathUtils.lerp(s.rotor, ph === 'done' ? 0 : 0.12, dt * 2)
      }
      h.position.copy(s.pos)
      h.rotation.set(0, s.yaw, 0)
      // lean into motion
      const lean = Math.min(0.24, s.vel.length() * 0.05)
      h.rotation.x = -Math.sin(s.yaw) * s.vel.dot(_f) * 0.028 - lean * 0.4
      h.rotation.z = Math.cos(s.yaw) * s.vel.dot(_r) * 0.03
    }
    if (rotor.current) rotor.current.rotation.y += dt * (4 + s.rotor * 34)
    if (tailRotor.current) tailRotor.current.rotation.z -= dt * (4 + s.rotor * 34) * 5

    /* ------------------------------- flying ------------------------------- */
    if (ph === 'fly') {
      s.rotor = THREE.MathUtils.lerp(s.rotor, 1, Math.min(1, dt * 2.5))
      const sinceBoard = s.t - s.boardT

      // wish dir — heli-yaw relative (camera chases behind)
      let ix = input.joy.x, iz = input.joy.y
      if (isDown('KeyW', 'ArrowUp')) iz -= 1
      if (isDown('KeyS', 'ArrowDown')) iz += 1
      if (isDown('KeyA', 'ArrowLeft')) ix -= 1
      if (isDown('KeyD', 'ArrowRight')) ix += 1
      _f.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw))
      _r.set(-_f.z, 0, _f.x)
      _wish.set(0, 0, 0).addScaledVector(_f, -iz).addScaledVector(_r, ix)
      if (_wish.lengthSq() > 1) _wish.normalize()

      // solver autopilot overrides the stick
      const auto = s.auto
      if (auto && auto.length) {
        _wish.copy(auto[0]).sub(s.pos); _wish.y = 0
        const d = _wish.length()
        if (d < 0.7 && auto[0].distanceTo(PAD_FAR) > 1.2) auto.shift()
        else _wish.normalize()
        if (!auto.length) s.auto = null
      }

      // E mid-flight: ride home on the autopilot (always a way back down)
      if (now() - input.useAt < 200) { input.useAt = -1e9; s.auto = [PAD_HOME.clone().setY(1.2)] }

      // takeoff: first ~1.3 s is an auto climb, stick input joins after
      const takeoff = sinceBoard < 1.3
      s.vel.x += _wish.x * ACCEL * dt * (takeoff ? 0.25 : 1)
      s.vel.z += _wish.z * ACCEL * dt * (takeoff ? 0.25 : 1)

      // altitude: weak spring toward the next ring's height (or cruise) +
      // Space / Shift manual trim — touch players never *need* the trim.
      const next = auto && auto.length ? auto[0] : (passedRef.current < RINGS.length ? _ringPos : PAD_FAR)
      if (passedRef.current < RINGS.length && !(auto && auto.length)) _ringPos.set(RINGS[passedRef.current][0], RINGS[passedRef.current][1], RINGS[passedRef.current][2])
      const targetY = takeoff ? 1.7 : (auto && auto.length ? auto[0].y : next === PAD_FAR ? Math.max(PAD_FAR.y + 0.7, s.pos.y - 2 * dt) : next.y)
      s.vel.y += (targetY - s.pos.y) * ALT_K * dt * (takeoff ? 2.2 : 1)
      if (isDown('Space')) s.vel.y += 5 * dt
      if (isDown('ShiftLeft', 'ShiftRight')) s.vel.y -= 5 * dt

      // damp + clamp + integrate
      const damp = Math.exp(-DAMP * dt)
      s.vel.x *= damp; s.vel.z *= damp; s.vel.y *= Math.exp(-3.2 * dt)
      const hs = Math.hypot(s.vel.x, s.vel.z)
      if (hs > VMAX) { s.vel.x *= VMAX / hs; s.vel.z *= VMAX / hs }
      s.vel.y = THREE.MathUtils.clamp(s.vel.y, -3, 3)
      s.pos.addScaledVector(s.vel, dt)

      // yaw faces travel (or next ring while hovering)
      if (hs > 0.5) s.yaw = THREE.MathUtils.lerp(s.yaw, Math.atan2(-s.vel.x, -s.vel.z), Math.min(1, dt * 5))

      // bounds: soft wall, ceiling/floor
      const rad = Math.hypot(s.pos.x, s.pos.z)
      if (rad > BOUND) { const k = BOUND / rad; s.pos.x *= k; s.pos.z *= k; s.vel.x *= 0.4; s.vel.z *= 0.4 }
      if (s.pos.y < Y_MIN) { s.pos.y = Y_MIN; s.vel.y = Math.abs(s.vel.y) * 0.3 }
      if (s.pos.y > Y_MAX) { s.pos.y = Y_MAX; s.vel.y = -Math.abs(s.vel.y) * 0.3 }

      // bump off towers (soft push-out, small bounce)
      if (s.pos.y < 6) {
        for (const b of boxes) {
          if (s.pos.y > b.maxY) continue
          if (s.pos.x > b.minX && s.pos.x < b.maxX && s.pos.z > b.minZ && s.pos.z < b.maxZ) {
            const dxl = s.pos.x - b.minX, dxr = b.maxX - s.pos.x
            const dzl = s.pos.z - b.minZ, dzr = b.maxZ - s.pos.z
            const m = Math.min(dxl, dxr, dzl, dzr)
            if (m === dxl) { s.pos.x = b.minX; s.vel.x = -Math.abs(s.vel.x) * 0.25 }
            else if (m === dxr) { s.pos.x = b.maxX; s.vel.x = Math.abs(s.vel.x) * 0.25 }
            else if (m === dzl) { s.pos.z = b.minZ; s.vel.z = -Math.abs(s.vel.z) * 0.25 }
            else { s.pos.z = b.maxZ; s.vel.z = Math.abs(s.vel.z) * 0.25 }
          }
        }
      }

      // rings
      if (passedRef.current < RINGS.length) {
        _ringPos.set(RINGS[passedRef.current][0], RINGS[passedRef.current][1], RINGS[passedRef.current][2])
        if (s.pos.distanceTo(_ringPos) < 1.0) setPassed(passedRef.current + 1)
      }

      // landing checks
      const dFar = _v.copy(PAD_FAR); dFar.y = s.pos.y
      const dHome = _v2.copy(PAD_HOME); dHome.y = s.pos.y
      if (s.pos.distanceTo(dHome) > 2.5) s.leftPad = true
      if (passedRef.current >= RINGS.length && s.pos.distanceTo(dFar) < 1.15 && hs < 3.5) setPhase('land')
      // land back home — only after it has actually left and returned low+slow
      else if (s.leftPad && sinceBoard > 3.5 && s.pos.distanceTo(dHome) < 0.9 && s.pos.y < 1.5 && hs < 2.5) setPhase('land')
    }

    /* ------------------------------- landing ------------------------------- */
    if (ph === 'land') {
      const atHome = s.pos.distanceTo(PAD_HOME) < 4
      const target = atHome ? PAD_HOME : PAD_FAR
      s.landT += dt
      s.pos.x = THREE.MathUtils.lerp(s.pos.x, target.x, Math.min(1, dt * 3.2))
      s.pos.z = THREE.MathUtils.lerp(s.pos.z, target.z, Math.min(1, dt * 3.2))
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, target.y + 0.02, Math.min(1, dt * 2.6))
      s.vel.multiplyScalar(Math.exp(-4 * dt))
      s.rotor = THREE.MathUtils.lerp(s.rotor, 0.15, dt * 1.4)
      s.yaw = THREE.MathUtils.lerp(s.yaw, atHome ? 2.4 : 0.8, Math.min(1, dt * 2))
      if (s.landT > 0.9) {
        s.landT = 0
        if (atHome) {
          setPhase('walk')
          s.leftPad = false
          release()
          _v.copy(PAD_HOME).add(_v2.set(-1.0, 0.05, 0.6))
          const w1 = root.current ? root.current.localToWorld(_v) : _v
          J()?.player?.teleport?.(w1.x, w1.y, w1.z)
        } else {
          setPhase('done'); solved.current = true
          const w2 = root.current ? root.current.localToWorld(_v.copy(STEP_OUT)) : _v.copy(STEP_OUT)
          J()?.player?.teleport?.(w2.x, w2.y, w2.z)
          window.setTimeout(() => { release(); complete() }, 450)
        }
      }
    }

    /* ----------------------------- rider + camera ----------------------------- */
    if (ph === 'fly' || ph === 'land') {
      // seat the traveller: teleport is the only external writer of player pos
      _seat.copy(s.pos); _seat.y += 0.24
      const sw = root.current ? root.current.localToWorld(_seat) : _seat
      J()?.player?.teleport?.(sw.x, sw.y, sw.z)
      // chase cam (world space)
      _f.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw))
      const hw = root.current ? root.current.localToWorld(_v.copy(s.pos)) : s.pos
      _camP.copy(hw).addScaledVector(_f, -5.4); _camP.y = hw.y + 2.15
      cam.position.lerp(_camP, 1 - Math.exp(-4.2 * dt))
      _look.copy(hw).addScaledVector(_f, 2.2); _look.y += 0.3
      cam.lookAt(_look)
    }
  })

  function release() {
    core.player.frozen = false
    core.playerEmote.name = null
    if (cineOwned.current) { core.cinematic.on = false; cineOwned.current = false }
  }
  useEffect(() => () => {
    release()
    if (bridgeWalk.current) core.walkables.delete(bridgeWalk.current)
  }, [])

  /* ------------------------------- ring visuals ------------------------------- */
  useFrame((st) => {
    const t = st.clock.elapsedTime
    ringsG.current?.children.forEach((g, i) => {
      const isNext = i === passedRef.current
      g.visible = i >= passedRef.current
      const k = isNext ? 1 + Math.sin(t * 4) * 0.07 : 1
      g.scale.setScalar(k)
      g.position.y = RINGS[i][1] + Math.sin(t * 0.9 + i) * 0.07
      g.rotation.y = t * 0.25 + i
    })
    // bridge planks unfold (one InstancedMesh — matrices carry the stagger)
    if (bridgeG.current) {
      const k = phaseRef.current === 'done' ? Math.min(1, (bridgeG.current.userData.t = (bridgeG.current.userData.t ?? 0) + 0.016) / 0.9) : 0
      for (let i = 0; i < 6; i++) {
        const kk = THREE.MathUtils.clamp(k * 6 - i * 0.55, 0, 1)
        _pm.compose(_pv.set(PLANKS[i].x, PLANKS[i].y, PLANKS[i].z), PLANK_Q, _pv2.setScalar(Math.max(0.001, kk)))
        bridgeG.current.setMatrixAt(i, _pm)
      }
      bridgeG.current.instanceMatrix.needsUpdate = true
      if (k >= 1 && bridgeWalk.current && !core.walkables.has(bridgeWalk.current)) core.walkables.add(bridgeWalk.current)
    }
  })

  /* ---------------------------------- solver ---------------------------------- */
  useEffect(() => {
    const w = window as any
    // qa/dev handle: world-space flight state for the real-input verify script
    w.__l06dbg = {
      phase: () => phaseRef.current,
      passed: () => passedRef.current,
      heli: () => root.current ? root.current.localToWorld(sim.current.pos.clone()).toArray() : null,
      next: () => {
        if (!root.current) return null
        const t = passedRef.current < RINGS.length ? RINGS[passedRef.current] : PAD_FAR.toArray()
        return root.current.localToWorld(new V3(t[0], t[1], t[2])).toArray()
      },
      pad: () => root.current ? root.current.localToWorld(PAD_HOME.clone()).toArray() : null,
    }
    if (!w.__journey?.solve) return
    const tp = async (v: THREE.Vector3, ox = 0, oz = 0) => {
      for (let i = 0; i < 40 && !(window as any).__journey?.player?.teleport; i++) await new Promise((r) => setTimeout(r, 100))
      const lw = root.current!.localToWorld(v.clone().add(new THREE.Vector3(ox, 0, oz)))
      ;(window as any).__journey.player.teleport(lw.x, lw.y + 0.05, lw.z)
    }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    w.__journey.solve = {
      ...(w.__journey.solve || {}),
      [id]: async () => {
        if (core.useV5.getState().done.includes(id)) return
        await tp(PAD_HOME, -0.9, 0.4)
        await sleep(500)
        core.interactables.get(`${id}-heli`)?.use()
        await sleep(400)
        // fly the route on autopilot waypoints (same physics the player uses)
        sim.current.auto = RINGS.map((r) => new V3(r[0], r[1], r[2])).concat([PAD_FAR.clone()])
        // wait for the touchdown + gate
        for (let i = 0; i < 400 && !solved.current; i++) await sleep(120)
        await tp(EXIT_L, 0, 0)
      },
    }
  }, [id])

  /* ---------------------------------- render ---------------------------------- */
  return (
    <group ref={root}>
      {/* ------- the city — towers as one atlas mesh, statics as one vc mesh ------- */}
      <CityTowers towers={TOWERS} />
      <Baked parts={CITY_PARTS} />
      {TOWERS.map(([x, z, w, d, h], i) => (
        <BlockBox key={i} position={[x, h / 2, z]} args={[w, h + 0.4, d]} kind="block" />
      ))}
      {/* rooftops */}
      <Prop name="water_tower" position={[-3.75, 1.54, -0.9]} fit={0.75} />
      {/* street life */}
      <Prop name="streetlight" position={[-1.05, 0.03, 1.9]} fit={0.95} />
      <Prop name="streetlight" position={[-2.35, 0.03, -0.6]} fit={0.95} rotation={[0, Math.PI, 0]} />
      <Prop name="streetlight" position={[-1.05, 0.03, -2.6]} fit={0.95} />
      <Prop name="city_bench" position={[-2.6, 0.02, 2.6]} fit={0.5} rotation={[0, 0.9, 0]} />
      <Prop name="city_bush" position={[-2.7, 0.02, 3.5]} fit={0.42} />
      <Prop name="city_bush" position={[2.3, 0.02, 0.4]} fit={0.36} />
      <Prop name="box_a" position={[-0.6, 0.02, -3.7]} fit={0.4} />
      <Prop name="box_a" position={[1.3, 0.02, -3.85]} fit={0.32} rotation={[0, 0.7, 0]} />

      {/* ------- the Remote vignette: desk + laptop + phone, beside the path ------- */}
      <group position={[3.0, 0, 3.0]} rotation={[0, -0.55, 0]}>
        <Baked parts={DESK_P} />
        <group position={[0, 0.49, -0.06]} rotation={[0, -0.15, 0]}>
          <Baked parts={LAPTOP_P} scale={1.7} />
        </group>
      </group>
      <BlockBox position={[3.0, 0.3, 3.0]} args={[1.2, 0.62, 0.7]} kind="block" />
      <group position={[1.15, 0, 3.75]} rotation={[0, -0.4, 0]} scale={1.6}>
        <Baked parts={PHONE_P} />
      </group>

      {/* ------- home helipad + parked helicopter ------- */}
      <HeliPad position={PAD_HOME.toArray()} r={0.95} />
      <group ref={heli} position={PAD_HOME.toArray()}>
        <Heli rotorRef={rotor} tailRef={tailRotor} />
      </group>
      <object3D ref={boardMarker} position={PAD_HOME.clone().add(new V3(0, 0.3, 0))} />
      <BlockBox position={[PAD_HOME.x, 0.5, PAD_HOME.z + 0.4]} args={[0.7, 1.0, 1.8]} kind="block" />

      {/* ------- route rings ------- */}
      <group ref={ringsG}>
        {RINGS.map((r, i) => (
          <group key={i} position={r}>
            <RouteRing r={0.85} />
          </group>
        ))}
      </group>

      {/* ------- the far landing rock ------- */}
      <group position={ROCK.toArray()}>
        <PadRock r={1.5} />
        <HeliPad position={[0, 0.09, 0]} r={0.8} lit={passed >= RINGS.length} />
      </group>
      <RockWalkable />
      {/* plank bridge: rim mouth → rock, unfolds after touchdown (1 instanced call) */}
      <instancedMesh ref={bridgeG} args={[undefined, undefined, 6]} geometry={plankGeo} material={plankMat} castShadow frustumCulled={false} />
      <mesh ref={bridgeWalk} position={BRIDGE_A.clone().lerp(BRIDGE_B, 0.5).toArray()} rotation={[0, Math.atan2(BRIDGE_B.x - BRIDGE_A.x, BRIDGE_B.z - BRIDGE_A.z), 0]} visible={false}>
        <boxGeometry args={[0.95, 0.08, 2.5]} />
      </mesh>

      {/* the standard bottom hint pill (V4's "Tap a task on the phone") */}
      <PillHint text={active && !done && !solved.current ? (phase === 'fly' ? 'Follow the warm rings — set down on the far pad' : HINT) : null} />
    </group>
  )
}

/** Registers the far rock's top as a walkable disc. */
function RockWalkable() {
  const ref = useRef<THREE.Mesh>(null)
  core.useWalkable(ref)
  return <mesh ref={ref} position={ROCK.clone().add(new V3(0, 0.06, 0)).toArray()} visible={false}><cylinderGeometry args={[1.15, 1.15, 0.1, 16]} /></mesh>
}

const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _wish = new THREE.Vector3()
const _ringPos = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3()
const _seat = new THREE.Vector3(), _camP = new THREE.Vector3(), _look = new THREE.Vector3()
const _pm = new THREE.Matrix4(), _pv = new THREE.Vector3(), _pv2 = new THREE.Vector3(), _col = new THREE.Color()
