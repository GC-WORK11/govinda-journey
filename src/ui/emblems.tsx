import type { JSX } from 'react'

/**
 * One small hand-drawn emblem per level, keyed by level id.
 * Drawn with loose, slightly uneven strokes — like a pencil mark in a margin.
 * `accent` tints the single filled detail of each drawing.
 */

type G = (a: string) => JSX.Element

const lamp: G = (a) => (
  <>
    <path d="M20 5.5c3.4 4.6 3.8 7.2.3 10.4-3.4-3.2-3-5.8-.3-10.4z" fill={a} stroke="none" opacity=".85" />
    <path d="M20 8.6c1.8 3.4 2.1 4.8.1 6.8" />
    <path d="M9.4 20.6c4.4-1.6 16.8-1.6 21.2 0" />
    <path d="M10.2 22.4c-.4 4.8 4.2 8 9.8 8s10.2-3.2 9.8-8" />
    <path d="M14.5 33.4c3.6 1.2 7.4 1.2 11 0" />
  </>
)

const stone: G = (a) => (
  <>
    <path d="M5.5 30.5c4.8 2.2 11 1.4 13.4-1.2-.6-3.4-4-5-8.6-4.4-3.8.4-5.6 2.6-4.8 5.6z" fill={a} stroke="none" opacity=".5" />
    <path d="M6 30.2c4.6 2 10.4 1.4 12.8-1 .4-3-2.6-4.8-7.6-4.4-4 .2-6.2 2.4-5.2 5.4z" />
    <path d="M18.6 20.4c3.4 1.6 7.8 1.2 9.8-.6.4-2.4-1.8-3.8-5.4-3.6-3 .2-5 1.8-4.4 4.2z" />
    <path d="M27.4 11.6c2.6 1.2 5.8.8 7.2-.6.4-1.8-1.2-2.8-3.8-2.8-2.2.2-3.8 1.4-3.4 3.4z" />
    <path d="M12 13.5c2 .8 4.2.6 5.4-.4" />
  </>
)

const lotus: G = (a) => (
  <>
    <path d="M20 8.5c2.8 4 3 7 .2 10.4-2.8-3.4-3-6.4-.2-10.4z" fill={a} stroke="none" opacity=".5" />
    <path d="M20 8.5c2.8 4 3 7 .2 10.4-2.8-3.4-3-6.4-.2-10.4z" />
    <path d="M13.4 11.4c3.6 2.2 5.4 5 5.2 8.4-3.8-1.6-5.4-4.6-5.2-8.4z" />
    <path d="M26.6 11.2c-3.6 2.4-5.4 5.2-5.2 8.6 3.8-1.8 5.4-4.8 5.2-8.6z" />
    <path d="M10 19.4c3 1 5 2.8 5.8 5.2M30 19.2c-3 1-5 2.8-5.8 5.2" />
    <path d="M6.5 29.5c4.5-2 9-2 13.5.2M20.5 29.7c4.3-2.2 8.7-2.2 13-.2" />
    <path d="M12 33.6c5.4-1.6 10.8-1.6 16 0" />
  </>
)

const plane: G = (a) => (
  <>
    <path d="M19 22.8l15.4-13.4-8.6 21.6c-.2.6-1 .7-1.4.2l-5.4-8.4z" fill={a} stroke="none" opacity=".4" />
    <path d="M5.6 17.2l28.8-8-8.8 22.2c-.4.9-1.6 1-2.2.2l-5-7" />
    <path d="M18.6 23.6l15.8-14.4" />
    <path d="M18.6 23.6l-3.2 6.4c-.3.7-1.3.6-1.6-.1l-1.7-4.6" />
    <path d="M8 30.5c2 .6 4 .4 5.6-.6" />
  </>
)

const leaf: G = (a) => (
  <>
    <path d="M10.5 29.5c-.8-10 5.4-18.6 19-19.6 1.6 13-5.4 20-19 19.6z" fill={a} stroke="none" opacity=".35" />
    <path d="M10.5 29.5c-1-10.6 6-19.4 19.4-19.8.9 13-6.6 20.4-19.4 19.8z" />
    <path d="M12.8 27c5.4-6.4 10.4-10.2 14.6-13" />
    <path d="M16.5 21.5c.2-2 .2-4-.4-5.8M21.6 17.4c1.8-.6 3.6-.8 5.4-.4" />
    <path d="M10.5 29.5l-2.6 4" />
  </>
)

const grove: G = (a) => (
  <>
    <path d="M20 33.6v-5.4M20 28.4c-2.6-.8-4.6-2.4-5.6-4.6M20 28.4c2.6-1 4.6-2.6 5.4-4.8M20 27.6v-3.4" />
    {[
      [10.2, 8.6], [22.6, 8], [11.4, 17.2], [23.4, 16.6],
    ].map(([x, y], i) => (
      <g key={i}>
        <path d={`M${x} ${y}h6.6v4.4h-6.6zM${x - 1.2} ${y + 5.6}h9`} fill={i === 0 ? a : 'none'} fillOpacity=".3" />
      </g>
    ))}
    <path d="M13.6 33.9c4.2-1.2 8.6-1.2 12.8 0" />
  </>
)

const ticket: G = (a) => (
  <>
    <path d="M7.5 14.5c6.8-1.6 18-1.6 25 0v4.4c-2 .8-2 3.4 0 4.2v4.4c-7 1.6-18.2 1.6-25 0v-4.4c2-.8 2-3.4 0-4.2v-4.4z" />
    <path d="M15.5 13.4c-.4 4.4-.4 9 0 13.4" strokeDasharray="2.4 3" />
    <circle cx="24" cy="20.6" r="5" fill={a} stroke="none" opacity=".3" />
    <path d="M20.4 20.8c2.4-1.6 5-1.8 7.2-.4M21.2 23.6c1.8-.8 3.8-.8 5.6 0" />
    <path d="M10.4 17.6h2.4M10.4 21h2.4M10.4 24.4h2.4" />
  </>
)

const phone: G = (a) => (
  <>
    <path d="M13.4 8.4c4-.8 8.6-.8 12.6.2.8 8 .8 15.8 0 23.4-4 .8-8.6.8-12.6-.2-.6-7.8-.6-15.6 0-23.4z" />
    <path d="M17.6 29.4c1.4.4 2.8.4 4.2 0" />
    <path d="M19.2 15.6c-1.6 2.4-1.6 5 0 7.4l2.4 1.6c1-1 2.4-1.2 3.6-.6" stroke={a} />
    <path d="M29.8 13.4c3.2 3.8 3.4 8.4.4 12.6M32.6 10.6c4.2 5 4.6 11.2.8 16.6" />
    <path d="M9.4 16.4c-2 2.6-2.2 5.4-.4 8" />
  </>
)

const ribbon: G = (a) => (
  <>
    <path d="M8.6 13.2c7.8-2.4 15.6-2.6 23-1l-1.4 12.6c-7.2-1.6-14.8-1.4-22.8.8l1.2-12.4z" fill={a} stroke="none" opacity=".3" />
    <path d="M8.4 13c8-2.4 16-2.6 23.4-1.2l-1.4 12.8c-7.4-1.4-14.8-1.2-22.6 1l.6-12.6z" />
    <path d="M8.4 13L5.4 10.4M7.8 25.4l-3 2.8" />
    <path d="M13.4 18.4c4-1 8-1.2 12-.6" />
    <path d="M13 21.8c3.2-.8 6.4-1 9.6-.4" />
  </>
)

const hand: G = (a) => (
  <>
    <path d="M15 33.4c-2.6-1.4-4.2-4.2-4.8-8.4-.3-2.4 2.4-3.2 3.6-1.4l1.4 2.2V12c.1-1.9 2.9-1.9 3 0V9.4c.2-2 3-2 3.2-.2l.2 2.2c.3-1.7 2.9-1.5 2.9.4v10.4c.2 4.6-1.4 8-4.8 10-1.8 1.2-3.8 1.4-4.7 1.2z" fill={a} stroke="none" opacity=".3" />
    <path d="M15 33.4c-2.6-1.4-4.2-4.2-4.8-8.4-.3-2.4 2.4-3.2 3.6-1.4l1.4 2.2V12c.1-1.9 2.9-1.9 3 0V9.4c.2-2 3-2 3.2-.2l.2 2.2c.3-1.7 2.9-1.5 2.9.4v10.4c.2 4.6-1.4 8-4.8 10-1.8 1.2-3.8 1.4-4.7 1.2" />
    <path d="M18.2 13.4v8.8M21.4 11.4l-.2 9.6" />
  </>
)

const chalk: G = (a) => (
  <>
    <path d="M11 25.4l10.8-13c.4-.5 1.2-.6 1.8-.2l3.4 2.4c.6.4.8 1.2.4 1.8l-10.4 13.4c-2.2-.4-4.2-1.8-6-4.4z" fill={a} stroke="none" opacity=".35" />
    <path d="M10.6 25.8l10.8-13.2c.6-.6 1.4-.8 2-.4l3 2.4c.6.5.8 1.3.4 1.9L16.8 30.4c-2.6-.6-4.6-2.2-6.2-4.6z" />
    <path d="M22.4 13.8l3.6 3" />
    <path d="M7.5 33.4c5.2-2.2 10.4-2.8 15.6-1.4 3.6 1 7.2.8 10.4-.6" />
  </>
)

const EMBLEMS: Record<string, G> = {
  L01: lamp, L02: stone, I01: lotus, L03: plane, L04: leaf, L05: grove,
  I02: ticket, L06: phone, L07: ribbon, L08: hand, L09: chalk,
}

export function Emblem({ id, accent = 'currentColor', className }: { id: string; accent?: string; className?: string }) {
  const draw = EMBLEMS[id]
  if (!draw) return null
  return (
    <svg viewBox="0 0 40 40" className={`emblem ${className ?? ''}`} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {draw(accent)}
    </svg>
  )
}

/** The tiny traveller that stands on the progress line. */
export function Walker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`emblem walker ${className ?? ''}`} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20.4" cy="10.6" r="3.6" fill="currentColor" stroke="none" />
      <path d="M20 16.4v7.4M20 19.4l-3.8 3.6M20.2 19.2l3.6 2.8M20 23.8l-2.8 6.6M20.2 23.8l3.4 6" />
    </svg>
  )
}
