import { useEffect, useRef, useState } from 'react'
import { input, now } from './input'
import { usePlayerUI } from './uiState'

/**
 * V5 DOM overlay: mobile joystick + jump/use buttons, desktop interact prompt,
 * respawn fade. Also owns pointer→camera-orbit plumbing (mouse drag, one-finger
 * drag on the right half, wheel + pinch zoom) — pointer hits are only accepted
 * when they land on the WebGL canvas, so overlay UIs from islands stay usable.
 */

type Ptr = { role: 'stick' | 'orbit'; sx: number; sy: number; lx: number; ly: number }
const STICK_R = 46, DEAD = 0.16

const CSS = `
.gjv5-root{position:fixed;inset:0;pointer-events:none;z-index:40;font-family:Inter,system-ui,sans-serif;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.gjv5-fade{position:absolute;inset:0;background:#14100c;opacity:0;transition:opacity .28s ease}
.gjv5-fade.on{opacity:.55}
.gjv5-flash{position:absolute;inset:0;background:#14100c;opacity:0;pointer-events:none;
  animation:gjv5flash .55s ease-out}
@keyframes gjv5flash{0%{opacity:.9}100%{opacity:0}}
.gjv5-prompt{position:absolute;left:50%;bottom:15%;transform:translateX(-50%);display:flex;gap:.5em;
  align-items:center;background:rgba(30,24,18,.55);color:#f6efe3;border-radius:999px;
  padding:.45em .95em;font-size:13px;letter-spacing:.02em;backdrop-filter:blur(6px)}
.gjv5-key{display:inline-flex;align-items:center;justify-content:center;min-width:1.5em;height:1.5em;
  border-radius:.4em;background:rgba(246,239,227,.16);border:1px solid rgba(246,239,227,.35);
  font-size:11px;font-weight:600}
.gjv5-stick{position:absolute;width:104px;height:104px;border-radius:50%;
  background:rgba(30,24,18,.22);border:1.5px solid rgba(246,239,227,.4);transform:translate(-50%,-50%)}
.gjv5-nub{position:absolute;left:50%;top:50%;width:46px;height:46px;border-radius:50%;
  background:rgba(246,239,227,.55);transform:translate(-50%,-50%)}
.gjv5-btn{position:absolute;right:calc(18px + env(safe-area-inset-right));pointer-events:auto;
  border-radius:50%;border:1.5px solid rgba(246,239,227,.45);background:rgba(30,24,18,.3);
  color:#f6efe3;display:flex;flex-direction:column;align-items:center;justify-content:center;
  backdrop-filter:blur(4px);touch-action:none;cursor:pointer}
.gjv5-btn:active{background:rgba(30,24,18,.5)}
.gjv5-jump{bottom:calc(26px + env(safe-area-inset-bottom));width:66px;height:66px}
.gjv5-use{bottom:calc(108px + env(safe-area-inset-bottom));width:60px;height:60px;
  font-size:11px;letter-spacing:.02em;padding:4px}
.gjv5-hint{position:absolute;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));
  color:rgba(43,32,22,.55);font-size:11px;letter-spacing:.03em}
`

export default function Controls() {
  const { prompt, touchUI, respawnKey, fading, setTouchUI } = usePlayerUI()
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  const ptrs = useRef(new Map<number, Ptr>())
  const pinchD = useRef(0)
  const nubRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isCanvas = (e: Event) => e.target instanceof HTMLCanvasElement
    const down = (e: PointerEvent) => {
      if (!isCanvas(e)) return
      if (e.pointerType !== 'mouse') { input.touch = true; setTouchUI(true) }
      else if (e.button !== 0 && e.button !== 2) return
      const w = window.innerWidth
      const role: Ptr['role'] = e.pointerType !== 'mouse' && e.clientX < w * 0.5 ? 'stick' : 'orbit'
      const p: Ptr = { role, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY }
      ptrs.current.set(e.pointerId, p)
      if (role === 'stick') setStick({ x: p.sx, y: p.sy, dx: 0, dy: 0 })
      const orbits = [...ptrs.current.values()].filter((q) => q.role === 'orbit')
      if (orbits.length === 2) pinchD.current = Math.hypot(orbits[0].lx - orbits[1].lx, orbits[0].ly - orbits[1].ly)
      e.preventDefault()
    }
    const move = (e: PointerEvent) => {
      const p = ptrs.current.get(e.pointerId)
      if (!p) return
      if (p.role === 'stick') {
        let dx = (e.clientX - p.sx) / STICK_R, dy = (e.clientY - p.sy) / STICK_R
        const m = Math.hypot(dx, dy)
        if (m > 1) { dx /= m; dy /= m }
        const dz = Math.hypot(dx, dy) < DEAD
        input.joy.x = dz ? 0 : dx; input.joy.y = dz ? 0 : dy; input.joy.active = !dz
        setStick((s) => (s ? { ...s, dx, dy } : s))
      } else {
        const orbits = [...ptrs.current.values()].filter((q) => q.role === 'orbit')
        if (orbits.length >= 2) {
          // pinch zoom on the two most recent orbit pointers
          const [a, b] = orbits.slice(-2)
          const other = p === a ? b : p === b ? a : null
          if (other) {
            p.lx = e.clientX; p.ly = e.clientY
            const d = Math.hypot(a.lx - b.lx, a.ly - b.ly)
            if (pinchD.current > 0) input.zoom -= (d - pinchD.current) * 3.2
            pinchD.current = d
          }
        } else {
          input.camDX += e.clientX - p.lx
          input.camDY += e.clientY - p.ly
          p.lx = e.clientX; p.ly = e.clientY
        }
      }
      e.preventDefault()
    }
    const up = (e: PointerEvent) => {
      const p = ptrs.current.get(e.pointerId)
      if (!p) return
      ptrs.current.delete(e.pointerId)
      if (p.role === 'stick') { input.joy.x = input.joy.y = 0; input.joy.active = false; setStick(null) }
      const orbits = [...ptrs.current.values()].filter((q) => q.role === 'orbit')
      pinchD.current = orbits.length === 2 ? Math.hypot(orbits[0].lx - orbits[1].lx, orbits[0].ly - orbits[1].ly) : 0
    }
    const wheel = (e: WheelEvent) => {
      if (!isCanvas(e)) return
      e.preventDefault()
      input.zoom += e.deltaY * (e.deltaMode === 1 ? 32 : 1)
    }
    const ctx = (e: Event) => { if (isCanvas(e)) e.preventDefault() }
    window.addEventListener('pointerdown', down, { passive: false })
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('contextmenu', ctx)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('contextmenu', ctx)
    }
  }, [setTouchUI])

  return (
    <div className="gjv5-root">
      <style>{CSS}</style>
      <div className={'gjv5-fade' + (fading ? ' on' : '')} />
      {respawnKey > 0 && <div key={respawnKey} className="gjv5-flash" />}

      {!touchUI && prompt && (
        <div className="gjv5-prompt" data-qa="v5-prompt">
          <span className="gjv5-key">E</span>
          <span>{prompt.label}</span>
        </div>
      )}

      {touchUI && stick && (
        <div className="gjv5-stick" style={{ left: stick.x, top: stick.y }} data-qa="v5-stick">
          <div ref={nubRef} className="gjv5-nub" style={{ transform: `translate(calc(-50% + ${stick.dx * STICK_R}px), calc(-50% + ${stick.dy * STICK_R}px))` }} />
        </div>
      )}

      {touchUI && prompt && (
        <button
          className="gjv5-btn gjv5-use" data-qa="v5-use"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); input.useAt = now() }}
        >{prompt.label}</button>
      )}
      {touchUI && (
        <button
          className="gjv5-btn gjv5-jump" data-qa="v5-jump" aria-label="Jump"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); input.jumpAt = now() }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
