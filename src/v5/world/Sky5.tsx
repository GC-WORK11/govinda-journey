/**
 * V5 sky: morning at the first island → golden hour → dusk → a warm indigo night
 * with lanterns at the last. Samples the shared stop table (src/world/sky.ts) at
 * a continuous path progress so the light turns while you cross a bridge, and
 * writes the shared `env` (night drives lantern glass, finale sinks the clouds).
 * Fog rides just past the camera so the next island stays a soft silhouette;
 * in the finale pull-back it opens up for the whole lit path.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { V5_ORDER, player, cinematic } from '../core'
import { ISLAND_POS, PATH_MID } from './layout'
import { env, makeSky, dampSky, type Sky } from '../../world/sky'
import { driveLamps } from '../../world/Lanterns'
import { useWorldUI } from './progress'

const N = V5_ORDER.length
const LAST = N - 1
const tmp = makeSky()
const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3()
export const skyDebug = { cIdx: 0, p: 0 }

/* ------------------------------------------------------------------ *
 * V5 palette constants — V4's stop colours (src/world/sky.ts STOPS),
 * re-timed for V5's island order: golden hour must already be on by
 * L05 (p ≈ 0.4), where V4's own L05 also sat inside the warm band.
 * Same hexes, same fields; only the `at` schedule moved earlier.
 * ------------------------------------------------------------------ */
type Stop = {
  at: number
  top: string; mid: string; bot: string
  hs: string; hg: string; hi: number
  sun: string; si: number; so: [number, number, number]
  fill: string; fi: number
  glow: string; gi: number
  night: number
}

const STOPS5: Stop[] = [
  // V5's camera rides lower than V4's and frames much more of the above-horizon
  // dome, so the early-game `top` stays a warm cream-peach (close to V4's mid)
  // instead of V4's cool blue-grey — the L01 frame reads warm top to bottom.
  { at: 0.00, top: '#ecdcc4', mid: '#efe2cb', bot: '#dcc2a0', hs: '#fff3e0', hg: '#b7a086', hi: 1.08, sun: '#ffe2b6', si: 1.9, so: [6, 12, 5], fill: '#dfe9e4', fi: 0.4, glow: '#f9e3b4', gi: 0.12, night: 0 },
  { at: 0.28, top: '#ecdcc4', mid: '#efe2cb', bot: '#dcc2a0', hs: '#fff3e0', hg: '#b7a086', hi: 1.08, sun: '#ffe2b6', si: 1.9, so: [6, 12, 5], fill: '#dfe9e4', fi: 0.4, glow: '#f9e3b4', gi: 0.12, night: 0 },
  { at: 0.42, top: '#a9a3c6', mid: '#f5cd9d', bot: '#dda06f', hs: '#ffe6ba', hg: '#a8896d', hi: 0.95, sun: '#ffc27a', si: 1.6, so: [9, 7, 4], fill: '#d8b6a4', fi: 0.32, glow: '#ffba80', gi: 0.34, night: 0.14 },
  { at: 0.56, top: '#a9a3c6', mid: '#f5cd9d', bot: '#dda06f', hs: '#ffe6ba', hg: '#a8896d', hi: 0.95, sun: '#ffc27a', si: 1.6, so: [9, 7, 4], fill: '#d8b6a4', fi: 0.32, glow: '#ffba80', gi: 0.34, night: 0.16 },
  // dusk pushed a little later than V4's schedule — V5's 11 stops land
  // L06–L08 in the readable pink band instead of muddy deep dusk; L09 keeps
  // the full night stop at p = 1.
  { at: 0.76, top: '#6f669a', mid: '#e29f8d', bot: '#a97e78', hs: '#d4bfc2', hg: '#6f6872', hi: 0.88, sun: '#ffc6a4', si: 0.92, so: [10.5, 3.4, 2], fill: '#8b86ac', fi: 0.34, glow: '#ff9e76', gi: 0.30, night: 0.5 },
  { at: 0.90, top: '#6f669a', mid: '#e29f8d', bot: '#a97e78', hs: '#d4bfc2', hg: '#6f6872', hi: 0.88, sun: '#ffc6a4', si: 0.92, so: [10.5, 3.4, 2], fill: '#8b86ac', fi: 0.34, glow: '#ff9e76', gi: 0.30, night: 0.55 },
  { at: 1.00, top: '#322e50', mid: '#514360', bot: '#3c3550', hs: '#76709e', hg: '#37324a', hi: 0.66, sun: '#c9cdee', si: 0.55, so: [-5, 13, -7], fill: '#5c5a86', fi: 0.3, glow: '#8a78b0', gi: 0.14, night: 1 },
]

const SC5 = STOPS5.map((s) => ({
  at: s.at,
  top: new THREE.Color(s.top), mid: new THREE.Color(s.mid), bot: new THREE.Color(s.bot),
  hs: new THREE.Color(s.hs), hg: new THREE.Color(s.hg), hi: s.hi,
  sun: new THREE.Color(s.sun), si: s.si, so: new THREE.Vector3(...s.so),
  fill: new THREE.Color(s.fill), fi: s.fi,
  glow: new THREE.Color(s.glow), gi: s.gi, night: s.night,
}))

/** sampleSky over the V5 stop table (same lerp, no allocation). */
function sampleSky5(p: number, out: Sky): Sky {
  let a = SC5[0], b = SC5[SC5.length - 1]
  for (let i = 0; i < SC5.length - 1; i++) {
    if (p >= SC5[i].at && p <= SC5[i + 1].at) { a = SC5[i]; b = SC5[i + 1]; break }
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

/** Continuous index along the chain: nearest segment projection, 0 … N-1. */
export function pathProgress(p: THREE.Vector3) {
  let best = 0, bd = Infinity
  for (let i = 0; i < LAST; i++) {
    b.copy(ISLAND_POS[i + 1]).sub(ISLAND_POS[i])
    const t = Math.min(1, Math.max(0, q.copy(p).sub(ISLAND_POS[i]).dot(b) / b.lengthSq()))
    const d = a.copy(ISLAND_POS[i]).addScaledVector(b, t).distanceToSquared(p)
    if (d < bd) { bd = d; best = i + t }
  }
  return best
}

/** A handful of soft warm stars high in the dome — they fade in with the night. */
function Stars() {
  const mat = useRef<THREE.PointsMaterial>(null)
  const geo = useMemo(() => {
    const pts: number[] = []
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < 72; i++) {
      const az = rnd(i * 3 + 1) * Math.PI * 2, el = 0.05 + rnd(i * 3 + 2) * 0.4, r = 150
      pts.push(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    return g
  }, [])
  useFrame((s) => {
    const m = mat.current; if (!m) return
    m.opacity = Math.min(1, env.night * env.night * 1.1) * (0.8 + Math.sin(s.clock.elapsedTime * 0.7) * 0.08)
  })
  return (
    <points geometry={geo} renderOrder={-0.5}>
      <pointsMaterial ref={mat} color="#ffe9c4" size={2.4} sizeAttenuation transparent opacity={0} depthWrite={false} fog={false} />
    </points>
  )
}

export default function Sky5() {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const dome = useRef<THREE.ShaderMaterial>(null)
  const { scene, camera } = useThree()
  const cur = useRef<ReturnType<typeof makeSky> | null>(null)
  const fogNow = useRef<{ near: number; far: number } | null>(null)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const cIdx = pathProgress(player.pos)
    skyDebug.cIdx = cIdx; skyDebug.p = cIdx / LAST
    const idx = Math.min(LAST, Math.max(0, Math.round(cIdx)))
    useWorldUI.getState().setIdx(idx)
    const p = cIdx / LAST
    if (!cur.current) cur.current = sampleSky5(p, makeSky())
    const c = cur.current
    dampSky(c, sampleSky5(p, tmp), dt)
    env.night = c.night
    env.top.copy(c.top); env.mid.copy(c.mid); env.bot.copy(c.bot)
    driveLamps(c.night)

    const fin = cinematic.on
    // quick ramp: the finale must read clean from the first frames of the
    // pull-back, not halfway through it
    env.finale += ((fin ? 1 : 0) - env.finale) * (1 - Math.exp(-dt * 4))

    const camDist = camera.position.distanceTo(ISLAND_POS[idx])
    // V5's islands sit ~16 m apart (V4's were tighter): camDist+7/+34 fogged
    // the neighbour island into a milky ghost that overlapped the current one.
    // This island stays fully clear; the next reads as a crisp silhouette,
    // fog only claiming the far chain.
    const fogT = fin ? [90, 280] : [camDist + 11, camDist + 58]
    if (!fogNow.current) fogNow.current = { near: fogT[0], far: fogT[1] }
    const f = fogNow.current, ff = 1 - Math.exp(-dt * 3)
    f.near += (fogT[0] - f.near) * ff; f.far += (fogT[1] - f.far) * ff
    const fog = scene.fog as THREE.Fog | null
    if (fog) { fog.color.copy(c.mid).lerp(c.top, 0.35); fog.near = f.near; fog.far = f.far }
    const bg = scene.background as THREE.Color | null
    if (bg && bg.isColor) bg.copy(c.mid)

    if (dome.current) {
      dome.current.uniforms.top.value.copy(c.top)
      dome.current.uniforms.mid.value.copy(c.mid)
      // the finale camera looks down across the dome's below-horizon cap —
      // at night `bot` renders as one giant dark disc behind the title, so
      // dissolve it into the mid band as the pull-back opens
      dome.current.uniforms.bot.value.copy(c.bot).lerp(c.mid, env.finale * 0.92)
      dome.current.uniforms.glow.value.copy(c.glow)
      dome.current.uniforms.gi.value = c.gi
    }
    if (hemi.current) { hemi.current.color.copy(c.hs); hemi.current.groundColor.copy(c.hg); hemi.current.intensity = c.hi }
    if (fill.current) { fill.current.color.copy(c.fill); fill.current.intensity = c.fi }
    if (sun.current) {
      sun.current.color.copy(c.sun); sun.current.intensity = c.si
      const ic = ISLAND_POS[idx]
      sun.current.position.set(ic.x + c.so.x, ic.y + c.so.y, ic.z + c.so.z)
      sun.current.target.position.copy(ic); sun.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff3e0', '#b7a086', 1.1]} />
      <directionalLight ref={sun} intensity={1.9} color="#ffe2b6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-far={60} />
      <directionalLight ref={fill} position={[-7, 5, -6]} intensity={0.4} color="#dfe9e4" />
      <mesh renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[220, 32, 20]} />
        <shaderMaterial ref={dome} side={THREE.BackSide} depthWrite={false} fog={false}
          uniforms={{
            top: { value: new THREE.Color('#bcd6da') },
            mid: { value: new THREE.Color('#efe2cb') },
            bot: { value: new THREE.Color('#dcc2a0') },
            glow: { value: new THREE.Color('#f9e3b4') },
            gi: { value: 0.12 },
          }}
          vertexShader={'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'}
          fragmentShader={
            'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 glow; uniform float gi;' +
            'void main(){ float h = normalize(vP).y;' +
            ' vec3 c = mix(bot, mid, smoothstep(-0.75, -0.4, h));' +
            // V4's band constants — the zenith colour covers the whole sky the
            // camera can see; mid/bot only hug the horizon and underworld.
            ' c = mix(c, top, smoothstep(-0.52, -0.22, h));' +
            ' c += glow * (gi * exp(-pow((h + 0.30) * 6.0, 2.0)));' +
            ' gl_FragColor = vec4(c, 1.0);' +
            '\n#include <colorspace_fragment>\n}'
          } />
      </mesh>
      <Stars />
    </>
  )
}
