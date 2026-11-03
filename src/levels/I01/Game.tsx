import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import './I01.css'

const IN = 4          // seconds to a full breath in
const OUT = 2.4       // seconds for a full breath out
const MIN_HOLD = 2.5  // shorter than this does not count
const NEED = 3        // breaths to finish
const MERCY = 3       // short tries that still count as a breath

type Phase = 'rest' | 'in' | 'out'

const P = {
  water: '#89bec8', waterLight: '#a8d2d7',
  sand: '#e5d1ae', stone: '#c9bfb0', stoneLight: '#dcd3c6',
  leaf: '#8fb36b', leafDark: '#6f9a55', wood: '#a87a52',
  terracotta: '#d9825b', brick: '#b5654a', cream: '#f3e9da', paper: '#fbf6ee',
}
const PEBBLE = [P.terracotta, P.stone, P.sand, P.brick]
const RING = Array.from({ length: 20 }, (_, i) => i)

export default function Game({ onWin }: GameProps) {
  const s = useRef({ phase: 'rest' as Phase, p: 0, breaths: 0, short: 0, start: 0, outStart: 0, outFrom: 0, outDur: 1, queued: false, done: false })
  const [view, setView] = useState({ phase: 'rest' as Phase, p: 0, breaths: 0 })
  const [note, setNote] = useState('')
  const onWinRef = useRef(onWin); onWinRef.current = onWin
  const noteTimer = useRef<number>()
  const winTimer = useRef<number>()

  useEffect(() => {
    let raf = 0
    let shown = { phase: 'rest' as Phase, p: 0, breaths: 0 }
    const tick = (t: number) => {
      const st = s.current
      if (st.phase === 'in') {
        st.p = Math.min(1, (t - st.start) / (IN * 1000))
      } else if (st.phase === 'out') {
        const k = (t - st.outStart) / (st.outDur * 1000)
        st.p = Math.max(0, st.outFrom * (1 - k))
        if (st.p === 0) {
          if (st.breaths >= NEED && !st.done) {
            st.done = true
            winTimer.current = window.setTimeout(() => onWinRef.current(), 420)
          } else if (st.queued) {
            st.phase = 'in'; st.start = performance.now()
          } else {
            st.phase = 'rest'
          }
        }
      }
      if (shown.phase !== st.phase || Math.abs(shown.p - st.p) > 0.004 || shown.breaths !== st.breaths) {
        shown = { phase: st.phase, p: st.p, breaths: st.breaths }
        setView(shown)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(noteTimer.current)
      clearTimeout(winTimer.current)
    }
  }, [])

  const flash = (text: string) => {
    setNote(text)
    clearTimeout(noteTimer.current)
    if (text) noteTimer.current = window.setTimeout(() => setNote(''), 1800)
  }

  const press = () => {
    const st = s.current
    if (st.done) return
    if (st.phase === 'out') { st.queued = true; return }
    if (st.phase === 'in') return
    st.phase = 'in'; st.start = performance.now(); st.p = 0
  }

  const release = () => {
    const st = s.current
    st.queued = false
    if (st.phase !== 'in') return
    const held = (performance.now() - st.start) / 1000
    st.p = Math.min(1, held / IN)
    const ok = held >= MIN_HOLD || st.short + 1 >= MERCY
    if (ok) { st.breaths += 1; st.short = 0; flash('') }
    else { st.short += 1; flash('A little longer') }
    st.phase = 'out'
    st.outFrom = st.p
    st.outStart = performance.now()
    st.outDur = Math.max(1.1, OUT * st.p)
  }

  const p = view.p
  const rx = 24 + 56 * p
  const ry = 14 + 22 * p
  const guide = view.phase === 'out' ? 'Breathe out'
    : view.phase === 'in' && p >= 1 ? 'Let go'
    : 'Breathe in'

  return (
    <div className="i01">
      <div className="i01-wash" style={{ opacity: 0.02 + p * 0.52 }} />
      <p className="i01-guide" aria-live="polite">{guide}</p>
      <button
        className="i01-stage" data-qa="breathe" aria-label="Hold to breathe in, let go to breathe out"
        onPointerDown={(e) => { if (e.button === 0 || e.pointerType !== 'mouse') { e.currentTarget.setPointerCapture?.(e.pointerId); press() } }}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(e) => { if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) press() }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') release() }}
        style={{ filter: `brightness(${1 + p * 0.05}) saturate(${1 + p * 0.08})` }}
      >
        <svg viewBox="0 0 380 250" aria-hidden="true">
          {/* soft ground */}
          <ellipse cx="190" cy="153" rx="143" ry="92" fill={P.stone} opacity="0.1" />
          <path
            d="M78 126 C86 88 132 72 180 74 C236 76 288 92 304 126 C318 156 294 192 246 206 C196 221 132 216 100 198 C74 183 68 154 78 126 Z"
            fill={P.sand}
          />
          <path
            d="M84 126 C92 94 134 80 180 82 C232 84 280 98 296 128 C309 154 288 186 244 198 C198 211 138 206 108 190 C84 176 76 152 84 126 Z"
            fill="#efe1c9" opacity="0.7"
          />
          {/* grass tufts on the bank */}
          <g stroke={P.leafDark} strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
            <path d="M96 108 l-4 -9 M100 109 l0 -11 M104 109 l4 -9" />
            <path d="M256 196 l-4 -9 M260 197 l0 -11 M264 197 l4 -8" />
            <path d="M74 150 l-7 -4 M75 155 l-9 0 M74 160 l-7 5" />
          </g>
          {/* small flowers */}
          {[[92, 126], [268, 186], [252, 210], [130, 214]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill={P.paper} />
              <circle cx={x} cy={y} r="1.6" fill={i % 2 ? P.terracotta : '#e0b06a'} />
            </g>
          ))}
          {/* pond */}
          <path
            d="M96 132 C104 104 138 92 178 94 C222 96 262 108 276 130 C288 152 270 176 236 186 C200 197 150 194 120 182 C98 173 88 156 96 132 Z"
            fill={P.water} stroke="#b48a63" strokeWidth="5" strokeOpacity="0.5"
          />
          <path
            d="M110 124 C122 106 150 100 178 102 C204 104 228 110 244 122 C226 114 196 110 168 112 C144 114 122 118 110 124 Z"
            fill={P.waterLight} opacity="0.6"
          />
          {/* still water lines */}
          <g fill="none" stroke={P.paper} strokeWidth="1.6" opacity="0.22">
            <ellipse cx="185" cy="142" rx="46" ry="20" />
            <ellipse cx="185" cy="142" rx="64" ry="28" />
          </g>
          {/* breathing ripples */}
          {[0, 1, 2].map((k) => (
            <ellipse
              key={k} cx="185" cy="142" fill="none" stroke={P.paper}
              strokeWidth={1.4} opacity={Math.min(1, p * 2) * (0.34 - k * 0.09)}
              rx={rx + 8 + k * 9} ry={ry + 5 + k * 6}
            />
          ))}
          {/* lily pads */}
          {[[146, 158, 13, 22], [228, 118, 10.5, 200], [206, 170, 9, 96], [252, 158, 7.5, 318]].map(([x, y, r, rot], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
              <circle r={r} fill={i % 2 ? P.leaf : P.leafDark} />
              <path d={`M0 0 L${r * 0.9} ${-r * 0.55} L${r * 0.55} ${r * 0.5} Z`} fill={P.water} />
              <circle r={r * 0.22} cy={-r * 0.35} fill={P.leaf} opacity="0.55" />
            </g>
          ))}
          <g>
            <circle cx="146" cy="154" r="3.4" fill={P.paper} />
            <circle cx="146" cy="154" r="1.5" fill="#e0b06a" />
          </g>
          {/* meditation stone and folded cloth */}
          <g>
            <ellipse cx="114" cy="197" rx="29" ry="8" fill="#8a6748" opacity="0.16" />
            <ellipse cx="112" cy="190" rx="28" ry="12" fill={P.stone} />
            <ellipse cx="112" cy="187" rx="25" ry="10" fill={P.stoneLight} />
            <rect x="97" y="182" width="26" height="9" rx="4" fill={P.terracotta} transform="rotate(-5 110 186)" />
            <rect x="101" y="180" width="18" height="4" rx="2" fill="#e8a582" transform="rotate(-5 110 182)" />
          </g>
          {/* small tree */}
          <g>
            <ellipse cx="298" cy="120" rx="23" ry="7" fill="#8a6748" opacity="0.16" />
            <rect x="294" y="90" width="8" height="30" rx="4" fill={P.wood} />
            <circle cx="298" cy="74" r="24" fill={P.leafDark} />
            <circle cx="278" cy="88" r="14" fill={P.leafDark} />
            <circle cx="318" cy="88" r="13" fill={P.leafDark} />
            <circle cx="294" cy="65" r="13" fill={P.leaf} />
            <circle cx="308" cy="82" r="10" fill={P.leaf} />
            <circle cx="283" cy="74" r="8" fill={P.leaf} opacity="0.8" />
          </g>
          {/* the clay pebble ring that widens with the breath */}
          {RING.map((i) => {
            const a = (i / RING.length) * Math.PI * 2 + 0.1
            const j = Math.sin(i * 7.3) * 1.2
            const x = 185 + Math.cos(a) * (rx + j)
            const y = 142 + Math.sin(a) * (ry + j * 0.55)
            const r = 3 + (i % 3) * 0.5 + p * 0.7
            return <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.82} fill={PEBBLE[i % 4]} />
          })}
        </svg>
      </button>
      <div className="i01-foot">
        <div className="i01-pebbles" aria-label={`${view.breaths} of ${NEED} breaths`}>
          {[0, 1, 2].map((i) => <span key={i} className={`i01-pebble ${i < view.breaths ? 'on' : ''}`} />)}
        </div>
        <p className={`i01-hint ${note ? 'note' : ''}`}>{note || 'Hold to breathe in, let go to breathe out.'}</p>
      </div>
    </div>
  )
}
