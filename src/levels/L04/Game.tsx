import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'
import './L04.css'

// Mini Delhi map with 3 sensor spots. Tap to place sensors, watch haze clear street by street.
const P = {
  road: '#e3ddd2', block: '#d4c5ae', park: '#9cbf74', haze: '#999',
  good: '#8fbf7a', moderate: '#d9a858', poor: '#d9825b', cream: '#f3e9da',
}

type Sensor = { x: number; y: number; placed: number }
const SPOTS = [{ x: 100, y: 80 }, { x: 240, y: 120 }, { x: 160, y: 200 }]
const STREETS = [
  { x1: 60, y1: 40, x2: 280, y2: 40, sensor: 0 },
  { x1: 60, y1: 90, x2: 280, y2: 90, sensor: 0 },
  { x1: 60, y1: 140, x2: 280, y2: 140, sensor: 1 },
  { x1: 60, y1: 190, x2: 280, y2: 190, sensor: 2 },
  { x1: 60, y1: 240, x2: 280, y2: 240, sensor: 2 },
  { x1: 80, y1: 20, x2: 80, y2: 260, sensor: 0 },
  { x1: 140, y1: 20, x2: 140, y2: 260, sensor: 1 },
  { x1: 200, y1: 20, x2: 200, y2: 260, sensor: 1 },
  { x1: 260, y1: 20, x2: 260, y2: 260, sensor: 2 },
]
const BLOCKS = [
  { x: 90, y: 50, w: 40, h: 30 },
  { x: 210, y: 50, w: 40, h: 30 },
  { x: 150, y: 100, w: 40, h: 30 },
  { x: 90, y: 150, w: 40, h: 30 },
  { x: 210, y: 150, w: 40, h: 30 },
  { x: 90, y: 200, w: 40, h: 30 },
  { x: 210, y: 200, w: 40, h: 30 },
]
const PARK = { x: 150, y: 50, w: 50, h: 30 }
const QUALITIES = [P.good, P.moderate, P.poor]

export default function Game({ onWin }: GameProps) {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [tick, setTick] = useState(0)
  const winRef = useRef(onWin); winRef.current = onWin
  const timerRef = useRef<number>()

  useEffect(() => {
    if (sensors.length === 3) {
      timerRef.current = window.setTimeout(() => {
        const int = setInterval(() => setTick((t) => t + 1), 580)
        setTimeout(() => { clearInterval(int); winRef.current() }, 3800)
      }, 400)
    }
    return () => clearTimeout(timerRef.current)
  }, [sensors.length])

  const place = (i: number) => {
    if (sensors.length >= 3) return
    const spot = SPOTS[i]
    setSensors((s) => [...s, { x: spot.x, y: spot.y, placed: Date.now() }])
  }

  const hazeOpacity = sensors.length === 3 ? Math.max(0, 0.72 - tick * 0.13) : 0.72

  return (
    <div className="l04">
      <div className="l04-wash" />
      <p className="l04-title">Clear the air</p>
      <div className="l04-stage">
        <svg viewBox="0 0 340 300" aria-label="Delhi street map">
          {/* streets */}
          {STREETS.map((st, i) => {
            const s = sensors[st.sensor]
            const col = s ? QUALITIES[(st.sensor + i) % 3] : P.road
            const op = s ? Math.min(1, (Date.now() - s.placed) / 900) : 0
            return (
              <line
                key={i} x1={st.x1} y1={st.y1} x2={st.x2} y2={st.y2}
                stroke={col} strokeWidth="9" strokeLinecap="round"
                opacity={0.35 + op * 0.65}
              />
            )
          })}
          {/* blocks */}
          {BLOCKS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill={P.block} />
          ))}
          {/* park */}
          <rect x={PARK.x} y={PARK.y} width={PARK.w} height={PARK.h} rx="5" fill={P.park} />
          <g opacity="0.6">
            <circle cx={165} cy={65} r="7" fill="#7fa855" />
            <circle cx={175} cy={58} r="5.5" fill="#7fa855" />
            <circle cx={185} cy={68} r="6" fill="#7fa855" />
          </g>
          {/* haze */}
          {sensors.length < 3 && (
            <rect x="50" y="10" width="240" height="270" rx="12" fill={P.haze} opacity={hazeOpacity} pointerEvents="none" />
          )}
          {sensors.length === 3 && hazeOpacity > 0 && (
            <rect x="50" y="10" width="240" height="270" rx="12" fill={P.haze} opacity={hazeOpacity} pointerEvents="none" />
          )}
          {/* sensor spots */}
          {SPOTS.map((spot, i) => {
            const placed = sensors.some((s) => s.x === spot.x && s.y === spot.y)
            if (placed) return null
            return (
              <g key={i}>
                <circle
                  cx={spot.x} cy={spot.y} r="16" fill={P.cream} opacity="0.85"
                  className="l04-spot"
                />
                <circle
                  cx={spot.x} cy={spot.y} r="16" fill="none" stroke="#d9825b"
                  strokeWidth="2.5" opacity="0.6" className="l04-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              </g>
            )
          })}
          {/* placed sensors */}
          {sensors.map((s, i) => (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r="11" fill={P.cream} />
              <circle cx={s.x} cy={s.y} r="6" fill={QUALITIES[i % 3]} />
              <circle cx={s.x} cy={s.y - 2} r="2" fill="#fff" opacity="0.7" />
            </g>
          ))}
          {/* clickable areas */}
          {SPOTS.map((spot, i) => {
            const placed = sensors.some((s) => s.x === spot.x && s.y === spot.y)
            if (placed) return null
            return (
              <circle
                key={i} cx={spot.x} cy={spot.y} r="20" fill="transparent"
                className="l04-hotspot" data-qa={`sensor-${i}`}
                onClick={() => place(i)}
                style={{ cursor: 'pointer' }}
              />
            )
          })}
        </svg>
      </div>
      <div className="l04-foot">
        <div className="l04-pills">
          <span className="l04-pill">{sensors.length} / 3 sensors</span>
          <span className="l04-pill dim">street map</span>
          {sensors.length === 3 && <span className="l04-pill dim">every 15 min</span>}
        </div>
        <p className="l04-hint">
          {sensors.length === 0 && 'Tap the bright spots to place sensors.'}
          {sensors.length > 0 && sensors.length < 3 && 'Keep going…'}
          {sensors.length === 3 && 'Air clearing street by street.'}
        </p>
      </div>
    </div>
  )
}
