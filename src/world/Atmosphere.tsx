/**
 * Everything the light touches: sky dome, stars, sun/fill/hemisphere, fog and the
 * background colour — all driven from one damped `Sky` sampled at journey progress
 * (islands 0–3 day, 4–6 golden hour, 7–9 dusk, the finale a warm indigo night).
 * Fog also isolates the current island: neighbours stay soft silhouettes until you
 * walk to them, then during the intro dive and the finale pull-back it opens up.
 * Also writes env.night and pushes it into the shared lantern materials.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LEVELS } from '../levels/registry'
import { useJourney } from '../state/store'
import { CENTERS } from './layout'
import { env, makeSky, sampleSky, dampSky } from './sky'
import { driveLamps } from './Lanterns'

const LAST = LEVELS.length - 1
const tmp = makeSky()

/** A handful of soft warm stars high in the dome — they fade in with the night. */
function Stars() {
  const mat = useRef<THREE.PointsMaterial>(null)
  const geo = useMemo(() => {
    const pts: number[] = []
    const rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < 64; i++) {
      // low elevations: the camera looks slightly down, the visible sky band sits near the horizon
      const az = rnd(i * 3 + 1) * Math.PI * 2, el = 0.04 + rnd(i * 3 + 2) * 0.38, r = 104
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
      <pointsMaterial ref={mat} color="#ffe9c4" size={2.1} sizeAttenuation transparent opacity={0} depthWrite={false} fog={false} />
    </points>
  )
}

export default function Atmosphere() {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const dome = useRef<THREE.ShaderMaterial>(null)
  const { scene, camera } = useThree()
  const cur = useRef<ReturnType<typeof makeSky> | null>(null)
  const fogNow = useRef<{ near: number; far: number } | null>(null)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const st = useJourney.getState()
    const p = st.target / LAST // target leads while walking, so the light changes as you cross
    // first frame: start exactly on this island's sky so qa jumps / reloads never fade or flash
    if (!cur.current) cur.current = sampleSky(p, makeSky())
    const c = cur.current
    dampSky(c, sampleSky(p, tmp), dt)
    env.night = c.night
    driveLamps(c.night)

    const finale = st.phase === 'arrived' && st.current === LAST && st.solved.includes(LEVELS[LAST].id)
    // fog rides just past the camera: this island clear, the next a soft silhouette,
    // the one after lost in haze — in the finale pull-back it opens up for the vista
    const camDist = camera.position.distanceTo(CENTERS[st.target])
    const fogT = finale ? [58, 170] : [camDist + 3, camDist + 21]
    if (!fogNow.current) fogNow.current = { near: fogT[0], far: fogT[1] }
    const f = fogNow.current, ff = 1 - Math.exp(-dt * 3)
    f.near += (fogT[0] - f.near) * ff; f.far += (fogT[1] - f.far) * ff
    const fog = scene.fog as THREE.Fog | null
    if (fog) { fog.color.copy(c.mid); fog.near = f.near; fog.far = f.far }
    const bg = scene.background as THREE.Color | null
    if (bg && bg.isColor) bg.copy(c.mid)

    if (dome.current) {
      dome.current.uniforms.top.value.copy(c.top)
      dome.current.uniforms.mid.value.copy(c.mid)
      dome.current.uniforms.bot.value.copy(c.bot)
    }
    if (hemi.current) { hemi.current.color.copy(c.hs); hemi.current.groundColor.copy(c.hg); hemi.current.intensity = c.hi }
    if (fill.current) { fill.current.color.copy(c.fill); fill.current.intensity = c.fi }
    if (sun.current) {
      sun.current.color.copy(c.sun); sun.current.intensity = c.si
      const ic = CENTERS[st.current]
      sun.current.position.set(ic.x + c.so.x, ic.y + c.so.y, ic.z + c.so.z)
      sun.current.target.position.copy(ic); sun.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff3e0', '#b7a086', 1.1]} />
      <directionalLight ref={sun} intensity={1.9} color="#ffe2b6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-far={40} />
      <directionalLight ref={fill} position={[-7, 5, -6]} intensity={0.4} color="#dfe9e4" />
      <mesh renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[120, 32, 20]} />
        <shaderMaterial ref={dome} side={THREE.BackSide} depthWrite={false} fog={false}
          uniforms={{
            top: { value: new THREE.Color('#bcd6da') },
            mid: { value: new THREE.Color('#efe2cb') },
            bot: { value: new THREE.Color('#dcc2a0') },
          }}
          vertexShader={'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'}
          fragmentShader={
            'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;' +
            'void main(){ float h = normalize(vP).y;' +
            ' vec3 c = mix(bot, mid, smoothstep(-0.75, -0.4, h));' +
            ' c = mix(c, top, smoothstep(-0.52, -0.22, h));' +
            ' gl_FragColor = vec4(c, 1.0);' +
            '\n#include <colorspace_fragment>\n}'
          } />
      </mesh>
      <Stars />
    </>
  )
}
