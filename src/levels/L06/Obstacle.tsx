/**
 * L06 Remote — the obstacle for the Remote island.
 *
 * A smog bank hides a shallow ford on the path (E pulses it clear with `sense`).
 * On the far side, a little pergola workspace and a dock. A switch sits on a
 * floating rock too far to jump to. E at the phone on the dock opens the phone
 * UI (DOM overlay); its joystick flies a small drone in the world while the
 * camera follows it. Nudge the switch → the bridge to the rock extends.
 * Close the phone → complete() → grants `remote`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { Tree, Bush, ClayPot, Rock } from '../../world/kit'
import PhoneUI, { type Stick } from './PhoneUI.v5'
import { C, clay, Desk, Stool, Pergola, Dock, Laptop, PhoneOnStand, SwitchRock, SwitchPost, Drone, Pad, BlockBox, useTerminalScreen } from './kit.v5'

type Phase = 'walk' | 'phone' | 'return'

/* layout (island-local) */
const STREAM_Z0 = 0.55, STREAM_Z1 = 2.0
const STONES: [number, number][] = [[-0.15, 1.72], [0.32, 1.33], [-0.08, 0.96], [0.3, 0.62]]
const DOCK = new THREE.Vector3(-4.55, 0.06, -1.55) // deck centre; extends −x
const DOCK_END = new THREE.Vector3(-5.85, 0.08, -1.55)
const PHONE_POS = new THREE.Vector3(-5.28, 0.09, -1.15)
const PAD_POS = new THREE.Vector3(-5.55, 0.1, -1.9)
const ROCK_POS = new THREE.Vector3(-8.25, -0.12, -2.95)
const SWITCH_TOP = ROCK_POS.clone().add(new THREE.Vector3(0, 1.02, 0.08))
const BRIDGE_A = new THREE.Vector3(-5.9, 0.1, -1.7)
const BRIDGE_B = new THREE.Vector3(-7.5, 0.06, -2.7)
const EXIT_L = new THREE.Vector3(0, 0, -4.2)
const HOVER_Y = 1.12

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const [phase, setPhase] = useState<Phase>('walk')
  const [hit, setHit] = useState(done)

  const stick = useRef<Stick>({ x: 0, y: 0 })
  const drone = useRef<THREE.Group>(null)
  const vel = useRef(new THREE.Vector3())
  const lever = useRef<THREE.Group>(null)
  const lamp = useRef<THREE.Mesh>(null)
  const bridgeG = useRef<THREE.Group>(null)
  const bridgeT = useRef(done ? 1 : 0)
  const smog = useRef<THREE.Group>(null)
  const ringMeshes = useRef<THREE.Mesh[]>([])
  const stoneMats = useRef<THREE.MeshStandardMaterial[]>([])
  const bridgeWalk = useRef<THREE.Mesh>(null)
  const camHold = useRef(0) // >0: this component still steers the camera
  const phoneAt = useRef(new THREE.Vector3())
  const pulseAt = useRef(new THREE.Vector3())
  const phoneMarker = useRef<THREE.Object3D>(null)
  const pulseMarker = useRef<THREE.Object3D>(null)

  const solved = useRef(done)
  const revealUntil = useRef(-1)

  /* ---------- interactables ---------- */
  const phoneInteract = useMemo<core.Interactable>(() => ({
    id: 'L06-phone',
    at: () => (phoneMarker.current ? phoneMarker.current.getWorldPosition(phoneAt.current) : phoneAt.current),
    radius: 1.5,
    label: 'Use the phone',
    enabled: () => phase === 'walk' || phase === 'return',
    use: () => {
      core.playerEmote.name = 'use'
      setPhase('phone')
    },
  }), [phase])
  const pulseInteract = useMemo<core.Interactable>(() => ({
    id: 'L06-pulse',
    at: () => (pulseMarker.current ? pulseMarker.current.getWorldPosition(pulseAt.current) : pulseAt.current),
    radius: 3.0,
    label: 'Pulse',
    enabled: () => core.has('sense') && phase === 'walk',
    use: () => {
      core.playerEmote.name = 'interact'
      setTimeout(() => { if (core.playerEmote.name === 'interact') core.playerEmote.name = null }, 1100)
      revealUntil.current = performance.now() / 1000 + 5
    },
  }), [phase])
  core.useInteractable(phase !== 'walk' && phase !== 'return' ? null : phoneInteract)
  core.useInteractable(pulseInteract)

  /* ---------- physical pieces ---------- */
  core.useWalkable(bridgeWalk, bridgeT.current > 0.35 || done)

  /* ---------- phone lifecycle ---------- */
  // while the phone is out this component owns the camera — PLAYER yields on
  // cinematic.on, which also freezes walking. Released after the return blend.
  const myCine = useRef(false)
  useEffect(() => {
    core.player.frozen = phase !== 'walk'
    if (phase === 'phone' && !core.cinematic.on) { core.cinematic.on = true; myCine.current = true }
    if (phase === 'walk') core.playerEmote.name = null
    if (phase === 'return') { // safety: never leave the traveller frozen if the drone misses home
      const t = setTimeout(() => setPhase((p) => (p === 'return' ? 'walk' : p)), 4500)
      return () => clearTimeout(t)
    }
  }, [phase])
  useEffect(() => () => {
    core.player.frozen = false
    core.playerEmote.name = null
    if (myCine.current) { core.cinematic.on = false; myCine.current = false }
    if (bridgeWalk.current) core.walkables.delete(bridgeWalk.current) // may have been added by the frame loop
  }, [])

  const closePhone = () => {
    setPhase(hit || solved.current ? 'walk' : 'return')
    if (solved.current && !done) complete()
  }
  const closePhoneRef = useRef(closePhone)
  closePhoneRef.current = closePhone

  /* ---------- solve hook (?qa): teleport + real interactables ---------- */
  useEffect(() => {
    const w = window as any
    const J = (w.__journey ??= {})
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const tp = async (l: THREE.Vector3, dx = 0, dz = 0) => {
      const v = l.clone().add(new THREE.Vector3(dx, 0, dz))
      root.current?.localToWorld(v)
      // PLAYER's api attaches lazily — wait for it (pos.copy alone is overwritten each frame)
      for (let i = 0; i < 80 && !J.player?.teleport; i++) await sleep(100)
      const api = J.player?.teleport
      if (api) api(v.x, v.y, v.z)
      else { core.player.pos.copy(v); core.player.vel.set(0, 0, 0) }
    }
    J.solve = {
      ...(J.solve || {}),
      [id]: async () => {
        if (core.useV5.getState().done.includes(id)) return
        if (!core.has('sense')) core.useV5.getState().grant('sense')
        await tp(DOCK, -0.35, 0.35)
        await sleep(500)
        core.interactables.get('L06-phone')?.use()
        await sleep(900)
        // steer the same stick the phone UI drives, toward the switch knob
        const d = new THREE.Vector3()
        for (let i = 0; i < 300 && !solved.current; i++) {
          if (drone.current) {
            d.copy(SWITCH_TOP).sub(drone.current.position); d.y = 0
            if (d.lengthSq() > 1e-4) {
              d.normalize()
              stick.current.x = d.x; stick.current.y = -d.z
            }
          }
          await sleep(80)
        }
        stick.current.x = 0; stick.current.y = 0
        await sleep(1400) // let the bridge finish
        closePhoneRef.current()
        await sleep(400)
        // leave the traveller on the exit path — the dock is a dead end for a straight-line walker
        await tp(EXIT_L, 0, 0.4)
      },
    }
    return () => { if (J.solve) delete J.solve[id] }
  }, [id])

  /* ---------- frame ---------- */
  const tmp = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), col: new THREE.Color() })
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const { a, b, col } = tmp.current
    const now = performance.now() / 1000
    const revealing = now < revealUntil.current

    /* drone */
    if (drone.current) {
      const d = drone.current
      if (phase === 'phone' && !solved.current) {
        const tx = stick.current.x * 2.3, tz = -stick.current.y * 2.3
        vel.current.x += (tx - vel.current.x) * Math.min(1, dt * 3.4)
        vel.current.z += (tz - vel.current.z) * Math.min(1, dt * 3.4)
        d.position.x = THREE.MathUtils.clamp(d.position.x + vel.current.x * dt, -9.9, 4.4)
        d.position.z = THREE.MathUtils.clamp(d.position.z + vel.current.z * dt, -5.6, 4.6)
        d.position.y += (HOVER_Y - d.position.y) * Math.min(1, dt * 2.6)
        d.rotation.x = THREE.MathUtils.lerp(d.rotation.x, vel.current.z * 0.16, dt * 5)
        d.rotation.z = THREE.MathUtils.lerp(d.rotation.z, -vel.current.x * 0.16, dt * 5)
        d.rotation.y = THREE.MathUtils.lerp(d.rotation.y, Math.atan2(vel.current.x, vel.current.z) * 0.25, dt * 4)
        // switch contact
        if (a.copy(SWITCH_TOP).sub(d.position).length() < 0.55 && !solved.current) {
          solved.current = true; setHit(true)
          vel.current.set(0, 0, 0)
        }
      } else if (phase === 'return' || (phase === 'walk' && !solved.current)) {
        // glide home to the pad and land
        a.copy(PAD_POS).sub(d.position)
        const sp = Math.min(2.2, a.length() * 2.4)
        if (a.length() > 0.02) d.position.addScaledVector(a.normalize(), sp * dt)
        if (phase === 'return' && d.position.distanceTo(PAD_POS) < 0.05) setPhase('walk')
        d.rotation.x *= 1 - Math.min(1, dt * 4); d.rotation.z *= 1 - Math.min(1, dt * 4); d.rotation.y *= 1 - Math.min(1, dt * 4)
      } else {
        // parked or hovering post-solve
        const targetY = solved.current ? HOVER_Y : PAD_POS.y + 0.02
        d.position.y += (targetY - d.position.y) * Math.min(1, dt * 3)
        if (solved.current) d.position.y = HOVER_Y + Math.sin(t * 2.1) * 0.03
      }
      // parked bob
      if (phase === 'walk' && !solved.current) d.position.y = PAD_POS.y + 0.02
    }

    /* lever tip + lamp warm */
    if (lever.current) lever.current.rotation.x += ((solved.current ? -0.95 : 0) - lever.current.rotation.x) * Math.min(1, dt * 4)
    if (lamp.current) {
      const m = lamp.current.material as THREE.MeshBasicMaterial
      m.color.lerp(col.set(solved.current ? C.warm : '#8a7f6d'), Math.min(1, dt * 3))
    }

    /* bridge extend, plank by plank */
    if (bridgeG.current) {
      const target = solved.current ? 1 : 0
      bridgeT.current += (target - bridgeT.current) * Math.min(1, dt * 1.4)
      const n = bridgeG.current.children.length
      bridgeG.current.children.forEach((p, i) => {
        const k = THREE.MathUtils.clamp(bridgeT.current * (n + 2) - i, 0, 1)
        p.visible = k > 0.01
        p.scale.setScalar(0.2 + 0.8 * k)
      })
      if (bridgeWalk.current && !bridgeWalk.current.userData.live && bridgeT.current > 0.35) {
        bridgeWalk.current.userData.live = true
        core.walkables.add(bridgeWalk.current)
      }
    }

    /* smog drift; a sense pulse shrinks the opaque puffs into the ground */
    if (smog.current) {
      smog.current.children.forEach((p, i) => {
        p.userData.y0 ??= p.position.y
        p.userData.k = THREE.MathUtils.lerp(p.userData.k ?? 1, revealing ? 0.16 : 1, Math.min(1, dt * 2.4))
        p.scale.set(p.userData.k, p.userData.k * 0.62, p.userData.k)
        p.position.y = p.userData.y0 * p.userData.k + Math.sin(t * 0.7 + i * 1.7) * 0.05
        p.position.x += Math.sin(t * 0.23 + i) * dt * 0.05
      })
    }
    ringMeshes.current.forEach((m) => {
      const k = THREE.MathUtils.lerp(m.scale.x, revealing ? 1 : 0.001, Math.min(1, dt * 4))
      m.scale.setScalar(k)
    })
    stoneMats.current.forEach((m) => {
      m.emissiveIntensity += ((revealing ? 0.5 : 0) - m.emissiveIntensity) * Math.min(1, dt * 3.5)
    })

    /* camera follows the drone while the phone is out (PLAYER yields on cinematic.on) */
    if (phase === 'phone' && drone.current && root.current && myCine.current) {
      camHold.current = 0.9
      const cam = state.camera
      a.copy(drone.current.position).add(b.set(0, 1.5, 2.6))
      root.current.localToWorld(a)
      cam.position.lerp(a, Math.min(1, dt * 3.2))
      cam.lookAt(drone.current.getWorldPosition(tmp.current.c).add(tmp.current.b.set(0, -0.55, 0)))
    } else if (camHold.current > 0 && myCine.current) {
      camHold.current -= dt
      const cam = state.camera
      a.copy(core.player.pos).add(b.set(0, 2.6, 3.9))
      cam.position.lerp(a, Math.min(1, dt * 2.6))
      cam.lookAt(core.player.pos.x, core.player.pos.y + 0.9, core.player.pos.z)
      if (camHold.current <= 0) { core.cinematic.on = false; myCine.current = false }
    }
  })

  const term = useTerminalScreen(phase === 'phone')

  return (
    <group ref={root}>
      {/* ------- the ford: shallow water, stepping stones, a bank of smog ------- */}
      {/* sandy bed: two overlapping flattened ellipses so the edge is not a hard rectangle */}
      <mesh position={[-0.6, 0.014, 1.32]} scale={[4.3, 1, 1.06]} material={clay(C.sand)} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.028, 40]} />
      </mesh>
      <mesh position={[2.6, 0.016, 1.18]} scale={[2.2, 1, 0.8]} material={clay(C.sand)} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.028, 32]} />
      </mesh>
      {/* shallow water on top — opaque clay, same as V4's ponds */}
      <mesh position={[-0.5, 0.036, 1.3]} scale={[3.9, 1, 0.86]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 44]} />
        <meshStandardMaterial color={C.water} roughness={0.5} />
      </mesh>
      <mesh position={[2.7, 0.038, 1.16]} scale={[1.9, 1, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={C.water} roughness={0.5} />
      </mesh>
      {/* pebbles + reeds along the banks */}
      {[[-3.6, 0.6], [-2.9, 2.0], [-1.2, 2.14], [0.6, 2.1], [1.8, 0.5], [3.6, 1.9], [4.1, 0.8], [-4.0, 1.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.045, z]} material={clay(i % 2 ? C.stoneLight : C.stone)} castShadow>
          <dodecahedronGeometry args={[0.09 + (i % 3) * 0.03, 0]} />
        </mesh>
      ))}
      {[[-3.2, 1.9], [1.1, 2.05], [3.9, 1.6], [-1.9, 0.62]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.14, 0]} material={clay(C.leafDark)} castShadow><coneGeometry args={[0.03, 0.28, 5]} /></mesh>
          <mesh position={[0.06, 0.11, 0.02]} rotation={[0, 0, -0.16]} material={clay(C.moss)} castShadow><coneGeometry args={[0.025, 0.22, 5]} /></mesh>
          <mesh position={[-0.05, 0.1, -0.03]} rotation={[0.14, 0, 0.12]} material={clay(C.leaf)} castShadow><coneGeometry args={[0.022, 0.2, 5]} /></mesh>
        </group>
      ))}
      {STONES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.055, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.27 - i * 0.012, 0.3 - i * 0.012, 0.11, 9]} />
            <meshStandardMaterial ref={(m) => { if (m) stoneMats.current[i] = m }} color={C.stone} roughness={0.9} emissive={C.warm} emissiveIntensity={0} />
          </mesh>
          <mesh ref={(m) => { if (m) ringMeshes.current[i] = m }} position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.001}>
            <ringGeometry args={[0.3, 0.36, 24]} />
            <meshBasicMaterial color={C.paper} />
          </mesh>
          {/* the stones are real footing across the ford */}
          <BlockBox position={[0, 0.06, 0]} args={[0.52, 0.14, 0.52]} kind="walk" />
        </group>
      ))}
      <object3D ref={pulseMarker} position={[0, 0.2, (STREAM_Z0 + STREAM_Z1) / 2]} />
      {/* smog bank — low soft puffs hugging the ford */}
      <group ref={smog}>
        {[[-2.9, 0.62, 1.52], [-1.9, 0.5, 1.05], [-1.0, 0.66, 1.68], [-0.1, 0.48, 0.9], [0.8, 0.6, 1.55], [1.8, 0.52, 1.0], [2.9, 0.6, 1.45], [0.4, 0.75, 1.8], [-2.2, 0.72, 1.75], [2.2, 0.74, 1.7]].map(([x, y, s], i) => (
          <mesh key={i} position={[x, y, (STREAM_Z0 + STREAM_Z1) / 2 + Math.sin(i * 2.4) * 0.4]} scale={[1, 0.62, 1]}>
            <sphereGeometry args={[s * 0.42, 14, 10]} />
            <meshStandardMaterial color="#d9d2c4" roughness={1} />
          </mesh>
        ))}
      </group>

      {/* ------- pergola workspace: desk, laptop, stool ------- */}
      <group position={[-3.15, 0, -0.85]} rotation={[0, Math.PI / 2, 0]}>
        <Pergola w={1.8} d={1.5} h={1.5} />
        <Desk w={1.2} position={[0, 0, -0.1]} />
        <group position={[0, 0.49, -0.12]}>
          <Laptop s={1} open={0.34}>
            <mesh ref={term.ref} position={[0, 0, 0.001]}>
              <planeGeometry args={[0.5, 0.32]} />
              <meshBasicMaterial map={term.tex} toneMapped={false} />
            </mesh>
          </Laptop>
        </group>
        <Stool position={[0.15, 0, 0.62]} />
        {/* a small stack of papers */}
        <group position={[-0.42, 0.49, -0.05]}>
          <RoundedBox args={[0.2, 0.012, 0.27]} radius={0.005} material={clay(C.paper)} />
          <RoundedBox args={[0.2, 0.012, 0.27]} radius={0.005} position={[0.02, 0.014, 0.01]} rotation={[0, 0.2, 0]} material={clay(C.paper)} />
        </group>
        {/* desk + four pergola posts block, the rest stays walkable */}
        <BlockBox position={[0, 0.3, -0.1]} args={[0.7, 0.6, 1.3]} />
        {[[-0.9, -0.75], [0.9, -0.75], [-0.9, 0.75], [0.9, 0.75]].map(([x, z], i) => (
          <BlockBox key={i} position={[x, 0.6, z]} args={[0.16, 1.2, 0.16]} />
        ))}
      </group>

      {/* ------- dock with the phone + the drone pad ------- */}
      <group position={DOCK}>
        <Dock len={1.6} w={1.05} />
      </group>
      {/* dock deck is a floor out over the rim; the far end is fenced until the bridge is out */}
      <BlockBox position={DOCK.clone().add(new THREE.Vector3(0, -0.04, 0)).toArray() as [number, number, number]} args={[1.7, 0.1, 1.0]} kind="walk" />
      <BlockBox position={DOCK_END.clone().add(new THREE.Vector3(-0.1, 0.45, 0)).toArray() as [number, number, number]} args={[0.18, 0.9, 1.05]} on={!hit && !done} />
      <group position={PHONE_POS} rotation={[0, -0.5, 0]}>
        <PhoneOnStand glow={phase === 'phone'} />
      </group>
      <object3D ref={phoneMarker} position={PHONE_POS.clone().add(new THREE.Vector3(0, 0.25, 0))} />
      <group position={PAD_POS}><Pad /></group>
      <group ref={drone} position={PAD_POS.clone().add(new THREE.Vector3(0, 0.02, 0))}>
        <Drone />
        {/* the phone overlay anchors to the drone so it is never culled as "behind camera" */}
        {phase === 'phone' && (
          <Html fullscreen zIndexRange={[200, 0]}>
            <PhoneUI open status={solved.current || hit ? 'hit' : 'flying'} stick={stick} onClose={closePhone} />
          </Html>
        )}
      </group>

      {/* ------- the unreachable rock + switch ------- */}
      <group position={ROCK_POS}>
        <SwitchRock r={1.15} seed={5} />
        {/* flat top so the traveller can stand there once the bridge is out */}
        <BlockBox position={[0, -0.04, 0]} args={[1.5, 0.12, 1.5]} kind="walk" on={hit || done} />
        <SwitchPost position={[0, 0, 0.08]} hitRef={lever} />
        <mesh ref={lamp} position={[0, 0.58, 0.34]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial color="#8a7f6d" />
        </mesh>
        {/* a tuft + a pebble so the rock feels tended */}
        <mesh position={[0.55, 0.04, -0.3]} material={clay(C.leafDark)} castShadow><coneGeometry args={[0.07, 0.2, 6]} /></mesh>
        <mesh position={[-0.4, 0.02, 0.45]} material={clay(C.stoneLight)}><dodecahedronGeometry args={[0.08, 0]} /></mesh>
      </group>

      {/* ------- the bridge that extends to the rock ------- */}
      <group ref={bridgeG}>
        {Array.from({ length: 8 }).map((_, i) => {
          const k = (i + 0.5) / 8
          const p = BRIDGE_A.clone().lerp(BRIDGE_B, k)
          p.y += -0.02 - Math.sin(k * Math.PI) * 0.1
          return (
            <mesh key={i} position={p} rotation={[0, Math.atan2(BRIDGE_B.x - BRIDGE_A.x, BRIDGE_B.z - BRIDGE_A.z), 0]} material={clay(i % 2 ? C.wood : C.woodLight)} castShadow receiveShadow>
              <boxGeometry args={[0.75, 0.05, 0.24]} />
            </mesh>
          )
        })}
      </group>
      <mesh ref={bridgeWalk} position={BRIDGE_A.clone().lerp(BRIDGE_B, 0.5).add(new THREE.Vector3(0, -0.02, 0))} rotation={[0, Math.atan2(BRIDGE_B.x - BRIDGE_A.x, BRIDGE_B.z - BRIDGE_A.z), 0]} visible={false} userData={{ live: done }}>
        <boxGeometry args={[0.8, 0.08, BRIDGE_A.distanceTo(BRIDGE_B)]} />
      </mesh>

      {/* a little grass + a tree so the island does not feel bare */}
      <mesh position={[2.8, 0.3, -2.4]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.06, 0.09, 0.6, 7]} /></mesh>
      <mesh position={[2.8, 0.82, -2.4]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.44, 14, 11]} /></mesh>
      <mesh position={[3.0, 0.66, -2.25]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.28, 12, 9]} /></mesh>
      {[[2.2, 3.4], [-3.6, 3.2], [3.9, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]} material={clay(i ? C.stone : C.moss)} castShadow><dodecahedronGeometry args={[0.14, 0]} /></mesh>
      ))}
      {/* V4's own rim dressing — the same opaque kit pieces the V4 world scatters */}
      <Tree position={[3.9, 0, -3.1]} h={1.5} />
      <Tree position={[-3.9, 0, 3.0]} h={1.2} />
      <Bush position={[4.3, 0, 1.35]} s={1.1} />
      <Bush position={[-4.05, 0, -3.4]} s={0.9} />
      <ClayPot position={[2.9, 0, -3.75]} s={0.85} />
      <Rock position={[-1.7, 0, -4.15]} s={0.28} />
      <Rock position={[4.35, 0, -0.5]} s={0.2} />

    </group>
  )
}
