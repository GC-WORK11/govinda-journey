/**
 * L01 — IIT Patna · 2023 · tutorial.
 * A small campus courtyard: hop the low wall, sit at the laptop under the tree,
 * and the gate to the next island swings open. Grants nothing.
 * Contract: docs/V5.md + src/v5/core.ts.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { C, Gate, Hint, LowWall, PathStones, Rock, tpLocal, sleep, useLocalPlayer, useSolver } from './shared.v5'
import { Bush, Fence, LampPost } from '../../world/kit'
import { BigTree, CampusBlock, LaptopDesk } from './campus.v5'

const ENTRY = new THREE.Vector3(0, 0, 4.2)
const DESK = new THREE.Vector3(1.85, 0, -0.9)
const WALL_Z = 0.55

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const laptopRef = useRef<THREE.Group>(null)
  const local = useMemo(() => new THREE.Vector3(), [])
  const at = useMemo(() => new THREE.Vector3(), [])
  const [open, setOpen] = useState(done)
  const openT = useRef(done ? 1 : 0)
  const used = useRef(done)
  const completed = useRef(done)
  const moved = useRef(done)
  const crossed = useRef(done)

  useLocalPlayer(root, local)

  const inter = useMemo<core.Interactable>(() => ({
    id: `${id}-laptop`,
    at: () => (laptopRef.current ? laptopRef.current.getWorldPosition(at) : at),
    radius: 1.7,
    label: 'sit at the laptop',
    use: () => { if (!used.current) { used.current = true; setOpen(true) } },
    enabled: () => !completed.current,
  }), [id, at])
  core.useInteractable(inter)

  useFrame((_, dt) => {
    if (!moved.current && local.distanceTo(ENTRY) > 0.8) moved.current = true
    if (!crossed.current && local.z < WALL_Z - 0.35) crossed.current = true
    if (open && openT.current < 1) {
      openT.current = Math.min(1, openT.current + dt / 1.7)
      if (openT.current > 0.8 && !completed.current) { completed.current = true; complete() }
    }
  })

  const solve = useCallback(async () => {
    tpLocal(root.current, new THREE.Vector3(0, 0.3, 3.2))
    await sleep(500)
    tpLocal(root.current, new THREE.Vector3(0.9, 0.3, -0.4))
    await sleep(600)
    core.interactables.get(`${id}-laptop`)?.use()
    await sleep(2200)
  }, [id])
  useSolver(id, solve)

  const warm = open
  return (
    <group ref={root}>
      {/* courtyard landmark + the desk under the tree */}
      <CampusBlock position={[-2.15, 0, -2.8]} yaw={0.5} warm={warm} />
      <BigTree position={[2.7, 0, -1.7]} s={1.15} />
      <LaptopDesk position={[DESK.x, 0, DESK.z]} yaw={-1.05} lit={warm} laptopRef={laptopRef} />

      {/* the low wall that teaches the hop — sealed at both ends by boulders */}
      <LowWall position={[0, 0, WALL_Z]} len={9} h={0.36} />
      <Rock position={[-4.25, 0.05, WALL_Z]} s={0.62} yaw={0.7} />
      <Rock position={[4.25, 0.05, WALL_Z]} s={0.58} yaw={2.1} />
      <Bush position={[-3.9, 0, WALL_Z + 0.45]} s={1.15} />
      <Bush position={[3.95, 0, WALL_Z + 0.4]} s={1.05} color={C.leaf} />

      {/* the way out */}
      <Gate position={[0, 0, -3.9]} open={open} instant={done} width={2.0} height={1.42} />
      <LampPost position={[-1.55, 0, -3.62]} lit={warm} />
      <LampPost position={[1.55, 0, -3.62]} lit={warm} />
      {warm && <pointLight position={[0, 1.3, -3.6]} color="#ffc27e" intensity={2.4} distance={4.5} decay={2} />}

      {/* stones underfoot */}
      <PathStones pts={[[0, 4.1], [0, 1.1]]} seed={3} />
      <PathStones pts={[[0, -0.15], [0, -3.4]]} seed={5} />
      <PathStones pts={[[0.2, -0.5], [1.15, -0.8]]} seed={7} />

      {/* dressing */}
      <Fence pts={[new THREE.Vector3(-3.7, 0, -1.4), new THREE.Vector3(-4.05, 0, -2.3), new THREE.Vector3(-3.7, 0, -3.3)]} seed={4} />
      <Bush position={[-3.4, 0, -0.6]} s={1.1} />
      <Bush position={[3.55, 0, -2.7]} s={1.2} color={C.leaf} />
      <Rock position={[-3.3, 0.04, 1.9]} s={0.3} block={false} />
      <Rock position={[3.4, 0.04, 2.1]} s={0.24} block={false} yaw={1.2} />

      {/* quiet teaching hints */}
      <Hint text="walk" position={[0, 1.0, 3.5]} show={() => active && !moved.current} />
      <Hint text="hop" position={[0, 0.98, WALL_Z]} show={() => active && moved.current && !crossed.current && local.z < 3.4} />
      <Hint text="use" position={[DESK.x, 1.25, DESK.z]} show={() => active && crossed.current && !used.current} />
    </group>
  )
}
