/**
 * L08 — Sign Flow (V5).
 * A stone guardian blocks the exit. It only listens to a spoken word (voice ability):
 * say "hello" → it reveals a hand-sign on a tablet → draw the sign on the pad →
 * it steps aside and complete() grants 'sign'.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  M, useIslandFrame, useLocalInteractable, useCarryAnchor, useDomOverlay,
  damp, caption, isQa, installSolve, teleportTo, waitFor, sleep, fillInput, tracePad,
  StaticBake,
} from './v5kit.v5'
import { Prop } from '../../v5/art/Dressing'
import DioramaV4 from './Diorama'
import { Plaza, Bunting, Board, BoardCard } from './plaza.v5'
import { Guardian } from './guardian.v5'
import { SpeakPrompt } from './voiceui.v5'
import { SignPad, SIGN_V } from './signui.v5'
import { has, interactables, useBlocker, useV5, type ObstacleProps } from '../../v5/core'
import { LEVELS } from '../registry'

const L08H = LEVELS.find((l) => l.id === 'L08')!

const HOME = new THREE.Vector3(0, 0, -1.95)
const ASIDE = new THREE.Vector3(1.95, 0, -3.7)

/** A standing stone tablet that rises and shows the engraved sign once the guardian wakes. */
function Tablet({ shown }: { shown: boolean }) {
  const g = useRef<THREE.Group>(null)
  const t = useRef(shown ? 1 : 0)
  const tex = useRef<THREE.CanvasTexture | null>(null)
  if (!tex.current) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128
    const ctx = cv.getContext('2d')!
    ctx.strokeStyle = '#5a4d43'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(34, 30); ctx.lineTo(64, 102); ctx.lineTo(94, 30); ctx.stroke()
    tex.current = new THREE.CanvasTexture(cv)
    tex.current.colorSpace = THREE.SRGBColorSpace
  }
  useFrame((_, dt) => {
    t.current = damp(t.current, shown ? 1 : 0, 2.4, dt)
    const k = t.current
    if (g.current) {
      // rises out of the ground with a soft settle
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      g.current.position.y = -0.85 + e * 0.85 + Math.sin(Math.min(1, k) * Math.PI) * 0.04
      g.current.rotation.y = -0.28 + (1 - e) * 0.5
    }
  })
  return (
    <group ref={g} position={[1.15, -0.85, -1.5]}>
      <RoundedBox args={[0.5, 0.85, 0.13]} radius={0.05} position={[0, 0.42, 0]} rotation={[0.04, 0, 0.03]} material={M('#c9bfb0')} castShadow />
      <mesh position={[0, 0.45, 0.068]} rotation={[0.04, 0, 0.03]}>
        <planeGeometry args={[0.36, 0.5]} />
        <meshBasicMaterial map={tex.current} transparent opacity={Math.min(1, t.current * 2)} />
      </mesh>
    </group>
  )
}

/** One of the two gate boulders flanking the guardian. */
function GateStone({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useBlocker(ref)
  return (
    <mesh ref={ref} position={[x, 0.5, -2.0]} rotation={[0.2, x, 0.1]} material={M('#b8ac9a')} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.72, 1]} />
    </mesh>
  )
}

export default function Obstacle({ active, complete, done }: ObstacleProps) {
  const frame = useIslandFrame<THREE.Group>()
  useCarryAnchor()
  const [stage, setStage] = useState<'approach' | 'shown' | 'aside'>(done ? 'aside' : 'approach')
  const [overlay, setOverlay] = useState<'none' | 'speak' | 'sign' | 'board'>('none')
  const gRef = useRef<THREE.Group>(null)
  const pos = useRef(done ? ASIDE.clone() : HOME.clone())
  const completed = useRef(done)
  const walkBob = useRef(0)

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const target = stage === 'aside' ? ASIDE : HOME
    const d = pos.current.distanceTo(target)
    pos.current.x = damp(pos.current.x, target.x, 1.9, dt)
    pos.current.z = damp(pos.current.z, target.z, 1.9, dt)
    if (d > 0.12) walkBob.current = Math.abs(Math.sin(t * 9)) * 0.045
    else walkBob.current = damp(walkBob.current, 0, 8, dt)
    if (gRef.current) {
      gRef.current.position.set(pos.current.x, walkBob.current, pos.current.z)
      const yawT = stage === 'aside' ? 0.85 : 0
      gRef.current.rotation.y = damp(gRef.current.rotation.y, yawT, 2.2, dt)
      // once settled aside it gives a small bow — you may pass
      const bowT = stage === 'aside' && d < 0.3 ? 0.14 : 0
      gRef.current.rotation.x = damp(gRef.current.rotation.x, bowT, 1.8, dt)
    }
    if (stage === 'aside' && d < 0.12 && !completed.current) {
      completed.current = true
      caption('The guardian steps aside.')
      setTimeout(() => complete(), 650)
    }
  })

  useLocalInteractable(frame, {
    id: 'l08-guardian',
    at: () => pos.current.clone().setY(1.3),
    radius: 2.3,
    label: stage === 'approach' ? 'Speak to the guardian' : 'Show the guardian your sign',
    enabled: () => active && overlay === 'none' && stage !== 'aside',

    use: () => {
      if (stage === 'approach') {
        if (!has('voice')) { caption('The guardian waits for a voice it knows.'); return }
        setOverlay('speak')
      } else if (stage === 'shown') {
        setOverlay('sign')
      }
    },
  })

  useLocalInteractable(frame, {
    id: 'l08-board',
    at: () => new THREE.Vector3(-1.3, 0.9, 2.35),
    radius: 1.8,
    label: 'Read the plaza board',
    enabled: () => overlay === 'none',
    use: () => setOverlay('board'),
  })

  useDomOverlay(
    <>
      {stage !== 'aside' && overlay === 'none' ? (
        <div className="jov5-pill" data-qa="hint">{L08H.hint}</div>
      ) : null}
      {overlay === 'speak' ? (
        <SpeakPrompt word="hello" onClose={() => setOverlay('none')}
        onResult={() => {
          setStage('shown')
          caption('The guardian shows you a sign.')
          // a beat to watch the tablet rise, then the pad opens on its own
          setTimeout(() => setOverlay('sign'), 950)
          setOverlay('none')
        }} />
      ) : overlay === 'sign' ? (
        <SignPad template={SIGN_V} title="Trace the guardian’s sign" sub="One stroke — the shape on the tablet."
        onClose={() => setOverlay('none')}
        onResult={(ok) => { if (ok) { setOverlay('none'); setStage('aside') } }} />
      ) : overlay === 'board' ? (
        <BoardCard onClose={() => setOverlay('none')} />
      ) : null}
    </>,
  )

  /* ?qa solver — plays it for real: teleport, use, type the word, draw the V. */
  useEffect(() => {
    if (!isQa()) return
    installSolve('L08', async () => {
      if (!has('voice')) useV5.getState().grant('voice')
      teleportTo(frame, 0, 0, -1.7)
      await sleep(450)
      ;(await waitFor(() => interactables.get('l08-guardian'))).use()
      const tb = await waitFor(() => document.querySelector<HTMLButtonElement>('[data-qa="speak-type"]'))
      tb.click()
      const input = await waitFor(() => document.querySelector<HTMLInputElement>('[data-qa="speak-input"]'))
      fillInput(input, 'hello')
      input.closest('form')!.requestSubmit()
      await sleep(900)
      // the guardian now shows its sign — ask it again to open the pad; retry a
      // rejected trace a few times rather than stalling
      for (let tries = 0; tries < 4 && !useV5.getState().done.includes('L08'); tries++) {
        try {
          ;(await waitFor(() => interactables.get('l08-guardian'))).use()
          const cv = await waitFor(() => document.querySelector<HTMLCanvasElement>('[data-qa="sign-canvas"]'), 9000)
          await sleep(350)
          await tracePad(cv)
          await sleep(3200)
        } catch { /* pad never opened — try again */ }
      }
    })
  }, [])

  return (
    <group ref={frame.ref}>
      {/* the guardian + its gate */}
      <group ref={gRef} position={pos.current.toArray()}>
        <group scale={1.2}>
          <Guardian awake={stage !== 'approach'} />
        </group>
      </group>
      <GateStone x={-1.45} />
      <GateStone x={1.5} />
      <Tablet shown={stage !== 'approach'} />

      {/* the sign studio — V4's own diorama (unlocked → its scaffold folds away),
          baked to a handful of merged draws once it settles */}
      <group position={[-3.0, 0, 1.0]} scale={1.05}>
        <StaticBake delay={3200}>
          <DioramaV4 unlocked={true} active={active} />
        </StaticBake>
      </group>

      {/* the plaza: paving, sign-glyph bunting over the path — instanced/merged already */}
      <Plaza />
      <Bunting from={[-2.5, 2.1, 2.6]} to={[2.5, 2.1, 2.6]} sag={0.35} />

      {/* story board + quiet rim dressing — one bake, no shadow casts on the small props */}
      <StaticBake shadow={false}>
        <group position={[-1.3, 0, 2.35]} rotation={[0, 0.5, 0]}>
          <Board />
        </group>
        <Prop name="bench" position={[2.3, 0, -0.35]} rotation={[0, -0.9, 0]} scale={0.85} />
        <Prop name="sign" position={[1.55, 0, 2.9]} rotation={[0, -0.35, 0]} scale={0.9} />
        <Prop name="rock_large_b" position={[3.55, -0.08, 1.35]} rotation={[0, 0.7, 0]} scale={0.38} />
        <Prop name="plant_bush" position={[3.15, -0.04, -0.7]} rotation={[0, 2.1, 0]} scale={0.8} />
        <Prop name="plant_bush_detailed" position={[-3.55, -0.04, -1.95]} rotation={[0, 1.2, 0]} scale={0.85} />
        <Prop name="grass_large" position={[-2.95, -0.02, 2.55]} scale={0.85} />
        <Prop name="flower_red_a" position={[2.35, -0.02, 2.05]} scale={0.9} />
      </StaticBake>

      {/* DOM overlays live on their own react root (see useDomOverlay) */}
    </group>
  )
}
