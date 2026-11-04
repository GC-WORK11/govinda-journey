/**
 * L07 Wispr Wrap — the studio obstacle. The four word chips sit front and centre across the
 * path. Tap the next chip (E, or the use button on mobile) and its word flies to the laptop;
 * or press E at the mic to speak, which opens a sheet that listens for the next word. All four
 * land in order: the studio door swings open (Diorama, `done`) and complete() grants `voice`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { EXIT } from '../../v5/world/layout'
import { LEVELS } from '../registry'
import VoiceUI from './VoiceUI.v5'
import { clay, chipTexture } from './kit.v5'
import { WORDS, CHIP_IDLE, MIC_BASE, SCREEN_FRONT, K, onIsland } from './layout'
import { studio } from './studio'

const FLY_MS = 1000
const GAP_MS = 420
const CHIP = CHIP_IDLE.map(onIsland)
const GROUND = CHIP_IDLE.map((p) => onIsland(new THREE.Vector3(p.x, 0, p.z)))
const LAND = onIsland(SCREEN_FRONT)
const MIC = onIsland(MIC_BASE)
const HINT_AT = onIsland(new THREE.Vector3(0, CHIP_IDLE[0].y + 0.5, CHIP_IDLE[0].z))
const HINT = LEVELS.find((l) => l.id === 'L07')?.hint ?? ''
const HINT_CSS = '.gj-hint{font:500 13px Inter,system-ui,sans-serif;color:#3b3330;background:rgba(251,246,238,.92);padding:7px 16px;border-radius:999px;box-shadow:0 8px 22px -12px rgba(47,41,37,.45);white-space:nowrap;pointer-events:none}'
const ALIAS: Record<string, string[]> = { hello: ['hallo'], my: ['mai'], phone: ['fone'] }
const heardAs = (tok: string, word: string) => tok === word || !!ALIAS[word]?.includes(tok)
const smooth = (k: number) => k * k * (3 - 2 * k)

type Flight = { t0: number; curve: THREE.QuadraticBezierCurve3 }

export default function Obstacle({ id, active, complete, done }: core.ObstacleProps) {
  const root = useRef<THREE.Group>(null)
  const chips = useRef<(THREE.Group | null)[]>([])
  const flights = useRef<(Flight | null)[]>(WORDS.map(() => null))
  const sent = useRef(studio.landed.length) // words accepted so far, always in order
  const busy = useRef(0)
  const [open, setOpen] = useState(false)
  const [next, setNext] = useState(sent.current)
  const [nLanded, setNLanded] = useState(studio.landed.length)
  const chipTex = useMemo(() => WORDS.map(chipTexture), [])
  const openRef = useRef(false); openRef.current = open
  const doneRef = useRef(done); doneRef.current = done
  const completeRef = useRef(complete); completeRef.current = complete

  const speak = useMemo<core.Interactable>(() => {
    const at = new THREE.Vector3()
    return {
      id: 'L07-speak',
      at: () => (root.current ? root.current.localToWorld(at.copy(MIC)) : at.copy(MIC)),
      radius: 2.1,
      label: 'Speak into the mic',
      enabled: () => !doneRef.current,
      use: () => { core.playerEmote.name = 'use'; setOpen(true) },
    }
  }, [])
  core.useInteractable(speak)

  /* each chip is a tap target, enabled only while it is the next word */
  const taps = useMemo<core.Interactable[]>(() => WORDS.map((w, i) => {
    const at = new THREE.Vector3()
    return {
      id: `L07-word-${i}`,
      at: () => (root.current ? root.current.localToWorld(at.copy(GROUND[i])) : at.copy(GROUND[i])),
      radius: 1.5,
      label: `Tap “${w}”`,
      enabled: () => !doneRef.current && sent.current === i,
      use: () => { accept(w) },
    }
  }), [])
  useEffect(() => {
    for (const t of taps) core.interactables.set(t.id, t)
    return () => { for (const t of taps) core.interactables.delete(t.id) }
  }, [taps])

  /* a spoken, typed or tapped text: match the next words in order, each one flies in turn */
  const accept = (text: string) => {
    const toks = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
    const now = performance.now()
    let n = 0
    for (const tk of toks) {
      const k = sent.current
      if (k >= WORDS.length || !heardAs(tk, WORDS[k])) continue
      const t0 = Math.max(now, busy.current)
      busy.current = t0 + GAP_MS
      const mid = CHIP[k].clone().lerp(LAND, 0.5); mid.y += 1.4
      flights.current[k] = { t0, curve: new THREE.QuadraticBezierCurve3(CHIP[k].clone(), mid, LAND.clone()) }
      sent.current = k + 1; n++
    }
    if (n) setNext(sent.current)
    return n
  }

  const land = (i: number) => {
    studio.landed.push(WORDS[i]); studio.v++
    setNLanded(studio.landed.length)
  }

  useFrame((s, dt) => {
    const t = performance.now(), et = s.clock.elapsedTime
    for (let i = 0; i < WORDS.length; i++) {
      const g = chips.current[i]
      if (!g) continue
      if (i < studio.landed.length) { g.visible = false; continue }
      g.visible = true
      const f = flights.current[i]
      if (f && t >= f.t0) {
        const k = Math.min(1, (t - f.t0) / FLY_MS)
        f.curve.getPoint(smooth(k), g.position)
        g.rotation.y = k * Math.PI * 2
        if (k >= 1) { flights.current[i] = null; land(i) }
      } else {
        g.position.copy(CHIP[i]); g.position.y += Math.sin(et * 1.6 + i * 1.9) * 0.05
        g.rotation.y = Math.sin(et * 0.9 + i) * 0.08
        const want = i === sent.current ? 1.12 : 1
        g.scale.setScalar(g.scale.x + (want - g.scale.x) * Math.min(1, dt * 6))
      }
    }
  })

  /* all four landed: close the sheet, then complete once the studio door has swung */
  useEffect(() => {
    if (nLanded < WORDS.length || doneRef.current) return
    setOpen(false)
    const t = window.setTimeout(() => completeRef.current(), 1400)
    return () => window.clearTimeout(t)
  }, [nLanded])

  /* solved (now or from a saved journey): show the finished studio */
  useEffect(() => {
    if (!done) return
    if (studio.landed.length < WORDS.length) { studio.landed = [...WORDS]; studio.v++ }
    sent.current = WORDS.length
    setNext(WORDS.length); setNLanded(WORDS.length); setOpen(false)
  }, [done])

  /* the sheet freezes the traveller and lights the mic */
  useEffect(() => {
    core.player.frozen = open
    studio.listening = open
    if (open) core.playerEmote.name = 'use'
    else if (core.playerEmote.name === 'use') core.playerEmote.name = null
  }, [open])
  useEffect(() => () => {
    core.player.frozen = false
    studio.listening = false
    if (core.playerEmote.name === 'use') core.playerEmote.name = null
    /* words still in the air land now, so leaving the island never loses a word */
    const pending = flights.current.filter(Boolean).length
    for (let j = 0; j < pending; j++) studio.landed.push(WORDS[studio.landed.length])
    if (pending) studio.v++
  }, [])

  /* solve hook (?qa): walk up to the mic, use it, send the words through the same accept() */
  useEffect(() => {
    const w = window as any
    const J = (w.__journey ??= {})
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const tp = async (l: THREE.Vector3, dx = 0, dz = 0) => {
      const v = l.clone().add(new THREE.Vector3(dx, 0, dz))
      root.current?.localToWorld(v)
      // PLAYER's api attaches lazily — wait for it (pos.copy alone is overwritten each frame)
      for (let i = 0; i < 80 && !J.player?.teleport; i++) await sleep(100)
      const api = J.player?.teleport
      if (api) api(v.x, v.y, v.z)
      else { core.player.pos.copy(v); core.player.vel.set(0, 0, 0) }
    }
    J.solve = {
      ...(J.solve || {}),
      [id]: async () => {
        if (core.useV5.getState().done.includes(id)) return
        await tp(MIC, -0.9, 0)
        await sleep(500)
        core.interactables.get('L07-speak')?.use()
        for (let i = 0; i < 60 && !openRef.current; i++) await sleep(100)
        accept(WORDS.join(' '))
        for (let i = 0; i < 200 && !core.useV5.getState().done.includes(id); i++) await sleep(100)
        await tp(EXIT)
      },
    }
    return () => { if (J.solve) delete J.solve[id] }
  }, [id])

  return (
    <group ref={root}>
      {WORDS.map((w, i) => (
        <group key={w} ref={(g) => { chips.current[i] = g }} position={CHIP[i]}>
          <group scale={K}>
            <RoundedBox args={[0.5, 0.3, 0.12]} radius={0.09} smoothness={3} material={clay('#f6ecd9')} castShadow />
            <mesh position={[0, 0, 0.064]}>
              <planeGeometry args={[0.46, 0.26]} />
              <meshBasicMaterial map={chipTex[i]} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
      {active && !done && !open && HINT && (
        <Html position={HINT_AT} center zIndexRange={[60, 0]}>
          <style>{HINT_CSS}</style>
          <div className="gj-hint" data-qa="l07-hint">{HINT}</div>
        </Html>
      )}
      {open && (
        <Html fullscreen zIndexRange={[200, 0]}>
          <VoiceUI next={next} onSpoken={accept} onClose={() => setOpen(false)} />
        </Html>
      )}
    </group>
  )
}
