import { useEffect, useRef, useState } from 'react'

/** Placeholder interaction: press and hold until the line fills. */
export function HoldToFinish({ onWin, label = 'Press and hold' }: { onWin: () => void; label?: string }) {
  const [p, setP] = useState(0)
  const holding = useRef(false); const done = useRef(false)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const tick = (t: number) => {
      const dt = (t - last) / 1000; last = t
      setP((v) => { const n = Math.max(0, Math.min(1, v + (holding.current ? dt / 1.6 : -dt))); if (n >= 1 && !done.current) { done.current = true; setTimeout(onWin, 200) } return n })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [onWin])
  const on = () => (holding.current = true), off = () => (holding.current = false)
  return (
    <div className="hold">
      <button className="btn" onPointerDown={on} onPointerUp={off} onPointerLeave={off}
        onKeyDown={(e) => e.key === ' ' && on()} onKeyUp={off}>{label}</button>
      <div className="hold-line"><span style={{ transform: `scaleX(${p})` }} /></div>
    </div>
  )
}
