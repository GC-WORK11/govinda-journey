/**
 * The ability row, bottom-left: seven engraved line glyphs (thin strokes, no
 * fills, no emoji). Earned ones rise softly into place; the rest stay as a
 * faint dotted notch — a row that fills in as the journey gives you hands.
 */
import { useV5, type Ability } from '../core'

const ORDER: Ability[] = ['climb', 'build', 'power', 'sense', 'remote', 'voice', 'sign']

/** One 24×24 stroke drawing per ability. */
const ART: Record<Ability, JSX.Element> = {
  // a short staircase, climbing left to right
  climb: <path d="M3.5 20h4.2v-4.3h4.2v-4.3h4.2V7.1h4.4" />,
  // two bricks below, one on top — building
  build: (
    <>
      <rect x="3.5" y="13.5" width="6.6" height="6.6" rx="0.8" />
      <rect x="13.9" y="13.5" width="6.6" height="6.6" rx="0.8" />
      <rect x="8.7" y="6.9" width="6.6" height="6.6" rx="0.8" />
    </>
  ),
  // a hub with four satellite nodes — shared power
  power: (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <circle cx="5.2" cy="5.6" r="1.5" /><circle cx="18.8" cy="5.6" r="1.5" />
      <circle cx="5.2" cy="18.4" r="1.5" /><circle cx="18.8" cy="18.4" r="1.5" />
      <path d="M10.3 10.4 6.6 7M13.7 10.4 17.4 7M10.3 13.6 6.6 17M13.7 13.6l3.7 3.4" />
    </>
  ),
  // a source dot with three reading rings — pulse of air
  sense: (
    <>
      <circle cx="12" cy="17.2" r="1.7" />
      <path d="M8.6 13.8a4.8 4.8 0 0 1 6.8 0" />
      <path d="M6.1 11.2a8.3 8.3 0 0 1 11.8 0" />
      <path d="M3.6 8.6a11.8 11.8 0 0 1 16.8 0" />
    </>
  ),
  // a little quad drone seen from above — remote reach
  remote: (
    <>
      <rect x="10.2" y="10.2" width="3.6" height="3.6" rx="1" />
      <path d="M10.4 10.4 6.8 6.8M13.6 10.4l3.6-3.6M10.4 13.6l-3.6 3.6M13.6 13.6l3.6 3.6" />
      <circle cx="5.6" cy="5.6" r="2.1" /><circle cx="18.4" cy="5.6" r="2.1" />
      <circle cx="5.6" cy="18.4" r="2.1" /><circle cx="18.4" cy="18.4" r="2.1" />
    </>
  ),
  // a spoken line — five bars of voice
  voice: <path d="M4.5 10.5v3M8 8v8M11.5 5v14M15 8.5v7M18.5 10.5v3" />,
  // an open hand, four fingers — the sign you teach
  sign: (
    <>
      <path d="M7.6 20.2v-5.1c0-2 .4-3.6.8-5.4" />
      <path d="M8.4 9.7V5.9a1.15 1.15 0 0 1 2.3 0v4.6" />
      <path d="M10.7 10.5V4.7a1.15 1.15 0 0 1 2.3 0v5.8" />
      <path d="M13 10.5V5.2a1.15 1.15 0 0 1 2.3 0v6.3" />
      <path d="M15.3 11.5V8.2a1.15 1.15 0 0 1 2.3.3v5.7c0 3.3-2.2 6-5.2 6h-1" />
    </>
  ),
}

const NAMES: Record<Ability, string> = {
  climb: 'Climb', build: 'Build', power: 'Shared power', sense: 'Sense',
  remote: 'Long reach', voice: 'Voice', sign: 'Sign',
}

export function Glyphs() {
  const abilities = useV5((s) => s.abilities)
  return (
    <div className="v5-glyphs" aria-label="Abilities">
      {ORDER.map((a) => (
        <span key={a} className={`v5-glyph ${abilities.includes(a) ? 'earned' : ''}`} title={NAMES[a]} role="img" aria-label={NAMES[a]}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle className="ghost" cx="12" cy="12" r="9" fill="none" strokeWidth="1" strokeDasharray="1.6 2.4" />
            <g className="art">{ART[a]}</g>
          </svg>
        </span>
      ))}
    </div>
  )
}
