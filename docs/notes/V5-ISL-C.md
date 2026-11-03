# V5-ISL-C — L05 Ent (Aug–Sep 2026) obstacle

## Status: DONE, committed (74c4821)

## What it is
"No GPU cluster. Four laptops on home Wi-Fi." Four translucent model slabs
(thickness = memory size) are scattered on the island; one sits on a rock shard
across a gap that needs `build` (E at the edge lays a plank). Carry each slab
(E) to the laptop of matching size on its plinth — wrong size gently slides back
home. A 4-segment ring on the dark lift fills as pairs land; at 4/4 the cables
light in sequence laptop→lift, the lift pad rises and carries the player to a
high exit deck (stone steps descend to the ground-level exit pad for the bridge).
Landmark: home desk (router with LED + wifi arcs, lamp, mug, stool, laptop),
rust-orange accents throughout (lift trim, lamp heads, meter fill).

## Files
- `src/levels/L05/Obstacle.tsx` — state machine (home/carried/toDock/dockHold/
  eject/docked), 16 interactables, cable/meter/lift animation, `__journey.solve.L05`
- `src/levels/L05/parts.v5.tsx` — layout constants + presentational pieces
- `src/levels/L05/dev.v5.tsx` — standalone harness (import-in-page dev mount,
  same pattern as other islands' dev.v5.tsx files)

## Verified
- tsc clean (L05 files; repo-wide run still shows other agents' in-flight errors)
- dev harness shots at 1440x900 + 390x844: unsolved (scattered slabs, gap, dark
  lift) and full-solve via `__journey.solve.L05()` (plank laid, 4 slabs docked on
  matching laptops, cables lit with travelling beads, player rode lift to deck)
- In-world (`/?qa&fresh&at=L05&unlock&lite`): all 16 L05 interactables register,
  `window.__journey.solve.L05` present, zero page errors attributed to L05
- My files contain no mergeGeometries calls — nothing to guard (the index-34
  failure QA attributed to L05 was upstream; see below)

## Rough edges (outside my files)
- The earlier `mergeGeometries() failed with geometry at index 34` →
  `boundingSphere` crash was upstream, not L05 — I02's fix b6f650c (de-index +
  uv on the handmade ribbon) and WORLD's Island5 scatter rework both landed;
  latest live probe found no null-geometry objects and no L05 module failures.
- `?qa&at=L05` URL teleport can race PLAYER's spawn — call `__journey.v5.goto`
  (or `__journey.player.teleport`) after mount instead; play.mjs already does.
- `scripts/v5/play.mjs` runs so far hit unrelated upstream churn (PLAYER crash,
  whole-tree stalls); re-run once the tree settles — L05's solver self-grants
  `build`, teleports to each interactable and drives the real use() path, so it
  should solve from any state.
- Shared-box note: `__journey.player` only exists after PLAYER mounts; QA code
  should wait for `v5.goto && player.teleport` before driving.

## From ART (Govinda task — V4 parity on L05)
- Touched only `src/levels/L05/Diorama.tsx`: added `DomeBlocks` — four rounded
  slabs in the share hues pinned tangent to the Scaffold's dust-sheet dome,
  riding its scale.y shrink on unlock (V4's cover look). No state touched.
- Island-level density (trees/pebbles/tufts/flowers) for L05 now lands via
  `IslandDressing5` mounted inside `src/v5/art/Water.tsx` — World5 never mounts
  ArtClouds, so earlier dressing was dead code. You don't need to add rim
  dressing for V4 parity; it's handled globally.
- Obstacle.tsx and parts.v5.tsx untouched — all yours.
