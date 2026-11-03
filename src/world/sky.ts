/**
 * Day → golden hour → dusk → night, keyed on journey progress p = current/(N-1).
 * Islands 0–3 day, 4–6 golden hour, 7–9 dusk, 10 a warm indigo night.
 * `sampleSky` lerps between stops; Atmosphere damps toward it every frame so the
 * change rides along with the bridge walks. `env.night` is the single 0→1 signal
 * that lanterns, stars and island lamp lights read — one place to make it glow.
 */
import * as THREE from 'three'

/** Per-frame world mood, written by Atmosphere, read by lanterns/stars/clouds. */
export const env = {
  night: 0,
  finale: 0,
  top: new THREE.Color('#bcd6da'),
  mid: new THREE.Color('#efe2cb'),
  bot: new THREE.Color('#dcc2a0'),
}

type Stop = {
  at: number
  top: string; mid: string; bot: string          // sky dome gradient (mid doubles as fog + background)
  hs: string; hg: string; hi: number             // hemisphere sky / ground / intensity
  sun: string; si: number; so: [number, number, number] // key light colour, intensity, offset from island
  fill: string; fi: number                       // cool fill light
  glow: string; gi: number                       // soft band of warmth hugging the horizon
  night: number                                  // 0 day → 1 night (lantern/star driver)
}

const STOPS: Stop[] = [
  { at: 0.00, top: '#bcd6da', mid: '#efe2cb', bot: '#dcc2a0', hs: '#fff3e0', hg: '#b7a086', hi: 1.08, sun: '#ffe2b6', si: 1.9, so: [6, 12, 5], fill: '#dfe9e4', fi: 0.4, glow: '#f9e3b4', gi: 0.12, night: 0 },
  { at: 0.30, top: '#bcd6da', mid: '#efe2cb', bot: '#dcc2a0', hs: '#fff3e0', hg: '#b7a086', hi: 1.08, sun: '#ffe2b6', si: 1.9, so: [6, 12, 5], fill: '#dfe9e4', fi: 0.4, glow: '#f9e3b4', gi: 0.12, night: 0 },
  { at: 0.45, top: '#a9a3c6', mid: '#f5cd9d', bot: '#dda06f', hs: '#ffe6ba', hg: '#a8896d', hi: 0.95, sun: '#ffc27a', si: 1.6, so: [9, 7, 4], fill: '#d8b6a4', fi: 0.32, glow: '#ffba80', gi: 0.34, night: 0.14 },
  { at: 0.60, top: '#a9a3c6', mid: '#f5cd9d', bot: '#dda06f', hs: '#ffe6ba', hg: '#a8896d', hi: 0.95, sun: '#ffc27a', si: 1.6, so: [9, 7, 4], fill: '#d8b6a4', fi: 0.32, glow: '#ffba80', gi: 0.34, night: 0.16 },
  { at: 0.75, top: '#6f669a', mid: '#e29f8d', bot: '#a97e78', hs: '#d4bfc2', hg: '#6f6872', hi: 0.88, sun: '#ffc6a4', si: 0.92, so: [10.5, 3.4, 2], fill: '#8b86ac', fi: 0.34, glow: '#ff9e76', gi: 0.30, night: 0.5 },
  { at: 0.90, top: '#6f669a', mid: '#e29f8d', bot: '#a97e78', hs: '#d4bfc2', hg: '#6f6872', hi: 0.88, sun: '#ffc6a4', si: 0.92, so: [10.5, 3.4, 2], fill: '#8b86ac', fi: 0.34, glow: '#ff9e76', gi: 0.30, night: 0.55 },
  { at: 1.00, top: '#322e50', mid: '#514360', bot: '#3c3550', hs: '#76709e', hg: '#37324a', hi: 0.66, sun: '#c9cdee', si: 0.55, so: [-5, 13, -7], fill: '#5c5a86', fi: 0.3, glow: '#8a78b0', gi: 0.14, night: 1 },
]

export type Sky = {
  top: THREE.Color; mid: THREE.Color; bot: THREE.Color
  hs: THREE.Color; hg: THREE.Color; hi: number
  sun: THREE.Color; si: number; so: THREE.Vector3
  fill: THREE.Color; fi: number
  glow: THREE.Color; gi: number; night: number
}

export function makeSky(): Sky {
  return {
    top: new THREE.Color(), mid: new THREE.Color(), bot: new THREE.Color(),
    hs: new THREE.Color(), hg: new THREE.Color(), hi: 1,
    sun: new THREE.Color(), si: 1, so: new THREE.Vector3(),
    fill: new THREE.Color(), fi: 0,
    glow: new THREE.Color(), gi: 0, night: 0,
  }
}

// Stop colours as THREE.Color instances, resolved once so sampling allocates nothing.
const SC = STOPS.map((s) => ({
  at: s.at,
  top: new THREE.Color(s.top), mid: new THREE.Color(s.mid), bot: new THREE.Color(s.bot),
  hs: new THREE.Color(s.hs), hg: new THREE.Color(s.hg), hi: s.hi,
  sun: new THREE.Color(s.sun), si: s.si, so: new THREE.Vector3(...s.so),
  fill: new THREE.Color(s.fill), fi: s.fi,
  glow: new THREE.Color(s.glow), gi: s.gi, night: s.night,
}))

/** Sample the stop table at progress p into `out` (no allocation). */
export function sampleSky(p: number, out: Sky): Sky {
  let a = SC[0], b = SC[SC.length - 1]
  for (let i = 0; i < SC.length - 1; i++) {
    if (p >= SC[i].at && p <= SC[i + 1].at) { a = SC[i]; b = SC[i + 1]; break }
  }
  const t = b.at === a.at ? 0 : Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at)))
  const e = t * t * (3 - 2 * t)
  out.top.copy(a.top).lerp(b.top, e)
  out.mid.copy(a.mid).lerp(b.mid, e)
  out.bot.copy(a.bot).lerp(b.bot, e)
  out.hs.copy(a.hs).lerp(b.hs, e)
  out.hg.copy(a.hg).lerp(b.hg, e)
  out.hi = a.hi + (b.hi - a.hi) * e
  out.sun.copy(a.sun).lerp(b.sun, e)
  out.si = a.si + (b.si - a.si) * e
  out.so.copy(a.so).lerp(b.so, e)
  out.fill.copy(a.fill).lerp(b.fill, e)
  out.fi = a.fi + (b.fi - a.fi) * e
  out.glow.copy(a.glow).lerp(b.glow, e)
  out.gi = a.gi + (b.gi - a.gi) * e
  out.night = a.night + (b.night - a.night) * e
  return out
}

/** Damp every field of `cur` toward `tgt` (frame-rate independent). */
export function dampSky(cur: Sky, tgt: Sky, dt: number, k = 2.6) {
  const f = 1 - Math.exp(-dt * k)
  cur.top.lerp(tgt.top, f); cur.mid.lerp(tgt.mid, f); cur.bot.lerp(tgt.bot, f)
  cur.hs.lerp(tgt.hs, f); cur.hg.lerp(tgt.hg, f); cur.hi += (tgt.hi - cur.hi) * f
  cur.sun.lerp(tgt.sun, f); cur.si += (tgt.si - cur.si) * f
  cur.so.lerp(tgt.so, f)
  cur.fill.lerp(tgt.fill, f); cur.fi += (tgt.fi - cur.fi) * f
  cur.glow.lerp(tgt.glow, f); cur.gi += (tgt.gi - cur.gi) * f
  cur.night += (tgt.night - cur.night) * f
}
