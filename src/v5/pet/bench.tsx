/**
 * PET bench (dev only, not in the build): /src/v5/pet/bench.html. The first islands
 * and bridges with the real Player and Pet, so the dog can be tested without World5.
 * ?upto=<ID> completes every island before <ID>; ?fresh resets the journey;
 * ?model=<url> tests a GLB other than PET_MODEL.
 */
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { V5_ORDER, useV5, type IslandId } from '../core'
import { Island5 } from '../world/Island5'
import { Bridge5 } from '../world/Bridge5'
import Player from '../player/Player'
import Controls from '../player/Controls'
import Pet, { PET_MODEL } from './Pet'
import '../ui/v5.css'

const Q = new URLSearchParams(location.search)
const N = 4

function Scene() {
  return (
    <>
      <hemisphereLight args={['#eaf2f0', '#a98e6d', 0.85]} />
      <directionalLight position={[7, 12, 5]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14}
        shadow-camera-far={60} shadow-bias={-0.0004} />
      {V5_ORDER.slice(0, N).map((id, i) => <Island5 key={id} id={id} i={i} />)}
      {V5_ORDER.slice(0, N - 1).map((id, i) => <Bridge5 key={id} i={i} shown />)}
      <Player />
      <Pet model={Q.get('model') ?? PET_MODEL} />
    </>
  )
}

function Bench() {
  useEffect(() => {
    if (Q.has('fresh')) useV5.getState().reset()
    const upto = Q.get('upto') as IslandId | null
    if (upto) for (const id of V5_ORDER.slice(0, V5_ORDER.indexOf(upto))) useV5.getState().complete(id)
  }, [])
  return (
    <>
      <Canvas shadows dpr={Math.min(1.5, window.devicePixelRatio || 1)}
        camera={{ fov: 38, near: 0.1, far: 340, position: [10, 7, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
        <color attach="background" args={['#efe2cb']} />
        <fog attach="fog" args={['#efe2cb', 30, 85]} />
        <Scene />
      </Canvas>
      <Controls />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Bench />)
