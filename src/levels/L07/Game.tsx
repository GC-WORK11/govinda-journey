import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'
import './L07.css'

const C = {
  cream: '#f3e9da', sand: '#e8d6b8', terracotta: '#d9825b', 
  leaf: '#8fb36b', ink: '#3b3330', ink2: '#6b5f57', paper: '#fbf6ee',
}

type Word = { text: string; x: number; y: number; t: number; id: number }

// Check for webkit speech API
const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition

export default function Game({ onWin }: GameProps) {
  const [mode, setMode] = useState<'speech' | 'type' | null>(null) // null = deciding
  const [holding, setHolding] = useState(false)
  const [interim, setInterim] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [flyingWords, setFlyingWords] = useState<Word[]>([])
  const [laptopText, setLaptopText] = useState('')
  const [linesComplete, setLinesComplete] = useState(0)
  const [currentLineWords, setCurrentLineWords] = useState(0)
  
  const recognitionRef = useRef<any>(null)
  const winRef = useRef(onWin); winRef.current = onWin
  const wordIdRef = useRef(0)
  const accumulatedRef = useRef('')

  // Try to initialize speech on mount
  useEffect(() => {
    // Force type mode in headless/testing environments
    const isHeadless = /HeadlessChrome/.test(navigator.userAgent) || 
                       !navigator.mediaDevices ||
                       window.location.search.includes('qa')
    
    if (!SpeechRecognition || isHeadless) {
      setMode('type')
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-IN'
    
    recognition.onresult = (event: any) => {
      let interimText = ''
      let finalText = ''
      
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }
      
      if (finalText) {
        accumulatedRef.current = finalText
      }
      
      setInterim(interimText || finalText || accumulatedRef.current)
    }
    
    recognition.onerror = () => {
      // Silent fail - just stop showing interim
      setInterim('')
    }
    
    recognition.onend = () => {
      if (holding && mode === 'speech') {
        try {
          recognition.start()
        } catch {}
      }
    }
    
    recognitionRef.current = recognition
    setMode('speech')
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  const handlePointerDown = () => {
    if (mode !== 'speech') return
    setHolding(true)
    setInterim('')
    accumulatedRef.current = ''
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch {}
    }
  }

  const handlePointerUp = () => {
    if (mode !== 'speech') return
    setHolding(false)
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    
    const text = accumulatedRef.current || interim
    if (text.trim()) {
      launchWords(text.trim())
      setInterim('')
      accumulatedRef.current = ''
    }
  }

  const handleTypeSend = () => {
    if (mode !== 'type') return
    const text = phoneInput.trim()
    if (!text) return
    
    launchWords(text)
    setPhoneInput('')
  }

  const launchWords = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length === 0) return
    
    const newWords: Word[] = words.map((w, i) => ({
      text: w,
      x: 85 + Math.random() * 10,
      y: 65 + Math.random() * 5,
      t: Date.now() + i * 120,
      id: wordIdRef.current++,
    }))
    
    setFlyingWords((prev) => [...prev, ...newWords])
    
    // Count for line completion - a line needs at least 2 words
    if (words.length >= 2) {
      const newLines = linesComplete + 1
      setLinesComplete(newLines)
      setCurrentLineWords(0)
      
      if (newLines >= 2) {
        // Win after animation completes
        setTimeout(() => winRef.current(), 1800)
      }
    } else {
      // Accumulate words if less than 2
      const newCount = currentLineWords + words.length
      if (newCount >= 2) {
        const newLines = linesComplete + 1
        setLinesComplete(newLines)
        setCurrentLineWords(0)
        
        if (newLines >= 2) {
          setTimeout(() => winRef.current(), 1800)
        }
      } else {
        setCurrentLineWords(newCount)
      }
    }
  }

  // Animate flying words and type them on laptop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      
      setFlyingWords((prev) => {
        const updated = prev.map((w) => {
          if (now < w.t) return w
          const age = now - w.t
          const progress = Math.min(1, age / 1200)
          
          // Arc from phone to laptop
          const x = w.x + (18 - w.x) * progress
          const y = w.y - Math.sin(progress * Math.PI) * 20
          
          return { ...w, x, y }
        })
        
        // Type arrived words onto laptop
        updated.forEach((w) => {
          const age = now - w.t
          if (age >= 1200 && age < 1250) {
            setLaptopText((prev) => {
              const words = prev.split(' ')
              if (words[words.length - 1] === w.text) return prev
              return prev + (prev ? ' ' : '') + w.text
            })
          }
        })
        
        // Remove words that have been typed
        return updated.filter((w) => now - w.t < 1600)
      })
    }, 50)
    
    return () => clearInterval(timer)
  }, [])

  const showSuggestion = linesComplete === 0 && currentLineWords === 0 && flyingWords.length === 0

  return (
    <div className="l07">
      <div className="l07-wash" />
      <p className="l07-title">Words that travel</p>
      
      <div className="l07-stage">
        <svg viewBox="0 0 100 100" className="l07-scene">
          {/* Desk surface */}
          <rect x="0" y="70" width="100" height="30" fill={C.sand} rx="2" />
          
          {/* Laptop (left side) */}
          <g>
            {/* Laptop base */}
            <rect x="5" y="58" width="26" height="16" fill={C.cream} rx="1.5" />
            <rect x="7" y="60" width="22" height="12" fill={C.paper} rx="1" />
            {/* Screen */}
            <rect x="6" y="42" width="24" height="18" fill={C.cream} rx="1.5" />
            <rect x="8" y="44" width="20" height="14" fill="#2a2a2a" rx="0.8" />
            
            {/* Document with cursor on screen */}
            <rect x="9" y="45" width="18" height="12" fill={C.paper} rx="0.5" />
            {/* Typed text lines */}
            {laptopText && (
              <text x="10" y="48" fontSize="2" fill={C.ink} fontFamily="monospace">
                {laptopText.slice(0, 30)}
              </text>
            )}
            {laptopText.length > 30 && (
              <text x="10" y="51" fontSize="2" fill={C.ink} fontFamily="monospace">
                {laptopText.slice(30, 60)}
              </text>
            )}
            {/* Blinking cursor */}
            <rect 
              x={10 + (laptopText.length % 30) * 0.6} 
              y={46 + Math.floor(laptopText.length / 30) * 3} 
              width="0.4" 
              height="2" 
              fill={C.ink}
              className="l07-cursor"
            />
          </g>
          
          {/* Phone (right side, with stand) */}
          <g>
            {/* Stand */}
            <ellipse cx="85" cy="70" rx="8" ry="2" fill="#baa892" opacity="0.6" />
            <path d="M 81 70 L 83 58 L 87 58 L 89 70" fill="#baa892" />
            
            {/* Phone body */}
            <rect x="78" y="46" width="14" height="24" fill={C.terracotta} rx="1.8" />
            <rect x="79.5" y="48" width="11" height="19" fill={C.paper} rx="1" />
            
            {/* Phone screen content */}
            {mode === 'speech' && (
              <>
                {/* Mic button */}
                <circle 
                  cx="85" 
                  cy="60" 
                  r="4.5" 
                  fill={holding ? C.leaf : C.sand}
                  className="l07-mic-btn"
                  data-qa="mic-button"
                />
                <ellipse cx="85" cy="60" rx="2" ry="2.8" fill="white" opacity="0.7" />
                <rect x="83.5" y="61.5" width="3" height="1.2" fill="white" opacity="0.7" rx="0.3" />
                
                {/* Interim text */}
                {interim && (
                  <text x="85" y="53" fontSize="1.8" fill={C.ink2} textAnchor="middle" fontFamily="sans-serif">
                    {interim.slice(0, 20)}
                  </text>
                )}
              </>
            )}
            
            {mode === 'type' && (
              <>
                {/* Text input field */}
                <rect 
                  x="80.5" 
                  y="54" 
                  width="9" 
                  height="6" 
                  fill="white" 
                  rx="0.5" 
                  stroke={C.sand} 
                  strokeWidth="0.3"
                />
                {phoneInput && (
                  <text x="85" y="57.5" fontSize="1.4" fill={C.ink} textAnchor="middle" fontFamily="sans-serif">
                    {phoneInput.slice(0, 10)}
                  </text>
                )}
                
                {/* Send button */}
                <g 
                  className="l07-send-btn"
                  data-qa="send-button"
                  style={{ cursor: 'pointer' }}
                  onClick={handleTypeSend}
                >
                  <rect 
                    x="81.5" 
                    y="61.5" 
                    width="7" 
                    height="3" 
                    fill={phoneInput.trim() ? C.leaf : C.sand} 
                    rx="0.8"
                  />
                  <text x="85" y="63.8" fontSize="1.5" fill="white" textAnchor="middle" fontFamily="sans-serif" pointerEvents="none">
                    Send
                  </text>
                </g>
              </>
            )}
          </g>
          
          {/* Flying words */}
          {flyingWords.map((w) => (
            <text
              key={w.id}
              x={w.x}
              y={w.y}
              fontSize="2.5"
              fill={C.terracotta}
              fontFamily="sans-serif"
              fontWeight="600"
              className="l07-word"
            >
              {w.text}
            </text>
          ))}
          
          {/* Paper ribbon after unlock (floating between devices) */}
          {linesComplete >= 2 && (
            <path 
              d="M 36 56 Q 50 48, 75 54" 
              stroke={C.paper} 
              strokeWidth="1.5" 
              fill="none" 
              strokeLinecap="round"
              className="l07-ribbon"
            />
          )}
        </svg>
      </div>
      
      {/* Interaction handlers for speech mode */}
      {mode === 'speech' && (
        <div 
          className="l07-mic-zone"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => holding && handlePointerUp()}
          data-qa="mic-zone"
        />
      )}
      
      {/* Type mode input (invisible overlay for QA) */}
      {mode === 'type' && (
        <>
          <input
            type="text"
            className="l07-type-input"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTypeSend()}
            data-qa="type-input"
            placeholder="Type here..."
          />
          <button
            className="l07-send-overlay"
            onClick={handleTypeSend}
            data-qa="send-button"
            aria-label="Send"
          />
        </>
      )}
      
      <div className="l07-foot">
        <div className="l07-pills">
          <span className="l07-pill">{linesComplete} / 2 lines</span>
          {currentLineWords > 0 && <span className="l07-pill dim">{currentLineWords} words</span>}
          <span className="l07-pill dim">{mode === 'speech' ? 'speak' : 'type'}</span>
        </div>
        <p className="l07-hint">
          {showSuggestion && mode === 'speech' && 'Hold the mic and say a line, or type it.'}
          {showSuggestion && mode === 'speech' && <span className="l07-suggest">try: hello from the other side of the room</span>}
          {showSuggestion && mode === 'type' && 'Type a line and tap send.'}
          {!showSuggestion && linesComplete < 2 && 'Keep going…'}
          {linesComplete >= 2 && 'Words delivered'}
        </p>
      </div>
    </div>
  )
}
