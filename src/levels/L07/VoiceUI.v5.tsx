/**
 * L07 Wispr Wrap — the "say the word" DOM sheet. Tries Web Speech first (if
 * present and allowed), always offers a typed fallback. Soft, minimal, Inter.
 * Rendered inside a drei <Html> portal by the obstacle.
 */
import { useEffect, useRef, useState } from 'react'

const CSS = `
.gj-voice-wrap{position:fixed;inset:0;z-index:90;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;font-family:Inter,system-ui,sans-serif}
.gj-voice{pointer-events:auto;width:min(330px,88vw);margin-bottom:max(22px,env(safe-area-inset-bottom));background:rgba(251,246,238,.94);border-radius:26px;padding:18px 20px 16px;box-shadow:0 22px 55px -18px rgba(47,41,37,.4);animation:gjVoiceIn .5s cubic-bezier(.2,.7,.2,1) both;text-align:center}
@keyframes gjVoiceIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.gj-voice-eyebrow{font:500 11px Inter;letter-spacing:.12em;text-transform:uppercase;color:#6b5f57}
.gj-voice-word{font:500 34px Fraunces,Georgia,serif;color:#3b3330;margin:6px 0 2px}
.gj-voice-status{display:flex;align-items:center;justify-content:center;gap:7px;min-height:20px;font:500 12.5px Inter;color:#6b5f57;margin-top:8px}
.gj-voice-dot{width:8px;height:8px;border-radius:50%;background:#d9825b;animation:gjVCalm 1.6s ease-in-out infinite}
@keyframes gjVCalm{0%,100%{transform:scale(.65);opacity:.5}50%{transform:scale(1.15);opacity:1}}
.gj-voice-heard{font:400 13px Inter;color:#8a7a63;font-style:italic;min-height:18px}
.gj-voice-row{display:flex;gap:8px;margin-top:12px}
.gj-voice-input{flex:1;border:0;border-bottom:1.5px solid rgba(59,51,48,.25);background:transparent;font:400 15px Inter;color:#3b3330;padding:7px 4px;outline:none;text-align:center}
.gj-voice-input:focus{border-color:#3b3330}
.gj-voice-send{padding:9px 18px;border-radius:999px;background:#3b3330;color:#fbf6ee;font:500 13px Inter;transition:transform .15s}
.gj-voice-send:hover{transform:translateY(-1px)}
.gj-voice-alt{margin-top:12px;font:400 12px Inter;color:#a5977d}
.gj-voice-alt button{color:#6b5f57;border-bottom:1px solid rgba(107,95,87,.4);padding:0 0 1px}
.gj-voice-alt button:hover{color:#3b3330}
`

type Rec = { stop: () => void }

function tryListen(onText: (t: string, final: boolean) => void, onFail: () => void): Rec | null {
  const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!R) return null
  const r = new R()
  r.continuous = false; r.interimResults = true; r.maxAlternatives = 1; r.lang = 'en-IN'
  let failed = false
  r.onresult = (e: any) => {
    const res = e.results[e.results.length - 1]
    onText(res[0].transcript.trim(), res.isFinal)
  }
  r.onerror = (e: any) => { if (!failed && (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'network')) { failed = true; onFail() } }
  try { r.start() } catch { return null }
  return { stop: () => { try { r.stop() } catch {} } }
}

export default function VoiceUI({ word, onSubmit, onClose }: {
  word: string
  onSubmit: (text: string) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'listen' | 'type'>('listen')
  const [heard, setHeard] = useState('')
  const [typed, setTyped] = useState('')
  const [listening, setListening] = useState(false)
  const rec = useRef<Rec | null>(null)
  const doneRef = useRef(false)
  const submitRef = useRef(onSubmit); submitRef.current = onSubmit

  useEffect(() => {
    const timer = setTimeout(() => { rec.current?.stop(); setListening(false); setMode('type') }, 9000)
    const r = tryListen(
      (t, final) => {
        if (!t) return
        setHeard(t)
        if (final && !doneRef.current) {
          doneRef.current = true
          rec.current?.stop()
          setTimeout(() => submitRef.current(t), 450)
        }
      },
      () => { clearTimeout(timer); setMode('type') },
    )
    if (!r) { setMode('type'); clearTimeout(timer) }
    else { rec.current = r; setListening(true) }
    return () => { clearTimeout(timer); r?.stop() }
  }, [])

  const send = () => { const t = typed.trim(); if (t) onSubmit(t) }

  return (
    <div className="gj-voice-wrap">
      <style>{CSS}</style>
      <div className="gj-voice" data-qa="l07-voice">
        <div className="gj-voice-eyebrow">the door is listening for</div>
        <div className="gj-voice-word">{word}</div>
        <div className="gj-voice-status">
          {mode === 'listen' ? (
            <><span className="gj-voice-dot" />{listening ? 'listening — say it into the phone' : 'starting the mic…'}</>
          ) : 'type it and send it across'}
        </div>
        {mode === 'listen' && <div className="gj-voice-heard">{heard || ' '}</div>}
        {mode === 'type' && (
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
        <div className="gj-voice-alt">
          {mode === 'listen' && <button onClick={() => { rec.current?.stop(); setMode('type') }} data-qa="l07-typeinstead">type it instead</button>}
          {' · '}
          <button onClick={onClose} data-qa="l07-notnow">not now</button>
        </div>
      </div>
    </div>
  )
}
