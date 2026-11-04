/**
 * Plaza dressing for L08 Sign Flow (V6): a paved plaza circle, a pennant line of
 * hand-sign glyphs, and the plaza board that tells the one-line story and carries
 * the real demo link. Draw-call budget: ~7 meshes for the whole plaza (instanced
 * tiles + flags, merged vertex-coloured statics, one atlas for the glyphs).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clayVC, paint as paintGeo } from '../../world/kit'
import { useFrozen, Veil, cleanGeo, mergeSafe } from './v5kit.v5'
import { LEVELS } from '../registry'

const L08 = LEVELS.find((l) => l.id === 'L08')!

const flat = (g: THREE.BufferGeometry, color: string) => {
  const out = cleanGeo(g) // canonical attrs — mergeSafe never gets a mismatched set
  paintGeo(out, color)
  return out
}

const TILES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  return { x: Math.cos(a) * 1.93, z: -0.8 + Math.sin(a) * 1.93, rot: a, c: i % 3 ? '#e4d8c4' : '#c4704f' }
})

/** Paved plaza floor: merged terracotta + stone rings, instanced mosaic inlay. */
export function Plaza() {
  const geo = useMemo(() => {
    const geos = [
      flat(new THREE.RingGeometry(1.35, 2.5, 48), '#d99a6b').rotateX(-Math.PI / 2).translate(0, 0.012, -0.8),
      flat(new THREE.RingGeometry(2.5, 2.62, 48), '#c9bfb0').rotateX(-Math.PI / 2).translate(0, 0.011, -0.8),
    ]
    const merged = mergeSafe(geos) ?? geos[0]
    return merged
  }, [])
  const tileGeo = useMemo(() => new THREE.CircleGeometry(0.09, 6), [])
  const tileMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), [])
  const tiles = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color()
    TILES.forEach((t, i) => {
      e.set(-Math.PI / 2, 0, t.rot); q.setFromEuler(e)
      m.compose(new THREE.Vector3(t.x, 0.013, t.z), q, s)
      tiles.current!.setMatrixAt(i, m)
      tiles.current!.setColorAt(i, c.set(t.c))
    })
    tiles.current!.instanceMatrix.needsUpdate = true
    if (tiles.current!.instanceColor) tiles.current!.instanceColor.needsUpdate = true
  }, [])
  return (
    <group>
      <mesh geometry={geo} material={clayVC()} receiveShadow />
      <instancedMesh ref={tiles} args={[tileGeo, tileMat, TILES.length]} receiveShadow />
    </group>
  )
}

/* ---- bunting: instanced pennants + merged rope/poles + one atlas of glyphs ---- */

const FLAG_COLORS = ['#c4704f', '#8fb36b', '#d9a25f', '#a87a52', '#b5654a', '#e4d8c4', '#c4704f']
const FLAG_KINDS = ['V', 'C', 'L', 'O', 'dot', 'V', 'C'] as const

/** One atlas cell per flag: flag-colour-free, just the white sign glyph stroke. */
function glyphAtlas() {
  const n = FLAG_KINDS.length
  const cv = document.createElement('canvas')
  cv.width = n * 64; cv.height = 64
  const ctx = cv.getContext('2d')!
  ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  FLAG_KINDS.forEach((kind, i) => {
    const x = i * 64
    ctx.strokeStyle = '#fbf6ee'; ctx.fillStyle = '#fbf6ee'
    ctx.beginPath()
    if (kind === 'V') { ctx.moveTo(x + 18, 14); ctx.lineTo(x + 32, 50); ctx.lineTo(x + 46, 14) }
    else if (kind === 'C') ctx.arc(x + 32, 32, 16, -0.5, Math.PI * 1.3)
    else if (kind === 'L') { ctx.moveTo(x + 24, 12); ctx.lineTo(x + 24, 46); ctx.lineTo(x + 46, 46) }
    else if (kind === 'O') ctx.arc(x + 32, 32, 15, 0, Math.PI * 2)
    else { ctx.arc(x + 32, 32, 4, 0, Math.PI * 2); ctx.fill() }
    ctx.stroke()
  })
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A rope of pennant flags painted with sign glyphs, swaying gently. 3 draw calls. */
export function Bunting({ from, to, sag = 0.5 }: { from: [number, number, number]; to: [number, number, number]; sag?: number }) {
  const a = useMemo(() => new THREE.Vector3(...from), [])
  const b = useMemo(() => new THREE.Vector3(...to), [])
  const n = FLAG_KINDS.length
  const at = (t: number) => {
    const p = a.clone().lerp(b, t)
    p.y -= Math.sin(t * Math.PI) * sag
    return p
  }

  /* merged rope + poles + finials — one vertex-colour mesh */
  const staticGeo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const ropePts: THREE.Vector3[] = []
    for (let i = 0; i <= 16; i++) ropePts.push(at(i / 16))
    geos.push(flat(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts), 24, 0.012, 5), '#8a6748'))
    for (const p of [a, b]) {
      geos.push(flat(new THREE.CylinderGeometry(0.028, 0.038, p.y, 7), '#a87a52').translate(p.x, p.y / 2, p.z))
      geos.push(flat(new THREE.SphereGeometry(0.045, 8, 8), '#c4704f').translate(p.x, p.y + 0.03, p.z))
    }
    const merged = mergeSafe(geos) ?? geos[0]
    return merged
  }, [])

  /* merged glyph quads — one mesh, one atlas texture */
  const glyphGeo = useMemo(() => {
    const verts: number[] = [], uvs: number[] = []
    const w = 0.1, h = 0.13
    for (let i = 0; i < n; i++) {
      const p = at((i + 0.5) / n)
      const u0 = i / n, u1 = (i + 1) / n
      const z = p.z + 0.002 // flat flag face — quad hugs it, slightly in front
      const quad = [
        [p.x - w / 2, p.y - 0.125 - h / 2, z, u0, 1],
        [p.x + w / 2, p.y - 0.125 - h / 2, z, u1, 1],
        [p.x + w / 2, p.y - 0.125 + h / 2, z, u1, 0],
        [p.x - w / 2, p.y - 0.125 - h / 2, z, u0, 1],
        [p.x + w / 2, p.y - 0.125 + h / 2, z, u1, 0],
        [p.x - w / 2, p.y - 0.125 + h / 2, z, u0, 0],
      ]
      for (const [x, y, z, u, v] of quad) { verts.push(x, y, z); uvs.push(u as number, v as number) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    return g
  }, [])
  const atlas = useMemo(glyphAtlas, [])

  /* instanced flat pennants — top edge on the rope, apex pointing down */
  const flagGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(
      [-0.075, -0.02, 0, 0.075, -0.02, 0, 0, -0.28, 0], 3))
    g.computeVertexNormals()
    return g
  }, [])
  const flagMat = useMemo(() =>
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide }), [])
  const flags = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const p = at((i + 0.5) / n)
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, s)
      flags.current!.setMatrixAt(i, m)
      flags.current!.setColorAt(i, c.set(FLAG_COLORS[i]))
    }
    flags.current!.instanceMatrix.needsUpdate = true
    if (flags.current!.instanceColor) flags.current!.instanceColor.needsUpdate = true
  }, [])

  const sway = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (sway.current) sway.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.9) * 0.03
  })
  return (
    <group ref={sway}>
      <mesh geometry={staticGeo} material={clayVC()} castShadow />
      <mesh geometry={glyphGeo}>
        <meshBasicMaterial map={atlas} transparent alphaTest={0.3} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={flags} args={[flagGeo, flagMat, n]} castShadow />
    </group>
  )
}

/* ---- the plaza board: merged wood + paper face, one painted texture ---- */

/** The plaza signboard — a wooden board on a post; its use() opens the card. */
export function Board() {
  const { geo, tex } = useMemo(() => {
    const post = flat(new THREE.CylinderGeometry(0.035, 0.045, 0.84, 7), '#a87a52').translate(0, 0.42, 0)
    const panel = flat(new THREE.BoxGeometry(0.66, 0.44, 0.045), '#e4d8c4').translate(0, 0.98, 0)
    const geo = mergeSafe([post, panel]) ?? post
    const cv = document.createElement('canvas')
    cv.width = 256; cv.height = 160
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#fbf6ee'
    ctx.fillRect(0, 0, 256, 160)
    ctx.fillStyle = '#3b3330'
    ctx.font = '600 26px Fraunces, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sign-Flow', 128, 36)
    // the sign to match — the hero glyph, like V4's card
    ctx.strokeStyle = '#c4704f'
    ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(94, 58); ctx.lineTo(128, 128); ctx.lineTo(162, 58); ctx.stroke()
    ctx.font = '400 13px Inter, sans-serif'
    ctx.fillStyle = '#6b5f55'
    ctx.fillText('the hand that matches', 128, 148)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return { geo, tex }
  }, [])
  return (
    <group>
      <mesh geometry={geo} material={clayVC()} castShadow />
      <mesh position={[0, 0.98, 0.024]}>
        <planeGeometry args={[0.58, 0.36]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  )
}

/** The board's soft card: the one-line story, the peak detail, the real live link. */
export function BoardCard({ onClose }: { onClose: () => void }) {
  useFrozen(true)
  return (
    <Veil onClose={onClose}>
      <div className="jov5-center" data-qa="board-card">
        <div className="jov5-title">{L08.title}</div>
        <div className="jov5-sub" style={{ marginTop: 10 }}>{L08.line}</div>
        <div className="jov5-sub" style={{ marginTop: 12 }}>{L08.story}</div>
        <div className="jov5-sub" style={{ marginTop: 12 }}>{L08.tech}</div>
        <div className="jov5-row" style={{ justifyContent: 'center' }}>
          {L08.links.map((l) => (
            <a key={l.href} className="jov5-btn" data-qa="board-live" href={l.href}
              target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'inline-block' }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </Veil>
  )
}
