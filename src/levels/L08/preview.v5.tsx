/**
 * Dev-only preview harness (until World5 lands): renders one V5 island + obstacle,
 * a stub WASD player, an E-prompt, and the island's ?qa solver (?auto runs it).
 * URL: /src/levels/L08/preview.v5.html — flags: ?auto ?done ?at=x,z ?use &night
 */
import { StrictMode, Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Island, Scatter, C, clay } from '../../world/kit'
import { interactables, player, useV5 } from '../../v5/core'
import { isQa } from './v5kit.v5'
import { SignPad, SIGN_V, SIGN_C } from './signui.v5'
import { SpeakPrompt } from './voiceui.v5'

const keys = new Set<string>()
addEventListener('keydown', (e) => keys.add(e.code))
addEventListener('keyup', (e) => keys.delete(e.code))

// surface fatal errors on-page so screenshots show them
addEventListener('error', (e) => {
  const el = document.createElement('pre')
  el.style.cssText = 'position:fixed;top:0;left:0;z-index:999;background:#fff;color:#b00;font:11px monospace;padding:8px;max-width:100vw;white-space:pre-wrap'
  el.textContent = `${e.message}\n${e.error?.stack ?? ''}`
  document.body.appendChild(el)
})

function StubPlayer() {
  const g = useRef<THREE.Group>(null)
  const { camera } = useThree()
  useFrame((s, dt) => {
    // WASD in camera-yaw space, no physics — just enough to walk the obstacle
    const f = new THREE.Vector3()
    camera.getWorldDirection(f); f.y = 0; f.normalize()
    const r = new THREE.Vector3(f.z, 0, -f.x)
    const mv = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp')) mv.add(f)
    if (keys.has('KeyS') || keys.has('ArrowDown')) mv.sub(f)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mv.sub(r)
    if (keys.has('KeyD') || keys.has('ArrowRight')) mv.add(r)
    if (mv.lengthSq()) {
      mv.normalize().multiplyScalar(dt * (keys.has('ShiftLeft') ? 5.5 : 3))
      player.pos.add(mv)
      player.facing = Math.atan2(mv.x, mv.z)
      const d = Math.hypot(player.pos.x, player.pos.z)
      if (d > 4.6) { player.pos.x *= 4.6 / d; player.pos.z *= 4.6 / d }
    }
    // lazy follow cam
    const want = new THREE.Vector3(player.pos.x, 0, player.pos.z)
      .add(new THREE.Vector3(Math.sin(s.clock.elapsedTime * 0) - 4.2, 3.4, 5.6))
    camera.position.lerp(want, Math.min(1, dt * 2))
    camera.lookAt(player.pos.x, player.pos.y + 0.7, player.pos.z)
    if (g.current) {
      g.current.position.copy(player.pos)
      g.current.rotation.y += (player.facing - g.current.rotation.y) * Math.min(1, dt * 10)
    }
  })
  return (
    <group ref={g} position={[0, 0, 4.2]}>
      <mesh position={[0, 0.42, 0]} material={clay('#b5654a')} castShadow><capsuleGeometry args={[0.17, 0.5, 6, 12]} /></mesh>
      <mesh position={[0, 0.86, 0]} material={clay('#e8b89a')} castShadow><sphereGeometry args={[0.15, 14, 10]} /></mesh>
    </group>
  )
}

function nearest() {
  let best: { d: number; i: (typeof interactables extends Map<string, infer T> ? T : never) } | null = null
  for (const i of interactables.values()) {
    if (i.enabled && !i.enabled()) continue
    const d = i.at().distanceTo(player.pos)
    if (d < i.radius && (!best || d < best.d)) best = { d, i }
  }
  return best?.i ?? null
}

function Prompt() {
  const [label, setLabel] = useState('')
  useEffect(() => {
    const t = setInterval(() => setLabel(nearest()?.label ? `E — ${nearest()!.label}` : ''), 150)
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyE' || e.code === 'Enter') nearest()?.use() }
    addEventListener('keydown', onKey)
    return () => { clearInterval(t); removeEventListener('keydown', onKey) }
  }, [])
  return label ? (
    <div style={{ position: 'fixed', left: '50%', bottom: 90, transform: 'translateX(-50%)', font: "500 13px Inter", color: '#2f2925', background: 'rgba(251,246,238,.85)', padding: '8px 16px', borderRadius: 999 }}>{label}</div>
  ) : null
}

export function renderPreview(Ob: (p: any) => JSX.Element | null, id: string, night = false) {
  const q = new URLSearchParams(location.search)
  if (q.has('fresh')) useV5.getState().reset()
  q.get('give')?.split(',').forEach((a) => useV5.getState().grant(a as any))
  const at = (q.get('at') || '0,4').split(',').map(Number)
  player.pos.set(at[0] || 0, 0, at[1] ?? 4)
  function Root() {
    const [doneFlag, setDone] = useState(q.has('done'))
    const [, setTick] = useState(0)
    useEffect(() => {
      // world hooks the app provides: a base __journey object under ?qa
      if (isQa()) (window as any).__journey ??= {}
      if (q.get('use')) setTimeout(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })), 900)
      if (q.has('auto')) setTimeout(() => (window as any).__journey?.solve?.[id]?.().catch((e: unknown) => console.warn('solver', e)), 1200)
      const t = setInterval(() => setTick((n) => n + 1), 400)
      return () => clearInterval(t)
    }, [])
    const done = doneFlag || useV5.getState().done.includes(id as any)
    return (
      <>
        <Canvas shadows camera={{ fov: 45, position: [-4, 3.4, 9.8] }} style={{ background: night ? '#232c3e' : '#cfe3e8' }}>
          <ambientLight intensity={night ? 0.35 : 0.7} color={night ? '#8fa2c8' : '#fff4e4'} />
          <directionalLight position={[6, 9, 4]} intensity={night ? 0.5 : 1.6} color={night ? '#a9bce4' : '#ffe7c4'} castShadow shadow-mapSize={[1024, 1024]} />
          <Suspense fallback={null}>
            <Island radius={5} ground={night ? '#7d9a63' : C.leaf} seed={id === 'L08' ? 8 : 9} />
            <Scatter ground={night ? '#7d9a63' : C.leaf} accent={C.terracotta} seed={id === 'L08' ? 8 : 9}
              path={[new THREE.Vector3(0, 0, 4.2), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4.2)]} />
            <Ob id={id} active complete={() => setDone(true)} done={done} />
            <StubPlayer />
          </Suspense>
        </Canvas>
        <Prompt />
        <div style={{ position: 'fixed', top: 12, left: 14, font: "500 12px Inter", color: '#2f2925', opacity: 0.7 }}>
          {id} preview — WASD walk · E use {done && '· solved'}
        </div>
        {q.get('ui') === 'signv' && <SignPad template={SIGN_V} title="Trace the guardian’s sign" sub="One stroke — the shape on the tablet." onResult={() => {}} onClose={() => {}} />}
        {q.get('ui') === 'signc' && <SignPad template={SIGN_C} title="Trace the sign on the stone" sub="One slow stroke, like chalk on slate." onResult={() => {}} onClose={() => {}} />}
        {q.get('ui') === 'speak' && <SpeakPrompt word="hello" onResult={() => {}} onClose={() => {}} />}
      </>
    )
  }
  createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>)
}
