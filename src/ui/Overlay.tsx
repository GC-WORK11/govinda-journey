import { useCallback, useEffect, useRef, useState } from 'react'
import { LEVELS, CONTACT, RESUME } from '../levels/registry'
import { useJourney } from '../state/store'
import { Emblem } from './emblems'

const pad = (n: number) => String(n).padStart(2, '0')

/** Splits a line into words that drift in one at a time. */
function Words({ text, base = 0, step = 60 }: { text: string; base?: number; step?: number }) {
  return (
    <span aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="w" aria-hidden="true" style={{ animationDelay: `${base + i * step}ms` }}>{w}&nbsp;</span>
      ))}
    </span>
  )
}

const CHAPTER_MS = 2600 // the chapter title holds, then the game begins by itself

export default function Overlay() {
  const { current, target, phase, started, solved, muted } = useJourney()
  const st = useJourney.getState
  const L = LEVELS[current]
  const last = LEVELS.length - 1
  const isSolved = solved.includes(L.id)
  const [skipOk, setSkipOk] = useState(false)
  const timer = useRef(0)

  const walkOn = useCallback(() => { const s = st(); if (s.current < last && s.phase !== 'walking') s.travel(s.current + 1) }, [])
  const skipAll = useCallback(() => { const s = st(); LEVELS.forEach((l) => s.solve(l.id)); if (!s.started) s.start(); s.travel(last) }, [])

  // Arriving at an unsolved island: show the chapter title, then start its game.
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (started && phase === 'arrived' && !isSolved && target === current)
      timer.current = window.setTimeout(() => { const s = st(); if (s.phase === 'arrived') s.setPhase('playing') }, CHAPTER_MS)
    return () => window.clearTimeout(timer.current)
  }, [started, phase, isSolved, current, target])

  // A quiet way out appears only if someone is stuck for a while.
  useEffect(() => {
    setSkipOk(false)
    if (phase !== 'playing') return
    const t = window.setTimeout(() => setSkipOk(true), 25000)
    return () => window.clearTimeout(t)
  }, [phase, current])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const s = st()
      if (e.key !== 'Enter' && e.key !== 'ArrowRight') return
      if (!s.started) return s.start()
      if (s.phase === 'arrived' && s.solved.includes(LEVELS[s.current].id)) walkOn()
      else if (s.phase === 'arrived') s.setPhase('playing')
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [walkOn])

  const showChapter = started && target === current && !isSolved && (phase === 'arrived' || phase === 'playing')
  const isFinale = L.kind === 'finale'

  return (
    <div className={`ui phase-${phase} ${started ? 'started' : ''}`}>
      <header className="corner tl" data-ui>
        <span className="mark">Govinda</span>
        {started && <span className="count">{pad(current + 1)} <i>/</i> {pad(LEVELS.length)}</span>}
      </header>
      <nav className="corner tr" aria-label="Journey" data-ui>
        {started && (
          <span className="pips" aria-label={`${solved.length} of ${LEVELS.length} opened`}>
            {LEVELS.map((l) => <i key={l.id} className={solved.includes(l.id) ? 'on' : ''} />)}
          </span>
        )}
        <button className="link" aria-pressed={!muted} onClick={() => useJourney.setState({ muted: !muted })}>{muted ? 'Sound off' : 'Sound on'}</button>
        {started && current < last && <button className="link" onClick={skipAll}>Skip to the end</button>}
      </nav>

      {!started && (
        <section className="intro" data-ui>
          <p className="eyebrow">Govinda Chauhan · IIT Patna</p>
          <h1><Words text="The Journey of Govinda" base={900} step={110} /></h1>
          <p className="sub"><Words text="Every island is something I built. Play it to open it." base={1500} step={45} /></p>
          <button className="btn" onClick={() => st().start()}>Begin</button>
        </section>
      )}

      {showChapter && (
        <section className={`chapter ${phase === 'playing' ? 'small' : ''}`} key={'c' + L.id} aria-live="polite">
          <p className="eyebrow">{L.place}</p>
          <h2>{phase === 'playing' ? L.title : <Words text={L.title} base={120} step={110} />}</h2>
          {phase !== 'playing' && <p className="line"><Words text={L.line} base={600} step={40} /></p>}
        </section>
      )}

      {started && phase === 'playing' && (
        <div className="hint" key={'h' + L.id} role="status">
          <span>{L.hint}</span>
          {skipOk && <button className="link" data-ui onClick={() => st().win()}>Skip this one</button>}
        </div>
      )}

      {phase === 'won' && (
        <div className="unlocked" key={'u' + L.id} role="status">
          <span className="em" style={{ background: `color-mix(in srgb, ${L.palette.accent} 24%, var(--paper))` }}>
            <Emblem id={L.id} accent={L.palette.accent} />
          </span>
          <span className="name">{L.badge}</span>
        </div>
      )}

      {started && phase === 'arrived' && isSolved && target === current && (
        <section className={`after ${isFinale ? 'finale' : ''}`} key={'a' + L.id} data-ui>
          <p className="eyebrow">{L.place} · {L.badge}</p>
          <h2>{L.title}</h2>
          <p className="story">{L.story}</p>
          {L.links.length > 0 && <p className="links">{L.links.map((k) => <a key={k.href} href={k.href} target="_blank" rel="noreferrer">{k.label}</a>)}</p>}
          {isFinale ? (
            <>
              <p className="links">{CONTACT.map((k) => <a key={k.href} href={k.href} target="_blank" rel="noreferrer">{k.label}</a>)}</p>
              <div className="row"><a className="btn" href={RESUME} target="_blank" rel="noreferrer">Résumé</a>
                <button className="link" onClick={() => st().reset()}>Walk it again</button></div>
            </>
          ) : (
            <div className="row"><button className="btn" onClick={walkOn}>Walk on</button></div>
          )}
        </section>
      )}
    </div>
  )
}
