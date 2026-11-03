import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { C, clay } from '../../world/kit'
import { Draggable, Pop, Bob, burst, blip, chime, glowMat, pulse, springStep, REDUCED } from '../../world/play'
import type { PlayProps } from '../types'

/* A wooden easel holds a giant clay browser window. Three chunky page pieces float
   beside it; drag each onto its glowing outline. All three in -> the page goes live:
   it warms, a tiny clay cursor taps the button, and little people pop up. */

type Id = 'header' | 'picture' | 'button'
const IDS: Id[] = ['header', 'picture', 'button']

const F = new THREE.Vector3(0.35, 0, 0.55) // easel position (island-local)
const YAW = 0.62 // face the camera
const TILT = -0.08 // lean back like a real easel
const LIFT = 0.25

const M = new THREE.Matrix4().makeTranslation(F.x, F.y, F.z)
  .multiply(new THREE.Matrix4().makeRotationY(YAW))
  .multiply(new THREE.Matrix4().makeRotationX(TILT))
const FACE = new THREE.Vector3(0, 0, 1).transformDirection(M) // frame normal in island space

const SLOT_LOCAL: Record<Id, THREE.Vector3> = {
  header: new THREE.Vector3(0, 1.36, 0.085),
  picture: new THREE.Vector3(-0.42, 0.98, 0.085),
  button: new THREE.Vector3(0.42, 0.85, 0.085),
}
const HOME: Record<Id, [number, number, number]> = {
  header: [1.7, 1.36, 1.8],
  picture: [1.85, 0.98, 0.85],
  button: [0.7, 0.85, 1.95],
}
const SLOT = {} as Record<Id, THREE.Vector3>
const AIM = {} as Record<Id, THREE.Vector2>
IDS.forEach((id) => {
  SLOT[id] = SLOT_LOCAL[id].clone().applyMatrix4(M)
  HOME[id][1] = SLOT[id].y
  // the drag plane floats LIFT above the slot, so a piece that visually covers its
  // ghost actually lands ~0.3 units toward the camera (+x,+z) - aim there
  AIM[id] = new THREE.Vector2(SLOT[id].x + 0.23, SLOT[id].z + 0.32)
})

const btn = SLOT.button
const CUR = {
  start: btn.clone().addScaledVector(FACE, 1.5).add(new THREE.Vector3(0.5, 0.8, 0.4)),
  hover: btn.clone().addScaledVector(FACE, 0.36).add(new THREE.Vector3(0.05, 0.12, 0)),
  dip: btn.clone().addScaledVector(FACE, 0.15).add(new THREE.Vector3(0.02, 0.05, 0)),
  away: btn.clone().addScaledVector(FACE, 0.9).add(new THREE.Vector3(0.6, 0.7, 0.3)),
}
const PEOPLE = [-0.55, -0.18, 0.18, 0.55].map((x, i) => ({
  p: new THREE.Vector3(x, 0.02, 1.02).applyMatrix4(M),
  c: [C.terracotta, C.leafDark, C.water, C.brick][i],
}))
const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3)

export default function Play({ onWin, won }: PlayProps) {
  const [placed, setPlaced] = useState<Record<Id, boolean>>({ header: false, picture: false, button: false })
  const [live, setLive] = useState(false)
  const placedRef = useRef(placed)
  const near = useRef<Record<Id, boolean>>({ header: false, picture: false, button: false })
  const doneRef = useRef(false)
  const root = useRef<THREE.Group>(null)
  const cursor = useRef<THREE.Group>(null)
  const btnBody = useRef<THREE.Group>(null)
  const anim = useRef({ t0: -1, tapped: false, q: 0, qv: 0 })

  const ghostMat = useMemo(() => ({
    header: glowMat('#f2b35e', '#e2c9ae'),
    picture: glowMat('#f2b35e', '#c4d3d2'),
    button: glowMat('#f2b35e', '#ccd8b4'),
  }), [])
  const pageMat = useMemo(() => glowMat('#ffbf78', C.paper), [])
  const pieceMat = useMemo(() => ({
    header: glowMat('#f2b35e', C.terracotta),
    picture: glowMat('#f2b35e', C.water),
    button: glowMat('#f2b35e', C.leaf),
  }), [])

  useEffect(() => {
    if (!live) return
    const a = setTimeout(() => chime(), 950)
    const b = setTimeout(() => { if (!doneRef.current) { doneRef.current = true; onWin() } }, 1150)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [live, onWin])

  const drop = (id: Id) => (l: THREE.Vector3) => {
    const s = SLOT[id], a = AIM[id]
    const onAim = (l.x - a.x) ** 2 + (l.z - a.y) ** 2 < 0.36 ** 2
    const onTrue = (l.x - s.x) ** 2 + (l.z - s.z) ** 2 < 0.3 ** 2
    if (!onAim && !onTrue) return false
    const n = { ...placedRef.current, [id]: true }
    placedRef.current = n; setPlaced(n)
    const count = IDS.filter((k) => n[k]).length
    blip(count + 1)
    if (root.current) burst(root.current.localToWorld(s.clone()), '#f0b860', 16, 0.7)
    if (count === IDS.length) setLive(true)
    return true
  }
  const move = (id: Id) => (l: THREE.Vector3) => {
    const a = AIM[id]
    near.current[id] = (l.x - a.x) ** 2 + (l.z - a.y) ** 2 < 0.55 ** 2
  }

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    IDS.forEach((id, i) => {
      const m = ghostMat[id]
      pulse(m, !placedRef.current[id] && !won, t + i * 0.7, dt)
      if (near.current[id] && !placedRef.current[id]) m.emissiveIntensity = Math.min(1.7, m.emissiveIntensity + dt * 4)
      const pm = pieceMat[id]
      pulse(pm, !placedRef.current[id] && !won, t + i * 1.3, dt)
      pm.emissiveIntensity *= 0.25 // gentler than the slots: a shimmer that says "touch me"
    })
    pulse(pageMat, live || won, t, dt, '#ffd9a3')

    // button squash on the cursor's tap
    const an = anim.current
    an.qv = springStep(an.q, an.qv, 0, dt, 320, 10); an.q += an.qv * Math.min(dt, 1 / 30)
    const q = REDUCED ? 0 : an.q
    if (btnBody.current) btnBody.current.scale.set(1 + q * 0.3, 1 + q * 0.3, 1 - q)

    const cur = cursor.current
    if (cur) {
      if (!live) { cur.visible = false }
      else {
        if (an.t0 < 0) an.t0 = t
        const tl = t - an.t0
        cur.visible = tl < 1.3
        if (tl < 0.25) { cur.scale.setScalar(0.001); cur.position.copy(CUR.start) }
        else if (tl < 0.62) {
          cur.scale.setScalar(Math.min(1, (tl - 0.25) / 0.1) || 0.001)
          cur.position.lerpVectors(CUR.start, CUR.hover, ease((tl - 0.25) / 0.37))
        } else if (tl < 0.8) {
          const k = Math.sin(((tl - 0.62) / 0.18) * Math.PI)
          cur.position.lerpVectors(CUR.hover, CUR.dip, k)
          if (!an.tapped && tl > 0.7) {
            an.tapped = true; an.q = 0.34; an.qv = 0; blip(3)
            if (root.current) burst(root.current.localToWorld(btn.clone()), '#f3d58c', 14, 0.5)
          }
        } else {
          cur.scale.setScalar(Math.max(0.001, 1 - (tl - 0.85) / 0.35))
          cur.position.lerpVectors(CUR.hover, CUR.away, ease((tl - 0.85) / 0.4))
        }
      }
    }
  })

  return (
    <group ref={root}>
      {/* the easel + browser window */}
      <Pop position={F.toArray() as [number, number, number]}>
        <group rotation={[0, YAW, 0]}>
          <group rotation={[TILT, 0, 0]}>
            {[-0.63, 0.63].map((x) => (
              <RoundedBox key={x} args={[0.1, 1.52, 0.1]} radius={0.04} position={[x * 1.06, 0.74, -0.03]} rotation={[0, 0, -x * 0.1]} material={clay(C.wood)} castShadow />
            ))}
            <RoundedBox args={[1.2, 0.08, 0.08]} radius={0.03} position={[0, 0.34, -0.05]} material={clay(C.woodLight)} />
            <RoundedBox args={[0.1, 1.4, 0.1]} radius={0.04} position={[0, 0.6, -0.38]} rotation={[-0.3, 0, 0]} material={clay(C.wood)} castShadow />
            <RoundedBox args={[1.36, 0.08, 0.18]} radius={0.03} position={[0, 0.49, 0.06]} material={clay(C.woodLight)} castShadow />
            <RoundedBox args={[1.52, 1.2, 0.09]} radius={0.07} position={[0, 1.13, 0]} material={clay(C.cream)} castShadow receiveShadow />
            <RoundedBox args={[1.5, 0.22, 0.1]} radius={0.06} position={[0, 1.62, 0.005]} material={clay(C.sand)} castShadow />
            {[-0.63, -0.51, -0.39].map((x, i) => (
              <mesh key={i} position={[x, 1.63, 0.06]} material={clay([C.brick, '#e0b26a', C.leaf][i])}><sphereGeometry args={[0.034, 10, 8]} /></mesh>
            ))}
            <RoundedBox args={[0.72, 0.09, 0.02]} radius={0.045} position={[0.27, 1.63, 0.055]} material={clay(C.paper)} />
            <RoundedBox args={[1.34, 0.9, 0.02]} radius={0.03} position={[0, 1.06, 0.052]} material={pageMat} receiveShadow />

            {/* ghost outlines */}
            <group name="L03-ghost-header" position={[SLOT_LOCAL.header.x, SLOT_LOCAL.header.y, 0.066]}>
              <RoundedBox args={[1.06, 0.22, 0.015]} radius={0.04} material={ghostMat.header} />
            </group>
            <group name="L03-ghost-picture" position={[SLOT_LOCAL.picture.x, SLOT_LOCAL.picture.y, 0.066]}>
              <RoundedBox args={[0.56, 0.52, 0.015]} radius={0.05} material={ghostMat.picture} />
            </group>
            <group name="L03-ghost-button" position={[SLOT_LOCAL.button.x, SLOT_LOCAL.button.y, 0.066]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={ghostMat.button}><cylinderGeometry args={[0.25, 0.25, 0.015, 24]} /></mesh>
            </group>
          </group>
        </group>
      </Pop>

      {/* invisible QA markers: the on-screen spot where a drop lands inside the slot */}
      {IDS.map((id) => <group key={id} name={`L03-slot-${id}`} position={[AIM[id].x, SLOT[id].y + LIFT, AIM[id].y]} />)}

      {/* the three page pieces */}
      <Draggable name="L03-piece-header" home={HOME.header} to={placed.header ? [SLOT.header.x, SLOT.header.y, SLOT.header.z] : null}
        y={SLOT.header.y} lift={LIFT} disabled={placed.header || live || won} onDrop={drop('header')} onMove={move('header')}>
        <Pop delay={0.15}><Bob amp={placed.header ? 0 : 0.045} phase={0}>
          <group rotation={[0, YAW, 0]}><group rotation={[TILT, 0, 0]}>
            <RoundedBox args={[1.06, 0.22, 0.08]} radius={0.05} material={pieceMat.header} castShadow />
            <RoundedBox args={[0.6, 0.05, 0.02]} radius={0.02} position={[-0.08, 0.04, 0.045]} material={clay(C.paper)} />
            <RoundedBox args={[0.38, 0.04, 0.02]} radius={0.02} position={[-0.16, -0.05, 0.045]} material={clay('#f0dfc8')} />
          </group></group>
        </Bob></Pop>
      </Draggable>

      <Draggable name="L03-piece-picture" home={HOME.picture} to={placed.picture ? [SLOT.picture.x, SLOT.picture.y, SLOT.picture.z] : null}
        y={SLOT.picture.y} lift={LIFT} disabled={placed.picture || live || won} onDrop={drop('picture')} onMove={move('picture')}>
        <Pop delay={0.3}><Bob amp={placed.picture ? 0 : 0.045} phase={1.6}>
          <group rotation={[0, YAW, 0]}><group rotation={[TILT, 0, 0]}>
            <RoundedBox args={[0.58, 0.54, 0.08]} radius={0.06} material={pieceMat.picture} castShadow />
            <mesh position={[-0.08, -0.13, 0.04]} scale={[1.5, 0.8, 0.5]} material={clay(C.moss)} castShadow><sphereGeometry args={[0.17, 14, 10]} /></mesh>
            <mesh position={[0.17, -0.17, 0.04]} scale={[1.2, 0.6, 0.5]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.13, 12, 9]} /></mesh>
            <mesh position={[0.15, 0.14, 0.05]} material={clay('#eec978')}><sphereGeometry args={[0.075, 12, 10]} /></mesh>
          </group></group>
        </Bob></Pop>
      </Draggable>

      <Draggable name="L03-piece-button" home={HOME.button} to={placed.button ? [SLOT.button.x, SLOT.button.y, SLOT.button.z] : null}
        y={SLOT.button.y} lift={LIFT} disabled={placed.button || live || won} onDrop={drop('button')} onMove={move('button')}>
        <Pop delay={0.45}><Bob amp={placed.button ? 0 : 0.045} phase={3.1}>
          <group rotation={[0, YAW, 0]}><group rotation={[TILT, 0, 0]}>
            <group ref={btnBody}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={clay(C.leafDark)}><cylinderGeometry args={[0.25, 0.25, 0.045, 26]} /></mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]} material={pieceMat.button} castShadow><cylinderGeometry args={[0.2, 0.2, 0.06, 26]} /></mesh>
              <mesh position={[0, 0, 0.055]} material={clay(C.paper)}><sphereGeometry args={[0.05, 12, 10]} /></mesh>
            </group>
          </group></group>
        </Bob></Pop>
      </Draggable>

      {/* tiny clay cursor that taps the button once the page is live */}
      <group ref={cursor} visible={false} position={CUR.start.toArray() as [number, number, number]}>
        <group rotation={[TILT, YAW, 0]}>
          <group rotation={[0, 0, 2.5]}>
            <mesh position={[0, -0.13, 0]} scale={[1.5, 1, 0.5]} material={clay(C.paper)} castShadow><coneGeometry args={[0.08, 0.3, 4]} /></mesh>
          </group>
          <mesh position={[0.03, 0.07, 0.01]} material={clay(C.ink)}><sphereGeometry args={[0.022, 8, 6]} /></mesh>
        </group>
      </group>

      {/* little people gathering once the page is live */}
      {live && PEOPLE.map((pe, i) => (
        <Pop key={i} delay={0.7 + i * 0.13} position={[pe.p.x, pe.p.y, pe.p.z]}>
          <Bob amp={0.03} speed={2.6} phase={i * 1.9}>
            <mesh position={[0, 0.13, 0]} material={clay(pe.c)} castShadow><capsuleGeometry args={[0.06, 0.1, 4, 10]} /></mesh>
            <mesh position={[0, 0.27, 0]} material={clay(C.cream)} castShadow><sphereGeometry args={[0.062, 12, 10]} /></mesh>
          </Bob>
        </Pop>
      ))}
    </group>
  )
}
