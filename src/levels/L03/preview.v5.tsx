/**
 * Dev preview harness for ISL-B islands (until World5 lands).
 * A stand-alone page: placeholder island base + a minimal stub player
 * (WASD / Space / E, drag to orbit) + the real Obstacle under test.
 * URL: /src/levels/L03/dev.html  or  /src/levels/I01/dev.html   (add ?auto to run the solver, ?done to start solved)
 */
import { useEffect, useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { installInput, isDown, input, pressKey } from '../../v5/player/input'
import { C, clay } from '../../world/kit'

type ObstacleComp = (p: core.ObstacleProps) => JSX.Element | null

/* ------------------------------ stub island ------------------------------ */

function StubIsland() {
  const top = useRef<THREE.Mesh>(null)
  core.useWalkable(top)
  const under = useMemo(() => {
    const prof: [number, number][] = [[0.001, 0], [4.7, 0], [5.0, -0.22], [4.2, -1.2], [2.6, -2.6], [0.001, -3.9]]
    return new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48)
  }, [])
  return (
    <group>
      <mesh ref={top} position={[0, -0.125, 0]} material={clay(C.leaf)} receiveShadow>
        <cylinderGeometry args={[5, 5.15, 0.25, 56]} />
      </mesh>
      <mesh geometry={under} position={[0, -0.25, 0]} material={clay('#9d8469')} />
    </group>
  )
}

/* ------------------------------ stub player ------------------------------ */

const RAY = new THREE.Raycaster()
RAY.far = 3
const DOWN = new THREE.Vector3(0, -1, 0)
const boxCache = new WeakMap<THREE.Object3D, THREE.Box3>()

function groundAt(p: THREE.Vector3) {
  RAY.set(new THREE.Vector3(p.x, p.y + 0.9, p.z), DOWN)
  let best = -Infinity
  core.walkables.forEach((o) => {
    const hits = RAY.intersectObject(o, true)
    if (hits.length && hits[0].point.y > best) best = hits[0].point.y
  })
  return best
}

function StubPlayer() {
  const mesh = useRef<THREE.Group>(null)
  const st = useRef({
    vel: new THREE.Vector3(), grounded: false, coyote: 0, jumpT: -1e9, useT: -1e9,
    yaw: Math.PI, pitch: 0.42, dist: 6.2, camT: new THREE.Vector3(0, 1, 10),
  })
  const cap = useRef<THREE.Mesh>(null)
  const promptEl = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const off = installInput()
    core.player.pos.set(0, 0.3, 4.2)
    core.player.island = ISLAND
    promptEl.current = document.getElementById('prompt')
    const cv = document.querySelector('canvas')!
    let drag = false, lx = 0, ly = 0
    const dn = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY }
    const mv = (e: PointerEvent) => {
      if (!drag) return
      st.current.yaw -= (e.clientX - lx) * 0.006
      st.current.pitch = Math.min(1.2, Math.max(0.08, st.current.pitch + (e.clientY - ly) * 0.005))
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { drag = false }
    cv.addEventListener('pointerdown', dn)
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    return () => { off(); cv.removeEventListener('pointerdown', dn); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
  }, [])

  useFrame((s, dt) => {
    const c = st.current
    const p = core.player.pos
    // input dir, camera-relative
    let ix = (isDown('KeyD', 'ArrowRight') ? 1 : 0) - (isDown('KeyA', 'ArrowLeft') ? 1 : 0)
    let iz = (isDown('KeyW', 'ArrowUp') ? 1 : 0) - (isDown('KeyS', 'ArrowDown') ? 1 : 0)
    const l = Math.hypot(ix, iz) || 1
    ix /= l; iz /= l
    const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw)
    const mx = sy * iz + cy * ix
    const mz = cy * iz - sy * ix
    const run = isDown('ShiftLeft', 'ShiftRight')
    const spd = run ? 5.6 : 3.5
    const acc = c.grounded ? 26 : 10
    if (!core.player.frozen) {
      c.vel.x += (mx * spd - c.vel.x) * Math.min(1, acc * dt / spd * 3)
      c.vel.z += (mz * spd - c.vel.z) * Math.min(1, acc * dt / spd * 3)
    } else { c.vel.x *= 0.8; c.vel.z *= 0.8 }
    // gravity + jump
    c.vel.y -= 19 * dt
    c.coyote = c.grounded ? 0.12 : Math.max(0, c.coyote - dt)
    if (isDown('Space')) { /* held */ }
    if (input.jumpAt > c.jumpT) { c.jumpT = input.jumpAt }
    if (!core.player.frozen && c.jumpT > performance.now() - 140 && c.coyote > 0) {
      c.vel.y = 6.6; c.jumpT = -1e9; c.coyote = 0
    }
    p.x += c.vel.x * dt; p.z += c.vel.z * dt; p.y += c.vel.y * dt
    // blockers: capsule push-out (cheap Box3 test)
    core.blockers.forEach((o) => {
      let b = boxCache.get(o)
      if (!b) { b = new THREE.Box3().setFromObject(o); boxCache.set(o, b) }
      if (b.isEmpty()) return
      const e = b.clone().expandByScalar(0.3)
      if (p.y + 0.45 < e.min.y || p.y + 0.45 > e.max.y) return
      if (p.x < e.min.x || p.x > e.max.x || p.z < e.min.z || p.z > e.max.z) return
      const dxs = [e.max.x - p.x, p.x - e.min.x, e.max.z - p.z, p.z - e.min.z]
      const m = Math.min(...dxs)
      if (m === dxs[0]) p.x = e.max.x; else if (m === dxs[1]) p.x = e.min.x
      else if (m === dxs[2]) p.z = e.max.z; else p.z = e.min.z
    })
    // ground
    const g = groundAt(p)
    if (g > -Infinity && p.y <= g + 0.06 && c.vel.y <= 0.01) {
      if (g - p.y > -0.5) { p.y = g; c.vel.y = 0; c.grounded = true }
    } else c.grounded = false
    // respawn on void fall
    if (p.y < -9) { p.set(0, 0.4, 4.2); c.vel.set(0, 0, 0) }
    core.player.vel.copy(c.vel)
    core.player.grounded = c.grounded
    if (Math.hypot(c.vel.x, c.vel.z) > 0.3) {
      const t = Math.atan2(c.vel.x, c.vel.z)
      let d = t - core.player.facing
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2
      core.player.facing += d * Math.min(1, dt * 10)
    }
    // carry anchor fallback (PLAYER's real anchor overrides when present)
    // mesh
    if (mesh.current) {
      mesh.current.position.copy(p)
      mesh.current.rotation.y = core.player.facing
    }
    // camera
    const cd = c.dist
    const cx = p.x - Math.sin(c.yaw) * cd * Math.cos(c.pitch)
    const cz = p.z - Math.cos(c.yaw) * cd * Math.cos(c.pitch)
    const cy2 = p.y + 1.2 + Math.sin(c.pitch) * cd
    c.camT.lerp(new THREE.Vector3(cx, cy2, cz), Math.min(1, dt * 6))
    s.camera.position.copy(c.camT)
    s.camera.lookAt(p.x, p.y + 1.0, p.z)
    // interactable prompt
    let bestIt: core.Interactable | null = null, bd = Infinity
    core.interactables.forEach((it) => {
      if (it.enabled && !it.enabled()) return
      const d = it.at().distanceTo(p)
      if (d < it.radius && d < bd) { bd = d; bestIt = it }
    })
    if (promptEl.current) {
      const t = bestIt ? `E · ${(bestIt as core.Interactable).label}` : ''
      if (promptEl.current.textContent !== t) promptEl.current.textContent = t
    }
    if (input.useAt > c.useT) {
      c.useT = input.useAt
      if (bestIt) (bestIt as core.Interactable).use()
    }
  })
  return (
    <group ref={mesh}>
      <mesh ref={cap} position={[0, 0.45, 0]} material={clay('#7d8fc9')} castShadow>
        <capsuleGeometry args={[0.24, 0.5, 4, 10]} />
      </mesh>
      <mesh position={[0, 0.86, 0.12]} material={clay(C.paper)}><boxGeometry args={[0.18, 0.1, 0.14]} /></mesh>
    </group>
  )
}

/* --------------------------------- page ---------------------------------- */

let ISLAND: core.IslandId = 'L03'

function Caption() {
  const caption = core.useV5((s) => s.caption)
  return caption ? <div className="cap">{caption}</div> : null
}

function Shell({ Comp, id }: { Comp: ObstacleComp; id: core.IslandId }) {
  const q = new URLSearchParams(location.search)
  const done0 = q.has('done')
  const doneR = useRef(done0)
  return (
    <>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: [0, 3, 10], fov: 45 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; input.canvasEl = gl.domElement }}>
        <color attach="background" args={['#cfe3e8']} />
        <fog attach="fog" args={['#cfe3e8', 22, 60]} />
        <hemisphereLight args={['#fff4e0', '#8fb36b', 0.95]} />
        <directionalLight position={[6, 9, 4]} intensity={1.7} castShadow
          shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8}
          shadow-camera-top={8} shadow-camera-bottom={-8} />
        <StubIsland />
        <group>
          <Comp id={id} active done={doneR.current} complete={() => { core.useV5.getState().complete(id); console.log('[preview] complete', id) }} />
        </group>
        <StubPlayer />
        <mesh position={[0, -14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#7fb3bd" roughness={1} />
        </mesh>
      </Canvas>
      <div className="hud">
        <div className="tag">dev preview · {id} · WASD move · Space jump · E use · drag orbits{q.has('auto') ? ' · auto' : ''}</div>
        <div id="prompt" />
        <Caption />
      </div>
      <style>{`
        html,body,#root{margin:0;height:100%;overflow:hidden;background:#cfe3e8;font-family:Inter,system-ui,sans-serif}
        canvas{display:block}
        .hud{position:fixed;inset:0;pointer-events:none}
        .tag{position:absolute;top:10px;left:12px;font:500 11px Inter;color:rgba(59,51,48,.55);letter-spacing:.03em}
        #prompt{position:absolute;left:50%;bottom:15%;transform:translateX(-50%);font:500 14px Inter;color:#3b3330;
          background:rgba(251,246,238,.8);padding:7px 16px;border-radius:999px;box-shadow:0 4px 14px rgba(59,51,48,.12)}
        #prompt:empty{display:none}
        .cap{position:absolute;top:44px;left:50%;transform:translateX(-50%);font:500 14px Inter;color:rgba(59,51,48,.75);
          background:rgba(251,246,238,.7);padding:6px 14px;border-radius:999px}
      `}</style>
    </>
  )
}

export function boot(Comp: ObstacleComp, id: core.IslandId) {
  ISLAND = id
  const el = document.getElementById('root')!
  createRoot(el).render(<Shell Comp={Comp} id={id} />)
  const q = new URLSearchParams(location.search)
  if (q.has('qa') || q.has('auto')) {
    ;(window as any).__journey = (window as any).__journey || {}
    ;(window as any).__journey.player = {
      pos: () => core.player.pos.toArray(),
      teleport: (x: number, y: number, z: number) => { core.player.pos.set(x, y, z); core.player.vel.set(0, 0, 0) },
      press: (k: string, ms = 300) => pressKey(k, ms),
    }
  }
  if (q.has('auto')) {
    const t0 = Date.now()
    const tick = () => {
      const solve = (window as any).__journey?.solve?.[id]
      if (solve) { solve() } else if (Date.now() - t0 < 15000) setTimeout(tick, 400)
    }
    setTimeout(tick, 1200)
  }
}

