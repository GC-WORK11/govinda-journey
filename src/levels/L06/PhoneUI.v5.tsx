/**
 * L06 Remote — the phone DOM overlay. A minimal dark-cream phone: a status line,
 * a thumb joystick that drives the 3D drone (via `stick` ref), and a close button.
 */
import { useEffect, useRef } from 'react'

export type Stick = { x: number; y: number } // x right, y forward (−z)  −1..1

const CSS = `
.gj-phone-wrap{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;font-family:Inter,system-ui,sans-serif}
.gj-phone{pointer-events:auto;width:min(300px,86vw);margin-bottom:max(18px,env(safe-area-inset-bottom));background:#2f2925;border-radius:30px;padding:10px 10px 14px;box-shadow:0 24px 60px -18px rgba(30,25,22,.55),0 2px 0 rgba(255,255,255,.06) inset;transform:translateY(0);animation:gjPhoneIn .45s cubic-bezier(.2,.7,.2,1) both}
@keyframes gjPhoneIn{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
.gj-phone-top{display:flex;align-items:center;justify-content:space-between;padding:2px 8px 8px;color:#efe6d6}
.gj-phone-name{font:600 12.5px Inter,system-ui,sans-serif;letter-spacing:.06em}
.gj-phone-x{width:28px;height:28px;border-radius:50%;color:#efe6d6;font:400 16px/1 Inter;display:grid;place-items:center;transition:background .2s}
.gj-phone-x:hover{background:rgba(243,233,218,.12)}
.gj-screen{background:#f6efe3;border-radius:20px;padding:14px 14px 16px;min-height:120px;display:flex;flex-direction:column;gap:10px}
.gj-status{display:flex;align-items:center;gap:8px;font:500 12px Inter;color:#6b5f57}
.gj-dot{width:7px;height:7px;border-radius:50%;background:#cdbf9f;flex:none}
.gj-dot.on{background:#8fb36b;animation:gjPulse 1.8s ease-in-out infinite}
.gj-dot.hit{background:#d9825b}
@keyframes gjPulse{0%,100%{transform:scale(.7);opacity:.55}50%{transform:scale(1);opacity:1}}
.gj-read{flex:1;display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:12px;background:repeating-linear-gradient(0deg,#efe4cf 0 2px,transparent 2px 9px);color:#8a7a63;font:500 11.5px Inter;letter-spacing:.04em;text-align:center}
.gj-stick-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 4px 0}
.gj-stick{width:118px;height:118px;border-radius:50%;background:#e8dcc4;box-shadow:inset 0 3px 10px rgba(59,51,48,.18);position:relative;touch-action:none;flex:none}
.gj-knob{position:absolute;left:50%;top:50%;width:52px;height:52px;border-radius:50%;background:#3b3330;transform:translate(-50%,-50%);box-shadow:0 6px 14px -4px rgba(30,25,22,.5);pointer-events:none}
.gj-stick-hint{position:absolute;inset:0;display:grid;place-items:center;color:#a5977d;font:500 10.5px Inter;letter-spacing:.1em;pointer-events:none}
.gj-done{flex:1;display:flex;align-items:center;justify-content:center;height:52px;border-radius:999px;background:#3b3330;color:#fbf6ee;font:500 13px Inter;letter-spacing:.02em;transition:transform .15s}
.gj-done:hover{transform:translateY(-1px)}
.gj-hintline{text-align:center;color:#9b8f80;font:400 11px Inter;padding-top:2px}
`

export default function PhoneUI({ open, status, stick, onClose }: {
  open: boolean
  status: 'linking' | 'flying' | 'hit'
  stick: React.MutableRefObject<Stick>
  onClose: () => void
}) {
  const padRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)

  useEffect(() => { if (!open) { stick.current.x = 0; stick.current.y = 0 } }, [open, stick])

  useEffect(() => () => { stick.current.x = 0; stick.current.y = 0 }, [stick])

  if (!open) return null

  const setKnob = (dx: number, dy: number) => {
    const k = knobRef.current; if (!k) return
    k.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
  }
  const onMove = (e: React.PointerEvent) => {
    if (pid.current === null || e.pointerId !== pid.current) return
    const pad = padRef.current; if (!pad) return
    const r = pad.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = r.width / 2 - 18
    const len = Math.hypot(dx, dy)
    if (len > max) { dx = dx / len * max; dy = dy / len * max }
    stick.current.x = dx / max
    stick.current.y = -dy / max // up on the pad = forward
    setKnob(dx, dy)
  }
  const release = () => { pid.current = null; stick.current.x = 0; stick.current.y = 0; setKnob(0, 0) }

  const flying = status === 'flying'
  return (
    <div className="gj-phone-wrap">
      <style>{CSS}</style>
      <div className="gj-phone" data-qa="l06-phone">
        <div className="gj-phone-top">
          <span className="gj-phone-name">remote</span>
          <button className="gj-phone-x" onClick={onClose} aria-label="Close phone" data-qa="l06-close">×</button>
        </div>
        <div className="gj-screen">
          <div className="gj-status">
            <span className={`gj-dot ${status === 'hit' ? 'hit' : 'on'}`} />
            {status === 'linking' && 'linking to the drone…'}
            {status === 'flying' && 'flying — nudge the stick'}
            {status === 'hit' && 'switch reached · the bridge is out'}
          </div>
          <div className="gj-read">
            {status === 'hit' ? 'the little rock is connected now' : 'the drone sees what the laptop sees'}
          </div>
          <div className="gj-stick-row">
            <div
              ref={padRef}
              className="gj-stick"
              data-qa="l06-stick"
              onPointerDown={(e) => { if (!flying) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); pid.current = e.pointerId; onMove(e) }}
              onPointerMove={onMove}
              onPointerUp={release}
              onPointerCancel={release}
              style={{ opacity: flying ? 1 : 0.45 }}
            >
              <span className="gj-stick-hint">{flying ? '' : '—'}</span>
              <div ref={knobRef} className="gj-knob" />
            </div>
            <button className="gj-done" onClick={onClose} data-qa="l06-done">{status === 'hit' ? 'Done' : 'Put away'}</button>
          </div>
          <div className="gj-hintline">left thumb steers · it flies on its own</div>
        </div>
      </div>
    </div>
  )
}
