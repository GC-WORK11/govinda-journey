import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '../types'

/* Ent: one 27B model, split into contiguous slices, one per laptop. */
const LAYERS = [3, 2, 3, 2, 2, 3, 2, 2, 3, 2, 3, 3] // GB per layer, L1..L12
const LAPTOPS = [
  { os: 'Linux', cap: 16, hue: '#c9875f' },
  { os: 'Windows', cap: 8, hue: '#7fa7b5' },
  { os: 'Mac', cap: 8, hue: '#8fb36b' },
  { os: 'Linux', cap: 4, hue: '#9b8bb5' },
]
const WORDS = ['small', 'machines', 'think', 'together']
const INIT = [3, 6, 9]
const SLAB = 24, GAP = 6, SLOT = SLAB + GAP
const OVER = '#cf6f56'

const P = [0]
LAYERS.forEach((s) => P.push(P[P.length - 1] + s))
const bounds = (pins: number[], i: number): [number, number] => [i === 0 ? 0 : pins[i - 1], i === 3 ? 12 : pins[i]]
const gSum = (pins: number[], i: number) => { const [a, b] = bounds(pins, i); return P[b] - P[a] }

const SOLUTIONS = (() => {
  const out: number[][] = []
  for (let a = 1; a < 12; a++) for (let b = a + 1; b < 12; b++) for (let c = b + 1; c < 12; c++) {
    const p = [a, b, c]
    if (LAPTOPS.every((l, i) => gSum(p, i) <= l.cap)) out.push(p)
  }
  return out
})()

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function Lap({ os, cap, sum, hue, lit, over, qa }: { os: string; cap: number; sum: number; hue: string; lit: boolean; over: boolean; qa: string }) {
  return (
    <div className={`l05-lap ${over ? 'over' : ''} ${lit ? 'lit' : ''}`} data-qa={qa}>
      <svg viewBox="0 0 72 46" aria-hidden>
        <rect x="10" y="4" width="52" height="32" rx="6" fill="#fbf6ee" stroke="rgba(47,41,37,.16)" />
        <rect className="scr" x="14" y="8" width="44" height="24" rx="3.5" fill={lit ? '#ffe3b6' : '#e9dfcf'} />
        <rect x="4" y="36" width="64" height="7" rx="3.5" fill="#e8d6b8" stroke="rgba(47,41,37,.12)" />
        <circle cx="17" cy="10" r="2.6" fill={hue} opacity=".8" />
      </svg>
      <span className="os">{os}</span>
      <span className="bar"><i style={{ width: `${Math.min(100, (sum / cap) * 100)}%`, background: over ? OVER : hue }} /></span>
      <span className="gb">{sum} / {cap} GB</span>
    </div>
  )
}

export default function Game({ onWin }: GameProps) {
  const [pins, setPins] = useState(INIT)
  const [sending, setSending] = useState(false)
  const [shown, setShown] = useState(0)
  const [showAuto, setShowAuto] = useState(false)
  const [arcs, setArcs] = useState<string[]>([])
  const stackRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<HTMLDivElement>(null)
  const lapRefs = useRef<(HTMLDivElement | null)[]>([])
  const drag = useRef<number | null>(null)
  const fired = useRef(false)

  const sums = useMemo(() => LAPTOPS.map((_, i) => gSum(pins, i)), [pins])
  const solved = LAPTOPS.every((l, i) => sums[i] <= l.cap)

  // Offer the helper if the visitor has been at it a while.
  useEffect(() => {
    const t = setTimeout(() => setShowAuto(true), 25000)
    return () => clearTimeout(t)
  }, [])

  const gapAt = (clientY: number) => {
    const r = stackRef.current!.getBoundingClientRect()
    return Math.round((clientY - r.top + GAP / 2) / SLOT)
  }
  const clampTo = (i: number, g: number, p: number[]) => Math.max((i === 0 ? 0 : p[i - 1]) + 1, Math.min((i === 2 ? 12 : p[i + 1]) - 1, g))
  const movePin = (i: number, g: number) => setPins((p) => { const v = clampTo(i, g, p); return v === p[i] ? p : p.map((x, k) => (k === i ? v : x)) })

  const onPinDown = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (sending) return
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = i
  }
  const onPinMove = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current === i && !sending) movePin(i, gapAt(e.clientY))
  }
  const onPinUp = () => { drag.current = null }

  // Tapping a gap moves the nearest pin that is allowed to sit there.
  const placeAt = (g: number) => () => {
    if (sending) return
    let best = -1, bd = 99
    pins.forEach((p, i) => {
      if (g > (i === 0 ? 0 : pins[i - 1]) && g < (i === 2 ? 12 : pins[i + 1])) {
        const d = Math.abs(p - g); if (d < bd) { bd = d; best = i }
      }
    })
    if (best >= 0) movePin(best, g)
  }

  const auto = () => {
    if (sending || !SOLUTIONS.length) return
    const best = SOLUTIONS.reduce((a, b) =>
      a.reduce((s, x, i) => s + Math.abs(x - pins[i]), 0) <= b.reduce((s, x, i) => s + Math.abs(x - pins[i]), 0) ? a : b)
    setPins(best)
  }

  // Everything fits: light the screens and send one word through the pipe at a time.
  useEffect(() => {
    if (!solved || fired.current) return
    fired.current = true
    setSending(true)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const wr = wrapRef.current!.getBoundingClientRect()
    const pts = lapRefs.current.map((el) => {
      const r = el!.getBoundingClientRect()
      return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + 6 }
    })
    setArcs([0, 1, 2].map((s) => {
      const a = pts[s], b = pts[s + 1], mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 30
      return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`
    }))
    const seg = reduce ? 0.04 : 0.3
    const per = 3 * seg + 0.42
    const total = WORDS.length * per + (reduce ? 0.4 : 0.8)
    const tok = tokenRef.current
    if (tok) tok.style.opacity = '1'
    let appended = 0, raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = (now - t0) / 1000
      const w = Math.min(WORDS.length - 1, Math.floor(t / per))
      const lt = Math.min(per, t - w * per)
      if (tok) {
        let px = pts[0].x, py = pts[0].y, op = Math.min(1, lt / 0.12)
        if (lt < 3 * seg) {
          const s = Math.min(2, Math.floor(lt / seg)), f = lt / seg - s
          const a = pts[s], b = pts[s + 1], mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 30, u = 1 - f
          px = u * u * a.x + 2 * u * f * mx + f * f * b.x
          py = u * u * a.y + 2 * u * f * my + f * f * b.y
        } else {
          px = pts[3].x; py = pts[3].y; op *= Math.max(0, 1 - (lt - 3 * seg) * 3)
          if (appended === w) { appended = w + 1; setShown(w + 1) }
        }
        tok.style.transform = `translate(${px}px,${py}px) translate(-50%,-60%) scale(${0.7 + 0.3 * op})`
        tok.style.opacity = String(op)
      }
      if (t >= total) { onWin(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [solved, onWin])

  return (
    <div className={`l05 ${sending ? 'locked' : ''}`}>
      <style>{CSS}</style>
      <p className="l05-hint">Give each laptop only the layers it can hold.</p>
      <div className="l05-cap"><span>one 27B model</span><span>{P[12]} GB · every layer stays in order</span></div>
      <div className="l05-stack" ref={stackRef}>
        <div className="l05-slabs">
          {LAYERS.map((s, i) => {
            let gi = 0; while (gi < 3 && i >= pins[gi]) gi++
            const over = sums[gi] > LAPTOPS[gi].cap
            return (
              <div className={`l05-slab ${over ? 'over' : ''}`} key={i}
                style={{ width: 42 + s * 38, background: over ? 'rgba(207,111,86,.2)' : rgba(LAPTOPS[gi].hue, 0.13) }}>
                <b>L{i + 1}</b><span>{s} GB</span>
              </div>
            )
          })}
        </div>
        {LAPTOPS.map((l, i) => {
          const [a, b] = bounds(pins, i)
          return <span key={'sp' + i} className="l05-spine" style={{ top: a * SLOT, height: (b - a) * SLOT - GAP, background: l.hue }} />
        })}
        {Array.from({ length: 11 }, (_, k) => k + 1).map((g) => (
          <span key={'g' + g} className="l05-gaphit" data-qa={`gap-${g}`} style={{ top: g * SLOT - GAP / 2 }} onPointerDown={placeAt(g)} />
        ))}
        {pins.map((g, i) => (
          <div key={'p' + i} className="l05-pin" data-qa={`pin-${i}`} style={{ top: g * SLOT - GAP / 2 }}
            onPointerDown={onPinDown(i)} onPointerMove={onPinMove(i)} onPointerUp={onPinUp} onPointerCancel={onPinUp}>
            <span className="ln" /><span className="knob"><i /><i /></span>
          </div>
        ))}
      </div>
      <div className="l05-laps" ref={wrapRef}>
        <svg className="l05-arcs" aria-hidden>{arcs.map((d, i) => <path key={i} d={d} />)}</svg>
        {LAPTOPS.map((l, i) => (
          <div key={i} ref={(el) => { lapRefs.current[i] = el }} className="l05-lapwrap">
            <Lap os={l.os} cap={l.cap} sum={sums[i]} hue={l.hue} lit={sending} over={sums[i] > l.cap} qa={`laptop-${i}`} />
          </div>
        ))}
        <div className="l05-token" ref={tokenRef} aria-hidden />
      </div>
      <div className={`l05-out ${sending ? 'on' : ''}`}>
        <span className="lb">it answers</span>
        <p className="sent">{WORDS.slice(0, shown).join(' ')}{shown === WORDS.length ? '.' : sending ? ' …' : ''}</p>
      </div>
      <div className="l05-foot">
        <span className="tip">Drag a pin, or tap a gap.</span>
        {showAuto && !solved && <button className="link" data-qa="auto-split" onClick={auto}>Auto-split</button>}
      </div>
    </div>
  )
}

const CSS = `
.l05{width:100%;max-width:460px;display:flex;flex-direction:column;align-items:stretch;color:var(--ink);user-select:none;-webkit-user-select:none}
.l05-hint{font-size:13px;color:var(--ink2);text-align:center;margin-bottom:10px}
.l05-cap{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);padding:0 8px;margin-bottom:4px}
.l05-cap span:last-child{letter-spacing:.02em;text-transform:none;opacity:.8}
.l05-stack{position:relative;width:196px;margin:0 auto;touch-action:none}
.l05-slabs{display:flex;flex-direction:column;gap:6px;align-items:center}
.l05-slab{height:24px;border-radius:7px;display:flex;align-items:center;justify-content:space-between;padding:0 9px;
  border:1px solid rgba(47,41,37,.1);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6),0 1px 2px rgba(60,40,20,.08);transition:background .25s,border-color .25s}
.l05-slab b{font:500 10px var(--sans);color:var(--ink)}
.l05-slab span{font:400 9px var(--sans);color:var(--ink2)}
.l05-slab.over{border-color:rgba(207,111,86,.5)}
.l05-spine{position:absolute;left:2px;width:4px;border-radius:2px;opacity:.55;transition:top .15s,height .15s}
.l05-gaphit{position:absolute;left:0;right:0;height:13px;transform:translateY(-50%);cursor:pointer}
.l05-pin{position:absolute;left:-4px;right:0;height:16px;transform:translateY(-50%);cursor:grab;touch-action:none;transition:top .14s ease;z-index:2}
.l05-pin:active{cursor:grabbing}
.l05-pin .ln{position:absolute;left:0;right:20px;top:50%;height:2px;margin-top:-1px;border-radius:2px;background:rgba(47,41,37,.34)}
.l05-pin .knob{position:absolute;right:-8px;top:50%;transform:translateY(-50%);width:26px;height:17px;border-radius:9px;
  background:#c9875f;box-shadow:0 2px 4px rgba(60,40,20,.3),inset 0 1.5px 0 rgba(255,255,255,.35);display:flex;gap:3px;align-items:center;justify-content:center}
.l05-pin .knob i{width:2px;height:8px;border-radius:1px;background:rgba(59,51,48,.35)}
.l05.locked .l05-pin,.l05.locked .l05-gaphit{pointer-events:none}
.l05.locked .l05-pin .knob{opacity:.4}
.l05-laps{position:relative;display:flex;gap:8px;justify-content:space-between;margin-top:16px;padding-top:6px}
.l05-lapwrap{flex:1;display:flex;justify-content:center}
.l05-lap{display:flex;flex-direction:column;align-items:center;width:100%;max-width:96px}
.l05-lap svg{width:100%;max-width:80px;transition:filter .4s}
.l05-lap.lit svg{filter:drop-shadow(0 0 6px rgba(255,215,150,.9))}
.l05-lap .scr{transition:fill .4s}
.l05-lap.over svg{animation:l05wob .35s ease}
.l05-lap .os{font-size:11px;color:var(--ink2);margin-top:2px}
.l05-lap .bar{display:block;width:72%;height:7px;border-radius:4px;background:rgba(47,41,37,.1);overflow:hidden;margin-top:4px}
.l05-lap .bar i{display:block;height:100%;border-radius:4px;transition:width .2s,background .2s}
.l05-lap .gb{font-size:10px;color:var(--ink2);font-variant-numeric:tabular-nums;margin-top:2px}
.l05-lap.over .gb{color:#b5503c}
.l05-arcs{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.l05-arcs path{fill:none;stroke:rgba(47,41,37,.4);stroke-width:1.6;stroke-dasharray:3 5;animation:l05dash 1.2s linear infinite}
.l05-token{position:absolute;left:0;top:0;width:16px;height:12px;border-radius:6px;background:#fbf6ee;border:1px solid rgba(47,41,37,.2);
  box-shadow:0 3px 6px rgba(60,40,20,.28),inset 0 1px 0 rgba(255,255,255,.7);opacity:0;pointer-events:none}
.l05-token::after{content:'';position:absolute;left:4px;right:4px;top:4px;height:1.5px;border-radius:1px;background:rgba(47,41,37,.3);box-shadow:0 3px 0 rgba(47,41,37,.22)}
.l05-out{min-height:52px;margin-top:8px;text-align:center;opacity:0;transition:opacity .5s}
.l05-out.on{opacity:1}
.l05-out .lb{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);margin-bottom:3px}
.l05-out .sent{font:500 19px var(--serif);font-style:italic;letter-spacing:.01em}
.l05-foot{display:flex;justify-content:space-between;align-items:center;margin-top:2px;min-height:26px}
.l05-foot .tip{font-size:11.5px;color:var(--ink2);opacity:.85}
.l05-foot .link{font-size:12.5px}
@keyframes l05wob{0%,100%{transform:translateX(0)}25%{transform:translateX(-2.5px)}60%{transform:translateX(2px)}}
@keyframes l05dash{to{stroke-dashoffset:-8}}
@media (max-width:760px){.l05{max-width:100%}.l05-stack{width:172px}.l05-slab b{font-size:9px}.l05-slab span{font-size:8.5px}}
`
