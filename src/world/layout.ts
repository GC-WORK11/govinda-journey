import * as THREE from 'three'
import { LEVELS } from '../levels/registry'

export const ISLAND_R = 3.2
/** Island centres: one gentle S-curve receding into the distance (a single path, no branches). */
export const CENTERS = LEVELS.map((_, i) => new THREE.Vector3(Math.sin(i * 1.05) * 4.2, Math.sin(i * 0.7) * 0.6, -i * 9.5))

/** Where the traveller stands on island i (front-left of the building). */
export const standPoint = (i: number) => CENTERS[i].clone().add(new THREE.Vector3(-0.9, 0, 1.4))

/** Edge points used by bridges and walking. */
export function edge(i: number, toward: number) {
  const a = CENTERS[i], b = CENTERS[toward]
  const dir = b.clone().sub(a).setY(0).normalize()
  return a.clone().add(dir.multiplyScalar(ISLAND_R - 0.35))
}

/** Walk path from island i to i+1: stand -> edge -> (bridge) -> edge -> stand. */
export function walkCurve(i: number) {
  const p0 = standPoint(i), p1 = edge(i, i + 1), p2 = edge(i + 1, i), p3 = standPoint(i + 1)
  const mid = p1.clone().lerp(p2, 0.5); mid.y = Math.min(p1.y, p2.y) - 0.3
  return new THREE.CatmullRomCurve3([p0, p1, mid, p2, p3], false, 'centripetal')
}
