# RESULT — light (CHARACTER LIGHTING)

## What changed

- `src/v5/world/CharLight.tsx` (new): a small warm point light ("carried
  lantern") that follows `core.player.pos` every frame. It hovers ~2.05 m
  above the feet and ~1.15 m toward the camera so the camera-facing side of
  the traveller is always lit. Intensity = `0.4 + env.night * 3.6` (barely
  visible by day, a lantern glow after dark). `distance=6.5`, `decay=2`,
  no shadow casting — it fills exactly where the sun shadow would crush.
- `src/v5/World5.tsx`: import + mount `<CharLight />` inside the Canvas
  (Player.tsx untouched — owned by the char session).

## Why

Sun (`so [-5,13,-7]`) and fill (`[-7,5,-6]`) both sit on the far side of the
path at dusk/night; the follow camera orbits the near side, so the
character's visible side was lit only by the hemisphere term and crushed to
black under ACES at L09 (also dim at dusk L06–L08). Fog starts at
`camDist + 11` so fog never touches the character — light, not fog or
exposure, was the crusher.

## Exposure / tone mapping

ACESFilmic kept; `toneMappingExposure` ramps `1.08 → 1.22` with `env.night`
(set each frame inside CharLight's `useFrame`) — a whisper of extra
exposure so the bottom of the night curve isn't crushed.

## Draw calls

One `pointLight`, no `castShadow`: +0 draw calls, +0 shadow passes
(`gl.info.render.calls` unaffected — lights aren't draw calls). Well inside
the +2 budget.

## Verified

- `tsc --noEmit -p .` — clean.
- `vite build` (flock, /tmp outDir) — clean, World5 chunk +0.0 kB meaningful.
- Follows every player state: walks (`player.pos` written per frame in
  Player.tsx:658), heli rides (`s.pos` mirrors `heli.seat`), FallbackRig
  (same `core.player.pos`), finale pull-back (light stays at the player).
- Frame ordering: `env.night` is written by Sky5's useFrame before
  CharLight's (mount order), so the intensity reads the current frame.
- Screenshots L01/L06/L09 × 1440/390-lite: shot script ready at
  /tmp/gj7-light-shots.mjs + proofs dir proofs/v7/light/ — the shared-box
  Chrome lock was saturated by other sessions for the entire session
  window; run landed zero slots before deadline. Images pending a free slot.

## Session notes

- `vite.light.config.ts` (untracked helper): identical config + private
  `cacheDir` (`/tmp/gj7-light-vite-cache`). The shared `node_modules/.vite`
  dep cache is rebuilt by every session's dev server; collisions served
  duplicate `@react-three/fiber` instances →
  "R3F: Hooks can only be used within the Canvas component" crash with zero
  code changes. Private cacheDir fixes it; other sessions may want the same.
- Dev-mode page boots take >30 s under box load (hundreds of ESM modules);
  verification used a production build + `vite preview` on :5202.

## Still wrong / open

- Visual pass pending a Chrome slot: if the night key reads too strong/flat,
  drop `n * 3.6` toward `3.0`; if the ground pool reads as a spotlight,
  shrink `distance` toward 5.
