import { EffectComposer, N8AO, SMAA, TiltShift2, Vignette, Bloom } from '@react-three/postprocessing'

/**
 * Premium tilt-shift finish. Only mounted when the GPU can afford it
 * (never in ?lite mode, and dropped if PerformanceMonitor declines).
 * Bloom's threshold sits past the sky/paper luminance so only true
 * emissives — lantern glass, the unlock flare — get a gentle halo.
 */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes quality="performance" intensity={2.2} aoRadius={1.7} distanceFalloff={0.9} color="#4a3a2a" />
      <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.18} intensity={0.45} />
      <TiltShift2 blur={0.55} taper={0.42} start={[0.15, 0.7]} end={[0.9, 0.4]} samples={16} />
      <Vignette offset={0.32} darkness={0.26} />
      <SMAA />
    </EffectComposer>
  )
}
