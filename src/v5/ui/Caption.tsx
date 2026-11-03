/**
 * One quiet line under the ribbon: the island's `line` on arrival, its `tech`
 * for ~6 s after solving. Reads useV5.caption (written by the watcher in
 * Chrome) and fades between texts — never a panel, just words on the sky.
 */
import { useEffect, useState } from 'react'
import { useV5 } from '../core'
import { useWorldUI } from '../world/progress'

export function Caption() {
  const caption = useV5((s) => s.caption)
  const eyebrow = useWorldUI((s) => s.capEyebrow)
  const finale = useWorldUI((s) => s.finale)
  const [text, setText] = useState<string | null>(caption)
  const [eyeb, setEyeb] = useState(eyebrow)
  const [on, setOn] = useState(false)

  // fade out, swap text, fade in
  useEffect(() => {
    if (caption === text) { setOn(!!caption); return }
    setOn(false)
    const t = window.setTimeout(() => { setText(caption); setEyeb(eyebrow); if (caption) setOn(true) }, 380)
    return () => window.clearTimeout(t)
  }, [caption, eyebrow]) // eslint-disable-line react-hooks/exhaustive-deps

  // the finale card carries its own subtitle — the island caption would
  // duplicate it over the title, so it just fades out
  return (
    <div className={`v5-cap ${on && !finale ? 'on' : ''}`} role="status" aria-live="polite">
      {eyeb && <p className="eyebrow">{eyeb}</p>}
      {text && <p className="line">{text}</p>}
    </div>
  )
}
