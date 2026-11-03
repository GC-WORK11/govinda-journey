/**
 * I01 "Stillness" — calm interlude by the water.
 * A shallow pond east of the path, a bench facing it (E = sit a while), reeds,
 * lily pads, a leaning willow, drifting fireflies, a stone lantern toward the exit.
 * No task: complete() fires as soon as the traveller passes the mid-line (z < 0).
 *
 * Island-local frame: top y=0, entry (0,0,4.2), exit (0,0,-4.2), r=5.
 */
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import {
  C, clay, REDUCED, useLocalPlayer, tpLocal, tpWorld, useSolver, useAt, Hint,
  PathStones, Rock, Mound, StoneLantern, sleep,
} from '../L03/shared.v5'

/* --------------------------------- layout --------------------------------- */

const POND = new THREE.Vector3(1.25, 0, -0.35)
const POND_RX = 2.05, POND_RZ = 1.5
const BENCH = new THREE.Vector3(-1.72, 0, -0.35)
const BENCH_YAW = Math.PI / 2 // faces +x, toward the pond
const WILLOW = new THREE.Vector3(2.7, 0, 1.45)

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const lp = useMemo(() => new THREE.Vector3(), [])
  useLocalPlayer(root, lp)
  const doneRef = useRef(done)
  const [sitting, setSitting] = useState(false)

  /* ------------------------------ bench sit -------------------------------- */

  const sit = useRef({ on: false, t: 0, phase: 0, from: new THREE.Vector3(), back: new THREE.Vector3() })
  const tmpV = useMemo(() => new THREE.Vector3(), [])
  const seatLocal = useMemo(() => BENCH.clone().add(new THREE.Vector3(0, 0.0, 0)), [])
  const backLocal = useMemo(() => new THREE.Vector3(BENCH.x - Math.sin(BENCH_YAW) * 0.72, 0, BENCH.z - Math.cos(BENCH_YAW) * 0.72), [])

  const benchAt = useAt(root, BENCH.x - 0.4, 0.45, BENCH.z)
  const sitIt = useMemo<core.Interactable>(() => ({
    id: 'i01-bench', at: benchAt, radius: 1.25, label: 'sit for a moment',
    enabled: () => !sit.current.on,
    use: () => {
      if (sit.current.on) return
      sit.current.on = true
      sit.current.phase = 0
      sit.current.t = 0
      sit.current.from.copy(core.player.pos)
      if (root.current) root.current.worldToLocal(sit.current.from)
      sit.current.back.copy(backLocal)
      core.player.frozen = true
      const em = (core as any).playerEmote
      if (em) em.name = 'sit'
      setSitting(true)
    },
  }), [benchAt, backLocal])
  core.useInteractable(sitIt)

  useFrame((s, dt) => {
    // completion: crossing to the exit half
    if (!doneRef.current && lp.z < 0) { doneRef.current = true; complete() }
    const st = sit.current
    if (st.on) {
      st.t += dt
      const ease = (x: number) => x * x * (3 - 2 * x)
      if (st.phase === 0) {                    // glide to the seat
        const k = ease(Math.min(1, st.t / 0.8))
        tmpV.lerpVectors(st.from, seatLocal, k)
        tmpV.y += Math.sin(k * Math.PI) * 0.12
        if (st.t >= 0.8) { st.phase = 1; st.t = 0 }
      } else if (st.phase === 1) {             // seated, watching the water
        tmpV.copy(seatLocal)
        tmpV.y += REDUCED ? 0 : Math.sin(s.clock.elapsedTime * 1.1) * 0.006
        core.player.facing = BENCH_YAW
        if (st.t >= (REDUCED ? 2.2 : 4.2)) { st.phase = 2; st.t = 0 }
      } else {                                 // stand back at the path
        const k = ease(Math.min(1, st.t / 0.7))
        tmpV.lerpVectors(seatLocal, st.back, k)
        tmpV.y += Math.sin(k * Math.PI) * 0.1
        if (st.t >= 0.7) {
          st.on = false
          core.player.frozen = false
          const em = (core as any).playerEmote
          if (em) em.name = null
          setSitting(false)
        }
      }
      const w = tmpV.clone()
      if (root.current) root.current.localToWorld(w)
      tpWorld(w)
    }
  })

  /* --------------------------------- solver --------------------------------- */

  useSolver(id, async () => {
    const r = root.current
    if (!r) return
    tpLocal(r, new THREE.Vector3(BENCH.x - 0.7, 0.1, BENCH.z))
    await sleep(150)
    core.interactables.get('i01-bench')?.use()
    await sleep(REDUCED ? 3200 : 5600)
    tpLocal(r, new THREE.Vector3(0, 0.1, -1.2))
    await sleep(300)
  })

  /* --------------------------------- render --------------------------------- */

  return (
    <group ref={root}>
      {/* path along the west shore */}
      <PathStones pts={[[0, 4.2], [-0.5, 3.4], [-1.3, 2.4], [-1.65, 1.2], [-1.75, 0], [-1.6, -1.4], [-1.0, -2.6], [-0.3, -3.6], [0, -4.2]]} seed={4} />

      {/* pond: sandy bank, shallow water, ripple rings */}
      <mesh position={[POND.x, 0.015, POND.z]} scale={[1, 1, POND_RZ / POND_RX]} material={clay(C.sand)} receiveShadow>
        <cylinderGeometry args={[POND_RX + 0.32, POND_RX + 0.38, 0.05, 48]} />
      </mesh>
      <mesh position={[POND.x, 0.055, POND.z]} scale={[1, 1, POND_RZ / POND_RX]}>
        <cylinderGeometry args={[POND_RX, POND_RX + 0.05, 0.07, 48]} />
        <meshStandardMaterial color="#8fc1c9" roughness={0.35} metalness={0} transparent opacity={0.92} />
      </mesh>
      <Ripples />
      <LilyPads />

      {/* stepping stones into the shallows */}
      {[[-0.4, 0.85], [0.35, 1.15], [1.1, 1.1]].map(([x, z], i) => (
        <SteppingStone key={i} position={[POND.x + x - 1.0, 0, POND.z + z - 0.6]} s={0.38 - i * 0.05} />
      ))}

      <Bench pos={BENCH} yaw={BENCH_YAW} />
      <Willow pos={WILLOW} />
      <Reeds />
      <Fireflies active={active} />

      {/* dressing */}
      <StoneLantern position={[0.6, 0, -3.3]} lit={done} />
      <Rock position={[-3.3, 0.09, 1.4]} s={0.5} yaw={0.7} />
      <Rock position={[-2.9, 0.06, -2.2]} s={0.32} yaw={1.8} block={false} />
      <Rock position={[3.9, 0.1, -1.9]} s={0.44} yaw={2.6} />
      <Mound position={[-3.4, 0, -0.6]} r={1.0} h={0.36} />
      <Mound position={[2.2, 0, -3.3]} r={0.85} h={0.28} />
      <Tufts />

      <Hint text="sit a while" position={[BENCH.x, 0.95, BENCH.z]}
        show={() => active && !sitting && (lp.x - BENCH.x) ** 2 + (lp.z - BENCH.z) ** 2 < 6.5} size={0.28} />
    </group>
  )
}

/* --------------------------------- pieces --------------------------------- */

function Bench({ pos, yaw }: { pos: THREE.Vector3; yaw: number }) {
  const seat = useRef<THREE.Mesh>(null)
  core.useWalkable(seat) // lets the sit pose rest on the seat
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {/* seat planks */}
      {[-0.14, 0.0, 0.14].map((z, i) => (
        <RoundedBox key={i} args={[1.1, 0.05, 0.12]} radius={0.015} position={[0, 0.32, z]}
          material={clay(i === 1 ? C.woodLight : C.wood)} castShadow receiveShadow />
      ))}
      {/* back planks */}
      {[0.56, 0.7].map((y, i) => (
        <RoundedBox key={i} args={[1.1, 0.09, 0.05]} radius={0.015} position={[0, y, 0.26]} rotation={[-0.16, 0, 0]}
          material={clay(C.wood)} castShadow />
      ))}
      {/* legs + back posts */}
      {[[-0.44, -0.1], [0.44, -0.1], [-0.44, 0.16], [0.44, 0.16]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.16, z]} material={clay(C.earthDark)} castShadow>
          <boxGeometry args={[0.06, 0.32, 0.08]} />
        </mesh>
      ))}
      {[-0.44, 0.44].map((x) => (
        <mesh key={x} position={[x, 0.5, 0.27]} rotation={[-0.16, 0, 0]} material={clay(C.earthDark)} castShadow>
          <boxGeometry args={[0.06, 0.52, 0.07]} />
        </mesh>
      ))}
      {/* invisible flat seat for the sit */}
      <mesh ref={seat} position={[0, 0.3, 0]} visible={false}>
        <boxGeometry args={[1.0, 0.1, 0.42]} />
      </mesh>
    </group>
  )
}

function Willow({ pos }: { pos: THREE.Vector3 }) {
  const canopy = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (canopy.current && !REDUCED) canopy.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.5) * 0.018
  })
  return (
    <group position={pos} rotation={[0, -0.6, 0]}>
      <mesh position={[0.1, 0.7, 0]} rotation={[0, 0, 0.16]} material={clay(C.earthDark)} castShadow>
        <cylinderGeometry args={[0.09, 0.15, 1.5, 7]} />
      </mesh>
      <mesh position={[0.28, 1.35, 0]} rotation={[0, 0, 0.34]} material={clay(C.earthDark)} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.9, 6]} />
      </mesh>
      <group ref={canopy} position={[0.42, 1.95, 0]}>
        <mesh material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.95, 16, 12]} /></mesh>
        <mesh position={[-0.7, -0.15, 0.2]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.6, 14, 10]} /></mesh>
        <mesh position={[0.5, -0.3, -0.45]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.55, 12, 10]} /></mesh>
        {/* drooping strands toward the water */}
        {[[-0.75, -0.7, 0.15], [-0.45, -0.82, 0.5], [0.15, -0.9, -0.62], [0.62, -0.72, -0.28], [0.72, -0.6, 0.3], [-0.18, -0.85, -0.66]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.12 * Math.sin(i), 0, 0.1 * Math.cos(i * 2)]} material={clay(C.leafDark)}>
            <cylinderGeometry args={[0.012, 0.026, 0.7, 5]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Reeds() {
  const clumps: { p: [number, number]; n: number; seed: number }[] = [
    { p: [POND.x - POND_RX - 0.15, POND.z - 0.4], n: 7, seed: 2 },
    { p: [POND.x + POND_RX * 0.55, POND.z - POND_RZ - 0.1], n: 8, seed: 5 },
    { p: [POND.x + POND_RX + 0.05, POND.z + 0.5], n: 6, seed: 8 },
    { p: [POND.x - 0.3, POND.z + POND_RZ + 0.15], n: 5, seed: 11 },
  ]
  return (
    <group>
      {clumps.map((c, ci) => {
        const rnd = (n: number) => { const x = Math.sin(c.seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) }
        return (
          <group key={ci}>
            {Array.from({ length: c.n }).map((_, i) => {
              const a = rnd(i * 3) * Math.PI * 2, d = rnd(i * 3 + 1) * 0.22
              const h = 0.42 + rnd(i * 3 + 2) * 0.35
              const x = c.p[0] + Math.cos(a) * d, z = c.p[1] + Math.sin(a) * d
              return (
                <group key={i}>
                  <mesh position={[x, h / 2 + 0.04, z]} rotation={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]}
                    material={clay(i % 3 ? C.leafDark : C.moss)} castShadow>
                    <cylinderGeometry args={[0.011, 0.019, h, 5]} />
                  </mesh>
                  {i % 3 === 0 && (
                    <mesh position={[x, h + 0.08, z]} material={clay('#8a6748')} castShadow>
                      <capsuleGeometry args={[0.028, 0.1, 4, 7]} />
                    </mesh>
                  )}
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

function LilyPads() {
  const padGeo = useMemo(() => new THREE.CircleGeometry(1, 20, 0.4, 5.5), [])
  const pads: [number, number, number, number][] = [
    [-0.7, -0.5, 0.24, 0.4], [0.6, -0.75, 0.2, 2.4], [0.15, 0.2, 0.17, 4.1],
    [1.15, 0.35, 0.21, 1.5], [-1.15, 0.25, 0.18, 3.2],
  ]
  return (
    <group>
      {pads.map(([x, z, r, rot], i) => (
        <group key={i} position={[POND.x + x, 0.098, POND.z + z]} rotation={[-Math.PI / 2, 0, rot]}>
          <mesh geometry={padGeo} scale={[r, r * 0.9, 1]} material={clay(i % 2 ? C.leaf : C.leafDark)} receiveShadow />
        </group>
      ))}
      {/* one small lotus bud */}
      <mesh position={[POND.x - 0.68, 0.14, POND.z - 0.52]} material={clay('#e9b3a5')} castShadow>
        <sphereGeometry args={[0.05, 10, 8]} />
      </mesh>
      <mesh position={[POND.x - 0.68, 0.11, POND.z - 0.52]} material={clay(C.leafDark)}>
        <sphereGeometry args={[0.035, 8, 6]} />
      </mesh>
    </group>
  )
}

function SteppingStone({ position, s }: { position: [number, number, number]; s: number }) {
  const ref = useRef<THREE.Mesh>(null)
  core.useWalkable(ref)
  return (
    <mesh ref={ref} position={[position[0], 0.045, position[2]]} scale={[s, s * 0.42, s * 0.85]}
      material={clay(C.stone)} castShadow receiveShadow>
      <sphereGeometry args={[1, 14, 10]} />
    </mesh>
  )
}

function Ripples() {
  const ref = useRef<THREE.Group>(null)
  const geo = useMemo(() => new THREE.RingGeometry(0.86, 0.94, 48), [])
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({
    color: '#eef6f2', transparent: true, opacity: 0, depthWrite: false,
  })), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current?.children.forEach((child, i) => {
      const k = (t * 0.11 + i / 3) % 1
      child.scale.setScalar(0.4 + k * 0.85)
      mats[i].opacity = REDUCED ? 0 : 0.3 * (1 - k)
    })
  })
  return (
    <group ref={ref} position={[POND.x, 0.1, POND.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, POND_RZ / POND_RX, 1]}>
      {mats.map((m, i) => <mesh key={i} geometry={geo} material={m} />)}
    </group>
  )
}

/** Warm dots drifting low over the water — always on, just calmer when idle. */
function Fireflies({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const tex = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64
    const ctx = cv.getContext('2d')!
    const gr = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.4, 'rgba(255,196,120,.55)'); gr.addColorStop(1, 'rgba(255,196,120,0)')
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(cv)
  }, [])
  const seeds = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    a: i * 1.7, r: 0.5 + (i % 4) * 0.42, y: 0.3 + (i % 5) * 0.14, sp: 0.14 + (i % 3) * 0.05,
  })), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current?.children.forEach((m, i) => {
      const f = seeds[i]
      const a = t * f.sp * (active ? 1.25 : 1) + f.a
      m.position.set(
        POND.x + Math.cos(a) * f.r * 1.6,
        f.y + Math.sin(t * 0.7 + f.a * 2) * 0.09,
        POND.z + Math.sin(a * 1.13) * f.r * 1.1,
      )
      const mat = (m as THREE.Sprite).material as THREE.SpriteMaterial
      mat.opacity = 0.5 + Math.sin(t * 1.7 + f.a * 3) * 0.3
    })
  })
  return (
    <group ref={ref}>
      {seeds.map((_, i) => (
        <sprite key={i} scale={[0.14, 0.14, 1]}>
          <spriteMaterial map={tex} transparent opacity={0.6} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

function Tufts() {
  const items = useMemo(() => {
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 3.1) * 43758.5453; return x - Math.floor(x) }
    const out: { x: number; z: number; s: number; r: number; c: string }[] = []
    for (let i = 0; i < 30; i++) {
      const a = rnd(i * 3) * Math.PI * 2, d = 1.4 + rnd(i * 3 + 1) * 3.2
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      const inPond = ((x - POND.x) / (POND_RX + 0.5)) ** 2 + ((z - POND.z) / (POND_RZ + 0.5)) ** 2 < 1
      const onPath = Math.abs(x + 1.2) < 0.7 && z > -3.8 && z < 3.4
      if (inPond || onPath) continue
      out.push({ x, z, s: 0.7 + rnd(i) * 0.6, r: rnd(i * 7) * 3, c: rnd(i * 5) > 0.5 ? C.leafDark : C.moss })
    }
    return out
  }, [])
  return (
    <group>
      {items.map((t, i) => (
        <mesh key={i} position={[t.x, 0.07 * t.s, t.z]} rotation={[0.1, t.r, 0.08]} scale={t.s} material={clay(t.c)} castShadow>
          <coneGeometry args={[0.07, 0.15, 5]} />
        </mesh>
      ))}
    </group>
  )
}
