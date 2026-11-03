/**
 * SignPad — soft DOM overlay where the player draws a one-stroke hand sign.
 * Matching: resample both strokes to N points, centre + normalise, mean distance ($1-lite).
 * Optional camera mode: motion-centroid air drawing. Never required; only if the user allows.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Veil, useFrozen } from './v5kit.v5'

export type Pt = { x: number; y: number }

/** Template shapes in normalised 0..1 space (y grows downward, like the canvas). */
export const SIGN_V: Pt[] = [
  { x: 0.2, y: 0.16 }, { x: 0.32, y: 0.4 }, { x: 0.5, y: 0.86 }, { x: 0.68, y: 0.4 }, { x: 0.8, y: 0.16 },
]
export const SIGN_C: Pt[] = (() => {
  const pts: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI * 0.32 - (i / 12) * Math.PI * 1.36 // open gap on the right
    pts.push({ x: 0.5 + Math.cos(a) * 0.32, y: 0.5 + Math.sin(a) * 0.36 })
  }
  return pts
})()

const N = 48
const PASS = 0.34 // mean normalised distance — tolerant

function pathLen(pts: Pt[]) {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return l
}
function resample(pts: Pt[], n = N): Pt[] {
  const p = pts.map((q) => ({ ...q }))
  const total = pathLen(p)
  if (total === 0) return Array.from({ length: n }, () => ({ ...p[0] }))
  const step = total / (n - 1)
  const out: Pt[] = [{ ...p[0] }]
  let acc = 0
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d === 0) continue
    if (acc + d >= step) {
      const t = (step - acc) / d
      const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
      out.push(q)
      p.splice(i, 0, q)
      acc = 0
    } else acc += d
  }
  while (out.length < n) out.push({ ...p[p.length - 1] })
  return out.slice(0, n)
}
function normalise(pts: Pt[]): Pt[] {
  let cx = 0, cy = 0
  for (const p of pts) { cx += p.x; cy += p.y }
  cx /= pts.length; cy /= pts.length
  let m = 0
  for (const p of pts) m = Math.max(m, Math.abs(p.x - cx), Math.abs(p.y - cy))
  if (m === 0) m = 1
  return pts.map((p) => ({ x: (p.x - cx) / m, y: (p.y - cy) / m }))
}
/** 0 = identical. Returns the mean point distance after resample + normalise, both directions. */
export function signScore(user: Pt[], template: Pt[]) {
  if (user.length < 6) return 9
  const a = normalise(resample(user)), b = normalise(resample(template))
  const d = (p: Pt[], q: Pt[]) => {
    let s = 0
    for (let i = 0; i < p.length; i++) s += Math.hypot(p[i].x - q[i].x, p[i].y - q[i].y)
    return s / p.length
  }
  return Math.min(d(a, b), d(a, [...b].reverse()))
}

type Props = {
  template: Pt[]
  title: string
  sub?: string
  onResult: (ok: boolean) => void
  onClose: () => void
}

export function SignPad({ template, title, sub, onResult, onClose }: Props) {
  useFrozen(true)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stroke = useRef<Pt[]>([])
  const drawing = useRef(false)
  const solved = useRef(false)
  const [note, setNote] = useState('')
  const [camOn, setCamOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const camStream = useRef<MediaStream | null>(null)

  const geom = () => {
    const el = wrapRef.current!
    const w = el.clientWidth, h = el.clientHeight
    return { w, h, pad: Math.min(w, h) * 0.16 }
  }
  const toPad = (t: Pt) => {
    const { w, h, pad } = geom()
    return { x: pad + t.x * (w - pad * 2), y: pad + t.y * (h - pad * 2) }
  }

  const redraw = useCallback(() => {
    const cv = canvasRef.current, el = wrapRef.current
    if (!cv || !el) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const { w, h } = geom()
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr }
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // ghost template
    ctx.strokeStyle = 'rgba(47,41,37,.24)'; ctx.lineWidth = 4; ctx.setLineDash([1, 9])
    ctx.beginPath()
    template.forEach((t, i) => { const p = toPad(t); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y) })
    ctx.stroke()
    ctx.setLineDash([])
    const s = toPad(template[0])
    ctx.fillStyle = 'rgba(47,41,37,.3)'
    ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill()
    // player stroke
    const pts = stroke.current
    if (pts.length > 1) {
      ctx.strokeStyle = solved.current ? '#6f9a55' : '#2f2925'
      ctx.lineWidth = 4.5
      ctx.beginPath()
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
    }
  }, [template])

  useEffect(() => { redraw() }, [redraw])

  const evaluate = useCallback((pts: Pt[]) => {
    if (solved.current) return
    const score = signScore(pts, template)
    if (pathLen(pts) < 50 || score > PASS) {
      setNote(pts.length < 6 ? 'Trace the shape in one stroke.' : 'Not quite — follow the shape once more.')
      stroke.current = []
      redraw()
      return
    }
    solved.current = true
    setNote('')
    redraw()
    setTimeout(() => onResult(true), 550)
  }, [template, onResult, redraw])

  const local = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = (e: React.PointerEvent) => {
    if (solved.current) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    drawing.current = true
    stroke.current = [local(e)]
    setNote('')
    redraw()
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || solved.current) return
    const p = local(e)
    const last = stroke.current[stroke.current.length - 1]
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2.5) { stroke.current.push(p); redraw() }
  }
  const up = (e: React.PointerEvent) => {
    if (!drawing.current) return
    drawing.current = false
    stroke.current.push(local(e))
    evaluate(stroke.current)
  }

  /* Optional camera air-drawing: motion centroid paints the stroke. Never required. */
  useEffect(() => {
    if (!camOn) return
    let alive = true
    const vid = videoRef.current
    const off = document.createElement('canvas'); off.width = 80; off.height = 60
    const ctx = off.getContext('2d', { willReadFrequently: true })!
    let prev: Uint8ClampedArray | null = null
    let strokeLive = false, still = 0
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      .then((s) => { if (!alive) { s.getTracks().forEach((t) => t.stop()); return }; camStream.current = s; if (vid) { vid.srcObject = s; vid.play().catch(() => {}) } })
      .catch(() => { setCamOn(false); setNote('Camera unavailable — draw with a finger or mouse.') })
    const tick = setInterval(() => {
      if (!vid || vid.readyState < 2 || solved.current) return
      ctx.drawImage(vid, 0, 0, 80, 60)
      const cur = ctx.getImageData(0, 0, 80, 60).data
      if (prev) {
        let sx = 0, sy = 0, n = 0
        for (let i = 0; i < cur.length; i += 4) {
          const d = Math.abs(cur[i] - prev[i]) + Math.abs(cur[i + 1] - prev[i + 1]) + Math.abs(cur[i + 2] - prev[i + 2])
          if (d > 80) { const p = i / 4; sx += p % 80; sy += Math.floor(p / 80); n++ }
        }
        if (n > 26) { // enough motion to be a hand, not noise
          const { w, h, pad } = geom()
          const px = pad + (sx / n / 80) * (w - pad * 2) // mirrored so it feels like a mirror
          const py = pad + (sy / n / 60) * (h - pad * 2)
          strokeLive = true; still = 0; drawing.current = false
          stroke.current.push({ x: w - px, y: py })
          if (stroke.current.length % 3 === 0) redraw()
        } else if (strokeLive && ++still > 9) {
          strokeLive = false
          if (stroke.current.length > 5) evaluate(stroke.current)
          else { stroke.current = []; redraw() }
        }
      }
      prev = cur
    }, 55)
    return () => {
      alive = false
      clearInterval(tick)
      camStream.current?.getTracks().forEach((t) => t.stop())
      camStream.current = null
    }
  }, [camOn, evaluate, redraw])

  // expose the template in pad px so the ?qa solver can draw it honestly
  useEffect(() => {
    const cv = canvasRef.current
    if (cv) cv.dataset.template = JSON.stringify(template.map(toPad))
  })

  return (
    <Veil onClose={onClose}>
      <div data-qa="signpad">
        <div className="jov5-title">{title}</div>
        {sub && <div className="jov5-sub">{sub}</div>}
        <div className="jov5-pad-wrap" ref={wrapRef} style={{ height: 'min(300px, 46vh)' }}>
          <canvas ref={canvasRef} className="jov5-pad" style={{ height: '100%' }}
            data-qa="sign-canvas"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          {camOn && <video ref={videoRef} className="jov5-cam" muted playsInline />}
        </div>
        <div className="jov5-row">
          <button className="jov5-link" onClick={() => { stroke.current = []; setNote(''); redraw() }}>Clear</button>
          {!camOn && typeof navigator.mediaDevices?.getUserMedia === 'function' && (
            <button className="jov5-link" data-qa="sign-cam" onClick={() => setCamOn(true)}>or sign to the camera</button>
          )}
          {camOn && <button className="jov5-link" onClick={() => setCamOn(false)}>stop the camera</button>}
        </div>
        <div className="jov5-note" data-qa="sign-note">{note || (camOn ? 'Move your hand slowly — nothing leaves this device.' : ' ')}</div>
      </div>
    </Veil>
  )
}
