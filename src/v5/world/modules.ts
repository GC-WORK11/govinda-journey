/// <reference types="vite/client" />
/**
 * Drop-in module slots. Other areas land files that Vite picks up through these
 * globs — until then WORLD renders quiet fallbacks so the shell always works.
 */
import { Component, lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { IslandId, ObstacleProps } from '../core'
import { V5_ORDER } from '../core'

const obstacleMods = import.meta.glob('../../levels/*/Obstacle.tsx')
const artMods = import.meta.glob('../art/*.tsx')
const playerMods = import.meta.glob('../player/*.tsx')

type Any = ComponentType<any>
/** Lazy-load `key`; uses `default` or the named export `pick` — never null on the component. */
const take = (mods: Record<string, () => Promise<unknown>>, key: string, pick?: string) => {
  const loader = mods[key]
  if (!loader) return null
  return lazy(() =>
    (loader() as Promise<Record<string, Any>>).then((m) => ({ default: (pick && m[pick]) || m.default || (() => null) })),
  ) as LazyExoticComponent<Any>
}

/** Lazy obstacle component per island (null until ISL-* lands it). */
export const OBSTACLES: Partial<Record<IslandId, LazyExoticComponent<ComponentType<ObstacleProps>>>> = {}
for (const id of V5_ORDER) OBSTACLES[id] = take(obstacleMods, `../../levels/${id}/Obstacle.tsx`) as never
export const hasObstacle = (id: IslandId) => !!OBSTACLES[id]

const dioramaMods = import.meta.glob('../../levels/*/Diorama.tsx')
/** Lazy V4 diorama per island — the parity layer under each Obstacle. */
export const DIORAMAS: Partial<Record<IslandId, LazyExoticComponent<Any>>> = {}
for (const id of V5_ORDER) DIORAMAS[id] = take(dioramaMods, `../../levels/${id}/Diorama.tsx`) as never

/** ART modules, present only when the files exist (named exports, per ART's files). */
export const ArtIslandBase = take(artMods, '../art/IslandBase.tsx', 'IslandBase')
export const ArtWater = take(artMods, '../art/Water.tsx', 'Water')
export const ArtClouds = take(artMods, '../art/Clouds5.tsx', 'Clouds5')
export const ArtEffects = take(artMods, '../art/Effects5.tsx', 'Effects5')

/** PLAYER modules. */
export const Player = take(playerMods, '../player/Player.tsx')
export const Controls = take(playerMods, '../player/Controls.tsx')

/** One module's bug must never take the world down — render `fallback`, log once. */
export class Guard extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode; onError?: () => void },
  { err: boolean }
> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: unknown) { console.error('[v5] module failed:', e); this.props.onError?.() }
  render() { return this.state.err ? (this.props.fallback ?? null) : this.props.children }
}
