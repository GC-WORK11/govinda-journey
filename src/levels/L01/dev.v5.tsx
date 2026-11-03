/**
 * DEV HARNESS for the L01/L02 obstacles — not shipped. Open /src/levels/L01/dev.html
 * Params: ?island=L02 (default L01) · &done (pre-solved) · &solve (auto-solve after 1s)
 * Keys: WASD/arrows move · Shift run · Space jump · E use · p run solver · r reset pos
 *
 * The stub player does a walkable down-ray (+0.45 step-up) and a blocker push-out,
 * close enough to PLAYER's contract to sanity-check registrations.
 */
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { Island } from '../../world/kit'
import L01 from './Obstacle'
import L02 from '../L02/Obstacle'
import type { IslandId } from '../../v5/core'

const Q = new URLSearchParams(location.search)
const WHICH = (Q.get('island') === 'L02' ? 'L02' : 'L01') as IslandId
const CENTER = new THREE.Vector3(0, 0, 0)
const ENTRY = new THREE.Vector3(0, 0, 4.2)

const DOWN = new THREE.Vector3(0, -1, 0)
const ray = new THREE.Raycaster()
const box = new THREE.Box3()
const pbox = new THREE.Box3()
const tmp = new THREE.Vector3()
const STEP_UP = 0.45

function groundAt(x: number, y: number, z: number) {
  ray.set(tmp.set(x, y + 1.2, z), DOWN)
  ray.far = 4
  const hits = ray.intersectObjects([...core.walkables], true)
  return hits.length ? hits[0].point.y : -Infinity
}
function blocked(from: THREE.Vector3, dir: THREE.Vector3, dist: number) {
  for (const h of [0.25, 0.9]) {
    ray.set(tmp.set(from.x, from.y + h, from.z), dir)
    ray.far = dist
    if (ray.intersectObjects([...core.blockers], true).length) return true
  }
  return false
}

function StubPlayer() {
  const g = useRef<THREE.Group>(null)
  const keys = useRef<Record<string, boolean>>({})
  const vy = useRef(0)
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
      if (e.code === 'Space') { e.preventDefault(); if (core.player.grounded) { vy.current = 4.6; core.player.grounded = false } }
      if (e.key.toLowerCase() === 'e') { const n = nearest(); if (n) n.use() }
      if (e.key.toLowerCase() === 'p') (window as any).__journey?.solve?.[WHICH]?.()
      if (e.key.toLowerCase() === 'r') core.player.pos.copy(CENTER).add(ENTRY)
    }
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    core.player.pos.copy(CENTER).add(ENTRY)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])
  useFrame((state, dt) => {
    const k = keys.current, p = core.player
    const dtm = Math.min(dt, 0.05)
    if (!p.frozen) {
      let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0)
      let z = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0)
      const l = Math.hypot(x, z) || 1
      const sp = k.shift ? 4.4 : 2.3
      const dx = x / l * sp * dtm, dz = z / l * sp * dtm
      const dl = Math.hypot(dx, dz)
      if (dl > 0) {
        const dir = tmp.set(dx / dl, 0, dz / dl).clone()
        if (!blocked(p.pos, dir, 0.34)) { p.pos.x += dx; p.pos.z += dz }
        else {
          const dx2 = dir.clone().set(0, dir.x ? Math.sign(dir.x) : 0, 0)
          const dz2 = dir.clone().set(0, 0, dir.z ? Math.sign(dir.z) : 0)
          if (dir.x && !blocked(p.pos, dx2, 0.34)) p.pos.x += dx
          if (dir.z && !blocked(p.pos, dz2, 0.34)) p.pos.z += dz
        }
        p.facing = Math.atan2(dx, dz)
      }
    }
    // gravity + ground snap (0.45 step-up)
    const gy = groundAt(p.pos.x, p.pos.y, p.pos.z)
    vy.current -= 14 * dtm
    p.pos.y += vy.current * dtm
    if (vy.current <= 0 && gy > -Infinity && p.pos.y <= gy + STEP_UP && p.pos.y + vy.current * dtm <= gy + 0.02) {
      p.pos.y = Math.max(p.pos.y, gy)
      if (p.pos.y - gy < 0.3) { p.pos.y = gy; vy.current = 0; p.grounded = true }
    } else p.grounded = false
    if (p.pos.y < -8) { p.pos.copy(CENTER).add(ENTRY); vy.current = 0 }
    p.island = WHICH
    if (g.current) { g.current.position.copy(p.pos); g.current.rotation.y = p.facing }
    const cam = state.camera
    cam.position.lerp(tmp.set(p.pos.x + 1.4, p.pos.y + 3.1, p.pos.z + 4.6), Math.min(1, dtm * 3.4))
    cam.lookAt(p.pos.x, p.pos.y + 0.9, p.pos.z)
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.45, 0]} castShadow><capsuleGeometry args={[0.2, 0.5, 6, 12]} /><meshStandardMaterial color="#3b3330" roughness={0.9} /></mesh>
      <mesh position={[0, 0.78, 0.13]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color="#d9825b" roughness={0.9} /></mesh>
    </group>
  )
}

function nearest() {
  const v = new THREE.Vector3()
  let best: core.Interactable | null = null, bd = 1e9
  for (const i of core.interactables.values()) {
    if (i.enabled && !i.enabled()) continue
    const d = i.at().distanceTo(core.player.pos)
    if (d < i.radius && d < bd) { bd = d; best = i }
  }
  return best
}

function Prompt() {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    const iv = setInterval(() => setLabel(nearest()?.label ?? null), 200)
    return () => clearInterval(iv)
  }, [])
  if (!label) return null
  return <div style={{ position: 'fixed', left: '50%', bottom: '18%', transform: 'translateX(-50%)', font: '500 15px Inter, sans-serif', color: '#3b3330', opacity: 0.85 }}>E · {label}</div>
}

function Ground() {
  const disc = useRef<THREE.Mesh>(null)
  core.useWalkable(disc)
  return (
    <group>
      <mesh ref={disc} position={[0, -0.06, 0]}>
        <cylinderGeometry args={[5, 5, 0.12, 40]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <Island radius={5} seed={WHICH === 'L02' ? 2 : 1} />
    </group>
  )
}

function Dev() {
  const done0 = Q.has('done')
  const [done, setDone] = useState(done0)
  useEffect(() => {
    if (done) core.useV5.getState().complete(WHICH)
    if (Q.has('solve')) setTimeout(() => (window as any).__journey?.solve?.[WHICH]?.(), 1000)
  }, [])
  const Obs = WHICH === 'L02' ? L02 : L01
  return (
    <>
      <Canvas shadows dpr={Math.min(1.5, devicePixelRatio)} camera={{ fov: 42, near: 0.1, far: 200, position: [2, 3.4, 9] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping }}>
        <color attach="background" args={['#efe2cb']} />
        <fog attach="fog" args={['#efe2cb', 26, 80]} />
        <hemisphereLight args={['#fff3e0', '#b7a086', 1.1]} />
        <directionalLight position={[6, 12, 5]} intensity={1.9} color="#ffe2b6" castShadow
          shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
        <directionalLight position={[-7, 5, -6]} intensity={0.4} color="#dfe9e4" />
        <group position={CENTER}>
          <Ground />
          <Obs id={WHICH} active complete={() => { core.useV5.getState().complete(WHICH); setDone(true) }} done={done} />
        </group>
        <StubPlayer />
      </Canvas>
      <Prompt />
      <div style={{ position: 'fixed', top: 10, left: 12, font: '500 13px Inter, sans-serif', color: '#3b3330', opacity: 0.7 }}>
        {WHICH} dev · WASD move · space hop · E use · p solve · r reset · ?island=L01|L02&done&solve
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Dev />)
