/**
 * L07 Wispr Wrap — the studio sheet. The mic listens for one word at a time (Web Speech where
 * the browser has it, restarted after each result), with a typed line as the fallback. Both
 * feed the same in-order match in Obstacle. Rendered inside a drei <Html> portal.
 */
import { useEffect, useRef, useState } from 'react'
import { WORDS } from './layout'

const CSS = `
.gj-voice-wrap{position:fixed;inset:0;z-index:90;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;font-family:Inter,system-ui,sans-serif}
.gj-voice{pointer-events:auto;width:min(330px,88vw);margin-bottom:max(22px,env(safe-area-inset-bottom));background:rgba(251,246,238,.94);border-radius:26px;padding:18px 20px 16px;box-shadow:0 22px 55px -18px rgba(47,41,37,.4);animation:gjVoiceIn .5s cubic-bezier(.2,.7,.2,1) both;text-align:center}
@keyframes gjVoiceIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion: reduce){.gj-voice{animation:none}}
.gj-voice-eyebrow{font:500 11px Inter;letter-spacing:.12em;text-transform:uppercase;color:#6b5f57}
.gj-voice-word{font:500 34px Fraunces,Georgia,serif;color:#3b3330;margin:6px 0 2px;min-height:40px}
.gj-voice-dots{display:flex;justify-content:center;gap:7px;margin-top:10px}
.gj-voice-dots span{width:7px;height:7px;border-radius:50%;background:rgba(59,51,48,.16);transition:background .3s}
.gj-voice-dots span.on{background:#8fb36b}
.gj-voice-status{display:flex;align-items:center;justify-content:center;gap:7px;min-height:20px;font:500 12.5px Inter;color:#6b5f57;margin-top:10px}
.gj-voice-dot{width:8px;height:8px;border-radius:50%;background:#d9825b;animation:gjVCalm 1.6s ease-in-out infinite}
@keyframes gjVCalm{0%,100%{transform:scale(.65);opacity:.5}50%{transform:scale(1.15);opacity:1}}
.gj-voice-heard{font:400 13px Inter;color:#8a7a63;font-style:italic;min-height:18px}
.gj-voice-row{display:flex;gap:8px;margin-top:12px;align-items:center}
.gj-voice-input{flex:1;border:0;border-bottom:1.5px solid rgba(59,51,48,.25);background:transparent;font:400 15px Inter;color:#3b3330;padding:7px 4px;outline:none;text-align:center}
.gj-voice-input:focus{border-color:#3b3330}
.gj-voice-send{margin-top:12px;padding:9px 18px;border-radius:999px;background:#3b3330;color:#fbf6ee;font:500 13px Inter;transition:transform .15s}
.gj-voice-row .gj-voice-send{margin-top:0}
.gj-voice-send:hover{transform:translateY(-1px)}
.gj-voice-alt{margin-top:12px;font:400 12px Inter;color:#a5977d}
.gj-voice-alt button{color:#6b5f57;border-bottom:1px solid rgba(107,95,87,.4);padding:0 0 1px}
.gj-voice-alt button:hover{color:#3b3330}
`

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network']

export default function VoiceUI({ next, onSpoken, onClose }: {
  next: number
  onSpoken: (text: string) => number
  onClose: () => void
}) {
  const [mode, setMode] = useState<'listen' | 'type'>(SR ? 'listen' : 'type')
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [status, setStatus] = useState('')
  const [typed, setTyped] = useState('')
  const [tick, setTick] = useState(0)
  const rec = useRef<any>(null)
  const submitRef = useRef(onSpoken); submitRef.current = onSpoken
  const word = WORDS[next] ?? ''
  const allSent = next >= WORDS.length

  const report = (text: string, n: number) => setStatus(n ? `sent “${text}”` : `heard “${text}”. try: ${word}`)

  const start = () => {
    if (!SR || rec.current) return
    const r = new SR()
    r.continuous = false; r.interimResults = true; r.maxAlternatives = 1; r.lang = 'en-IN'
    r.onresult = (e: any) => {
      const res = e.results[e.results.length - 1]
      const text: string = res[0].transcript.trim()
      setHeard(text)
      if (!res.isFinal) return
      rec.current = null; setListening(false)
      if (!text) return
      report(text, submitRef.current(text))
      setTick((n) => n + 1)
    }
    r.onerror = (e: any) => {
      if (rec.current === r) rec.current = null
      setListening(false)
      if (FATAL.includes(e.error)) setMode('type')
    }
    r.onend = () => { if (rec.current === r) { rec.current = null; setListening(false) } }
    try { r.start(); rec.current = r; setListening(true) } catch { setMode('type') }
  }

  useEffect(() => { if (mode === 'listen' && !allSent) start() }, [mode, next, tick])
  useEffect(() => () => { try { rec.current?.stop() } catch {} ; rec.current = null }, [])

  const toType = () => { try { rec.current?.stop() } catch {} ; rec.current = null; setListening(false); setMode('type') }
  const send = () => {
    const t = typed.trim()
    if (!t) return
    const n = submitRef.current(t)
    if (n) setTyped('')
    report(t, n)
  }

  return (
    <div className="gj-voice-wrap">
      <style>{CSS}</style>
      <div className="gj-voice" data-qa="l07-voice">
        <div className="gj-voice-eyebrow">the studio is listening for</div>
        <div className="gj-voice-word">{word}</div>
        <div className="gj-voice-dots">{WORDS.map((w, i) => <span key={w} className={i < next ? 'on' : ''} />)}</div>
        <div className="gj-voice-status">
          {status || (mode === 'type' ? 'type it and send it across' : listening ? <><span className="gj-voice-dot" />listening, say it into the mic</> : 'say it into the mic')}
        </div>
        {mode === 'listen' && <div className="gj-voice-heard">{heard || ' '}</div>}
        {mode === 'type' && !allSent && (
          <div className="gj-voice-row">
            <input
              className="gj-voice-input"
              data-qa="l07-input"
              value={typed}
              placeholder={word}
              autoFocus
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="gj-voice-send" data-qa="l07-send" onClick={send}>Send</button>
          </div>
        )}
        {mode === 'listen' && !listening && !allSent && (
          <button className="gj-voice-send" data-qa="l07-speak" onClick={start}>say it</button>
        )}
        <div className="gj-voice-alt">
          {mode === 'listen' && <button onClick={toType} data-qa="l07-typeinstead">type it instead</button>}
          {mode === 'listen' && ' · '}
          <button onClick={onClose} data-qa="l07-notnow">not now</button>
        </div>
      </div>
    </div>
  )
}
