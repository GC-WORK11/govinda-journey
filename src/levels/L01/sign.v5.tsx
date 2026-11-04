import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { C } from '../../world/kit'
import { Merged, type Prim } from './shared.v5'

const PAPER = '#fbf6ee'
const INK = '#3b3330'
const MUTED = '#6b5f57'
const RULE = '#c4704f'
const BODY = (px: number) => `400 ${px}px Inter, system-ui, sans-serif`
const HEAD = (px: number) => `600 ${px}px Fraunces, Georgia, serif`

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []
  let cur = ''
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && ctx.measureText(next).width > max) { out.push(cur); cur = word } else cur = next
  }
  if (cur) out.push(cur)
  return out
}

function paintSign(cv: HTMLCanvasElement, text: string, rule: boolean) {
  const ctx = cv.getContext('2d')!
  const W = cv.width, H = cv.height
  const [title, ...lines] = text.split('\n')
  const tPx = Math.round(H * (lines.length ? 0.19 : 0.26))
  const bPx = Math.round(H * 0.085)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  if (rule) { ctx.fillStyle = RULE; ctx.fillRect(0, 0, W, H * 0.035) }
  ctx.font = BODY(bPx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const parts: { t: string; font: string; color: string; h: number }[] = []
  if (title) parts.push({ t: title, font: HEAD(tPx), color: INK, h: tPx * 1.12 })
  for (const l of lines) for (const row of wrap(ctx, l, W * 0.86)) parts.push({ t: row, font: BODY(bPx), color: MUTED, h: bPx * 1.32 })
  let y = (H - parts.reduce((s, p) => s + p.h, 0)) / 2
  for (const p of parts) {
    ctx.font = p.font
    ctx.fillStyle = p.color
    ctx.fillText(p.t, W / 2, y + p.h / 2)
    y += p.h
  }
}

/** A painted text face. Redraws once Fraunces and Inter are ready; disposed on unmount. */
export function useSignTex(W: number, H: number, text: string, rule = true) {
  const { cv, tex } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = W
    cv.height = H
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { cv, tex }
  }, [W, H])
  useEffect(() => () => tex.dispose(), [tex])
  useEffect(() => {
    const draw = () => { paintSign(cv, text, rule); tex.needsUpdate = true }
    draw()
    let live = true
    Promise.all([document.fonts.load(HEAD(40)), document.fonts.load(BODY(24))]).then(() => { if (live) draw() })
    return () => { live = false }
  }, [cv, tex, text, rule])
  return tex
}

/** An in-world sign: a painted board on a stake (or flush on a wall when `stake` is false). Two draw calls. */
export function StorySign({ position, rotation = [0, 0, 0], w = 0.9, h = 0.46, y = 0.9, stake = true, res = 640, title, lines = [] }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  w?: number; h?: number; y?: number; stake?: boolean; res?: number
  title: string; lines?: string[]
}) {
  const text = [title, ...lines].join('\n')
  const tex = useSignTex(res, Math.round((res * h) / w), text)
  const items = useMemo<Prim[]>(() => [
    ...(stake ? [{ g: 'cyl', p: [0, (y + h / 2) / 2, -0.035], s: [0.055, y + h / 2, 0.068], c: C.wood } as Prim] : []),
    { g: 'box', p: [0, y, 0], s: [w, h, 0.035], c: C.cream },
    { g: 'box', p: [0, y + h / 2 + 0.012, 0], s: [w + 0.03, 0.024, 0.045], c: C.terracotta },
  ], [w, h, y, stake])
  return (
    <group position={position} rotation={rotation}>
      <Merged items={items} />
      <mesh position={[0, y, 0.0195]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  )
}
