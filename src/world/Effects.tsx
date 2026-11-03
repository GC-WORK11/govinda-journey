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
      <N8AO halfRes quality="performance" intensity={1.7} aoRadius={1.3} distanceFalloff={1.0} color="#4a3a2a" />
      <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.45} />
      <TiltShift2 blur={0.15} taper={0.35} start={[0.15, 0.7]} end={[0.9, 0.4]} samples={10} />
      <Vignette offset={0.32} darkness={0.26} />
      <SMAA />
    </EffectComposer>
  )
}
