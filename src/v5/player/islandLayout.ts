import * as THREE from 'three'
import { V5_ORDER } from '../core'

/**
 * TEMPORARY STUB — owned by PLAYER until WORLD lands src/v5/world/layout.ts.
 * Mirrors the WORLD brief: gentle S-curve rising slowly, ~16 m apart, radius 5.
 * When ../world/layout.ts exists, delete this file and import from there instead.
 */
export const ISLAND_R = 5
export const ENTRY = new THREE.Vector3(0, 0, 4.2)
export const EXIT = new THREE.Vector3(0, 0, -4.2)
export const ISLAND_POS: THREE.Vector3[] = V5_ORDER.map((_id, i) =>
  new THREE.Vector3(Math.sin(i * 0.85) * 5.5, Math.sin(i * 1.25) * 0.9 + i * 0.22, -i * 16),
)
