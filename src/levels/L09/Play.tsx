import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { PlayProps } from '../types'
import { Tappable, Pop, burst, blip, chime, glowMat, pulse, REDUCED } from '../../world/play'
import { C, clay } from '../../world/kit'

/** Faces the camera (it looks from +x,+y,+z). */
const YAW = 0.55
const BOARD_POS: [number, number, number] = [0.45, 0, 0.72]
const ROW_C = new THREE.Vector3(0.5, 0.62, 1.8)
const ROW_DIR = new THREE.Vector3(0.81, 0, -0.58) // screen-right for the play camera
const ANSWERS = [6, 7, 8]
const RIGHT = 1
const FLY_S = 0.6
const CHALK = '#f6f0e2'
const BOARD_FACE = '#26382c'

const PEBBLE_POS: [number, number, number][] = ANSWERS.map((_, i) => {
  const v = ROW_C.clone().addScaledVector(ROW_DIR, (i - 1) * 0.68)
  return [v.x, v.y, v.z]
})

/** L09 Chalk: tap the pebble with the right answer; it flies onto the board and the school gate opens. */
export default function Play({ onWin, won }: PlayProps) {
  const [picked, setPicked] = useState(false)
  const g = useRef<THREE.Group>(null)
  const slot = useRef<THREE.Group>(null)
  const posG = useRef<(THREE.Group | null)[]>([])
  const wobG = useRef<(THREE.Group | null)[]>([])
  const tick1 = useRef<THREE.Group>(null)
  const tick2 = useRef<THREE.Group>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const tt = useRef(0)
  const st = useRef({
    phase: 'idle' as 'idle' | 'fly' | 'done',
    wrongAt: [-9, -9, -9],
    flyT0: -1,
    landT: -1,
    flyFrom: new THREE.Vector3(),
    flyTo: new THREE.Vector3(),
  })
  const mats = useRef(ANSWERS.map(() => glowMat('#ffc98f', '#f1e5cf')))
  const boardMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: BOARD_FACE, roughness: 0.9, emissive: new THREE.Color('#33503a'), emissiveIntensity: 0.3 }),
    []
  )
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: CHALK, transparent: true, opacity: 0.55 }), [])
  const chalkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: CHALK }), [])

  const tap = (i: number) => {
    const k = st.current
    if (won || k.phase !== 'idle') return
    if (i === RIGHT) {
      k.phase = 'fly'
      setPicked(true)
      blip(1)
    } else {
      k.wrongAt[i] = tt.current
      blip(0)
      const p = posG.current[i]
      if (p && g.current) {
        const w = new THREE.Vector3()
        p.getWorldPosition(w)
        burst(w, '#d9d0bd', 9, 0.45)
      }
    }
  }

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    tt.current = t
    const k = st.current
    for (let i = 0; i < ANSWERS.length; i++) {
      const m = mats.current[i]
      if (i === RIGHT && k.phase !== 'idle') {
        const want = k.phase === 'done' ? 0.55 : 1.2
        m.emissiveIntensity += (want - m.emissiveIntensity) * Math.min(1, dt * 6)
      } else {
        pulse(m, k.phase === 'idle' && !won, t + i * 1.3, dt)
      }
      const pg = posG.current[i]
      if (!pg) continue
      const base = PEBBLE_POS[i]
      if (i === RIGHT && k.phase === 'fly') {
        if (k.flyT0 < 0) {
          k.flyT0 = t
          k.flyFrom.copy(pg.position)
          if (slot.current && g.current) {
            slot.current.getWorldPosition(k.flyTo)
            g.current.worldToLocal(k.flyTo)
          } else {
            k.flyTo.set(1, 1.1, 0.6)
          }
        }
        const ft = Math.min(1, (t - k.flyT0) / FLY_S)
        const e = ft < 0.5 ? 4 * ft * ft * ft : 1 - Math.pow(-2 * ft + 2, 3) / 2
        pg.position.lerpVectors(k.flyFrom, k.flyTo, e)
        pg.position.y += Math.sin(ft * Math.PI) * (REDUCED ? 0.1 : 0.45)
        if (ft >= 1 && k.landT < 0) {
          k.landT = t
          k.phase = 'done'
          blip(3)
          const w = new THREE.Vector3()
          pg.getWorldPosition(w)
          burst(w, CHALK, 14, 0.5)
          setTimeout(() => {
            if (g.current) {
              const b = new THREE.Vector3(0.4, 1.2, 1.1)
              burst(g.current.localToWorld(b), '#f3d58c', 26, 0.9)
            }
            chime()
            onWin()
          }, 850)
        }
      } else if (i === RIGHT && k.phase === 'done') {
        pg.position.copy(k.flyTo)
      } else {
        const amp = k.phase === 'idle' && !won ? 0.055 : 0.015
        pg.position.set(base[0], base[1] + (REDUCED ? 0 : Math.sin(t * 1.7 + i * 2.1) * amp), base[2])
      }
      const wg = wobG.current[i]
      if (wg) {
        const w = k.wrongAt[i]
        wg.rotation.z = w > 0 ? Math.sin((t - w) * 26) * 0.42 * Math.exp(-(t - w) * 4.5) : 0
        if (i === RIGHT && k.landT > 0) {
          const lt = t - k.landT
          const j = REDUCED ? 0 : Math.sin(lt * 16) * Math.exp(-lt * 5) * 0.22
          wg.scale.set(1 + j, 1 - j, 1 + j)
        }
      }
    }
    if (tick1.current && tick2.current) {
      const lt = k.landT > 0 ? t - k.landT : -1
      tick1.current.visible = lt > 0
      tick2.current.visible = lt > 0.14
      tick1.current.scale.y = Math.max(0.001, Math.min(1, lt * 7))
      tick2.current.scale.y = Math.max(0.001, Math.min(1, (lt - 0.14) * 7))
    }
    if (lamp.current) {
      const want = won ? 2.0 : 1.1
      lamp.current.intensity += (want - lamp.current.intensity) * Math.min(1, dt * 4)
    }
    boardMat.emissiveIntensity += ((won ? 0.6 : 0.3) - boardMat.emissiveIntensity) * Math.min(1, dt * 4)
  })

  return (
    <group ref={g} name="L09-play">
      {/* Standing chalkboard in the open front space, facing the camera */}
      <Pop delay={0.1}>
        <group name="L09-board" position={BOARD_POS} rotation={[0, YAW, 0]}>
          {/* Legs + feet + crossbar */}
          {[-0.58, 0.58].map((x) => (
            <group key={x}>
              <RoundedBox args={[0.1, 0.62, 0.1]} radius={0.03} position={[x, 0.31, 0]} material={clay(C.wood)} castShadow />
              <RoundedBox args={[0.2, 0.06, 0.18]} radius={0.025} position={[x, 0.03, 0]} material={clay(C.wood)} castShadow />
            </group>
          ))}
          <RoundedBox args={[1.05, 0.07, 0.07]} radius={0.03} position={[0, 0.3, 0]} material={clay(C.woodLight)} castShadow />
          {/* Frame + board face */}
          <RoundedBox args={[1.62, 1.16, 0.09]} radius={0.05} position={[0, 1.07, 0]} material={clay(C.wood)} castShadow />
          <mesh position={[0, 1.07, 0.047]} material={boardMat}>
            <planeGeometry args={[1.46, 1.0]} />
          </mesh>
          {/* Chalk tray with two chalk sticks */}
          <RoundedBox args={[1.1, 0.05, 0.13]} radius={0.02} position={[0, 0.47, 0.09]} material={clay(C.woodLight)} castShadow />
          {[-0.28, -0.13].map((x) => (
            <mesh key={x} position={[x, 0.51, 0.09]} rotation={[0, 0, Math.PI / 2]} material={clay(CHALK)}>
              <capsuleGeometry args={[0.018, 0.12, 4, 8]} />
            </mesh>
          ))}
          {/* The question */}
          <Text position={[-0.2, 1.13, 0.06]} fontSize={0.27} color={CHALK} anchorX="center" anchorY="middle">
            {'3 + 4 ='}
          </Text>
          {/* Empty answer slot: faint chalk ring + ? until solved */}
          <mesh position={[0.58, 1.1, 0.06]} material={ringMat}>
            <torusGeometry args={[0.19, 0.018, 8, 40]} />
          </mesh>
          {!picked && (
            <Text position={[0.58, 1.1, 0.07]} fontSize={0.2} color={CHALK} anchorX="center" anchorY="middle">
              {'?'}
            </Text>
          )}
          <group ref={slot} position={[0.58, 1.1, 0.2]} />
          {/* Chalk tick, drawn after the right answer lands */}
          <group position={[-0.2, 0.68, 0.06]}>
            <group ref={tick1} position={[-0.08, 0.1, 0]} rotation={[0, 0, -1.0]} scale={[1, 0.001, 1]}>
              <mesh position={[0, 0.08, 0]} material={chalkMat}>
                <boxGeometry args={[0.05, 0.16, 0.012]} />
              </mesh>
            </group>
            <group ref={tick2} position={[-0.02, 0, 0]} rotation={[0, 0, 0.45]} scale={[1, 0.001, 1]}>
              <mesh position={[0, 0.17, 0]} material={chalkMat}>
                <boxGeometry args={[0.05, 0.34, 0.012]} />
              </mesh>
            </group>
          </group>
          {/* Little lantern on the frame so the board reads at night */}
          <mesh position={[0.66, 1.7, 0]} material={clay(C.wood)}>
            <cylinderGeometry args={[0.05, 0.06, 0.05, 8]} />
          </mesh>
          <mesh position={[0.66, 1.78, 0]} material={chalkMat}>
            <sphereGeometry args={[0.055, 12, 10]} />
          </mesh>
          <mesh position={[0.66, 1.85, 0]} material={clay(C.terracotta)}>
            <coneGeometry args={[0.07, 0.07, 8]} />
          </mesh>
          <pointLight ref={lamp} position={[0.5, 1.85, 0.6]} color="#ffc287" intensity={1.1} distance={4.5} decay={2} />
          {won && (
            <Sparkles position={[0, 1.15, 0.45]} count={40} scale={[1.8, 1.3, 0.9]} size={3} speed={0.4} color="#ffd9a0" opacity={0.7} />
          )}
        </group>
      </Pop>

      {/* Three chunky chalk pebbles floating in a row */}
      {ANSWERS.map((a, i) => (
        <Pop key={a} delay={0.3 + i * 0.12}>
          <group
            ref={(r) => {
              posG.current[i] = r
            }}
            name={`L09-ans-${a}`}
            position={PEBBLE_POS[i]}
          >
            <Tappable disabled={won || picked} onTap={() => tap(i)}>
              <group
                ref={(r) => {
                  wobG.current[i] = r
                }}
                rotation={[0, YAW, 0]}
              >
                <mesh material={mats.current[i]} castShadow scale={[1, 0.88, 0.68]}>
                  <sphereGeometry args={[0.3, 24, 18]} />
                </mesh>
                <Text position={[0, 0.01, 0.215]} fontSize={0.3} color="#4a3d31" anchorX="center" anchorY="middle">
                  {String(a)}
                </Text>
              </group>
            </Tappable>
          </group>
        </Pop>
      ))}
    </group>
  )
}
