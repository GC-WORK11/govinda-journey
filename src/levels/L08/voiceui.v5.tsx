/**
 * SpeakPrompt — minimal DOM overlay: say (or type) one word to the guardian.
 * Uses the project's tiny Web Speech wrapper; typing is always offered.
 */
import { useEffect, useRef, useState } from 'react'
import { listen, voiceSupported } from '../../ui/voice'
import { Veil, useFrozen } from './v5kit.v5'

export function SpeakPrompt({ word, onResult, onClose }: {
  word: string
  onResult: (ok: boolean) => void
  onClose: () => void
}) {
  useFrozen(true)
  const canSpeak = voiceSupported()
  const [typing, setTyping] = useState(!canSpeak)
  const [note, setNote] = useState('')
  const done = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (text: string) => {
    if (done.current) return
    if (text.toLowerCase().includes(word.toLowerCase())) {
      done.current = true
      setNote('')
      setTimeout(() => onResult(true), 350)
    } else if (text.trim()) {
      setNote('It heard something else — try again.')
    }
  }

  useEffect(() => {
    if (!canSpeak || typing) return
    const stop = listen(accept)
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing, canSpeak])

  useEffect(() => { if (typing) inputRef.current?.focus() }, [typing])

  return (
    <Veil onClose={onClose}>
      <div data-qa="speak" className="jov5-center">
        <div className="jov5-title">The guardian is listening</div>
        <div className="jov5-sub" style={{ marginTop: 14 }}>
          {!typing && <span className="jov5-dot" aria-hidden />}
          Say <b style={{ fontWeight: 600 }}>“{word}”</b> to it.
        </div>
        {typing ? (
          <form style={{ marginTop: 16 }} onSubmit={(e) => { e.preventDefault(); accept(inputRef.current?.value ?? '') }}>
            <input ref={inputRef} className="jov5-input" data-qa="speak-input"
              placeholder={`type “${word}”`} autoComplete="off" autoCapitalize="off" />
          </form>
        ) : null}
        <div className="jov5-row" style={{ justifyContent: 'center' }}>
          {!typing && <button className="jov5-link" data-qa="speak-type" onClick={() => setTyping(true)}>type it instead</button>}
          {typing && canSpeak && <button className="jov5-link" onClick={() => setTyping(false)}>use the microphone</button>}
        </div>
        <div className="jov5-note" data-qa="speak-note">{note || ' '}</div>
      </div>
    </Veil>
  )
}
