/// <reference types="vite/client" />
import { lazy, Suspense, useEffect } from 'react'
import Overlay from './ui/Overlay'
import { useJourney } from './state/store'
import { LEVELS } from './levels/registry'

const World = lazy(() => import('./world/World'))
const World5 = lazy(() => import('./v5/World5'))

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
    ;(window as any).__journey = {
      state: () => useJourney.getState(),
      win: () => useJourney.getState().win(),
      levels: LEVELS.map((l) => l.id),
    }
    // ?qa&at=L05 jumps to that island; add &play to open its game directly
    const at = q.get('at')
    if (at) { const i = LEVELS.findIndex((l) => l.id === at); const s = useJourney.getState(); if (i >= 0) { s.start(); s.goto(i); s.setPhase(q.has('play') ? 'playing' : 'arrived') } }
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
        <Overlay />
      </div>
    )
  }

  return (
    <div className="app">
      {gl ? <Suspense fallback={null}><World5 /></Suspense> : <div className="world-fallback" />}
    </div>
  )
}
