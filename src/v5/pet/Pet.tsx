/**
 * PET (V6): the dog. Unlocks once L03 is complete (useV5.done). The first time that
 * happens in a visit it scales in beside the traveller. After that it trails them,
 * about 1.5 m behind and to their right: it runs to catch up when far, idles when
 * near, sits down after 3 s still. It only stands on walkable ground (the same
 * down-ray as the player), is never a blocker, and never steps off a bridge or into
 * the path. It hops a gap or ledge it can't walk, and a respawn or ?at jump puts it
 * straight behind the traveller. Renders nothing until PET_MODEL exists.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { player, useV5, walkables } from '../core'
import { blobMat } from '../../world/kit'
import { applyToon } from '../art/material'
import { Guard } from '../world/modules'
import { usePlayerUI } from '../player/uiState'

/** Quaternius Husky (CC0, meshopt; drei's default loader decodes it). null = nothing is rendered. */
export const PET_MODEL: string | null = './models/pet/dog.glb'

const HEIGHT = 0.6, FACE = 0 // husky faces +z: head at z +1.8, tail at z -1.3
const BEHIND = 1.25, SIDE = 0.8, NEAR = 2.2, RUN = 5.4
const SIT_AFTER = 3, STEP = 0.5, LOST = 10, HOP = 0.6, REVEAL = 0.9
const SPOTS: [number, number][] = [[BEHIND, SIDE], [BEHIND, 0], [BEHIND, -SIDE], [0, SIDE], [0, -SIDE]]

const _ray = new THREE.Raycaster(), _down = new THREE.Vector3(0, -1, 0), _o = new THREE.Vector3()
const _cand: THREE.Object3D[] = []
const _g = { y: 0, bridge: false }
let frame = 0
const boxCache = new WeakMap<THREE.Object3D, { f: number; b: THREE.Box3 }>()
/** World bounds of a walkable, refreshed once per frame (same trick as Player). */
function boxOf(o: THREE.Object3D) {
  let e = boxCache.get(o)
  if (!e) { e = { f: -1, b: new THREE.Box3() }; boxCache.set(o, e) }
  if (e.f !== frame) { e.b.setFromObject(o); e.f = frame }
  return e.b
}

/** Walkable surface height under (x, z) near height y, or null over a gap, void or wall. */
function groundAt(x: number, z: number, y: number): typeof _g | null {
  _cand.length = 0
  for (const o of walkables) {
    const b = boxOf(o)
    if (b.isEmpty() || x < b.min.x - 0.2 || x > b.max.x + 0.2 || z < b.min.z - 0.2 || z > b.max.z + 0.2) continue
    if (b.max.y < y - 1.2 || b.min.y > y + 1.2) continue
    _cand.push(o)
  }
  if (!_cand.length) return null
  _ray.set(_o.set(x, y + 1, z), _down); _ray.far = 2.2
  const hit = _ray.intersectObjects(_cand, true)[0]
  if (!hit) return null
  _g.y = hit.point.y; _g.bridge = hit.object.name.startsWith('walk-bridge')
  return _g
}

const dampAngle = (a: number, b: number, l: number, dt: number) =>
  a + (THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI) * (1 - Math.exp(-l * dt))

type Rig = {
  pos: THREE.Vector3; vel: THREE.Vector3; prev: THREE.Vector3
  yaw: number; lat: number; lift: number; rv: number; rk: number
  moving: boolean; sit: boolean; bridge: boolean; still: number; stuck: number; first: boolean
  hop: null | { t: number; a: THREE.Vector3; b: THREE.Vector3 }
}

/** Put the dog straight behind the traveller: spawn, reveal, respawn, ?at jump. */
function place(k: Rig, P: THREE.Vector3) {
  const fx = Math.sin(player.facing), fz = Math.cos(player.facing)
  let ok = false
  for (const [b, l] of SPOTS) {
    const x = P.x - fx * b - fz * l, z = P.z - fz * b + fx * l
    const g = groundAt(x, z, P.y)
    if (g) { k.pos.set(x, g.y, z); ok = true; break }
  }
  if (!ok) k.pos.copy(P)
  k.vel.set(0, 0, 0); k.hop = null; k.moving = false; k.sit = false; k.bridge = false; k.still = 0; k.stuck = 0; k.lift = 0
  k.yaw = player.facing
}

function Dog({ url, reveal }: { url: string; reveal: boolean }) {
  const { scene, animations } = useGLTF(url)
  const root = useRef<THREE.Group>(null!), body = useRef<THREE.Group>(null!), blob = useRef<THREE.Mesh>(null!)
  const { actions } = useAnimations(animations, body)
  const fit = useMemo(() => {
    scene.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(scene)
    const h = b.max.y - b.min.y
    scene.traverse((o) => { o.frustumCulled = false })
    applyToon(scene)
    const s = h > 0.01 ? HEIGHT / h : 1
    return { s, y: -b.min.y * s }
  }, [scene])
  const clip = useMemo(() => {
    const names = animations.map((a) => a.name), has = (n: string) => names.includes(n)
    const idle = has('Idle') ? 'Idle' : names[0]
    return { idle, walk: has('Walk') ? 'Walk' : idle, run: has('Gallop') ? 'Gallop' : idle, sit: has('Eating') ? 'Eating' : idle }
  }, [animations])
  const K = useRef<Rig>({
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), prev: new THREE.Vector3(),
    yaw: 0, lat: SIDE, lift: 0, rv: 0, rk: -1,
    moving: false, sit: false, bridge: false, still: 0, stuck: 0, first: true, hop: null,
  })
  const cur = useRef<THREE.AnimationAction | null>(null)

  useEffect(() => {
    if (!/[?&]qa/.test(location.search)) return
    const j = ((window as any).__journey ??= {})
    j.pet = {
      state: () => {
        const k = K.current
        return {
          pos: [k.pos.x, k.pos.y, k.pos.z].map((v) => +v.toFixed(2)),
          dist: +Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z).toFixed(2),
          sit: k.sit, moving: k.moving, hop: !!k.hop, rv: +k.rv.toFixed(2), clip: cur.current?.getClip().name ?? null,
        }
      },
    }
    return () => { delete j.pet }
  }, [])

  useFrame((_, raw) => {
    const k = K.current, dt = Math.min(raw, 0.25), P = player.pos
    const ui = usePlayerUI.getState()
    frame++
    if (k.first) { k.first = false; k.rk = ui.respawnKey; if (!reveal) k.rv = 1; place(k, P) }
    else if (P.distanceTo(k.prev) > Math.max(3, 12 * dt) || ui.respawnKey !== k.rk) { k.rk = ui.respawnKey; place(k, P) }
    k.prev.copy(P)
    k.rv = Math.min(1, k.rv + dt / REVEAL)

    const fx = Math.sin(player.facing), fz = Math.cos(player.facing)
    const sideOk = groundAt(P.x - fx * BEHIND - fz * SIDE, P.z - fz * BEHIND + fx * SIDE, P.y) !== null
    k.lat = THREE.MathUtils.damp(k.lat, sideOk ? SIDE : 0, 6, dt)
    const tx = P.x - fx * BEHIND - fz * k.lat, tz = P.z - fz * BEHIND + fx * k.lat
    const dP = Math.hypot(P.x - k.pos.x, P.z - k.pos.z), dT = Math.hypot(tx - k.pos.x, tz - k.pos.z)
    const pSpeed = Math.hypot(player.vel.x, player.vel.z)

    if (k.hop) {
      const h = k.hop
      h.t = Math.min(1, h.t + dt / HOP)
      k.pos.lerpVectors(h.a, h.b, h.t)
      k.lift = Math.sin(Math.PI * h.t) * 0.6
      if (h.t >= 1) k.hop = null
      k.vel.set(0, 0, 0)
    } else if (ui.flying) {
      k.vel.set(0, 0, 0); k.moving = false; k.lift = 0
    } else if (dP > LOST && player.grounded) {
      place(k, P)
    } else {
      k.lift = 0
      const running = dP > NEAR
      k.moving = running || dT > (k.moving ? 0.2 : 0.55)
      const sp = !k.moving ? 0 : running ? RUN : Math.min(RUN, Math.max(1.2 + dT * 2.5, pSpeed))
      const a = 1 - Math.exp(-(running ? 6 : 4) * dt), dl = dT || 1
      k.vel.x += ((tx - k.pos.x) / dl * sp - k.vel.x) * a
      k.vel.z += ((tz - k.pos.z) / dl * sp - k.vel.z) * a
      const nx = k.pos.x + k.vel.x * dt, nz = k.pos.z + k.vel.z * dt, g = groundAt(nx, nz, k.pos.y)
      if (g && Math.abs(g.y - k.pos.y) < STEP) { k.pos.set(nx, g.y, nz); k.stuck = 0; k.bridge = g.bridge }
      else { k.vel.set(0, 0, 0); k.stuck += dt }
      const rx = k.pos.x - P.x, rz = k.pos.z - P.z, fD = rx * fx + rz * fz, lD = rx * -fz + rz * fx
      if ((k.stuck > 0.6 || (fD > 0.2 && fD < 2 && Math.abs(lD) < 0.6)) && player.grounded) {
        const h = groundAt(tx, tz, P.y)
        if (h) { k.hop = { t: 0, a: k.pos.clone(), b: new THREE.Vector3(tx, h.y, tz) }; k.stuck = 0; k.vel.set(0, 0, 0) }
      }
      const sx = k.pos.x - P.x, sz = k.pos.z - P.z, sd = Math.hypot(sx, sz)
      if (sd > 1e-3 && sd < 0.7) { k.pos.x = P.x + sx * (0.7 / sd); k.pos.z = P.z + sz * (0.7 / sd) }
    }

    const calm = !k.moving && pSpeed < 0.25 && !k.bridge
    k.still = calm ? k.still + dt : 0
    if (!k.sit && k.still > SIT_AFTER && dP < NEAR) k.sit = true
    else if (k.sit && (!calm || dP > NEAR)) k.sit = false

    const vx = k.vel.x, vz = k.vel.z
    const face = k.moving && vx * vx + vz * vz > 0.01 ? Math.atan2(vx, vz) : Math.atan2(P.x - k.pos.x, P.z - k.pos.z)
    k.yaw = dampAngle(k.yaw, face, 8, dt)

    const s = 1 - (1 - k.rv) ** 3
    root.current.position.set(k.pos.x, k.pos.y + k.lift + Math.sin(Math.PI * k.rv) * 0.2, k.pos.z)
    root.current.rotation.y = k.yaw
    root.current.scale.setScalar(Math.max(0.001, s))
    blob.current.position.set(k.pos.x, k.pos.y + 0.02, k.pos.z)
    blob.current.scale.setScalar(Math.max(0.001, s))

    const spd = Math.hypot(vx, vz), fast = k.hop !== null || dP > NEAR || spd > 2.8
    const name = k.sit ? clip.sit : !k.moving && !k.hop ? clip.idle : fast ? clip.run : clip.walk
    const a = actions[name]
    if (a) {
      if (cur.current !== a) { a.reset().fadeIn(0.25).play(); cur.current?.fadeOut(0.25); cur.current = a }
      a.timeScale = k.sit ? 1 : k.moving || k.hop ? THREE.MathUtils.clamp(spd / (fast ? 4.5 : 1.8), 0.6, 1.3) : 1
    }
  })

  return (
    <group>
      <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} material={blobMat()} renderOrder={1}>
        <planeGeometry args={[0.6, 0.6]} />
      </mesh>
      <group ref={root}>
        <group ref={body} position={[0, fit.y, 0]} rotation={[0, FACE, 0]} scale={fit.s}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  )
}

/** Mount once in World5's Canvas. Mounts the dog only after L03 (lazy GLB, preloaded after L02). */
export default function Pet({ model = PET_MODEL }: { model?: string | null }) {
  const on = useV5((s) => s.done.includes('L03'))
  const l02 = useV5((s) => s.done.includes('L02'))
  const live = useRef(!on)
  useEffect(() => { if (!on) live.current = true }, [on])
  useEffect(() => { if (model && l02) useGLTF.preload(model) }, [model, l02])
  if (!model || !on) return null
  return <Guard><Suspense fallback={null}><Dog url={model} reveal={live.current} /></Suspense></Guard>
}
