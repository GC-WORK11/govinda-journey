import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { PlayProps } from '../types'
import { C, clay } from '../../world/kit'
import { useHoldAnywhere, glowMat, pulse, Bob, Pop, burst, blip, chime, useLocalToWorld, REDUCED } from '../../world/play'

/* Oval loop through the open front of the island, clear of the traveller at (-0.9, 1.4). */
const CX = 0.95, CZ = 1.3, RX = 1.3, RZ = 0.7
const STATION = Math.PI / 2           // theta of the platform — front of the oval
const LAP = Math.PI * 2
const ARRIVE = 0.9                    // auto-brake begins this many radians before the station
const VMAX = 2.2, ACC = 2.8
const RAIL_Y = 0.135                  // top of the rails — vehicle origin height
const OFFS = [0, 0.6, 1.14]           // arc offset of engine, carriage 1, carriage 2
const TEAL = '#8ea5a0'

const posAt = (th: number): [number, number] => [CX + Math.cos(th) * RX, CZ + Math.sin(th) * RZ]
const rotYAt = (th: number) => Math.atan2(-Math.cos(th) * RZ, -Math.sin(th) * RX)

/** Rounded ballast ring + two rail rings + merged sleepers. */
function Track() {
  const sleepers = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1)
    const N = 30
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2
      const [x, z] = posAt(th)
      e.set(0, rotYAt(th), 0); q.setFromEuler(e)
      const g = new THREE.BoxGeometry(0.09, 0.04, 0.36)
      g.applyMatrix4(m.compose(new THREE.Vector3(x, 0.088, z), q, sc))
      geos.push(g)
    }
    const merged = mergeGeometries(geos, false)!
    geos.forEach((g) => g.dispose())
    return merged
  }, [])
  return (
    <group>
      <mesh position={[CX, 0.03, CZ]} rotation={[Math.PI / 2, 0, 0]} scale={[RX, RZ, 0.35]} material={clay(C.stone)} castShadow receiveShadow>
        <torusGeometry args={[1, 0.19, 10, 72]} />
      </mesh>
      <mesh geometry={sleepers} material={clay(C.wood)} receiveShadow />
      {[-0.115, 0.115].map((o) => (
        <mesh key={o} position={[CX, RAIL_Y - 0.02, CZ]} rotation={[Math.PI / 2, 0, 0]} scale={[RX + o, RZ + o, 1]} material={clay(C.earthDark)}>
          <torusGeometry args={[1, 0.02, 8, 72]} />
        </mesh>
      ))}
    </group>
  )
}

/** Platform slab on the front of the oval + glowing pennant flag (the goal). */
function Station() {
  const flagMat = useMemo(() => glowMat('#f2b35e', C.terracotta), [])
  useFrame(({ clock }, dt) => pulse(flagMat, true, clock.elapsedTime, dt))
  return (
    <group name="i02-station">
      <RoundedBox args={[1.05, 0.1, 0.3]} radius={0.04} smoothness={3} position={[0.95, 0.05, 2.36]} material={clay(C.stoneLight)} castShadow receiveShadow />
      <RoundedBox args={[1.05, 0.045, 0.06]} radius={0.02} smoothness={3} position={[0.95, 0.1, 2.52]} material={clay(C.terracotta)} castShadow />
      <Bob amp={0.045} speed={1.8} position={[1.38, 0.1, 2.36]}>
        <mesh position={[0, 0.29, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.02, 0.026, 0.58, 8]} /></mesh>
        <RoundedBox args={[0.2, 0.12, 0.025]} radius={0.02} smoothness={2} position={[0.11, 0.5, 0]} material={flagMat} castShadow />
        <mesh position={[0.22, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} material={flagMat}>
          <coneGeometry args={[0.06, 0.11, 3]} />
        </mesh>
      </Bob>
    </group>
  )
}

/** Round wheel with a rim dot so the spin is readable. spin.current = arc travelled. */
function Wheel({ r, side, spin, position }: { r: number; side: 1 | -1; spin: { current: number }; position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.rotation.z = -spin.current / r })
  return (
    <group ref={g} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={clay(C.earthDark)} castShadow>
        <cylinderGeometry args={[r, r, 0.055, 14]} />
      </mesh>
      <mesh position={[0, r * 0.55, side * 0.033]} material={clay(C.sand)}>
        <sphereGeometry args={[r * 0.26, 8, 6]} />
      </mesh>
    </group>
  )
}

/** Chimney steam: trickle at idle, quick puffs at speed. Lives in engine-local space. */
function Puffs({ st }: { st: { current: { speed: number } } }) {
  const g = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0e8da', transparent: true, opacity: 0, depthWrite: false }), [])
  useFrame(({ clock }, dt) => {
    const sp = st.current.speed
    const rate = (REDUCED ? 0.4 : 0.35 + sp * 0.9)
    mat.opacity += ((sp > 0.05 ? 0.55 : 0.25) - mat.opacity) * Math.min(1, dt * 4)
    g.current?.children.forEach((c, i) => {
      const p = (clock.elapsedTime * rate + i / 3) % 1
      c.position.set(0.21 - p * 0.14 + Math.sin(p * 3 + i * 2) * 0.05, 0.68 + p * 0.4, Math.cos(p * 2.4 + i) * 0.045)
      c.scale.setScalar(0.35 + p * 1.5)
    })
  })
  return (
    <group ref={g}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={mat}><sphereGeometry args={[0.045, 8, 6]} /></mesh>
      ))}
    </group>
  )
}

function Engine({ spin, st }: { spin: { current: number }; st: { current: { speed: number } } }) {
  return (
    <group>
      <RoundedBox args={[0.52, 0.11, 0.3]} radius={0.035} smoothness={3} position={[0, 0.2, 0]} material={clay(C.earthDark)} castShadow />
      <mesh position={[0.08, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.terracotta)} castShadow>
        <cylinderGeometry args={[0.145, 0.145, 0.32, 16]} />
      </mesh>
      <mesh position={[0.24, 0.4, 0]} material={clay(C.terracotta)} castShadow><sphereGeometry args={[0.145, 16, 12]} /></mesh>
      <mesh position={[0.03, 0.545, 0]} material={clay(C.brick)} castShadow><sphereGeometry args={[0.06, 10, 8]} /></mesh>
      <mesh position={[0.21, 0.58, 0]} material={clay(C.earthDark)} castShadow><cylinderGeometry args={[0.042, 0.055, 0.16, 10]} /></mesh>
      <mesh position={[0.21, 0.665, 0]} material={clay(C.brick)} castShadow><cylinderGeometry args={[0.065, 0.055, 0.035, 10]} /></mesh>
      <RoundedBox args={[0.24, 0.32, 0.3]} radius={0.04} smoothness={3} position={[-0.15, 0.44, 0]} material={clay(C.cream)} castShadow />
      <RoundedBox args={[0.3, 0.06, 0.37]} radius={0.03} smoothness={3} position={[-0.15, 0.62, 0]} material={clay(C.terracotta)} castShadow />
      {[1, -1].map((s) => (
        <mesh key={s} position={[-0.15, 0.46, s * 0.152]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.water)}>
          <cylinderGeometry args={[0.05, 0.05, 0.025, 12]} />
        </mesh>
      ))}
      <mesh position={[-0.32, 0.2, 0]} material={clay(C.earthDark)}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
      {[0.15, -0.15].map((x) => ([1, -1] as const).map((s) => (
        <Wheel key={`${x}${s}`} r={0.115} side={s} spin={spin} position={[x, 0.115, s * 0.16]} />
      )))}
      <Puffs st={st} />
    </group>
  )
}

function Carriage({ spin, color, roof }: { spin: { current: number }; color: string; roof: string }) {
  return (
    <group>
      <RoundedBox args={[0.36, 0.24, 0.3]} radius={0.05} smoothness={3} position={[0, 0.31, 0]} material={clay(color)} castShadow />
      <RoundedBox args={[0.42, 0.07, 0.35]} radius={0.03} smoothness={3} position={[0, 0.46, 0]} material={clay(roof)} castShadow />
      {[1, -1].map((s) => ([-0.09, 0.09].map((x) => (
        <mesh key={`${s}${x}`} position={[x, 0.33, s * 0.152]} rotation={[Math.PI / 2, 0, 0]} material={clay(C.water)}>
          <cylinderGeometry args={[0.047, 0.047, 0.025, 12]} />
        </mesh>
      ))))}
      <mesh position={[-0.23, 0.2, 0]} material={clay(C.earthDark)}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
      {[-0.11, 0.11].map((x) => ([1, -1] as const).map((s) => (
        <Wheel key={`${x}${s}`} r={0.09} side={s} spin={spin} position={[x, 0.09, s * 0.16]} />
      )))}
    </group>
  )
}

/** Little clay passenger; pops up on the platform and waves. */
function Passenger({ position, delay, coat }: { position: [number, number, number]; delay: number; coat: string }) {
  const arm = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (arm.current && !REDUCED) arm.current.rotation.z = -0.7 + Math.sin(clock.elapsedTime * 7 + delay * 9) * 0.45
  })
  return (
    <Pop delay={delay} from={0} position={position}>
      <mesh position={[0, 0.06, 0]} material={clay(coat)} castShadow><capsuleGeometry args={[0.06, 0.11, 6, 10]} /></mesh>
      <mesh position={[0, 0.17, 0]} material={clay('#f0cdb0')} castShadow><sphereGeometry args={[0.085, 12, 10]} /></mesh>
      <group ref={arm} position={[0.075, 0.1, 0]} rotation={[0, 0, -0.7]}>
        <mesh position={[0.02, 0.05, 0]} material={clay('#f0cdb0')} castShadow><capsuleGeometry args={[0.022, 0.09, 4, 8]} /></mesh>
      </group>
    </Pop>
  )
}

export default function Play({ onWin, won }: PlayProps) {
  const [worldRef, toWorld] = useLocalToWorld()
  const holding = useHoldAnywhere(!won)
  const veh = useRef<(THREE.Group | null)[]>([])
  const inn = useRef<(THREE.Group | null)[]>([])
  const spin = useRef(0)
  const s = useRef({ angle: STATION, speed: 0, arrived: false, wasH: false, pump: 0, fired: false })

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const st = s.current
    const t = clock.elapsedTime
    const rem = STATION + LAP - st.angle

    if (holding && !st.wasH && rem > ARRIVE && !won) { st.pump = 1; blip(1) }
    st.wasH = holding

    if (!st.arrived) {
      // fixed substeps so game time tracks real time even at low frame rates
      let acc = Math.min(rawDt, 0.15)
      while (acc > 0 && !st.arrived) {
        const h = Math.min(acc, 1 / 60)
        acc -= h
        const left = STATION + LAP - st.angle
        const want = left <= ARRIVE ? Math.max(0.34, left * 2.6) : holding && !won ? VMAX : 0
        if (want > st.speed) st.speed = Math.min(want, st.speed + ACC * h)
        else {
          st.speed += (want - st.speed) * Math.min(1, h * 3.2)
          if (want === 0 && st.speed < 0.02) st.speed = 0
        }
        st.angle += st.speed * h
        spin.current += st.speed * Math.hypot(Math.sin(st.angle) * RX, Math.cos(st.angle) * RZ) * h
        if (st.angle >= STATION + LAP) {
          st.angle = STATION + LAP; st.speed = 0; st.arrived = true
          burst(toWorld(0.95, 0.5, 2.35), '#f2b35e', 22, 0.9)
          blip(3); setTimeout(() => chime(), 260)
          if (!st.fired) { st.fired = true; onWin() }
        }
      }
    }

    st.pump = Math.max(0, st.pump - dt * 3)
    const R = Math.hypot(Math.sin(st.angle) * RX, Math.cos(st.angle) * RZ)
    const drive = Math.min(1, st.speed / VMAX)
    const roll = REDUCED ? 0 : st.speed * 0.045 + Math.sin(t * 5.2) * 0.012 * drive + Math.sin(t * 1.7) * 0.01 * (1 - drive)
    const bobY = REDUCED ? 0 : Math.sin(t * 6.5) * 0.006 * drive
    for (let i = 0; i < 3; i++) {
      const g = veh.current[i]; if (!g) continue
      const th = st.angle - OFFS[i] / R
      const [x, z] = posAt(th)
      g.position.set(x, RAIL_Y + bobY * (1 - i * 0.2), z)
      g.rotation.y = rotYAt(th)
      const ig = inn.current[i]
      if (ig) {
        ig.rotation.x = roll
        if (i === 0) { const p = st.pump; ig.scale.set(1 + p * 0.06, 1 - p * 0.08, 1 + p * 0.06) }
      }
    }
  })

  const setVeh = (i: number) => (g: THREE.Group | null) => { veh.current[i] = g }
  const setInn = (i: number) => (g: THREE.Group | null) => { inn.current[i] = g }

  return (
    <group ref={worldRef}>
      <Pop delay={0.05}>
        <Track />
        <Station />
        <group name="i02-train">
          {[0, 1, 2].map((i) => (
            <group key={i} ref={setVeh(i)}>
              <group ref={setInn(i)}>
                {i === 0 ? <Engine spin={spin} st={s} /> : i === 1 ? <Carriage spin={spin} color={C.cream} roof={C.terracotta} /> : <Carriage spin={spin} color={TEAL} roof={C.cream} />}
              </group>
            </group>
          ))}
        </group>
        {won && (
          <>
            <Passenger position={[0.6, 0.1, 2.34]} delay={0.15} coat={C.terracotta} />
            <Passenger position={[0.95, 0.1, 2.41]} delay={0.35} coat={TEAL} />
            <Passenger position={[1.2, 0.1, 2.33]} delay={0.55} coat={C.leaf} />
          </>
        )}
      </Pop>
    </group>
  )
}
