/// <reference types="vite/client" />
import { lazy, Suspense, useEffect } from 'react'

const World = lazy(() => import('./world/World'))
// Fire the V5 import at module eval, not at first render — React's commit
// would otherwise sit between entry eval and the chunk request on the cold path.
const wantWorld5 = !new URLSearchParams(location.search).has('v4')
  && !new URLSearchParams(location.search).has('sandbox') && webglOk()
const world5Promise = wantWorld5 ? import('./v5/World5') : null
const World5 = lazy(() => world5Promise ?? import('./v5/World5'))
// V4-only chrome — keep it (and registry/store) off the V5 cold path.
const Overlay = lazy(() => import('./ui/Overlay'))

try { performance.mark('fj:app') } catch { /* marking must never break the app */ }

// PLAYER's sandbox, routed only while it exists
const sandboxMods = import.meta.glob('./v5/player/Sandbox.tsx')
const Sandbox = sandboxMods['./v5/player/Sandbox.tsx']
  ? lazy(sandboxMods['./v5/player/Sandbox.tsx'] as () => Promise<{ default: React.ComponentType }>)
  : null

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export default function App() {
  const q = new URLSearchParams(location.search)
  const v4 = q.has('v4')

  useEffect(() => {
    // Test hook for automated play-through only (?qa in the URL). Not shown to visitors.
    if (!v4 || !q.has('qa')) return
    Promise.all([import('./state/store'), import('./levels/registry')]).then(([{ useJourney }, { LEVELS }]) => {
      ;(window as any).__journey = {
        state: () => useJourney.getState(),
        win: () => useJourney.getState().win(),
        levels: LEVELS.map((l) => l.id),
      }
      // ?qa&at=L05 jumps to that island; add &play to open its game directly
      const at = q.get('at')
      if (at) { const i = LEVELS.findIndex((l) => l.id === at); const s = useJourney.getState(); if (i >= 0) { s.start(); s.goto(i); s.setPhase(q.has('play') ? 'playing' : 'arrived') } }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const gl = webglOk()

  if (q.has('sandbox') && Sandbox) {
    return <Suspense fallback={null}><Sandbox /></Suspense>
  }

  if (v4) {
    return (
      <div className="app">
        <div className="world" aria-hidden>
          {gl ? <Suspense fallback={null}><World /></Suspense> : <div className="world-fallback" />}
        </div>
        <Suspense fallback={null}><Overlay /></Suspense>
      </div>
    )
  }

  return (
    <div className="app">
      {gl ? <Suspense fallback={null}><World5 /></Suspense> : <div className="world-fallback" />}
    </div>
  )
}
