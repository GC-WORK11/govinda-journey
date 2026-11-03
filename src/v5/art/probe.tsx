import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { IslandBase } from './IslandBase'
import { Water } from './Water'
import { Clouds5 } from './Clouds5'
import { Prop, Scatter } from './Dressing'

createRoot(document.getElementById('root')!).render(
  <Canvas shadows camera={{ fov: 30, position: [9, 7, 12] }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping }}>
    <color attach="background" args={['#efe2cb']} />
    <fog attach="fog" args={['#efe2cb', 30, 90]} />
    <hemisphereLight args={['#fff3e0', '#b7a086', 1.1]} />
    <directionalLight position={[6, 12, 5]} intensity={1.9} color="#ffe2b6" castShadow />
    <directionalLight position={[-7, 5, -6]} intensity={0.4} color="#dfe9e4" />
    <IslandBase id="L01" radius={5} palette={{ ground: '#9cbf74', accent: '#d9825b' }} />
    <Suspense fallback={null}>
      <Scatter radius={5} seed={7} />
      <Prop name="building_a" position={[-1.8, 0, -1.8]} scale={0.9} />
      <Prop name="desk" position={[0, 0.02, -2.9]} />
      <Prop name="laptop" position={[0, 0.55, -2.9]} />
      <Prop name="bench" position={[2.6, 0.02, 0.6]} rotation={[0, -0.7, 0]} />
      <Prop name="streetlight" position={[2.8, 0.02, -1.2]} />
      <Prop name="wall_gated" position={[3.2, 0.02, -2.8]} rotation={[0, Math.PI / 2, 0]} />
    </Suspense>
    <Water y={-14} islands={[[0, 0, 5]]} />
    <Clouds5 seaY={-11} span={50} />
    <OrbitControls makeDefault target={[0, 0.5, 0]} maxPolarAngle={Math.PI * 0.62} />
  </Canvas>,
)
