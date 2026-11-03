import type { DioramaProps } from '../types'
import { Scaffold, ClayHouse } from '../../world/kit'

// PLACEHOLDER diorama. Replace with this level's own building and props (see docs/LEVEL_BRIEFS.md).
export default function Diorama({ unlocked }: DioramaProps) {
  return (
    <group>
      <ClayHouse position={[0.4, 0, -0.6]} />
      <Scaffold open={unlocked} position={[0.4, 0, -0.6]} size={[1.6, 1.8, 1.6]} />
    </group>
  )
}
