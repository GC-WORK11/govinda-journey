import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import './L02.css'

const P = {
  water: '#8fc1c9', waterLight: '#a8d2d7', waterDark: '#7ab0b8',
  sand: '#e8d6b8', stone: '#c9bfb0', stoneLight: '#dcd3c6',
  leaf: '#8fb36b', leafDark: '#6f9a55', wood: '#a87a52',
  paper: '#fbf6ee', ink: '#3b3330', cream: '#f3e9da',
  cliff: '#b48a63', cliffDark: '#8a6748',
}

type Letter = { id: number; x: number; y: number; text: string; placed: boolean; folding: boolean; foldProgress: number }
type Stone = { id: number; x: number; gapY: number; foldProgress: number }

const LETTERS_TEXT = ['No', 'Not this time', 'No', 'Not now', 'No']
const GAP_TOP = 80
const GAP_BOTTOM = 170
const GAP_LEFT = 40
const GAP_RIGHT = 340
const DROP_ZONE_Y = 125
const DROP_ZONE_MARGIN = 35

export default function Game({ onWin }: GameProps) {
  const [letters, setLetters] = useState<Letter[]>(() =>
    LETTERS_TEXT.map((text, i) => ({
      id: i,
      x: 50 + i * 65,
      y: 20 + Math.sin(i * 2.1) * 8,
      text,
      placed: false,
      folding: false,
      foldProgress: 0,
    }))
  )
  const [stones, setStones] = useState<Stone[]>([])
  const [travelerProgress, setTravelerProgress] = useState(0)
  const [dragState, setDragState] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null)
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin
  const animFrame = useRef(0)

  // Animate folding and traveler
  useEffect(() => {
    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      let changed = false

      setLetters((prev) =>
        prev.map((l) => {
          if (l.folding && l.foldProgress < 1) {
            changed = true
            return { ...l, foldProgress: Math.min(1, l.foldProgress + dt * 2.5) }
          }
          return l
        })
      )

      setStones((prev) =>
        prev.map((s) => {
          if (s.foldProgress < 1) {
            changed = true
            return { ...s, foldProgress: Math.min(1, s.foldProgress + dt * 2.5) }
          }
          return s
        })
      )

      setTravelerProgress((p) => {
        if (p > 0 && p < 1) {
          changed = true
          return Math.min(1, p + dt * 0.35)
        }
        return p
      })

      if (changed) {
        animFrame.current = requestAnimationFrame(tick)
      }
    }
    animFrame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrame.current)
  }, [])

  // Check win condition
  useEffect(() => {
    if (stones.length === LETTERS_TEXT.length && stones.every((s) => s.foldProgress === 1)) {
      setTravelerProgress(0.01)
    }
  }, [stones])

  useEffect(() => {
    if (travelerProgress >= 0.99) {
      const timer = setTimeout(() => onWinRef.current(), 400)
      return () => clearTimeout(timer)
    }
  }, [travelerProgress])

  const handlePointerDown = (e: React.PointerEvent, letterId: number) => {
    const letter = letters.find((l) => l.id === letterId)
    if (!letter || letter.placed) return
    const rect = e.currentTarget.getBoundingClientRect()
    const parentRect = e.currentTarget.parentElement!.getBoundingClientRect()
    setDragState({
      id: letterId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return
    const parentRect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - parentRect.left - dragState.offsetX
    const y = e.clientY - parentRect.top - dragState.offsetY
    setLetters((prev) =>
      prev.map((l) => (l.id === dragState.id ? { ...l, x, y } : l))
    )
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return
    const letter = letters.find((l) => l.id === dragState.id)
    if (!letter) {
      setDragState(null)
      return
    }

    // Check if dropped in the gap zone
    const inZone =
      letter.y > DROP_ZONE_Y - DROP_ZONE_MARGIN &&
      letter.y < DROP_ZONE_Y + DROP_ZONE_MARGIN &&
      letter.x > GAP_LEFT &&
      letter.x < GAP_RIGHT

    if (inZone) {
      // Place the letter as a stone
      const stoneX = letter.x
      const stoneGapY = DROP_ZONE_Y
      setLetters((prev) =>
        prev.map((l) =>
          l.id === dragState.id ? { ...l, placed: true, folding: true, x: stoneX, y: stoneGapY } : l
        )
      )
      setStones((prev) => [
        ...prev,
        { id: letter.id, x: stoneX, gapY: stoneGapY, foldProgress: 0 },
      ])
    }

    setDragState(null)
  }

  const travelerX = GAP_LEFT - 20 + (GAP_RIGHT - GAP_LEFT + 40) * travelerProgress
  const travelerY = DROP_ZONE_Y + Math.sin(travelerProgress * Math.PI) * -8

  return (
    <div className="l02">
      <svg
        viewBox="0 0 380 250"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Sky */}
        <rect width="380" height="250" fill="#cfe3e8" />

        {/* Water */}
        <rect x={GAP_LEFT} y={GAP_TOP} width={GAP_RIGHT - GAP_LEFT} height={GAP_BOTTOM - GAP_TOP} fill={P.water} />
        <rect x={GAP_LEFT} y={GAP_TOP} width={GAP_RIGHT - GAP_LEFT} height="18" fill={P.waterLight} opacity="0.5" />
        
        {/* Gentle ripples */}
        <g opacity="0.18" stroke={P.paper} strokeWidth="1.2" fill="none">
          <ellipse cx="120" cy="110" rx="22" ry="8" />
          <ellipse cx="260" cy="145" rx="28" ry="10" />
        </g>

        {/* Left cliff */}
        <rect x="0" y="0" width={GAP_LEFT} height="250" fill={P.cliff} />
        <rect x="0" y="0" width={GAP_LEFT} height="20" fill={P.sand} />
        <path d={`M0 18 Q${GAP_LEFT / 2} 24 ${GAP_LEFT} 18 L${GAP_LEFT} 0 L0 0 Z`} fill={P.leaf} />
        <g stroke={P.leafDark} strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
          <path d="M12 12 l-2 -5 M15 13 l0 -6 M18 13 l2 -5" />
        </g>

        {/* Right cliff */}
        <rect x={GAP_RIGHT} y="0" width={380 - GAP_RIGHT} height="250" fill={P.cliff} />
        <rect x={GAP_RIGHT} y="0" width={380 - GAP_RIGHT} height="20" fill={P.sand} />
        <path d={`M${GAP_RIGHT} 18 Q${GAP_RIGHT + (380 - GAP_RIGHT) / 2} 24 380 18 L380 0 L${GAP_RIGHT} 0 Z`} fill={P.leaf} />
        <g stroke={P.leafDark} strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
          <path d="M352 12 l-2 -5 M355 13 l0 -6 M358 13 l2 -5" />
        </g>

        {/* Stones */}
        {stones.map((stone) => {
          const opacity = Math.min(1, stone.foldProgress * 2)
          const scale = 0.6 + stone.foldProgress * 0.4
          return (
            <g key={stone.id} opacity={opacity} transform={`translate(${stone.x} ${stone.gapY})`}>
              <ellipse cx="0" cy="3" rx={18 * scale} ry={5 * scale} fill={P.cliffDark} opacity="0.3" />
              <ellipse cx="0" cy="0" rx={16 * scale} ry={8 * scale} fill={P.stone} />
              <ellipse cx="0" cy="-2" rx={14 * scale} ry={6 * scale} fill={P.stoneLight} />
            </g>
          )
        })}

        {/* Traveler */}
        {travelerProgress > 0 && (
          <g transform={`translate(${travelerX} ${travelerY})`}>
            <ellipse cx="0" cy="18" rx="6" ry="2" fill={P.cliffDark} opacity="0.25" />
            <circle cx="0" cy="0" r="7" fill={P.sand} />
            <circle cx="0" cy="-3" r="5" fill={P.cream} />
            <circle cx="-1.5" cy="-4" r="1.2" fill={P.ink} />
            <circle cx="1.5" cy="-4" r="1.2" fill={P.ink} />
            <path d="M0 8 L0 14" stroke={P.ink} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M0 10 L-3 13 M0 10 L3 13" stroke={P.ink} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}

        {/* Letters */}
        {letters.map((letter) =>
          !letter.placed ? (
            <g
              key={letter.id}
              transform={`translate(${letter.x} ${letter.y})`}
              style={{ cursor: dragState?.id === letter.id ? 'grabbing' : 'grab' }}
              data-qa={`letter-${letter.id}`}
            >
              <rect
                x="-22" y="-16" width="44" height="32" rx="3" fill={P.paper}
                stroke={P.ink} strokeWidth="0.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                onPointerDown={(e) => handlePointerDown(e, letter.id)}
                style={{ touchAction: 'none' }}
              />
              <text
                x="0" y="2" textAnchor="middle" dominantBaseline="middle"
                fill={P.ink} fontSize="11" fontFamily="Inter, sans-serif" fontWeight="500"
                pointerEvents="none"
              >
                {letter.text}
              </text>
            </g>
          ) : letter.folding && letter.foldProgress < 1 ? (
            <g key={letter.id} transform={`translate(${letter.x} ${letter.y})`} opacity={1 - letter.foldProgress}>
              <rect
                x="-22" y="-16" width="44" height="32" rx="3" fill={P.paper}
                stroke={P.ink} strokeWidth="0.8"
                transform={`scaleY(${1 - letter.foldProgress * 0.8})`}
              />
            </g>
          ) : null
        )}
      </svg>
      <p className="l02-hint">Drag each letter into the water.</p>
    </div>
  )
}
