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
import { Gate, LowWall, PathStones, PillHint, Prop, Rock, tpLocal, sleep, useLocalPlayer, useSolver, BloomField, Merged, type Prim } from './shared.v5'
import { BigTree, CampusBlock, LaptopDesk } from './campus.v5'

const DESK = new THREE.Vector3(2.35, 0, -0.6)
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
  const approached = useRef(done)
  const walked = useRef(0)
  const prev = useRef(new THREE.Vector3())
  const inited = useRef(false)
  const [hint, setHint] = useState<string | null>(done ? null : 'Use WASD or the stick to walk')
  const hintNow = useRef<string | null>(hint)

  useLocalPlayer(root, local)

  const inter = useMemo<core.Interactable>(() => ({
    id: `${id}-laptop`,
    at: () => (laptopRef.current ? laptopRef.current.getWorldPosition(at) : at),
    radius: 2.1, // a little more forgiving for phone visitors (was 1.7)
    label: 'sit at the laptop',
    use: () => {
      if (used.current) return
      used.current = true
      core.playerEmote.name = 'use'
      setTimeout(() => { if (core.playerEmote.name === 'use') core.playerEmote.name = null }, 1100)
      setOpen(true)
    },
    enabled: () => !used.current,
  }), [id, at])
  core.useInteractable(inter)

  useFrame((_, dt) => {
    // teaching flags — count only real per-frame walking so spawn teleports don't fake progress
    if (!inited.current) { prev.current.copy(local); inited.current = true }
    const step = local.distanceTo(prev.current)
    prev.current.copy(local)
    if (step > 0.001 && step < 1.0) walked.current += step  // slow frames take big steps; teleports are bigger
    if (!moved.current && walked.current > 0.7) moved.current = true
    // approach = was ever on the near side; tracked independently of `moved` so a slow-frame
    // visitor who only registers as moving after reaching the wall can't get stuck
    if (!approached.current && local.z > WALL_Z + 0.45) approached.current = true
    if (approached.current && moved.current && !crossed.current && local.z < WALL_Z - 0.35) crossed.current = true
    // the one quiet line at the bottom of the screen
    const h = !active || done ? null
      : !moved.current ? 'Use WASD or the stick to walk'
      : !crossed.current ? 'Jump over the low wall'
      : !used.current ? 'Sit at the laptop under the tree'
      : null
    if (h !== hintNow.current) { hintNow.current = h; setHint(h) }
    if (open && openT.current < 1) {
      openT.current = Math.min(1, openT.current + dt / 1.1)
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

  // four bushes merged into ONE vertex-coloured mesh (was ~12 draws)
  const bushes = useMemo<Prim[]>(() => {
    const spots: [number, number, number][] = [
      [-3.9, WALL_Z + 0.45, 1.15], [3.95, WALL_Z + 0.4, 1.05],
      [-3.4, -0.6, 1.1], [3.55, -2.7, 1.2],
    ]
    const prims: Prim[] = []
    spots.forEach(([x, z, s], i) => {
      prims.push(
        { g: 'dod', p: [x, 0.42 * s, z], s: [1.05 * s, 0.9 * s, 1.05 * s], r: [0, i, 0], c: i % 2 ? '#8fae6a' : '#7fa25e' },
        { g: 'dod', p: [x + 0.32 * s, 0.6 * s, z + 0.12 * s], s: [0.62 * s, 0.56 * s, 0.62 * s], r: [0, i * 2, 0], c: '#9cba74' },
        { g: 'dod', p: [x - 0.3 * s, 0.55 * s, z - 0.14 * s], s: [0.55 * s, 0.5 * s, 0.55 * s], r: [0, i * 3, 0], c: '#8fae6a' },
      )
    })
    return prims
  }, [])

  const warm = open
  return (
    <group ref={root}>
      {/* courtyard landmark + the desk under the tree */}
      <CampusBlock position={[-2.3, 0, -2.85]} yaw={0.55} warm={warm} />
      <BigTree position={[2.9, 0, -1.45]} s={1.1} />
      <LaptopDesk position={[DESK.x, 0, DESK.z]} yaw={-1.05} lit={warm} laptopRef={laptopRef} />

      {/* the low wall that teaches the hop — sealed at both ends by boulders */}
      <LowWall position={[0, 0, WALL_Z]} len={9} h={0.56} />
      <Rock position={[-4.25, 0.05, WALL_Z]} s={0.62} yaw={0.7} variant={1} />
      <Rock position={[4.25, 0.05, WALL_Z]} s={0.58} yaw={2.1} variant={2} />
      <Merged items={bushes} />

      {/* the way out */}
      <Gate position={[0, 0, -3.9]} open={open} instant={done} width={2.0} height={1.42} />
      <Prop name="streetlight" position={[-1.55, 0, -3.62]} scale={1.55} />
      <Prop name="streetlight" position={[1.55, 0, -3.62]} rotation={[0, Math.PI, 0]} scale={1.55} />
      {warm && <pointLight position={[0, 1.3, -3.6]} color="#ffc27e" intensity={2.4} distance={4.5} decay={2} />}

      {/* a spur of stones leading off the main path to the desk (the z-corridor
          stones are drawn by WORLD) */}
      <PathStones pts={[[0.15, -0.35], [1.6, -0.55]]} seed={7} />

      {/* dressing */}
      <Prop name="fence_planks" position={[-4.25, 0, -0.9]} rotation={[0, 1.15, 0]} scale={1.3} />
      <Prop name="fence_planks" position={[-4.45, 0, -2.0]} rotation={[0, 1.62, 0]} scale={1.3} />
      <Rock position={[-3.3, 0.04, 1.9]} s={0.3} block={false} variant={2} />
      <Rock position={[3.4, 0.04, 2.1]} s={0.24} block={false} yaw={1.2} variant={1} />
      {/* seeded rim dressing (grass + flower blobs, ONE merged mesh) */}
      <BloomField seed={11} density={0.55}
        avoid={[[-2.3, -2.85, 2.6], [2.6, -1.0, 2.0], [0, -3.9, 2.2], [0, 4.2, 1.4]]} />

      {/* quiet teaching line */}
      <PillHint text={hint} />
    </group>
  )
}
