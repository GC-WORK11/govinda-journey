import * as THREE from 'three'
import { V5_ORDER, camKick, type IslandId } from '../core'
import { ISLAND_POS } from '../world/layout'
import { blip, burst, chime } from '../../world/play'

const PROJECT = new Set<IslandId>(['L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09'])
const UP = new THREE.Vector3(0, 2.4, 0)
let last = 0

export function reveal(id: IslandId) {
  const i = V5_ORDER.indexOf(id)
  const t = performance.now()
  if (i < 0 || t - last < 500) return
  last = t
  if (PROJECT.has(id)) {
    chime()
    burst(ISLAND_POS[i].clone().add(UP), '#f3d58c', 36, 1.3)
    camKick.v = 1
  } else blip(2)
}
