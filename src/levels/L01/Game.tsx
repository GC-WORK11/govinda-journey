import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

/* "Light the lamps" — a small evening campus. Tap the four clay lamps along the
   path; when the last one is lit the scene warms to dawn. The first gesture. */

const LAMPS = [
  { x: 186, y: 308, s: 1 },
  { x: 288, y: 290, s: 0.94 },
  { x: 196, y: 266, s: 0.87 },
  { x: 276, y: 252, s: 0.8 },
]

const STARS = [
  [52, 42, 1.6], [108, 26, 1.2], [168, 58, 1.4], [228, 30, 1.1], [286, 52, 1.5],
  [348, 34, 1.2], [418, 96, 1.3], [70, 92, 1.1], [250, 88, 1.2], [330, 78, 1.0],
]

export default function Game({ onWin }: GameProps) {
  const [lit, setLit] = useState([false, false, false, false])
  const [nudged, setNudged] = useState(false)
  const dawn = lit.every(Boolean)
  const won = useRef(false)
  const nudgeT = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dawn) return
    const t = setTimeout(() => { if (!won.current) { won.current = true; onWin() } }, 2200)
    return () => clearTimeout(t)
  }, [dawn, onWin])
  useEffect(() => () => { if (nudgeT.current) clearTimeout(nudgeT.current) }, [])

  const light = (i: number) =>
    setLit((l) => (l[i] ? l : l.map((v, j) => j === i || v)))

  const nudge = () => {
    setNudged(true)
    if (nudgeT.current) clearTimeout(nudgeT.current)
    nudgeT.current = setTimeout(() => setNudged(false), 800)
  }

  return (
    <div className="l01">
      <style>{CSS}</style>
      <svg
        className={`l01-svg ${dawn ? 'dawn' : ''} ${nudged ? 'nudged' : ''}`}
        viewBox="0 0 480 340" role="img"
        aria-label="A quiet campus at dusk with four clay lamps along a path"
      >
        <defs>
          <linearGradient id="l01-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eec49b" />
            <stop offset="0.55" stopColor="#f6dcb9" />
            <stop offset="1" stopColor="#fbf0de" />
          </linearGradient>
          <radialGradient id="l01-glow">
            <stop offset="0" stopColor="rgba(255,196,112,.6)" />
            <stop offset="1" stopColor="rgba(255,196,112,0)" />
          </radialGradient>
          <radialGradient id="l01-sun">
            <stop offset="0" stopColor="rgba(255,205,140,.85)" />
            <stop offset="1" stopColor="rgba(255,205,140,0)" />
          </radialGradient>
          <linearGradient id="l01-flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9ad" />
            <stop offset="1" stopColor="#f2a24c" />
          </linearGradient>
        </defs>

        <rect width="480" height="340" fill="url(#l01-sky)" />

        {/* dawn sun, revealed when the veil lifts */}
        <g className="sun">
          <circle cx="140" cy="196" r="52" fill="url(#l01-sun)" />
          <circle cx="140" cy="196" r="24" fill="#ffcf8e" />
        </g>

        {/* hills + ground */}
        <path d="M0,238 Q120,214 250,230 Q380,244 480,224 L480,340 L0,340 Z" fill="#a7bd80" />
        <path d="M0,258 Q150,238 290,250 Q400,260 480,250 L480,340 L0,340 Z" fill="#8fb36b" />

        {/* campus block */}
        <g>
          <rect x="168" y="182" width="126" height="58" rx="7" fill="#f3e9da" />
          <path d="M160,184 L231,150 L302,184 Z" fill="#d9825b" />
          <rect x="272" y="152" width="12" height="22" rx="2" fill="#b5654a" />
          <rect x="164" y="184" width="134" height="6" rx="3" fill="#e8d6b8" />
          <path className="win" style={{ transitionDelay: dawn ? '.25s' : '0s' }}
            d="M190,234 L190,214 A9,9 0 0 1 208,214 L208,234 Z" />
          <path className="win" style={{ transitionDelay: dawn ? '.7s' : '0s' }}
            d="M256,234 L256,214 A9,9 0 0 1 274,214 L274,234 Z" />
          <circle className="win gable" style={{ transitionDelay: dawn ? '.5s' : '0s' }} cx="231" cy="172" r="7" />
          <path d="M223,240 L223,218 A8,8 0 0 1 239,218 L239,240 Z" fill="#a87a52" />
          <rect x="213" y="240" width="36" height="7" rx="3" fill="#e8d6b8" />
        </g>

        {/* banyan */}
        <g>
          <path d="M396,252 C394,236 394,224 398,212 L404,212 C406,224 406,238 404,252 Z" fill="#8a6748" />
          <path d="M386,252 C387,240 389,232 391,226" stroke="#8a6748" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M414,252 C413,240 411,232 409,226" stroke="#8a6748" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="400" cy="196" r="34" fill="#6f9a55" />
          <circle cx="374" cy="208" r="22" fill="#6f9a55" />
          <circle cx="426" cy="206" r="24" fill="#6f9a55" />
          <circle cx="398" cy="176" r="22" fill="#8fb36b" />
        </g>

        {/* bushes + stones */}
        <circle cx="116" cy="262" r="12" fill="#8fb36b" />
        <circle cx="342" cy="258" r="10" fill="#8fb36b" />
        <circle cx="352" cy="262" r="7" fill="#6f9a55" />
        <ellipse cx="132" cy="320" rx="9" ry="5" fill="#c9bfb0" />

        {/* the path home */}
        <path d="M222,340 C216,314 216,296 226,278 C234,264 238,256 234,250 L256,250
                 C260,262 254,272 252,284 C248,302 254,320 262,340 Z" fill="#e8d6b8" />

        {/* tiny gate where the path begins */}
        <g>
          <rect x="206" y="312" width="8" height="26" rx="3" fill="#f3e9da" />
          <rect x="270" y="312" width="8" height="26" rx="3" fill="#f3e9da" />
          <rect x="204" y="308" width="12" height="5" rx="2.5" fill="#d9825b" />
          <rect x="268" y="308" width="12" height="5" rx="2.5" fill="#d9825b" />
        </g>

        {/* catch stray taps, then the dusk veil above the whole scene */}
        <rect width="480" height="340" fill="transparent" onPointerDown={nudge} />
        <rect className="veil" width="480" height="340" />

        {/* stars + moon above the veil */}
        <g className="stars">
          {STARS.map(([x, y, r], i) => <circle key={i} className="star" cx={x} cy={y} r={r} />)}
        </g>
        <g className="moon">
          <circle cx="420" cy="58" r="14" fill="#f6ead3" />
          <circle cx="415" cy="54" r="2.6" fill="#e8d9bf" />
          <circle cx="425" cy="63" r="1.8" fill="#e8d9bf" />
        </g>

        {/* the four lamps */}
        {LAMPS.map((l, i) => (
          <g key={i} className={`lamp ${lit[i] ? 'on' : ''}`}
            transform={`translate(${l.x} ${l.y}) scale(${l.s})`}>
            <ellipse className="pool" cx="0" cy="3" rx="18" ry="4.5" fill="#ffc478" />
            <circle className="ring" cx="0" cy="-30" r="15" fill="none" stroke="#ffd9a0" strokeWidth="2" />
            <circle className="glow" cx="0" cy="-31" r="30" fill="url(#l01-glow)" />
            <ellipse cx="0" cy="1" rx="7" ry="2.4" fill="#4a3f38" />
            <rect x="-1.8" y="-27" width="3.6" height="28" rx="1.8" fill="#4a3f38" />
            <ellipse className="pot" cx="0" cy="-28" rx="7.5" ry="4" />
            <path className="flame" fill="url(#l01-flame)"
              d="M0,-41.5 C3.6,-36 3.6,-31.8 0,-30.6 C-3.6,-31.8 -3.6,-36 0,-41.5 Z" />
            <rect className="hit" data-qa={`lamp-${i}`} x="-18" y="-47" width="36" height="52"
              fill="transparent" onPointerDown={() => light(i)} />
          </g>
        ))}

        {/* morning birds */}
        <g className="birds" stroke="#3b3330" strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path className="bird" d="M0,86 q5,-5 10,0 q5,-5 10,0" />
          <path className="bird b2" d="M0,110 q4,-4 8,0 q4,-4 8,0" />
        </g>
      </svg>

      <div className="l01-foot">
        <span className="l01-hint">Tap each lamp.</span>
        <span className="l01-dots">
          {lit.map((v, i) => <span key={i} className={`l01-dot ${v ? 'on' : ''}`} />)}
        </span>
      </div>
    </div>
  )
}

const CSS = `
.l01 { display: grid; gap: 10px; justify-items: center; width: 100%; }
.l01-svg { width: 100%; max-width: 480px; height: auto; display: block; border-radius: 18px;
  box-shadow: 0 18px 40px -22px rgba(60,40,20,.5); touch-action: manipulation; user-select: none; }
.l01-svg .veil { fill: #453f5c; opacity: .52; transition: opacity 2.1s ease; pointer-events: none; }
.l01-svg.dawn .veil { opacity: 0; }
.l01-svg .sun { opacity: 0; transform: translateY(18px); transition: opacity 2s ease .3s, transform 2s ease .3s; }
.l01-svg.dawn .sun { opacity: 1; transform: translateY(0); }
.star { fill: #fdf6ea; transition: opacity 1.4s; }
.moon { transition: opacity 1.6s; }
.l01-svg.dawn .star, .l01-svg.dawn .moon { opacity: 0; }
.win { fill: #93a8a4; transition: fill .9s ease; }
.l01-svg.dawn .win { fill: #ffc978; }
.pool { opacity: 0; transition: opacity .6s ease; }
.lamp.on .pool { opacity: .8; }
.glow { opacity: 0; transition: opacity .6s ease; }
.lamp.on .glow { opacity: .95; animation: l01-breathe 2.6s ease-in-out infinite; }
.pot { fill: #a96047; transition: fill .5s; }
.lamp.on .pot { fill: #d9825b; }
.flame { opacity: 0; transform: scale(.4); transform-box: fill-box; transform-origin: 50% 100%;
  transition: opacity .4s, transform .5s cubic-bezier(.3,1.6,.5,1); }
.lamp.on .flame { opacity: 1; transform: scale(1); animation: l01-flick 1.5s ease-in-out infinite; }
.ring { opacity: 0; }
.l01-svg.nudged .lamp:not(.on) .ring { animation: l01-peek .8s ease; }
.hit { cursor: pointer; }
.birds { opacity: 0; transition: opacity 2s ease 1s; }
.l01-svg.dawn .birds { opacity: .8; }
.bird { animation: l01-fly 11s linear infinite; }
.bird.b2 { animation-duration: 15s; animation-delay: -7s; }
.l01-foot { display: flex; align-items: center; gap: 14px; }
.l01-hint { font-size: 13px; color: var(--ink2); }
.l01-dots { display: flex; gap: 6px; }
.l01-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(47,41,37,.15); transition: background .4s, box-shadow .4s; }
.l01-dot.on { background: #f0a952; box-shadow: 0 0 8px rgba(240,169,82,.7); }
@keyframes l01-flick { 0%,100% { transform: scale(1) } 45% { transform: scale(.84) skewX(4deg) } 70% { transform: scale(1.06) } }
@keyframes l01-breathe { 0%,100% { opacity: .95 } 50% { opacity: .72 } }
@keyframes l01-peek { 0% { opacity: 0 } 30% { opacity: .85 } 100% { opacity: 0 } }
@keyframes l01-fly { from { transform: translateX(-40px) } to { transform: translateX(520px) } }
@media (prefers-reduced-motion: reduce) {
  .l01-svg .veil, .l01-svg .sun, .star, .moon, .win, .pool, .glow, .flame, .pot, .birds, .l01-dot {
    transition-duration: .25s !important; }
  .flame, .glow, .bird, .l01-svg.nudged .lamp:not(.on) .ring { animation: none !important; }
}
`
