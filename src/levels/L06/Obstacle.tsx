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
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { input, isDown, now } from '../../v5/player/input'
import { Prop } from '../../v5/art/Dressing'
import { C, clay, VoxelTower, AcBox, Antenna, Heli, RouteRing, HeliPad, PadRock, BlockBox, Laptop, PhoneOnStand, Desk } from './kit.v5'

const V3 = THREE.Vector3
type V3T = [number, number, number]

/* ---------------------------------- layout ---------------------------------- */

const PAD_HOME = new V3(1.7, 0.045, 2.6)                 // helipad on the island
const ROCK = new V3(-9.0, -0.06, -3.0)                   // the far landing rock
const PAD_FAR = ROCK.clone().add(new V3(0, 0.1, 0))      // pad centre on the rock
const STEP_OUT = ROCK.clone().add(new V3(0.9, 0.12, 0.6))
const BRIDGE_A = new V3(-5.35, 0.08, -2.35)              // rim mouth
const BRIDGE_B = new V3(-7.75, 0.08, -2.85)              // rock edge
const EXIT_L = new V3(0, 0, -4.0)

/** Route rings — ONE clear flight line: lift off, arc out over the west rim,
 *  set down on the far rock. */
const RINGS: V3T[] = [
  [-0.6, 1.9, 3.4], [-3.4, 2.0, 2.6], [-5.6, 1.8, 0.3], [-7.3, 1.4, -1.7], [-8.4, 1.0, -2.7],
]

/** Towers: pos, w, d, h, tone, seed. All |x|>1.5 — clear of the walk corridor.
 *  Low enough that the caption band stays on open sky. */
const TOWERS: [number, number, number, number, number, string, number][] = [
  [2.95, 1.35, 1.35, 1.1, 2.3, C.facade1, 3],
  [3.75, -0.7, 1.25, 1.25, 2.4, C.facade2, 7],
  [2.55, -2.75, 1.15, 1.0, 1.5, C.facade3, 11],
  [-2.15, -2.85, 1.45, 1.2, 1.7, C.facade1, 5],
  [-3.75, -0.9, 1.25, 1.15, 2.4, C.facade2, 13],
  [-3.5, 1.75, 1.15, 1.05, 1.8, C.facade4, 17],
  [-1.8, 3.45, 1.0, 0.9, 1.3, C.facade3, 19],
  [4.35, 1.6, 0.9, 0.9, 1.5, C.facade4, 23],
]

const ACCEL = 8.0, DAMP = 2.3, VMAX = 4.4, ALT_K = 3.2
const BOUND = 11.5, Y_MIN = 0.4, Y_MAX = 5.6

/* ---------------------------------- obstacle ---------------------------------- */

export default function Obstacle({ id, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const heli = useRef<THREE.Group>(null)
  const rotor = useRef<THREE.Group>(null)
  const ringsG = useRef<THREE.Group>(null)
  const bridgeG = useRef<THREE.Group>(null)
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
      if (s.landT > 1.6) {
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
          window.setTimeout(() => { release(); complete() }, 900)
        }
      }
    }

    /* ----------------------------- rider + camera ----------------------------- */
    if (ph === 'fly' || ph === 'land') {
      // seat the traveller: teleport is the only external writer of player pos
      _seat.copy(s.pos); _seat.y += 0.32
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
    // bridge planks unfold
    if (bridgeG.current) {
      const k = phaseRef.current === 'done' ? Math.min(1, (bridgeG.current.userData.t = (bridgeG.current.userData.t ?? 0) + 0.016) / 1.4) : 0
      bridgeG.current.children.forEach((p, i) => {
        const kk = THREE.MathUtils.clamp(k * 6 - i * 0.55, 0, 1)
        p.scale.setScalar(Math.max(0.001, kk))
      })
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
      {/* ------- the city ------- */}
      {/* paved street along the west side */}
      <mesh position={[-1.7, 0.012, 0.3]} material={clay(C.asphalt)} receiveShadow>
        <boxGeometry args={[1.3, 0.024, 6.6]} />
      </mesh>
      {[-0.68, 0.68].map((s) => (
        <mesh key={s} position={[-1.7 + s * 0.72, 0.014, 0.3]} material={clay(C.curb)} receiveShadow>
          <boxGeometry args={[0.14, 0.028, 6.6]} />
        </mesh>
      ))}
      {/* plaza paving under the pad */}
      <mesh position={[1.7, 0.014, 2.4]} material={clay(C.curb)} receiveShadow>
        <cylinderGeometry args={[1.7, 1.7, 0.028, 30]} />
      </mesh>

      {TOWERS.map(([x, z, w, d, h, tone, seed], i) => (
        <group key={i}>
          <VoxelTower position={[x, 0, z]} w={w} d={d} h={h} tone={tone} seed={seed} />
          <BlockBox position={[x, h / 2, z]} args={[w, h + 0.4, d]} kind="block" />
        </group>
      ))}
      {/* rooftops */}
      <Prop name="water_tower" position={[-3.75, 2.46, -0.9]} fit={0.9} />
      <AcBox position={[2.95, 2.38, 1.1]} />
      <AcBox position={[3.75, 2.48, -0.9]} s={1.2} />
      <Antenna position={[2.55, 1.54, -2.75]} h={0.9} />
      <AcBox position={[-3.5, 1.86, 1.75]} s={0.9} />
      <Antenna position={[-2.15, 1.76, -2.85]} h={0.7} />
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
        <Desk w={1.05} />
        <group position={[0, 0.49, -0.06]} rotation={[0, -0.15, 0]}>
          <Laptop s={1.7} open={0.34}>
            <mesh position={[0, 0, 0.001]}>
              <planeGeometry args={[0.5, 0.32]} />
              <meshBasicMaterial color="#2f2a26" />
            </mesh>
            <mesh position={[-0.1, 0.05, 0.002]}>
              <planeGeometry args={[0.22, 0.14]} />
              <meshBasicMaterial color="#8fb36b" />
            </mesh>
          </Laptop>
        </group>
      </group>
      <BlockBox position={[3.0, 0.3, 3.0]} args={[1.2, 0.62, 0.7]} kind="block" />
      <group position={[1.15, 0, 3.75]} rotation={[0, -0.4, 0]} scale={1.6}>
        <PhoneOnStand />
      </group>

      {/* ------- home helipad + parked helicopter ------- */}
      <HeliPad position={PAD_HOME.toArray()} r={0.95} />
      <group ref={heli} position={PAD_HOME.toArray()}>
        <Heli rotorRef={rotor} />
      </group>
      <object3D ref={boardMarker} position={PAD_HOME.clone().add(new V3(0, 0.3, 0))} />
      <BlockBox position={[PAD_HOME.x, 0.5, PAD_HOME.z]} args={[0.62, 1.0, 0.5]} kind="block" />

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
      {/* plank bridge: rim mouth → rock, unfolds after touchdown */}
      <group ref={bridgeG}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = BRIDGE_A.clone().lerp(BRIDGE_B, (i + 0.5) / 6)
          return (
            <mesh key={i} position={a.toArray()} rotation={[0, Math.atan2(BRIDGE_B.x - BRIDGE_A.x, BRIDGE_B.z - BRIDGE_A.z) + Math.PI / 2, 0]} scale={0.001} material={clay(i % 2 ? C.wood : C.woodLight)} castShadow>
              <boxGeometry args={[1.05, 0.05, 0.34]} />
            </mesh>
          )
        })}
      </group>
      <mesh ref={bridgeWalk} position={BRIDGE_A.clone().lerp(BRIDGE_B, 0.5).toArray()} rotation={[0, Math.atan2(BRIDGE_B.x - BRIDGE_A.x, BRIDGE_B.z - BRIDGE_A.z), 0]} visible={false}>
        <boxGeometry args={[0.95, 0.08, 2.5]} />
      </mesh>

      {/* the hint line — V4's pill, reworded for the flight */}
      {phase !== 'done' && !solved.current && (
        <group ref={(g) => { if (g && heli.current) g.position.copy(heli.current.position) }}>
          <Html fullscreen zIndexRange={[30, 0]}>
            <div className="gj-heli-hint">{phase === 'walk' ? 'board the helicopter on the pad' : 'follow the warm rings — set down on the far pad'}</div>
            <style>{`.gj-heli-hint{position:fixed;left:50%;bottom:16vh;transform:translateX(-50%);font:500 13px Inter,system-ui;color:#fbf6ee;text-shadow:0 1px 8px rgba(50,40,30,.45);letter-spacing:.02em;pointer-events:none}`}</style>
          </Html>
        </group>
      )}
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
