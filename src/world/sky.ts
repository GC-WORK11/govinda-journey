/**
 * Day → golden hour → dusk → night, keyed on journey progress p = current/(N-1).
 * Islands 0–3 day, 4–6 golden hour, 7–9 dusk, 10 a warm indigo night.
 * `sampleSky` lerps between stops; Atmosphere damps toward it every frame so the
 * change rides along with the bridge walks. `env.night` is the single 0→1 signal
 * that lanterns, stars and island lamp lights read — one place to make it glow.
 */
import * as THREE from 'three'

/** Per-frame world mood, written by Atmosphere, read by lanterns/stars. */
export const env = { night: 0 }

type Stop = {
  at: number
  top: string; mid: string; bot: string          // sky dome gradient (mid doubles as fog + background)
  hs: string; hg: string; hi: number             // hemisphere sky / ground / intensity
  sun: string; si: number; so: [number, number, number] // key light colour, intensity, offset from island
  fill: string; fi: number                       // cool fill light
  night: number                                  // 0 day → 1 night (lantern/star driver)
}

const STOPS: Stop[] = [
  { at: 0.00, top: '#bcd6da', mid: '#efe2cb', bot: '#dcc2a0', hs: '#fff3e0', hg: '#b7a086', hi: 1.08, sun: '#ffe2b6', si: 1.9, so: [6, 12, 5], fill: '#dfe9e4', fi: 0.4, night: 0 },
  { at: 0.30, top: '#bcd6da', mid: '#efe2cb', bot: '#dcc2a0', hs: '#fff3e0', hg: '#b7a086', hi: 1.08, sun: '#ffe2b6', si: 1.9, so: [6, 12, 5], fill: '#dfe9e4', fi: 0.4, night: 0 },
  { at: 0.45, top: '#d9a075', mid: '#f5cd9d', bot: '#dd9f74', hs: '#ffe4b6', hg: '#a8896d', hi: 0.95, sun: '#ffc27a', si: 1.7, so: [9, 7, 4], fill: '#dcb298', fi: 0.3, night: 0.14 },
  { at: 0.60, top: '#d9a075', mid: '#f5cd9d', bot: '#dd9f74', hs: '#ffe4b6', hg: '#a8896d', hi: 0.95, sun: '#ffc27a', si: 1.7, so: [9, 7, 4], fill: '#dcb298', fi: 0.3, night: 0.16 },
  { at: 0.75, top: '#7b7096', mid: '#e0a184', bot: '#b98a77', hs: '#ecc5aa', hg: '#7d6e66', hi: 0.86, sun: '#ffb486', si: 1.15, so: [10.5, 3.4, 2], fill: '#8b82a2', fi: 0.26, night: 0.5 },
  { at: 0.90, top: '#7b7096', mid: '#e0a184', bot: '#b98a77', hs: '#ecc5aa', hg: '#7d6e66', hi: 0.86, sun: '#ffb486', si: 1.15, so: [10.5, 3.4, 2], fill: '#8b82a2', fi: 0.26, night: 0.55 },
  { at: 1.00, top: '#373356', mid: '#554864', bot: '#433b52', hs: '#6c6596', hg: '#3a3546', hi: 0.62, sun: '#c3c8ea', si: 0.5, so: [-5, 13, -7], fill: '#5a5880', fi: 0.28, night: 1 },
]

export type Sky = {
  top: THREE.Color; mid: THREE.Color; bot: THREE.Color
  hs: THREE.Color; hg: THREE.Color; hi: number
  sun: THREE.Color; si: number; so: THREE.Vector3
  fill: THREE.Color; fi: number; night: number
}

export function makeSky(): Sky {
  return {
    top: new THREE.Color(), mid: new THREE.Color(), bot: new THREE.Color(),
    hs: new THREE.Color(), hg: new THREE.Color(), hi: 1,
    sun: new THREE.Color(), si: 1, so: new THREE.Vector3(),
    fill: new THREE.Color(), fi: 0, night: 0,
  }
}

// Stop colours as THREE.Color instances, resolved once so sampling allocates nothing.
const SC = STOPS.map((s) => ({
  at: s.at,
  top: new THREE.Color(s.top), mid: new THREE.Color(s.mid), bot: new THREE.Color(s.bot),
  hs: new THREE.Color(s.hs), hg: new THREE.Color(s.hg), hi: s.hi,
  sun: new THREE.Color(s.sun), si: s.si, so: new THREE.Vector3(...s.so),
  fill: new THREE.Color(s.fill), fi: s.fi, night: s.night,
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
  cur.night += (tgt.night - cur.night) * f
}
