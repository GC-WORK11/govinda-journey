/**
 * L07 Wispr Wrap — local helpers on ART's shared toon material (src/v5/art/material).
 */
import { useRef } from 'react'
import * as THREE from 'three'
import * as core from '../../v5/core'
import { toon } from '../../v5/art/material'

export const C = {
  cream: '#f3e9da', paper: '#fbf6ee', sand: '#e8d6b8', terracotta: '#d9825b', brick: '#b5654a',
  leaf: '#8fb36b', leafDark: '#6f9a55', moss: '#a7bd80', earth: '#b48a63', earthDark: '#8a6748',
  stone: '#c9bfb0', stoneLight: '#ddd5c6', wood: '#a87a52', woodLight: '#c99c6e',
  water: '#8fc1c9', waterLight: '#b8dade', sky: '#cfe3e8', ink: '#3b3330', ink2: '#6b5f57',
  warm: '#f0c98a', violet: '#8a6fb0',
}

/** Shared stylized clay material (ART's toon: wrap diffuse + soft ramp + warm rim). */
export function clay(color: string) {
  return toon({ color })
}

type V3 = [number, number, number]

/** Invisible physics box. */
export function BlockBox({ position, args = [1, 1, 1] as V3, kind = 'block', on = true }: { position: V3; args?: V3; kind?: 'block' | 'walk'; on?: boolean }) {
  const r = useRef<THREE.Mesh>(null)
  const reg = kind === 'block' ? core.useBlocker : core.useWalkable
  reg(r, on)
  return <mesh ref={r} position={position} visible={false}><boxGeometry args={args} /></mesh>
}

/** Canvas texture helper. */
export function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return { cv, ctx, tex, redraw(fn: (c: CanvasRenderingContext2D) => void) { fn(ctx); tex.needsUpdate = true } }
}

/** A word chip face: cream tile with the ink word (V4's speech-pebble look). */
export function chipTexture(word: string) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 72
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#f6ecd9'; ctx.fillRect(0, 0, 128, 72)
  ctx.fillStyle = '#3b3330'; ctx.font = '600 44px Fraunces, Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(word, 64, 38)
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
