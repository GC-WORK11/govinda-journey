import { lazy, Suspense, useEffect } from 'react'
import Overlay from './ui/Overlay'
import { useJourney } from './state/store'
import { LEVELS } from './levels/registry'

const World = lazy(() => import('./world/World'))

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export default function App() {
  useEffect(() => {
    // Test hook for automated play-through only (?qa in the URL). Not shown to visitors.
    if (new URLSearchParams(location.search).has('qa')) {
      ;(window as any).__journey = {
        state: () => useJourney.getState(),
        win: () => useJourney.getState().win(),
        levels: LEVELS.map((l) => l.id),
      }
      // ?qa&at=L05 jumps to that island; add &play to open its game directly
      const q = new URLSearchParams(location.search); const at = q.get('at')
      if (at) { const i = LEVELS.findIndex((l) => l.id === at); const s = useJourney.getState(); if (i >= 0) { s.start(); s.goto(i); s.setPhase(q.has('play') ? 'playing' : 'arrived') } }
    }
  }, [])
  const gl = webglOk()
  return (
    <div className="app">
      <div className="world" aria-hidden>
        {gl ? <Suspense fallback={null}><World /></Suspense> : <div className="world-fallback" />}
      </div>
      <Overlay />
    </div>
  )
}
