import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'
import './L09.css'

const P = {
  cream: '#f3e9da', sand: '#e8d6b8', terracotta: '#d9825b',
  wood: '#a87a52', woodLight: '#c99c6e', stone: '#c9bfb0',
  leaf: '#8fb36b', ink: '#3b3330', paper: '#fbf6ee',
}

type Question = { q: string; opts: string[]; correct: number }

const QUESTIONS: Question[] = [
  { q: 'What do plants make during photosynthesis?', opts: ['Water', 'Oxygen', 'Soil'], correct: 1 },
  { q: 'What do plants need from the sun?', opts: ['Heat', 'Light', 'Wind'], correct: 1 },
  { q: 'Which part of the plant catches sunlight?', opts: ['Roots', 'Leaves', 'Stem'], correct: 1 },
]

type State = 'idle' | 'asking' | 'drawing' | 'answering' | 'done'

export default function Game({ onWin }: GameProps) {
  const [state, setState] = useState<State>('idle')
  const [drawn, setDrawn] = useState(0)
  const [answered, setAnswered] = useState<(number | null)[]>([null, null, null])
  const [showTick, setShowTick] = useState<number | null>(null)
  const onWinRef = useRef(onWin); onWinRef.current = onWin

  useEffect(() => {
    if (state === 'asking') {
      const t = setTimeout(() => setState('drawing'), 600)
      return () => clearTimeout(t)
    }
    if (state === 'drawing' && drawn < 3) {
      const t = setTimeout(() => setDrawn(drawn + 1), 800)
      return () => clearTimeout(t)
    }
    if (state === 'drawing' && drawn === 3) {
      const t = setTimeout(() => setState('answering'), 400)
      return () => clearTimeout(t)
    }
    if (state === 'done') {
      const t = setTimeout(() => onWinRef.current(), 1200)
      return () => clearTimeout(t)
    }
  }, [state, drawn])

  const handleSend = () => {
    setState('asking')
  }

  const handleAnswer = (qIdx: number, aIdx: number) => {
    if (state !== 'answering') return
    const newAnswered = [...answered]
    newAnswered[qIdx] = aIdx
    setAnswered(newAnswered)

    if (aIdx === QUESTIONS[qIdx].correct) {
      setShowTick(qIdx)
      setTimeout(() => setShowTick(null), 1200)
    }

    if (newAnswered.every((a) => a !== null)) {
      setTimeout(() => setState('done'), 600)
    }
  }

  return (
    <div className="l09">
      <div className="l09-scene">
        {/* Clay blackboard */}
        <svg viewBox="0 0 420 300" className="l09-board" aria-label="School blackboard">
          <defs>
            <filter id="l09-board-texture">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer><feFuncA type="linear" slope="0.08" /></feComponentTransfer>
            </filter>
            <filter id="l09-chalk-glow">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>

          {/* Board frame */}
          <rect x="20" y="20" width="380" height="260" rx="8" fill={P.wood} />
          <rect x="32" y="32" width="356" height="236" rx="4" fill="#2a3e2e" />
          <rect x="32" y="32" width="356" height="236" rx="4" fill="url(#l09-board-texture)" opacity="0.3" />

          {/* Question cards drawn with chalk strokes */}
          {drawn >= 1 && (
            <g className="l09-card-appear">
              <ChalkCard
                x={60} y={60} q={QUESTIONS[0]}
                answered={answered[0]} showTick={showTick === 0}
                onAnswer={(a) => handleAnswer(0, a)}
              />
            </g>
          )}
          {drawn >= 2 && (
            <g className="l09-card-appear">
              <ChalkCard
                x={60} y={140} q={QUESTIONS[1]}
                answered={answered[1]} showTick={showTick === 1}
                onAnswer={(a) => handleAnswer(1, a)}
              />
            </g>
          )}
          {drawn >= 3 && (
            <g className="l09-card-appear">
              <ChalkCard
                x={60} y={220} q={QUESTIONS[2]}
                answered={answered[2]} showTick={showTick === 2}
                onAnswer={(a) => handleAnswer(2, a)}
              />
            </g>
          )}
        </svg>

        {/* Teacher message bubble */}
        {state === 'idle' && (
          <div className="l09-bubble" data-qa="teacher-bubble">
            <div className="l09-bubble-inner">
              <div className="l09-avatar" aria-hidden="true">👨‍🏫</div>
              <p className="l09-msg">Helper, make a 3 question test on photosynthesis</p>
            </div>
            <button className="l09-send" data-qa="send-btn" onClick={handleSend} aria-label="Send message">
              Send
            </button>
          </div>
        )}
      </div>

      {/* Hint */}
      {state === 'idle' && (
        <p className="l09-hint">Ask the helper for a test.</p>
      )}
      {(state === 'drawing' || state === 'answering') && answered.filter(a => a !== null).length < 3 && (
        <p className="l09-hint">Answer each question.</p>
      )}
    </div>
  )
}

function ChalkCard({
  x, y, q, answered, showTick, onAnswer
}: {
  x: number; y: number; q: Question; answered: number | null; showTick: boolean; onAnswer: (a: number) => void
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Question text */}
      <text x="5" y="0" fontSize="11" fill={P.paper} fontFamily="Inter, sans-serif" fontWeight="500">
        {q.q}
      </text>

      {/* Options */}
      {q.opts.map((opt, i) => (
        <g key={i} transform={`translate(10, ${15 + i * 18})`}>
          <rect
            x="0" y="0" width="280" height="14" rx="3"
            fill={answered === i ? P.leaf : 'transparent'}
            stroke={P.paper} strokeWidth="0.8"
            opacity={answered === i ? 0.3 : 0.5}
            className="l09-option"
            style={{ cursor: answered === null ? 'pointer' : 'default' }}
            onClick={() => answered === null && onAnswer(i)}
            data-qa={`option-${i}`}
          />
          <text x="6" y="10" fontSize="9" fill={P.paper} fontFamily="Inter, sans-serif" style={{ pointerEvents: 'none' }}>
            {opt}
          </text>
        </g>
      ))}

      {/* Chalk tick for correct answer */}
      {showTick && (
        <g className="l09-tick-draw" transform={`translate(300, ${15 + q.correct * 18 + 7})`}>
          <path d="M0 2 L4 6 L10 -2" stroke={P.paper} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#l09-chalk-glow)" />
          <path d="M0 2 L4 6 L10 -2" stroke={P.paper} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  )
}
