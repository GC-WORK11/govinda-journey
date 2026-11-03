/**
 * L07 Wispr Wrap — the obstacle for the Wispr Wrap island.
 *
 * A garden door blocks the exit. A small robot stands on a floating shelf across
 * a gap, holding a phone. E at the console (needs `remote`) drifts the shelf in
 * close. The laptop by the door shows a word ("open"); E at the robot's phone
 * opens a soft listen sheet — Web Speech if it is there, a typed line otherwise.
 * The word's letters fly from the phone to the laptop; the laptop types it; the
 * door swings open on a warm light → complete() → grants `voice`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import VoiceUI from './VoiceUI.v5'
import { C, clay, DoorWall, Robot, Console, SideTable, Laptop, BlockBox, letterTexture, makeCanvasTexture } from './kit.v5'

type Phase = 'wait' | 'calling' | 'ready' | 'listen' | 'send' | 'open'

const WORD = 'open'

/* layout (island-local) */
const CONSOLE_POS = new THREE.Vector3(3.15, 0, -0.7)
const SHELF_FAR = new THREE.Vector3(6.1, -0.14, -0.7)
const SHELF_NEAR = new THREE.Vector3(4.85, -0.1, -0.7)
const DOOR_Z = -3.3
const TABLE_POS = new THREE.Vector3(-1.75, 0, -2.68)
const SCREEN_LOCAL = TABLE_POS.clone().add(new THREE.Vector3(0, 0.62, 0.1))

/* a small flat floating shelf the robot stands on */
function Shelf({ seed = 7, ...p }: { seed?: number } & { position?: [number, number, number] }) {
  const geo = useMemo(() => {
    const prof: [number, number][] = [[0.001, 0.04], [0.8, 0.035], [1.0, -0.05], [0.92, -0.22], [0.7, -0.5], [0.42, -0.75], [0.15, -0.92], [0.001, -1.0]]
    const g = new THREE.LatheGeometry(prof.map(([px, py]) => new THREE.Vector2(px * 1.05, py * 1.05)), 36)
    const pos = g.attributes.position as THREE.BufferAttribute
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const rad = Math.hypot(x, z); if (rad < 1e-3) continue
      const a = Math.atan2(z, x)
      const k = 1 + 0.06 * Math.sin(a * 5 + seed) + 0.05 * (rnd(i) - 0.5)
      pos.setX(i, x * k); pos.setZ(i, z * k)
    }
    g.computeVertexNormals()
    const arr = new Float32Array(pos.count * 3)
    const top = new THREE.Color(C.leaf), rock = new THREE.Color('#b19d82'), tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      tmp.copy(pos.getY(i) > -0.04 ? top : rock)
      arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    return g
  }, [seed])
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }), [])
  return <mesh {...p} geometry={geo} material={vc} castShadow receiveShadow />
}

/* letters that fly phone → laptop along a soft arc */
function Letters({ text, from, to, onChar, onDone }: {
  text: string
  from: THREE.Vector3
  to: THREE.Vector3
  onChar: (i: number, ch: string) => void
  onDone: () => void
}) {
  const g = useRef<THREE.Group>(null)
  const items = useMemo(() => {
    const chars = text.replace(/\s+/g, ' ').slice(0, 16).split('')
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.15, 0))
    return chars.map((ch, i) => ({
      ch, i,
      tex: letterTexture(ch === ' ' ? '·' : ch),
      t0: i * 0.14, dur: 1.15,
      curve: new THREE.QuadraticBezierCurve3(from, mid, to),
      arrived: false,
    }))
  }, [text, from, to])
  const doneCount = useRef(0)
  const landed = useRef<Set<number>>(new Set())
  useFrame((state) => {
    if (!g.current) return
    const u = g.current.userData
    u.t0 ??= state.clock.elapsedTime
    const t = state.clock.elapsedTime - u.t0
    items.forEach((it, i) => {
      const spr = g.current!.children[i] as THREE.Sprite
      if (!spr) return
      const k = THREE.MathUtils.clamp((t - it.t0) / it.dur, 0, 1)
      if (k <= 0) { spr.visible = false; return }
      spr.visible = true
      const e = k * k * (3 - 2 * k)
      it.curve.getPoint(e, spr.position)
      const s = 0.16 + Math.sin(e * Math.PI) * 0.05
      spr.scale.set(s, s * 1.33, 1)
      ;(spr.material as THREE.SpriteMaterial).opacity = k > 0.9 ? (1 - k) * 10 : 1
      if (k >= 1 && !landed.current.has(i)) {
        landed.current.add(i)
        onChar(i, it.ch)
        doneCount.current++
        spr.visible = false
        if (doneCount.current >= items.length) onDone()
      }
    })
  })
  return (
    <group ref={g}>
      {items.map((it) => (
        <sprite key={it.i} visible={false}>
          <spriteMaterial map={it.tex} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

/* laptop screen states: idle → ask → typed → done */
function paintScreen(ctx: CanvasRenderingContext2D, mode: 'idle' | 'ask' | 'typed' | 'done', word: string, typed: string) {
  const w = ctx.canvas.width, h = ctx.canvas.height
  ctx.fillStyle = '#2f2a26'; ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (mode === 'idle') {
    ctx.fillStyle = '#5c5348'; ctx.font = '400 9px Inter, sans-serif'
    ctx.fillText('waiting…', w / 2, h / 2)
  } else if (mode === 'ask') {
    ctx.fillStyle = '#9b8f80'; ctx.font = '400 8px Inter, sans-serif'
    ctx.fillText('the door listens for', w / 2, h * 0.3)
    ctx.fillStyle = '#e8d6b8'; ctx.font = '600 24px Fraunces, Georgia, serif'
    ctx.fillText(word, w / 2, h * 0.62)
  } else {
    ctx.fillStyle = '#9b8f80'; ctx.font = '400 8px Inter, sans-serif'
    ctx.fillText('heard on the phone', w / 2, h * 0.22)
    ctx.fillStyle = mode === 'done' ? '#f0c98a' : '#e8d6b8'
    ctx.font = '600 20px Fraunces, Georgia, serif'
    ctx.fillText(typed, w / 2, h * 0.58)
    if (mode === 'typed') { ctx.fillRect(w / 2 + ctx.measureText(typed).width / 2 + 3, h * 0.47, 2, 20) }
  }
  ctx.textAlign = 'start'
}

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const [phase, setPhase] = useState<Phase>(done ? 'open' : 'wait')
  const [flight, setFlight] = useState<{ text: string; from: THREE.Vector3; to: THREE.Vector3 } | null>(null)

  const shelf = useRef<THREE.Group>(null)
  const shelfT = useRef(done ? 1 : 0)
  const doorT = useRef(done ? 1 : 0)
  const robot = useRef<THREE.Group>(null)
  const phoneRef = useRef<THREE.Group>(null)
  const consoleMarker = useRef<THREE.Object3D>(null)
  const consoleAt = useRef(new THREE.Vector3())
  const phoneAt = useRef(new THREE.Vector3())
  const lantern = useRef<THREE.Mesh>(null)
  const submitRef = useRef<(t: string) => void>(() => {})

  const screen = useMemo(() => makeCanvasTexture(160, 100, (c) => paintScreen(c, 'idle', WORD, '')), [])
  const screenMode = useRef<'idle' | 'ask' | 'typed' | 'done'>(done ? 'done' : 'idle')

  const phaseRef = useRef(phase); phaseRef.current = phase
  const setScreen = (m: typeof screenMode.current, typed = '') => {
    screenMode.current = m
    screen.redraw((c) => paintScreen(c, m, WORD, typed))
  }

  /* ---------- interactables ---------- */
  const consoleInteract = useMemo<core.Interactable>(() => ({
    id: 'l07-console',
    at: () => (consoleMarker.current ? consoleMarker.current.getWorldPosition(consoleAt.current) : consoleAt.current),
    radius: 1.5,
    label: 'Call the robot',
    enabled: () => core.has('remote') && phaseRef.current === 'wait',
    use: () => setPhase('calling'),
  }), [])
  const speakInteract = useMemo<core.Interactable>(() => ({
    id: 'l07-speak',
    at: () => (phoneRef.current ? phoneRef.current.getWorldPosition(phoneAt.current) : phoneAt.current),
    radius: 1.6,
    label: 'Say the word',
    enabled: () => phaseRef.current === 'ready',
    use: () => setPhase('listen'),
  }), [])
  core.useInteractable(consoleInteract)
  core.useInteractable(speakInteract)

  /* ---------- submit → letters fly → door ---------- */
  const pendingText = useRef('')
  submitRef.current = (t: string) => {
    const text = t.trim().toLowerCase() || WORD
    setPhase('send')
    if (!root.current || !phoneRef.current) return
    const from = root.current.worldToLocal(phoneRef.current.getWorldPosition(new THREE.Vector3()))
    pendingText.current = ''
    setFlight({ text, from, to: SCREEN_LOCAL.clone() })
  }

  const onChar = (_i: number, ch: string) => {
    pendingText.current += ch === '·' ? ' ' : ch
    setScreen('typed', pendingText.current)
  }
  const onFlightDone = () => {
    setScreen('done', pendingText.current || WORD)
    setPhase('open')
    setTimeout(() => complete(), 2100)
  }

  /* ---------- freeze while the sheet is up ---------- */
  useEffect(() => {
    core.player.frozen = phase === 'listen'
  }, [phase])
  useEffect(() => () => { core.player.frozen = false }, [])

  /* ---------- solve hook (?qa) ---------- */
  useEffect(() => {
    if (!location.search.includes('qa')) return
    const w = window as any
    const J = (w.__journey ??= {})
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const tp = (l: THREE.Vector3, dx = 0, dz = 0) => {
      const v = l.clone().add(new THREE.Vector3(dx, 0, dz))
      root.current?.localToWorld(v)
      core.player.pos.copy(v); core.player.vel.set(0, 0, 0)
    }
    J.solve = {
      ...(J.solve || {}),
      [id]: async () => {
        if (!core.has('remote')) core.useV5.getState().grant('remote') // QA shortcut: pretend L06 was played
        tp(CONSOLE_POS, -0.8, 0.3)
        await sleep(500)
        core.interactables.get('l07-console')?.use()
        for (let i = 0; i < 100 && phaseRef.current !== 'ready'; i++) await sleep(100)
        tp(SHELF_NEAR, -1.1, 0.2)
        await sleep(400)
        core.interactables.get('l07-speak')?.use()
        await sleep(600)
        submitRef.current(WORD) // the same call the sheet's Send runs
        for (let i = 0; i < 120 && phaseRef.current !== 'open'; i++) await sleep(100)
      },
    }
    return () => { if (J.solve) delete J.solve[id] }
  }, [id])

  /* ---------- frame ---------- */
  const tmp = useRef({ a: new THREE.Vector3(), col: new THREE.Color() })
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const { a, col } = tmp.current

    /* shelf drifts in and snugs against the rim */
    const targetT = phaseRef.current === 'wait' ? 0 : 1
    if (shelfT.current !== targetT) {
      shelfT.current += (targetT - shelfT.current) * Math.min(1, dt * 1.1)
      if (Math.abs(shelfT.current - targetT) < 0.005) shelfT.current = targetT
      if (shelfT.current >= 0.999 && phaseRef.current === 'calling') {
        setPhase('ready')
        setScreen('ask')
      }
    }
    if (shelf.current) {
      const k = shelfT.current
      const e = k * k * (3 - 2 * k)
      shelf.current.position.lerpVectors(SHELF_FAR, SHELF_NEAR, e)
      shelf.current.position.y = THREE.MathUtils.lerp(SHELF_FAR.y, SHELF_NEAR.y, e) + Math.sin(t * 1.4) * 0.03 * (1 - e * 0.7)
      shelf.current.rotation.z = Math.sin(t * 1.1) * 0.012 * (1 - e)
    }

    /* door swing */
    const dTarget = phaseRef.current === 'open' ? 1 : 0
    if (Math.abs(doorT.current - dTarget) > 0.001) {
      doorT.current += (dTarget - doorT.current) * Math.min(1, dt * 1.15)
    }

    /* lantern warms as the door opens */
    if (lantern.current) {
      const m = lantern.current.material as THREE.MeshBasicMaterial
      m.color.lerp(col.set(phaseRef.current === 'open' ? C.warm : '#8a7f6d'), Math.min(1, dt * 2.4))
      m.opacity = 0.35 + doorT.current * 0.6
    }

    /* robot gently leans toward the player when ready */
    if (robot.current && phaseRef.current === 'ready') {
      a.copy(core.player.pos)
      root.current?.worldToLocal(a)
      robot.current.rotation.y = -Math.PI / 2 + Math.atan2(a.x - shelf.current!.position.x, a.z - shelf.current!.position.z) * 0.15
    }
  })

  useEffect(() => { if (done) { setPhase('open'); setScreen('done', WORD) } }, [done])

  return (
    <group ref={root}>
      {/* ------- garden wall + the door ------- */}
      <DoorWall position={[0, 0, DOOR_Z]} w={6.4} doorT={doorT} />
      {/* flank boulders so the wall meets the rim */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 3.75, 0.28, DOOR_Z + 0.15]} material={clay(C.stone)} castShadow><dodecahedronGeometry args={[0.5, 1]} /></mesh>
          <mesh position={[s * 4.25, 0.2, DOOR_Z + 0.55]} material={clay(C.stoneLight)} castShadow><dodecahedronGeometry args={[0.36, 1]} /></mesh>
          <mesh position={[s * 3.5, 0.5, DOOR_Z - 0.1]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.42, 12, 9]} /></mesh>
          <BlockBox position={[s * 3.9, 0.8, DOOR_Z]} args={[1.6, 1.7, 1.2]} />
        </group>
      ))}
      <BlockBox position={[-2.4, 0.75, DOOR_Z]} args={[2.4, 1.6, 0.5]} />
      <BlockBox position={[2.4, 0.75, DOOR_Z]} args={[2.4, 1.6, 0.5]} />
      {/* the door itself blocks until it swings */}
      <BlockBox position={[0, 0.9, DOOR_Z]} args={[1.7, 1.9, 0.45]} on={doorT.current < 0.5 && phase !== 'open'} />

      {/* lantern post by the door */}
      <group position={[1.25, 0, DOOR_Z + 0.55]}>
        <mesh position={[0, 0.55, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.035, 0.05, 1.1, 7]} /></mesh>
        <mesh position={[0, 1.12, 0]} material={clay(C.wood)} castShadow><boxGeometry args={[0.16, 0.05, 0.16]} /></mesh>
        <mesh ref={lantern} position={[0, 1.02, 0]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshBasicMaterial color="#8a7f6d" transparent opacity={0.35} />
        </mesh>
        <mesh position={[0, 1.02, 0]} material={clay(C.ink2)}><boxGeometry args={[0.11, 0.13, 0.11]} /></mesh>
      </group>
      <BlockBox position={[1.25, 0.55, DOOR_Z + 0.55]} args={[0.14, 1.1, 0.14]} />

      {/* ------- the gap + the robot's floating shelf ------- */}
      <group ref={shelf} position={done ? SHELF_NEAR : SHELF_FAR}>
        <Shelf />
        <group ref={robot} position={[0, 0.02, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Robot phoneRef={phoneRef}>
            {/* the listen sheet anchors to the phone in the robot's hand */}
            {phase === 'listen' && (
              <Html fullscreen zIndexRange={[200, 0]}>
                <VoiceUI word={WORD} onSubmit={(t) => submitRef.current(t)} onClose={() => setPhase('ready')} />
              </Html>
            )}
          </Robot>
        </group>
        <BlockBox position={[0, -0.02, 0]} args={[1.5, 0.1, 1.5]} kind="walk" on={shelfT.current > 0.9} />
      </group>
      {/* little floating pebbles in the gap */}
      {[[4.55, 0.25, -0.35], [4.9, 0.1, -1.2], [4.35, 0.18, -0.9]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} material={clay(C.stoneLight)} castShadow>
          <dodecahedronGeometry args={[0.05 + i * 0.02, 0]} />
        </mesh>
      ))}
      {/* a mooring post where the shelf docks */}
      <group position={[4.55, 0, -0.7]}>
        <mesh position={[0, 0.17, 0]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.045, 0.055, 0.34, 7]} /></mesh>
        <mesh position={[0, 0.36, 0]} material={clay(C.woodLight)} castShadow><sphereGeometry args={[0.06, 8, 6]} /></mesh>
      </group>

      {/* ------- console (needs remote) ------- */}
      <group position={CONSOLE_POS} rotation={[0, -Math.PI / 2, 0]}>
        <Console on={phase === 'calling' || phase === 'ready'} />
      </group>
      <BlockBox position={CONSOLE_POS.clone().add(new THREE.Vector3(0, 0.35, 0)).toArray() as [number, number, number]} args={[0.44, 0.7, 0.36]} />
      <object3D ref={consoleMarker} position={CONSOLE_POS.clone().add(new THREE.Vector3(0, 0.5, 0))} />

      {/* ------- laptop on its side table by the door ------- */}
      <group position={TABLE_POS} rotation={[0, 0.35, 0]}>
        <SideTable />
        <group position={[0, 0.44, 0]} rotation={[0, 0.15, 0]}>
          <Laptop s={0.85} open={0.5}>
            <mesh position={[0, 0, 0.001]}>
              <planeGeometry args={[0.5, 0.32]} />
              <meshBasicMaterial map={screen.tex} toneMapped={false} />
            </mesh>
          </Laptop>
        </group>
        <BlockBox position={[0, 0.25, 0]} args={[0.6, 0.5, 0.44]} />
      </group>

      {/* ------- dressing ------- */}
      <mesh position={[-3.4, 0.28, 2.6]} material={clay(C.wood)} castShadow><cylinderGeometry args={[0.055, 0.08, 0.56, 7]} /></mesh>
      <mesh position={[-3.4, 0.75, 2.6]} material={clay(C.leaf)} castShadow><sphereGeometry args={[0.4, 14, 11]} /></mesh>
      <mesh position={[-3.15, 0.6, 2.75]} material={clay(C.leafDark)} castShadow><sphereGeometry args={[0.25, 12, 9]} /></mesh>
      {[[-2.0, 0.7], [1.8, 2.2], [-4.2, -0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.045, z]} material={clay(i % 2 ? C.stone : C.moss)} castShadow>
          <dodecahedronGeometry args={[0.12, 0]} />
        </mesh>
      ))}
      {/* a few violets by the door — it is the Wispr island */}
      {[[-1.2, -2.9], [-0.9, -2.6], [2.1, -2.75]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.06, 0]} material={clay(C.leafDark)}><coneGeometry args={[0.05, 0.12, 5]} /></mesh>
          <mesh position={[0, 0.14, 0]} material={clay(C.violet)}><sphereGeometry args={[0.045, 8, 6]} /></mesh>
        </group>
      ))}

      {/* letters flying */}
      {flight && (
        <Letters
          text={flight.text}
          from={flight.from}
          to={flight.to}
          onChar={onChar}
          onDone={() => { setFlight(null); onFlightDone() }}
        />
      )}
    </group>
  )
}
