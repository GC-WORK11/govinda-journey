import * as THREE from 'three'
import { clay } from '../../world/kit'

/* The four path lanterns, shared between Play (interactive) and the Diorama
   (scenery, lit once the level is solved) so the swap is seamless. */

export const LAMP_POS: [number, number, number][] = [
  [-0.35, 0, 1.25],
  [0.45, 0, 1.55],
  [1.25, 0, 1.5],
  [-0.1, 0, 2.05],
]
export const GATE: [number, number, number] = [1.02, 0.5, 0.92]
export const HEAD_Y = 0.62

const postGeo = new THREE.CylinderGeometry(0.028, 0.042, 0.46, 7)
const baseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.07, 8)
const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6)
const headGeo = new THREE.SphereGeometry(0.18, 18, 13)
const capGeo = new THREE.ConeGeometry(0.075, 0.08, 8)

const dark = clay('#4a3f38')

export const lampLit = new THREE.MeshStandardMaterial({ color: '#f5b45e', emissive: '#ff9d3c', emissiveIntensity: 1.5, roughness: 0.55 })
export const lampDark = new THREE.MeshStandardMaterial({ color: '#6b5847', roughness: 0.92 })

let _halo: THREE.Texture | null = null
/** Soft warm radial glow for the lantern halos. */
export function haloTexture() {
  if (_halo) return _halo
  const cv = document.createElement('canvas'); cv.width = cv.height = 128
  const x = cv.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 62)
  g.addColorStop(0, 'rgba(255,214,150,0.8)')
  g.addColorStop(0.4, 'rgba(255,178,110,0.3)')
  g.addColorStop(1, 'rgba(255,170,90,0)')
  x.fillStyle = g; x.fillRect(0, 0, 128, 128)
  _halo = new THREE.CanvasTexture(cv)
  return _halo
}

/** A short clay post with a squashed globe lantern head. `head` picks lit/dark. */
export function Lantern({ head }: { head: THREE.Material }) {
  return (
    <group>
      <mesh geometry={baseGeo} position={[0, 0.035, 0]} material={dark} castShadow />
      <mesh geometry={postGeo} position={[0, 0.3, 0]} material={dark} castShadow />
      <mesh geometry={stemGeo} position={[0, 0.52, 0]} material={dark} />
      <mesh geometry={headGeo} position={[0, HEAD_Y, 0]} scale={[1, 0.85, 1]} material={head} castShadow />
      <mesh geometry={capGeo} position={[0, 0.775, 0]} material={dark} />
    </group>
  )
}
