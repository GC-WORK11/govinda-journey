import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import './I02.css'

const P = {
  sky: '#f8f0e2', cloud: '#fdf9f1',
  hillFar: '#d3d9b6', hillNear: '#bccb92',
  moss: '#a7bd80', leaf: '#8fb36b', leafDark: '#6f9a55',
  sand: '#e8d6b8', sandLight: '#f2e5cd', stone: '#c9bfb0', stoneLight: '#ded6c8',
  water: '#8fc1c9', waterLight: '#b8dade',
  wood: '#a87a52', woodLight: '#c99c6e', earth: '#b48a63', earthDark: '#8a6748',
  terra: '#d9825b', brick: '#b5654a', cream: '#f3e9da', paper: '#fbf6ee',
  brass: '#d9b26a',
}

const STATIONS = [88, 164, 240, 316]
const START = 48
const X_MAX = 346
const RAIL_Y = 168
const VMAX = 28
const ACC = 130
const BRK = 190
const SNAP = 27

type Phase = 'idle' | 'snap' | 'stamp' | 'won'

/** A little platform with a wordless nameplate on a post. */
function Station({ x, i, lit }: { x: number; i: number; lit: boolean }) {
  return (
    <g>
      <ellipse cx={x} cy={168} rx={21} ry={3} fill={P.earthDark} opacity={0.1} />
      <rect data-qa={`station-${i}`} x={x - 19} y={158} width={38} height={9} rx={4} fill={P.cream} />
      <rect x={x - 19} y={165} width={38} height={3} rx={1.5} fill={lit ? P.terra : '#d7c9b2'} />
      <rect x={x + 9} y={131} width={2.4} height={28} rx={1.2} fill={P.wood} />
      <path d={`M${x + 2} 120 L${x + 26} 120 L${x + 22} 114 L${x + 6} 114 Z`} fill={P.terra} />
      <rect x={x + 3} y={120} width={22} height={12} rx={3} fill={P.paper} stroke="#d3c4ab" strokeWidth={0.8} />
      <rect x={x + 7} y={125} width={14} height={1.5} rx={0.75} fill="#d3c4ab" />
      {lit && <rect x={x + 20} y={122} width={3.4} height={3.4} rx={1} fill={P.terra} />}
      {/* a crate waiting on the platform */}
      <rect x={x - 16} y={151} width={9} height={7} rx={1.8} fill={P.woodLight} />
      <rect x={x - 16} y={153.6} width={9} height={1.4} fill={P.wood} opacity={0.6} />
    </g>
  )
}

function TownMountains() {
  return (
    <g>
      <path d="M-46 0 C-38 -18 -32 -34 -24 -50 C-21 -57 -16 -57 -13 -50 C-6 -34 2 -18 10 0 Z" fill="#d6ccb9" />
      <path d="M-28 -40 C-25 -49 -20 -49 -17 -40 L-21 -36 L-24 -40 L-27 -36 Z" fill={P.paper} opacity="0.92" />
      <path d="M-12 0 C-4 -14 2 -30 9 -44 C12 -51 17 -51 20 -44 C27 -28 33 -14 40 0 Z" fill={P.leafDark} />
      <path d="M8 -35 C11 -43 16 -43 19 -35 L15 -31 L12 -35 L9 -31 Z" fill={P.paper} opacity="0.95" />
      <path d="M-54 0 C-42 -11 -28 -13 -14 0 Z" fill={P.moss} />
      <g fill={P.leaf}>
        <path d="M-40 0 L-36 -15 L-32 0 Z" />
        <path d="M-34 0 L-30 -11 L-26 0 Z" />
      </g>
    </g>
  )
}

function TownGhat() {
  return (
    <g>
      <path d="M-4 -3 L12 -3 C14 10 20 24 28 38 L34 46 L-8 46 C-4 32 -2 16 -4 -3 Z" fill={P.water} />
      <path d="M0 0 C1 14 6 28 13 42 L3 42 C-1 28 -3 14 -3 0 Z" fill={P.waterLight} opacity="0.5" />
      <path d="M-46 6 L-30 6 L-30 12 L-24 12 L-24 18 L-18 18 L-18 24 L-12 24 L-12 30 L-6 30 L-6 40 L-46 40 Z" fill={P.stoneLight} />
      <g stroke={P.stone} strokeWidth="1.1" opacity="0.75">
        <path d="M-46 12 L-30 12 M-46 18 L-24 18 M-46 24 L-18 24 M-46 30 L-12 30" />
      </g>
      {[[-38, 9], [-32, 15], [-25, 21], [-17, 27]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.7} fill={P.brass} opacity={0.92} />
      ))}
      <rect x={16} y={-12} width={20} height={14} rx={3} fill={P.sandLight} />
      <path d="M17 -12 Q26 -34 35 -12 Z" fill={P.cream} />
      <rect x={16} y={-14} width={20} height={3} rx={1.5} fill={P.terra} />
      <rect x={25.4} y={-38} width={1.4} height={6} fill={P.wood} />
      <path d="M26.8 -38 L32 -35.5 L26.8 -33 Z" fill={P.terra} />
      <g>
        <rect x={39} y={-8} width={2} height={8} fill={P.wood} />
        <circle cx={40} cy={-11} r={5.5} fill={P.leafDark} />
        <circle cx={36} cy={-8} r={3.5} fill={P.leaf} />
      </g>
    </g>
  )
}

function TownFort() {
  return (
    <g>
      <rect x={-36} y={-26} width={66} height={28} rx={4} fill="#dcc09a" />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <rect key={k} x={-36 + k * 9.6} y={-31} width={6.4} height={6} rx={2} fill="#dcc09a" />
      ))}
      <path d="M-9 2 L-9 -13 Q0 -22 9 -13 L9 2 Z" fill={P.brick} />
      <path d="M-5 2 L-5 -11 Q0 -16 5 -11 L5 2 Z" fill={P.earthDark} opacity="0.5" />
      <path d="M14 -26 Q23 -46 32 -26 Z" fill="#e9d5b0" />
      <rect x={22.4} y={-52} width={1.4} height={7} fill={P.wood} />
      <circle cx={23} cy={-53} r={1.6} fill={P.brass} />
      <rect x={-31} y={-44} width={1.6} height={19} fill={P.wood} />
      <path d="M-29.4 -44 L-19 -40 L-29.4 -35 Z" fill={P.terra} />
      <rect x={-22} y={-18} width={4} height={7} rx={2} fill={P.earthDark} opacity="0.38" />
      <rect x={20} y={-18} width={4} height={7} rx={2} fill={P.earthDark} opacity="0.38" />
    </g>
  )
}

function TownCoast() {
  return (
    <g>
      <path d="M-44 2 C-32 5 -20 1 -8 4 C4 7 16 2 28 5 C38 8 46 3 54 6 L54 46 L-44 46 Z" fill={P.water} />
      <path d="M-36 16 q6 -3.5 12 0 t12 0 t12 0" stroke={P.paper} strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M-24 27 q6 -3.5 12 0 t12 0 t12 0" stroke={P.paper} strokeWidth="1.5" fill="none" opacity="0.42" strokeLinecap="round" />
      <path d="M-38 2 L-34 -40 L-24 -40 L-20 2 Z" fill={P.paper} />
      <path d="M-36 -12 L-22 -12 L-21 -6 L-37 -6 Z" fill={P.terra} />
      <path d="M-35 -28 L-23 -28 L-22 -22 L-36 -22 Z" fill={P.terra} />
      <rect x={-35} y={-47} width={13} height={8} rx={2} fill={P.stoneLight} />
      <path d="M-36 -47 Q-28.5 -56 -21 -47 Z" fill={P.brick} />
      <circle cx={-28.5} cy={-43} r={2} fill={P.brass} />
      <path d="M8 22 L30 22 L26 29 L12 29 Z" fill={P.wood} />
      <path d="M17 8 L17 21 L27 20 Z" fill={P.cream} />
      <rect x={16.3} y={8} width={1.4} height={14} fill={P.wood} />
      <path d="M28 2 Q40 -9 54 2 Z" fill={P.sand} />
      <path d="M4 0 q2.6 -3 5.2 0 M44 -8 q2.4 -2.6 4.8 0" stroke={P.paper} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
    </g>
  )
}

function Seal({ i }: { i: number }) {
  return (
    <svg viewBox="0 0 24 24" className="i02-seal" aria-hidden="true">
      <rect x="1.7" y="1.7" width="20.6" height="20.6" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4.7" y="4.7" width="14.6" height="14.6" rx="3" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
      {i === 0 && <path d="M6 16 L9.5 9.5 L12 13.5 L14.5 8.5 L18 16 Z" fill="currentColor" />}
      {i === 1 && (
        <g fill="currentColor">
          <rect x="6.5" y="7.2" width="11" height="2" rx="1" />
          <rect x="7.5" y="11" width="9" height="2" rx="1" />
          <rect x="8.5" y="14.8" width="7" height="2" rx="1" />
        </g>
      )}
      {i === 2 && (
        <g fill="currentColor">
          <rect x="6" y="10" width="12" height="6" rx="1.2" />
          <rect x="7" y="7.4" width="2.6" height="3" rx="0.8" />
          <rect x="11" y="7.4" width="2.6" height="3" rx="0.8" />
          <rect x="15" y="7.4" width="2.6" height="3" rx="0.8" />
        </g>
      )}
      {i === 3 && (
        <path d="M6 10 C8 7.6 10 12.4 12 10 C14 7.6 16 12.4 18 10 M6 15 C8 12.6 10 17.4 12 15 C14 12.6 16 17.4 18 15"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function Game({ onWin }: GameProps) {
  const s = useRef({
    x: START, v: 0, held: false, moved: false, legStart: START,
    phase: 'idle' as Phase, target: 0, idx: -1, done: false, stamps: [] as number[],
  })
  const [stamps, setStamps] = useState<number[]>([])
  const [held, setHeld] = useState(false)
  const [note, setNote] = useState('')
  const trainRef = useRef<SVGGElement>(null)
  const leverRef = useRef<SVGGElement>(null)
  const puffRefs = useRef<(SVGCircleElement | null)[]>([])
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin
  const timers = useRef<number[]>([])

  useEffect(() => {
    const st = s.current
    const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()
    let lever = 0
    let steam = 0

    const stampAt = (i: number) => {
      st.phase = 'stamp'
      st.stamps.push(i)
      setStamps([...st.stamps])
      const left = 4 - st.stamps.length
      if (left === 0) {
        st.phase = 'won'
        setNote('Four stamps. The line goes on.')
        timers.current.push(window.setTimeout(() => {
          if (st.done) return
          st.done = true
          onWinRef.current()
        }, 1100))
      } else {
        setNote(`${['Three', 'Two', 'One'][left - 1]} to go.`)
        timers.current.push(window.setTimeout(() => {
          if (st.phase === 'stamp') { st.phase = 'idle'; st.moved = false }
        }, 1200))
      }
    }

    const settle = () => {
      st.moved = false
      let best = -1
      let bd = Infinity
      STATIONS.forEach((x, i) => {
        const d = Math.abs(st.x - x)
        if (d < bd) { bd = d; best = i }
      })
      if (best < 0 || bd > SNAP) { setNote('Not at a platform. Hold to roll on.'); return }
      if (st.stamps.includes(best)) { setNote('Already stamped. Hold for the next stop.'); return }
      st.target = STATIONS[best]
      st.idx = best
      st.phase = 'snap'
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (st.phase === 'idle') {
        if (st.held) { st.v = Math.min(VMAX, st.v + ACC * dt); st.moved = true }
        else if (st.v > 0) st.v = Math.max(0, st.v - BRK * dt)
        st.x += st.v * dt
        if (st.x > X_MAX) { st.x = START - 6; st.v = 0 }
        if (!st.held && st.v === 0 && st.moved && Math.abs(st.x - st.legStart) > 5) settle()
      } else if (st.phase === 'snap') {
        st.x += (st.target - st.x) * Math.min(1, dt * 16)
        if (Math.abs(st.target - st.x) < 0.4) { st.x = st.target; stampAt(st.idx) }
      }

      lever += ((st.held ? 1 : 0) - lever) * Math.min(1, dt * 14)
      steam += dt
      const bob = !reduce && st.v > 2 ? Math.sin(now * 0.016) * 0.45 : 0
      const fade = Math.min(1, Math.max(0, (st.x - 20) / 12)) * Math.min(1, Math.max(0, (354 - st.x) / 12))
      if (trainRef.current) {
        trainRef.current.setAttribute('transform', `translate(${st.x.toFixed(2)} ${(RAIL_Y + bob).toFixed(2)})`)
        trainRef.current.setAttribute('opacity', fade.toFixed(2))
      }
      if (leverRef.current) leverRef.current.setAttribute('transform', `rotate(${(lever * 34 - 17).toFixed(1)} 54 212)`)
      const puffing = !reduce && st.v > 3
      puffRefs.current.forEach((el, i) => {
        if (!el) return
        const p = (steam * 0.85 + i / 3) % 1
        el.setAttribute('opacity', (puffing ? 0.5 * (1 - p) : 0).toFixed(2))
        el.setAttribute('cx', (12.5 + Math.sin(p * 5 + i) * 2.2).toFixed(1))
        el.setAttribute('cy', (-33 - p * 15).toFixed(1))
        el.setAttribute('r', (1.3 + p * 2.6).toFixed(2))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const up = () => { if (s.current.held) { s.current.held = false; setHeld(false) } }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      timers.current.forEach((t) => clearTimeout(t))
      timers.current = []
    }
  }, [])

  const press = () => {
    const st = s.current
    if (st.phase !== 'idle' && st.phase !== 'stamp') return
    st.held = true
    st.legStart = st.x
    setHeld(true)
    setNote('')
  }
  const release = () => {
    if (!s.current.held) return
    s.current.held = false
    setHeld(false)
  }

  return (
    <div className="i02">
      <div className="i02-scene">
        <svg viewBox="0 0 360 240" role="img" aria-label="A small rail line running past four towns">
          <defs>
            <radialGradient id="i02-vig" cx="50%" cy="46%" r="74%">
              <stop offset="0.55" stopColor="#8a6748" stopOpacity="0" />
              <stop offset="1" stopColor="#8a6748" stopOpacity="0.14" />
            </radialGradient>
          </defs>
          <rect width="360" height="240" fill={P.sky} />
          <g fill={P.cloud} opacity="0.9">
            <ellipse cx="74" cy="34" rx="24" ry="9" />
            <ellipse cx="94" cy="29" rx="15" ry="7.5" />
            <ellipse cx="54" cy="30" rx="13" ry="6.5" />
            <ellipse cx="288" cy="26" rx="21" ry="7.5" />
            <ellipse cx="305" cy="22" rx="12" ry="5.5" />
          </g>
          <path d="M0 100 C50 88 96 96 140 92 C186 88 226 98 268 94 C308 90 336 96 360 92 L360 168 L0 168 Z" fill={P.hillFar} />
          <path d="M0 116 C60 106 120 114 180 110 C240 106 300 116 360 110 L360 168 L0 168 Z" fill={P.hillNear} />

          <g transform="translate(62 118)"><TownMountains /></g>
          <g transform="translate(150 118)"><TownGhat /></g>
          <g transform="translate(240 118)"><TownFort /></g>
          <g transform="translate(318 118)"><TownCoast /></g>

          {STATIONS.map((x, i) => <Station key={i} x={x} i={i} lit={stamps.includes(i)} />)}

          <g>
            {Array.from({ length: 28 }, (_, i) => (
              <rect key={i} x={16 + i * 12} y={168} width={7} height={4} rx={1.6} fill={P.stoneLight} />
            ))}
            <line x1={12} y1={170} x2={348} y2={170} stroke={P.earthDark} strokeWidth={2.6} strokeLinecap="round" />
            <line x1={12} y1={168.9} x2={348} y2={168.9} stroke={P.woodLight} strokeWidth={1} opacity="0.85" />
          </g>

          <path d="M0 176 C60 172 120 178 180 175 C240 172 300 178 360 175 L360 240 L0 240 Z" fill={P.sand} />
          <path d="M0 206 C64 198 132 210 198 203 C262 196 316 206 360 200 L360 240 L0 240 Z" fill={P.sandLight} opacity="0.7" />
          <g opacity="0.5">
            <ellipse cx="128" cy="192" rx="5" ry="2.4" fill={P.stone} />
            <ellipse cx="196" cy="222" rx="6" ry="2.8" fill={P.stone} />
            <ellipse cx="286" cy="196" rx="4.5" ry="2.2" fill={P.stoneLight} />
            <ellipse cx="330" cy="226" rx="5.5" ry="2.6" fill={P.stone} />
            <ellipse cx="152" cy="234" rx="4" ry="2" fill={P.stoneLight} />
          </g>
          <g stroke={P.leafDark} strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
            <path d="M112 186 l-3 -7 M115 187 l0 -9 M118 187 l3 -7" />
            <path d="M266 183 l-3 -7 M269 184 l0 -9 M272 184 l3 -7" />
            <path d="M344 192 l-3 -7 M347 193 l0 -9" />
            <path d="M172 228 l-3 -6 M175 229 l0 -8 M178 229 l3 -6" />
          </g>
          <g>
            <circle cx="226" cy="232" r="2.6" fill={P.paper} />
            <circle cx="226" cy="232" r="1" fill={P.terra} />
            <circle cx="232" cy="235" r="2" fill={P.paper} />
            <circle cx="232" cy="235" r="0.8" fill={P.brass} />
            <circle cx="140" cy="214" r="2.2" fill={P.paper} />
            <circle cx="140" cy="214" r="0.9" fill="#e0b06a" />
          </g>
          {/* a case set down beside the lever */}
          <g>
            <ellipse cx="104" cy="228" rx="12" ry="3" fill={P.earthDark} opacity={0.14} />
            <rect x="94" y="210" width="20" height="17" rx="3" fill={P.woodLight} />
            <rect x="94" y="216" width="20" height="3" fill={P.wood} opacity={0.75} />
            <rect x="101" y="208" width="6" height="3" rx="1.5" fill={P.wood} />
          </g>

          <g ref={trainRef} transform={`translate(${START} ${RAIL_Y})`}>
            <ellipse cx={-14} cy={1.4} rx={34} ry={3} fill={P.earthDark} opacity={0.13} />
            <g transform="translate(-30 0)">
              <rect x={-16} y={-26} width={30} height={17} rx={4} fill={P.cream} />
              <rect x={-18} y={-29} width={34} height={5} rx={2.5} fill={P.brick} />
              <rect x={-11} y={-22} width={8} height={7} rx={2} fill={P.water} />
              <rect x={-1} y={-22} width={8} height={7} rx={2} fill={P.water} />
              <circle cx={-9} cy={-4} r={4.6} fill={P.wood} />
              <circle cx={-9} cy={-4} r={1.5} fill={P.cream} />
              <circle cx={7} cy={-4} r={4.6} fill={P.wood} />
              <circle cx={7} cy={-4} r={1.5} fill={P.cream} />
            </g>
            <rect x={-20} y={-12} width={8} height={3} rx={1.5} fill={P.earthDark} />
            <g data-qa="train">
              <rect x={-17} y={-30} width={16} height={21} rx={5} fill={P.terra} />
              <rect x={-19} y={-33} width={20} height={5} rx={2.5} fill={P.cream} />
              <rect x={-13} y={-25} width={8} height={8} rx={2.5} fill={P.water} />
              <rect x={-3} y={-22} width={21} height={14} rx={6} fill={P.brick} />
              <rect x={6} y={-22} width={2.4} height={14} rx={1.2} fill={P.cream} opacity={0.85} />
              <rect x={10} y={-30} width={5.5} height={10} rx={2} fill={P.brick} />
              <rect x={8.5} y={-32} width={8.5} height={4} rx={2} fill={P.terra} />
              <circle cx={17} cy={-17} r={2.6} fill={P.brass} />
              <rect x={17} y={-13} width={3.5} height={4} rx={1.5} fill={P.earthDark} />
            </g>
            <circle cx={-10} cy={-4} r={4.8} fill={P.wood} />
            <circle cx={-10} cy={-4} r={1.6} fill={P.cream} />
            <circle cx={8} cy={-4} r={4.8} fill={P.wood} />
            <circle cx={8} cy={-4} r={1.6} fill={P.cream} />
            {[0, 1, 2].map((i) => (
              <circle key={i} ref={(el) => { puffRefs.current[i] = el }} cx={12.5} cy={-33} r={1.4} fill={P.cloud} opacity={0} />
            ))}
          </g>

          <rect width="360" height="240" fill="url(#i02-vig)" pointerEvents="none" />

          <g
            className="i02-lever" data-qa="lever" role="button" tabIndex={0}
            aria-label="Hold the lever to move the train, let go to stop"
            aria-pressed={held}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return
              e.currentTarget.setPointerCapture?.(e.pointerId)
              press()
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onKeyDown={(e) => { if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); press() } }}
            onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') release() }}
          >
            <rect x={28} y={172} width={54} height={60} fill="transparent" />
            <ellipse cx={54} cy={226} rx={22} ry={4} fill={P.earthDark} opacity={0.16} />
            <rect x={38} y={210} width={32} height={16} rx={6} fill={P.stone} />
            <rect x={38} y={207} width={32} height={7} rx={3.5} fill={P.stoneLight} />
            <circle cx={54} cy={212} r={6.6} fill="none" stroke={P.brass} strokeWidth={1.6} className="i02-lever-ring" />
            <g ref={leverRef}>
              <rect x={51.4} y={184} width={5.2} height={29} rx={2.6} fill={P.wood} />
              <circle cx={54} cy={182} r={7} fill={P.terra} />
              <circle cx={52} cy={180} r={2.2} fill="#e8a582" opacity={0.85} />
            </g>
            <circle cx={54} cy={212} r={3.2} fill={P.woodLight} />
          </g>
        </svg>
      </div>
      <div className="i02-foot">
        <div className="i02-book" data-qa="book" aria-label={`Ticket book, ${stamps.length} of 4 stamps`}>
          <span className="i02-book-label">Stamps</span>
          <div className="i02-slots">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`i02-slot${stamps.includes(i) ? ' on' : ''}`}>
                {stamps.includes(i) && <Seal i={i} />}
              </span>
            ))}
          </div>
        </div>
        <p className={`i02-hint${note ? ' note' : ''}`} aria-live="polite">
          {note || 'Hold the lever to ride, let go at each stop.'}
        </p>
      </div>
    </div>
  )
}
