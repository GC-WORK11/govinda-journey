/**
 * The V5 DOM chrome: wordmark, timeline ribbon, one-line caption, ability
 * glyphs, finale card, and PLAYER's touch Controls when they land.
 * Also the progression watcher: arriving at an island shows its `line`;
 * completing one shows `tech` for ~6 s; completing L09 starts the finale.
 */
import { Suspense, useEffect } from 'react'
import { useV5, cinematic, V5_ORDER } from '../core'
import { LEVEL_BY_ID } from '../world/Island5'
import { Controls } from '../world/modules'
import { useWorldUI } from '../world/progress'
import { Ribbon } from './Ribbon'
import { Caption } from './Caption'
import { Glyphs } from './Glyphs'
import { Finale } from './Finale'

const TECH_MS = 6000

function useProgression() {
  useEffect(() => {
    let techTimer = 0
    const arrive = (idx: number) => {
      const L = LEVEL_BY_ID[V5_ORDER[idx]]
      if (!L) return
      useWorldUI.setState({ capEyebrow: L.place })
      useV5.getState().setCaption(L.line)
    }
    const unsubIdx = useWorldUI.subscribe((s, p) => { if (s.idx !== p.idx) arrive(s.idx) })
    const unsubDone = useV5.subscribe((s, p) => {
      if (s.done.length === p.done.length) return
      const id = s.done[s.done.length - 1]
      const L = LEVEL_BY_ID[id]
      window.clearTimeout(techTimer)
      if (L) {
        const tech = L.tech || L.line
        useWorldUI.setState({ capEyebrow: `${L.place} · ${L.badge}` })
        useV5.getState().setCaption(tech)
        techTimer = window.setTimeout(() => {
          if (useV5.getState().caption === tech) useV5.getState().setCaption(null)
        }, TECH_MS)
      }
      if (id === 'L09') { cinematic.on = true; useWorldUI.setState({ finale: true }) }
    })
    arrive(useWorldUI.getState().idx)
    return () => { unsubIdx(); unsubDone(); window.clearTimeout(techTimer) }
  }, [])
}

export default function Chrome() {
  useProgression()
  const idx = useWorldUI((s) => s.idx)
  return (
    <div className="v5">
      <span className="v5-mark">Govinda<em className="v5-prog">{String(idx + 1).padStart(2, '0')} / {V5_ORDER.length}</em><small>The Journey</small></span>
      <Ribbon />
      <Caption />
      <Glyphs />
      <Finale />
      {Controls && (
        <Suspense fallback={null}>
          <Controls />
        </Suspense>
      )}
    </div>
  )
}
