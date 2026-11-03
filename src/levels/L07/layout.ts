/**
 * L07 studio layout, authored in V4 island units (radius 3.2). Diorama builds the studio at
 * these points; V5 mounts it scaled by K, so the Obstacle maps them through `onIsland`.
 * The traveller's path (x = 0) stays clear: nothing sits in |x| < 0.74 here.
 */
import * as THREE from 'three'

export type V3 = [number, number, number]

/** V5 island radius over V4's (Island5 scales the Diorama by the same factor). */
export const K = 5 / 3.2
export const WORDS = ['hello', 'from', 'my', 'phone']

/** Studio hut at the back left; its front (+x face) looks down the path. */
export const HUT: V3 = [-1.55, 0, -1.2]
export const HUT_SIZE: V3 = [1.3, 0.62, 1.3]
export const DOOR_X = HUT[0] + HUT_SIZE[0] / 2

/** Side table with the laptop, screen facing +x. */
export const TABLE: V3 = [-1.04, 0, 0.35]
export const SCREEN = new THREE.Vector3(-1.16, 0.53, 0.35)

/** Mic on the right of the path: stand foot and capsule centre. */
export const MIC_BASE = new THREE.Vector3(0.98, 0, 0.1)
export const MIC_HEAD = new THREE.Vector3(0.9, 0.92, 0.1)

/** Word chips hovering by the mic until they are said. */
export const CHIP_IDLE = [
  new THREE.Vector3(0.62, 1.42, 0.66), new THREE.Vector3(0.7, 1.6, 0.22),
  new THREE.Vector3(0.62, 1.44, -0.22), new THREE.Vector3(0.7, 1.62, -0.66),
]
/** A landing chip stops just in front of the screen. */
export const SCREEN_FRONT = SCREEN.clone().add(new THREE.Vector3(0.06, 0, 0))

export const onIsland = (p: THREE.Vector3) => p.clone().multiplyScalar(K)
