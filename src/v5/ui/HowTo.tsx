/**
 * How-to-play, shown once before the walk begins — only for a fresh visitor on
 * the plain route (not ?qa, not ?at deep-links, not a journey already started).
 * Words on a soft cream veil, Fraunces + Inter, no panel: what to press and
 * what the goal is. It freezes the traveller and melts away on the first real
 * input — that press IS the start.
 */
import { useEffect, useRef, useState } from 'react'
import { player, useV5 } from '../core'
import { input } from '../player/input'

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
const SKIP = Q.has('qa') || Q.has('at') || Q.has('sandbox')

export function HowTo() {
  const [show, setShow] = useState(() => !SKIP && useV5.getState().done.length === 0)
  const [gone, setGone] = useState(!show)
  const touch = useRef(input.touch || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches))

  // hold the traveller still while the words are up
  useEffect(() => {
    if (!show) return
    player.frozen = true
    return () => { player.frozen = false }
  }, [show])

  // any real input begins the walk — key, tap, joystick, use button
  useEffect(() => {
    if (!show) return
    const off = () => setShow(false)
    window.addEventListener('keydown', off, { once: true })
    window.addEventListener('pointerdown', off, { once: true })
    return () => { window.removeEventListener('keydown', off); window.removeEventListener('pointerdown', off) }
  }, [show])

  // unmount after the fade so it can never block input again
  useEffect(() => {
    if (show || gone) return
    const t = window.setTimeout(() => setGone(true), 600)
    return () => window.clearTimeout(t)
  }, [show, gone])

  if (gone) return null
  return (
    <div className={`v5-how ${show ? 'on' : ''}`} role="dialog" aria-label="How to play">
      <div className="words">
        <p className="eyebrow">The journey of Govinda</p>
        <p className="line">A chain of little islands, one per chapter. Each project
          island is a short game about something real I built — finish it to open the way on.</p>
        <p className="keys">
          {touch.current
            ? 'Stick to walk · hop and use buttons · drag the sky to look'
            : 'WASD or arrows to walk · Space to hop · E to use · drag the sky to look'}
        </p>
        <p className="begin">{touch.current ? 'Tap anywhere to begin' : 'Press any key to begin'}</p>
      </div>
    </div>
  )
}
