import { Suspense, useCallback, useEffect, useState } from 'react'
import { LEVELS, CONTACT, RESUME } from '../levels/registry'
import { useJourney } from '../state/store'
import { listen, voiceSupported } from './voice'

const pad = (n: number) => String(n).padStart(2, '0')

export default function Overlay() {
  const { current, phase, started, solved } = useJourney()
  const st = useJourney.getState
  const L = LEVELS[current]
  const last = LEVELS.length - 1
  const isSolved = solved.includes(L.id)
  const [voiceOn, setVoiceOn] = useState(false)
  const [heard, setHeard] = useState('')
  const [badgesOpen, setBadgesOpen] = useState(false)

  const play = useCallback(() => st().setPhase('playing'), [])
  const walkOn = useCallback(() => { const s = st(); if (s.current < last) s.travel(s.current + 1) }, [])
  const win = useCallback(() => {
    const s = st(); s.solve(LEVELS[s.current].id); s.setPhase('arrived')
    setTimeout(() => st().setPhase('panel'), 1500) // let the scaffold fall first
  }, [])
  const skip = useCallback(() => { const s = st(); LEVELS.forEach((l) => s.solve(l.id)); if (!s.started) s.start(); s.travel(last) }, [])

  // keyboard: Enter / Right arrow = the obvious next action
  const next = useCallback(() => {
    const s = st()
    if (!s.started) return s.start()
    if (s.phase === 'arrived') return s.solved.includes(LEVELS[s.current].id) ? (s.current < last ? walkOn() : s.setPhase('panel')) : play()
    if (s.phase === 'panel' && s.current < last) return walkOn()
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === 'ArrowRight') && st().phase !== 'playing') next() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [next])
  useEffect(() => {
    if (!voiceOn) return
    return listen((w) => { setHeard(w); if (/\b(next|continue|go|walk|start|play|begin)\b/.test(w)) next() })
  }, [voiceOn, next])

  return (
    <div className={`ui phase-${phase} ${started ? 'started' : ''}`}>
      {/* corner marks */}
      <header className="corner tl">
        <span className="mark">Govinda</span>
        {started && <span className="count">{pad(current + 1)} <i>/</i> {pad(LEVELS.length)}</span>}
      </header>
      <nav className="corner tr">
        {voiceSupported() && (
          <button className={`link ${voiceOn ? 'on' : ''}`} onClick={() => setVoiceOn((v) => !v)}>
            {voiceOn ? <>Listening{heard ? <em> · “{heard.slice(0, 18)}”</em> : null}</> : 'Say “next”'}
          </button>
        )}
        {started && <button className="link" onClick={() => setBadgesOpen((v) => !v)}>Badges {solved.length}</button>}
        {current < last && <button className="link" onClick={skip}>Skip to the end</button>}
      </nav>

      {badgesOpen && (
        <aside className="badges" onClick={() => setBadgesOpen(false)}>
          {LEVELS.map((l) => (
            <div key={l.id} className={`badge ${solved.includes(l.id) ? 'got' : ''}`}>
              <span className="seal" style={{ background: solved.includes(l.id) ? l.palette.accent : undefined }}>{l.badge[0]}</span>
              <span><b>{l.badge}</b><small>{l.title}</small></span>
            </div>
          ))}
        </aside>
      )}

      {!started && (
        <section className="intro">
          <p className="eyebrow">Govinda Chauhan · 21 · IIT Patna</p>
          <h1>The Journey<br />of Govinda</h1>
          <p className="sub">Three years of building, one path. Every island is a real project. Play its small game to open it.</p>
          <button className="btn" onClick={() => st().start()}>Begin the walk</button>
        </section>
      )}

      {started && phase === 'arrived' && (
        <section className="arrive" key={L.id}>
          <p className="eyebrow">{L.place}</p>
          <h2>{L.title}</h2>
          <p className="line">{L.line}</p>
          {!isSolved ? (
            <div className="row"><button className="btn" onClick={play}>Play</button><span className="task">{L.task}</span></div>
          ) : (
            <div className="row">
              <button className="btn" onClick={() => st().setPhase('panel')}>{L.kind === 'finale' ? 'Open' : 'Read the story'}</button>
              {current < last && <button className="link" onClick={walkOn}>Walk on</button>}
            </div>
          )}
        </section>
      )}

      {phase === 'playing' && (
        <section className="sheet game" key={'g' + L.id}>
          <div className="sheet-head"><p className="eyebrow">{L.title}</p><p className="task">{L.task}</p>
            <button className="link close" onClick={() => st().setPhase('arrived')}>Leave</button></div>
          <div className="game-body"><Suspense fallback={<div className="loading">…</div>}><L.Game onWin={win} /></Suspense></div>
        </section>
      )}

      {phase === 'panel' && (
        <section className="sheet panel" key={'p' + L.id}>
          <p className="eyebrow">{L.place} · Badge: {L.badge}</p>
          <h2>{L.title}</h2>
          <p className="story">{L.story}</p>
          {L.tech && <p className="tech">{L.tech}</p>}
          {L.links.length > 0 && <p className="links">{L.links.map((k) => <a key={k.href} href={k.href} target="_blank" rel="noreferrer">{k.label}</a>)}</p>}
          {L.kind === 'finale' && (
            <>
              <div className="whatsnext">
                <p className="eyebrow">Every stop</p>
                <p className="links">{LEVELS.filter((l) => l.links.length).map((l) => <a key={l.id} href={l.links[0].href} target="_blank" rel="noreferrer">{l.title}</a>)}</p>
                <p className="eyebrow">Say hello</p>
                <p className="links">{CONTACT.map((k) => <a key={k.href} href={k.href} target="_blank" rel="noreferrer">{k.label}</a>)}</p>
              </div>
              <div className="row"><a className="btn" href={RESUME} target="_blank" rel="noreferrer">Résumé</a>
                <button className="link" onClick={() => { st().reset() }}>Walk it again</button></div>
            </>
          )}
          {L.kind !== 'finale' && <div className="row"><button className="btn" onClick={walkOn}>Walk on</button>
            <button className="link" onClick={() => st().setPhase('arrived')}>Stay a while</button></div>}
        </section>
      )}
    </div>
  )
}
