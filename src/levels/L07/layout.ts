/**
 * L07 studio layout, authored in V4 island units (radius 3.2). Diorama builds the studio at
 * these points; V5 mounts it scaled by K, so the Obstacle maps them through `onIsland`.
 * The traveller's path (x = 0) stays clear: nothing sits in |x| < 0.74 here, and the V4
 * traveller's spot (-0.9, 1.4) stays free.
 */
import * as THREE from 'three'

export type V3 = [number, number, number]

/** V5 island radius over V4's (Island5 scales the Diorama by the same factor). */
export const K = 5 / 3.2
export const WORDS = ['hello', 'from', 'my', 'phone']

/** Studio hut on the left; its front (+x face, DOOR_X) looks down the path. */
export const HUT: V3 = [-1.7, 0, -0.2]
export const HUT_SIZE: V3 = [1.7, 0.9, 1.7]
export const DOOR_X = HUT[0] + HUT_SIZE[0] / 2

/** Laptop on a side table on the right, screen facing the path (-x). */
export const TABLE: V3 = [1.12, 0, 0.85]
export const SCREEN = new THREE.Vector3(0.97, 0.53, 0.85)
export const SCREEN_YAW = -Math.PI / 2

/** Mic on the right of the path, beside the chips. */
export const MIC_BASE = new THREE.Vector3(1.1, 0, 1.5)
export const MIC_HEAD = new THREE.Vector3(1.1, 0.92, 1.5)

/** Word chips in a row across the path, front and centre. Play (V4) uses these. */
export const CHIP_IDLE = [
  new THREE.Vector3(-0.6, 1.35, 1.5), new THREE.Vector3(-0.2, 1.35, 1.5),
  new THREE.Vector3(0.2, 1.35, 1.5), new THREE.Vector3(0.6, 1.35, 1.5),
]
/** The V5 obstacle stages the chips nearer and lower, so the row sits below the caption band. */
export const CHIP_STAGE = CHIP_IDLE.map((p) => new THREE.Vector3(p.x, 0.83, 1.28))
/** A landing chip stops just in front of the screen, which faces -x. */
export const SCREEN_FRONT = SCREEN.clone().add(new THREE.Vector3(-0.06, 0, 0))

export const onIsland = (p: THREE.Vector3) => p.clone().multiplyScalar(K)
