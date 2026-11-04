/**
 * Dev-only character atlas tool. Served by vite as /char-tool.html
 *   ?mask   -> rasterise each mesh part's UV islands onto a 1024 canvas;
 *              fills window.__uv = { cells: {partName: [[cx,cy,cover],...]}, img: dataURL }
 *   ?paint  -> load embedded rogue_texture, recolour per SPEC, fill
 *              window.__png = dataURL of the new 1024 atlas
 * Paint spec lives in SPEC below: list of {r:[x0,y0,x1,y1], c:'#hex', name}
 * applied over the ORIGINAL texture: each covered pixel keeps its relative
 * luminance vs the region mean, so baked shading survives the recolour.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const q = new URLSearchParams(location.search)
const SIZE = 1024
const CELL = 64 // report granularity

function loadGLB(url: string) {
  const l = new GLTFLoader()
  l.setMeshoptDecoder(MeshoptDecoder)
  return new Promise<THREE.Group>((res, rej) => l.load(url, (g) => res(g.scene), undefined, rej))
}

type Spec = { r: [number, number, number, number]; c: string; name?: string }
// Filled after inspecting the mask dump; pixel rects of the 1024 atlas.
export const SPEC: Spec[] = []

async function mask() {
  const scene = await loadGLB('/models/student.glb')
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SIZE, SIZE)
  const parts: { name: string; col: [number, number, number] }[] = []
  const COLS: [number, number, number][] = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255]]
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh
    if (!(m as THREE.Mesh).isMesh) return
    parts.push({ name: m.name, col: COLS[parts.length % COLS.length] })
    const g = m.geometry
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    const idx = g.getIndex()
    const n = idx ? idx.count : uv.count
    ctx.fillStyle = `rgb(${parts[parts.length - 1].col.join(',')})`
    for (let i = 0; i < n; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2
      ctx.beginPath()
      ctx.moveTo(uv.getX(a) * SIZE, (1 - uv.getY(a)) * SIZE) // flipY=false in glTF: v=0 is top
      ctx.lineTo(uv.getX(b) * SIZE, (1 - uv.getY(b)) * SIZE)
      ctx.lineTo(uv.getX(c) * SIZE, (1 - uv.getY(c)) * SIZE)
      ctx.closePath(); ctx.fill()
    }
  })
  const img = ctx.getImageData(0, 0, SIZE, SIZE)
  const cells: Record<string, [number, number, number][]> = {}
  for (const p of parts) cells[p.name] = []
  const cn = SIZE / CELL
  for (let cy = 0; cy < cn; cy++) for (let cx = 0; cx < cn; cx++) {
    const cnt: Record<string, number> = {}
    for (let y = cy * CELL; y < (cy + 1) * CELL; y++) for (let x = cx * CELL; x < (cx + 1) * CELL; x++) {
      const k = (y * SIZE + x) * 4
      for (const p of parts) {
        const [r, g, b] = p.col
        if (img.data[k] === r && img.data[k + 1] === g && img.data[k + 2] === b) cnt[p.name] = (cnt[p.name] || 0) + 1
      }
    }
    for (const p of parts) {
      const v = (cnt[p.name] || 0) / (CELL * CELL)
      if (v > 0.02) cells[p.name].push([cx, cy, +v.toFixed(2)])
    }
  }
  // overlay grid + labels for eyeballing
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
  for (let i = 0; i <= cn; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke() }
  ;(window as any).__uv = { cells, img: cv.toDataURL('image/png') }
}

async function paint() {
  const scene = await loadGLB('/models/student.glb')
  let srcTex: THREE.Texture | null = null
  scene.traverse((o) => { const m = o as THREE.Mesh; if ((m as THREE.Mesh).isMesh && !srcTex) srcTex = (m.material as THREE.MeshStandardMaterial).map })
  const im = (srcTex as unknown as { image: HTMLImageElement | ImageBitmap }).image
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE
  const ctx = cv.getContext('2d')!
  ctx.drawImage(im as CanvasImageSource, 0, 0, SIZE, SIZE)
  const data = ctx.getImageData(0, 0, SIZE, SIZE)
  for (const s of SPEC) {
    const [x0, y0, x1, y1] = s.r
    let lum = 0, n = 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const k = (y * SIZE + x) * 4
      lum += 0.2126 * data.data[k] + 0.7152 * data.data[k + 1] + 0.0722 * data.data[k + 2]; n++
    }
    const mean = lum / n || 1
    const c = new THREE.Color(s.c)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const k = (y * SIZE + x) * 4
      const l = (0.2126 * data.data[k] + 0.7152 * data.data[k + 1] + 0.0722 * data.data[k + 2]) / mean
      data.data[k] = Math.min(255, Math.round(c.r * 255 * l))
      data.data[k + 1] = Math.min(255, Math.round(c.g * 255 * l))
      data.data[k + 2] = Math.min(255, Math.round(c.b * 255 * l))
    }
  }
  ctx.putImageData(data, 0, 0)
  ;(window as any).__png = cv.toDataURL('image/png')
}

const mode = q.get('paint') !== null || q.has('paint') ? 'paint' : 'mask'
;(mode === 'paint' ? paint : mask)().catch((e) => { (window as any).__err = String(e) })
