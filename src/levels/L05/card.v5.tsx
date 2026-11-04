/**
 * L05 Ent — the two link pills that show at the lectern once its lines have been
 * read. No panel: the story is spoken in the caption, the links come from registry.ts.
 */
import { LEVELS } from '../registry'

const L = LEVELS.find((l) => l.id === 'L05')!
const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999,
  background: '#3b3330', color: '#fbf6ee', font: '500 12px Inter, system-ui, sans-serif',
  letterSpacing: '.02em', textDecoration: 'none',
} as const
const paper = { ...pill, background: 'transparent', color: '#3b3330', boxShadow: 'inset 0 0 0 1.5px #b7a68b' } as const

export default function EntLinks() {
  return (
    <div style={{
      position: 'fixed', top: 'calc(max(18px, env(safe-area-inset-top)) + 318px)', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, pointerEvents: 'auto', whiteSpace: 'nowrap',
    }}>
      {L.links.map((k, i) => (
        <a key={k.href} href={k.href} target="_blank" rel="noreferrer" data-qa={`ent-link-${k.label.toLowerCase()}`} style={i ? paper : pill}>
          {k.label} ↗
        </a>
      ))}
    </div>
  )
}
