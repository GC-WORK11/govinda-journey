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
import { env, makeSky, sampleSky, dampSky } from '../../world/sky'
import { driveLamps } from '../../world/Lanterns'
import { useWorldUI } from './progress'

const N = V5_ORDER.length
const LAST = N - 1
const tmp = makeSky()
const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3()
export const skyDebug = { cIdx: 0, p: 0 }

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
    if (!cur.current) cur.current = sampleSky(p, makeSky())
    const c = cur.current
    dampSky(c, sampleSky(p, tmp), dt)
    env.night = c.night
    env.top.copy(c.top); env.mid.copy(c.mid); env.bot.copy(c.bot)
    driveLamps(c.night)

    const fin = cinematic.on
    env.finale += ((fin ? 1 : 0) - env.finale) * (1 - Math.exp(-dt * 1.8))

    const camDist = camera.position.distanceTo(ISLAND_POS[idx])
    const fogT = fin ? [90, 280] : [camDist + 7, camDist + 34]
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
      dome.current.uniforms.bot.value.copy(c.bot)
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
            // V5's camera rides lower than V4's — carry the warm mid band up
            // through eye level so the horizon keeps its soft gradient.
            ' c = mix(c, top, smoothstep(-0.34, 0.10, h));' +
            ' c += glow * (gi * exp(-pow((h + 0.16) * 5.0, 2.0)));' +
            ' gl_FragColor = vec4(c, 1.0);' +
            '\n#include <colorspace_fragment>\n}'
          } />
      </mesh>
      <Stars />
    </>
  )
}
