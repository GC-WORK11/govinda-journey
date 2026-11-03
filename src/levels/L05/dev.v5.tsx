/** Dev harness for the L05 V5 obstacle. Never imported by the app — liveshot / manual
 *  verification only: `await import('/src/levels/L05/dev.v5.tsx')` in the page console
 *  mounts a standalone scene (island + obstacle + a minimal WASD test player). */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { C, clay, Island } from '../../world/kit'
import { player, walkables, interactables, useWalkable, useV5 } from '../../v5/core'
import type { Interactable } from '../../v5/core'
import Obstacle from './Obstacle'

const _o = new THREE.Vector3()
const _d = new THREE.Vector3(0, -1, 0)

function Ground() {
  const g = useRef<THREE.Mesh>(null)
  useWalkable(g)
  return (
    <mesh ref={g} visible={false} position={[0, -0.06, 0]}>
      <cylinderGeometry args={[5, 5, 0.12, 32]} />
    </mesh>
  )
}

function DevPlayer() {
  const ref = useRef<THREE.Group>(null)
  const keys = useRef<Record<string, boolean>>({})
  const ray = useMemo(() => new THREE.Raycaster(), [])

  useEffect(() => {
    const pick = () => {
      let best: Interactable | null = null
      let bd = 1e9
      for (const i of interactables.values()) {
        if (i.enabled && !i.enabled()) continue
        const d = i.at().distanceTo(player.pos)
        if (d < i.radius && d < bd) { bd = d; best = i }
      }
      if (best) (best as Interactable).use()
    }
    const dn = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') pick()
    }
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, dt) => {
    const k = keys.current
    let dx = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0)
    let dz = (k['s'] || k['arrowdown'] ? 1 : 0) - (k['w'] || k['arrowup'] ? 1 : 0)
    if (dx || dz) {
      const l = Math.hypot(dx, dz)
      dx /= l; dz /= l
      const sp = k['shift'] ? 5 : 2.8
      player.pos.x += dx * sp * dt
      player.pos.z += dz * sp * dt
      player.facing = Math.atan2(dx, dz)
    }
    ray.set(_o.set(player.pos.x, player.pos.y + 2, player.pos.z), _d)
    const hits = ray.intersectObjects([...walkables], true)
    if (hits.length) {
      const y = hits[0].point.y
      player.pos.y += (y - player.pos.y) * Math.min(1, dt * 16)
      if (player.pos.y < y) player.pos.y = Math.max(player.pos.y, y - 0.6)
    } else {
      player.pos.y -= 7 * dt
      if (player.pos.y < -5) player.pos.set(0, 0.15, 4.2)
    }
    if (ref.current) {
      ref.current.position.copy(player.pos)
      ref.current.rotation.y = player.facing
    }
    let label = ''
    let bd = 1e9
    for (const i of interactables.values()) {
      if (i.enabled && !i.enabled()) continue
      const d = i.at().distanceTo(player.pos)
      if (d < i.radius && d < bd) { bd = d; label = i.label }
    }
    const el = document.getElementById('l05prompt')
    if (el) el.textContent = label ? `E  ·  ${label}` : ''
  })

  return (
    <group ref={ref}>
      <RoundedBox args={[0.34, 0.52, 0.3]} radius={0.08} position={[0, 0.45, 0]} material={clay('#7d6b5d')} castShadow />
      <mesh position={[0, 0.86, 0]} material={clay('#e8c9a8')} castShadow>
        <sphereGeometry args={[0.16, 14, 12]} />
      </mesh>
    </group>
  )
}

function FollowCam() {
  const { camera } = useThree()
  const fixed = useRef(false)
  useEffect(() => {
    const w = (window as any)
    w.__dev = w.__dev || {}
    w.__dev.cam = (x: number, y: number, z: number, tx: number, ty: number, tz: number) => {
      fixed.current = true
      camera.position.set(x, y, z)
      camera.lookAt(tx, ty, tz)
    }
    w.__dev.follow = () => { fixed.current = false }
    return () => { if (w.__dev) { delete w.__dev.cam; delete w.__dev.follow } }
  }, [camera])
  useFrame((_, dt) => {
    if (fixed.current) return
    const k = Math.min(1, dt * 4)
    _o.set(player.pos.x + 4.6, player.pos.y + 4.4, player.pos.z + 5.6)
    camera.position.lerp(_o, k)
    camera.lookAt(player.pos.x, player.pos.y + 0.4, player.pos.z)
  })
  return null
}

function DevApp() {
  const done = useV5((s) => s.done.includes('L05'))
  return (
    <Canvas shadows camera={{ position: [7, 5.5, 8.5], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={[C.sky]} />
      <fog attach="fog" args={[C.sky, 18, 42]} />
      <hemisphereLight args={['#fff4e2', '#a4c38a', 0.85]} />
      <directionalLight position={[6, 10, 4]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <Island radius={5} ground={'#a7bd80'} seed={5} />
      <Ground />
      <Obstacle id="L05" active done={done} complete={() => useV5.getState().complete('L05')} />
      <DevPlayer />
      <FollowCam />
    </Canvas>
  )
}

if (typeof window !== 'undefined' && !document.getElementById('l05dev')) {
  player.pos.set(0, 0.15, 4.2)
  const el = document.createElement('div')
  el.id = 'l05dev'
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#cfe3e8'
  const hint = document.createElement('div')
  hint.id = 'l05hint'
  hint.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);font:12px Inter,system-ui,sans-serif;color:#5a4f45;letter-spacing:0.02em'
  hint.textContent = 'wasd walk · shift run · e use · __journey.solve.L05() solves'
  const prompt = document.createElement('div')
  prompt.id = 'l05prompt'
  prompt.style.cssText = 'position:absolute;left:50%;bottom:64px;transform:translateX(-50%);font:14px Inter,system-ui,sans-serif;color:#3b3330;background:rgba(251,246,238,0.85);padding:6px 14px;border-radius:999px;min-height:1.2em'
  el.appendChild(hint)
  el.appendChild(prompt)
  document.body.appendChild(el)
  createRoot(el).render(<DevApp />)
}
