import type { ComponentType, LazyExoticComponent } from 'react'

/** Props every mini-game receives. Call onWin() exactly once when the player succeeds. */
export type GameProps = { onWin: () => void }
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
  story: string        // panel: 1-2 sentences, first person, plain words
  tech: string         // panel: what it technically does, plain but precise
  links: LevelLink[]
  badge: string        // badge name awarded on win
  palette: { ground: string; accent: string }
  Game: LazyExoticComponent<ComponentType<GameProps>>
  Diorama: LazyExoticComponent<ComponentType<DioramaProps>>
}
