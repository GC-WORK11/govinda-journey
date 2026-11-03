import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Tappable, Pop, blip, chime, burst, glowMat, pulse, REDUCED, useLocalToWorld } from '../../world/play'
import { C, clay } from '../../world/kit'

/* 'Wispr Wrap': four soft speech-bubble pebbles float in the open front of the island.
   Tap one and it arcs to the laptop, landing as a typed line on the document.
   Any order — the words stack in sentence order. All four in, the cursor blinks, done. */

const WORDS = ['hello', 'from', 'my', 'phone']

// floating row along the front rim, clear of the traveller (-0.9, 1.4) and the scaffold (x 0.45..1.25, z -0.1..0.7)
const SPAWNS: [number, number, number][] = [
  [-0.30, 0.62, 1.70],
  [0.22, 0.80, 1.88],
  [0.72, 0.64, 1.98],
  [1.25, 0.78, 1.86],
]

// laptop screen transform, matching Diorama (desk at x -0.7; screen local (0,0.1,0.16), tilted -0.2)
const SCR_M = new THREE.Matrix4().makeRotationX(-0.2).setPosition(-0.7, 0.1, 0.16)
const lineY = (i: number) => 0.063 - i * 0.042
const LINE_TARGET = WORDS.map((_, i) => new THREE.Vector3(0, lineY(i), 0.021).applyMatrix4(SCR_M))
const barW = (w: string) => 0.1 + w.length * 0.03

type WS = { st: 'idle' | 'fly' | 'done'; t: number; from: THREE.Vector3; pos: THREE.Vector3 }

export default function Play({ onWin, won }: PlayProps) {
  const [root, toWorld] = useLocalToWorld()
  const [landed, setLanded] = useState<number[]>([])
  const [cursorOn, setCursorOn] = useState(false)
  const ws = useRef<WS[]>(WORDS.map((_, i) => ({ st: 'idle', t: 0, from: new THREE.Vector3(), pos: new THREE.Vector3(...SPAWNS[i]) })))
  const groups = useRef<(THREE.Group | null)[]>([])
  const tileMats = useRef(WORDS.map(() => glowMat('#f0a860', '#ecd7b6')))
  const hitMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [])
  const cursor = useRef<THREE.Mesh>(null)
  const wonFired = useRef(false)

  const tap = (i: number) => {
    const w = ws.current[i]
    if (won || w.st !== 'idle') return
    w.st = 'fly'; w.t = 0; w.from.copy(w.pos)
    blip(i + 1)
    burst(toWorld(w.pos.x, w.pos.y, w.pos.z), '#e9a85c', 7, 0.45)
  }

  const land = (i: number) => {
    blip(4)
    const p = LINE_TARGET[i]
    burst(toWorld(p.x, p.y, p.z), C.leaf, 5, 0.35)
    setLanded((ls) => [...ls, i])
    if (ws.current.every((w) => w.st === 'done') && !wonFired.current) {
      wonFired.current = true
      setTimeout(() => {
        setCursorOn(true)
        chime()
        burst(toWorld(-0.7, 0.4, 0.4), '#f2b35e', 14, 0.7)
        setTimeout(() => onWin(), 700)
      }, 380)
    }
  }

  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const t = s.clock.elapsedTime
    ws.current.forEach((w, i) => {
      const g = groups.current[i]
      if (!g || w.st === 'done') return
      if (w.st === 'idle') {
        w.pos.set(SPAWNS[i][0], SPAWNS[i][1] + (REDUCED ? 0 : Math.sin(t * 1.7 + i * 1.9) * 0.035), SPAWNS[i][2])
        g.position.copy(w.pos)
        g.rotation.set(-0.28, 0.55 + (REDUCED ? 0 : Math.sin(t * 0.9 + i) * 0.05), 0)
        pulse(tileMats.current[i], true, t + i * 0.7, dt)
      } else {
        w.t = Math.min(1, w.t + dt / (REDUCED ? 0.45 : 0.72))
        const e = w.t * w.t * (3 - 2 * w.t)
        w.pos.lerpVectors(w.from, LINE_TARGET[i], e)
        w.pos.y += Math.sin(e * Math.PI) * (REDUCED ? 0.15 : 0.5)
        g.position.copy(w.pos)
        g.rotation.set(-0.28 + 0.08 * e, 0.55 * (1 - e), Math.sin(e * Math.PI) * 0.12)
        g.scale.setScalar(1 - e * 0.4)
        const m = tileMats.current[i]
        m.emissiveIntensity += (0.6 - m.emissiveIntensity) * Math.min(1, dt * 8)
        if (w.t >= 1) { w.st = 'done'; g.visible = false; land(i) }
      }
    })
    if (cursor.current) cursor.current.visible = Math.sin(t * 5.5) > -0.35
  })

  return (
    <group ref={root}>
      {WORDS.map((word, i) =>
        landed.includes(i) ? null : (
          <Pop key={i} delay={i * 0.12}>
            <Tappable disabled={ws.current[i].st !== 'idle' || won} onTap={() => tap(i)}>
              <group ref={(g) => { groups.current[i] = g }} name={'l07-word-' + i} position={SPAWNS[i]}>
                <mesh material={hitMat}>
                  <boxGeometry args={[0.6, 0.46, 0.3]} />
                </mesh>
                <RoundedBox args={[0.5, 0.3, 0.12]} radius={0.09} smoothness={3} material={tileMats.current[i]} castShadow />
                <mesh position={[-0.12, -0.16, 0]} rotation={[0, 0, Math.PI]} material={tileMats.current[i]}>
                  <coneGeometry args={[0.06, 0.1, 4]} />
                </mesh>
                <Text position={[0, 0.01, 0.064]} fontSize={0.1} color={C.ink} anchorX="center" anchorY="middle" maxWidth={0.44}>
                  {word}
                </Text>
              </group>
            </Tappable>
          </Pop>
        ),
      )}

      {/* typed lines on the laptop document, in sentence order */}
      <group position={[-0.7, 0.1, 0.16]} rotation={[-0.2, 0, 0]}>
        {landed.map((i) => (
          <Pop key={i} position={[0, lineY(i), 0.021]}>
            <RoundedBox args={[barW(WORDS[i]), 0.034, 0.012]} radius={0.012} material={clay('#e6d5b8')} />
            <Text position={[0, 0, 0.01]} fontSize={0.023} color={C.ink} anchorX="center" anchorY="middle">
              {WORDS[i]}
            </Text>
          </Pop>
        ))}
        {cursorOn && (
          <mesh ref={cursor} position={[barW(WORDS[3]) / 2 + 0.035, lineY(3), 0.022]}>
            <planeGeometry args={[0.016, 0.034]} />
            <meshBasicMaterial color={C.ink} />
          </mesh>
        )}
      </group>
    </group>
  )
}
