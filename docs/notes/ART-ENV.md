# ART-ENV — sky, clouds, depth

Files: `src/world/sky.ts`, `src/world/Atmosphere.tsx`, `src/world/Clouds.tsx` (new),
plus one surgical edit in `src/world/World.tsx` (inline `Clouds` extracted to the new file).

## What changed
- **sky.ts**: retuned stops — golden hour now has a lavender zenith over a peach
  horizon (was monochrome salmon); dusk light is de-redded (cooler hemisphere/sun,
  stronger cool fill) so L08 grass stays green instead of red-brown; night deepened
  to a warm indigo. Added per-stop `glow`/`gi` (horizon glow colour + strength) and
  `env` now carries `finale` + the damped `top/mid/bot` colours for cloud tinting.
- **Atmosphere.tsx**: fog colour lerps 35% toward the zenith colour (distant islands
  read hazier/bluer — aerial perspective); dome shader gained a soft horizon-glow
  band; writes `env.finale` (damped) each frame.
- **Clouds.tsx**: replaces the lumpy grey blobs — 9 broad flattened sea slabs under
  the islands + 9 side-lane puffs, all tinted from the damped sky (cream day →
  indigo night, never grey). Puffs sink out of frame during the finale pull-back
  (fixes the big grey mass mid-frame). A faint V of 5 distant birds glides on a
  slow loop by day and fades by dusk. Reduced-motion respected.
- Lanterns untouched (the night look already worked).

## Verified
- `tsc --noEmit -p .` clean.
- `level-check L01` PASS (WON desktop + mobile, 0 console problems); island shot
  shows softer clouds and gentle gradient. L05/L08/L09 checks not yet re-run —
  stopped early per coordinator request. Remaining risk: dusk re-tune and the
  finale puff-sink are unverified in headless shots; worth one `level-check L08`
  + `L09` on the next pass.
