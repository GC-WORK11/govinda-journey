import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Island, C, clay } from '../../world/kit'
import { player, useBlocker, useInteractable, useWalkable } from '../core'
import Player from './Player'
import { Heli, heli } from './Heli'
import Controls from './Controls'
import { carryAnchor, carryQuat } from './anchor'

/**
 * PLAYER's own test scene while World5 is being built — reachable at /?v5&sandbox.
 * One island you can walk off (respawn), a step (step-up), a wall (blocker slide),
 * a gap to a second island (jump), a crate that demonstrates interactables + carry.
 */

const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
const HORIZON = '#efe2cb'
const CRATE_HOME = new THREE.Vector3(1.9, 0.16, 1.6)

function Walkable({ children, ...p }: { children: React.ReactNode } & Record<string, unknown>) {
  const ref = useRef<THREE.Group>(null)
  useWalkable(ref)
  return <group ref={ref} {...p}>{children}</group>
}
function Blocker({ children, ...p }: { children: React.ReactNode } & Record<string, unknown>) {
  const ref = useRef<THREE.Group>(null)
  useBlocker(ref)
  return <group ref={ref} {...p}>{children}</group>
}

/** Demo crate: registers an interactable; when carried it follows the backpack anchor. */
function Crate() {
  const ref = useRef<THREE.Group>(null!)
  const home = useMemo(() => CRATE_HOME.clone(), [])
  const q0 = useMemo(() => new THREE.Quaternion(), [])
  useInteractable(useMemo(() => ({
    id: 'crate',
    at: () => ref.current ? ref.current.getWorldPosition(new THREE.Vector3()) : home,
    radius: 1.7,
    get label() { return player.carrying === 'crate' ? 'Set down' : 'Pick up' },
    use: () => { player.carrying = player.carrying === 'crate' ? null : 'crate' },
  }), [home]))
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return
    const k = 1 - Math.exp(-12 * dt)
    if (player.carrying === 'crate') {
      g.position.lerp(carryAnchor, k)
      g.quaternion.slerp(carryQuat, k)
    } else {
      g.position.lerp(home, k)
      g.quaternion.slerp(q0, k)
    }
  })
  return (
    <group ref={ref} position={home.toArray()}>
      <RoundedBox args={[0.34, 0.3, 0.34]} radius={0.05} material={clay(C.wood)} castShadow />
      <RoundedBox args={[0.36, 0.1, 0.36]} radius={0.03} position={[0, 0.12, 0]} material={clay(C.woodLight)} castShadow />
    </group>
  )
}

/** Second interactable: a lamp post that is also a wall blocker. */
function Lamp() {
  const ref = useRef<THREE.Group>(null)
  useBlocker(ref)
  const glow = useRef<THREE.PointLight>(null)
  useInteractable(useMemo(() => ({
    id: 'lamp', at: () => new THREE.Vector3(-2.6, 0.6, -1.4), radius: 1.6,
    label: 'Lamp', use: () => { if (glow.current) glow.current.intensity = glow.current.intensity > 0.1 ? 0 : 3.2 },
  }), []))
  return (
    <group ref={ref} position={[-2.6, 0, -1.4]}>
      <mesh position={[0, 0.7, 0]} material={clay(C.ink)} castShadow><cylinderGeometry args={[0.045, 0.06, 1.4, 8]} /></mesh>
      <mesh position={[0, 1.44, 0]} material={clay('#e9b872')}><sphereGeometry args={[0.11, 10, 8]} /></mesh>
      <pointLight ref={glow} position={[0, 1.5, 0]} intensity={0} distance={4} decay={1.8} color="#ffcf8f" />
    </group>
  )
}

/** V6 heli testbed: a clay toy craft on a marked pad — same contract ISL-E gets. */
function DemoHeli() {
  const rotor = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += dt * (heli.flying ? 16 : 2.2) })
  return (
    <group>
      {/* pad marker */}
      <mesh position={[4.3, 0.016, 2.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.95, 28]} /><meshStandardMaterial color={C.sand} roughness={0.9} />
      </mesh>
      <mesh position={[4.3, 0.017, 2.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.95, 28]} /><meshStandardMaterial color={C.terracotta} roughness={0.9} />
      </mesh>
      <Heli id="sandbox-heli" pad={[4.3, 0.24, 2.9]} exit={[4.3, 0.02, 4.4]} seatY={0.5}>
        {/* skids */}
        {[-0.28, 0.28].map((x) => (
          <mesh key={x} position={[x, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.ink)} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.25, 7]} />
          </mesh>
        ))}
        {/* body + tail + fin */}
        <RoundedBox args={[0.68, 0.46, 1.3]} radius={0.12} position={[0, 0, 0]} material={clay(C.terracotta)} castShadow />
        <RoundedBox args={[0.2, 0.16, 0.9]} radius={0.05} position={[0, 0.06, -1.0]} material={clay(C.terracotta)} castShadow />
        <mesh position={[0, 0.22, -1.38]} material={clay(C.cream)} castShadow><boxGeometry args={[0.05, 0.34, 0.2]} /></mesh>
        {/* canopy */}
        <RoundedBox args={[0.5, 0.28, 0.55]} radius={0.1} position={[0, 0.28, 0.28]} material={clay('#7d8fa8')} castShadow />
        <group ref={rotor} position={[0, 0.36, 0]}>
          <mesh material={clay(C.ink)} castShadow><boxGeometry args={[2.4, 0.03, 0.12]} /></mesh>
          <mesh material={clay(C.ink)} castShadow><boxGeometry args={[0.12, 0.03, 2.4]} /></mesh>
          <mesh material={clay(C.ink)}><cylinderGeometry args={[0.05, 0.05, 0.14, 8]} /></mesh>
        </group>
      </Heli>
    </group>
  )
}

function Scene() {
  const isl1 = useRef<THREE.Group>(null)
  const isl2 = useRef<THREE.Group>(null)
  useWalkable(isl1); useWalkable(isl2)
  return (
    <>
      <hemisphereLight args={['#eaf2f0', '#a98e6d', 0.85]} />
      <directionalLight position={[7, 12, 5]} intensity={2.1} castShadow={!LITE}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-far={40} shadow-bias={-0.0004} />
      <color attach="background" args={[HORIZON]} />
      <fog attach="fog" args={[HORIZON, 30, 70]} />

      <group ref={isl1}><Island radius={6.5} ground={C.leaf} seed={4} /></group>
      <group ref={isl2} position={[0.8, 0.5, -11.8]}><Island radius={4} ground={C.moss} seed={9} /></group>

      {/* low step (step-up), floating platform (jump onto), wall (slide) */}
      <Walkable position={[2.6, 0, -2.2]}>
        <RoundedBox args={[1.3, 0.42, 1.3]} radius={0.07} position={[0, 0.21, 0]} material={clay(C.stone)} castShadow receiveShadow />
      </Walkable>
      <Walkable position={[-1.4, 1.05, -5.6]}>
        <RoundedBox args={[1.5, 0.3, 1.5]} radius={0.09} position={[0, 0.15, 0]} material={clay(C.stoneLight)} castShadow receiveShadow />
      </Walkable>
      <Blocker position={[-2.8, 0, -3.4]}>
        <RoundedBox args={[0.5, 1.7, 3.2]} radius={0.1} position={[0, 0.85, 0]} material={clay(C.terracotta)} castShadow receiveShadow />
      </Blocker>
      <Blocker position={[3.6, 0, -5.4]}>
        <RoundedBox args={[2.6, 0.9, 0.5]} radius={0.1} position={[0, 0.45, 0]} material={clay(C.stone)} castShadow receiveShadow />
      </Blocker>

      <Crate />
      <Lamp />
      <DemoHeli />
      {/* 1 m reference column to eyeball character scale */}
      <mesh position={[0.9, 0.5, 3.4]} material={clay(C.terracotta)}><boxGeometry args={[0.12, 1, 0.12]} /></mesh>
      <Player />
    </>
  )
}

function DebugLine() {
  const [t, setT] = useState('')
  useEffect(() => {
    const id = setInterval(() => setT(JSON.stringify((window as any).__pldbg || {})), 300)
    return () => clearInterval(id)
  }, [])
  return <div style={{ position: 'fixed', right: 10, bottom: 10, font: '10px monospace', color: 'rgba(43,32,22,.7)' }}>{t}</div>
}

export default function Sandbox() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: HORIZON }}>
      <Canvas shadows={LITE ? false : 'soft'} dpr={LITE ? 1 : Math.min(1.5, window.devicePixelRatio || 1)}
        camera={{ fov: 38, near: 0.3, far: 140, position: [0, 4, 9] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
        <Scene />
      </Canvas>
      <Controls />
      <div className="gjv5-sb-hint" style={{ position: 'fixed', left: 14, bottom: 12, font: '11px Inter, system-ui', color: 'rgba(43,32,22,.6)', letterSpacing: '.03em' }}>
        WASD move · Shift run · Space jump · drag to orbit · E use
      </div>
      <DebugLine />
    </div>
  )
}
