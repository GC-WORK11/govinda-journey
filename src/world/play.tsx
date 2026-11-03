/**
 * In-world mini-game kit. Every level's <Play/> is built from these pieces so all games
 * feel the same: one verb, real 3D objects, instant juicy feedback.
 *
 *   <Draggable home={[x,y,z]} onDrop={(p) => accepted}>  …mesh…  </Draggable>
 *   <Tappable onTap={() => …}>  …mesh…  </Tappable>
 *   const holding = useHoldAnywhere()            // press-and-hold anywhere (mouse, touch, space)
 *   burst(worldPos, '#f0b860')                   // leaf/sparkle confetti
 *   <Pop delay={0.2}> …appears with a squash-stretch bounce… </Pop>
 *   <Bob> …floats gently… </Bob>
 *   blip(1) / chime()                            // tiny soft sounds (muted-aware)
 *   glowMat('#f2b35e') + pulse(mat, on, t)       // warm emissive glow (never neon)
 *
 * Coordinates: Play is rendered inside the island group, so all positions are island-local
 * (top surface y≈0, radius 3.2, building at the centre, traveller at (-0.9, 0, 1.4)).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useJourney } from '../state/store'

export const REDUCED = typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- springs ---------- */
/** Critically-damped-ish spring step. Returns the new velocity; mutates nothing. */
export function springStep(x: number, v: number, to: number, dt: number, k = 170, d = 14) {
  const a = (to - x) * k - v * d
  return v + a * Math.min(dt, 1 / 30)
}

/* ---------- glow ---------- */
export function glowMat(color: string, base = '#8a7a6a') {
  return new THREE.MeshStandardMaterial({ color: base, emissive: new THREE.Color(color), emissiveIntensity: 0, roughness: 0.6 })
}
/** Ease a glow material toward on/off; call from useFrame. */
export function pulse(m: THREE.MeshStandardMaterial, on: boolean, t: number, dt: number, color?: string) {
  const want = on ? 1.25 + (REDUCED ? 0 : Math.sin(t * 3) * 0.15) : 0
  m.emissiveIntensity += (want - m.emissiveIntensity) * Math.min(1, dt * 6)
  if (color && on) m.color.lerp(new THREE.Color(color), Math.min(1, dt * 4))
}

/* ---------- sound (soft, optional) ---------- */
let ctx: AudioContext | null = null
function ac() {
  if (useJourney.getState().muted) return null
  try { ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)() } catch { return null }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
/** Soft wooden blip. step 0..n raises the pitch for combo feedback. */
export function blip(step = 0) {
  const c = ac(); if (!c) return
  const o = c.createOscillator(), g = c.createGain()
  o.type = 'sine'; o.frequency.value = 440 * Math.pow(2, (step * 3) / 12)
  g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22)
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.25)
}
/** Warm three-note chime for a win. */
export function chime() { [0, 4, 7].forEach((s, i) => setTimeout(() => blip(s + 2), i * 110)) }

/* ---------- confetti leaves ---------- */
type P = { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3; life: number; c: THREE.Color; s: number }
const parts: P[] = []
const MAX = 220
const PALETTE = ['#e9a85c', '#d9825b', '#9cbf74', '#f3d58c', '#c96f4a', '#b9d08a']
/** Burst of clay leaves/petals at a WORLD position. */
export function burst(at: THREE.Vector3, color?: string, n = 26, power = 1) {
  if (REDUCED) n = Math.min(n, 8)
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX) parts.shift()
    const a = Math.random() * Math.PI * 2, up = 2.2 + Math.random() * 2.4
    parts.push({
      p: at.clone(), v: new THREE.Vector3(Math.cos(a) * (0.6 + Math.random() * 1.6), up, Math.sin(a) * (0.6 + Math.random() * 1.6)).multiplyScalar(power),
      r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      w: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3),
      life: 1.6 + Math.random() * 0.9, s: 0.05 + Math.random() * 0.05,
      c: new THREE.Color(color && Math.random() < 0.5 ? color : PALETTE[(Math.random() * PALETTE.length) | 0]),
    })
  }
}
/** Mount once inside the Canvas (World does this). */
export function Bursts() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => { const g = new THREE.CircleGeometry(1, 5); g.scale(1, 0.55, 1); return g }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), [])
  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const im = mesh.current; if (!im) return
    dt = Math.min(dt, 1 / 30)
    let n = 0
    for (let i = parts.length - 1; i >= 0; i--) {
      const k = parts[i]; k.life -= dt
      if (k.life <= 0) { parts.splice(i, 1); continue }
      k.v.y -= 5.2 * dt; k.v.multiplyScalar(1 - dt * 1.6) // air drag: leaves float down
      k.v.x += Math.sin(k.life * 7 + i) * dt * 1.2
      k.p.addScaledVector(k.v, dt)
      k.r.x += k.w.x * dt; k.r.y += k.w.y * dt; k.r.z += k.w.z * dt
    }
    for (const k of parts) {
      q.setFromEuler(k.r); const s = k.s * Math.min(1, k.life * 2); sc.set(s, s, s)
      m4.compose(k.p, q, sc); im.setMatrixAt(n, m4); im.setColorAt(n, k.c); n++
    }
    im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} />
}

/* ---------- pop-in / bob ---------- */
export function Pop({ children, delay = 0, from = 0, ...p }: { children: ReactNode; delay?: number; from?: number } & JSX.IntrinsicElements['group']) {
  const g = useRef<THREE.Group>(null); const s = useRef({ x: from, v: 0, t: -delay })
  useFrame((_, dt) => {
    const o = g.current; if (!o) return
    s.current.t += dt; if (s.current.t < 0) { o.scale.setScalar(0.0001); return }
    s.current.v = springStep(s.current.x, s.current.v, 1, dt, 220, 11); s.current.x += s.current.v * Math.min(dt, 1 / 30)
    const x = REDUCED ? 1 : s.current.x
    o.scale.set(x * (1 + (1 - x) * 0.3), Math.max(0.0001, x), x * (1 + (1 - x) * 0.3)) // squash-stretch
  })
  return <group ref={g} {...p}>{children}</group>
}
export function Bob({ children, amp = 0.06, speed = 1.6, phase = 0, ...p }: { children: ReactNode; amp?: number; speed?: number; phase?: number } & JSX.IntrinsicElements['group']) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => { if (g.current && !REDUCED) g.current.position.y = Math.sin(s.clock.elapsedTime * speed + phase) * amp })
  return <group {...p}><group ref={g}>{children}</group></group>
}

/* ---------- hover cursor ---------- */
const setCursor = (c: string) => { document.body.style.cursor = c }

/* ---------- tappable ---------- */
/** Tap/click a 3D object. Hover lifts it slightly; a tap squashes and springs back. */
export function Tappable({ children, onTap, disabled, ...p }: { children: ReactNode; onTap: (e: ThreeEvent<PointerEvent>) => void; disabled?: boolean } & JSX.IntrinsicElements['group']) {
  const g = useRef<THREE.Group>(null); const st = useRef({ s: 1, v: 0, q: 0, qv: 0, hover: false })
  useFrame((_, dt) => {
    const o = g.current; if (!o) return
    const k = st.current
    k.v = springStep(k.s, k.v, k.hover && !disabled ? 1.08 : 1, dt, 260, 14); k.s += k.v * Math.min(dt, 1 / 30)
    k.qv = springStep(k.q, k.qv, 0, dt, 320, 9); k.q += k.qv * Math.min(dt, 1 / 30)
    const q = REDUCED ? 0 : k.q
    o.scale.set(k.s * (1 + q * 0.5), k.s * (1 - q), k.s * (1 + q * 0.5))
  })
  useEffect(() => () => setCursor(''), [])
  return (
    <group ref={g} {...p}
      onPointerOver={(e) => { e.stopPropagation(); st.current.hover = true; if (!disabled) setCursor('pointer') }}
      onPointerOut={() => { st.current.hover = false; setCursor('') }}
      onPointerDown={(e) => { e.stopPropagation(); if (disabled) return; st.current.q = 0.28; st.current.qv = 0; onTap(e) }}>
      {children}
    </group>
  )
}

/* ---------- draggable ---------- */
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()
/**
 * Drag a 3D object across a horizontal plane at local height `y`.
 * onDrop(localPos) → return true to accept (object stays where dropped, or call your own state),
 * false/undefined to spring it home. While dragging the object lifts and grows a little.
 * Pass `to` to move it somewhere (e.g. snap into a slot) after an accepted drop.
 */
export function Draggable({ children, home, to, y, onDrop, onMove, disabled, lift = 0.3, ...p }: {
  children: ReactNode; home: [number, number, number]; to?: [number, number, number] | null
  y?: number; onDrop: (local: THREE.Vector3) => boolean | void; onMove?: (local: THREE.Vector3) => void; disabled?: boolean; lift?: number
} & Omit<JSX.IntrinsicElements['group'], 'position'>) {
  const g = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const st = useRef({ drag: false, pos: new THREE.Vector3(...home), vel: new THREE.Vector3(), target: new THREE.Vector3(...home), s: 1, sv: 0, hover: false, id: -1 })
  const [, force] = useState(0)
  useEffect(() => { if (!st.current.drag) st.current.target.set(...(to || home)) }, [to?.[0], to?.[1], to?.[2], home[0], home[1], home[2]])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const project = (cx: number, cy: number) => {
    const o = g.current; const parent = o?.parent; if (!o || !parent) return null
    const r = gl.domElement.getBoundingClientRect()
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const wy = parent.localToWorld(new THREE.Vector3(0, (y ?? home[1]) + lift, 0)).y
    plane.constant = -wy
    if (!ray.ray.intersectPlane(plane, hit)) return null
    return parent.worldToLocal(hit.clone())
  }
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!st.current.drag || e.pointerId !== st.current.id) return
      const l = project(e.clientX, e.clientY); if (!l) return
      // keep it on the island
      const d = Math.hypot(l.x, l.z); if (d > 2.9) { l.x *= 2.9 / d; l.z *= 2.9 / d }
      st.current.target.copy(l); onMove?.(l)
    }
    const up = (e: PointerEvent) => {
      if (!st.current.drag || e.pointerId !== st.current.id) return
      st.current.drag = false; setCursor('')
      const l = st.current.target.clone(); l.y = y ?? home[1]
      const ok = onDrop(l)
      if (!ok) st.current.target.set(...home)
      else if (to === undefined) st.current.target.copy(l)
      force((n) => n + 1)
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
  })
  useFrame((_, dt) => {
    const o = g.current; if (!o) return
    const s = st.current
    if (!s.drag && to) s.target.set(...to)
    const k = s.drag ? 26 : 12
    s.pos.lerp(s.target, 1 - Math.exp(-k * Math.min(dt, 1 / 20)))
    o.position.copy(s.pos)
    const want = s.drag ? 1.12 : s.hover && !disabled ? 1.06 : 1
    s.sv = springStep(s.s, s.sv, want, dt, 240, 12); s.s += s.sv * Math.min(dt, 1 / 30); o.scale.setScalar(s.s)
    if (s.drag && !REDUCED) { o.rotation.z = Math.sin(performance.now() / 160) * 0.06 } else o.rotation.z *= 0.85
  })
  useEffect(() => () => setCursor(''), [])
  return (
    <group ref={g} {...p}
      onPointerOver={(e) => { e.stopPropagation(); st.current.hover = true; if (!disabled) setCursor('grab') }}
      onPointerOut={() => { st.current.hover = false; if (!st.current.drag) setCursor('') }}
      onPointerDown={(e) => {
        if (disabled) return
        e.stopPropagation(); st.current.drag = true; st.current.id = e.pointerId; setCursor('grabbing'); blip(0)
        const l = project(e.nativeEvent.clientX, e.nativeEvent.clientY); if (l) st.current.target.copy(l)
      }}>
      {children}
    </group>
  )
}

/* ---------- hold anywhere ---------- */
/** True while the visitor presses anywhere on the world (mouse, touch) or holds Space. */
export function useHoldAnywhere(enabled = true) {
  const [h, setH] = useState(false)
  useEffect(() => {
    if (!enabled) { setH(false); return }
    const isUi = (t: EventTarget | null) => t instanceof Element && !!t.closest('button, a, [data-ui]')
    const dn = (e: PointerEvent) => { if (!isUi(e.target)) setH(true) }
    const upP = () => setH(false)
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); setH(true) } }
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') setH(false) }
    window.addEventListener('pointerdown', dn); window.addEventListener('pointerup', upP); window.addEventListener('pointercancel', upP)
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', upP)
    return () => {
      window.removeEventListener('pointerdown', dn); window.removeEventListener('pointerup', upP); window.removeEventListener('pointercancel', upP)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', upP)
    }
  }, [enabled])
  return h
}

/** World position of an island-local point inside a Play component: use with burst(). */
export function useLocalToWorld() {
  const ref = useRef<THREE.Group>(null)
  const fn = (x: number, y: number, z: number) => ref.current ? ref.current.localToWorld(new THREE.Vector3(x, y, z)) : new THREE.Vector3(x, y, z)
  return [ref, fn] as const
}
