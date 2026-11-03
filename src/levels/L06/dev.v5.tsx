/**
 * DEV HARNESS for the L06 obstacle — not shipped. Open /src/levels/L06/dev.html
 * Params: &qa (registers solver), &auto (runs solve after 1s), &phone (opens phone after 1s), &done (pre-solved)
 * Keys: WASD/arrows move · Shift run · E use · 1 grant sense · 0 reset save · d toggle done · p teleport to dock
 */
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { Island } from '../../world/kit'
import Obstacle from './Obstacle'

const ISLAND_POS = new THREE.Vector3(6.5, 0.8, -18)

function StubPlayer() {
  const g = useRef<THREE.Group>(null)
  const keys = useRef<Record<string, boolean>>({})
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true }
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    core.player.pos.copy(ISLAND_POS).add(new THREE.Vector3(0, 0, 4.2))
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])
  useFrame((state, dt) => {
    const k = keys.current, p = core.player
    if (!p.frozen) {
      let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0)
      let z = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0)
      const l = Math.hypot(x, z) || 1
      const sp = k.shift ? 4.6 : 2.2
      p.vel.set(x / l * sp, 0, z / l * sp)
      p.pos.addScaledVector(p.vel, dt)
      if (x || z) p.facing = Math.atan2(x, z)
    }
    p.island = 'L06'
    if (g.current) { g.current.position.copy(p.pos); g.current.rotation.y = p.facing }
    if (!p.frozen) {
      const cam = state.camera
      cam.position.lerp(new THREE.Vector3(p.pos.x, p.pos.y + 2.7, p.pos.z + 4.1), Math.min(1, dt * 3))
      cam.lookAt(p.pos.x, p.pos.y + 0.9, p.pos.z)
    }
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.45, 0]} castShadow><capsuleGeometry args={[0.22, 0.5, 6, 12]} /><meshStandardMaterial color="#b5654a" roughness={0.9} /></mesh>
      <mesh position={[0, 0.78, 0.14]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color="#3b3330" /></mesh>
    </group>
  )
}

function PromptHUD() {
  const [label, setLabel] = useState<string | null>(null)
  const near = useRef<core.Interactable | null>(null)
  useEffect(() => {
    const iv = setInterval(() => {
      let best: core.Interactable | null = null, bd = 1e9
      const v = new THREE.Vector3()
      for (const i of core.interactables.values()) {
        if (i.enabled && !i.enabled()) continue
        const d = i.at().distanceTo(v.copy(core.player.pos))
        if (d < i.radius && d < bd) { bd = d; best = i }
      }
      near.current = best
      setLabel(best ? best.label : null)
    }, 120)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') near.current?.use()
      if (e.key === '1') core.useV5.getState().grant('sense')
      if (e.key === '2') core.useV5.getState().grant('remote')
      if (e.key === '0') { core.useV5.getState().reset(); location.reload() }
      if (e.key === 'p') { core.player.pos.copy(ISLAND_POS).add(new THREE.Vector3(-5.0, 0, -1.3)) }
    }
    window.addEventListener('keydown', key)
    return () => { clearInterval(iv); window.removeEventListener('keydown', key) }
  }, [])
  if (!label) return null
  return <div style={{ position: 'fixed', bottom: '18vh', left: '50%', transform: 'translateX(-50%)', font: '500 13px Inter, system-ui', color: '#3b3330', background: 'rgba(251,246,238,.88)', padding: '8px 18px', borderRadius: 999, boxShadow: '0 8px 24px -10px rgba(47,41,37,.4)', zIndex: 40 }} onClick={() => near.current?.use()}>{label} <span style={{ opacity: .5 }}>· E</span></div>
}

function Bench() {
  const [done, setDone] = useState(new URLSearchParams(location.search).has('done'))
  const abilities = core.useV5((s) => s.abilities)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'd') setDone((v) => !v) }
    window.addEventListener('keydown', key)
    const q = new URLSearchParams(location.search)
    const t1 = setTimeout(() => {
      if (q.has('phone')) core.interactables.get('l06-phone')?.use()
      if (q.has('auto')) (window as any).__journey?.solve?.L06?.()
    }, 1200)
    return () => { window.removeEventListener('keydown', key); clearTimeout(t1) }
  }, [])
  return (
    <>
      <div style={{ position: 'fixed', top: 10, left: 12, font: '500 12px Inter, system-ui', color: '#3b3330', zIndex: 40, background: 'rgba(251,246,238,.8)', padding: '6px 12px', borderRadius: 10 }}>
        L06 dev · abilities: {abilities.join(', ') || 'none'} · done: {String(done)}
      </div>
      <Canvas shadows camera={{ position: [6.5, 4, -11], fov: 45 }} style={{ position: 'fixed', inset: 0 }}>
        <color attach="background" args={['#cfe3e8']} />
        <fog attach="fog" args={['#cfe3e8', 18, 46]} />
        <hemisphereLight args={['#f3e9da', '#b09a80', 0.9]} />
        <directionalLight position={[8, 12, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
        <group position={ISLAND_POS}>
          <Island radius={5} ground="#9fc07e" seed={6} />
          <Obstacle id="L06" active complete={() => setDone(true)} done={done} />
        </group>
        <StubPlayer />
      </Canvas>
      <PromptHUD />
    </>
  )
}

const style = document.createElement('style')
style.textContent = 'html,body,#root{height:100%;margin:0;overflow:hidden}button{font:inherit}'
document.head.appendChild(style)
const errs: string[] = []
window.addEventListener('error', (e) => { errs.push(String(e.message)); renderErrs() })
window.addEventListener('unhandledrejection', (e) => { errs.push(String(e.reason)); renderErrs() })
function renderErrs() {
  let el = document.getElementById('gj-errs')
  if (!el) { el = document.createElement('pre'); el.id = 'gj-errs'; el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99;background:#fdd;color:#900;font:11px monospace;padding:8px;max-height:40vh;overflow:auto;margin:0'; document.body.appendChild(el) }
  el.textContent = errs.join('\n')
}
createRoot(document.getElementById('root')!).render(<Bench />)
