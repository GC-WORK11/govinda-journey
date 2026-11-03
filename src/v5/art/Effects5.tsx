/**
 * V5 post-processing: N8AO for the clay contact shadows, a light bloom that
 * only catches true emissives (lanterns, lit screens), a soft vignette and
 * SMAA. No tilt-shift — the islands are big enough that it miniaturizes the
 * whole frame, and the references sell the look with AO + bloom instead.
 * Mount only when effects are enabled (never in ?lite — WORLD gates on that,
 * and this component returns null there too as a backstop).
 */
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'

const LITE =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('lite')

export function Effects5() {
  if (LITE) return null
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes quality="performance" intensity={1.7} aoRadius={1.3} distanceFalloff={1.0} color="#4a3a2a" />
      <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.45} />
      <Vignette offset={0.32} darkness={0.26} />
      <SMAA />
    </EffectComposer>
  )
}

export default Effects5
