import type { ComponentType, LazyExoticComponent } from 'react'

/** Props every mini-game receives. Call onWin() exactly once when the player succeeds. */
export type GameProps = { onWin: () => void }
/**
 * The in-world 3D mini-game. Rendered INSIDE the R3F canvas, inside the island's group
 * (island-local coordinates: island top at y=0, radius 3.2, building at the centre,
 * traveller stands at (-0.9, 0, 1.4)). `won` flips true right after onWin (play the payoff).
 */
export type PlayProps = { onWin: () => void; won: boolean }
/** Props every island diorama receives. `unlocked` = the level is solved (drop the scaffold). */
export type DioramaProps = { unlocked: boolean; active: boolean }

export type LevelLink = { label: string; href: string }

export type LevelDef = {
  id: string
  kind: 'level' | 'interlude' | 'finale'
  place: string        // small label above the title, e.g. "Patna, 2023"
  title: string        // serif title
  line: string         // one quiet line shown on arrival (his voice, first person)
  task: string         // what the visitor does, one short sentence
  hint: string         // the ONE on-screen line while playing: a verb + object, max ~6 words
  story: string        // panel: 1-2 sentences, first person, plain words
  tech: string         // panel: what it technically does, plain but precise
  links: LevelLink[]
  badge: string        // badge name awarded on win
  palette: { ground: string; accent: string }
  Play: LazyExoticComponent<ComponentType<PlayProps>>
  Diorama: LazyExoticComponent<ComponentType<DioramaProps>>
}
