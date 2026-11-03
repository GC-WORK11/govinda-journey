/**
 * Stylized sea far below the islands. A single large plane with a small custom
 * shader: two-tone water that brightens toward the horizon, a slow swell,
 * speckled foam drift, and a faint foam ring hugging the column under each
 * island (positions passed via `islands`). Fog is included so the surface
 * dissolves into the background like the sky behind the references.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from '../../world/sky'
import { V5_ORDER } from '../core'
import { IslandDressing5 } from './Dressing'

const RM =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

const MAX_ISLANDS = 16

const VERT = /* glsl */ `
#include <fog_pars_vertex>
uniform float uTime;
varying vec3 vW;
void main() {
  vec3 p = position;
  p.y += sin(p.x * 0.11 + uTime * 0.5) * 0.25 + sin(p.z * 0.13 + uTime * 0.38) * 0.22;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

const FRAG = /* glsl */ `
#include <fog_pars_fragment>
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform float uTime;
uniform vec4 uIslands[${MAX_ISLANDS}];
uniform int uIslandCount;
varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  // depth tone + slow drifting bands
  float band = noise(vW.xz * 0.05 + vec2(uTime * 0.02, -uTime * 0.015));
  vec3 c = mix(uDeep, uShallow, band * 0.65 + 0.2);
  // gentle swell shading
  float swell = sin(vW.x * 0.11 + uTime * 0.5) * 0.5 + sin(vW.z * 0.13 + uTime * 0.38) * 0.5;
  c += swell * 0.02;
  // drifting foam speckle
  float f = noise(vW.xz * 0.55 + vec2(uTime * 0.05, uTime * 0.03));
  f += noise(vW.xz * 1.6 - vec2(uTime * 0.04, uTime * 0.06)) * 0.5;
  float foam = smoothstep(1.05, 1.35, f) * 0.55;
  // foam ring under each island
  for (int i = 0; i < ${MAX_ISLANDS}; i++) {
    if (i >= uIslandCount) break;
    float d = distance(vW.xz, uIslands[i].xy);
    float ring = exp(-pow((d - uIslands[i].z) / 1.6, 2.0));
    foam += ring * (0.35 + 0.1 * sin(uTime * 0.6 + d * 2.0));
  }
  c = mix(c, uFoam, clamp(foam, 0.0, 0.85));
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}
`

export function Water({
  y = -12,
  size = 420,
  islands = [],
  deep = '#6fa8b8',
  shallow = '#9fd0d8',
  foam = '#f4fbf9',
}: {
  y?: number
  size?: number
  /** island [x, z, foamRingRadius] triples, world coords */
  islands?: [number, number, number][]
  deep?: string
  shallow?: string
  foam?: string
}) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(
    () => new THREE.PlaneGeometry(size, size, 96, 96).rotateX(-Math.PI / 2),
    [size],
  )
  const uniforms = useMemo(() => {
    const arr = Array.from({ length: MAX_ISLANDS }, () => new THREE.Vector4())
    islands.slice(0, MAX_ISLANDS).forEach(([x, z, r], i) => arr[i].set(x, z, r, 0))
    return THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(deep) },
        uShallow: { value: new THREE.Color(shallow) },
        uFoam: { value: new THREE.Color(foam) },
        uIslands: { value: arr },
        uIslandCount: { value: Math.min(islands.length, MAX_ISLANDS) },
      },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, islands.length])
  // V4 has no water plane — at dusk/night and especially in the finale pull-back
  // a fixed teal sheet reads as a huge dark disc under the title, so the palette
  // dissolves toward the fog/sky colour: a hazy void instead of a hard sea.
  const base = useMemo(
    () => ({
      deep: new THREE.Color(deep),
      shallow: new THREE.Color(shallow),
      foam: new THREE.Color(foam),
    }),
    [deep, shallow, foam],
  )
  const fade = useRef(0)
  useFrame((s, dt) => {
    if (!mat.current) return
    if (!RM) mat.current.uniforms.uTime.value = s.clock.elapsedTime
    const target = Math.max(env.finale, env.night * 0.6)
    fade.current += (target - fade.current) * (1 - Math.exp(-dt * 2))
    const u = mat.current.uniforms, f = fade.current
    ;(u.uDeep.value as THREE.Color).copy(base.deep).lerp(env.mid, f)
    ;(u.uShallow.value as THREE.Color).copy(base.shallow).lerp(env.mid, f)
    ;(u.uFoam.value as THREE.Color).copy(base.foam).lerp(env.mid, f)
  })
  return (
    <>
      <mesh geometry={geo} position={[0, y, 0]} frustumCulled={false}>
        <shaderMaterial
          ref={mat}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          fog
        />
      </mesh>
      {/* WORLD only mounts ArtWater from this module — the per-island V4-density
          dressing rides along here (world-space groups, one per island). */}
      {V5_ORDER.map((id) => (
        <IslandDressing5 key={id} id={id} />
      ))}
    </>
  )
}
