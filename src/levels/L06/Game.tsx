import type { GameProps } from '../types'
import { HoldToFinish } from '../../ui/HoldToFinish'

// PLACEHOLDER mini-game. Replace with the real one (see docs/LEVEL_BRIEFS.md).
export default function Game({ onWin }: GameProps) {
  return <HoldToFinish onWin={onWin} />
}
