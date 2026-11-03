import * as THREE from 'three'

/**
 * World-space carry anchor, updated every frame by Player.tsx.
 * Islands render the item whose id is `player.carrying` and lerp it to this point
 * (a socket mounted on the chest bone, just above the backpack).
 * `carryQuat` follows the player's facing so items can align.
 */
export const carryAnchor = new THREE.Vector3(0, -999, 0)
export const carryQuat = new THREE.Quaternion()
