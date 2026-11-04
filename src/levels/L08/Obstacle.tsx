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
import { Board, BoardCard } from './plaza.v5'
import { Guardian } from './guardian.v5'
import Play, { l08qa } from './Play'
import { ISLAND_R } from '../../v5/world/layout'
import { SpeakPrompt } from './voiceui.v5'
import { SignPad, SIGN_V } from './signui.v5'
import { has, interactables, useBlocker, useV5, type ObstacleProps } from '../../v5/core'
import { LEVELS } from '../registry'
import { PillHint } from '../L01/shared.v5'

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

/* paper scrim behind the caption band (same trick as L06), so the date line reads over the dome */
let scrimCSSIn = false
function useCapScrim(on: boolean) {
  useEffect(() => {
    if (!on || typeof document === 'undefined') return
    if (!scrimCSSIn) {
      scrimCSSIn = true
      const st = document.createElement('style')
      st.textContent = `body.gj-l08 .v5-cap{background:radial-gradient(ellipse 60% 70% at 50% 50%,color-mix(in srgb,var(--paper) 90%,transparent),color-mix(in srgb,var(--paper) 0%,transparent) 78%);padding:18px 48px}body.gj-l08 .v5-cap .eyebrow{opacity:1}`
      document.head.appendChild(st)
    }
    document.body.classList.add('gj-l08')
    return () => { document.body.classList.remove('gj-l08') }
  }, [on])
}

export default function Obstacle({ active, complete, done }: ObstacleProps) {
  useCapScrim(active)
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
      setTimeout(() => complete(), 400)
    }
  })

  useLocalInteractable(frame, {
    id: 'l08-guardian',
    at: () => pos.current.clone().setY(1.3),
    radius: 2.3,
    label: 'Speak to the guardian',
    enabled: () => active && overlay === 'none' && stage !== 'aside',

    use: () => { caption('Match the sign on the laptop first.') },
  })

  useLocalInteractable(frame, {
    id: 'l08-board',
    at: () => new THREE.Vector3(-1.25, 0.9, 2.55),
    radius: 1.8,
    label: 'Read the plaza board',
    enabled: () => overlay === 'none',
    use: () => setOverlay('board'),
  })

  useDomOverlay(
    <>
      {overlay === 'speak' ? (
        <SpeakPrompt word="hello" onClose={() => setOverlay('none')}
        onResult={() => {
          setStage('shown')
          caption('The guardian shows you a sign.')
          // a beat to watch the tablet rise, then the pad opens on its own
          setTimeout(() => setOverlay('sign'), 500)
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
      teleportTo(frame, 0, 0, 2.9)
      await sleep(600)
      for (let i = 0; i < 40 && !useV5.getState().done.includes('L08'); i++) {
        l08qa.tapTarget?.()
        await sleep(700)
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
      <PillHint text={active && stage !== 'aside' && overlay === 'none' ? L08H.hint : null} />
      <GateStone x={-1.45} />
      <GateStone x={1.5} />
      <Tablet shown={stage !== 'approach'} />

      {/* V4's matching game, as V4 played it: the laptop shows a sign, tap the hand that matches */}
      {!done && (
        <group scale={ISLAND_R / 3.2}>
          <Play onWin={() => setStage('aside')} won={stage === 'aside'} />
        </group>
      )}

      {/* fallback: V4's island comes from WORLD's parity mount — this layer is
          the V5 obstacle on top: guardian gate, tablet, board, hint pill. */}

      {/* story board + quiet rim dressing — one bake, no shadow casts on the small props */}
      <StaticBake shadow={false}>
        <group position={[-1.25, 0, 2.55]} rotation={[0, 0.5, 0]}>
          <Board />
        </group>
        <Prop name="bench" position={[-2.6, 0, -0.5]} rotation={[0, 0.9, 0]} scale={0.85} />
        <Prop name="rock_large_b" position={[-3.7, -0.08, 1.1]} rotation={[0, 0.7, 0]} scale={0.38} />
        <Prop name="plant_bush" position={[-3.3, -0.04, -0.9]} rotation={[0, 2.1, 0]} scale={0.8} />
        <Prop name="plant_bush_detailed" position={[-3.55, -0.04, -1.95]} rotation={[0, 1.2, 0]} scale={0.85} />
        <Prop name="grass_large" position={[-2.95, -0.02, 2.55]} scale={0.85} />
        <Prop name="flower_red_a" position={[-2.35, -0.02, 2.6]} scale={0.9} />
      </StaticBake>

      {/* DOM overlays live on their own react root (see useDomOverlay) */}
    </group>
  )
}
