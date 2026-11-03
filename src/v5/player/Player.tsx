import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, useAnimations, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { clay, C, blobMat } from '../../world/kit'
import * as core from '../core'
import { blockers, cinematic, interactables, player, playerEmote, walkables, V5_ORDER } from '../core'
import { ISLAND_POS, ENTRY, EXIT, nearestIsland } from '../world/layout'
import { input, installInput, isDown, now, pressKey } from './input'
import { heli } from './Heli'
import { usePlayerUI, currentUse } from './uiState'
import { carryAnchor, carryQuat } from './anchor'

/* ------------------------------------------------------------------ model */

const URL = './models/student.glb'
const HEIGHT = 0.95
type Anim = 'idle' | 'walk' | 'jump' | 'cheer' | 'sit' | 'interact' | 'use'
const CLIP: Record<Anim, string> = {
  idle: 'Idle', walk: 'Walking_A', jump: 'Jump_Full_Short', cheer: 'Cheer',
  sit: 'Sit_Floor_Idle', interact: 'Interact', use: 'Use_Item',
}
const LOOP_ONCE: Partial<Record<Anim, boolean>> = { jump: true, interact: true, use: true }

function Model({ anim, tsRef, socketRef }: {
  anim: Anim
  tsRef: { current: number }
  socketRef: { current: THREE.Group | null }
}) {
  const root = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(URL)
  const { actions } = useAnimations(animations, root)
  // Retinted atlas: warm brown skin, near-black hair, cream shirt, charcoal trousers.
  const skin = useTexture('./models/student-skin.png')
  const scale = useMemo(() => {
    scene.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(scene)
    const h = b.max.y - b.min.y
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'roughness' in mat) {
          mat.roughness = 0.85; mat.metalness = 0
          if (mat.map && mat.map !== skin) {
            skin.flipY = mat.map.flipY; skin.colorSpace = mat.map.colorSpace
            skin.magFilter = mat.map.magFilter; skin.minFilter = mat.map.minFilter
            skin.wrapS = mat.map.wrapS; skin.wrapT = mat.map.wrapT; skin.needsUpdate = true
            mat.map = skin; mat.needsUpdate = true
          }
        }
      }
    })
    return h > 0.01 ? HEIGHT / h : 0.4
  }, [scene, skin])
  const chest = useMemo(() => scene.getObjectByName('chest') || scene.getObjectByName('spine'), [scene])

  // Carry socket: follows the chest bone, sits just above the backpack.
  const socket = useMemo(() => new THREE.Group(), [])
  useEffect(() => {
    if (!chest) return
    socket.position.set(0, 0.36, -0.32)
    chest.add(socket); socketRef.current = socket
    return () => { chest.remove(socket); socketRef.current = null }
  }, [chest, socket, socketRef])

  // Live walk/run playback rate (locomotion speed follow, no restart).
  useFrame(() => {
    const a = actions[CLIP[anim]]
    if (a && anim === 'walk') a.timeScale = THREE.MathUtils.damp(a.timeScale, tsRef.current, 10, 1 / 60)
  })

  // Crossfade on clip change (0.15 s per brief).
  const prev = useRef<THREE.AnimationAction | null>(null)
  useEffect(() => {
    const a = actions[CLIP[anim]] || actions.Idle
    if (!a || prev.current === a) return
    a.reset()
    if (LOOP_ONCE[anim]) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true }
    else a.setLoop(THREE.LoopRepeat, Infinity)
    a.fadeIn(0.15).play()
    prev.current?.fadeOut(0.15)
    prev.current = a
    return () => { if (prev.current === a) { a.fadeOut(0.15); prev.current = null } }
  }, [anim, actions])

  return (
    <group ref={root} scale={scale}>
      <primitive object={scene} />
      {chest && <BackpackOn bone={chest} />}
    </group>
  )
}

/** Backpack as a child of the chest bone so it follows every animation. */
function BackpackOn({ bone }: { bone: THREE.Object3D }) {
  const g = useMemo(() => new THREE.Group(), [])
  useEffect(() => { bone.add(g); return () => { bone.remove(g) } }, [bone, g])
  return (
    <primitive object={g}>
      <group position={[0, 0.12, -0.3]}>
        <RoundedBox args={[0.5, 0.56, 0.26]} radius={0.12} smoothness={3} material={clay('#3f4b73')} castShadow />
        <RoundedBox args={[0.44, 0.28, 0.1]} radius={0.05} position={[0, -0.1, -0.15]} material={clay('#2f3858')} castShadow />
        <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.sand)} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
        </mesh>
      </group>
    </primitive>
  )
}

/* ------------------------------------------------------------------ dust */

const PUFF_N = 30
type Puff = { s: THREE.Sprite; v: THREE.Vector3; life: number; ttl: number; sz: number }
let spawnDust: (at: THREE.Vector3, n: number, spread?: number, up?: number, size?: number) => void = () => {}
function puffTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64
  const ctx = cv.getContext('2d')!
  const gr = ctx.createRadialGradient(32, 32, 3, 32, 32, 30)
  gr.addColorStop(0, 'rgba(238,226,208,0.85)'); gr.addColorStop(0.6, 'rgba(238,226,208,0.4)'); gr.addColorStop(1, 'rgba(238,226,208,0)')
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(cv)
}
function DustPool() {
  const tex = useMemo(puffTexture, [])
  const pool = useMemo<Puff[]>(() => Array.from({ length: PUFF_N }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }))
    s.visible = false
    return { s, v: new THREE.Vector3(), life: 0, ttl: 1, sz: 0.2 }
  }), [tex])
  const next = useRef(0)
  useEffect(() => {
    spawnDust = (at, n, spread = 0.14, up = 0.6, size = 0.16) => {
      for (let i = 0; i < n; i++) {
        const p = pool[next.current]; next.current = (next.current + 1) % PUFF_N
        p.s.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * spread * 2, Math.random() * 0.05, (Math.random() - 0.5) * spread * 2))
        const a = Math.random() * Math.PI * 2
        p.v.set(Math.cos(a) * (0.25 + Math.random() * 0.4), up * (0.5 + Math.random() * 0.7), Math.sin(a) * (0.25 + Math.random() * 0.4))
        p.life = 0; p.ttl = 0.45 + Math.random() * 0.3; p.sz = size * (0.8 + Math.random() * 0.5)
        p.s.visible = true
      }
    }
    return () => { spawnDust = () => {} }
  }, [pool])
  useFrame((_, dt) => {
    for (const p of pool) {
      if (!p.s.visible) continue
      p.life += dt
      const k = p.life / p.ttl
      if (k >= 1) { p.s.visible = false; continue }
      p.v.y -= 1.1 * dt; p.v.multiplyScalar(1 - Math.min(0.9, 2.6 * dt))
      p.s.position.addScaledVector(p.v, dt)
      const sc = p.sz * (0.55 + k * 1.6)
      p.s.scale.set(sc, sc, sc)
      ;(p.s.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.5
    }
  })
  return <group>{pool.map((p, i) => <primitive key={i} object={p.s} />)}</group>
}

/* ------------------------------------------------------------------ physics */

const WALK = 2.4, RUN = 4.4
const GRAV = 24, JUMP_V = 6.6
const COYOTE = 0.12, BUFFER = 0.12
const RADIUS = 0.3, STEP = 0.45
const TURN = 13
const PITCH_MIN = 0.08, PITCH_MAX = 1.22, DIST_MIN = 3.0, DIST_MAX = 24.0
// Follow distance that keeps the ~0.95 m student at ~1/8 of the screen height (fov ~38deg).
const BASE_DIST = 9.5

const DBG = typeof location !== 'undefined' && /[?&](qa|sandbox)/.test(location.search)
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3()
const _wish = new THREE.Vector3() // dedicated — the wall pass inside the substep loop reuses _v3
const _n1 = new THREE.Vector3(), _n2 = new THREE.Vector3() // scratch for near()/nearSeg() — never share with _v*
const _ray = new THREE.Raycaster()
const _down = new THREE.Vector3(0, -1, 0)
const boxCache = new WeakMap<THREE.Object3D, { box: THREE.Box3; frame: number }>()
let frameNo = 0

/** World-space Box3 of o, refreshed once per frame (geometry bounds are cached by three). */
function boxOf(o: THREE.Object3D) {
  let e = boxCache.get(o)
  if (!e) { e = { box: new THREE.Box3(), frame: -1 }; boxCache.set(o, e) }
  if (e.frame !== frameNo) { e.box.setFromObject(o); e.frame = frameNo }
  return e.box
}
/** Candidates of `set` whose bounds are within d of point p (XZ, y aware). */
function near(set: Set<THREE.Object3D>, p: THREE.Vector3, d: number, out: THREE.Object3D[]) {
  out.length = 0
  for (const o of set) {
    const b = boxOf(o)
    if (b.isEmpty()) continue
    _n1.set(Math.max(b.min.x, Math.min(p.x, b.max.x)), Math.max(b.min.y, Math.min(p.y, b.max.y)), Math.max(b.min.z, Math.min(p.z, b.max.z)))
    if (_n1.distanceToSquared(p) <= d * d) out.push(o)
  }
  return out
}
/** Objects of `set` whose bounds may touch segment a→b (conservative sphere test). */
function nearSeg(set: Set<THREE.Object3D>, a: THREE.Vector3, b: THREE.Vector3, pad: number, out: THREE.Object3D[]) {
  out.length = 0
  const half = a.distanceTo(b) * 0.5
  _n1.copy(a).add(b).multiplyScalar(0.5)
  for (const o of set) {
    const bx = boxOf(o)
    if (bx.isEmpty()) continue
    if (bx.distanceToPoint(_n1) < half + bx.getSize(_n2).length() * 0.5 + pad) out.push(o)
  }
  return out
}
const dampAngle = (a: number, b: number, l: number, dt: number) => {
  const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + d * (1 - Math.exp(-l * dt))
}

/* ---- bridge spline: the walk-bridge-* strip is 41 world-space vertex PAIRS,
   one pair per deck section — its midpoint polyline IS the centreline. */
type BridgeLine = {
  cx: Float32Array; cy: Float32Array; cz: Float32Array
  hw: Float32Array; cum: Float32Array; len: number
}
const bridgeCache = new WeakMap<THREE.Object3D, BridgeLine>()
function bridgeLine(o: THREE.Object3D): BridgeLine | null {
  const hit = bridgeCache.get(o); if (hit) return hit
  const pa = (o as THREE.Mesh).geometry?.getAttribute?.('position')
  if (!pa || pa.count < 4) return null
  const n = Math.floor(pa.count / 2)
  const L: BridgeLine = { cx: new Float32Array(n), cy: new Float32Array(n), cz: new Float32Array(n), hw: new Float32Array(n), cum: new Float32Array(n), len: 0 }
  for (let i = 0; i < n; i++) {
    const ax = pa.getX(i * 2), ay = pa.getY(i * 2), az = pa.getZ(i * 2)
    const bx = pa.getX(i * 2 + 1), by = pa.getY(i * 2 + 1), bz = pa.getZ(i * 2 + 1)
    L.cx[i] = (ax + bx) / 2; L.cy[i] = (ay + by) / 2; L.cz[i] = (az + bz) / 2
    L.hw[i] = Math.hypot(bx - ax, by - ay, bz - az) / 2
    L.cum[i] = i ? L.cum[i - 1] + Math.hypot(L.cx[i] - L.cx[i - 1], L.cy[i] - L.cy[i - 1], L.cz[i] - L.cz[i - 1]) : 0
  }
  L.len = L.cum[n - 1] || 1
  bridgeCache.set(o, L)
  return L
}
const _bq = { x: 0, y: 0, z: 0, tx: 0, tz: 0, sx: 0, sz: 0, hw: 0 }
/** Point + frame on the centreline at arc-length s (xz tangent, side = left normal). */
function bridgeAt(L: BridgeLine, s: number) {
  const t = THREE.MathUtils.clamp(s, 0, L.len)
  let i = 0
  while (i < L.cum.length - 2 && L.cum[i + 1] < t) i++
  const seg = Math.max(1e-6, L.cum[i + 1] - L.cum[i])
  const f = THREE.MathUtils.clamp((t - L.cum[i]) / seg, 0, 1)
  _bq.x = THREE.MathUtils.lerp(L.cx[i], L.cx[i + 1], f)
  _bq.y = THREE.MathUtils.lerp(L.cy[i], L.cy[i + 1], f)
  _bq.z = THREE.MathUtils.lerp(L.cz[i], L.cz[i + 1], f)
  const tx = L.cx[i + 1] - L.cx[i], tz = L.cz[i + 1] - L.cz[i]
  const tl = Math.hypot(tx, tz) || 1
  _bq.tx = tx / tl; _bq.tz = tz / tl
  _bq.sx = -_bq.tz; _bq.sz = _bq.tx
  _bq.hw = THREE.MathUtils.lerp(L.hw[i], L.hw[i + 1], f)
  return _bq
}
/** Nearest arc-length + signed lateral offset of a world point on the strip. */
function bridgeNearest(L: BridgeLine, x: number, z: number) {
  let bi = 0, bd = Infinity
  for (let i = 0; i < L.cum.length - 1; i++) {
    const sx = L.cx[i + 1] - L.cx[i], sz = L.cz[i + 1] - L.cz[i]
    const sl = sx * sx + sz * sz || 1e-9
    const f = THREE.MathUtils.clamp(((x - L.cx[i]) * sx + (z - L.cz[i]) * sz) / sl, 0, 1)
    const px = L.cx[i] + sx * f - x, pz = L.cz[i] + sz * f - z
    const d = px * px + pz * pz
    if (d < bd) { bd = d; bi = i }
  }
  const sx = L.cx[bi + 1] - L.cx[bi], sz = L.cz[bi + 1] - L.cz[bi]
  const sl = Math.hypot(sx, sz) || 1e-9
  const f = THREE.MathUtils.clamp(((x - L.cx[bi]) * sx + (z - L.cz[bi]) * sz) / (sl * sl), 0, 1)
  const s = L.cum[bi] + f * sl
  const lat = (x - (L.cx[bi] + sx * f)) * (-sz / sl) + (z - (L.cz[bi] + sz * f)) * (sx / sl)
  return { s, lat }
}

export default function Player({ start }: { start?: THREE.Vector3 }) {
  const body = useRef<THREE.Group>(null!)
  const blob = useRef<THREE.Mesh>(null!)
  const socketRef = useRef<THREE.Group | null>(null)
  const tsRef = useRef(1)
  const [anim, setAnim] = useState<Anim>('idle')
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  // Seed the spawn synchronously: on a plain visitor load nothing else places
  // the player, and the passive effect below can land after the first physics
  // frames (lazy chunk inside Suspense), leaving pos at the origin — inside the
  // island, falling forever.
  const seed = () => start?.clone() ?? (player.pos.lengthSq() > 0.01 ? player.pos.clone()
    : ISLAND_POS[0].clone().add(ENTRY).add(new THREE.Vector3(0, 0.4, 0)))
  const S = useRef({
    pos: seed(), vel: new THREE.Vector3(), yaw: 0,
    grounded: false, coyote: 0, groundY: 0, airT: 0, prevVy: 0, groundName: '',
    groundObj: null as THREE.Object3D | null,
    bridge: { on: false, obj: null as THREE.Object3D | null, line: null as BridgeLine | null, s: 0, lat: 0, t: 0 },
    lastSafe: seed(), hist: [] as THREE.Vector3[], histT: 0,
    stepAcc: 0, camYaw: 0, camPitch: 0.42, camDist: BASE_DIST, camDistT: BASE_DIST, zoomMul: 1.0,
    targetSm: new THREE.Vector3(), first: true, respawnT: 0,
  })

  // spawn point: island 0 entry — unless WORLD/QA already placed us (e.g. ?at=
  // fires goto before this lazy chunk mounts). Same convention as FallbackRig:
  // a non-zero core.player.pos means someone else owns the spawn.
  useEffect(() => {
    const s = S.current
    const placed = player.pos.lengthSq() > 0.01
    s.pos.copy(start ?? (placed ? player.pos : _v1.copy(ISLAND_POS[0]).add(ENTRY).add(_v2.set(0, 0.4, 0))))
    s.lastSafe.copy(s.pos); s.targetSm.copy(s.pos).add(_v2.set(0, 1.05, 0))
    s.hist = Array.from({ length: 40 }, () => s.pos.clone())
  }, [start])

  // input listeners + canvas handle + ?qa api
  useEffect(() => {
    input.canvasEl = gl.domElement
    gl.domElement.style.touchAction = 'none' // joystick/orbit drags must not scroll the page
    const un = installInput()
    const api = {
      pos: () => { const p = S.current.pos; return [p.x, p.y, p.z] },
      teleport: (x: number, y: number, z: number) => {
        const s = S.current
        s.pos.set(x, y, z); s.vel.set(0, 0, 0); s.lastSafe.copy(s.pos)
        s.hist.fill(s.pos.clone()); s.histT = 0 // don't respawn back across the map
        s.targetSm.copy(s.pos).add(_v2.set(0, 1.05, 0)); s.first = true
        s.bridge.on = false; s.groundObj = null; s.groundName = ''
      },
      press: (key: string, ms?: number) => pressKey(key, ms),
    }
    const attach = () => { const j = (window as any); (j.__journey ||= {}).player = api }
    attach(); const t = setTimeout(attach, 0)
    return () => { un(); clearTimeout(t); input.canvasEl = null }
  }, [gl])

  const nearA: THREE.Object3D[] = [], nearB: THREE.Object3D[] = [], hits: THREE.Intersection[] = []

  useFrame((_, rawDt) => {
    frameNo++
    const s = S.current
    const dt = Math.min(rawDt, 1 / 30) // frame-rate things (camera damp, anim rate)
    const t = now()
    const cine = cinematic.on
    const frozen = player.frozen || cine
    const riding = heli.flying

    /* ---- input → wish dir (camera-relative) ---- */
    let ix = 0, iz = 0
    if (!frozen) {
      if (isDown('KeyW', 'ArrowUp')) iz -= 1
      if (isDown('KeyS', 'ArrowDown')) iz += 1
      if (isDown('KeyA', 'ArrowLeft')) ix -= 1
      if (isDown('KeyD', 'ArrowRight')) ix += 1
      ix += input.joy.x; iz += input.joy.y
    }
    const fwd = _v1.set(-Math.sin(s.camYaw), 0, -Math.cos(s.camYaw))
    const rgt = _v2.set(-fwd.z, 0, fwd.x)
    const wish = _wish.set(0, 0, 0).addScaledVector(fwd, -iz).addScaledVector(rgt, ix)
    const wishLen = Math.min(1, wish.length())
    if (wishLen > 1e-4) wish.normalize()
    const run = isDown('ShiftLeft', 'ShiftRight') || (input.joy.active && wishLen > 0.92)
    const speed = (run ? RUN : WALK) * wishLen

    let hSpeed = Math.hypot(s.vel.x, s.vel.z)
    if (riding) {
      /* aboard the heli: the craft (Heli.tsx) drives pos/vel — the rider sits
         at the world seat point; camera + interactable scan below run as usual */
      s.pos.copy(heli.seat)
      s.vel.copy(heli.vel)
      s.grounded = heli.landed; s.groundObj = null; s.groundName = ''
      s.groundY = heli.pos.y - 0.45; s.airT = 0; s.coyote = 0
      s.bridge.on = false
      hSpeed = Math.hypot(s.vel.x, s.vel.z)
      if (hSpeed > 0.6) s.yaw = dampAngle(s.yaw, Math.atan2(s.vel.x, s.vel.z), 8, dt)
    }
    if (!riding) {

    /* path magnetism at the bridge mouth: while grounded on the island's own
       flat top (walk-<id>) and heading roughly toward its exit, bend the wish
       toward the mouth point. Pure direction math — frame-time independent —
       and it only biases heading already aimed at the exit, so free roaming
       along the rim is unaffected. At low fps this is what converges short
       probe bursts through furniture pockets onto the path corridor. */
    const bi = nearestIsland(s.pos)
    if (s.grounded && wishLen > 0.05 && s.groundName === `walk-${V5_ORDER[bi]}` && bi < V5_ORDER.length - 1) {
      const ex = ISLAND_POS[bi].x + EXIT.x, ez = ISLAND_POS[bi].z + EXIT.z
      const dx = ex - s.pos.x, dz = ez - s.pos.z
      const dd = Math.hypot(dx, dz)
      if (dd > 0.9 && dd < 5.5) {
        const tx = dx / dd, tz = dz / dd
        const align = wish.x * tx + wish.z * tz
        if (align > 0.1) {
          const k = Math.min(0.5, (1 - dd / 5.5) * 0.55) * Math.min(1, align * 1.4)
          wish.x += tx * k; wish.z += tz * k
          const l = Math.hypot(wish.x, wish.z) || 1; wish.x /= l; wish.z /= l
        }
      }
    }

    /* ---- bridge auto-guide (design: friendly crossing) — once grounded on a
       walk-bridge-* strip the player is carried along its centreline: input
       steers progress (forward/back) and a small lateral offset clamped inside
       the rails; they cannot fall off. Arc-length advances by DISTANCE PER
       REAL TIME — fully frame-rate independent. Spline = section midpoints of
       the strip's world-space vertex pairs (41 sections). ---- */
    const bd = s.bridge
    if (!bd.on) {
      let obj: THREE.Object3D | null = null
      if (s.grounded && s.groundObj && s.groundObj.name.startsWith('walk-bridge')) obj = s.groundObj
      else {
        // airborne near a strip: stepped off the rim BESIDE the mouth (the
        // straight line to the next island misses the mouth laterally) or a
        // ledge drop past the flare — the deck catches them instead of falling
        // through the rim↔strip gap. Within ~hw*1.2+1.2 lateral, ±deck height.
        for (const o of near(walkables, s.pos, 4, nearA)) {
          if (!o.name.startsWith('walk-bridge')) continue
          const L = bridgeLine(o); if (!L) continue
          const c = bridgeNearest(L, s.pos.x, s.pos.z)
          const q = bridgeAt(L, c.s)
          if (c.s > -0.8 && c.s < L.len + 0.8 && Math.abs(c.lat) < q.hw * 1.2 + 1.2 && s.pos.y - q.y > -1.6 && s.pos.y - q.y < 1.8) { obj = o; break }
        }
      }
      if (obj) {
        const L = bridgeLine(obj)!
        const np = bridgeNearest(L, s.pos.x, s.pos.z)
        bd.on = true; bd.line = L; bd.obj = obj; bd.s = np.s; bd.lat = np.lat; bd.t = t
      }
    }
    // stepped onto land (only possible at the ends) → hand back to free physics
    if (bd.on && s.grounded && s.groundObj && !s.groundObj.name.startsWith('walk-bridge')) bd.on = false

    hSpeed = Math.hypot(s.vel.x, s.vel.z)
    if (bd.on && bd.line) {
      const L = bd.line
      const dtR = Math.min(0.5, Math.max(0, (t - bd.t) / 1000)); bd.t = t
      const p0 = bridgeAt(L, bd.s)
      const fwdC = THREE.MathUtils.clamp(wish.x * p0.tx + wish.z * p0.tz, -1, 1)
      const latC = THREE.MathUtils.clamp(wish.x * p0.sx + wish.z * p0.sz, -1, 1)
      const adv = fwdC * speed
      bd.s += adv * dtR
      bd.lat += latC * 1.6 * dtR
      bd.lat -= bd.lat * Math.min(1, 2.2 * dtR) // gentle recentring drift
      const q = bridgeAt(L, bd.s)
      bd.lat = THREE.MathUtils.clamp(bd.lat, -q.hw * 0.78, q.hw * 0.78)
      // pushing past either end releases to normal physics (island tops underlap)
      if ((bd.s <= 0.02 && adv < 0) || (bd.s >= L.len - 0.02 && adv > 0)) bd.on = false
      if (bd.on) {
        s.pos.x = q.x + q.sx * bd.lat; s.pos.z = q.z + q.sz * bd.lat
        if (!frozen && t - input.jumpAt < BUFFER * 1000 && (s.grounded || s.coyote > 0)) {
          s.vel.y = JUMP_V; s.grounded = false; s.coyote = 0; input.jumpAt = -1e9; s.airT = 0
          spawnDust(s.pos, 3, 0.14, 0.5, 0.15)
        }
        s.vel.y = Math.max(-30, s.vel.y - GRAV * dtR)
        s.pos.y += s.vel.y * dtR
        if (s.vel.y <= 0 && s.pos.y <= q.y + 0.05) {
          s.pos.y = q.y; s.vel.y = 0; s.grounded = true; s.coyote = COYOTE; s.airT = 0; s.groundY = q.y
        } else { s.grounded = false; s.coyote -= dtR; s.airT += dtR }
        s.vel.x = q.tx * adv; s.vel.z = q.tz * adv
        hSpeed = Math.abs(adv)
        if (hSpeed > 0.35) s.yaw = dampAngle(s.yaw, Math.atan2(s.vel.x, s.vel.z), TURN, dtR)
        if (bd.obj) { s.groundObj = bd.obj; s.groundName = bd.obj.name }
        s.histT += dtR
        if (s.grounded && s.histT > 0.05) {
          s.histT = 0; s.hist.push(s.pos.clone()); if (s.hist.length > 60) s.hist.shift()
          if (s.vel.lengthSq() < 30) s.lastSafe.copy(s.hist[Math.max(0, s.hist.length - 16)])
        }
        const ui = usePlayerUI.getState()
        if (s.pos.y < Math.min(s.lastSafe.y, 0) - 16 || !Number.isFinite(s.pos.y)) {
          s.pos.copy(s.lastSafe); s.vel.set(0, 0, 0); s.bridge.on = false
          s.grounded = false; ui.setFading(false); ui.bumpRespawn()
          s.targetSm.copy(s.pos).add(_v2.set(0, 1.05, 0))
        }
        if (s.grounded && hSpeed > 0.6) {
          s.stepAcc += hSpeed * dtR
          const stride = run ? 0.72 : 0.55
          if (s.stepAcc > stride) { s.stepAcc = 0; spawnDust(_v1.set(s.pos.x, s.groundY + 0.02, s.pos.z), run ? 4 : 3, 0.12, 0.4, 0.13) }
        } else s.stepAcc = 0
      }
    }

    /* ---- physics: substep so sim speed survives slow frames (was: one capped
       step → at ~10 fps the sim ran at a third of real speed and scripted
       walks fell behind the world) ---- */
    if (!bd.on) {
    let rem = Math.min(rawDt, 0.26) // ~8 substeps — keeps real pace down to ~4 fps
    while (rem > 1e-5) {
      const h = Math.min(rem, 1 / 30); rem -= h

      /* horizontal velocity: accel / decel */
      const rate = s.grounded ? 15 : 5.5
      const k = 1 - Math.exp(-rate * h)
      s.vel.x += (wish.x * speed - s.vel.x) * k
      s.vel.z += (wish.z * speed - s.vel.z) * k
      hSpeed = Math.hypot(s.vel.x, s.vel.z)

      /* facing: slerp yaw toward velocity */
      if (hSpeed > 0.35) s.yaw = dampAngle(s.yaw, Math.atan2(s.vel.x, s.vel.z), TURN, h)

      /* jump: buffer + coyote */
      if (!frozen && t - input.jumpAt < BUFFER * 1000 && (s.grounded || s.coyote > 0)) {
        s.vel.y = JUMP_V; s.grounded = false; s.coyote = 0; input.jumpAt = -1e9
        s.airT = 0; s.prevVy = 0
        spawnDust(s.pos, 3, 0.14, 0.5, 0.15)
      }

      /* gravity + integrate */
      s.prevVy = s.vel.y
      s.vel.y = Math.max(-30, s.vel.y - GRAV * h)
      s.pos.addScaledVector(s.vel, h)
      if (!s.grounded) { s.coyote -= h; s.airT += h }

      /* walls: short horizontal rays vs blockers, slide + push out */
      if (hSpeed > 0.05) {
        const moveDir = _v1.set(s.vel.x / hSpeed, 0, s.vel.z / hSpeed)
        near(blockers, s.pos, RADIUS + 1.4, nearA)
        if (nearA.length) {
          for (const hy of [0.28, 0.66]) {
            const org = _v2.set(s.pos.x, s.pos.y + hy, s.pos.z)
            for (const ang of [0, 0.65, -0.65, 1.2, -1.2]) {
              const c = Math.cos(ang), sn = Math.sin(ang)
              const dir = _v3.set(moveDir.x * c - moveDir.z * sn, 0, moveDir.x * sn + moveDir.z * c)
              _ray.set(org, dir); _ray.far = RADIUS + hSpeed * h + 0.06
              hits.length = 0
              const hit = _ray.intersectObjects(nearA, true, hits)[0]
              if (!hit || !hit.face) continue
              const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
              n.y = 0
              if (n.lengthSq() < 1e-6 || n.dot(dir) > -0.15) continue
              n.normalize()
              // push out + slide along the wall
              const pen = RADIUS + 0.02 - hit.distance
              if (pen > 0) s.pos.addScaledVector(n, pen)
              const into = s.vel.dot(n)
              if (into < 0) s.vel.addScaledVector(n, -into)
            }
          }
        }
      }

      /* ground: raycast down vs walkables */
      let grounded = false
      let groundObj: THREE.Object3D | null = null
      let groundFace = -1
      const cands = near(walkables, s.pos, 2.2, nearB)
      if (cands.length) {
        _ray.set(_v1.set(s.pos.x, s.pos.y + STEP, s.pos.z), _down)
        _ray.far = STEP + 3.2
        hits.length = 0
        const hit = _ray.intersectObjects(cands, true, hits)[0]
        if (hit) {
          const gy = hit.point.y, dy = s.pos.y - gy
          const landing = !s.grounded && s.prevVy <= 0 && dy <= 0.08 && dy > -0.9
          const tracing = s.grounded && s.vel.y <= 0.01 && dy <= STEP && dy > -STEP
          if (landing || tracing) {
            if (landing && s.prevVy < -4) spawnDust(_v2.set(s.pos.x, gy, s.pos.z), 7, 0.24, 0.5, 0.24)
            s.pos.y = gy; s.vel.y = 0; grounded = true; s.groundY = gy
            groundObj = hit.object; groundFace = hit.faceIndex ?? -1
          }
        }
      }
      s.grounded = grounded
      if (grounded) { s.coyote = COYOTE; s.airT = 0; s.groundName = groundObj?.name ?? ''; s.groundObj = groundObj }

      /* bridge rail guide: near/on a walk-bridge strip, steer lateral offset
         back to its centreline — the deck drifts diagonally between islands,
         so holding a straight world-x slid off the west edge, and drops from
         L02's ledge lip fell just past the flare. Grounded on the strip the
         offset is a hard clamp (never off the deck edge); within reach in the
         air it's a strong pull (lip drops get pulled into the corridor).
         Strip verts are world-space pairs per deck section; faceIndex /2
         locates the section when standing on it, else nearest midpoint. */
      {
        let bOff = Infinity, bLx = 0, bLz = 0, bDy = 0, bHw = 0, bAd = Infinity, found = false
        for (const o of cands) {
          if (!o.name.startsWith('walk-bridge')) continue
          const pa = (o as THREE.Mesh).geometry.getAttribute('position')
          let bi = -1, ad = Infinity
          if (o === groundObj && groundFace >= 0) bi = Math.min(pa.count - 2, Math.floor(groundFace / 2) * 2)
          else {
            let bd = Infinity
            for (let i = 0; i + 1 < pa.count; i += 2) {
              const mx = (pa.getX(i) + pa.getX(i + 1)) * 0.5, mz = (pa.getZ(i) + pa.getZ(i + 1)) * 0.5
              const d = (mx - s.pos.x) * (mx - s.pos.x) + (mz - s.pos.z) * (mz - s.pos.z)
              if (d < bd) { bd = d; bi = i }
            }
            ad = bd
          }
          if (bi < 0) continue
          let lx = pa.getX(bi + 1) - pa.getX(bi), lz = pa.getZ(bi + 1) - pa.getZ(bi)
          const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll
          const cx = (pa.getX(bi) + pa.getX(bi + 1)) * 0.5
          const cy = (pa.getY(bi) + pa.getY(bi + 1)) * 0.5
          const cz = (pa.getZ(bi) + pa.getZ(bi + 1)) * 0.5
          const off = (s.pos.x - cx) * lx + (s.pos.z - cz) * lz
          const dy = s.pos.y - cy
          if (o === groundObj && groundFace >= 0) ad = (cx - s.pos.x) * (cx - s.pos.x) + (cz - s.pos.z) * (cz - s.pos.z)
          if (!found || Math.abs(off) < Math.abs(bOff)) { bOff = off; bLx = lx; bLz = lz; bDy = dy; bHw = ll * 0.5; bAd = ad; found = true }
        }
        const onStrip = grounded && !!groundObj && groundObj.name.startsWith('walk-bridge')
        // corridor catch: flares widen the reach at the mouths; far out it tapers
        // to a modest rail so wandering past mid-deck can't vacuum you sideways.
        const reach = onStrip ? Infinity : Math.min(2.6, bHw * 1.5 + 0.8)
        if (found && (onStrip || (Math.abs(bOff) < reach && bAd < 16 && bDy < 2.6 && bDy > -1.0))) {
          if (onStrip && Math.abs(bOff) > bHw * 0.82) {
            // hard rail: never let a grounded walk slide off the deck side
            const cl = Math.sign(bOff) * bHw * 0.82 - bOff
            s.pos.x += bLx * cl; s.pos.z += bLz * cl
            const vLat = s.vel.x * bLx + s.vel.z * bLz
            s.vel.x -= bLx * vLat; s.vel.z -= bLz * vLat
            bOff += cl
          }
          const corr = THREE.MathUtils.clamp(bOff * (onStrip ? 6 : 5), -(onStrip ? 1.4 : 2.4), onStrip ? 1.4 : 2.4) * h
          s.pos.x -= bLx * corr; s.pos.z -= bLz * corr
          const vLat = s.vel.x * bLx + s.vel.z * bLz
          const bleed = Math.min(1, 3 * h)
          s.vel.x -= bLx * vLat * bleed; s.vel.z -= bLz * vLat * bleed
        }
      }

      /* safe-point history + fall respawn */
      s.histT += h
      if (grounded && s.histT > 0.05) {
        s.histT = 0; s.hist.push(s.pos.clone()); if (s.hist.length > 60) s.hist.shift()
        if (s.vel.lengthSq() < 30) s.lastSafe.copy(s.hist[Math.max(0, s.hist.length - 16)])
      }
      const ui = usePlayerUI.getState()
      if (s.pos.y < Math.min(s.lastSafe.y, 0) - 16 || !Number.isFinite(s.pos.y)) {
        s.pos.copy(s.hist[Math.max(0, s.hist.length - 30)] ?? s.lastSafe)
        s.vel.set(0, 0, 0); s.grounded = false; ui.setFading(false); ui.bumpRespawn()
        s.targetSm.copy(s.pos).add(_v2.set(0, 1.05, 0))
      } else if (s.pos.y < s.lastSafe.y - 7 && !ui.fading) {
        ui.setFading(true)
      }

      /* footsteps dust */
      if (grounded && hSpeed > 0.6) {
        s.stepAcc += hSpeed * h
        const stride = run ? 0.72 : 0.55
        if (s.stepAcc > stride) {
          s.stepAcc = 0
          spawnDust(_v1.set(s.pos.x, s.groundY + 0.02, s.pos.z), run ? 4 : 3, 0.12, 0.4, 0.13)
        }
      } else s.stepAcc = 0
    }
    }
    } // !riding

    /* heli disembark: Heli writes exitAt once when the rider lands on the pad */
    if (heli.exitAt) {
      s.pos.copy(heli.exitAt); s.vel.set(0, 0, 0); s.grounded = false
      s.lastSafe.copy(s.pos); s.hist.fill(s.pos.clone()); s.histT = 0
      s.targetSm.copy(s.pos).add(_v2.set(0, 1.05, 0)); s.first = true
      s.bridge.on = false; s.groundName = ''; s.groundObj = null
      heli.exitAt = null
    }

    /* ---- write core.player ---- */
    player.pos.copy(s.pos); player.vel.copy(s.vel)
    player.facing = s.yaw; player.grounded = s.grounded
    player.island = V5_ORDER[nearestIsland(s.pos)]

    /* ---- interactables: nearest enabled in radius ---- */
    let bestIt = null as core.Interactable | null, bestD = 1e9
    interactables.forEach((it) => {
      if (it.enabled && !it.enabled()) return
      const d = it.at().distanceTo(s.pos)
      if (d <= it.radius && d < bestD) { bestD = d; bestIt = it }
    })
    currentUse.it = bestIt
    usePlayerUI.getState().setPrompt(!riding && bestIt ? { id: bestIt.id, label: bestIt.label } : null)
    if (bestIt && t - input.useAt < 160 && !frozen && !riding) { bestIt.use(); input.useAt = -1e9 }

    /* ---- animation pick ---- */
    const em = playerEmote.name
    let want: Anim = 'idle'
    if (em) want = em
    else if (!s.grounded && s.airT > 0.06) want = 'jump'
    else if (hSpeed > 0.3) want = 'walk'
    tsRef.current = THREE.MathUtils.clamp(hSpeed / WALK + 0.15, 0.75, 2.0)
    if (want !== anim) setAnim(want)

    /* ---- apply transform + anchor ---- */
    body.current.position.copy(s.pos); body.current.rotation.y = s.yaw
    if (socketRef.current) {
      socketRef.current.getWorldPosition(carryAnchor)
      socketRef.current.getWorldQuaternion(carryQuat)
    }
    if (blob.current) {
      blob.current.position.set(s.pos.x, s.groundY + 0.021, s.pos.z)
      const air = THREE.MathUtils.clamp(1 - (s.pos.y - s.groundY) * 0.3, 0.35, 1)
      blob.current.scale.setScalar(air)
    }

    /* ---- camera: orbit + zoom + pull-in, critically damped ---- */
    s.camYaw -= input.camDX * 0.0052
    s.camPitch = THREE.MathUtils.clamp(s.camPitch + input.camDY * 0.0044, PITCH_MIN, PITCH_MAX)
    s.zoomMul = THREE.MathUtils.clamp(s.zoomMul * Math.exp(input.zoom * 0.001), 0.25, 2.5)
    // Portrait screens pull back further so the island still reads (aspect = w/h).
    const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6
    const baseDist = BASE_DIST * (aspect < 1 ? 1 + (1 - aspect) * 0.45 : 1) * (riding ? 1.5 : 1)
    s.camDistT = THREE.MathUtils.clamp(baseDist * s.zoomMul, DIST_MIN, DIST_MAX)
    input.camDX = input.camDY = input.zoom = 0
    if (!cine) {
      _v1.copy(s.pos).add(_v2.set(0, 1.05, 0))
      if (s.first || _v1.distanceToSquared(s.targetSm) > 36) { s.targetSm.copy(_v1); s.first = false }
      else { s.targetSm.x = THREE.MathUtils.damp(s.targetSm.x, _v1.x, 13, dt); s.targetSm.y = THREE.MathUtils.damp(s.targetSm.y, _v1.y, 13, dt); s.targetSm.z = THREE.MathUtils.damp(s.targetSm.z, _v1.z, 13, dt) }
      const cp = Math.cos(s.camPitch), sp = Math.sin(s.camPitch)
      const dir = _v2.set(Math.sin(s.camYaw) * cp, sp, Math.cos(s.camYaw) * cp)
      // pull-in: ray toward desired camera spot, stop before the first thing in the way
      _v3.copy(s.targetSm).addScaledVector(dir, s.camDistT)
      let eff = s.camDistT
      const blockCand = nearSeg(walkables, s.targetSm, _v3, 0.6, nearA)
      nearSeg(blockers, s.targetSm, _v3, 0.6, nearB).forEach((o) => { if (!blockCand.includes(o)) blockCand.push(o) })
      if (blockCand.length) {
        _ray.set(s.targetSm, dir); _ray.far = s.camDistT
        hits.length = 0
        const hit = _ray.intersectObjects(blockCand, true, hits)[0]
        if (hit) eff = THREE.MathUtils.clamp(hit.distance - 0.22, 0.55, s.camDistT)
      }
      s.camDist = THREE.MathUtils.damp(s.camDist, eff, eff < s.camDist ? 26 : 6, dt)
      camera.position.copy(s.targetSm).addScaledVector(dir, s.camDist)
      camera.lookAt(s.targetSm)
    }
    if (DBG) {
      ;(window as any).__pldbg = {
        pos: [+s.pos.x.toFixed(2), +s.pos.y.toFixed(2), +s.pos.z.toFixed(2)],
        cam: [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)],
        pitch: +s.camPitch.toFixed(2), dist: +s.camDist.toFixed(2), grounded: s.grounded,
        anim, scale: body.current ? +body.current.scale.x.toFixed(3) : -1,
        flying: riding, it: bestIt?.id ?? null, useDt: +(t - input.useAt).toFixed(0),
      }
    }
  })

  return (
    <group>
      <group ref={body}>
        <Suspense fallback={null}><Model anim={anim} tsRef={tsRef} socketRef={socketRef} /></Suspense>
      </group>
      <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} material={blobMat()} renderOrder={1}>
        <planeGeometry args={[0.72, 0.72]} />
      </mesh>
      <DustPool />
    </group>
  )
}

useGLTF.preload(URL)
