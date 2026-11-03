# V5-ISL-D — L04 Alive + I02 On the road

Status: **done + verified integrated**. Both solvers complete their islands in the real
V5 world (`?qa&at=<ID>&unlock&fresh`, desktop 1440x900): L04 → `done` gains L04 +
`sense`; I02 → `done` gains I02, no ability (correct). Console clean — no merge or
boundingSphere errors. Mobile shot of I02 taken. `tsc` clean for my files.

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
- **ART/WORLD**: `IslandBase`'s grass cap is DOMED (topY, up to +0.06 at centre) — my
  `domeY` in `shared.v5.tsx` replicates it so PathStones and the L04 street slab
  (STREET_Y = 0.075, registered walkable — the player walks ON the asphalt) sit on/above
  the grass instead of sinking into it. If ART's cap curve ever changes, update `domeY`.
  L04's crumble zone (local.y < 0.12) still triggers on the 0.075 pad.
- **PLAYER** (`__journey.player.teleport` exists in Player.tsx — used; `core.player.pos`
  fallback kept for solo previews). `player.island` drives `active` via WORLD's idx.
- Carry/anchor not needed by either island.

## Verified (integrated world, withChrome shared slot)

- `L04` solve end-to-end: teleport to post → `post.use()` (powered) → `pulse.use()` →
  6 stone teleports → `tower.use()` → smog clears ~4.2 s → `complete()` → `sense` granted.
- `I02` solve end-to-end: teleport past z=-1.15 → lamp warms → `complete()`; no ability.
- Screenshots reviewed at 1440x900: L04 street + smog + rooftops + AQI posts + sensor
  hardware read clearly; I02 platform/board/bench/luggage/rails/train corridor read
  clearly, lamp warm after completion. One mobile (390x844) I02 shot.

## Rough edges / TODO

- **Root cause of the earlier "solver ran but island never completed" run**: I02's
  `useTrack` merged geometries with mismatched attributes — my custom stone ribbon had
  no `uv` and DodecahedronGeometry pylons are non-indexed while tubes/boxes are indexed —
  so `mergeGeometries()` returned `null` and the null-geometry mesh threw
  `boundingSphere` errors every frame, poisoning the shared R3F loop (every island's
  useFrame stalled → L04's `clearT` never advanced → `complete()` never fired).
  Fixed in `station.v5.tsx`: `push()` helper adds `uv` where missing and de-indexes
  with `toNonIndexed()` before merge. Commit `b6f650c`.
- `?qa&at=L04&unlock` grants `power` (L05 completes first in order) — verified by reading
  World5: `unlock` marks every island before `at` complete, so the power gate is satisfied.
  Solvers wait for `player.island === id` before teleporting (lazy mount + goto race).
- The pulse interactable is `at=player.pos` (radius 1.0) so E anywhere on the island pulses;
  it's disabled within 2.1 of the tower so the tower prompt wins there.
- Solo dev previews at src/levels/L04/dev.html (`?auto`, `?qa`, `?done`, `?power`) and
  src/levels/I02/dev.html — useful while iterating without the full world.
