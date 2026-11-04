/**
 * CharLight — a small warm key light that travels with the player, like a
 * lantern they carry. The sun and fill both sit on the far side of the path at
 * dusk and night, so the camera-facing side of the traveller was lit only by
 * the dim hemisphere and crushed to black under ACES. This point light hovers
 * just above the shoulders, leaning toward the camera, so the side the visitor
 * actually sees always carries a soft warm lift. Intensity rides env.night:
 * barely there by day, a small lantern glow after dark. No shadow casting —
 * it fills exactly where the sun shadow would otherwise go to black.
 * One light, zero draw calls.
 */
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from '../core'
import { env } from '../../world/sky'

const _dir = new THREE.Vector3()

export default function CharLight() {
  const light = useRef<THREE.PointLight>(null)
  const { camera, gl } = useThree()
  useFrame(() => {
    const l = light.current; if (!l) return
    // toward the camera (XZ only): the lit side is always the visible side
    _dir.copy(camera.position).sub(player.pos); _dir.y = 0
    const d = _dir.length(); if (d > 1e-3) _dir.multiplyScalar(1 / d)
    l.position.set(
      player.pos.x + _dir.x * 1.15,
      player.pos.y + 2.05,
      player.pos.z + _dir.z * 1.15,
    )
    const n = env.night
    l.intensity = 0.4 + n * 3.6
    // a whisper of extra exposure after dark — keeps the whole night scene
    // soft instead of letting ACES crush the bottom of the curve
    gl.toneMappingExposure = 1.08 + n * 0.14
  })
  return <pointLight ref={light} color="#ffd9a8" intensity={0.4} distance={6.5} decay={2} />
}
