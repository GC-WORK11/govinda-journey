import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, useAnimations, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { clay, C, blobMat } from '../../world/kit'
import * as core from '../core'
import { blockers, cinematic, interactables, player, playerEmote, walkables, V5_ORDER } from '../core'
import { ISLAND_POS, ENTRY, nearestIsland } from '../world/layout'
import { input, installInput, isDown, now, pressKey } from './input'
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
const PITCH_MIN = 0.06, PITCH_MAX = 1.22, DIST_MIN = 2.1, DIST_MAX = 6.4

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3()
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

export default function Player({ start }: { start?: THREE.Vector3 }) {
  const body = useRef<THREE.Group>(null!)
  const blob = useRef<THREE.Mesh>(null!)
  const socketRef = useRef<THREE.Group | null>(null)
  const tsRef = useRef(1)
  const [anim, setAnim] = useState<Anim>('idle')
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const S = useRef({
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0,
    grounded: false, coyote: 0, groundY: 0, airT: 0, prevVy: 0,
    lastSafe: new THREE.Vector3(), hist: [] as THREE.Vector3[], histT: 0,
    stepAcc: 0, camYaw: 0, camPitch: 0.34, camDist: 4.6, camDistT: 4.6,
    targetSm: new THREE.Vector3(), first: true, respawnT: 0,
  })

  // spawn point: island 0 entry (WORLD may also teleport via ?qa goto)
  useEffect(() => {
    const s = S.current
    s.pos.copy(start ?? _v1.copy(ISLAND_POS[0]).add(ENTRY).add(_v2.set(0, 0.4, 0)))
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
        s.targetSm.copy(s.pos).add(_v2.set(0, 1.05, 0)); s.first = true
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
    const dt = Math.min(rawDt, 1 / 30)
    const t = now()
    const cine = cinematic.on
    const frozen = player.frozen || cine

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
    const wish = _v3.set(0, 0, 0).addScaledVector(fwd, -iz).addScaledVector(rgt, ix)
    const wishLen = Math.min(1, wish.length())
    if (wishLen > 1e-4) wish.normalize()
    const run = isDown('ShiftLeft', 'ShiftRight') || (input.joy.active && wishLen > 0.92)
    const speed = (run ? RUN : WALK) * wishLen

    /* ---- horizontal velocity: accel / decel ---- */
    const rate = s.grounded ? 15 : 5.5
    const k = 1 - Math.exp(-rate * dt)
    s.vel.x += (wish.x * speed - s.vel.x) * k
    s.vel.z += (wish.z * speed - s.vel.z) * k
    const hSpeed = Math.hypot(s.vel.x, s.vel.z)

    /* ---- facing: slerp yaw toward velocity ---- */
    if (hSpeed > 0.35) s.yaw = dampAngle(s.yaw, Math.atan2(s.vel.x, s.vel.z), TURN, dt)

    /* ---- jump: buffer + coyote ---- */
    if (!frozen && t - input.jumpAt < BUFFER * 1000 && (s.grounded || s.coyote > 0)) {
      s.vel.y = JUMP_V; s.grounded = false; s.coyote = 0; input.jumpAt = -1e9
      s.airT = 0; s.prevVy = 0
      spawnDust(s.pos, 3, 0.14, 0.5, 0.15)
    }

    /* ---- gravity + integrate ---- */
    s.prevVy = s.vel.y
    s.vel.y = Math.max(-30, s.vel.y - GRAV * dt)
    s.pos.addScaledVector(s.vel, dt)
    if (!s.grounded) { s.coyote -= dt; s.airT += dt }

    /* ---- walls: short horizontal rays vs blockers, slide + push out ---- */
    const hv = Math.hypot(s.vel.x, s.vel.z)
    if (hv > 0.05) {
      const moveDir = _v1.set(s.vel.x / hv, 0, s.vel.z / hv)
      near(blockers, s.pos, RADIUS + 1.4, nearA)
      if (nearA.length) {
        for (const h of [0.28, 0.66]) {
          const org = _v2.set(s.pos.x, s.pos.y + h, s.pos.z)
          for (const ang of [0, 0.65, -0.65, 1.2, -1.2]) {
            const c = Math.cos(ang), sn = Math.sin(ang)
            const dir = _v3.set(moveDir.x * c - moveDir.z * sn, 0, moveDir.x * sn + moveDir.z * c)
            _ray.set(org, dir); _ray.far = RADIUS + hv * dt + 0.06
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

    /* ---- ground: raycast down vs walkables ---- */
    let grounded = false
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
        }
      }
    }
    s.grounded = grounded
    if (grounded) { s.coyote = COYOTE; s.airT = 0 }

    /* ---- safe-point history + fall respawn ---- */
    s.histT += dt
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

    /* ---- write core.player ---- */
    player.pos.copy(s.pos); player.vel.copy(s.vel)
    player.facing = s.yaw; player.grounded = s.grounded
    const bi = nearestIsland(s.pos)
    if (player.island !== V5_ORDER[bi]) player.island = V5_ORDER[bi]

    /* ---- interactables: nearest enabled in radius ---- */
    let bestIt = null as core.Interactable | null, bestD = 1e9
    interactables.forEach((it) => {
      if (it.enabled && !it.enabled()) return
      const d = it.at().distanceTo(s.pos)
      if (d <= it.radius && d < bestD) { bestD = d; bestIt = it }
    })
    currentUse.it = bestIt
    ui.setPrompt(bestIt ? { id: bestIt.id, label: bestIt.label } : null)
    if (bestIt && t - input.useAt < 160 && !frozen) { bestIt.use(); input.useAt = -1e9 }

    /* ---- animation pick ---- */
    const em = playerEmote.name
    let want: Anim = 'idle'
    if (em) want = em
    else if (!s.grounded && s.airT > 0.06) want = 'jump'
    else if (hSpeed > 0.3) want = 'walk'
    tsRef.current = THREE.MathUtils.clamp(hSpeed / WALK + 0.15, 0.75, 2.0)
    if (want !== anim) setAnim(want)

    /* ---- footsteps dust ---- */
    if (grounded && hSpeed > 0.6) {
      s.stepAcc += hSpeed * dt
      const stride = run ? 0.72 : 0.55
      if (s.stepAcc > stride) {
        s.stepAcc = 0
        spawnDust(_v1.set(s.pos.x, s.groundY + 0.02, s.pos.z), run ? 4 : 3, 0.12, 0.4, 0.13)
      }
    } else s.stepAcc = 0

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
    s.camDistT = THREE.MathUtils.clamp(s.camDistT * Math.exp(input.zoom * 0.0012), DIST_MIN, DIST_MAX)
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
    ;(window as any).__pldbg = {
      pos: [+s.pos.x.toFixed(2), +s.pos.y.toFixed(2), +s.pos.z.toFixed(2)],
      cam: [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)],
      pitch: +s.camPitch.toFixed(2), dist: +s.camDist.toFixed(2), grounded: s.grounded,
      anim, scale: body.current ? +body.current.scale.x.toFixed(3) : -1,
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
