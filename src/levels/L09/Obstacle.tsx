/**
 * L09 — Chalk (V5 finale).
 * A little schoolhouse, dark. Four short beats wake it, each an older ability:
 * climb the low wall → carry one plank to the porch gap → power the bell →
 * sign the door stone. Every beat warms a window; when all four are lit the
 * door swings open and complete() hands off to WORLD's finale.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  C, M, ghostMat, useIslandFrame, useLocalInteractable, useCarryAnchor, carryAnchor, useDomOverlay,
  damp, caption, isQa, installSolve, teleportTo, waitFor, sleep, tracePad,
} from '../L08/v5kit.v5'
import { Schoolhouse } from './school.v5'
import { SignPad, SIGN_C } from '../L08/signui.v5'
import { has, interactables, player, useBlocker, useV5, useWalkable, type ObstacleProps } from '../../v5/core'
import { Prop } from '../../v5/art/Dressing'
import { AutoMerge, NoMerge } from '../../v5/world/AutoMerge'

const SCHOOL = new THREE.Vector3(-0.9, 0, -2.6)
const WALL_Z = 2.0
const PORCH = { x0: -2.1, x1: 0.3, z0: -2.62, z1: -1.6, h: 0.5 }
const GAP = { x0: -1.35, x1: -0.45 } // the missing-plank notch in the porch lip
const PLANK_HOME = new THREE.Vector3(-2.5, 0, 0.95)

/** Invisible blocker panel. */
function Panel({ p, s }: { p: [number, number, number]; s: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  useBlocker(ref)
  return <mesh ref={ref} position={p} material={ghostMat()}><boxGeometry args={s} /></mesh>
}

/** The low brick wall across the path; its cap is walkable for any passive climb. */
function Wall() {
  const wall = useRef<THREE.Mesh>(null)
  const cap = useRef<THREE.Mesh>(null)
  useBlocker(wall)
  useWalkable(cap)
  return (
    <group>
      <mesh ref={wall} position={[0, 0.4, WALL_Z]} material={M(C.brick)} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.8, 0.34]} />
      </mesh>
      {/* brick course hint */}
      <mesh position={[0, 0.62, WALL_Z + 0.175]} material={M('#a5583f')}><boxGeometry args={[3.42, 0.06, 0.02]} /></mesh>
      <mesh position={[0, 0.28, WALL_Z + 0.175]} material={M('#a5583f')}><boxGeometry args={[3.42, 0.06, 0.02]} /></mesh>
      <mesh ref={cap} position={[0, 0.81, WALL_Z]} material={ghostMat()}><boxGeometry args={[3.4, 0.04, 0.36]} /></mesh>
      {/* piers + hedges so the wall really is the way across */}
      <mesh position={[-1.85, 0.55, WALL_Z]} material={M(C.stone)} castShadow><boxGeometry args={[0.36, 1.1, 0.44]} /></mesh>
      <mesh position={[1.85, 0.55, WALL_Z]} material={M(C.stone)} castShadow><boxGeometry args={[0.36, 1.1, 0.44]} /></mesh>
      {[[-1.85], [1.85]].map(([x]) => (
        <mesh key={x} position={[x, 1.13, WALL_Z]} material={M(C.stoneLight)} castShadow><sphereGeometry args={[0.16, 10, 8]} /></mesh>
      ))}
      <mesh position={[-2.9, 0.55, WALL_Z]} scale={[1.5, 1.1, 0.8]} material={M(C.leafDark)} castShadow><sphereGeometry args={[0.75, 12, 9]} /></mesh>
      <mesh position={[2.9, 0.55, WALL_Z]} scale={[1.5, 1.1, 0.8]} material={M(C.leafDark)} castShadow><sphereGeometry args={[0.75, 12, 9]} /></mesh>
      <Panel p={[-2.9, 0.6, WALL_Z]} s={[2.2, 1.3, 0.9]} />
      <Panel p={[2.9, 0.6, WALL_Z]} s={[2.2, 1.3, 0.9]} />
      <Panel p={[-1.85, 0.6, WALL_Z]} s={[0.4, 1.2, 0.5]} />
      <Panel p={[1.85, 0.6, WALL_Z]} s={[0.4, 1.2, 0.5]} />
    </group>
  )
}

/** The raised stone porch in front of the school — walkable top, lip blocks the gap's sides. */
function Porch() {
  const top = useRef<THREE.Mesh>(null)
  useWalkable(top)
  const w = PORCH
  return (
    <group>
      <RoundedBox ref={top} args={[w.x1 - w.x0, w.h, w.z1 - w.z0]} radius={0.05}
        position={[(w.x0 + w.x1) / 2, w.h / 2, (w.z0 + w.z1) / 2]} material={M('#cfc4b2')} castShadow receiveShadow />
      {/* lip panels flanking the plank gap */}
      <Panel p={[(w.x0 + GAP.x0) / 2, w.h / 2, w.z1 + 0.03]} s={[GAP.x0 - w.x0, w.h + 0.06, 0.1]} />
      <Panel p={[(GAP.x1 + w.x1) / 2, w.h / 2, w.z1 + 0.03]} s={[w.x1 - GAP.x1, w.h + 0.06, 0.1]} />
      {/* side faces */}
      <Panel p={[w.x0 - 0.03, w.h / 2, (w.z0 + w.z1) / 2]} s={[0.1, w.h + 0.06, w.z1 - w.z0]} />
      <Panel p={[w.x1 + 0.03, w.h / 2, (w.z0 + w.z1) / 2]} s={[0.1, w.h + 0.06, w.z1 - w.z0]} />
      {/* stone edging */}
      <mesh position={[(w.x0 + GAP.x0) / 2, w.h + 0.015, w.z1 - 0.05]} material={M('#b8ac9a')}>
        <boxGeometry args={[GAP.x0 - w.x0, 0.05, 0.14]} />
      </mesh>
      <mesh position={[(GAP.x1 + w.x1) / 2, w.h + 0.015, w.z1 - 0.05]} material={M('#b8ac9a')}>
        <boxGeometry args={[w.x1 - GAP.x1, 0.05, 0.14]} />
      </mesh>
    </group>
  )
}

/** The plank: pickup → carried (follows the anchor) → glides into the gap as a ramp. */
function Plank({ frame, carried, placing, placed, instant, onPlaced }: {
  frame: ReturnType<typeof useIslandFrame>
  carried: boolean
  placing: boolean   // gliding into place
  placed: boolean    // settled — walkable
  instant: boolean   // already solved: render at the ramp, no anim
  onPlaced: () => void
}) {
  const g = useRef<THREE.Group>(null)
  const walk = useRef<THREE.Mesh>(null)
  useWalkable(walk, placed)
  const tmp = useRef(new THREE.Vector3())
  const fired = useRef(false)

  // ramp pose: from the grass up into the gap, centred under the door
  const RAMP = { pos: new THREE.Vector3((GAP.x0 + GAP.x1) / 2, 0.26, -1.14), rx: -0.42, ry: 0, rz: 0 }

  useFrame((_, dt) => {
    const o = g.current
    if (!o) return
    if (instant) { o.position.copy(RAMP.pos); o.rotation.set(RAMP.rx, 0, 0); return }
    if (carried) {
      tmp.current.copy(carryAnchor)
      frame.toLocal(tmp.current)
      o.position.lerp(tmp.current, Math.min(1, dt * 10))
      o.rotation.x = damp(o.rotation.x, 0.45, 8, dt)
      o.rotation.z = damp(o.rotation.z, 0.3, 8, dt)
    } else if (placing || placed) {
      o.position.lerp(RAMP.pos, Math.min(1, dt * 4.5))
      o.rotation.x = damp(o.rotation.x, RAMP.rx, 5, dt)
      o.rotation.y = damp(o.rotation.y, 0, 5, dt)
      o.rotation.z = damp(o.rotation.z, 0, 5, dt)
      if (!fired.current && o.position.distanceTo(RAMP.pos) < 0.03) { fired.current = true; onPlaced() }
    }
  })

  return (
    <group ref={g} position={instant ? RAMP.pos.toArray() : PLANK_HOME.toArray()} rotation={instant ? [RAMP.rx, 0, 0] : [0, 0.35, 0.06]}>
      <RoundedBox ref={walk} args={[0.86, 0.1, 1.16]} material={M(C.woodLight)} castShadow receiveShadow />
      <mesh position={[0, 0.052, 0]} material={M('#b98a5f')}><boxGeometry args={[0.88, 0.012, 0.05]} /></mesh>
      <mesh position={[0, 0.052, 0.3]} material={M('#b98a5f')}><boxGeometry args={[0.88, 0.012, 0.05]} /></mesh>
    </group>
  )
}

/** The hand crank that powers the bell. */
function Crank({ winding }: { winding: boolean }) {
  const wheel = useRef<THREE.Group>(null)
  useFrame((s, dt) => {
    if (wheel.current && winding) wheel.current.rotation.x += dt * 7
    if (wheel.current && !winding) wheel.current.rotation.x = damp(wheel.current.rotation.x, Math.round(wheel.current.rotation.x / (Math.PI / 2)) * (Math.PI / 2), 6, dt)
  })
  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={M(C.wood)} castShadow><cylinderGeometry args={[0.05, 0.07, 0.6, 8]} /></mesh>
      <NoMerge><group ref={wheel} position={[0, 0.64, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M('#8a6748')} castShadow><torusGeometry args={[0.17, 0.035, 8, 18]} /></mesh>
        <mesh position={[0.17, 0.05, 0]} material={M(C.woodLight)} castShadow><cylinderGeometry args={[0.03, 0.03, 0.12, 6]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M('#8a6748')}><cylinderGeometry args={[0.04, 0.04, 0.1, 8]} /></mesh>
      </group></NoMerge>
    </group>
  )
}

/** The standing stone beside the door, engraved with the sign to trace. */
function DoorStone() {
  const tex = useRef<THREE.CanvasTexture | null>(null)
  if (!tex.current) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128
    const ctx = cv.getContext('2d')!
    ctx.strokeStyle = '#5a4d43'; ctx.lineWidth = 10; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(64, 66, 38, -0.55, Math.PI * 1.32); ctx.stroke()
    tex.current = new THREE.CanvasTexture(cv)
    tex.current.colorSpace = THREE.SRGBColorSpace
  }
  return (
    <group position={[0.02, PORCH.h, -1.78]} rotation={[0, 0.32, 0]}>
      <RoundedBox args={[0.42, 0.72, 0.14]} radius={0.06} position={[0, 0.36, 0]} material={M('#c9bfb0')} castShadow />
      <mesh position={[0, 0.38, 0.075]}><planeGeometry args={[0.3, 0.4]} /><meshBasicMaterial map={tex.current} transparent /></mesh>
    </group>
  )
}

/** A-frame chalkboard by the wall, a few soft chalk marks. */
function Chalkboard() {
  return (
    <group position={[2.5, 0, 0.9]} rotation={[0, -0.5, 0]}>
      <mesh position={[-0.16, 0.26, 0]} rotation={[0, 0, 0.14]} material={M(C.wood)} castShadow><boxGeometry args={[0.05, 0.55, 0.04]} /></mesh>
      <mesh position={[0.16, 0.26, 0]} rotation={[0, 0, -0.14]} material={M(C.wood)} castShadow><boxGeometry args={[0.05, 0.55, 0.04]} /></mesh>
      <RoundedBox args={[0.42, 0.34, 0.04]} radius={0.02} position={[0, 0.42, 0.02]} rotation={[-0.1, 0, 0]} material={M('#37473c')} castShadow />
      <mesh position={[-0.05, 0.46, 0.045]} rotation={[0, 0, -0.08]} material={M('#e8e2d4')}><boxGeometry args={[0.2, 0.018, 0.01]} /></mesh>
      <mesh position={[-0.03, 0.4, 0.045]} rotation={[0, 0, 0.05]} material={M('#e8e2d4')}><boxGeometry args={[0.26, 0.018, 0.01]} /></mesh>
    </group>
  )
}

/** Six warm fireflies drifting over the garden — the night is alive but calm. */
function Fireflies() {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const a = i * 1.7 + t * (0.14 + i * 0.02)
      m.position.set(
        -0.9 + Math.sin(a) * (1.6 + (i % 3) * 0.5),
        0.5 + Math.sin(t * 0.7 + i * 2.4) * 0.3 + 0.25 * Math.sin(a * 2.3),
        -1.6 + Math.cos(a * 0.83) * (1.2 + (i % 2) * 0.8),
      )
      const k = 0.5 + 0.5 * Math.sin(t * 2.1 + i * 3.1)
      m.scale.setScalar(0.55 + k * 0.9)
    })
  })
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m }}>
          <sphereGeometry args={[0.028, 6, 6]} />
          <meshBasicMaterial color="#ffd9a0" />
        </mesh>
      ))}
    </group>
  )
}

/** Small gate + lantern marking the way on, at the exit. */
function ExitGate() {
  return (
    <group position={[1.45, 0, -4.0]} rotation={[0, -0.15, 0]}>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.6, 0]} material={M(C.wood)} castShadow><cylinderGeometry args={[0.05, 0.06, 1.2, 8]} /></mesh>
      ))}
      <mesh position={[0, 1.22, 0]} material={M(C.wood)} castShadow><boxGeometry args={[1.3, 0.08, 0.08]} /></mesh>
      <mesh position={[0, 1.06, 0]} material={M('#d9a25f')}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#e8b56a" emissive="#f2c47e" emissiveIntensity={0.9} /></mesh>
      <mesh position={[0, 1.14, 0]} material={M(C.wood)}><cylinderGeometry args={[0.015, 0.015, 0.16, 6]} /></mesh>
    </group>
  )
}

export default function Obstacle({ active, complete, done }: ObstacleProps) {
  const frame = useIslandFrame<THREE.Group>()
  useCarryAnchor()
  const [crossed, setCrossed] = useState(done)
  const [carried, setCarried] = useState(false)
  const [placed, setPlaced] = useState(done)
  const [placing, setPlacing] = useState(false)
  const [rung, setRung] = useState(done)
  const [signed, setSigned] = useState(done)
  const [doorOpen, setDoorOpen] = useState(done)
  const [signPad, setSignPad] = useState(false)
  const [ring, setRing] = useState(0)
  const [winding, setWinding] = useState(false)
  const hop = useRef<{ t: number; from: THREE.Vector3; to: THREE.Vector3 } | null>(null)
  const completed = useRef(done)

  const wins = [crossed, placed, rung, signed]
  const allLit = wins.every(Boolean)

  // the door opens once every window is warm — one calm motion, then complete()
  useEffect(() => {
    if (!allLit || completed.current) return
    const t1 = setTimeout(() => setDoorOpen(true), 450)
    const t2 = setTimeout(() => { completed.current = true; complete() }, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [allLit])

  useFrame((_, dt) => {
    // crossing detector: any route over the wall counts
    if (!crossed) {
      const p = frame.toLocal(player.pos)
      if (p.z < WALL_Z - 0.55) setCrossed(true)
    }
    // the climb hop: a small arc over the wall while frozen
    const h = hop.current
    if (h) {
      h.t = Math.min(1, h.t + dt * 2.1)
      const e = h.t * h.t * (3 - 2 * h.t)
      player.pos.lerpVectors(h.from, h.to, e)
      player.pos.y = Math.sin(e * Math.PI) * 1.05
      player.vel.set(0, 0, 0)
      if (h.t >= 1) { hop.current = null; player.frozen = false }
    }
  })

  const localPos = () => frame.toLocal(player.pos)

  useLocalInteractable(frame, {
    id: 'l09-wall',
    at: () => new THREE.Vector3(Math.max(-1.4, Math.min(1.4, localPos().x)), 0.5, WALL_Z),
    radius: 1.9,
    label: 'Climb the wall',
    enabled: () => active && !crossed && !hop.current && localPos().z > WALL_Z - 0.4,
    use: () => {
      if (!has('climb')) { caption('The wall is just a little too tall.'); return }
      const p = localPos()
      hop.current = {
        t: 0,
        from: player.pos.clone(),
        to: frame.at(Math.max(-1.3, Math.min(1.3, p.x)), 0, WALL_Z - 0.62),
      }
      player.frozen = true
    },
  })

  useLocalInteractable(frame, {
    id: 'l09-plank',
    at: () => PLANK_HOME.clone().setY(0.35),
    radius: 1.7,
    label: 'Pick up the plank',
    enabled: () => active && crossed && !placed && !placing && !carried && player.carrying === null,
    use: () => {
      if (!has('build')) { caption('The plank is heavier than it looks — a builder would know.'); return }
      player.carrying = 'l09-plank'
      setCarried(true)
      caption('Carry it to the gap in the porch.')
    },
  })

  useLocalInteractable(frame, {
    id: 'l09-slot',
    at: () => new THREE.Vector3((GAP.x0 + GAP.x1) / 2, 0.3, -1.0),
    radius: 1.8,
    label: 'Lay the plank',
    enabled: () => active && crossed && !placed && !placing && carried && player.carrying === 'l09-plank',
    use: () => {
      player.carrying = null
      setCarried(false)
      setPlacing(true)
    },
  })

  useLocalInteractable(frame, {
    id: 'l09-crank',
    at: () => new THREE.Vector3(-1.75, 0.9, -1.9),
    radius: 1.6,
    label: 'Wind the crank',
    enabled: () => active && placed && !rung && !winding && localPos().y > 0.2,
    use: () => {
      if (!has('power')) { caption('The crank barely turns — it needs a practised hand.'); return }
      setWinding(true)
      setTimeout(() => {
        setWinding(false)
        setRing((r) => r + 1)
        setRung(true)
        caption('The bell rings out over the rooftops.')
      }, 1400)
    },
  })

  useLocalInteractable(frame, {
    id: 'l09-door',
    at: () => new THREE.Vector3(0.02, PORCH.h + 0.4, -1.78),
    radius: 1.7,
    label: 'Trace the sign on the stone',
    enabled: () => active && placed && !signed && !signPad && localPos().y > 0.2,
    use: () => {
      if (!has('sign')) { caption('The stone waits for a sign you haven’t learned.'); return }
      setSignPad(true)
    },
  })

  useDomOverlay(
    signPad ? (
      <SignPad template={SIGN_C} title="Trace the sign on the stone" sub="One slow stroke, like chalk on slate."
        onClose={() => setSignPad(false)}
        onResult={(ok) => { if (ok) { setSignPad(false); setSigned(true); caption('The last light comes on.') } }} />
    ) : null,
  )

  /* ?qa solver — real interactions: teleport, use, draw the C. */
  useEffect(() => {
    if (!isQa()) return
    installSolve('L09', async () => {
      const S = useV5.getState()
      for (const a of ['climb', 'build', 'power', 'sign'] as const) if (!S.abilities.includes(a)) S.grant(a)
      teleportTo(frame, 0, 0, 2.75); await sleep(450)
      ;(await waitFor(() => interactables.get('l09-wall'))).use(); await sleep(900)
      teleportTo(frame, -2.5, 0, 0.5); await sleep(350)
      interactables.get('l09-plank')?.use(); await sleep(350)
      teleportTo(frame, -0.9, 0, -0.6); await sleep(350)
      interactables.get('l09-slot')?.use(); await sleep(1400)
      teleportTo(frame, -1.75, 0.5, -2.0); await sleep(400)
      interactables.get('l09-crank')?.use(); await sleep(1800)
      teleportTo(frame, -0.2, 0.5, -1.9); await sleep(400)
      // trace the door sign — retry a rejected stroke a few times rather than stalling
      for (let tries = 0; tries < 4 && !useV5.getState().done.includes('L09'); tries++) {
        try {
          interactables.get('l09-door')?.use()
          const cv = await waitFor(() => document.querySelector<HTMLCanvasElement>('[data-qa="sign-canvas"]'), 9000)
          await sleep(350)
          await tracePad(cv)
          await sleep(3400)
        } catch { /* pad never opened — try again */ }
      }
    })
  }, [])

  return (
    <group ref={frame.ref}>
      <AutoMerge>
      <Wall />
      <Porch />
      <group position={SCHOOL.toArray()}>
        <Schoolhouse wins={wins} doorOpen={doorOpen} ring={ring} />
      </group>
      {!placed && !placing && !carried && (
        <group position={[-2.5, 0, 1.0]}>
          <RoundedBox args={[0.55, 0.4, 0.55]} radius={0.04} position={[0, 0.2, 0]} material={M(C.wood)} castShadow receiveShadow />
          <mesh position={[0.12, 0.46, -0.1]} rotation={[0, 0.4, 0]} material={M(C.woodLight)} castShadow><boxGeometry args={[0.5, 0.08, 0.2]} /></mesh>
        </group>
      )}
      {/* two wood pegs mark where the plank goes, once carried */}
      {carried && [GAP.x0 + 0.06, GAP.x1 - 0.06].map((x) => (
        <mesh key={x} position={[x, 0.09, -1.32]} material={M(C.woodLight)} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.18, 8]} />
        </mesh>
      ))}

      {/* crank on the porch, wired to the bell tower */}
      <group position={[-1.75, PORCH.h, -1.95]}>
        <Crank winding={winding} />
      </group>
      <mesh position={[-1.55, PORCH.h + 0.04, -2.1]} rotation={[0, 0.5, 0]} material={M('#8a6748')}>
        <boxGeometry args={[0.5, 0.03, 0.08]} />
      </mesh>

      <DoorStone />
      <Chalkboard />
      <ExitGate />

      {/* quiet dressing on the rim — ART pack props */}
      <Prop name="plant_bush_detailed" position={[3.45, -0.04, -1.65]} rotation={[0, 0.9, 0]} scale={0.9} />
      <Prop name="plant_bush" position={[-3.6, -0.04, -0.7]} rotation={[0, 2.6, 0]} scale={0.95} />
      <Prop name="quat_rock_2" position={[3.05, -0.02, 1.85]} rotation={[0, 1.7, 0]} scale={0.5} />
      <Prop name="rock_small_flat_a" position={[-3.25, -0.02, 1.95]} rotation={[0, 0.4, 0]} scale={0.55} />
      <Prop name="flower_yellow_b" position={[-2.5, -0.02, 1.15]} scale={0.85} />
      {/* a pair of path lanterns by the entry */}
      {[[-0.9, 3.6], [0.9, 2.75]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]} material={M(C.wood)} castShadow><cylinderGeometry args={[0.03, 0.04, 0.8, 6]} /></mesh>
          <mesh position={[0, 0.84, 0]}><sphereGeometry args={[0.06, 10, 8]} /><meshStandardMaterial color="#e8b56a" emissive="#f2c47e" emissiveIntensity={0.8} /></mesh>
        </group>
      ))}
      </AutoMerge>

      {/* plank + its pickup spot by a little work crate */}
      <Plank frame={frame} carried={carried} placing={placing} placed={placed} instant={done}
        onPlaced={() => { setPlaced(true); setPlacing(false); caption('It fits.') }} />
      <Fireflies />

    </group>
  )
}
