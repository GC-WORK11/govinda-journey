import { AutoMerge } from '../../v5/world/AutoMerge'
/**
 * L03 "First websites" — the page bridge.
 * The route south leaves the rim on a chain of floating stone platforms over open void;
 * three spans are missing. Paper "page" slabs sit in a rack on a rock ledge that only
 * opens via the handhold wall (needs climb). E picks a page up, carry it to a gap, E lays
 * it — it snaps flush and becomes walkable. Three laid → pages glow warm (deployed) and
 * the landing lantern lights → complete() grants build.
 *
 * Island-local frame: top y=0, entry (0,0,4.2), exit (0,0,-4.2), r=5.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { LEVELS } from '../registry'
import {
  C, clay, REDUCED, useLocalPlayer, tpLocal, tpWorld, useSolver, useAt, Hint,
  PathStones, Rock, Mound, RopeFence, StoneLantern, Prop, carryWorld, sleep, waitTp,
  Merged, type Prim,
} from './shared.v5'

/* --------------------------------- layout --------------------------------- */

const LEDGE = new THREE.Vector3(3.35, 0, 3.3)      // rock outcrop holding the rack
const LEDGE_TOP = 0.95
const WALL_AT = new THREE.Vector3(2.62, 0, 2.48)   // base of the handhold wall (SW face)
const CLIMB_TO = new THREE.Vector3(3.28, LEDGE_TOP + 0.02, 3.22)
const RACK = new THREE.Vector3(3.45, LEDGE_TOP, 3.45)
const RACK_YAW = 0.62 // rack local +z faces the path below (SW)

const ABUT = new THREE.Vector3(3.9, 0, 1.55)       // stone lip on the rim
const PLATS = [
  new THREE.Vector3(4.95, 0, 0.62),
  new THREE.Vector3(5.42, 0, -0.82),
  new THREE.Vector3(4.82, 0, -2.18),
]
const PLANK_TO = new THREE.Vector3(3.5, 0, -3.42)  // south landing (behind the site fence)
const LANTERN = new THREE.Vector3(3.05, 0, -3.8)

// Gap slots: centre + yaw of the slab that fills them (slab long axis = local +x).
const GAPS = [
  { c: new THREE.Vector3(4.42, 0.0, 1.13), yaw: Math.atan2(-(0.62 - 1.55), 4.95 - 3.9) },
  { c: new THREE.Vector3(5.2, 0.0, -0.12), yaw: Math.atan2(-(-0.82 - 0.62), 5.42 - 4.95) },
  { c: new THREE.Vector3(5.14, 0.0, -1.52), yaw: Math.atan2(-(-2.18 + 0.82), 4.82 - 5.42) },
]
const FENCE_Z = -2.8
const LREG = LEVELS.find((l) => l.id === 'L03')!
const PROJECTS = [
  'CEO Hunt: a calm meeting ground for founders, investors, and operators.',
  'Flow Pitch: agent workflows, redesigned for a phone screen.',
  'Delegators Workbench turns plans into finished documents.',
]

/* --------------------------------- page slab ------------------------------ */

const PAGE_W = 1.42, PAGE_H = 0.9, PAGE_T = 0.075

/** Canvas texture: a tiny printed page — header bar, an image block, text lines. */
function pageTex(variant: number) {
  const cv = document.createElement('canvas')
  cv.width = 256; cv.height = 164
  const ctx = cv.getContext('2d')!
  // paper
  ctx.fillStyle = '#fbf4e6'; ctx.fillRect(0, 0, 256, 164)
  ctx.fillStyle = '#efe4cd'; ctx.fillRect(0, 0, 256, 5); ctx.fillRect(0, 159, 256, 5)
  // header bar
  ctx.fillStyle = '#e2c9a2'; ctx.fillRect(14, 12, 228, 20)
  ctx.fillStyle = '#b5654a'; ctx.fillRect(14, 12, 30, 20)
  ctx.fillStyle = 'rgba(107,95,87,.5)'
  ctx.fillRect(196, 18, 40, 4); ctx.fillRect(158, 18, 30, 4)
  const ink = 'rgba(107,95,87,.42)'
  const soft = 'rgba(107,95,87,.28)'
  if (variant === 0) {
    // landing page: big title, a button, text lines
    ctx.fillStyle = '#8fc1c9'; ctx.fillRect(14, 44, 104, 66)
    ctx.fillStyle = ink
    ctx.fillRect(130, 50, 112, 9); ctx.fillRect(130, 66, 96, 5); ctx.fillRect(130, 76, 104, 5)
    ctx.fillStyle = '#d9825b'; ctx.beginPath(); ctx.roundRect(130, 94, 52, 14, 7); ctx.fill()
    ctx.fillStyle = soft; ctx.fillRect(14, 122, 228, 5); ctx.fillRect(14, 134, 208, 5); ctx.fillRect(14, 146, 172, 5)
  } else if (variant === 1) {
    // gallery: three image squares + caption lines
    ctx.fillStyle = '#8fb36b'; ctx.fillRect(14, 46, 68, 52)
    ctx.fillStyle = '#d9825b'; ctx.fillRect(94, 46, 68, 52)
    ctx.fillStyle = '#8fc1c9'; ctx.fillRect(174, 46, 68, 52)
    ctx.fillStyle = soft
    ctx.fillRect(14, 110, 68, 5); ctx.fillRect(94, 110, 68, 5); ctx.fillRect(174, 110, 68, 5)
    ctx.fillStyle = ink; ctx.fillRect(14, 134, 180, 7); ctx.fillStyle = soft; ctx.fillRect(14, 148, 132, 5)
  } else {
    // article: sidebar + paragraphs
    ctx.fillStyle = '#e8d6b8'; ctx.fillRect(14, 44, 56, 104)
    ctx.fillStyle = ink; ctx.fillRect(22, 52, 40, 6); ctx.fillStyle = soft
    for (let i = 0; i < 6; i++) ctx.fillRect(22, 66 + i * 13, 34, 4)
    ctx.fillStyle = ink; ctx.fillRect(82, 50, 160, 8)
    ctx.fillStyle = soft
    for (let i = 0; i < 7; i++) ctx.fillRect(82, 66 + i * 12, 150 - (i % 3) * 18, 5)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
const pageTextures = [0, 1, 2].map(pageTex)

/* --------------------------------- state ---------------------------------- */

type BlockState = 'rack' | 'carried' | 'placing' | 'placed'
type Block = {
  g: THREE.Group | null
  state: BlockState
  t: number                       // placing anim progress
  landed: boolean                 // placed transform applied at least once
  from: THREE.Vector3
  to: THREE.Vector3
  fromQ: THREE.Quaternion
  toQ: THREE.Quaternion
}

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const lp = useMemo(() => new THREE.Vector3(), [])
  useLocalPlayer(root, lp)

  const [lit, setLit] = useState(done)          // payoff: warm glow on the pages + lantern
  const doneRef = useRef(done)
  const solveT = useRef(done ? 1 : 0)
  const storied = useRef(false)

  const blocks = useMemo<Block[]>(() => [0, 1, 2].map((i) => {
    const to = GAPS[i].c.clone().setY(0.055)
    const toQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, GAPS[i].yaw, 0))
    return {
      g: null,
      state: done ? 'placed' : 'rack',
      t: done ? 1 : 0,
      landed: false,
      from: new THREE.Vector3(), to, fromQ: new THREE.Quaternion(), toQ,
    }
  }), [done])

  const climb = useRef({ on: false, t: 0, from: new THREE.Vector3(), to: CLIMB_TO.clone() })
  const tmpV = useMemo(() => new THREE.Vector3(), [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])

  /* ------------------------------ interactables ------------------------------ */

  const caption = (s: string, ms = 2600) => {
    core.useV5.getState().setCaption(s)
    setTimeout(() => { if (core.useV5.getState().caption === s) core.useV5.getState().setCaption(null) }, ms)
  }

  const climbAt = useAt(root, WALL_AT.x, WALL_AT.y + 0.5, WALL_AT.z)
  const climbIt = useMemo<core.Interactable>(() => ({
    id: 'l03-climb', at: climbAt, radius: 1.1, label: 'climb the handholds',
    use: () => {
      if (climb.current.on) return
      if (!core.has('climb')) { caption('the holds are too high — I can’t reach them') ; return }
      climb.current.on = true
      climb.current.t = 0
      climb.current.from.copy(core.player.pos)
      root.current?.worldToLocal(climb.current.from)
      core.player.frozen = true
    },
  }), [climbAt])
  core.useInteractable(climbIt)

  const rdx = Math.cos(RACK_YAW), rdz = -Math.sin(RACK_YAW)
  const blockAts = [0, 1, 2].map((i) => useAt(root, RACK.x + (i - 1) * 0.34 * rdx, RACK.y + 0.5, RACK.z + (i - 1) * 0.34 * rdz))
  const blockIts = useMemo<core.Interactable[]>(() => blocks.map((b, i) => ({
    id: `l03-page-${i}`, at: blockAts[i], radius: 1.0, label: 'take a page',
    enabled: () => b.state === 'rack' && !core.player.carrying && !doneRef.current,
    use: () => {
      if (b.state !== 'rack' || core.player.carrying) return
      b.state = 'carried'
      core.player.carrying = `l03-page-${i}`
      caption(PROJECTS[i], 4600)
    },
  })), [blocks, blockAts])
  blockIts.forEach((it) => core.useInteractable(it))

  const gapAts = GAPS.map((g) => useAt(root, g.c.x, g.c.y + 0.15, g.c.z))
  const gapIts = useMemo<core.Interactable[]>(() => GAPS.map((g, j) => ({
    id: `l03-gap-${j}`, at: gapAts[j], radius: 1.35,
    label: 'lay a page in the gap',
    enabled: () => !doneRef.current && !blocks.some((b) => (b as any).slot === j && (b.state === 'placed' || b.state === 'placing')),
    use: () => {
      const bi = blocks.findIndex((b) => b.state === 'carried')
      if (bi < 0) { caption('a loose page would bridge this gap'); return }
      const b = blocks[bi]
      b.state = 'placing'
      b.t = 0
      if (b.g) { b.from.copy(b.g.position); b.fromQ.copy(b.g.quaternion) }
      // this gap takes the carried block's identity for the animation
      b.to.copy(GAPS[j].c).setY(0.055)
      b.toQ.setFromEuler(new THREE.Euler(0, GAPS[j].yaw, 0))
      ;(b as any).slot = j
      core.player.carrying = null
    },
  })), [blocks, gapAts])
  gapIts.forEach((it) => core.useInteractable(it))

  /* ------------------------------ per-frame drive --------------------------- */

  const placedCount = useRef(done ? 3 : 0)
  useFrame((s, dt) => {
    if (active && !storied.current && !doneRef.current && (lp.x + 2.55) ** 2 + (lp.z - 2.3) ** 2 < 6.76) { storied.current = true; caption(LREG.story, 5200) }
    const k = Math.min(1, dt * 9)
    blocks.forEach((b, i) => {
      const g = b.g
      if (!g) return
      if (b.state === 'rack') {
        // standing upright in the rack like a folder, leaning on the back rail
        const dx = Math.cos(RACK_YAW), dz = -Math.sin(RACK_YAW)
        g.position.set(RACK.x + (i - 1) * 0.34 * dx, RACK.y + 0.5, RACK.z + (i - 1) * 0.34 * dz)
        g.rotation.set(Math.PI / 2 - 0.24, RACK_YAW + (i - 1) * 0.05, 0)
        g.scale.setScalar(1)
      } else if (b.state === 'carried') {
        carryWorld(tmpV)
        if (root.current) root.current.worldToLocal(tmpV)
        g.position.lerp(tmpV, k)
        // lie flat, follow facing
        tmpQ.setFromEuler(new THREE.Euler(0, core.player.facing, 0))
        g.quaternion.slerp(tmpQ, k)
        g.scale.lerp(tmpV.setScalar(0.58), k)
      } else if (b.state === 'placing') {
        b.t = Math.min(1, b.t + dt * 1.9)
        const e = 1 - Math.pow(1 - b.t, 3)
        g.position.lerpVectors(b.from, b.to, e)
        g.position.y += Math.sin(e * Math.PI) * 0.22
        g.quaternion.slerpQuaternions(b.fromQ, b.toQ, e)
        g.scale.setScalar(0.58 + 0.42 * e)
        if (b.t >= 1) {
          b.state = 'placed'
          b.landed = true
          placedCount.current++
          const slab = (b as any).slab as THREE.Object3D | undefined
          if (slab) core.walkables.add(slab)
          if (placedCount.current >= 3 && !doneRef.current) {
            doneRef.current = true
            setTimeout(() => { setLit(true) }, 350)
            setTimeout(() => complete(), REDUCED ? 700 : 1500)
          }
        }
      } else if (b.state === 'placed' && !b.landed) {
        // already-solved mount: drop straight into the gap pose
        b.landed = true
        g.position.copy(b.to)
        g.quaternion.copy(b.toQ)
        g.scale.setScalar(1)
      }
    })

    // climb hop: rise, arc over the lip, land on the ledge top
    const c = climb.current
    if (c.on) {
      c.t = Math.min(1, c.t + dt * 1.5)
      const e = c.t * c.t * (3 - 2 * c.t)
      tmpV.lerpVectors(c.from, c.to, e)
      tmpV.y += Math.sin(e * Math.PI) * 0.3
      if (root.current) root.current.localToWorld(tmpV)
      tpWorld(tmpV)
      if (c.t >= 1) { c.on = false; core.player.frozen = false }
    }
  })

  /* --------------------------------- solver --------------------------------- */

  useSolver(id, async () => {
    const r = root.current
    if (!r) return
    await waitTp()
    // up the wall via the real climb interaction when climb is granted (?qa&unlock)
    tpLocal(r, new THREE.Vector3(WALL_AT.x - 0.2, 0.1, WALL_AT.z - 0.2))
    await sleep(150)
    core.interactables.get('l03-climb')?.use()
    await sleep(1100)
    if (!climb.current.on && !core.has('climb')) tpLocal(r, CLIMB_TO.clone().add(new THREE.Vector3(0, 0.05, 0)))
    await sleep(200)
    for (let i = 0; i < 3; i++) {
      tpLocal(r, new THREE.Vector3(RACK.x - 0.4 + i * 0.35, LEDGE_TOP + 0.1, RACK.z - 0.8))
      await sleep(120)
      core.interactables.get(`l03-page-${i}`)?.use()
      await sleep(350)
      tpLocal(r, new THREE.Vector3(GAPS[i].c.x - Math.cos(GAPS[i].yaw) * 0.9, 0.15, GAPS[i].c.z + Math.sin(GAPS[i].yaw) * 0.9))
      await sleep(120)
      core.interactables.get(`l03-gap-${i}`)?.use()
      await sleep(850)
    }
  })

  /* --------------------------------- render --------------------------------- */

  const near = (x: number, z: number, r: number) => (lp.x - x) ** 2 + (lp.z - z) ** 2 < r * r

  return (
    <group ref={root}>
      <AutoMerge>
      {/* path: entry → studio fork → abutment */}
      <PathStones pts={[[0, 4.2], [0.9, 3.6], [2.1, 2.9], [3.1, 2.2], [3.8, 1.7]]} seed={7} />
      <PathStones pts={[[0.9, 3.6], [-0.6, 3.2], [-1.8, 2.8]]} seed={8} gap={0.72} />
      </AutoMerge>

      <Studio position={[-2.55, 0, 2.3]} yaw={1.15} />
      <LedgeWall />
      <Rack />
      {blocks.map((b, i) => (
        <group key={i} ref={(g) => { b.g = g; if (g && b.state === 'placed') { g.position.copy(b.to); g.quaternion.copy(b.toQ) } }}>
          <PageBlock i={i} b={b} />
        </group>
      ))}

      <AutoMerge>
      {/* rim abutment where the grass ends */}
      <Abutment />
      </AutoMerge>

      {/* floating platforms + gap stubs */}
      <AutoMerge>
      {PLATS.map((p, i) => <Platform key={i} p={p} i={i} />)}
      </AutoMerge>
      {GAPS.map((g, i) => (
        <GapSlot key={i} g={g} open={() => !blocks.some((bb) => (bb as any).slot === i && (bb.state === 'placed' || bb.state === 'placing'))} />
      ))}
      <Plank from={PLATS[2]} to={PLANK_TO} />

      <AutoMerge>
      {/* site fence sealing the south yard; the platform chain lands behind it */}
      <SiteFence />
      </AutoMerge>

      {/* the landing + exit yard */}
      <AutoMerge>
      <StoneLantern position={[LANTERN.x, 0, LANTERN.z]} lit={lit} />
      <PathStones pts={[[3.4, -3.5], [2.2, -3.9], [1.0, -4.1], [0, -4.2]]} seed={9} gap={0.7} />
      <Rock position={[1.9, 0.1, -3.4]} s={0.34} yaw={1.2} />
      <Rock position={[-1.6, 0.08, -3.6]} s={0.42} yaw={0.4} block={false} />
      <Mound position={[-2.6, 0, -3.2]} r={0.9} h={0.3} />
      <StoneLantern position={[-0.8, 0, 3.3]} lit={false} />
      </AutoMerge>

      <AutoMerge>
      {/* scattered dressing on the north grass */}
      <Rock position={[-3.6, 0.08, 0.9]} s={0.4} yaw={2.1} block={false} />
      <Rock position={[0.4, 0.06, 0.6]} s={0.28} yaw={0.9} block={false} />
      <Mound position={[-1.8, 0, 0.4]} r={1.1} h={0.34} />
      <Mound position={[1.9, 0, -1.9]} r={0.85} h={0.26} />
      <Tufts />
      </AutoMerge>

      {/* hints */}
      <Hint text="handholds" position={[WALL_AT.x, 1.15, WALL_AT.z]} show={() => active && !doneRef.current && near(WALL_AT.x, WALL_AT.z, 2.4) && !core.has('climb')} />
      <Hint text="climb" position={[WALL_AT.x, 1.15, WALL_AT.z]} show={() => active && !doneRef.current && near(WALL_AT.x, WALL_AT.z, 2.4) && core.has('climb')} />
      <Hint text="pages for the gaps" position={[RACK.x, LEDGE_TOP + 0.9, RACK.z]} show={() => active && !doneRef.current && near(RACK.x, RACK.z, 2.6) && blocks.some((b) => b.state === 'rack')} />
      <Hint text="a page gap" position={[GAPS[0].c.x, 0.7, GAPS[0].c.z]} show={() => active && !doneRef.current && near(GAPS[0].c.x, GAPS[0].c.z, 2.2) && !core.player.carrying && !blocks.some((b) => (b as any).slot === 0 && b.state === 'placed')} />
      {GAPS.map((g, j) => (
        <Hint key={j} text="lay the page" position={[g.c.x, 0.7, g.c.z]}
          show={() => active && !doneRef.current && !!core.player.carrying && near(g.c.x, g.c.z, 2.6)
            && !blocks.some((b) => (b as any).slot === j && b.state === 'placed')} />
      ))}
      <Hint text="the weekend bench" position={[-2.55, 1.7, 2.3]} show={() => active && near(-2.55, 2.3, 2.6)} size={0.26} />

      <PayoffGlow lit={lit} />
    </group>
  )
}

/* ------------------------------- page block -------------------------------- */

function PageBlock({ i, b }: { i: number; b: Block }) {
  const slab = useRef<THREE.Mesh>(null)
  const face = useRef<THREE.MeshStandardMaterial>(null)
  // expose the slab; keep it walkable exactly while placed
  useEffect(() => {
    (b as any).slab = slab.current
    return () => { if (slab.current) core.walkables.delete(slab.current) }
  }, [b])
  useEffect(() => {
    if (b.state === 'placed' && slab.current) core.walkables.add(slab.current)
  }, [b])
  useFrame((s) => {
    if (face.current) {
      const glow = b.state === 'placed' ? (PayoffState.lit ? 0.34 + Math.sin(s.clock.elapsedTime * 1.6 + i) * 0.05 : 0) : 0.04
      face.current.emissiveIntensity += (glow - face.current.emissiveIntensity) * 0.06
    }
  })
  return (
    <group>
      <RoundedBox ref={slab as any} args={[PAGE_W, PAGE_T, PAGE_H]} radius={0.025} material={clay(C.paper)} castShadow receiveShadow />
      <mesh position={[0, PAGE_T / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PAGE_W - 0.08, PAGE_H - 0.08]} />
        <meshStandardMaterial ref={face} map={pageTextures[i]} emissive="#ffcf8a" emissiveIntensity={0.04} roughness={0.85} />
      </mesh>
      <mesh position={[0, -PAGE_T / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]} material={clay('#e6d8bd')}>
        <planeGeometry args={[PAGE_W - 0.06, PAGE_H - 0.06]} />
      </mesh>
    </group>
  )
}

/** Module-level payoff flag read by PageBlock materials (set once, stays on). */
const PayoffState = { lit: false }
function PayoffGlow({ lit }: { lit: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const t = useRef(0)
  if (lit) PayoffState.lit = true
  useFrame((_, dt) => {
    t.current = lit ? Math.min(1, t.current + dt * 0.7) : 0
    const k = t.current
    if (ring.current && mat.current) {
      const e = k * k * (3 - 2 * k)
      ring.current.scale.setScalar(0.4 + e * 7)
      mat.current.opacity = (1 - e) * 0.4
      ring.current.visible = k > 0 && k < 1
    }
  })
  return (
    <mesh ref={ring} position={[5.0, 0.12, -0.8]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.9, 1.0, 48]} />
      <meshBasicMaterial ref={mat} color="#ffd9a0" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/* ------------------------------ ledge + rack ------------------------------- */

/** The rock outcrop with the page rack on top; handhold wall on its SW face.
 *  A stepped stack of warm clay boulders — reads as stones, not a slab. */
function LedgeWall() {
  const side = useRef<THREE.Mesh>(null)
  const top = useRef<THREE.Mesh>(null)
  core.useBlocker(side)
  core.useWalkable(top)
  // knoll + crown + tuft + pebble as ONE mesh
  const knoll = useMemo<Prim[]>(() => [
    { g: 'sph', p: [-0.04, 0.2, 0.04], s: [2.1, 0.8, 1.96], c: '#dcc9a2' },
    { g: 'sph', p: [0.1, 0.58, -0.02], s: [1.64, 0.68, 1.52], c: '#e7d6b0' },
    { g: 'cyl', p: [0, LEDGE_TOP - 0.1, 0], s: [1.12, 0.22, 1.4], c: '#a7bd80' },
    { g: 'cone', p: [-0.3, LEDGE_TOP + 0.05, -0.2], s: [0.18, 0.16, 0.18], c: C.leafDark },
    { g: 'dod', p: [0.15, LEDGE_TOP + 0.03, -0.35], s: [0.18, 0.15, 0.18], c: C.stone },
  ], [])
  // handholds + vine rope as ONE mesh (in wall-group local coords)
  const holds = useMemo<Prim[]>(() => [
    ...([[-0.18, 0.3], [0.12, 0.48], [-0.1, 0.64], [0.16, 0.78], [-0.05, 0.9]] as const).map(([x, y]): Prim => (
      { g: 'cyl', p: [x, y, -0.02], s: [0.044, 0.16, 0.056], r: [Math.PI / 2.4, 0, 0], c: C.woodLight }
    )),
    ...([[-0.3, 0.28], [0.3, 0.18]] as const).map(([x, r]): Prim => (
      { g: 'cyl', p: [x, LEDGE_TOP / 2, -0.04], s: [0.032, LEDGE_TOP, 0.052], r: [0, 0, r], c: C.leafDark }
    )),
    { g: 'sph', p: [-0.3, LEDGE_TOP - 0.08, -0.02], s: [0.14, 0.12, 0.14], c: C.leaf },
    { g: 'sph', p: [0.28, LEDGE_TOP - 0.2, -0.02], s: [0.14, 0.12, 0.14], c: C.leaf },
  ], [])
  return (
    <group position={[LEDGE.x, 0, LEDGE.z]}>
      {/* invisible collider: the climb face the player pushes against */}
      <mesh ref={side} position={[0, 0.4, 0]} visible={false}>
        <cylinderGeometry args={[0.88, 1.12, LEDGE_TOP - 0.07, 18]} />
      </mesh>
      {/* invisible flat cap the player actually stands on */}
      <mesh ref={top} position={[0, LEDGE_TOP - 0.02, 0]} visible={false}>
        <cylinderGeometry args={[0.68, 0.68, 0.08, 20]} />
      </mesh>
      {/* a low two-stone knoll + crown + tuft + pebble — ONE merged mesh */}
      <Merged items={knoll} />
      {/* handholds + a vine rope down the SW face — ONE merged mesh */}
      <group position={[WALL_AT.x - LEDGE.x, 0, WALL_AT.z - LEDGE.z]} rotation={[0, Math.atan2(WALL_AT.x - LEDGE.x, WALL_AT.z - LEDGE.z) + Math.PI, 0]}>
        <Merged items={holds} />
      </group>
    </group>
  )
}

/** Wooden rack holding the loose pages on the ledge top — ONE merged mesh. */
function Rack() {
  const prims = useMemo<Prim[]>(() => [
    { g: 'box', p: [-0.55, 0.3, -0.2], s: [0.05, 0.66, 0.06], r: [-0.28, 0, 0], c: C.wood },
    { g: 'box', p: [0.55, 0.3, -0.2], s: [0.05, 0.66, 0.06], r: [-0.28, 0, 0], c: C.wood },
    { g: 'cyl', p: [0, 0.5, -0.32], s: [0.04, 1.2, 0.04], r: [0, 0, Math.PI / 2], c: C.wood },
    { g: 'box', p: [0, 0.04, 0.02], s: [1.24, 0.06, 0.34], c: C.wood },
    { g: 'box', p: [-0.34, 0.075, 0.02], s: [0.03, 0.06, 0.34], c: C.woodLight },
    { g: 'box', p: [0, 0.075, 0.02], s: [0.03, 0.06, 0.34], c: C.woodLight },
    { g: 'box', p: [0.34, 0.075, 0.02], s: [0.03, 0.06, 0.34], c: C.woodLight },
  ], [])
  return (
    <group position={[RACK.x, RACK.y, RACK.z]} rotation={[0, RACK_YAW, 0]}>
      <Merged items={prims} />
    </group>
  )
}

/* ------------------------------ the crossing ------------------------------- */

/** Stone lip on the rim where the grass path ends and the void begins. */
function Abutment() {
  const pad = useRef<THREE.Mesh>(null)
  core.useWalkable(pad)
  return (
    <group position={[ABUT.x, 0, ABUT.z]} rotation={[0, GAPS[0].yaw, 0]}>
      <RoundedBox ref={pad as any} args={[1.5, 0.16, 1.1]} radius={0.05} position={[0.35, 0.02, 0]} material={clay(C.stone)} castShadow receiveShadow />
      <mesh position={[-0.35, 0.02, 0]} material={clay('#b8a88e')} receiveShadow>
        <cylinderGeometry args={[0.62, 0.7, 0.1, 16]} />
      </mesh>
      {[[1.0, -0.48], [1.0, 0.48]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.26, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.035, 0.045, 0.52, 6]} /></mesh>
          <mesh position={[0, 0.55, 0]} material={clay(C.terracotta)} castShadow><sphereGeometry args={[0.055, 8, 6]} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** One floating stone platform over the void: lathe rock + flat paving pad + stubs. */
function Platform({ p, i }: { p: THREE.Vector3; i: number }) {
  const pad = useRef<THREE.Mesh>(null)
  core.useWalkable(pad)
  const toPrev = i === 0 ? ABUT : PLATS[i - 1]
  const toNext = i < PLATS.length - 1 ? PLATS[i + 1] : PLANK_TO
  const yawIn = Math.atan2(toPrev.x - p.x, toPrev.z - p.z)
  const yawOut = Math.atan2(toNext.x - p.x, toNext.z - p.z)
  return (
    <group position={p}>
      {/* a real floating boulder under each pad — platform_stone is a flat
          paver; fit-scaling it to 1.58 blew it up into a ~17 m dark slab */}
      <Prop name={['quat_rock', 'quat_rock_2', 'quat_rock_3'][i % 3]} position={[0, -1.46, 0]} rotation={[0, i * 1.25 + 0.4, 0]} fit={1.48} />
      <mesh ref={pad} position={[0, -0.02, 0]} material={clay('#cfc4ae')} receiveShadow castShadow>
        <cylinderGeometry args={[0.8, 0.84, 0.08, 18]} />
      </mesh>
      {/* plank stubs jutting toward each gap edge */}
      {[yawIn, yawOut].map((yaw, k) => (
        <group key={k} rotation={[0, yaw, 0]}>
          {[-0.16, 0.16].map((x, j) => (
            <RoundedBox key={j} args={[0.16, 0.05, 0.5]} radius={0.015} position={[x, 0.045, 0.92]}
              rotation={[0.06 * (j ? 1 : -1), 0, 0]} material={clay(j ? C.woodLight : C.wood)} castShadow />
          ))}
        </group>
      ))}
      {/* a leaning post with a frayed rope end */}
      <mesh position={[Math.sin(yawIn + 2.6) * 0.68, 0.22, Math.cos(yawIn + 2.6) * 0.68]}
        rotation={[0.1, 0, 0.08]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.44, 6]} />
      </mesh>
      <mesh position={[Math.sin(yawOut - 2.6) * 0.68, 0.2, Math.cos(yawOut - 2.6) * 0.68]}
        rotation={[-0.08, 0, -0.1]} material={clay(C.wood)} castShadow>
        <cylinderGeometry args={[0.028, 0.036, 0.4, 6]} />
      </mesh>
    </group>
  )
}

/** Ghost outline hovering in an unfilled gap; fades out once its slab lands. */
function GapSlot({ g, open }: { g: { c: THREE.Vector3; yaw: number }; open: () => boolean }) {
  const grp = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const t = useRef(0)
  useFrame((s, dt) => {
    t.current += ((open() ? 1 : 0) - t.current) * Math.min(1, dt * 3)
    if (grp.current) grp.current.visible = t.current > 0.02
    if (mat.current) mat.current.opacity = t.current * (REDUCED ? 0.16 : 0.13 + Math.sin(s.clock.elapsedTime * 1.7) * 0.05)
    if (grp.current) grp.current.position.y = g.c.y + 0.01 + (REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 1.2 + g.c.x) * 0.02)
  })
  return (
    <group ref={grp} position={[g.c.x, g.c.y, g.c.z]} rotation={[0, g.yaw, 0]}>
      <mesh>
        <boxGeometry args={[PAGE_W - 0.15, 0.018, PAGE_H - 0.14]} />
        <meshBasicMaterial ref={mat} color="#ffefc8" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Sagging wooden gangplank from the last platform down to the south landing. */
function Plank({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const walk = useRef<THREE.Mesh>(null)
  core.useWalkable(walk)
  const mid = from.clone().lerp(to, 0.5)
  const len = from.distanceTo(to)
  const yaw = Math.atan2(from.x - to.x, from.z - to.z)
  return (
    <group position={[mid.x, 0.0, mid.z]} rotation={[0, yaw, 0]}>
      {Array.from({ length: 7 }).map((_, i) => (
        <RoundedBox key={i} args={[0.62, 0.055, len / 7 - 0.035]} radius={0.015}
          position={[(i % 2 ? 0.012 : -0.012), 0.02 - Math.sin((i / 6) * Math.PI) * 0.03, len / 2 - (i + 0.5) * (len / 7)]}
          material={clay(i % 2 ? C.wood : C.woodLight)} castShadow receiveShadow />
      ))}
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, -0.01, 0]} material={clay(C.wood)} castShadow>
          <boxGeometry args={[0.05, 0.06, len + 0.1]} />
        </mesh>
      ))}
      {/* the real walking surface (flat, so raycast footing is certain) */}
      <mesh ref={walk} position={[0, 0.0, 0]} visible={false}>
        <boxGeometry args={[0.6, 0.08, len]} />
      </mesh>
    </group>
  )
}

/* ------------------------------- site fence -------------------------------- */

function SiteFence() {
  const blkW = useRef<THREE.Mesh>(null)
  const blkE = useRef<THREE.Mesh>(null)
  core.useBlocker(blkW)
  core.useBlocker(blkE)
  // slat pickets along a gentle arc — TWO runs: a gate opening where the main
  // path crosses (|x|<1.3), and the east run ends before the gangplank crossing.
  // A single wall would be purged by the z-corridor rule AND the pickets stood
  // right on the path / through the plank.
  const runs = useMemo(() => {
    const all: { x: number; z: number; h: number }[] = []
    for (let i = 0; i <= 26; i++) {
      const x = -4.15 + (i / 26) * 8.3
      const z = FENCE_Z - 0.12 * Math.sin((x / 4.15) * Math.PI * 0.5) - 0.1
      all.push({ x, z, h: 0.78 + (i % 2) * 0.05 })
    }
    return [all.filter((p) => p.x <= -1.5), all.filter((p) => p.x >= 1.5 && p.x <= 3.45)]
  }, [])
  const rail = useMemo(() => runs.flatMap((pts) => {
    const a = pts.map((p) => new THREE.Vector3(p.x, 0.62, p.z))
    const b = pts.map((p) => new THREE.Vector3(p.x, 0.34, p.z))
    return [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(a), 40, 0.024, 5),
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(b), 40, 0.02, 5)]
  }), [runs])
  const gates = useMemo<Prim[]>(() => [-1.3, 1.3].map((x) => ({
    g: 'box' as const,
    p: [x, 0.52, FENCE_Z - 0.12 * Math.sin((x / 4.15) * Math.PI * 0.5) - 0.1] as [number, number, number],
    s: [0.11, 1.04, 0.08] as [number, number, number],
    c: C.wood,
  })), [])
  // all pickets + gate posts as ONE merged mesh
  const pickets = useMemo<Prim[]>(() => [...gates, ...runs.flat().map((p, i) => ({
    g: 'box' as const,
    p: [p.x, p.h / 2, p.z] as [number, number, number],
    s: [0.07, p.h, 0.05] as [number, number, number],
    c: i % 3 ? C.wood : C.woodLight,
  }))], [runs, gates])
  const sign = useMemo<Prim[]>(() => [
    { g: 'cyl', p: [0, 0.3, 0], s: [0.05, 0.6, 0.064], c: C.wood },
    { g: 'box', p: [0, 0.62, 0], s: [0.5, 0.26, 0.035], r: [0, 0, -0.06], c: '#f4e6c4' },
    { g: 'box', p: [0.05, 0.62, 0.025], s: [0.22, 0.045, 0.012], c: C.terracotta },
    { g: 'box', p: [0.17, 0.62, 0.025], s: [0.1, 0.045, 0.012], r: [0, 0, -Math.PI / 4], c: C.terracotta },
  ], [])
  return (
    <group>
      <Merged items={pickets} />
      {rail.map((g, i) => <mesh key={i} geometry={g} material={clay(C.woodLight)} castShadow />)}
      {/* invisible walls on the two flanks — the corridor gap and the plank
          crossing stay open (the old single wall crossed the path corridor and
          was purged on load, so the fence never actually fenced) */}
      <mesh ref={blkW} position={[-2.875, 0.6, FENCE_Z - 0.15]} visible={false}>
        <boxGeometry args={[3.15, 1.4, 0.5]} />
      </mesh>
      <mesh ref={blkE} position={[2.375, 0.6, FENCE_Z - 0.15]} visible={false}>
        <boxGeometry args={[2.15, 1.4, 0.5]} />
      </mesh>
      {/* rocks tying the fence ends into the rim */}
      <Rock position={[-4.0, 0.1, -3.15]} s={0.55} yaw={0.8} />
      <Rock position={[-3.6, 0.08, -3.5]} s={0.4} yaw={1.9} />
      <Rock position={[3.1, 0.1, -3.0]} s={0.35} yaw={0.3} />
      <Rock position={[4.15, 0.08, -3.55]} s={0.32} yaw={2.4} />
      {/* a little leaning site sign by the path — ONE merged mesh */}
      <group position={[3.15, 0, -2.45]} rotation={[0, -0.5, 0.04]}>
        <Merged items={sign} />
      </group>
    </group>
  )
}

/* --------------------------------- studio ---------------------------------- */

/** The weekend studio: workbench, the V4 browser-frame easel, awning, stool, crates.
 *  Static clay merged into THREE meshes (studio/easel/frame) — was ~35 draws. */
function Studio({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  const studio = useMemo<Prim[]>(() => {
    const p: Prim[] = []
    // awning: four posts + warm cloth + stripes
    for (const [x, z] of [[-0.95, -0.75], [0.95, -0.75], [-0.95, 0.75], [0.95, 0.75]] as const) {
      p.push({ g: 'cyl', p: [x, 0.7, z], s: [0.07, 1.4, 0.09], c: C.wood })
    }
    p.push(
      { g: 'box', p: [0, 1.44, 0], s: [2.2, 0.05, 1.8], r: [0, 0, 0.02], c: '#f4e6c4' },
      { g: 'box', p: [-0.7, 1.4, 0], s: [0.3, 0.055, 1.82], c: '#f4e6c4' },
      { g: 'box', p: [0, 1.4, 0], s: [0.3, 0.055, 1.82], c: '#eecfb0' },
      { g: 'box', p: [0.7, 1.4, 0], s: [0.3, 0.055, 1.82], c: '#f4e6c4' },
      // workbench (at [-0.2,0,0.15])
      { g: 'box', p: [-0.2, 0.58, 0.15], s: [1.5, 0.07, 0.62], c: C.woodLight },
      { g: 'box', p: [-0.82, 0.29, 0.15], s: [0.08, 0.58, 0.5], c: C.wood },
      { g: 'box', p: [0.42, 0.29, 0.15], s: [0.08, 0.58, 0.5], c: C.wood },
      // little pages mid-ship + flat sheet
      { g: 'box', p: [-0.58, 0.65, 0.1], s: [0.34, 0.05, 0.26], r: [0, 0.2, 0], c: '#f4e6c4' },
      { g: 'box', p: [-0.56, 0.7, 0.11], s: [0.3, 0.04, 0.24], r: [0, 0.12, 0], c: '#efe4cd' },
      { g: 'box', p: [-0.15, 0.66, 0.23], s: [0.4, 0.008, 0.3], r: [0, 0.3, 0], c: '#e8d6b8' },
      // mug + tool pot + tools
      { g: 'cyl', p: [0.3, 0.67, 0.01], s: [0.09, 0.09, 0.076], c: C.terracotta },
      { g: 'cyl', p: [0.42, 0.66, 0.27], s: [0.1, 0.1, 0.084], c: C.brick },
      { g: 'cyl', p: [0.4, 0.76, 0.25], s: [0.018, 0.18, 0.024], r: [0, 0, 0.2], c: C.wood },
      { g: 'cyl', p: [0.45, 0.75, 0.29], s: [0.018, 0.18, 0.024], r: [0, 0, -0.25], c: C.wood },
      // crates
      { g: 'box', p: [-1.05, 0.12, 0.55], s: [0.3, 0.24, 0.3], r: [0, 0.4, 0], c: C.earth },
      { g: 'box', p: [-1.0, 0.33, 0.5], s: [0.24, 0.18, 0.24], r: [0, 0.9, 0], c: C.earthDark },
    )
    return p
  }, [])
  const easel = useMemo<Prim[]>(() => [
    { g: 'box', p: [-0.67, 0.74, -0.03], s: [0.1, 1.52, 0.1], r: [0, 0, 0.1], c: C.wood },
    { g: 'box', p: [0.67, 0.74, -0.03], s: [0.1, 1.52, 0.1], r: [0, 0, -0.1], c: C.wood },
    { g: 'box', p: [0, 0.34, -0.05], s: [1.2, 0.08, 0.08], c: C.woodLight },
    { g: 'box', p: [0, 0.6, -0.38], s: [0.1, 1.4, 0.1], r: [-0.3, 0, 0], c: C.wood },
    { g: 'box', p: [0, 0.49, 0.06], s: [1.36, 0.08, 0.18], c: C.woodLight },
  ], [])
  const frame = useMemo<Prim[]>(() => {
    const p: Prim[] = [
      { g: 'box', p: [0, 1.13, 0], s: [1.52, 1.2, 0.09], c: C.cream },
      { g: 'box', p: [0, 1.62, 0.005], s: [1.5, 0.22, 0.1], c: C.sand },
      { g: 'sph', p: [-0.63, 1.63, 0.06], s: [0.068, 0.068, 0.068], c: C.brick },
      { g: 'sph', p: [-0.51, 1.63, 0.06], s: [0.068, 0.068, 0.068], c: '#e0b26a' },
      { g: 'sph', p: [-0.39, 1.63, 0.06], s: [0.068, 0.068, 0.068], c: C.leaf },
      { g: 'box', p: [0.27, 1.63, 0.055], s: [0.72, 0.09, 0.02], c: '#f4e6c4' },
      // the shipped page — all three pieces seated, warm
      { g: 'box', p: [0, 1.06, 0.052], s: [1.34, 0.9, 0.02], c: '#f4e6c4' },
      { g: 'box', p: [0, 1.36, 0.068], s: [1.06, 0.22, 0.015], c: C.terracotta },
      { g: 'box', p: [-0.42, 0.98, 0.068], s: [0.56, 0.52, 0.015], c: C.water },
      { g: 'sph', p: [-0.5, 0.86, 0.075], s: [0.45, 0.26, 0.13], c: C.moss },
      { g: 'cyl', p: [0.42, 0.85, 0.068], s: [0.5, 0.02, 0.5], r: [Math.PI / 2, 0, 0], c: C.leaf },
      { g: 'sph', p: [0.42, 0.85, 0.08], s: [0.09, 0.09, 0.09], c: '#f4e6c4' },
    ]
    // little people who came to see it
    ;[-0.55, -0.18, 0.18, 0.55].forEach((x, i) => {
      p.push(
        { g: 'cyl', p: [x, 0.13, 1.02], s: [0.12, 0.22, 0.12], c: [C.terracotta, C.leafDark, C.water, C.brick][i] },
        { g: 'sph', p: [x, 0.27, 1.02], s: [0.124, 0.124, 0.124], c: C.cream },
      )
    })
    return p
  }, [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Merged items={studio} />
      {/* a small laptop + book stack — the weekend shipping rig */}
      <Prop name="laptop" position={[-0.04, 0.615, 0.07]} rotation={[0, -0.4, 0]} fit={0.14} />
      <Prop name="book_set" position={[-0.8, 0.615, 0.27]} rotation={[0, 0.5, 0]} fit={0.1} />
      {/* the V4 easel: a giant clay browser window, page shipped and lit */}
      <group position={[0.9, 0, -0.42]} rotation={[0, -0.5, 0]} scale={1.15}>
        <Merged items={easel} />
        <group rotation={[-0.08, 0, 0]}>
          <Merged items={frame} />
        </group>
      </group>
      {/* stool */}
      <Prop name="stool" position={[0.1, 0, 0.85]} rotation={[0, 0.5, 0]} fit={0.42} />
    </group>
  )
}

/* --------------------------------- tufts ----------------------------------- */

function Tufts() {
  // seeded grass + flowers as ONE merged mesh (was 26 GLB draws)
  const items = useMemo<Prim[]>(() => {
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 7.3) * 43758.5453; return x - Math.floor(x) }
    const out: Prim[] = []
    const kinds = ['grass', 'grass', 'plant', 'flower_yellow', 'flower_red']
    for (let i = 0; i < 26; i++) {
      const a = rnd(i * 3) * Math.PI * 2, d = 1.2 + rnd(i * 3 + 1) * 3.3
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      if (z < -2.4 || (x > 1.8 && z > 1.4) || Math.hypot(x - 0.5, z - 3.2) < 1.6) continue
      const s = 0.16 + rnd(i) * 0.14, r = rnd(i * 7) * 3, k = kinds[i % kinds.length]
      if (k === 'grass') {
        out.push({ g: 'cone', p: [x, s * 0.55, z], s: [s * 0.8, s * 1.1, s * 0.8], r: [0, r, 0], c: i % 2 ? C.moss : '#a7bd80' })
      } else if (k === 'plant') {
        out.push({ g: 'cone', p: [x, s * 0.35, z], s: [s, s * 0.7, s], r: [0, r, 0], c: C.leafDark })
      } else {
        const head = k === 'flower_yellow' ? '#e8c25e' : '#c96a4e'
        out.push(
          { g: 'cone', p: [x, s * 0.5, z], s: [s * 0.22, s, s * 0.22], c: C.moss },
          { g: 'sph', p: [x, s * 1.05, z], s: [s * 0.5, s * 0.42, s * 0.5], c: head },
        )
      }
    }
    return out
  }, [])
  return <Merged items={items} />
}
