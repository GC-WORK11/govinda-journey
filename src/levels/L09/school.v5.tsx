/**
 * The little schoolhouse of L09 (finale). Local origin: centre of its front wall, ground y=0,
 * facing +z. Four windows warm one by one; the door swings open at the end.
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { C, M } from '../L08/v5kit.v5'
import { useBlocker } from '../../v5/core'
import { NoMerge } from '../../v5/world/AutoMerge'

const WALL = '#efe4d2'
const ROOF = '#c1704f'
const WARM = '#f2d09a'

/** One window: wooden frame + a pane that warms when `on`. */
function Window({ on, position, round }: { on: boolean; position: [number, number, number]; round?: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    if (mat.current) {
      const target = on ? 1.25 : 0.03
      mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * Math.min(1, dt * 1.7)
      const c = on ? WARM : '#333c46'
      mat.current.color.lerp(new THREE.Color(c), Math.min(1, dt * 1.7))
    }
  })
  return (
    <group position={position}>
      {round ? (
        <mesh material={M(C.wood)} castShadow><torusGeometry args={[0.2, 0.045, 8, 20]} /></mesh>
      ) : (
        <>
          <RoundedBox args={[0.56, 0.62, 0.07]} radius={0.03} material={M(C.wood)} castShadow />
          {/* mullions */}
          <mesh position={[0, 0, 0.045]} material={M(C.wood)}><boxGeometry args={[0.04, 0.54, 0.02]} /></mesh>
          <mesh position={[0, 0, 0.045]} material={M(C.wood)}><boxGeometry args={[0.48, 0.04, 0.02]} /></mesh>
        </>
      )}
      <mesh position={[0, 0, 0.041]}>
        {round ? <circleGeometry args={[0.2, 20]} /> : <planeGeometry args={[0.47, 0.53]} />}
        <meshStandardMaterial ref={mat} color="#333c46" emissive={WARM} emissiveIntensity={0.03} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** The brass bell in the tower. `ring` increments to trigger one damped swing. */
function Bell({ ring }: { ring: number }) {
  const g = useRef<THREE.Group>(null)
  const amp = useRef(0)
  const last = useRef(ring)
  useFrame((s, dt) => {
    if (ring !== last.current) { last.current = ring; amp.current = 0.5 }
    amp.current = Math.max(0, amp.current - dt * 0.16)
    if (g.current) g.current.rotation.z = Math.sin(s.clock.elapsedTime * 8.5) * amp.current
  })
  return (
    <group ref={g} position={[0, 0, 0]}>
      <mesh position={[0, -0.1, 0]} material={M('#c9a34e')} castShadow>
        <sphereGeometry args={[0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      </mesh>
      <mesh position={[0, -0.14, 0]} material={M('#b08a3c')}><sphereGeometry args={[0.05, 8, 8]} /></mesh>
    </group>
  )
}

export function Schoolhouse({ wins, doorOpen, ring }: { wins: boolean[]; doorOpen: boolean; ring: number }) {
  const body = useRef<THREE.Mesh>(null)
  const hinge = useRef<THREE.Group>(null)
  const spill = useRef<THREE.PointLight>(null)
  const inside = useRef<THREE.PointLight>(null)
  const doorway = useRef<THREE.MeshStandardMaterial>(null)
  useBlocker(body)

  const litCount = wins.filter(Boolean).length
  useFrame((_, dt) => {
    if (hinge.current) {
      const target = doorOpen ? -1.85 : 0
      hinge.current.rotation.y += (target - hinge.current.rotation.y) * Math.min(1, dt * 2.1)
    }
    if (spill.current) spill.current.intensity += ((doorOpen ? 2.4 : 0) - spill.current.intensity) * Math.min(1, dt * 2.4)
    if (inside.current) inside.current.intensity += (litCount * 0.4 - inside.current.intensity) * Math.min(1, dt * 2)
    if (doorway.current) doorway.current.emissiveIntensity += ((doorOpen ? 1.4 : 0.25 + litCount * 0.16) - doorway.current.emissiveIntensity) * Math.min(1, dt * 2.2)
  })

  const gable = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-1.8, 0); s.lineTo(1.8, 0); s.lineTo(0, 0.78); s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false })
  }, [])

  return (
    <group>
      {/* main body */}
      <RoundedBox ref={body} args={[3.5, 1.9, 2.0]} radius={0.07} position={[0, 0.95, -1.0]} material={M(WALL)} castShadow receiveShadow />
      {/* pitched roof */}
      <group position={[0, 1.9, -1.0]}>
        <mesh position={[0, 0.3, 0.52]} rotation={[0.62, 0, 0]} material={M(ROOF)} castShadow>
          <boxGeometry args={[3.85, 0.12, 1.35]} />
        </mesh>
        <mesh position={[0, 0.3, -0.52]} rotation={[-0.62, 0, 0]} material={M(ROOF)} castShadow>
          <boxGeometry args={[3.85, 0.12, 1.35]} />
        </mesh>
        <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={M('#a85f42')} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 3.9, 8]} />
        </mesh>
        {/* gable ends */}
        <mesh geometry={gable} position={[-1.8, 0, 0.95]} rotation={[0, -Math.PI / 2, 0]} material={M(WALL)} castShadow />
        <mesh geometry={gable} position={[1.8, 0, 0.95]} rotation={[0, -Math.PI / 2, 0]} material={M(WALL)} castShadow />
      </group>

      {/* bell tower, left front corner */}
      <group position={[-1.25, 1.9, -0.35]}>
        <RoundedBox args={[0.66, 0.85, 0.66]} radius={0.05} position={[0, 0.42, 0]} material={M(WALL)} castShadow />
        {/* belfry opening */}
        <mesh position={[0, 0.45, 0.335]}>
          <planeGeometry args={[0.4, 0.5]} />
          <meshStandardMaterial color="#3a3230" emissive={WARM} emissiveIntensity={wins[2] ? 0.9 : 0.04} />
        </mesh>
        <group position={[0, 0.62, 0.32]}>
          <NoMerge><Bell ring={ring} /></NoMerge>
        </group>
        <mesh position={[0, 0.98, 0]} rotation={[0, Math.PI / 4, 0]} material={M(ROOF)} castShadow>
          <coneGeometry args={[0.52, 0.4, 4]} />
        </mesh>
      </group>

      {/* doorway + swinging door */}
      <group position={[0, 0, 0.02]}>
        <RoundedBox args={[0.72, 1.05, 0.1]} radius={0.05} position={[0, 0.52, 0]} material={M(C.wood)} />
        <mesh position={[0, 0.52, 0.056]}>
          <planeGeometry args={[0.56, 0.9]} />
          <meshStandardMaterial ref={doorway} color="#3a3230" emissive={WARM} emissiveIntensity={0.25} />
        </mesh>
        <NoMerge><group ref={hinge} position={[-0.26, 0, 0.09]}>
          <RoundedBox args={[0.52, 0.88, 0.05]} radius={0.04} position={[0.26, 0.48, 0]} material={M('#8a6748')} castShadow />
          <mesh position={[0.44, 0.48, 0.03]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#c9a34e" metalness={0.5} roughness={0.4} /></mesh>
        </group></NoMerge>
      </group>

      {/* windows: front-left = climb, front-right = build, tower above = power, transom = sign */}
      <Window on={wins[0]} position={[-0.95, 1.12, 0.02]} />
      <Window on={wins[1]} position={[0.95, 1.12, 0.02]} />
      <Window on={wins[3]} position={[0, 1.62, 0.02]} round />
      {/* one more small window on the tower's side, lit with the bell */}
      <Window on={wins[2]} position={[-1.72, 1.15, -0.4]} />

      {/* interior warmth seeping out as the school wakes + spill when the door opens */}
      <pointLight ref={inside} position={[0, 1.4, -0.4]} color={WARM} intensity={0} distance={4.5} decay={2} />
      <pointLight ref={spill} position={[0, 0.7, 0.7]} color={WARM} intensity={0} distance={3.5} decay={2} />
    </group>
  )
}
