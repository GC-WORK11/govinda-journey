/**
 * The last moment: L09 is done, the camera has pulled back over the whole lit
 * path, and the portfolio closes in — name, the projects you just walked
 * through with their real links, a stack line, and the ways to reach Govinda.
 * Copy comes only from registry fields; `tech`/`story` claims stay hidden
 * until docs/FACTS.md marks them verified (src/v5/ui/facts.ts).
 */
import { cinematic, V5_ORDER, type IslandId } from '../core'
import { CONTACT, RESUME } from '../../levels/registry'
import { LEVEL_BY_ID } from '../world/Island5'
import { useWorldUI } from '../world/progress'
import { FACTS_PENDING, techVerified } from './facts'

/** The project islands, in journey order (docs/FACTS.md repo/demo table —
 *  L01, L02, I01 and I02 are story chapters, not projects). */
const PROJECTS = (['L03', 'L05', 'L04', 'L06', 'L07', 'L08'] as IslandId[])
  .filter((id) => V5_ORDER.includes(id))

/** Short stack words, kept to what each project page itself states. */
const STACK: [string, IslandId][] = [
  ['React · Vercel', 'L03'],
  ['Rust', 'L05'],
  ['C++20 · Expo', 'L06'],
  ['Linux · Wispr Flow', 'L07'],
  ['Shape match', 'L08'],
]

export function Finale() {
  const on = useWorldUI((s) => s.finale)
  const L = LEVEL_BY_ID['L09']
  return (
    <div className={`v5-fin ${on ? 'on' : ''}`} aria-hidden={!on}>
      <div className="card">
        <p className="eyebrow">{L?.place} · {L?.title}</p>
        <h1>Govinda Chauhan</h1>
        <p className="line">{LEVEL_BY_ID['L01']?.line}</p>
        <p className="line" style={{ marginTop: 12 }}>{L?.line}</p>

        <div className="projs">
          {PROJECTS.map((id) => {
            const p = LEVEL_BY_ID[id]
            if (!p) return null
            return (
              <p className="proj" key={id}>
                <span className="pt">{p.title}</span>
                <span className="pp">{p.place}</span>
                {techVerified(id) && <span className="pk">{p.tech}</span>}
                {p.links.length > 0 && (
                  <span className="pl">
                    {p.links.map((k) => (
                      <a key={k.href} href={k.href} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1}>{k.label}</a>
                    ))}
                  </span>
                )}
              </p>
            )
          })}
        </div>

        {!FACTS_PENDING && (
          <p className="stack">{STACK.filter(([, id]) => techVerified(id)).map(([s]) => s).join(' · ') || null}</p>
        )}

        <p className="links">
          {/* Résumé is the button below — once only, not again in the link row */}
          {CONTACT.filter((k) => k.href !== RESUME).map((k) => <a key={k.href} href={k.href} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1}>{k.label}</a>)}
        </p>
        <div className="row">
          <a className="btn" href={RESUME} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1}>Résumé</a>
          <button className="keep" tabIndex={on ? 0 : -1} onClick={() => { cinematic.on = false; useWorldUI.setState({ finale: false }) }}>
            Keep walking
          </button>
        </div>
        <p className="credit">Built with voice via Wispr Flow + vibe-coding tools</p>
      </div>
    </div>
  )
}
