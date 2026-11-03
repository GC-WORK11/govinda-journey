/**
 * Heli — reusable, forgiving helicopter controller (V6 · PLAYER · ISL-E's L06).
 *
 * Mount inside an island/obstacle group (it must live under the R3F Canvas):
 *
 *   <Heli id="L06-heli" pad={[1.6, 0, 2.4]} exit={[0, 0, 1.4]}>
 *     <VoxelHeliModel />   // your craft, modelled around the group origin
 *   </Heli>
 *
 * `pad` is the home/landing spot in PARENT-LOCAL space (parents may translate
 * but should not rotate/scale — physics runs in world space on `heli.pos`).
 *
 * Play: walk up, `E climb in` / tap the use button → seated aboard. WASD/arrows
 * or the joystick flies in the camera's ground plane, Space (or the jump
 * button) climbs, Shift (or the use button while flying) sinks — hands off is
 * a gentle hover, auto-level, soft ceiling + soft range bound. Touching the
 * pad lands and steps the rider off at `exit`; touching anything else just
 * settles — take off again with Space.
 *
 * Exported `heli` state: pos/vel (world), flying, landed, seat (world),
 * exitAt (one-shot world position written on disembark — Player consumes).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cinematic, interactables, playerEmote, walkables, type Interactable } from '../core'
import { input, isDown, now } from './input'
import { usePlayerUI } from './uiState'

export const heli = {
  /** Craft centre, world space — updated every frame while mounted. */
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  /** Rider is aboard and driving. */
  flying: false,
  /** Settled on a surface (pad or any walkable). */
  landed: false,
  /** World position the rider sits at (Player follows this). */
  seat: new THREE.Vector3(),
  /** One-shot: set to a world point when the rider steps off — Player consumes and clears. */
  exitAt: null as THREE.Vector3 | null,
}

const ACC = 9.5        // lateral thrust
const SPEED = 8        // top cruise speed
const CLIMB = 4.2, SINK = 3.6
const DRAG = 1.6       // hands-off lateral decay — drifts a touch then settles
const dampAngle = (a: number, b: number, l: number, dt: number) => {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  else if (d < -Math.PI) d += Math.PI * 2
  return a + d * (1 - Math.exp(-l * dt))
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3()
const _e = new THREE.Euler()
const _ray = new THREE.Raycaster(), _down = new THREE.Vector3(0, -1, 0)
const _qb = new THREE.Box3(), _wb = new THREE.Box3()
const _hit: THREE.Intersection[] = [], _cand: THREE.Object3D[] = []

export function Heli({ id, pad, exit, seatY = 0.62, radius = 2.4, label = 'climb in', ceiling = 13, range = 30, onBoard, onLand, children }: {
  /** unique interactable id, e.g. 'L06-heli' */
  id: string
  /** home/landing spot, parent-local */
  pad: [number, number, number]
  /** where the rider steps off on landing, parent-local (default: beside pad) */
  exit?: [number, number, number]
  /** seat height above the craft centre */
  seatY?: number
  /** board prompt radius */
  radius?: number
  label?: string
  /** soft ceiling above the pad (m) */
  ceiling?: number
  /** soft leash around the pad (m) */
  range?: number
  onBoard?: () => void
  onLand?: () => void
  children?: React.ReactNode
}) {
  const rig = useRef<THREE.Group>(null)
  const cam = useThree((s) => s.camera)
  const padV = useMemo(() => new THREE.Vector3(...pad), [pad])
  const exitV = useMemo(() => new THREE.Vector3(...(exit ?? [pad[0] + 1.15, pad[1] + 0.02, pad[2]])), [exit, pad])
  const padW = useMemo(() => new THREE.Vector3(), [])
  const H = useRef({ t: 0, yaw: 0 })

  /* board prompt: nearest enabled interactable in range — Player fires use() */
  const it = useMemo<Interactable>(() => ({
    id, at: () => padW, radius, label,
    enabled: () => !heli.flying,
    use: () => {
      heli.flying = true; heli.landed = false; H.current.t = 0
      playerEmote.name = 'sit' // seated pose while aboard
      usePlayerUI.getState().setFlying(true)
      onBoard?.()
    },
  }), [id, padW, radius, label, onBoard])
  useEffect(() => { interactables.set(it.id, it); return () => { interactables.delete(it.id) } }, [it])

  /* ?qa hook so the harness can board without input choreography */
  useEffect(() => {
    if (!/[?&]qa/.test(location.search)) return
    const j = window as any
    ;(j.__journey ||= {}).heli = {
      pos: () => { const p = heli.pos; return [p.x, p.y, p.z] },
      flying: () => heli.flying,
      board: () => it.use(),
    }
    return () => { delete j.__journey.heli }
  }, [it])

  useFrame((_, rawDt) => {
    const r = rig.current; if (!r) return
    const parent = r.parent
    _v.set(0, 0, 0)
    if (parent) parent.getWorldPosition(_v)
    padW.copy(padV).add(_v)

    if (!heli.flying) {
      // parked on the pad until boarded
      heli.pos.copy(padW); heli.vel.set(0, 0, 0); heli.landed = true
      heli.seat.copy(padW).setY(padW.y + seatY)
      r.position.copy(padV)
      _e.set(0, H.current.yaw, 0); r.quaternion.setFromEuler(_e)
      return
    }

    /* ---- flight: world-space, distance per real time ---- */
    const t = now()
    const dt = H.current.t ? Math.min(0.1, Math.max(0, (t - H.current.t) / 1000)) : 0
    H.current.t = t

    // lateral input in the camera's ground plane (keys + joystick)
    let ix = 0, iz = 0
    if (!cinematic.on) {
      if (isDown('KeyW', 'ArrowUp')) iz -= 1
      if (isDown('KeyS', 'ArrowDown')) iz += 1
      if (isDown('KeyA', 'ArrowLeft')) ix -= 1
      if (isDown('KeyD', 'ArrowRight')) ix += 1
      ix += input.joy.x; iz += input.joy.y
    }
    const m = cam.matrixWorld.elements
    _f.set(-m[8], 0, -m[10]).normalize() // camera forward, flattened
    _r.set(-_f.z, 0, _f.x)
    _w.set(0, 0, 0).addScaledVector(_f, -iz).addScaledVector(_r, ix)
    const wishLen = Math.min(1, _w.length()); if (wishLen > 1e-4) _w.normalize()

    // vertical: Space/jump btn up, Shift/use btn down, hands off → hover
    let ty = 0
    if (!cinematic.on) {
      if (isDown('Space') || input.flyUp) ty += CLIMB
      if (isDown('ShiftLeft', 'ShiftRight') || input.flyDown) ty -= SINK
    }
    heli.vel.y += (ty - heli.vel.y) * Math.min(1, 3.2 * dt)
    heli.vel.x += _w.x * ACC * wishLen * dt
    heli.vel.z += _w.z * ACC * wishLen * dt
    const drag = Math.exp(-DRAG * dt)
    heli.vel.x *= drag; heli.vel.z *= drag
    const hs = Math.hypot(heli.vel.x, heli.vel.z)
    if (hs > SPEED) { heli.vel.x *= SPEED / hs; heli.vel.z *= SPEED / hs }

    // soft bounds: ceiling + a leash around home — push back, never yank
    if (heli.pos.y > padW.y + ceiling) heli.vel.y = Math.min(heli.vel.y, (padW.y + ceiling - heli.pos.y) * 2)
    const rdx = heli.pos.x - padW.x, rdz = heli.pos.z - padW.z
    const rd = Math.hypot(rdx, rdz)
    if (rd > range) { heli.vel.x -= (rdx / rd) * 6 * dt * (rd - range); heli.vel.z -= (rdz / rd) * 6 * dt * (rd - range) }

    // integrate
    heli.pos.addScaledVector(heli.vel, dt)

    // ground: down-ray vs walkables → settle (still flying; take off again)
    heli.landed = false
    _qb.min.set(heli.pos.x - 3, heli.pos.y - 6, heli.pos.z - 3)
    _qb.max.set(heli.pos.x + 3, heli.pos.y + 3, heli.pos.z + 3)
    _cand.length = 0
    for (const o of walkables) {
      _wb.setFromObject(o)
      if (!_wb.isEmpty() && _wb.intersectsBox(_qb)) _cand.push(o)
    }
    if (_cand.length) {
      _ray.set(_w.set(heli.pos.x, heli.pos.y + 0.4, heli.pos.z), _down); _ray.far = 4
      _hit.length = 0
      const g = _ray.intersectObjects(_cand, true, _hit)[0]
      if (g && heli.pos.y - g.point.y <= 0.08 && heli.vel.y <= 0.01) {
        heli.pos.y = g.point.y; heli.vel.y = 0; heli.landed = true
      }
    }

    // pad landing → step the rider off
    const pd = Math.hypot(heli.pos.x - padW.x, heli.pos.z - padW.z)
    if (pd < 1.35 && heli.pos.y - padW.y < 0.55 && heli.pos.y - padW.y > -0.8 && heli.vel.y <= 0.25) {
      heli.pos.set(padW.x, padW.y, padW.z); heli.vel.set(0, 0, 0); heli.landed = true
      heli.flying = false
      heli.exitAt = exitV.clone().add(_v)
      playerEmote.name = null
      usePlayerUI.getState().setFlying(false)
      input.flyUp = input.flyDown = false
      onLand?.()
    }

    heli.seat.copy(heli.pos).setY(heli.pos.y + seatY)

    // write the craft: parent-local pos + yaw-to-travel + pitch/roll lean
    if (parent) r.position.copy(heli.pos).sub(_v)
    else r.position.copy(heli.pos)
    if (hs > 0.9) H.current.yaw = dampAngle(H.current.yaw, Math.atan2(heli.vel.x, heli.vel.z), 5, dt)
    const fwdAmt = heli.vel.x * Math.sin(H.current.yaw) + heli.vel.z * Math.cos(H.current.yaw)
    const sideAmt = heli.vel.x * Math.cos(H.current.yaw) - heli.vel.z * Math.sin(H.current.yaw)
    _e.set(-fwdAmt * 0.035, H.current.yaw, -sideAmt * 0.03)
    r.quaternion.setFromEuler(_e)
  })

  return <group ref={rig}>{children}</group>
}
