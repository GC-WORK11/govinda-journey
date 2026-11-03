/**
 * The timeline ribbon: one thin line across the top, 2023 · 2024 · 2025 · 2026,
 * a tick per island and a small marker that eases to wherever you are. Ticks
 * sit on a soft time scale (55% index + 45% real time) — the empty stretch
 * between 2024 and mid-2026 is the quiet year, left visible on purpose.
 */
import { useV5, V5_ORDER, type IslandId } from '../core'
import { useWorldUI } from '../world/progress'

/** Rough year each island belongs to (see registry `WHEN`). */
const T: Record<IslandId, number> = {
  L01: 2023.0, L02: 2023.5, L03: 2024.15, I01: 2024.55,
  L05: 2026.62, L04: 2026.77, I02: 2026.8, L06: 2026.83,
  L07: 2026.85, L08: 2026.88, L09: 2026.9,
}
const T0 = 2023, T1 = 2026.9
const N = V5_ORDER.length
/** Blended position 0..1 along the rail. */
export const tickPos = (i: number) => 0.55 * (i / (N - 1)) + 0.45 * ((T[V5_ORDER[i]] - T0) / (T1 - T0))

const YEARS: [string, number][] = [
  ['2023', (tickPos(0) + tickPos(1)) / 2],
  ['2024', (tickPos(2) + tickPos(3)) / 2],
  ['2025', (tickPos(3) + tickPos(4)) / 2],
  ['2026', (tickPos(4) + tickPos(10)) / 2],
]

export function Ribbon() {
  const idx = useWorldUI((s) => s.idx)
  const done = useV5((s) => s.done)
  return (
    <div className="v5-ribbon" aria-hidden>
      <div className="rail">
        <div className="line" />
        {V5_ORDER.map((id, i) => (
          <i key={id} className={`tick ${done.includes(id) ? 'done' : ''}`} style={{ left: `${tickPos(i) * 100}%` }} />
        ))}
        {YEARS.map(([y, x]) => (
          <span key={y} className="yr" style={{ left: `${x * 100}%` }}>{y}</span>
        ))}
        <i className="dot" style={{ left: `${tickPos(idx) * 100}%` }} />
      </div>
    </div>
  )
}
