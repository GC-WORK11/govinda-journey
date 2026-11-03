import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { GameProps } from '../types'

type Hand = 'palm' | 'v' | 'fist'
type Act = 'space' | 'hello' | 'enter'

const CLAY = '#d9825b'
const HANDS: { id: Hand; name: string }[] = [
  { id: 'palm', name: 'open palm' },
  { id: 'v', name: 'two fingers' },
  { id: 'fist', name: 'fist' },
]
const ACTS: { id: Act; label: string }[] = [
  { id: 'hello', label: '“hello”' },
  { id: 'space', label: 'Space' },
  { id: 'enter', label: 'Enter' },
]
const STEPS: Act[] = ['hello', 'space', 'enter']
const LABEL = Object.fromEntries(ACTS.map((a) => [a.id, a.label])) as Record<Act, string>
const HAND_NAME = Object.fromEntries(HANDS.map((h) => [h.id, h.name])) as Record<Hand, string>

/** Soft clay hand silhouettes, drawn in a 120x120 box. */
const SHAPES: Record<Hand, ReactElement> = {
  palm: (
    <g fill={CLAY} stroke={CLAY} strokeLinecap="round">
      <ellipse cx={60} cy={82} rx={27} ry={30} stroke="none" />
      <line x1={45} y1={78} x2={42} y2={28} strokeWidth={15} />
      <line x1={60} y1={74} x2={60} y2={16} strokeWidth={15} />
      <line x1={75} y1={78} x2={78} y2={30} strokeWidth={15} />
      <line x1={88} y1={84} x2={91} y2={46} strokeWidth={12} />
      <line x1={42} y1={92} x2={27} y2={66} strokeWidth={15} />
    </g>
  ),
  fist: (
    <g fill={CLAY} stroke={CLAY} strokeLinecap="round">
      <ellipse cx={60} cy={84} rx={30} ry={25} stroke="none" />
      <circle cx={41} cy={63} r={8.5} stroke="none" />
      <circle cx={55} cy={60} r={9} stroke="none" />
      <circle cx={69} cy={61} r={8.5} stroke="none" />
      <circle cx={81} cy={66} r={7.5} stroke="none" />
      <line x1={35} y1={86} x2={55} y2={77} strokeWidth={13} />
    </g>
  ),
  v: (
    <g fill={CLAY} stroke={CLAY} strokeLinecap="round">
      <ellipse cx={60} cy={85} rx={26} ry={27} stroke="none" />
      <line x1={48} y1={72} x2={36} y2={22} strokeWidth={14} />
      <line x1={63} y1={70} x2={77} y2={24} strokeWidth={14} />
      <circle cx={79} cy={72} r={9} stroke="none" />
      <circle cx={86} cy={81} r={8} stroke="none" />
      <line x1={42} y1={90} x2={64} y2={78} strokeWidth={12} />
    </g>
  ),
}

/** 21 hand-landmark points per pose (same box as the silhouettes). */
const LM: Record<Hand, [number, number][]> = {
  palm: [
    [60, 106], [44, 88], [35, 74], [30, 66], [27, 62],
    [45, 70], [44, 52], [43, 38], [42, 28],
    [60, 66], [60, 46], [60, 32], [60, 18],
    [75, 69], [76, 52], [77, 40], [78, 30],
    [86, 75], [89, 62], [90, 54], [91, 46],
  ],
  fist: [
    [60, 106], [46, 88], [38, 80], [44, 74], [54, 73],
    [44, 74], [42, 62], [46, 71], [50, 77],
    [56, 73], [55, 59], [59, 69], [62, 76],
    [68, 74], [67, 60], [71, 70], [73, 77],
    [77, 77], [80, 66], [81, 73], [82, 79],
  ],
  v: [
    [60, 106], [46, 90], [50, 85], [57, 81], [64, 78],
    [48, 70], [43, 50], [40, 36], [36, 22],
    [63, 68], [68, 48], [72, 34], [77, 24],
    [73, 73], [77, 66], [79, 72], [79, 78],
    [82, 77], [86, 72], [86, 77], [86, 83],
  ],
}
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

function HandSvg({ hand, trace }: { hand: Hand; trace: boolean }) {
  const pts = LM[hand]
  return (
    <svg viewBox="0 0 120 120" className="l8-svg" aria-hidden>
      {SHAPES[hand]}
      {trace && (
        <g className="l8-lm">
          {BONES.map(([a, b], i) => (
            <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} style={{ animationDelay: `${i * 16}ms` }} />
          ))}
          {pts.map((p, i) => (
            <circle key={'d' + i} cx={p[0]} cy={p[1]} r={1.9} style={{ animationDelay: `${i * 20}ms` }} />
          ))}
        </g>
      )}
    </svg>
  )
}

const CSS = `
.l8{display:grid;gap:13px;justify-items:center;width:100%;max-width:430px;margin:0 auto}
.l8-hint{font-size:13px;color:var(--ink2);text-align:center}
.l8-say{font-size:13px;color:var(--ink2);min-height:19px;text-align:center}
.l8-hands{display:flex;gap:11px}
.l8-hand{position:relative;width:100px;padding:9px 7px 8px;border-radius:22px;background:#fffdf7;border:1.5px solid var(--line);
  box-shadow:0 8px 18px -10px rgba(60,40,20,.35);display:grid;justify-items:center;gap:4px;
  transition:transform .18s,border-color .18s,box-shadow .18s}
.l8-hand:active{transform:scale(.96)}
.l8-hand.sel{border-color:#c8704a;transform:translateY(-4px);box-shadow:0 14px 24px -12px rgba(60,40,20,.4)}
.l8-hand.wrong{animation:l8shake .45s}
.l8-svg{width:82px;height:82px;display:block}
.l8-hand .nm{font-size:11px;color:var(--ink2)}
.l8-tag{position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--paper);
  font-size:10.5px;padding:2px 9px;border-radius:999px;white-space:nowrap}
.l8-acts{display:flex;gap:9px}
.l8-act{min-width:80px;padding:9px 14px;border-radius:999px;border:1.5px dashed rgba(47,41,37,.35);color:var(--ink);
  font-size:13.5px;transition:opacity .18s,background .18s,border-color .18s;background:transparent}
.l8-act:not(:disabled){background:#fffdf7}
.l8-act:disabled{opacity:.32}
.l8-desk{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;justify-content:center}
.l8-lap{display:grid;justify-items:center}
.l8-screen{width:236px;height:150px;border-radius:18px;background:var(--paper);border:7px solid #4a4038;position:relative;padding:12px 14px}
.l8-web{position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:#9c8d7c}
.l8-doc{font-size:17px;color:var(--ink);line-height:1.55}
.l8-sp{color:var(--ink2);opacity:.55;padding:0 .26em}
.l8-caret{display:inline-block;width:2px;height:1.05em;background:var(--ink);vertical-align:-2px;animation:l8blink 1.1s steps(1) infinite}
.l8-base{width:272px;height:9px;border-radius:0 0 14px 14px;background:#cfc3b2}
.l8-cam{width:132px;height:99px;object-fit:cover;border-radius:18px;border:1.5px solid var(--line);
  box-shadow:0 10px 20px -12px rgba(60,40,20,.4);transform:scaleX(-1)}
.l8-needs{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:center}
.l8-needlab{font-size:12px;color:var(--ink2);margin-right:2px}
.l8-need{padding:5px 12px;border-radius:999px;border:1.5px solid var(--line);font-size:12.5px;color:var(--ink2)}
.l8-need.now{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.l8-need.done{opacity:.45;text-decoration:line-through}
.l8-lm line{stroke:rgba(59,51,48,.6);stroke-width:1.1;stroke-dasharray:60;stroke-dashoffset:60;animation:l8draw .55s ease-out forwards}
.l8-lm circle{fill:#4a4038;opacity:0;animation:l8pop .25s forwards}
@keyframes l8draw{to{stroke-dashoffset:0}}
@keyframes l8pop{to{opacity:.9}}
@keyframes l8shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@keyframes l8blink{50%{opacity:0}}
@media (max-width:480px){.l8-hand{width:94px}.l8-svg{width:76px;height:76px}}
`

export default function Game({ onWin }: GameProps) {
  const [phase, setPhase] = useState<'teach' | 'use'>('teach')
  const [sel, setSel] = useState<Hand | null>(null)
  const [map, setMap] = useState<Partial<Record<Hand, Act>>>({})
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState<Act[]>([])
  const [trace, setTrace] = useState<Hand | null>(null)
  const [wrong, setWrong] = useState<Hand | null>(null)
  const [cam, setCam] = useState<'idle' | 'on' | 'no'>('idle')
  const stream = useRef<MediaStream | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const done = useRef(false)
  const timers = useRef<number[]>([])

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [])
  useEffect(() => {
    if (cam === 'on' && video.current && stream.current) {
      video.current.srcObject = stream.current
      video.current.play().catch(() => {})
    }
  }, [cam])

  const allTaught = HANDS.every((h) => map[h.id])
  const used = new Set(Object.values(map))

  const pickHand = (h: Hand) => {
    if (phase === 'use') return useHand(h)
    setSel(h)
  }
  const pickAct = (a: Act) => {
    if (!sel) return
    setMap((m) => {
      const n = { ...m }
      for (const k of Object.keys(n) as Hand[]) if (n[k] === a) delete n[k]
      n[sel] = a
      return n
    })
    setSel(null)
  }
  const useHand = (h: Hand) => {
    if (trace || done.current) return
    if (map[h] === STEPS[step]) {
      const next = step + 1
      setTrace(h); setTyped((t) => [...t, STEPS[step]]); setStep(next)
      later(950, () => setTrace(null))
      if (next >= STEPS.length) { done.current = true; later(1400, onWin) }
    } else {
      setWrong(h); later(450, () => setWrong(null))
    }
  }
  const askCam = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return setCam('no')
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true })
      setCam('on')
    } catch {
      setCam('no')
    }
  }

  const handBtn = (h: { id: Hand; name: string }) => (
    <button key={h.id} type="button" data-qa={`hand-${h.id}`}
      className={`l8-hand ${sel === h.id ? 'sel' : ''} ${wrong === h.id ? 'wrong' : ''}`}
      onClick={() => pickHand(h.id)}>
      <HandSvg hand={h.id} trace={trace === h.id} />
      <span className="nm">{h.name}</span>
      {map[h.id] && <span className="l8-tag">{LABEL[map[h.id]!]}</span>}
    </button>
  )

  return (
    <div className="l8">
      <style>{CSS}</style>
      <p className="l8-hint">Teach each hand a key, then sign the sentence.</p>
      {phase === 'teach' ? (
        <>
          <p className="eyebrow">Step 1 · teach</p>
          <div className="l8-hands">{HANDS.map(handBtn)}</div>
          <p className="l8-say">{sel ? `What should the ${HAND_NAME[sel]} do?` : 'Tap a hand to train it.'}</p>
          <div className="l8-acts">
            {ACTS.map((a) => (
              <button key={a.id} type="button" data-qa={`act-${a.id}`} className="l8-act"
                disabled={!sel || used.has(a.id)} onClick={() => pickAct(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          {allTaught && (
            <button type="button" className="btn" data-qa="start-signing" onClick={() => setPhase('use')}>
              Start signing
            </button>
          )}
        </>
      ) : (
        <>
          <p className="eyebrow">Step 2 · sign</p>
          <div className="l8-desk">
            <div className="l8-lap">
              <div className="l8-screen">
                <i className="l8-web" />
                <div className="l8-doc">
                  {typed.map((t, i) =>
                    t === 'space' ? <span key={i} className="l8-sp">·</span>
                      : t === 'enter' ? <br key={i} />
                        : <span key={i}>hello</span>)}
                  <i className="l8-caret" />
                </div>
              </div>
              <div className="l8-base" />
            </div>
            {cam === 'on' && <video ref={video} className="l8-cam" autoPlay muted playsInline />}
          </div>
          <div className="l8-needs">
            <span className="l8-needlab">the laptop needs</span>
            {STEPS.map((a, i) => (
              <span key={a} className={`l8-need ${i < step ? 'done' : i === step ? 'now' : ''}`}>{LABEL[a]}</span>
            ))}
          </div>
          <div className="l8-hands">{HANDS.map(handBtn)}</div>
          {cam === 'idle' && <button type="button" className="link" data-qa="cam" onClick={askCam}>Use my camera</button>}
        </>
      )}
    </div>
  )
}
