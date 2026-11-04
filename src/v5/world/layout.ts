/**
 * V5 island layout. One gentle S-curve of floating islands receding toward -z,
 * ~16 m apart, slowly rising with a little height variety. Island-local frame:
 * top surface y = 0, usable radius ISLAND_R, path enters at ENTRY (+z) and
 * leaves at EXIT (-z). The bridge from island i lands at ENTRY of island i+1.
 */
import * as THREE from 'three'
import { V5_ORDER, type IslandId } from '../core'

export const ISLAND_R = 5
/** Island-local path endpoints (see docs/V5.md). */
export const ENTRY = new THREE.Vector3(0, 0, 4.2)
export const EXIT = new THREE.Vector3(0, 0, -4.2)

export const ISLAND_POS: THREE.Vector3[] = V5_ORDER.map((_, i) => new THREE.Vector3(
  Math.sin(i * 0.62) * 6.8 + Math.sin(i * 0.23) * 2.2,          // soft S sway
  i * 1.05 + Math.sin(i * 1.7 + 0.6) * 0.75,                    // slow rise + variety
  -i * 14,
))

export const islandIndex = (id: IslandId) => V5_ORDER.indexOf(id)
export const islandPos = (id: IslandId) => ISLAND_POS[islandIndex(id)]
/** Bridge mouths sit on the rim lip (past the path's 4.2 marks) so deck ends
 *  meet the island tops at the grass edge instead of tunnelling under it. */
export const BRIDGE_R = 4.9
/** World-space points where bridge i starts / lands. */
export const exitWorld = (i: number) => ISLAND_POS[i].clone().add(EXIT.clone().setLength(BRIDGE_R))
export const entryWorld = (i: number) => ISLAND_POS[i].clone().add(ENTRY.clone().setLength(BRIDGE_R))

/** Centre of the whole path — finale pull-back orbits around this. */
export const PATH_MID = ISLAND_POS.reduce((a, c) => a.add(c), new THREE.Vector3()).multiplyScalar(1 / ISLAND_POS.length)

/** Nearest island index to a world position (what "current island" means). */
export function nearestIsland(p: THREE.Vector3) {
  let best = 0, bd = Infinity
  for (let i = 0; i < ISLAND_POS.length; i++) {
    const d = ISLAND_POS[i].distanceToSquared(p)
    if (d < bd) { bd = d; best = i }
  }
  return best
}
