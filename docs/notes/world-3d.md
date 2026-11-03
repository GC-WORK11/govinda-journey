# world-3d — WORLD wow pass (agent note)

Owns `src/world/`. New files: `sky.ts` (time-of-day stops + `env.night`), `Atmosphere.tsx`
(sky dome, stars, sun/fill/hemi, fog+bg drive), `Lanterns.tsx` (shared lamp glass/halo materials,
island lantern posts, `bridgeLampSpots`). Edited: `World.tsx`, `Effects.tsx`, `kit.tsx`
(exported `bridgeParts`; `Bridge` now uses it — same visuals).

- Intro: camera holds ~0.9s above the cloud sea then descends to island 0 in ~3.7s; skipped when
  `started` persisted or `?qa&at=`; reduced-motion = instant. Camera snaps on first frame/teleports.
- Sky: progress p = target/(N-1) drives stops day→golden→dusk→night (sampled on `target` so light
  changes while crossing). Fog rides camera distance: neighbours are silhouettes; finale opens up.
- Lanterns: merged posts+glass+halo-points on every bridge post and on solved islands; one shared
  material pair driven by `env.night` (pale clay by day, warm glow at dusk/night, bloom picks it up).
- Bridge reveal: rails sweep out ~0.35s, planks drop staggered with squash, dust at ~1.45s; camera
  glances at the new island on `solved` growth while standing. Robust on early Walk on.
- Finale (arrived @ L09 solved): camera eases beyond the last island and looks back down the lit
  chain, gentle ±0.12 rad drift; composed to top-right of the story card. All dioramas stay mounted.
- Effects: added `Bloom` (mipmapBlur, threshold 1.0 → emissives only, intensity 0.45). Kept N8AO +
  TiltShift + Vignette + SMAA. `?lite`/decline path unchanged and verified.

Verified: `npx tsc -p . --noEmit` clean; `scripts/world-shots.mjs` (intro 1s/4s, `?qa&lite&at=L05`,
L09 finale, both viewports) — no console errors/warnings. 4 Chrome runs used (finale needed 3 angles).
Rough: Fraunces woff 404 seen once earlier (asset appeared later — gone); lantern PointLights toggle
`visible` at dusk — one possible shader recompile frame. Real fps unverifiable (SwiftShader).
