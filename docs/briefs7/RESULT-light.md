# RESULT — light (CHARACTER LIGHTING)

## What changed

- `src/v5/world/CharLight.tsx` (new): a small warm point light ("carried
  lantern") that follows `core.player.pos` every frame. It hovers ~2 m above
  and ~1.15 m toward the camera so the camera-facing side of the traveller is
  always lit. Intensity = `0.4 + env.night * 3.6` (barely visible by day, a
  lantern glow after dark). `distance=6.5`, `decay=2`, no shadow casting —
  fills exactly the area the sun shadow would crush.
- `src/v5/World5.tsx`: import + mount `<CharLight />` inside the Canvas
  (Player.tsx untouched — owned by the char session).
- `vite.light.config.ts` (untracked helper): identical config with a private
  `cacheDir` (`/tmp/gj7-light-vite-cache`) — the shared `node_modules/.vite`
  dep cache was being rebuilt by other sessions' dev servers, which served
  duplicate `@react-three/fiber` instances and crashed with
  "R3F: Hooks can only be used within the Canvas component".

## Why

Sun (`so [-5,13,-7]`) and fill (`[-7,5,-6]`) both sit on the far side of the
path at dusk/night; the camera orbits the near side, so the character's
visible side was lit only by the hemisphere term and crushed to black under
ACES at L09 (also dim at dusk L06–L08). Fog starts at `camDist + 11`, so fog
never touches the character — light, not fog/exposure, was the crusher.

## Exposure / tone mapping

ACESFilmic kept; `toneMappingExposure` ramps `1.08 → 1.22` with `env.night`
(set each frame from CharLight's `useFrame`) — a whisper of extra exposure so
the night scene bottom isn't crushed.

## Draw calls

Lights add 0 draw calls; no `castShadow` → no extra shadow pass.
Measured via `__journey.v5.stats()` — see table below (TODO: fill).

| level | size | calls before | calls after |
|---|---|---|---|
| L01 | 1440 | | |
| L06 | 1440 | | |
| L09 | 1440 | | |

## Verified

- Screenshots of the player at L01, L06, L09, desktop 1440 and 390 `?lite`
  (full frame + close-up crops): proofs/v7/light/*.png — TODO results.
- `tsc --noEmit -p .` clean.
- play.mjs smoke — TODO.

## Still wrong / notes

- (fill after verification)
