/// <reference types="vite/client" />
import { Component, lazy, Suspense, useEffect } from 'react'

const World = lazy(() => import('./world/World'))
const World5 = lazy(() => import('./v5/World5'))
// V4-only chrome — keep it (and registry/store) off the V5 cold path.
const Overlay = lazy(() => import('./ui/Overlay'))

try { performance.mark('fj:app') } catch { /* marking must never break the app */ }

// PLAYER's sandbox, routed only while it exists
const sandboxMods = import.meta.glob('./v5/player/Sandbox.tsx')
const Sandbox = sandboxMods['./v5/player/Sandbox.tsx']
  ? lazy(sandboxMods['./v5/player/Sandbox.tsx'] as () => Promise<{ default: React.ComponentType }>)
  : null

/**
 * One error boundary around the world mount. A synchronous `getContext` probe
 * is flaky under cold GPU init (incognito + CPU throttle can transiently
 * return null on WebGL-capable machines and strand the page on an empty
 * fallback with no lazy import ever fired). Let the Canvas try for real —
 * if WebGL genuinely can't initialise, the renderer throws during mount and
 * this boundary shows the same quiet fallback the probe used to.
 */
class WorldFallback extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? <div className="world-fallback" /> : this.props.children }
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

  if (q.has('sandbox') && Sandbox) {
    return <Suspense fallback={null}><Sandbox /></Suspense>
  }

  if (v4) {
    return (
      <div className="app">
        <div className="world" aria-hidden>
          <WorldFallback><Suspense fallback={null}><World /></Suspense></WorldFallback>
        </div>
        <Suspense fallback={null}><Overlay /></Suspense>
      </div>
    )
  }

  return (
    <div className="app">
      <WorldFallback><Suspense fallback={null}><World5 /></Suspense></WorldFallback>
    </div>
  )
}
