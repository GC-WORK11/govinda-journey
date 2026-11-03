/**
 * Plaza dressing for L08 Sign Flow (V6): a paved plaza circle, a pennant line of
 * hand-sign glyphs, and the plaza board that tells the one-line story and carries
 * the real demo link. Everything opaque clay — no blobs, no glass.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { M, useFrozen, Veil } from './v5kit.v5'
import { LEVELS } from '../registry'

const L08 = LEVELS.find((l) => l.id === 'L08')!

/** Paved plaza floor: concentric terracotta + stone rings around the path. */
export function Plaza() {
  return (
    <group>
      <mesh position={[0, 0.012, -0.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.35, 2.5, 48]} />
        <meshStandardMaterial color="#d99a6b" roughness={1} />
      </mesh>
      <mesh position={[0, 0.011, -0.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[2.5, 2.62, 48]} />
        <meshStandardMaterial color="#c9bfb0" roughness={1} />
      </mesh>
      {/* mosaic inlay — small warm stones ringing the plaza */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.93, 0.013, -0.8 + Math.sin(a) * 1.93]} rotation={[-Math.PI / 2, 0, a]}>
            <circleGeometry args={[0.09, 6]} />
            <meshStandardMaterial color={i % 3 ? '#e4d8c4' : '#c4704f'} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

/** One hand-sign glyph painted on a pennant. Strokes in "sign alphabet" shapes. */
function flagTex(kind: 'V' | 'C' | 'L' | 'O' | 'dot') {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const ctx = cv.getContext('2d')!
  ctx.strokeStyle = '#fbf6ee'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (kind === 'V') { ctx.moveTo(18, 14); ctx.lineTo(32, 50); ctx.lineTo(46, 14) }
  else if (kind === 'C') ctx.arc(32, 32, 16, -0.5, Math.PI * 1.3)
  else if (kind === 'L') { ctx.moveTo(24, 12); ctx.lineTo(24, 46); ctx.lineTo(46, 46) }
  else if (kind === 'O') ctx.arc(32, 32, 15, 0, Math.PI * 2)
  else { ctx.arc(32, 32, 4, 0, Math.PI * 2); ctx.fillStyle = '#fbf6ee'; ctx.fill() }
  ctx.stroke()
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const FLAG_COLORS = ['#c4704f', '#8fb36b', '#d9a25f', '#a87a52', '#b5654a', '#e4d8c4']
const FLAG_KINDS = ['V', 'C', 'L', 'O', 'dot', 'V', 'C'] as const

/** A rope of pennant flags, each painted with a sign glyph, swaying gently. */
export function Bunting({ from, to, sag = 0.5 }: { from: [number, number, number]; to: [number, number, number]; sag?: number }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const flags = useMemo(() => {
    const out: { p: THREE.Vector3; kind: (typeof FLAG_KINDS)[number]; c: string; tex: THREE.CanvasTexture }[] = []
    const n = FLAG_KINDS.length
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const p = a.clone().lerp(b, t)
      p.y -= Math.sin(t * Math.PI) * sag
      out.push({ p, kind: FLAG_KINDS[i], c: FLAG_COLORS[i % FLAG_COLORS.length], tex: flagTex(FLAG_KINDS[i]) })
    }
    return out
  }, [])
  const rope = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const p = a.clone().lerp(b, t)
      p.y -= Math.sin(t * Math.PI) * sag
      pts.push(p)
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: '#8a6748' }),
    )
  }, [])
  const sway = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (sway.current) sway.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.9) * 0.03
  })
  return (
    <group ref={sway}>
      <primitive object={rope} />
      {flags.map((f, i) => (
        <group key={i} position={f.p.toArray()}>
          <mesh position={[0, -0.13, 0]} material={M(f.c)} castShadow>
            <coneGeometry args={[0.085, 0.26, 4]} />
          </mesh>
          <mesh position={[0, -0.125, 0.043]}>
            <planeGeometry args={[0.1, 0.13]} />
            <meshBasicMaterial map={f.tex} transparent alphaTest={0.3} />
          </mesh>
        </group>
      ))}
      {/* the two poles */}
      {[a, b].map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, p.y / 2, 0]} material={M('#a87a52')} castShadow>
            <cylinderGeometry args={[0.028, 0.038, p.y, 7]} />
          </mesh>
          <mesh position={[0, p.y + 0.03, 0]} material={M('#c4704f')} castShadow>
            <sphereGeometry args={[0.045, 8, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** The plaza signboard — a wooden board on a post; its use() opens the card. */
export function Board() {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 256; cv.height = 160
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#fbf6ee'
    ctx.fillRect(0, 0, 256, 160)
    ctx.fillStyle = '#3b3330'
    ctx.font = '600 30px Fraunces, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sign Flow', 128, 52)
    ctx.font = '400 15px Inter, sans-serif'
    ctx.fillStyle = '#6b5f55'
    ctx.fillText('teach the laptop', 128, 84)
    ctx.fillText('your own hand signs', 128, 106)
    // small V hand mark
    ctx.strokeStyle = '#c4704f'
    ctx.lineWidth = 8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(112, 146); ctx.lineTo(128, 124); ctx.lineTo(144, 146); ctx.stroke()
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group>
      <mesh position={[0, 0.42, 0]} material={M('#a87a52')} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.84, 7]} />
      </mesh>
      <RoundedBox args={[0.66, 0.44, 0.045]} radius={0.03} position={[0, 0.98, 0]} material={M('#e4d8c4')} castShadow />
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
