/**
 * The last moment: L09 is done, the camera has pulled back over the whole lit
 * path, and a quiet card appears — name, one line (registry copy only), the
 * résumé and contact links from the V4 finale, and "Keep walking" to hand the
 * camera back to the traveller.
 */
import { cinematic } from '../core'
import { CONTACT, RESUME } from '../../levels/registry'
import { LEVEL_BY_ID } from '../world/Island5'
import { useWorldUI } from '../world/progress'

export function Finale() {
  const on = useWorldUI((s) => s.finale)
  const L = LEVEL_BY_ID['L09']
  return (
    <div className={`v5-fin ${on ? 'on' : ''}`} aria-hidden={!on}>
      <div className="card">
        <p className="eyebrow">{L?.place} · {L?.title}</p>
        <h1>Govinda Chauhan</h1>
        <p className="line">{L?.line}</p>
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
