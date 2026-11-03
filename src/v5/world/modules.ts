/// <reference types="vite/client" />
/**
 * Drop-in module slots. Other areas land files that Vite picks up through these
 * globs — until then WORLD renders quiet fallbacks so the shell always works.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { IslandId, ObstacleProps } from '../core'
import { V5_ORDER } from '../core'

const obstacleMods = import.meta.glob('../../levels/*/Obstacle.tsx')
const artMods = import.meta.glob('../art/*.tsx')
const playerMods = import.meta.glob('../player/*.tsx')

type Any = ComponentType<any>
const take = (mods: Record<string, () => Promise<unknown>>, key: string) =>
  (mods[key] ? lazy(mods[key] as () => Promise<{ default: Any }>) : null) as LazyExoticComponent<Any> | null

/** Lazy obstacle component per island (null until ISL-* lands it). */
export const OBSTACLES: Partial<Record<IslandId, LazyExoticComponent<ComponentType<ObstacleProps>>>> = {}
for (const id of V5_ORDER) OBSTACLES[id] = take(obstacleMods, `../../levels/${id}/Obstacle.tsx`) as never
export const hasObstacle = (id: IslandId) => !!OBSTACLES[id]

/** ART modules, present only when the files exist. */
export const ArtIslandBase = take(artMods, '../art/IslandBase.tsx')
export const ArtWater = take(artMods, '../art/Water.tsx')
export const ArtClouds = take(artMods, '../art/Clouds5.tsx')
export const ArtEffects = take(artMods, '../art/Effects5.tsx')

/** PLAYER modules. */
export const Player = take(playerMods, '../player/Player.tsx')
export const Controls = take(playerMods, '../player/Controls.tsx')
