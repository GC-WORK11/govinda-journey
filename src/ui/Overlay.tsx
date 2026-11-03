import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { LEVELS, CONTACT, RESUME } from '../levels/registry'
import { useJourney } from '../state/store'
import { listen, voiceSupported } from './voice'
import { Emblem, Walker } from './emblems'

const pad = (n: number) => String(n).padStart(2, '0')

/** Splits a line into words that drift in one at a time. */
function Words({ text, base = 0, step = 60, className }: { text: string; base?: number; step?: number; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="w" aria-hidden="true" style={{ animationDelay: `${base + i * step}ms` }}>{w}&nbsp;</span>
      ))}
    </span>
  )
}

export default function Overlay() {
  const { current, phase, started, solved } = useJourney()
  const st = useJourney.getState
  const L = LEVELS[current]
  const last = LEVELS.length - 1
  const isSolved = solved.includes(L.id)
  const [voiceOn, setVoiceOn] = useState(false)
  const [heard, setHeard] = useState('')
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [earned, setEarned] = useState<string | null>(null)
  const prevSolved = useRef(solved)
  const heardTimer = useRef(0)

  const play = useCallback(() => st().setPhase('playing'), [])
  const walkOn = useCallback(() => { const s = st(); if (s.current < last) s.travel(s.current + 1) }, [])
  const win = useCallback(() => {
    const s = st(); s.solve(LEVELS[s.current].id); s.setPhase('arrived')
    setTimeout(() => st().setPhase('panel'), 1500) // let the scaffold fall first
  }, [])
  const skip = useCallback(() => { const s = st(); LEVELS.forEach((l) => s.solve(l.id)); if (!s.started) s.start(); s.travel(last) }, [])
  const hop = useCallback((i: number) => { const s = st(); if (s.phase !== 'walking' && i !== s.current) s.travel(i) }, [])

  // The obvious next action for Enter / ArrowRight / voice "next".
  const next = useCallback(() => {
    const s = st()
    if (!s.started) return s.start()
    if (s.phase === 'arrived') return s.solved.includes(LEVELS[s.current].id) ? (s.current < last ? walkOn() : s.setPhase('panel')) : play()
    if (s.phase === 'panel' && s.current < last) return walkOn()
  }, [])

  // A freshly earned badge presses itself in beside the counter.
  useEffect(() => {
    const added = solved.find((id) => !prevSolved.current.includes(id))
    prevSolved.current = solved
    if (!added) return
    setEarned(added)
    const t = setTimeout(() => setEarned(null), 3800)
    return () => clearTimeout(t)
  }, [solved])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (badgesOpen) return setBadgesOpen(false)
        const p = st().phase
        if (p === 'playing' || p === 'panel') st().setPhase('arrived')
        return
      }
      if ((e.key === 'Enter' || e.key === 'ArrowRight') && st().phase !== 'playing') next()
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [next, badgesOpen])

  useEffect(() => {
    if (!voiceOn) return
    return listen((w) => {
      setHeard(w)
      window.clearTimeout(heardTimer.current)
      heardTimer.current = window.setTimeout(() => setHeard(''), 1500)
      if (/\bskip\b/.test(w)) return skip()
      if (/\bplay\b/.test(w)) {
        const s = st()
        if (s.phase === 'arrived' && !s.solved.includes(LEVELS[s.current].id)) return play()
      }
      if (/\b(next|continue|go|walk|start|begin|open|read)\b/.test(w)) next()
    })
  }, [voiceOn, next, skip, play])

  const earnedLevel = earned ? LEVELS.find((l) => l.id === earned) : null

  return (
    <div className={`ui phase-${phase} ${started ? 'started' : ''}`}>
      <header className="corner tl">
        <span className="mark">Govinda</span>
        {started && <span className="count">{pad(current + 1)} <i>/</i> {pad(LEVELS.length)}</span>}
      </header>
      <nav className="corner tr" aria-label="Journey">
        {voiceSupported() && (
          <button className={`link voice ${voiceOn ? 'on' : ''}`} aria-pressed={voiceOn}
            aria-label={voiceOn ? 'Voice control on, listening' : 'Turn on voice control — say next, play or skip'}
            onClick={() => setVoiceOn((v) => !v)}>
            {voiceOn
              ? <><i className="voice-dot" />Listening{heard ? <em className="heard"> “{heard.slice(0, 18)}”</em> : null}</>
              : 'Say “next”'}
          </button>
        )}
        {started && (
          <button className="link" aria-expanded={badgesOpen} aria-label={`Badges, ${solved.length} of ${LEVELS.length} earned`}
            onClick={() => setBadgesOpen((v) => !v)}>
            Badges {solved.length}
          </button>
        )}
        {current < last && <button className="link skip" onClick={skip}>Skip to the end</button>}
      </nav>

      {earnedLevel && (
        <div className="earned" role="status">
          <span className="em" style={{ color: 'var(--ink)', background: `color-mix(in srgb, ${earnedLevel.palette.accent} 20%, var(--paper))` }}>
            <Emblem id={earnedLevel.id} accent={earnedLevel.palette.accent} />
          </span>
          <span className="earned-name">{earnedLevel.badge}</span>
        </div>
      )}

      {badgesOpen && (
        <aside className="badges" role="dialog" aria-label="Badges earned along the way">
          <div className="badges-head"><p className="eyebrow">Badges</p>
            <button className="link close" onClick={() => setBadgesOpen(false)} aria-label="Close badges">Close</button></div>
          {LEVELS.map((l) => {
            const got = solved.includes(l.id)
            return (
              <div key={l.id} className={`badge ${got ? 'got' : ''}`}>
                <span className="em" style={got ? { background: `color-mix(in srgb, ${l.palette.accent} 22%, var(--paper))` } : undefined}>
                  <Emblem id={l.id} accent={l.palette.accent} />
                </span>
                <span><b>{l.badge}</b><small>{l.title}</small></span>
              </div>
            )
          })}
        </aside>
      )}

      {!started && (
        <section className="intro">
          <p className="eyebrow">Govinda Chauhan · 21 · IIT Patna</p>
          <h1><Words text="The Journey of Govinda" base={150} step={110} /></h1>
          <p className="sub"><Words text="Three years of building, one path. Every island is a real project. Play its small game to open it." base={500} step={45} /></p>
          <button className="btn" onClick={() => st().start()}>Begin the walk</button>
        </section>
      )}

      {started && phase === 'arrived' && (
        <section className="arrive" key={L.id}>
          <p className="eyebrow">{L.place}</p>
          <h2><Words text={L.title} base={80} step={90} /></h2>
          <p className="line"><Words text={L.line} base={350} step={40} /></p>
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
        <section className="sheet game" key={'g' + L.id} role="dialog" aria-label={`${L.title} — ${L.task}`}>
          <div className="sheet-head"><p className="eyebrow">{L.title}</p><p className="task">{L.task}</p>
            <button className="link close" onClick={() => st().setPhase('arrived')} aria-label="Leave the game">Leave</button></div>
          <div className="game-body"><Suspense fallback={<div className="loading">…</div>}><L.Game onWin={win} /></Suspense></div>
        </section>
      )}

      {phase === 'panel' && (
        <section className="sheet panel" key={'p' + L.id} role="dialog" aria-label={`${L.title} — story`}>
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

      {started && (
        <nav className="path" aria-label="The eleven stops">
          <i className="path-rail" aria-hidden="true" />
          {LEVELS.map((l, i) => {
            const done = solved.includes(l.id), here = i === current
            return (
              <button key={l.id}
                className={`stop ${done ? 'done' : ''} ${here ? 'here' : ''}`}
                title={`${l.title} — ${l.badge}`}
                aria-label={`Stop ${i + 1}: ${l.title}${done ? ', badge earned' : here ? ', you are here' : ''}`}
                aria-current={here || undefined}
                disabled={!done && !here}
                onClick={() => hop(i)}>
                {here ? <Walker /> : <i className="tick" aria-hidden="true" />}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
