# RESULT — perfA (draw calls)

## What changed

- **`src/v5/world/AutoMerge.tsx` rebuilt as a re-baking merger.** It now polls the
  wrapped subtree's eligible mesh count (~every 0.4 s) and re-bakes whenever it
  changes, so async GLB props (`Prop` loads via Suspense) and conditional props
  (crate, pegs, pond stones) get folded in after mount instead of being missed by
  the old one-shot `useLayoutEffect` bake. It buckets by material, preserves
  position/normal/color/uv, fills missing color/uv so `mergeGeometries` never
  drops a mesh, and skips skinned/instanced/transparent/invisible/`noMerge`
  meshes. Originals stay mounted but `visible=false`, so walkable/blocker
  raycasts and `purgeCorridors` bounds are untouched; generated meshes have a
  no-op raycast. New `<NoMerge>` marks animated/interactive subtrees (gate
  leaves, willow canopy, bell, door hinge, crank wheel, sliding doors, carriage,
  vane) so a wide AutoMerge never freezes them.
- **Wrapped static dressing across the targets:** L01 (campus, desk, wall,
  props, bloom field), L02 (ledge, stream, rocks, steps spur, fences, gate-line,
  loose letters, pond stones), L06 (all ART props; whole house/tower diorama),
  L07 (hut, table, mic, planting), L09 (wall, porch, schoolhouse body, crank
  base, door stone, chalkboard, gate, rim props + whole school diorama), I01
  (pond, bench, willow trunk, reeds, tufts, rocks, mounds + full diorama), I02
  (track, siding, platform, bench, stall, trees, pots + station diorama), L03
  (floating platforms, stone lanterns), L04 (AQI posts, relay tower body), L08
  (gate stones). Island5/Bridge5 need nothing — base scatter, gate leaf, rails,
  deck and lantern groups were already baked to 1–3 draws each.
- **Fewer shadow casters:** `Prop` now only casts shadows when its effective
  (fit×scale) height or footprint reaches 0.9 m — trees, streetlights, the water
  tower and fences still cast; books, bushes, boxes, flowers no longer do
  (`src/v5/art/Dressing.tsx`). `castShadow` also dropped on small animated
  meshes that live outside merges: L02 stone steps + paper letters, L04
  stepping stones, L07 word chips (`src/levels/L01/shared.v5.tsx`,
  `L02/L04/L07 Obstacle.tsx`). Inside merges, a whole material bucket already
  collapses to a single shadow-map draw.

## Measured draw calls — production build, `?v5&qa&fresh&at=<id>&unlock`,
`__journey.v5.stats()` (=`renderer.info.render.calls`), 1440×900, SwiftShader,
sampled after settle (max of 5 frames). Numbers count the whole frame: the
island underfoot plus the i±1 mount window, bridges, gates, sky and player.

| level | before (task est.) | after (measured) |
|-------|--------------------|------------------|
| L01   | ~250               | 124              |
| L02   | ~300               | 217              |
| L03   | ~300               | 243              |
| I01   | ~300               | 145              |
| L05   | ~280               | 247              |
| L04   | ~370               | 290              |
| I02   | ~280               | 163              |
| L06   | ~250               | 95               |
| L07   | ~260               | 197              |
| L08   | ~280               | 269              |
| L09   | ~280               | 125              |

(Baseline numbers measured from the pre-change commit `8208028` land in this
table if the shared Chrome slot frees up; the ~250–370 band is the sprint
brief's own estimate and matches V6's recorded 480→374 for L04.)

## Files touched

`src/v5/world/AutoMerge.tsx`, `src/v5/art/Dressing.tsx`,
`src/levels/{L01,L02,L03,L04,L06,L07,L08,L09,I01,I02}/{Obstacle,Diorama}.tsx`
(L08 Diorama already had it), `src/levels/L01/campus.v5.tsx`,
`src/levels/L01/shared.v5.tsx` (Gate posts/threshold merge, NoMerge leaves,
PaperLetter shadow), `src/levels/L04/street.v5.tsx`,
`src/levels/L09/school.v5.tsx`.

## Verification

- `tsc --noEmit`: clean.
- `vite build` (flock, /tmp/gj7-perfA-dist): clean.
- `scripts/v5/play.mjs` at 1440 and 390 `--lite` for all touched levels:
  results pending — see notes.
- Raycasts/colliders preserved by design: originals stay in the scene hidden;
  merged copies disable raycast. Animated/dynamic content kept out via
  `<NoMerge>` (willow canopy, gate leaves, bell, hinge door, crank wheel,
  sliding school doors, train, plank, fireflies, chips, stones, smog).

## Remaining issues / honest notes

- **Target not met everywhere.** L01 124, I01 145, L06 95, L09 125 are under
  150; L02 217, L03 243, L04 290, L05 247, L07 197, L08 269, I02 163 are still
  over. What's left is dominated by live gameplay meshes that must not be
  merged (L04's 24 animated smog planes, shaking stones, pulse rings; L05's
  laptops/chunks/lift; L08's guardian + board; L02's letters/steps; L07's
  chips), plus each view still renders two neighbouring islands' content.
- Next cheapest win: instancing L04 stones/L02 letters/L07 chips (same geo,
  per-instance colour) — still ~10-20 calls/level in animated gameplay meshes.
- `dpr=0.6` in samples: PerfGuard had already degraded pixel ratio under
  SwiftShader; calls are unaffected by dpr.
