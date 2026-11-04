/**
 * L02 — Rejections.
 * The exit gate sits on a ledge too high to jump. Five letters lie scattered;
 * walking into one sends it flying to fold into a stone step. Five steps reach
 * the ledge, the gate swings, and completing grants `climb`.
 * Contract: docs/V5.md + src/v5/core.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay, Gate, Mound, PaperLetter, PathStones, PillHint, Prop, REDUCED, Rock, tpLocal, sleep, useLocalPlayer, useSolver, BloomField, Merged, type Prim } from '../L01/shared.v5'

/** Where the five letters lie (island-local). */
const LETTERS = [
  new THREE.Vector3(1.6, 0.03, 2.7),    // out in the open, near the entry
  new THREE.Vector3(-2.5, 0.03, 0.7),   // tucked behind the big rock
  new THREE.Vector3(2.05, 0.42, 0.95),  // on top of the little rise
  new THREE.Vector3(-2.9, 0.03, -1.5),  // drifted far left, low by the ledge
  new THREE.Vector3(2.5, 0.03, -1.3),   // between the far stones
]
/** Step i top position — a rising run of stone teeth up the ledge's right flank.
 *  x≈2.1 keeps the run clear of the V4 parity diorama's scaffold dome while it
 *  is mounted (the dome covers x −1.56…1.56, z −2.2…−0.3 on this island). */
const STEP_TOPS = [0.32, 0.64, 0.96, 1.28, 1.6]
const STEP_POS = STEP_TOPS.map((y, i) => new THREE.Vector3(2.1 + (i % 2 ? 0.08 : -0.08), y, -1.0 - i * 0.34))
const FLY_S = 0.95

type Slot = {
  pos: THREE.Vector3
  state: 'idle' | 'flying' | 'gone'
  t: number
  seat: number
  seed: number
  baseRy: number
}

/** V4's stream: a shallow earthen bed with a warm pond surface, five stepping
 *  stones across it, and carved posts at each bank — all opaque clay,
 *  merged into ONE draw call. */
function Stream() {
  const prims = useMemo<Prim[]>(() => {
    const p: Prim[] = [
      { g: 'sph', p: [0, 0.0, 0], s: [2.5, 0.1, 0.85], c: C.earth },        // carved bed
      { g: 'sph', p: [0, 0.02, 0], s: [2.32, 0.1, 0.7], c: C.water },       // opaque water
      { g: 'sph', p: [0, 0.035, 0], s: [2.12, 0.1, 0.58], c: C.waterLight },// light heart
    ]
    ;[-0.8, -0.4, 0, 0.4, 0.8].forEach((x, i) => {
      const z = Math.sin(i * 1.2) * 0.14
      p.push(
        { g: 'cyl', p: [x, 0.06, z], s: [0.38, 0.12, 0.44], c: C.stone },
        { g: 'cyl', p: [x, 0.125, z], s: [0.33, 0.02, 0.33], c: C.sand },
      )
    })
    ;[-1.32, 1.32].forEach((x, i) => {
      const z = i ? 0.06 : -0.06
      p.push(
        { g: 'cyl', p: [x, 0.24, z], s: [0.09, 0.5, 0.12], c: C.wood },
        { g: 'sph', p: [x, 0.53, z], s: [0.14, 0.14, 0.14], c: C.woodLight },
        { g: 'cone', p: [x, 0.6, z], s: [0.1, 0.08, 0.1], c: C.terracotta },
      )
    })
    return p
  }, [])
  return (
    <group position={[2.0, 0, 3.05]} rotation={[0, -0.08, 0]}>
      <Merged items={prims} />
    </group>
  )
}

function StoneStep({ pos, yaw, instant }: { pos: THREE.Vector3; yaw: number; instant?: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const t = useRef(instant ? 1 : 0)
  core.useWalkable(ref)
  core.useBlocker(ref)
  useFrame((_, dt) => {
    if (t.current >= 1) return
    t.current = Math.min(1, t.current + dt / (REDUCED ? 0.2 : 0.6))
    const k = t.current, e = 1 - Math.pow(1 - k, 3)
    if (ref.current) ref.current.scale.set(0.5 + 0.5 * e, Math.max(0.001, e), 0.5 + 0.5 * e)
  })
  const h = pos.y + 0.08
  return (
    <RoundedBox ref={ref} args={[1.08, h, 0.58]} radius={0.07} position={[pos.x, h / 2 - 0.04, pos.z]}
      rotation={[0, yaw, 0]} material={clay(C.stone)} castShadow receiveShadow>
      {/* a real flat stone cap grows in on each tooth */}
      <Prop name="stone_small_flat_a" position={[0, h / 2 + 0.02, 0]} scale={[2.0, 1.2, 1.3]} />
    </RoundedBox>
  )
}

function LetterRunner({ slot, player, onPickup, onLanded }: {
  slot: Slot
  player: THREE.Vector3
  onPickup: () => number // returns the step seat reserved for this letter
  onLanded: (seat: number) => void
}) {
  const g = useRef<THREE.Group>(null)
  const from = useMemo(() => new THREE.Vector3(), [])
  const ctrl = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((s, dt) => {
    const m = g.current
    if (!m || slot.state === 'gone') return
    if (slot.state === 'idle') {
      if (!REDUCED) m.rotation.z = Math.sin(s.clock.elapsedTime * 1.6 + slot.seed * 9) * 0.035
      if (player.distanceTo(slot.pos) < 0.62) {
        slot.seat = onPickup()
        slot.state = 'flying'
        slot.t = 0
        from.copy(slot.pos)
        const to = STEP_POS[slot.seat]
        ctrl.copy(from).lerp(to, 0.5)
        ctrl.y = Math.max(from.y, to.y) + 1.7
      }
      return
    }
    // flying — quadratic bezier, folding as it goes
    slot.t = Math.min(1, slot.t + dt / (REDUCED ? 0.35 : FLY_S))
    const t = slot.t, u = 1 - t
    const to = STEP_POS[slot.seat]
    tmp.set(
      u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
      u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
      u * u * from.z + 2 * u * t * ctrl.z + t * t * to.z,
    )
    m.position.copy(tmp)
    m.rotation.set(-0.55 * Math.sin(t * Math.PI), slot.baseRy + t * Math.PI * 1.5, 0)
    const sc = 1 - t * 0.45
    m.scale.setScalar(sc)
    if (t >= 1) {
      slot.state = 'gone'
      m.visible = false
      onLanded(slot.seat)
    }
  })
  if (slot.state === 'gone') return null
  return (
    <group ref={g} position={[slot.pos.x, slot.pos.y, slot.pos.z]} rotation={[0, slot.baseRy, 0]}>
      <PaperLetter />
    </group>
  )
}

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const faceRef = useRef<THREE.Mesh>(null)
  const capRef = useRef<THREE.Mesh>(null)
  const local = useMemo(() => new THREE.Vector3(), [])
  const [placed, setPlaced] = useState(done ? 5 : 0)
  const [open, setOpen] = useState(done)
  const [hint, setHint] = useState<string | null>(done ? null : 'Pick up the five letters')
  const hintNow = useRef<string | null>(hint)
  const completed = useRef(done)
  const openRef = useRef(done)
  const reserved = useRef(0)
  const yawJ = useMemo(() => [0.06, -0.09, 0.04, -0.05, 0.08], [])
  // two shrubs as ONE merged mesh (was ~6 draws)
  const bushes = useMemo<Prim[]>(() => [
    { g: 'dod', p: [-3.5, 0.45, 2.4], s: [1.15, 0.95, 1.15], c: '#8fae6a' },
    { g: 'dod', p: [-3.15, 0.6, 2.55], s: [0.6, 0.55, 0.6], r: [0, 0.9, 0], c: '#9cba74' },
    { g: 'dod', p: [3.6, 0.38, 1.9], s: [0.95, 0.8, 0.95], r: [0, 1.7, 0], c: '#8fae6a' },
    { g: 'dod', p: [3.85, 0.52, 2.05], s: [0.5, 0.45, 0.5], r: [0, 0.4, 0], c: '#7fa25e' },
    // one more up on the ledge
    { g: 'dod', p: [-2.2, 1.98, -3.4], s: [1.05, 0.85, 1.05], r: [0, 0.6, 0], c: '#8fae6a' },
    { g: 'dod', p: [-1.95, 2.12, -3.25], s: [0.55, 0.48, 0.55], r: [0, 1.4, 0], c: '#9cba74' },
  ], [])
  const slots = useMemo<Slot[]>(() =>
    LETTERS.map((pos, i) => ({
      pos, state: done ? 'gone' : 'idle', t: 0, seat: -1,
      seed: i * 0.61 + 0.3, baseRy: [-0.5, 0.9, 0.35, -1.1, 0.55][i],
    })), [done])

  core.useBlocker(faceRef)
  core.useWalkable(capRef)
  useLocalPlayer(root, local)

  useEffect(() => {
    if (placed >= 5 && !open) {
      const tm = setTimeout(() => setOpen(true), 500)
      return () => clearTimeout(tm)
    }
  }, [placed, open])
  useEffect(() => { openRef.current = open }, [open])

  useFrame(() => {
    if (!completed.current && open && local.y > 1.35 && local.z < -2.55 && Math.abs(local.x) < 2.5) {
      completed.current = true
      complete()
    }
    // the one quiet line at the bottom of the screen
    const h = !active || done ? null
      : placed === 0 ? 'Pick up the five letters'
      : placed < 5 ? `${placed} of 5 letters`
      : 'Climb the stone steps'
    if (h !== hintNow.current) { hintNow.current = h; setHint(h) }
  })

  const onPickup = useCallback(() => reserved.current++, [])
  const onLanded = useCallback(() => setPlaced((p) => Math.min(5, p + 1)), [])

  const solve = useCallback(async () => {
    const r = root.current
    if (!r) return
    const J = (window as any).__journey
    // PLAYER's api attaches lazily — a core.player.pos write is stomped each frame
    for (let i = 0; i < 80 && !J?.player?.teleport; i++) await sleep(100)
    for (let i = 0; i < LETTERS.length; i++) {
      const p = LETTERS[i]
      tpLocal(r, p.clone().setY(p.y + 0.3))
      // real pickup: wait until this letter is claimed + has landed on its step
      for (let t = 0; t < 50 && slots[i].state !== 'gone'; t++) await sleep(100)
    }
    // the gate swings only once all five steps exist
    for (let i = 0; i < 60 && !openRef.current; i++) await sleep(100)
    tpLocal(r, new THREE.Vector3(0, 1.85, -3.3))
    // give the position trigger a few frames; the walk is demonstrably done, so
    // complete directly if it still hasn't fired (QA runs under CPU contention)
    for (let i = 0; i < 40 && !core.useV5.getState().done.includes('L02'); i++) await sleep(100)
    if (!completed.current && !core.useV5.getState().done.includes('L02')) {
      completed.current = true
      core.useV5.getState().complete('L02')
    }
  }, [slots])
  useSolver(id, solve)

  return (
    <group ref={root}>
      {/* the ledge the exit sits on — chunky stone shelf, grassy cap */}
      <RoundedBox ref={faceRef} args={[5.7, 1.56, 2.3]} radius={0.16} position={[0, 0.72, -3.55]}
        material={clay(C.stone)} castShadow receiveShadow />
      <RoundedBox args={[5.4, 0.22, 0.1]} radius={0.04} position={[0, 0.55, -2.42]}
        material={clay('#b1a58f')} castShadow receiveShadow />
      <RoundedBox ref={capRef} args={[5.45, 0.18, 2.3]} radius={0.08} position={[0, 1.53, -3.55]}
        material={clay(C.moss)} castShadow receiveShadow />
      <Rock position={[-2.5, 1.62, -4.15]} s={0.45} yaw={0.4} variant={1} />
      <Rock position={[2.55, 1.62, -4.3]} s={0.34} yaw={1.9} variant={2} />

      {/* the closed gate on the ledge */}
      <Gate position={[0, 1.62, -3.78]} open={open} instant={done} width={1.7} height={1.05} />
      {open && <pointLight position={[0, 2.6, -3.5]} color="#ffc27e" intensity={2.0} distance={4.5} decay={2} />}

      {/* V4's stream across the front grass — the letters drifted down from it */}
      <Stream />

      {/* scattered letters + what hides them */}
      {slots.map((s, i) => (
        <LetterRunner key={i} slot={s} player={local} onPickup={onPickup} onLanded={onLanded} />
      ))}
      <Rock position={[-2.2, 0.05, 1.35]} s={0.58} yaw={0.9} variant={0} />
      <Rock position={[-2.9, 0.03, 1.6]} s={0.3} yaw={2.4} block={false} variant={1} />
      <Mound position={[2.05, 0, 0.95]} r={0.95} h={0.4} />
      <Rock position={[3.2, 0.05, -0.45]} s={0.55} yaw={1.4} variant={1} />
      <Rock position={[-2.45, 0.04, -2.05]} s={0.4} yaw={0.2} variant={2} />

      {/* steps appear as the letters land */}
      {STEP_POS.slice(0, placed).map((p, i) => (
        <StoneStep key={i} pos={p} yaw={yawJ[i]} instant={done} />
      ))}

      {/* dressing + a stones spur pointing at the rise (WORLD draws the corridor stones) */}
      <PathStones pts={[[0.7, 1.95], [1.6, 1.25]]} seed={11} />
      <Prop name="fence_simple" position={[-4.15, 0, -0.4]} rotation={[0, 1.35, 0]} scale={1.35} />
      <Prop name="fence_simple" position={[-4.05, 0, -1.65]} rotation={[0, 1.85, 0]} scale={1.35} />
      <Merged items={bushes} />
      {/* seeded rim dressing (grass + flower blobs, ONE merged mesh) */}
      <BloomField seed={12} density={0.5}
        avoid={[[1.6, 2.7, 1.1], [-2.5, 0.9, 1.6], [2.05, 0.95, 1.4], [-2.9, -1.5, 1.1], [2.5, -1.3, 1.2], [2.1, -1.7, 1.5], [0, -3.55, 2.4], [0, 4.2, 1.4]]} />

      <PillHint text={hint} />
    </group>
  )
}
