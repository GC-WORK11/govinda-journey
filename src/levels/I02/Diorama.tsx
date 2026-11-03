import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { DioramaProps } from '../types'
import { C, clay, Scaffold, Tree, Rock } from '../../world/kit'

const TRACK_Z = -0.12
const CAR: [number, number, number] = [0.1, 0, TRACK_Z]

/** Sleepers merged into one mesh so the track stays cheap. */
function useSleepers() {
  return useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    for (let i = 0; i < 10; i++) {
      const g = new THREE.BoxGeometry(0.2, 0.05, 0.56)
      g.translate(-1.62 + i * 0.36, 0.025, TRACK_Z)
      geos.push(g)
    }
    const merged = mergeGeometries(geos, false)!
    geos.forEach((g) => g.dispose())
    return merged
  }, [])
}

/** Steam curling up from the kettle once the stall is open. */
function KettleSteam({ on, active }: { on: boolean; active: boolean }) {
  const g = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fdf8ef', transparent: true, opacity: 0, depthWrite: false }), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    mat.opacity += ((on ? 0.72 : 0) - mat.opacity) * Math.min(1, dt * 3)
    g.current?.children.forEach((c, i) => {
      const p = (t * (active ? 0.5 : 0.34) + i / 3) % 1
      c.position.set(Math.sin(p * 4.2 + i * 2) * 0.03, 0.05 + p * 0.28, Math.cos(p * 3.4 + i) * 0.025)
      c.scale.setScalar(0.55 + p * 1.5)
    })
  })
  return (
    <group ref={g} position={[-1.34, 0.6, 0.23]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={mat}><sphereGeometry args={[0.042, 8, 6]} /></mesh>
      ))}
    </group>
  )
}

export default function Diorama({ unlocked, active }: DioramaProps) {
  const sleepers = useSleepers()
  const car = useRef<THREE.Group>(null)
  const rock = useRef(0)

  useFrame(({ clock }, dt) => {
    if (!car.current) return
    rock.current += ((unlocked ? 1 : 0) - rock.current) * Math.min(1, dt * 2)
    const t = clock.elapsedTime
    car.current.rotation.z = Math.sin(t * 1.5) * 0.012 * rock.current
    car.current.position.y = Math.sin(t * 1.5 + 1.1) * 0.006 * rock.current
  })

  return (
    <group>
      {/* track */}
      <mesh geometry={sleepers} material={clay(C.woodLight)} castShadow receiveShadow />
      {[-0.17, 0.17].map((dz) => (
        <mesh key={dz} position={[0, 0.075, TRACK_Z + dz]} material={clay(C.earthDark)} castShadow>
          <boxGeometry args={[3.6, 0.045, 0.05]} />
        </mesh>
      ))}

      {/* platform sits behind the line */}
      <RoundedBox args={[1.9, 0.13, 0.55]} radius={0.045} smoothness={3} position={[0.2, 0.065, -0.78]} material={clay(C.stoneLight)} castShadow receiveShadow />
      <RoundedBox args={[1.9, 0.06, 0.08]} radius={0.025} smoothness={3} position={[0.2, 0.125, -0.54]} material={clay(C.terracotta)} castShadow />

      {/* signboard, no words */}
      <mesh position={[1.24, 0.42, -0.82]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.022, 0.026, 0.6, 8]} />
      </mesh>
      <RoundedBox args={[0.36, 0.24, 0.035]} radius={0.035} smoothness={3} position={[1.24, 0.72, -0.82]} material={clay(C.sand)} castShadow />
      <RoundedBox args={[0.3, 0.18, 0.04]} radius={0.03} smoothness={3} position={[1.24, 0.72, -0.805]} material={clay(C.paper)} />

      {/* bench on the platform */}
      <RoundedBox args={[0.4, 0.05, 0.15]} radius={0.02} smoothness={3} position={[-0.55, 0.29, -0.76]} material={clay(C.woodLight)} castShadow />
      <RoundedBox args={[0.4, 0.14, 0.035]} radius={0.015} smoothness={3} position={[-0.55, 0.4, -0.82]} material={clay(C.woodLight)} castShadow />
      {[-0.16, 0.16].map((dx) => (
        <mesh key={dx} position={[-0.55 + dx, 0.2, -0.76]} material={clay(C.wood)} castShadow>
          <boxGeometry args={[0.035, 0.14, 0.13]} />
        </mesh>
      ))}

      {/* tea stall, front left */}
      <group position={[-1.55, 0, 0.3]} rotation={[0, 0.4, 0]}>
        <RoundedBox args={[0.6, 0.34, 0.36]} radius={0.04} smoothness={3} position={[0, 0.19, 0]} material={clay(C.cream)} castShadow receiveShadow />
        <RoundedBox args={[0.66, 0.05, 0.42]} radius={0.02} smoothness={3} position={[0, 0.38, 0]} material={clay(C.woodLight)} castShadow />
        {[-0.29, 0.29].map((dx) => (
          <mesh key={dx} position={[dx, 0.62, 0.19]} material={clay(C.wood)} castShadow>
            <cylinderGeometry args={[0.018, 0.02, 0.5, 7]} />
          </mesh>
        ))}
        <RoundedBox args={[0.74, 0.035, 0.5]} radius={0.015} smoothness={3} position={[0, 0.87, 0.06]} rotation={[-0.12, 0, 0]} material={clay(C.terracotta)} castShadow />
        <mesh position={[0.08, 0.49, 0.02]} scale={[1, 0.82, 1]} material={clay(C.brick)} castShadow>
          <sphereGeometry args={[0.095, 16, 12]} />
        </mesh>
        <mesh position={[0.06, 0.55, 0.02]} material={clay('#d9b26a')}>
          <cylinderGeometry args={[0.032, 0.038, 0.03, 10]} />
        </mesh>
        <mesh position={[0.21, 0.55, 0.02]} rotation={[0, 0, -0.75]} material={clay(C.brick)} castShadow>
          <cylinderGeometry args={[0.011, 0.018, 0.14, 7]} />
        </mesh>
        <mesh position={[-0.06, 0.56, 0.02]} rotation={[0, 0, 0.2]} material={clay(C.wood)}>
          <torusGeometry args={[0.052, 0.009, 6, 12, Math.PI]} />
        </mesh>
        <mesh position={[-0.17, 0.41, 0.04]} material={clay(C.wood)} castShadow>
          <boxGeometry args={[0.2, 0.015, 0.13]} />
        </mesh>
        {[[-0.23, 0.02], [-0.16, 0.06], [-0.1, 0.0]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.44, z]} material={clay(C.paper)} castShadow>
            <cylinderGeometry args={[0.028, 0.024, 0.05, 10]} />
          </mesh>
        ))}
        <mesh position={[-0.46, 0.11, 0.16]} material={clay(C.wood)} castShadow>
          <cylinderGeometry args={[0.085, 0.09, 0.22, 10]} />
        </mesh>
      </group>

      {/* the carriage, in front of the platform */}
      <group ref={car} position={CAR}>
        <RoundedBox args={[1.16, 0.44, 0.42]} radius={0.06} smoothness={3} position={[0, 0.4, 0]} material={clay(C.terracotta)} castShadow receiveShadow />
        <RoundedBox args={[1.24, 0.1, 0.48]} radius={0.045} smoothness={3} position={[0, 0.65, 0]} material={clay(C.cream)} castShadow />
        {[-0.26, 0.26].map((x) => (
          <RoundedBox key={x} args={[0.16, 0.05, 0.14]} radius={0.02} smoothness={3} position={[x, 0.72, 0]} material={clay(C.cream)} castShadow />
        ))}
        {[-0.42, -0.14, 0.14, 0.42].map((x) => (
          <RoundedBox key={x} args={[0.16, 0.17, 0.03]} radius={0.025} smoothness={3} position={[x, 0.44, 0.21]} material={clay(C.water)} />
        ))}
        <RoundedBox args={[1.18, 0.06, 0.44]} radius={0.02} smoothness={3} position={[0, 0.2, 0]} material={clay(C.brick)} />
        {[-0.34, 0.34].map((x) => [-0.19, 0.19].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.12, z]} rotation={[0, 0, Math.PI / 2]} material={clay(C.wood)} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 14]} />
          </mesh>
        )))}
        {[-0.13, 0.13].map((z) => (
          <mesh key={z} position={[0.6, 0.28, z]} rotation={[0, 0, Math.PI / 2]} material={clay(C.earthDark)} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
          </mesh>
        ))}
      </group>

      <Tree position={[-1.88, 0, 1.02]} h={0.78} />
      <Tree position={[1.72, 0, 0.55]} h={0.7} color={C.leaf} />
      <Rock position={[1.95, 0.05, -1.05]} s={0.19} />
      <Rock position={[-1.72, 0.04, -1.3]} s={0.14} color={C.earthDark} />

      <KettleSteam on={unlocked} active={active} />
      <Scaffold open={unlocked} position={CAR} size={[1.38, 1.0, 0.64]} />
    </group>
  )
}
