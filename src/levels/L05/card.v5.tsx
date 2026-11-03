/**
 * L05 Ent — the story card DOM overlay. A warm paper sheet (Fraunces title,
 * Inter body) with the island's `line`, the peak technical detail (`tech`),
 * and the real repo/demo links — every word straight from registry.ts.
 * Opened by the lectern interactable; player.frozen while it is up.
 */
import { useEffect } from 'react'
import { LEVELS } from '../registry'

const CSS = `
.gj-ent-wrap{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;pointer-events:auto;font-family:Inter,system-ui,sans-serif}
.gj-ent-card{pointer-events:auto;width:min(360px,88vw);max-height:min(78vh,560px);overflow-y:auto;background:#f6efe0;border-radius:18px;padding:20px 22px 18px;box-shadow:0 26px 60px -20px rgba(45,36,30,.5),0 1px 0 rgba(255,255,255,.5) inset;transform:rotate(-.4deg);animation:gjEntIn .4s cubic-bezier(.2,.7,.2,1) both}
@keyframes gjEntIn{from{transform:translateY(18px) rotate(-.4deg);opacity:0}to{transform:rotate(-.4deg);opacity:1}}
.gj-ent-eyebrow{font:500 10.5px Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a7a63;margin-bottom:6px}
.gj-ent-title{font:600 21px Fraunces,Georgia,serif;color:#3b3330;letter-spacing:.01em;line-height:1.15}
.gj-ent-line{font:400 13px/1.55 Inter,system-ui,sans-serif;color:#6b5f57;margin:8px 0 12px}
.gj-ent-tech{border-radius:12px;background:#ede2cc;padding:10px 12px;font:400 12.5px/1.6 Inter,system-ui,sans-serif;color:#5d5047}
.gj-ent-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.gj-ent-links a{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;background:#3b3330;color:#fbf6ee;font:500 12px Inter,system-ui,sans-serif;text-decoration:none;letter-spacing:.02em;transition:transform .15s}
.gj-ent-links a:hover{transform:translateY(-1px)}
.gj-ent-links a.paper{background:transparent;color:#3b3330;box-shadow:inset 0 0 0 1.5px #b7a68b}
.gj-ent-close{position:absolute;top:8px;right:10px;width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:#8a7a63;font:400 17px/1 Inter;cursor:pointer;display:grid;place-items:center}
.gj-ent-close:hover{background:rgba(59,51,48,.07)}
`

export default function EntCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const L = LEVELS.find((l) => l.id === 'L05')!

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="gj-ent-wrap" data-qa="ent-card" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <style>{CSS}</style>
      <div className="gj-ent-card" role="dialog" aria-label={L.title}>
        <button className="gj-ent-close" aria-label="Close" data-qa="ent-card-close" onClick={onClose}>×</button>
        <div className="gj-ent-eyebrow">{L.place} · {L.title}</div>
        <div className="gj-ent-title">{L.line}</div>
        <div className="gj-ent-line">{L.story}</div>
        <div className="gj-ent-tech">{L.tech}</div>
        <div className="gj-ent-links">
          {L.links.map((k, i) => (
            <a key={k.href} href={k.href} target="_blank" rel="noreferrer" className={i > 0 ? 'paper' : ''} data-qa={`ent-link-${k.label.toLowerCase()}`}>{k.label} ↗</a>
          ))}
        </div>
      </div>
    </div>
  )
}
