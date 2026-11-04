import { Suspense, useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Model, type Anim } from './Player'
import { C, clay } from '../../world/kit'

/**
 * Character close-up probe (dev only): /char-probe.html
 *   ?anim=walk|idle|jump|cheer|sit|interact|use   (default idle)
 *   ?yaw=<deg>      character yaw (0 = faces +Z toward default cam)
 *   ?az=<deg>       camera azimuth deg around the char (default 0 = +Z front)
 *   ?el=<deg>       camera elevation (default 8)
 *   ?dist=<m>       camera distance (default 2.2)
 *   ?freeze=<0..1>  pause clip at fraction (deterministic mid-stride etc.)
 *   ?ts=<n>         walk clip timeScale
 *   ?night=1        L09 night lighting instead of L01 day
 *   ?backpack=0     hide the backpack
 *   ?skin=          empty -> keep embedded rogue_texture (A/B the retint)
 *   ?orig=1         same as skin=
 */
const q = new URLSearchParams(location.search)
const anim = (q.get('anim') || 'idle') as Anim
const yawD = (+q.get('yaw')! || 0) * Math.PI / 180
const az = (+q.get('az')! || 0) * Math.PI / 180
const el = (+q.get('el')! || 8) * Math.PI / 180
const dist = +q.get('dist')! || 2.2
const freeze = q.has('freeze') ? +q.get('freeze')! : undefined
const ts = +q.get('ts')! || 1
const night = q.has('night')
const backpack = q.get('backpack') !== '0'
const skinURL = q.has('orig') || q.get('skin') === '' ? '' : (q.get('skin') || './models/student-skin.png')

const tsRef = { current: ts }
const socketRef = { current: null as THREE.Group | null }

function Lights() {
  if (night) return (
    <>
      <hemisphereLight args={['#8a84b4', '#423c58', 0.86]} />
      <directionalLight position={[-5, 13, -7]} intensity={0.75} color="#d4d7f4" castShadow />
      <directionalLight position={[-7, 5, -6]} intensity={0.42} color="#6c6a98" />
      {/* matches World5's CharLight: warm lantern toward the camera side */}
      <pointLight position={[0.8, 2.05, 0.8]} color="#ffd9a8" intensity={4.0} distance={6.5} decay={2} />
      <color attach="background" args={['#3b3654']} />
    </>
  )
  return (
    <>
      <hemisphereLight args={['#fff3e0', '#b7a086', 1.08]} />
      <directionalLight position={[6, 12, 5]} intensity={1.9} color="#ffe2b6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[-7, 5, -6]} intensity={0.4} color="#dfe9e4" />
      <color attach="background" args={['#efe2cb']} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <Canvas shadows dpr={1.5} camera={{ fov: 30, near: 0.05, far: 60 }}
    onCreated={({ gl, camera }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08
      const r = dist, cy = Math.sin(el) * r + 0.55, ch = Math.cos(el) * r
      camera.position.set(Math.sin(az) * ch, cy, Math.cos(az) * ch)
      camera.lookAt(0, 0.52, 0)
    }}>
    <Lights />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={clay('#9cbf74')}>
      <circleGeometry args={[2.2, 40]} />
    </mesh>
    <mesh position={[1.1, 0.5, -0.9]} material={clay(C.terracotta)}><boxGeometry args={[0.1, 1, 0.1]} /></mesh>
    <group rotation={[0, yawD, 0]}>
      <Suspense fallback={null}>
        <Model anim={anim} tsRef={tsRef} socketRef={socketRef} backpack={backpack} skinURL={skinURL} freeze={freeze} />
      </Suspense>
    </group>
  </Canvas>,
)
