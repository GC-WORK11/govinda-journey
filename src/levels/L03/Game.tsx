import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

type PID = 'header' | 'hero' | 'button'
const IDS: PID[] = ['header', 'hero', 'button']

const PIECES: Record<PID, { w: number; h: number; home: [number, number] }> = {
  header: { w: 26, h: 10, home: [19, 79] },
  hero: { w: 24, h: 15, home: [50, 81] },
  button: { w: 16, h: 9, home: [80, 79] },
}
const SLOTS: Record<PID, { x: number; y: number; w: number; h: number }> = {
  header: { x: 9, y: 12, w: 52, h: 9 },
  hero: { x: 9, y: 24, w: 52, h: 24 },
  button: { x: 24, y: 51, w: 22, h: 8 },
}
const SIGNS = [
  { name: 'CEO Hunt', color: '#d9825b' },
  { name: 'Flow Pitch', color: '#8fb36b' },
  { name: 'Workbench', color: '#8fc1c9' },
  { name: 'Doorway', color: '#b5654a' },
]
const LEVER = { x0: 70, x1: 93, y0: 8, y1: 62, top: 16, len: 36 }

export default function Game({ onWin }: GameProps) {
  const stage = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Record<PID, [number, number]>>({ header: PIECES.header.home, hero: PIECES.hero.home, button: PIECES.button.home })
  const [placed, setPlaced] = useState<Record<PID, boolean>>({ header: false, hero: false, button: false })
  const [drag, setDrag] = useState<PID | null>(null)
  const [sel, setSel] = useState<PID | null>(null)
  const [wob, setWob] = useState<PID | null>(null)
  const [flash, setFlash] = useState<PID | null>(null)
  const [lever, setLever] = useState(0)
  const [phase, setPhase] = useState<'place' | 'ready' | 'flying' | 'signs'>('place')
  const mode = useRef<{ kind: 'piece'; id: PID } | { kind: 'lever' } | null>(null)
  const downAt = useRef({ x: 0, y: 0 })
  const leverNow = useRef(0)
  const timers = useRef<number[]>([])
  const won = useRef(false)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (phase === 'place' && placed.header && placed.hero && placed.button) {
      timers.current.push(window.setTimeout(() => setPhase('ready'), 380))
    }
  }, [placed, phase])

  const pct = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  const slotAt = (p: { x: number; y: number }): PID | null =>
    IDS.find((id) => { const s = SLOTS[id]; return p.x >= s.x - 3 && p.x <= s.x + s.w + 3 && p.y >= s.y - 3 && p.y <= s.y + s.h + 3 }) ?? null
  const pieceAt = (p: { x: number; y: number }): PID | null =>
    [...IDS].reverse().find((id) => !placed[id] && Math.abs(p.x - pos[id][0]) <= PIECES[id].w / 2 + 3 && Math.abs(p.y - pos[id][1]) <= PIECES[id].h / 2 + 3) ?? null

  const place = (id: PID) => {
    const s = SLOTS[id]
    setPos((p) => ({ ...p, [id]: [s.x + s.w / 2, s.y + s.h / 2] }))
    setPlaced((p) => ({ ...p, [id]: true }))
    setSel(null)
  }
  const reject = (id: PID, wrong: PID | null) => {
    setPos((p) => ({ ...p, [id]: PIECES[id].home }))
    setWob(id)
    if (wrong) setFlash(wrong)
    timers.current.push(window.setTimeout(() => { setWob(null); setFlash(null) }, 460))
  }
  const deploy = () => {
    if (phase !== 'ready') return
    leverNow.current = 1
    setLever(1)
    setPhase('flying')
  }
  const planeDone = () => {
    setPhase('signs')
    timers.current.push(window.setTimeout(() => {
      if (!won.current) { won.current = true; onWin() }
    }, 2800))
  }

  const setL = (v: number) => { leverNow.current = v; setLever(v) }

  const down = (e: React.PointerEvent) => {
    if (phase === 'flying' || phase === 'signs') return
    const p = pct(e)
    downAt.current = p
    stage.current?.setPointerCapture(e.pointerId)
    if (phase === 'ready' && p.x > LEVER.x0 && p.x < LEVER.x1 && p.y > LEVER.y0 && p.y < LEVER.y1) {
      mode.current = { kind: 'lever' }; setL(Math.min(1, Math.max(0, (p.y - LEVER.top) / LEVER.len))); return
    }
    if (phase !== 'place') return
    const id = pieceAt(p)
    mode.current = id ? { kind: 'piece', id } : null
    if (id) { setDrag(id); setPos((s) => ({ ...s, [id]: [p.x, p.y] })) }
  }
  const move = (e: React.PointerEvent) => {
    if (!mode.current) return
    const p = pct(e)
    if (mode.current.kind === 'lever') setL(Math.min(1, Math.max(0, (p.y - LEVER.top) / LEVER.len)))
    else {
      const id = mode.current.id
      setPos((s) => ({ ...s, [id]: [Math.min(96, Math.max(4, p.x)), Math.min(94, Math.max(4, p.y))] }))
    }
  }
  const up = (e: React.PointerEvent) => {
    const p = pct(e)
    const moved = Math.hypot(p.x - downAt.current.x, p.y - downAt.current.y)
    const m = mode.current
    mode.current = null
    setDrag(null)
    if (m?.kind === 'lever') {
      if (leverNow.current > 0.55 || moved < 2.5) deploy(); else setL(0)
      return
    }
    if (m?.kind === 'piece') {
      const id = m.id
      if (moved < 2.5) { setSel((s) => (s === id ? null : id)); setPos((s) => ({ ...s, [id]: PIECES[id].home })); return }
      const hit = slotAt(p)
      if (hit === id) place(id); else reject(id, hit)
      return
    }
    if (sel && phase === 'place' && moved < 2.5) {
      const hit = slotAt(p)
      if (hit === sel) place(sel)
      else if (hit) reject(sel, hit)
      else setSel(null)
    }
  }

  const hint = phase === 'place'
    ? (sel ? 'Now tap its matching slot.' : 'Drag the pieces into the page.')
    : phase === 'ready' ? 'Pull the lever.' : 'Shipped — four little sites went out.'

  return (
    <div className="l03">
      <style>{CSS}</style>
      <p className="l03-hint">{hint}</p>
      <div className="l03-stage" ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="l03-window">
          <i style={{ left: '10%', background: '#d9825b' }} /><i style={{ left: '18%', background: '#e0a458' }} /><i style={{ left: '26%', background: '#8fb36b' }} />
        </div>
        {IDS.map((id) => {
          const s = SLOTS[id]
          return <div key={id} data-qa={`slot-${id}`} className={`l03-slot l03-s-${id}${placed[id] ? ' full' : ''}${flash === id ? ' no' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}><em>{id}</em></div>
        })}
        {IDS.map((id) => {
          const is = placed[id], s = SLOTS[id]
          return (
            <div key={id} data-qa={`piece-${id}`}
              className={`l03-piece l03-p-${id}${is ? ' placed' : ''}${drag === id ? ' drag' : ''}${sel === id ? ' sel' : ''}${wob === id ? ' wob' : ''}`}
              style={{ left: `${pos[id][0]}%`, top: `${pos[id][1]}%`, width: `${is ? s.w : PIECES[id].w}%`, height: `${is ? s.h : PIECES[id].h}%` }}>
              {id === 'header' && <><i className="l03-fdot" /><i className="l03-fbar" /><i className="l03-fbar l03-short" /></>}
              {id === 'hero' && <><i className="l03-fpic" /><i className="l03-fbar" /><i className="l03-fbar l03-short" /></>}
              {id === 'button' && <span>Go</span>}
            </div>
          )
        })}
        {phase !== 'place' && (
          <>
            <span className="l03-lab">Deploy</span>
            <div className="l03-lever" data-qa="lever-track">
              <i className="l03-rail" />
              <i className="l03-knob" data-qa="lever" style={{ top: `${lever * 100}%` }} />
            </div>
          </>
        )}
        {phase === 'flying' && <i className="l03-plane" onAnimationEnd={planeDone} />}
        {phase === 'signs' && (
          <div className="l03-signs">
            <i className="l03-wire" />
            {SIGNS.map((s, i) => (
              <div key={s.name} className="l03-sign" style={{ left: `${6 + i * 22.5}%`, animationDelay: `${i * 0.13}s, ${0.55 + i * 0.13}s` }}>
                <i className="l03-str" style={{ left: '24%' }} /><i className="l03-str" style={{ right: '24%' }} />
                <div className="l03-board"><i style={{ background: s.color }} />{s.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const CSS = `
.l03 { width: 100%; display: grid; justify-items: center; gap: 8px; }
.l03-hint { font-size: 12.5px; color: var(--ink2); }
.l03-stage { position: relative; width: 100%; max-width: 470px; aspect-ratio: 1.32; touch-action: none; user-select: none; -webkit-user-select: none; }
.l03-window { position: absolute; left: 5%; top: 3%; width: 60%; height: 60%; background: var(--paper); border-radius: 16px;
  box-shadow: 0 16px 34px -18px rgba(60,40,20,.45), inset 0 0 0 1px rgba(47,41,37,.06); }
.l03-window::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 12%; background: #efe3d1;
  border-radius: 16px 16px 0 0; box-shadow: inset 0 -1px 0 rgba(47,41,37,.08); }
.l03-window > i { position: absolute; top: 4.2%; width: 4.6%; aspect-ratio: 1; border-radius: 50%; }
.l03-slot { position: absolute; border: 1.5px dashed rgba(47,41,37,.3); border-radius: 10px; display: grid; place-items: center; transition: border-color .3s, background .3s; }
.l03-s-button { border-radius: 99px; }
.l03-slot em { font: 500 10px var(--sans); letter-spacing: .12em; text-transform: uppercase; color: rgba(107,95,85,.55); font-style: normal; }
.l03-slot.full { border-color: transparent; } .l03-slot.full em { display: none; }
.l03-slot.no { border-color: #b5654a; background: rgba(181,101,74,.1); }
.l03-piece { position: absolute; transform: translate(-50%,-50%); background: var(--paper); border-radius: 12px;
  box-shadow: 0 9px 20px -9px rgba(60,40,20,.42), inset 0 0 0 1px rgba(47,41,37,.09);
  display: flex; align-items: center; justify-content: center; gap: 7%; cursor: grab;
  transition: left .45s cubic-bezier(.3,1.55,.45,1), top .45s cubic-bezier(.3,1.55,.45,1), width .45s cubic-bezier(.3,1.55,.45,1), height .45s cubic-bezier(.3,1.55,.45,1), box-shadow .2s; }
.l03-piece.drag { transition: box-shadow .2s; cursor: grabbing; z-index: 6; box-shadow: 0 20px 34px -14px rgba(60,40,20,.5), inset 0 0 0 1px rgba(47,41,37,.09); }
.l03-piece.sel { box-shadow: 0 0 0 3px #d9825b, 0 9px 20px -9px rgba(60,40,20,.42); }
.l03-piece.placed { cursor: default; box-shadow: inset 0 0 0 1px rgba(47,41,37,.1); animation: l03pop .42s; }
.l03-p-header, .l03-p-button { border-radius: 99px; }
.l03-p-button { background: var(--ink); color: var(--paper); font: 500 11px var(--sans); }
.l03-fdot { width: 13%; aspect-ratio: 1; border-radius: 50%; background: #d9825b; flex: none; }
.l03-fpic { width: 17%; aspect-ratio: 1; border-radius: 50%; background: #8fb36b; flex: none; }
.l03-fbar { width: 30%; height: 9%; min-height: 2px; border-radius: 99px; background: rgba(47,41,37,.28); flex: none; }
.l03-fbar.l03-short { width: 18%; }
.l03-piece.wob { animation: l03wob .42s; }
@keyframes l03wob { 0%,100% { transform: translate(-50%,-50%) } 25% { transform: translate(calc(-50% - 6px),-50%) } 55% { transform: translate(calc(-50% + 6px),-50%) } 80% { transform: translate(calc(-50% - 3px),-50%) } }
@keyframes l03pop { 0% { transform: translate(-50%,-50%) scale(1) } 45% { transform: translate(-50%,-50%) scale(1.06) } 100% { transform: translate(-50%,-50%) scale(1) } }
.l03-lab { position: absolute; left: 76%; top: 8.5%; width: 9.5%; text-align: center; font: 500 10px var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--ink2); animation: l03in .4s both; }
.l03-lever { position: absolute; left: 76%; top: 16%; width: 9.5%; height: 36%; animation: l03in .45s cubic-bezier(.3,1.4,.4,1) both; }
.l03-rail { position: absolute; left: 50%; top: 0; bottom: 0; width: 24%; transform: translateX(-50%); border-radius: 99px;
  background: #e8d6b8; box-shadow: inset 0 0 0 1.5px rgba(47,41,37,.14), 0 8px 16px -10px rgba(60,40,20,.5); }
.l03-knob { position: absolute; left: 50%; width: 100%; aspect-ratio: 1; transform: translate(-50%,-50%); border-radius: 50%;
  background: #d9825b; box-shadow: 0 7px 15px -6px rgba(60,40,20,.55), inset 0 -3px 0 rgba(0,0,0,.12); cursor: grab; transition: top .18s ease-out; }
.l03-knob::after { content: ''; position: absolute; inset: 24%; border-radius: 50%; background: rgba(251,246,238,.45); }
@keyframes l03in { from { opacity: 0; transform: scale(.6) } }
.l03-plane { position: absolute; left: 57%; top: 12%; width: 26px; height: 22px; background: var(--paper);
  clip-path: polygon(0 58%, 100% 0, 70% 100%); filter: drop-shadow(0 4px 4px rgba(60,40,20,.3));
  animation: l03fly 1.4s cubic-bezier(.45,.05,.55,.95) both; z-index: 7; }
@keyframes l03fly { 0% { left: 57%; top: 12%; transform: rotate(4deg); opacity: 1 } 75% { opacity: 1 }
  100% { left: 106%; top: -7%; transform: rotate(26deg); opacity: 0 } }
.l03-signs { position: absolute; left: 5%; right: 5%; top: 71%; height: 27%; }
.l03-wire { position: absolute; left: 0; right: 0; top: 0; height: 2px; border-radius: 2px; background: rgba(47,41,37,.32); }
.l03-sign { position: absolute; top: 0; width: 20%; height: 100%; transform-origin: 50% 0;
  animation: l03drop .5s cubic-bezier(.3,1.5,.4,1) both, l03swing 2.8s ease-in-out infinite alternate; }
.l03-str { position: absolute; top: 0; height: 18%; width: 2px; background: rgba(47,41,37,.35); }
.l03-board { position: absolute; top: 18%; left: 0; right: 0; min-height: 50%; padding: 9% 4% 6%; background: var(--paper);
  border-radius: 9px; box-shadow: 0 9px 18px -9px rgba(60,40,20,.45), inset 0 0 0 1px rgba(47,41,37,.08);
  display: grid; place-items: center; font: 500 11px/1.15 var(--serif); color: var(--ink); text-align: center; }
.l03-board i { position: absolute; top: 0; left: 0; right: 0; height: 20%; border-radius: 9px 9px 0 0; }
@keyframes l03drop { from { transform: translateY(-14px) scaleY(.4); opacity: 0 } }
@keyframes l03swing { from { transform: rotate(-3deg) } to { transform: rotate(3deg) } }
@media (prefers-reduced-motion: reduce) {
  .l03-piece, .l03-knob { transition: none; }
  .l03-piece.placed, .l03-piece.wob, .l03-lab, .l03-lever, .l03-sign { animation: none !important; }
  .l03-plane { animation-duration: .01s; }
}
`
