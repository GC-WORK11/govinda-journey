/**
 * Shared stylized clay material for V5.
 *
 * `toon()` builds a MeshStandardMaterial whose fragment shader is patched via
 * onBeforeCompile:
 *  - wrapped diffuse: back-facing light bleeds a little around the terminator
 *    instead of going fully dark, the soft "clay" falloff from the references;
 *  - a gentle 3-band ramp on the irradiance (mixed, not hard-quantized, so the
 *    result reads handmade rather than cel-shaded);
 *  - a faint warm rim on grazing angles, modulated by the diffuse colour;
 *  - hemisphere / shadow-mapped light, shadows and fog keep working because
 *    only two lines are patched inside the standard shader.
 *
 * `applyToon(root)` re-skins a loaded GLB scene in place, keeping each mesh's
 * map / colour / vertex colours / transparency flags, so pack models pick up
 * the same wrap + rim while their textures still show through.
 */
import * as THREE from 'three'

export type ToonOpts = {
  /** 0..1: how much the diffuse terminator wraps into shadow (clay softness). */
  wrap?: number
  /** Ramp band count for the partial quantize (3 = soft 3-band). */
  steps?: number
  /** 0..1: blend toward the quantized ramp (1 = hard toon). */
  bandMix?: number
  /** Rim colour (default warm paper). */
  rimColor?: THREE.Color | string | number
  /** Rim strength. */
  rim?: number
  /** Rim exponent (higher = tighter edge). */
  rimPow?: number
}

const cache = new Map<string, THREE.MeshStandardMaterial>()

const DOT_NL = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );'
const OUTGOING = 'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;'

function injectToon(shader: THREE.WebGLProgramParametersWithUniforms, o: Required<ToonOpts>) {
  shader.uniforms.uToonWrap = { value: o.wrap }
  shader.uniforms.uToonSteps = { value: o.steps }
  shader.uniforms.uToonBandMix = { value: o.bandMix }
  shader.uniforms.uToonRimColor = { value: new THREE.Color(o.rimColor) }
  shader.uniforms.uToonRim = { value: o.rim }
  shader.uniforms.uToonRimPow = { value: o.rimPow }

  let frag = shader.fragmentShader
  frag = frag.replace(
    '#include <common>',
    `#include <common>
	uniform float uToonWrap;
	uniform float uToonSteps;
	uniform float uToonBandMix;
	uniform vec3 uToonRimColor;
	uniform float uToonRim;
	uniform float uToonRimPow;`,
  )
  const patched = frag.replace(
    DOT_NL,
    `float dotNL = dot( geometryNormal, directLight.direction );
	dotNL = saturate( ( dotNL + uToonWrap ) / ( 1.0 + uToonWrap ) );
	float toonBand = floor( dotNL * uToonSteps );
	float toonSoft = fract( dotNL * uToonSteps );
	dotNL = mix( dotNL, ( toonBand + smoothstep( 0.35, 0.65, toonSoft ) ) / uToonSteps, uToonBandMix );`,
  )
  frag = patched.replace(
    OUTGOING,
    `vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	float toonRimF = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), uToonRimPow );
	outgoingLight += uToonRimColor * uToonRim * toonRimF * diffuseColor.rgb;`,
  )
  shader.fragmentShader = frag
}

const DEFAULTS: Required<ToonOpts> = {
  wrap: 0.55,
  steps: 3.0,
  bandMix: 0.4,
  rimColor: '#fff2dd',
  rim: 0.22,
  rimPow: 3.0,
}

/**
 * Shared stylized clay material. Materials are cached per (params, opts) key so
 * every prop of the same look shares one program + uniform set.
 */
export function toon(
  params: THREE.MeshStandardMaterialParameters & ToonOpts = {},
): THREE.MeshStandardMaterial {
  const { wrap, steps, bandMix, rimColor, rim, rimPow, ...std } = params
  const o: Required<ToonOpts> = {
    wrap: wrap ?? DEFAULTS.wrap,
    steps: steps ?? DEFAULTS.steps,
    bandMix: bandMix ?? DEFAULTS.bandMix,
    rimColor: rimColor ?? DEFAULTS.rimColor,
    rim: rim ?? DEFAULTS.rim,
    rimPow: rimPow ?? DEFAULTS.rimPow,
  }
  const rimHex = new THREE.Color(o.rimColor).getHexString()
  const key = JSON.stringify([
    o.wrap, o.steps, o.bandMix, rimHex, o.rim, o.rimPow,
    std.color instanceof THREE.Color ? std.color.getHexString() : std.color,
    // cache per actual texture — two materials with different maps must not share
    (std.map as THREE.Texture | undefined)?.uuid ?? null,
    !!std.vertexColors, std.flatShading, std.transparent,
    std.opacity, std.side, std.alphaTest, std.emissive, !!std.emissiveMap, std.name,
  ])
  let m = cache.get(key)
  if (m) return m
  m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...std })
  m.onBeforeCompile = (shader) => injectToon(shader, o)
  // distinct program per option set
  m.customProgramCacheKey = () => `toon|${o.wrap}|${o.steps}|${o.bandMix}|${o.rim}|${o.rimPow}`
  cache.set(key, m)
  return m
}

/** Shared toon material for merged geometry that bakes colours as vertex colours. */
export function toonVC(opts: ToonOpts = {}) {
  return toon({ vertexColors: true, ...opts })
}

const MAT_KEYS = [
  'map', 'color', 'vertexColors', 'transparent', 'opacity', 'side',
  'alphaTest', 'depthWrite', 'emissive', 'emissiveIntensity', 'emissiveMap',
  'flatShading', 'visible', 'name', 'envMapIntensity', 'roughness', 'metalness',
] as const

/**
 * Pack palettes are colder than V4's clay set — remap the common material
 * names / source colours onto kit.tsx's C palette so dressed islands match
 * the handmade look. Name match wins; colour match catches unnamed variants.
 */
const RETINT_NAME: Record<string, string> = {
  grass: '#8fb36b', leafsGreen: '#8fb36b', leafsDark: '#6f9a55', leafsYellow: '#a7bd80',
  leafsOrange: '#d9825b', leafsRed: '#b5654a',
  stone: '#c9bfb0', stoneDark: '#a89e90',
  wood: '#c99c6e', woodDark: '#a87a52',
  woodBark: '#8f6a49', woodBarkDark: '#74513a', woodInner: '#e8d6b8',
  dirt: '#b48a63',
  colorRed: '#d97f6a', colorRedDark: '#b5654a', colorYellow: '#eec978',
  colorPurple: '#ad96d4', colorTan: '#d9b48a', colorWhite: '#fbf6ee',
  colorGreen: '#8fb36b', colorBlue: '#8fc1c9',
}
const RETINT_HEX: Record<string, string> = {
  '2cd8b8': '#8fb36b', '29c9ab': '#8fb36b', '2ba6aa': '#6f9a55',
  'b8e2e8': '#c9bfb0', '9ab5ba': '#a89e90',
  'ff8e62': '#c99c6e', 'c46d4b': '#a87a52',
  'e28357': '#b48a63', 'cc765e': '#74513a', 'f5d7bb': '#e8d6b8',
  'e04a50': '#d97f6a', 'c1363b': '#b5654a', 'feb147': '#eec978',
  '9f89ff': '#ad96d4', 'ffae6f': '#d9b48a',
}

/** Copy the look-relevant fields of a loaded material into a toon material. */
function convertMaterial(src: THREE.Material, opts: ToonOpts): THREE.MeshStandardMaterial {
  const s = src as THREE.MeshStandardMaterial
  const params: THREE.MeshStandardMaterialParameters = {}
  for (const k of MAT_KEYS) {
    const v = (s as unknown as Record<string, unknown>)[k]
    if (v !== undefined) (params as Record<string, unknown>)[k] = v
  }
  // pull cold pack colours onto the warm clay palette
  const named = RETINT_NAME[s.name]
  const hexed = s.color ? RETINT_HEX[s.color.getHexString()] : undefined
  const tint = named ?? hexed
  if (tint) params.color = new THREE.Color(tint)
  const m = toon({ ...params, ...opts })
  return m
}

/**
 * Re-skin every mesh in a loaded GLB scene with the shared toon material,
 * preserving each original material's map / colour / vertex colours.
 */
export function applyToon(root: THREE.Object3D, opts: ToonOpts = {}) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const src = mesh.material
    if (Array.isArray(src)) mesh.material = src.map((m) => convertMaterial(m, opts))
    else if (src) mesh.material = convertMaterial(src, opts)
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  return root
}
