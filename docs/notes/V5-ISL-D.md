# V5-ISL-D — L04 Alive + I02 On the road

Status: both obstacles built against `src/v5/core.ts` (contract), committed. `tsc` clean for my files.

## What was built

**L04** (`src/levels/L04/Obstacle.tsx`, `shared.v5.tsx`, `street.v5.tsx`)
- A collapsed street cuts the island across z∈[0.55,-2.75] (asphalt slab, kerb chunks,
  debris — one merged vertex-coloured mesh). Standing on the street bed >0.6 s crumbles it
  (jagged crack blooms under the player, dust puffs, quick blink) and teleports back to the
  street mouth = "fall → respawn" without needing the PLAYER respawn path.
- 6 raised safe stones (walkable) zig-zag across; 5 lookalike decoy stones shake 0.5 s then
  tip and sink, respawning after ~5 s.
- Sensor post near the street mouth: E to power (requires `has('power')`; without it the post
  just shakes). First power fires a free teaching pulse. Then a `pulse` interactable follows
  the player (E / use button): expanding soft ring, safe stones glow warm for 4 s, small
  "AQI nnn" tags surface on 4 kerbside readers. Smog planes dip as the ring passes.
- Far lattice tower: power it → smog fades outward from the tower, lamp + windows warm →
  `complete()` (grants `sense`).
- Smog = ~24 soft canvas-texture planes (dense bed in the street + thin high haze), own
  materials, unmounted when `done`.
- Delhi dressing: 3 rooftop houses (water tank, stair bulkhead, clothesline), municipal lamp,
  street trees, cable span, pots. Chunky props register ghost blockers.

**I02** (`src/levels/I02/Obstacle.tsx`, `station.v5.tsx`)
- Platform (walkable slab), nameboard, bench, luggage, churn, tea stall, platform lamp.
- Floating rail causeway behind the island's right shoulder (x≥2.2, y≈-0.55 — kept clear of
  the exit-bridge corridor); stone ribbon, twin rails, sleepers, hanging pylons.
- Little train (loco + 2 cream cars) crosses every 22 s over ~8 s with a soft steam wisp.
- `complete()` fires when the player reaches the exit half (local z < -1.15); lamp warms first.
- A siding (stub track + buffer stop) on the island rim points at the causeway.

## For other areas

- **WORLD**: solvers merge into `window.__journey.solve = {…, L04|I02}` on mount. Solvers
  teleport via `__journey.player.teleport` if present else write `core.player.pos` (same
  convention as ISL-A). `localToWorld` on the obstacle root gives world coords.
- **PLAYER**: `tpLocal` writes `player.pos` + zeroes vel as a fallback — if your controller
  owns position internally, `__journey.player.teleport` must exist (it's in your brief).
  My crumble→respawn uses the teleport hook first, pos-write fallback.
- **ART**: I use V4 `clay()/C` and hand-built props in `street.v5.tsx` / `station.v5.tsx`
  (marked swap points). If `src/v5/art/Dressing` lands with good prop coverage I'll swap
  houses/tree/lamp/train for `PROPS` entries. L04's smog planes use `MeshBasicMaterial`
  (unlit haze) — fine as-is; feel free to critique.
- **ART/WORLD**: if `IslandBase` ever supports a trench/hole variant, L04's street could
  become a real pit; for now it's an enclosed-looking bed + crumble logic so nothing is
  needed. Not a request — current approach is self-sufficient.
- Carry/anchor not needed by either island.

## Rough edges / TODO

- Visual pass pending — `?v5` route doesn't exist yet (WORLD in flight). Will liveshot both
  islands at 1440×900 + 390×844 once it lands and iterate.
- The pulse interactable is `at=player.pos` (radius 1.0) so E anywhere on the island pulses;
  it's disabled within 2.1 of the tower so the tower prompt wins there.
