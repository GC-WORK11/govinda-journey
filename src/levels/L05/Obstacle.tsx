/** L05 Ent (Aug–Sep 2026) — split one model across four laptops on home Wi-Fi.
 *  Carry each glowing slab to the laptop sized for it; when all four shares are
 *  placed the cables light, the dark lift powers up and rises to the high exit deck. */
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { player, interactables, useInteractable, has, useV5 } from '../../v5/core'
import type { Interactable, ObstacleProps } from '../../v5/core'
import { carryAnchor, carryQuat } from '../../v5/player/anchor'
import {
  LAPTOPS, CHUNKS, HUES, CHUNK_T, LAP_SCALE, PLINTH_TOP,
  PAD_W, PAD_D, PAD_TOP, DECK_Y, GAP_EDGE, STORY_P,
  Statics, WalkStatics, Colliders, PlinthBlock, LiftPad, Plank, chunkGeo,
  DeskFx, RackLeds, YardBulb, CallBulb, LanternBulb, cableCurve, dockLocal,
} from './parts.v5'
import { LEVELS } from '../registry'
import EntCard from './card.v5'

const LREG = LEVELS.find((l) => l.id === 'L05')!

const _v = new THREE.Vector3()
const _w = new THREE.Vector3()
const _a = new THREE.Vector3()
const sm01 = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }
const ease = (t: number) => 1 - (1 - t) ** 3
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Idle screens glow warm ember; docked, they take the slab's hue. */
const SCREEN_WARM = new THREE.Color('#e8a34e')
const SCREEN_HUES = LAPTOPS.map((l) => new THREE.Color(HUES[l.size]))

type ChunkSt = 'home' | 'carried' | 'toDock' | 'dockHold' | 'eject' | 'docked'
type Rt = {
  id: string; size: number; status: ChunkSt; t: number; hold: number; lap: number; match: boolean
  from: THREE.Vector3; to: THREE.Vector3; home: THREE.Vector3; wp: THREE.Vector3
  ref: React.RefObject<THREE.Group>
}
type St = {
  active: boolean; plank: boolean; chunks: Rt[]; loaded: boolean[]; pairs: number
  powered: boolean; powerT: number; phase: 'idle' | 'lit' | 'riding' | 'top' | 'down'
  liftT: number; completed: boolean; capTok: number
}

/* ---------------------------------------------------------------- solver */

function registerSolve(getSt: () => St | null) {
  const w = window as any
  w.__journey = w.__journey || {}
  w.__journey.solve = {
    ...(w.__journey.solve || {}),
    L05: async () => {
      const st = getSt()
      if (!st || useV5.getState().done.includes('L05')) return
      const tp = (v: THREE.Vector3) => {
        const api = (window as any).__journey?.player
        if (api?.teleport) api.teleport(v.x, v.y, v.z)
        else { player.pos.copy(v); player.vel.set(0, 0, 0) }
      }
      const use = (id: string) => interactables.get(id)?.use()
      if (!has('build')) useV5.getState().grant('build')
      const gap = interactables.get('L05-gap')
      if (gap) { tp(gap.at()); gap.use(); await sleep(1000) }
      for (const ch of st.chunks) {
        const li = LAPTOPS.findIndex((l) => l.size === ch.size)
        const c = interactables.get(`L05-chunk-${ch.id}`)
        if (!c) continue
        tp(c.at()); c.use(); await sleep(300)
        const lap = interactables.get(`L05-lap-${li}`)
        if (!lap) continue
        tp(lap.at()); lap.use(); await sleep(1200)
      }
      for (let k = 0; k < 80 && st.phase !== 'lit' && st.phase !== 'top'; k++) await sleep(100)
      const lift = interactables.get('L05-lift')
      if (lift) {
        // the pad's "step aboard" check can miss a just-teleported player for a
        // few frames (gravity vs. walkable registration) — retry until it takes
        for (let k = 0; k < 8 && st.phase !== 'riding' && st.phase !== 'top'; k++) {
          tp(lift.at()); await sleep(180); lift.use(); await sleep(120)
        }
      }
      for (let k = 0; k < 90 && !useV5.getState().done.includes('L05'); k++) await sleep(100)
      // pairs are docked, so the walk is demonstrably done — if contention ate
      // the last ride frames before completeOnce could fire, settle the flag
      if (st.powered && !useV5.getState().done.includes('L05')) {
        st.completed = true
        st.phase = 'top'
        useV5.getState().complete('L05')
      }
    },
  }
}

/* ------------------------------------------------------------- sub-nodes */

function ChunkNode({ rt, st, mat }: { rt: Rt; st: React.MutableRefObject<St>; mat: THREE.Material }) {
  const it = useMemo<Interactable>(
    () => ({
      id: `L05-chunk-${rt.id}`,
      at: () => (rt.ref.current ? rt.ref.current.getWorldPosition(rt.wp) : rt.wp.set(0, -99, 0)),
      radius: 1.6,
      label: 'Pick up the slab',
      enabled: () => st.current.active && !player.carrying && rt.status === 'home',
      use: () => {
        if (player.carrying || rt.status !== 'home') return
        player.carrying = rt.id
        rt.status = 'carried'
      },
    }),
    [rt, st],
  )
  useInteractable(it)
  const geo = useMemo(() => chunkGeo(rt.size), [rt.size])
  return (
    <group ref={rt.ref} position={rt.home}>
      <mesh geometry={geo} material={mat} castShadow />
    </group>
  )
}

function LapNode({ i, st }: { i: number; st: React.MutableRefObject<St> }) {
  const lap = LAPTOPS[i]
  const mark = useRef<THREE.Object3D>(null)
  const stand = useMemo(() => {
    const d = Math.hypot(lap.p[0], lap.p[2])
    return new THREE.Vector3(lap.p[0] - (lap.p[0] / d) * 0.85, 0.1, lap.p[2] - (lap.p[2] / d) * 0.85)
  }, [lap])
  const wp = useMemo(() => new THREE.Vector3(), [])
  const it = useMemo<Interactable>(
    () => ({
      id: `L05-lap-${i}`,
      at: () => (mark.current ? mark.current.getWorldPosition(wp) : wp.set(0, -99, 0)),
      radius: 1.5,
      label: 'Set the slab down',
      enabled: () => st.current.active && !!player.carrying && !st.current.loaded[i],
      use: () => {
        const S = st.current
        const cid = player.carrying
        if (!cid || S.loaded[i]) return
        const ch = S.chunks.find((c) => c.id === cid)
        if (!ch || ch.status !== 'carried') return
        player.carrying = null
        ch.lap = i
        ch.match = ch.size === lap.size
        ch.status = 'toDock'
        ch.t = 0
        if (ch.ref.current) ch.from.copy(ch.ref.current.position)
        ch.to.copy(dockLocal(lap, ch.size))
      },
    }),
    [i, lap, st],
  )
  useInteractable(it)
  return (
    <group>
      <object3D ref={mark} position={stand} />
      <PlinthBlock lap={lap} />
    </group>
  )
}

/* ----------------------------------------------------------------- main */

export default function Obstacle({ id, active, complete, done }: ObstacleProps) {
  const grp = useRef<THREE.Group>(null)
  const padRef = useRef<THREE.Group>(null)
  const gapMark = useRef<THREE.Object3D>(null)
  const callMark = useRef<THREE.Object3D>(null)
  const storyMark = useRef<THREE.Object3D>(null)
  const [cardOpen, setCardOpen] = useState(false)
  const [poweredUI, setPoweredUI] = useState(done)
  const [completedUI, setCompletedUI] = useState(done)
  const [, force] = useState(0)

  const st = useRef<St>({
    active, plank: done, chunks: [], loaded: [done, done, done, done], pairs: done ? 4 : 0,
    powered: done, powerT: done ? 9 : 0, phase: done ? 'lit' : 'idle', liftT: 0,
    completed: done, capTok: 0,
  })
  if (st.current.chunks.length === 0) {
    st.current.chunks = CHUNKS.map((c, i) => {
      const home = c.home.clone()
      home.y = c.groundY + CHUNK_T[c.size] / 2 + 0.1
      const to = done ? dockLocal(LAPTOPS.find((l) => l.size === c.size)!, c.size) : home.clone()
      return {
        id: `c${i}`, size: c.size, status: done ? 'docked' : 'home', t: 0, hold: 0, lap: -1,
        match: done, from: home.clone(), to, home, wp: new THREE.Vector3(), ref: { current: null },
      }
    })
    if (done) st.current.chunks.forEach((ch) => ch.home.copy(ch.to))
  }
  const S = st.current
  S.active = active

  const mats = useMemo(() => {
    const mk = (c: string, e: string, ei = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, emissive: e, emissiveIntensity: ei, ...extra })
    return {
      chunks: CHUNKS.map((c) => mk(HUES[c.size], HUES[c.size], 0.5, { transparent: true, opacity: 0.72, roughness: 0.3 })),
      cables: LAPTOPS.map(() => mk('#453c35', '#e08a4e')),
      trim: mk('#c9875f', '#e08a4e'),
      callLit: mk('#d9cbb6', '#e08a4e', 0.12),
      lantern: mk('#f0e3cc', '#e8a34e'),
      led: mk('#e9dfcf', '#8fb36b', 0.8),
      lamp: mk('#f0e3cc', '#e8b34e', 0.75),
      workLamp: mk('#f0e3cc', '#e8a34e', 1.0),
      rackLed: mk('#e9dfcf', '#e8a34e', 0.6),
      wifi: mk('#efe4d2', '#e08a4e', 0, { transparent: true, opacity: 0 }),
    }
  }, [])

  const curves = useMemo(() => LAPTOPS.map((l) => cableCurve(l)), [])
  const cables = useMemo(() => curves.map((c) => new THREE.TubeGeometry(c, 20, 0.022, 6)), [curves])
  const beads = useRef<THREE.InstancedMesh>(null)
  const _beadM = useMemo(() => new THREE.Matrix4(), [])

  /* instanced glow pieces — screens + lift dial live at 1 draw call each,
   * per-piece colour carried by instanceColor and written each frame */
  const screensIM = useRef<THREE.InstancedMesh>(null)
  const segsIM = useRef<THREE.InstancedMesh>(null)
  const screenGeo = useMemo(() => new RoundedBoxGeometry(0.42 * 0.86, 0.22, 0.021, 2, 0.008), [])
  const basicScr = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), [])
  const basicSeg = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), [])
  const scrArgs = useMemo(() => [screenGeo, basicScr, 4] as const, [screenGeo, basicScr])
  const beadArgs = useMemo(() => [undefined, mats.trim, 4] as const, [mats.trim])
  const scrCol = useMemo(() => LAPTOPS.map(() => SCREEN_WARM.clone()), [])
  const scrI = useMemo(() => new Float32Array(4).fill(0.32), [])
  const segI = useMemo(() => new Float32Array(4).fill(0.05), [])
  const _c = useMemo(() => new THREE.Color(), [])
  const SCR_DARK = useMemo(() => new THREE.Color('#332e2b'), [])
  const SEG_DARK = useMemo(() => new THREE.Color('#57504b'), [])
  const EMBER = useMemo(() => new THREE.Color('#e08a4e'), [])

  useEffect(() => {
    const im = screensIM.current
    if (!im) return
    const m = new THREE.Matrix4()
    const rot = new THREE.Matrix4()
    const tmp = new THREE.Matrix4()
    LAPTOPS.forEach((lap, i) => {
      const s = LAP_SCALE[lap.size]
      m.makeTranslation(lap.p[0], lap.p[1], lap.p[2])
        .multiply(rot.makeRotationY(lap.yaw))
        .multiply(tmp.makeTranslation(0, PLINTH_TOP + 0.016 + 0.034 * s, -0.115 * s))
        .multiply(rot.makeRotationX(-0.34))
        .multiply(tmp.makeTranslation(0, 0.145 * s, 0.004))
        .multiply(tmp.makeScale(s, s, s))
      im.setMatrixAt(i, m)
      im.setColorAt(i, SCR_DARK)
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [SCR_DARK])

  const say = (s: string) => {
    useV5.getState().setCaption(s)
    const tok = ++S.capTok
    setTimeout(() => {
      if (S.capTok === tok && useV5.getState().caption === s) useV5.getState().setCaption(null)
    }, 3400)
  }

  const completeOnce = () => {
    if (S.completed) return
    S.completed = true
    complete()
    useV5.getState().complete(id)
  }

  const wpGap = useMemo(() => new THREE.Vector3(), [])
  const wpDead = useMemo(() => new THREE.Vector3(), [])
  const wpLift = useMemo(() => new THREE.Vector3(), [])
  const wpDown = useMemo(() => new THREE.Vector3(), [])
  const wpCall = useMemo(() => new THREE.Vector3(), [])
  const gapI = useMemo<Interactable>(() => ({
    id: 'L05-gap', at: () => (gapMark.current ? gapMark.current.getWorldPosition(wpGap) : wpGap.set(0, -99, 0)),
    radius: 1.7, label: 'Lay a plank',
    enabled: () => st.current.active && !st.current.plank && has('build'),
    use: () => { st.current.plank = true; force((n) => n + 1) },
  }), [])
  const gapHintI = useMemo<Interactable>(() => ({
    id: 'L05-gap-hint', at: gapI.at, radius: 1.6, label: 'A plank would span this gap',
    enabled: () => st.current.active && !st.current.plank && !has('build'),
    use: () => say('I need a way to build first.'),
  }), [])
  const liftDeadI = useMemo<Interactable>(() => ({
    id: 'L05-lift-dead', at: () => (padRef.current ? padRef.current.getWorldPosition(wpDead) : wpDead.set(0, -99, 0)),
    radius: 1.9, label: 'The dark lift',
    enabled: () => st.current.active && !st.current.powered,
    use: () => say('It sleeps until every laptop holds its share.'),
  }), [])
  const liftI = useMemo<Interactable>(() => ({
    id: 'L05-lift', at: () => (padRef.current ? padRef.current.getWorldPosition(wpLift).add(_a.set(0, PAD_TOP + 0.05, 0)) : wpLift.set(0, -99, 0)),
    radius: 1.8, label: 'Ride the lift',
    enabled: () => st.current.active && st.current.phase === 'lit',
    use: () => {
      const S2 = st.current
      if (S2.phase !== 'lit' || !padRef.current) return
      padRef.current.getWorldPosition(_w)
      const top = _w.y + PAD_TOP
      const on =
        Math.abs(player.pos.x - _w.x) < PAD_W / 2 + 0.12 &&
        Math.abs(player.pos.z - _w.z) < PAD_D / 2 + 0.12 &&
        player.pos.y > top - 0.8 && player.pos.y < top + 0.8
      if (!on) { say('Step aboard the lift first.'); return }
      S2.phase = 'riding'
      S2.liftT = 0
    },
  }), [])
  const liftDownI = useMemo<Interactable>(() => ({
    id: 'L05-lift-down', at: () => (padRef.current ? padRef.current.getWorldPosition(wpDown).add(_a.set(0, PAD_TOP + 0.05, 0)) : wpDown.set(0, -99, 0)),
    radius: 2.4, label: 'Ride down',
    enabled: () => st.current.active && st.current.phase === 'top',
    use: () => {
      const S2 = st.current
      if (S2.phase !== 'top' || !padRef.current) return
      padRef.current.getWorldPosition(_w)
      const top = _w.y + PAD_TOP
      const on =
        Math.abs(player.pos.x - _w.x) < PAD_W / 2 + 0.15 &&
        Math.abs(player.pos.z - _w.z) < PAD_D / 2 + 0.15 &&
        player.pos.y > top - 0.9 && player.pos.y < top + 0.9
      if (!on) return
      S2.phase = 'down'
      S2.liftT = 0
    },
  }), [])
  const callI = useMemo<Interactable>(() => ({
    id: 'L05-call', at: () => (callMark.current ? callMark.current.getWorldPosition(wpCall) : wpCall.set(0, -99, 0)),
    radius: 1.3, label: 'Call the lift down',
    enabled: () => st.current.active && st.current.phase === 'top',
    use: () => { st.current.phase = 'down'; st.current.liftT = 0 },
  }), [])
  const wpStory = useMemo(() => new THREE.Vector3(), [])
  const storyI = useMemo<Interactable>(() => ({
    id: 'L05-story', at: () => (storyMark.current ? storyMark.current.getWorldPosition(wpStory) : wpStory.set(0, -99, 0)),
    radius: 1.5, label: 'Read about Ent',
    enabled: () => st.current.active && !cardOpen,
    use: () => { player.frozen = true; setCardOpen(true) },
  }), [cardOpen])
  useInteractable(gapI); useInteractable(gapHintI); useInteractable(liftDeadI)
  useInteractable(liftI); useInteractable(liftDownI); useInteractable(callI); useInteractable(storyI)

  const closeCard = () => { setCardOpen(false); player.frozen = false }
  // safety: if this obstacle unmounts with the card up, never strand the player
  useEffect(() => () => { player.frozen = false }, [])

  useEffect(() => {
    registerSolve(() => st.current)
    return () => {
      const w = window as any
      if (w.__journey?.solve) { const { L05: _drop, ...rest } = w.__journey.solve; w.__journey.solve = rest }
    }
  }, [])

  useFrame((f, dt) => {
    const S2 = st.current
    const g = grp.current
    if (!g) return
    const t = f.clock.elapsedTime
    const dtm = Math.min(dt, 0.05)

    const liveAnchor = carryAnchor.y > -500
    const anchorW = liveAnchor
      ? _a.copy(carryAnchor)
      : _a.set(
          player.pos.x + Math.sin(player.facing) * 0.34,
          player.pos.y + 0.95,
          player.pos.z + Math.cos(player.facing) * 0.34,
        )
    const anchorL = g.worldToLocal(_v.copy(anchorW))

    S2.chunks.forEach((ch, ci) => {
      const cg = ch.ref.current
      if (!cg) return
      switch (ch.status) {
        case 'home': {
          cg.position.x += (ch.home.x - cg.position.x) * Math.min(1, dtm * 5)
          cg.position.z += (ch.home.z - cg.position.z) * Math.min(1, dtm * 5)
          cg.position.y = ch.home.y + Math.sin(t * 1.5 + ci * 1.9) * 0.045
          cg.rotation.y += dtm * 0.5
          cg.rotation.x += (0 - cg.rotation.x) * Math.min(1, dtm * 6)
          break
        }
        case 'carried': {
          cg.position.lerp(anchorL, Math.min(1, dtm * 9))
          if (liveAnchor) cg.quaternion.slerp(carryQuat, Math.min(1, dtm * 5))
          else {
            cg.rotation.y += (player.facing - cg.rotation.y) * Math.min(1, dtm * 5)
            cg.rotation.x += (-0.15 - cg.rotation.x) * Math.min(1, dtm * 5)
          }
          break
        }
        case 'toDock': {
          ch.t += dtm / 0.55
          const k = ease(Math.min(1, ch.t))
          cg.position.lerpVectors(ch.from, ch.to, k)
          cg.position.y += Math.sin(k * Math.PI) * 0.28
          const yaw = LAPTOPS[ch.lap].yaw
          cg.rotation.y += (yaw - cg.rotation.y) * Math.min(1, dtm * 7)
          cg.rotation.x += (0 - cg.rotation.x) * Math.min(1, dtm * 7)
          if (ch.t >= 1) {
            if (ch.match) {
              ch.status = 'docked'
              S2.loaded[ch.lap] = true
              S2.pairs++
              if (S2.pairs === 4 && !S2.powered) { S2.powered = true; S2.powerT = 0; say('The laptops hum — the lift wakes.') }
            } else {
              ch.status = 'dockHold'
              ch.hold = 0.5
            }
          }
          break
        }
        case 'dockHold': {
          ch.hold -= dtm
          if (ch.hold <= 0) { ch.status = 'eject'; ch.t = 0; ch.from.copy(cg.position); say('That share belongs to a different laptop.') }
          break
        }
        case 'eject': {
          ch.t += dtm / 1.4
          const k = sm01(Math.min(1, ch.t))
          cg.position.lerpVectors(ch.from, ch.home, k)
          cg.position.y += Math.sin(k * Math.PI) * 0.5
          cg.rotation.y += dtm * 2.5
          if (ch.t >= 1) { ch.status = 'home'; cg.position.copy(ch.home) }
          break
        }
        case 'docked': {
          cg.position.copy(ch.to)
          break
        }
      }
    })

    if (S2.powered) {
      S2.powerT += dtm
      mats.cables.forEach((m, i) => { m.emissiveIntensity = sm01((S2.powerT - 0.3 * i) / 0.55) * 1.05 })
      const bm = beads.current
      if (bm) {
        bm.visible = true
        for (let i = 0; i < 4; i++) {
          const on = sm01((S2.powerT - 0.3 * i) / 0.55) > 0.6
          if (on) { const p = curves[i].getPointAt((S2.powerT * 0.4 + i * 0.29) % 1); _beadM.makeTranslation(p.x, p.y, p.z) }
          else _beadM.makeScale(0, 0, 0)
          bm.setMatrixAt(i, _beadM)
        }
        bm.instanceMatrix.needsUpdate = true
      }
      if (S2.phase === 'idle' && S2.powerT > 1.5) S2.phase = 'lit'
    } else if (beads.current?.visible) beads.current.visible = false
    {
      // screens + dial segments — one instanced draw each, colours via instanceColor
      const sim = screensIM.current
      if (sim) {
        for (let i = 0; i < 4; i++) {
          const target = S2.loaded[i] ? 0.9 + Math.sin(t * 2 + i * 1.3) * 0.12 : 0.32 + Math.sin(t * 1.4 + i * 0.9) * 0.07
          scrI[i] += (target - scrI[i]) * Math.min(1, dtm * 6)
          scrCol[i].lerp(S2.loaded[i] ? SCREEN_HUES[i] : SCREEN_WARM, Math.min(1, dtm * 3))
          _c.copy(SCR_DARK).lerp(scrCol[i], Math.min(1, scrI[i] * 1.15))
          sim.setColorAt(i, _c)
        }
        if (sim.instanceColor) sim.instanceColor.needsUpdate = true
      }
      const gim = segsIM.current
      if (gim) {
        for (let i = 0; i < 4; i++) {
          const target = S2.loaded[i] ? 1.2 : 0.05
          segI[i] += (target - segI[i]) * Math.min(1, dtm * 5)
          _c.copy(SEG_DARK).lerp(EMBER, Math.min(1, segI[i] * 0.85))
          gim.setColorAt(i, _c)
        }
        if (gim.instanceColor) gim.instanceColor.needsUpdate = true
      }
    }
    if (S2.powered !== poweredUI) setPoweredUI(S2.powered)
    if (S2.completed !== completedUI) setCompletedUI(S2.completed)
    mats.rackLed.emissiveIntensity = 0.35 + (Math.sin(t * 6.3 + 1.7) > 0.1 ? 0.5 : 0.05)
    mats.trim.emissiveIntensity += ((S2.phase === 'idle' ? 0 : 0.9) - mats.trim.emissiveIntensity) * Math.min(1, dtm * 3)
    mats.callLit.emissiveIntensity += ((S2.powered ? 0.85 : 0.12) - mats.callLit.emissiveIntensity) * Math.min(1, dtm * 4)
    mats.lantern.emissiveIntensity += ((S2.phase === 'top' || done ? 0.9 : 0) - mats.lantern.emissiveIntensity) * Math.min(1, dtm * 2.5)
    mats.wifi.opacity += ((S2.powered ? 0.85 : 0) - mats.wifi.opacity) * Math.min(1, dtm * 2)
    mats.led.emissiveIntensity = S2.powered ? 0.5 + (Math.sin(t * 6) > 0 ? 0.6 : 0.1) : 0.5 + Math.sin(t * 2.5) * 0.15

    const pad = padRef.current
    if (pad) {
      if (S2.phase === 'riding') {
        S2.liftT += dtm
        const k = sm01(Math.min(1, S2.liftT / 2.6))
        pad.position.y = k * (DECK_Y - PAD_TOP)
        pad.getWorldPosition(_w)
        const top = _w.y + PAD_TOP
        if (
          Math.abs(player.pos.x - _w.x) < PAD_W / 2 + 0.05 &&
          Math.abs(player.pos.z - _w.z) < PAD_D / 2 + 0.05 &&
          player.pos.y < top + 0.3 && player.pos.y > top - 2.0
        ) player.pos.y = top
        if (S2.liftT / 2.6 >= 1) { S2.phase = 'top'; completeOnce() }
      } else if (S2.phase === 'down') {
        S2.liftT += dtm
        const k = sm01(Math.min(1, S2.liftT / 2.2))
        pad.position.y = (1 - k) * (DECK_Y - PAD_TOP)
        pad.getWorldPosition(_w)
        const top = _w.y + PAD_TOP
        if (
          Math.abs(player.pos.x - _w.x) < PAD_W / 2 + 0.05 &&
          Math.abs(player.pos.z - _w.z) < PAD_D / 2 + 0.05 &&
          player.pos.y < top + 0.3 && player.pos.y > top - 2.0
        ) player.pos.y = top
        if (k >= 1) S2.phase = 'lit'
      }
    }
  })

  return (
    <group ref={grp}>
      <Statics />
      <WalkStatics />
      <Colliders />
      <DeskFx ledMat={mats.led} lampMat={mats.lamp} wifiMat={mats.wifi} />
      <RackLeds mat={mats.rackLed} />
      <YardBulb mat={mats.workLamp} />
      <CallBulb mat={mats.callLit} />
      <LanternBulb mat={mats.lantern} />
      {LAPTOPS.map((_, i) => (
        <LapNode key={i} i={i} st={st} />
      ))}
      {/* all four laptop screens — one instanced draw, colours per instance */}
      <instancedMesh ref={screensIM} args={scrArgs as unknown as [THREE.BufferGeometry, THREE.Material, number]} frustumCulled={false} />
      {S.chunks.map((ch, i) => (
        <ChunkNode key={ch.id} rt={ch} st={st} mat={mats.chunks[i]} />
      ))}
      {cables.map((ggeo, i) => (
        <mesh key={`cb${i}`} geometry={ggeo} material={mats.cables[i]} />
      ))}
      {/* the four travelling beads — one instanced draw call */}
      <instancedMesh ref={beads} args={beadArgs as unknown as [THREE.BufferGeometry, THREE.Material, number]} visible={false} frustumCulled={false}>
        <sphereGeometry args={[0.045, 10, 8]} />
      </instancedMesh>
      {S.plank && <Plank />}
      <object3D ref={gapMark} position={GAP_EDGE} />
      <LiftPad padRef={padRef} trimMat={mats.trim} segMat={basicSeg} segRef={segsIM} />
      <object3D ref={callMark} position={[1.25, 0.75, -3.3]} />
      <object3D ref={storyMark} position={[STORY_P[0], STORY_P[1] + 0.85, STORY_P[2]]} />
      {active && !completedUI && !cardOpen && (
        <Html fullscreen zIndexRange={[90, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'fixed', left: '50%', bottom: '7.5%', transform: 'translateX(-50%)',
              pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13, letterSpacing: '0.01em', color: '#4a3f33',
              background: 'rgba(243, 234, 216, 0.94)', padding: '8px 18px', borderRadius: 999,
              boxShadow: '0 2px 12px rgba(60, 45, 30, 0.22), 0 1px 0 rgba(255,255,255,0.5) inset',
            }}
          >
            {poweredUI ? 'Step aboard the lift' : LREG.hint}
          </div>
        </Html>
      )}
      {cardOpen && (
        <Html fullscreen zIndexRange={[200, 0]}>
          <EntCard open onClose={closeCard} />
        </Html>
      )}
    </group>
  )
}
