/**
 * The last moment: L09 is done, the camera has pulled back over the whole lit
 * path, and the portfolio closes in — name, the projects you just walked
 * through with their real links, a stack line, and the ways to reach Govinda.
 * Copy comes only from registry fields; `tech`/`story` claims stay hidden
 * until docs/FACTS.md marks them verified (src/v5/ui/facts.ts).
 */
import { cinematic, V5_ORDER, type IslandId } from '../core'
import { CONTACT, RESUME, LEVELS } from '../../levels/registry'
import { LEVEL_BY_ID } from '../world/Island5'
import { useWorldUI } from '../world/progress'
import { FACTS_PENDING, techVerified } from './facts'

/** The islands that are projects (story/interlude chapters aren't listed). */
const PROJECTS = V5_ORDER
  .map((id) => LEVELS.find((l) => l.id === id)!)
  .filter((l) => l && (l.links.length > 0 || l.tech) && l.id !== 'L09')
  .map((l) => l.id as IslandId)

/** Short stack words, kept to what each project page itself states. */
const STACK: [string, IslandId][] = [
  ['React · Vercel', 'L03'],
  ['Rust', 'L05'],
  ['C++20 · Expo', 'L06'],
]

export function Finale() {
  const on = useWorldUI((s) => s.finale)
  const L = LEVEL_BY_ID['L09']
  return (
    <div className={`v5-fin ${on ? 'on' : ''}`} aria-hidden={!on}>
      <div className="card">
        <p className="eyebrow">{L?.place} · {L?.title}</p>
        <h1>Govinda Chauhan</h1>
        <p className="line">{L?.line}</p>

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
          {CONTACT.map((k) => <a key={k.href} href={k.href} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1}>{k.label}</a>)}
        </p>
        <div className="row">
          <a className="btn" href={RESUME} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1}>Résumé</a>
          <button className="keep" tabIndex={on ? 0 : -1} onClick={() => { cinematic.on = false; useWorldUI.setState({ finale: false }) }}>
            Keep walking
          </button>
        </div>
      </div>
    </div>
  )
}
