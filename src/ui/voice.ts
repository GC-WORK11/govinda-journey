/** Tiny Web Speech wrapper. Calls onWord with each recognised lowercase phrase. */
export function voiceSupported() { return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) }
export function listen(onWord: (w: string) => void) {
  const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!R) return () => {}
  const r = new R(); r.continuous = true; r.interimResults = false; r.maxAlternatives = 1; r.lang = 'en-IN'
  let alive = true
  r.onresult = (e: any) => { const t = e.results[e.results.length - 1][0].transcript.trim().toLowerCase(); onWord(t) }
  r.onend = () => { if (alive) try { r.start() } catch {} }
  r.onerror = () => {}
  try { r.start() } catch {}
  return () => { alive = false; try { r.stop() } catch {} }
}
