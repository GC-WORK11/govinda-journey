/**
 * I02 — On the road · calm interlude.
 * A little country station: low platform, nameboard, bench, tea stall. Behind the
 * island's right shoulder a slim rail causeway floats past, and every ~22 s a small
 * train crosses it slowly with a wisp of steam. No task — complete() when the
 * traveller reaches the exit half; the platform lamp warms as the bridge forms.
 * Contract: docs/V5.md + src/v5/core.ts. Grants nothing.
 */
import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, clay, PathStones, sleep, tpLocal, useIslandFrame, useSolver } from '../L04/shared.v5'
import { Bush, ClayPot, Tree, Rock } from '../../world/kit'
import { Bench, Churn, Luggage, Nameboard, Platform, Siding, StationLamp, TeaStall, Train, useTrack } from './station.v5'

/** Causeway behind the island's right shoulder — kept x>=2.2 clear of the exit-bridge corridor. */
const TRACK_PTS: [number, number, number][] = [
  [9.6, -0.75, 1.2], [7.3, -0.55, -0.9], [4.6, -0.5, -3.5], [2.7, -0.6, -7.4], [1.9, -0.85, -10.8],
]
const CYCLE = 22 // seconds between passes
const PASS_AT = 3.5 // when in the cycle the train enters
const PASS_LEN = 8 // crossing duration

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const { root, local } = useIslandFrame()
  const track = useTrack(TRACK_PTS)
  const u = useRef(-0.1)
  const lit = useRef(done ? 1 : 0)
  const arrived = useRef(done)
  const arrivedT = useRef(0)
  const completed = useRef(done)
  const trackMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02 }), [])

  const solve = useCallback(async () => {
    tpLocal(root.current, new THREE.Vector3(0, 0.15, 0.6))
    await sleep(600)
    tpLocal(root.current, new THREE.Vector3(0, 0.15, -3.2))
    await sleep(1800)
  }, [])
  useSolver(id, solve)

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    // the little train: long quiet gap, then a slow crossing
    const c = t % CYCLE
    const p = (c - PASS_AT) / PASS_LEN
    u.current = p <= 0 ? -0.1 : p >= 1 ? 1.1 : p * p * (3 - 2 * p) * 0.96 + 0.02
    // reaching the exit half completes the stop
    if (active && !arrived.current && local.z < -1.15 && local.y > -1) arrived.current = true
    if (arrived.current && !completed.current) {
      arrivedT.current += dt
      lit.current = Math.min(1, arrivedT.current / 1.2)
      if (arrivedT.current > 1.4) { completed.current = true; complete() }
    }
  })

  return (
    <group ref={root}>
      {/* the floating line behind the island + the station siding that meets it */}
      <mesh geometry={track.geo} material={trackMat} castShadow receiveShadow />
      <Siding position={[3.35, 0, -3.05]} yaw={-0.73} />
      <Train track={track} uRef={u} />

      {/* platform + furniture on the back-left, clear of the walk line */}
      <Platform position={[-1.6, 0, -2.3]} w={2.0} />
      <Bench position={[-1.95, 0.13, -2.42]} yaw={0.15} />
      <Nameboard position={[-0.95, 0.13, -2.45]} yaw={0.1} />
      <Luggage position={[-1.2, 0.13, -2.12]} />
      <StationLamp position={[-0.55, 0, -2.75]} lit={lit} />
      <Churn position={[-2.45, 0, -1.5]} />

      {/* tea stall at the front-left corner */}
      <TeaStall position={[-2.15, 0, 1.7]} yaw={0.5} lit={lit} />

      {/* stones underfoot the whole way across */}
      <PathStones pts={[[0.05, 4.1], [0, -0.6]]} seed={21} />
      <PathStones pts={[[0, -0.7], [-0.05, -4.0]]} seed={23} />

      {/* dressing */}
      <Tree position={[3.1, 0, 2.55]} h={1.0} />
      <Tree position={[-3.5, 0, -0.35]} h={0.85} color={C.leaf} />
      <Rock position={[3.4, 0.05, -0.8]} s={0.3} />
      <Rock position={[-3.2, 0.05, 2.4]} s={0.24} />
      <Bush position={[-3.7, 0, 1.2]} s={0.95} />
      <Bush position={[3.85, 0, 1.1]} s={0.85} color={C.leaf} />
      <ClayPot position={[-2.9, 0, 0.9]} s={0.9} />
      <ClayPot position={[1.6, 0, -3.6]} s={0.8} />
    </group>
  )
}
