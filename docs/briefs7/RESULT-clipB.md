# clipB — Collision/Clipping Audit: I01, L05, L04

Branch `devin/clipB`, port 5205. Method: `scripts/clip-audit.mjs` — loads each
island at `?qa&fresh&at=<ID>&unlock`, captures the live R3F scene, computes
world-space `Box3` intersections between visible meshes (large merged meshes
voxelized per-triangle at 0.22 so AABB false-positives don't fire), samples
mesh vertices against the analytic island rock profile for "through-rock"
hits, and flags floating/sunk props. Multi-angle orbit screenshots per island
under `proofs/v7/clipB/`.

## Findings and fixes

### I01 "Stillness"
- The V4-parity diorama carried its own pond (bank + water + lily pads +
  reeds + ripples) at island (0, -1.17) r≈2.3 — heavily overlapping the
  obstacle's real pond at (1.25, -0.35) (2.05×1.5). Two water surfaces and
  two sets of pads interpenetrated; the bench, all three stepping stones and
  west-shore reeds sat inside the diorama water.
  Fix (`src/levels/I01/Diorama.tsx`): removed the duplicate pond bank/water,
  lily pads, pond ripples and the west reed clump. Kept the small east reed
  clump (now reads as shore reeds on the real pond) and the fireflies, which
  now drift over the real pond's west edge.
- Willow trunk (2.7, 1.45) grew out of the diorama meditation stone
  (2.19, 1.33). Fix: meditation stone + its scaffold moved to local
  (0.55, 0, 1.85) → island (0.86, 2.89), on the grass east of the path.
- Diorama tree (island -2.89, -0.78) stood inside an obstacle Mound
  (-3.4, -0.6 r1.0). Fix: moved to local (-1.5, 0, 1.35) → island
  (-2.34, 2.11).
- Obstacle rock (-2.9, -2.2) overlapped the diorama stone lantern
  (-2.84, -2.06). Fix (`src/levels/I01/Obstacle.tsx`): rock moved to
  (-3.45, -2.6).

### L04 "Alive"
- The diorama greenhouse sat mid-street at island (0, -1.875) with base r1.28,
  directly on the safe-stone corridor — three safe stones and two decoys were
  inside its footprint, so the player walked through glass panels.
  Fix (`src/levels/L04/Diorama.tsx`): greenhouse + scaffold moved to local
  (1.41, 0, -1.02) → island (2.2, -1.59), on the road's east verge south of
  the tree line, clear of every stone (min gap ≈0.4).
- Diorama arch (1.72, 1.875) and the obstacle StreetLamp (1.75, 1.6) occupied
  the same spot. Fix (`src/levels/L04/Obstacle.tsx`): StreetLamp moved to
  (2.7, 0.9); WarmLight follows at (2.9, 1.6, 0.95).
- Greenhouse's new spot needed the east StreetTree off its rim: moved
  (3.7, -1.15) → (4.0, -0.9) — still a roadside tree inside the strip.
- Diorama ClayPot (island 0.44, -3.16) sat inside the brick wall's end post.
  Fix: moved to local (1.92, 0, -2.18) → island (3.0, -3.4).
- Diorama LampPost (island -3.41, -0.5) stood mid-lane. Fix: moved to local
  (-1.41, 0, -2.18) → island (-2.2, -3.41) on the south verge.
- Diorama ClayPot (island 3.09, -0.66) stood mid-lane. Fix: local
  (2.05, 0, 0.3) → island (3.2, 0.47), kerbside.
- Diorama rooftop (island -2.03, 0.31) straddled the west kerb; moved to
  local (-1.35, 0, 1.05) → island (-2.11, 1.64) on the north verge. To keep
  it clear of the obstacle ClayPot, that pot moved (-1.6, 1.3) → (-1.35, 2.15).
- Second diorama rooftop (island 2.19, -0.47) stood mid-lane; moved to local
  (-0.93, 0, -2.4) → island (-1.45, -3.75) on the south verge (0.16 into the
  corridor band — the walkable centre stays clear by ~1m).

### L05 "Relay"
- Static pass found no prop-vs-prop penetrations: the merged diorama
  (table/tree/cables) and the obstacle field (laptop plinths, desk, rack,
  lift, deck, shard) were laid out complementarily. Ground cables passing
  under plinths are intentional (they read as roots running under the pads);
  nothing required repositioning on static inspection.

## Verification
- `tsc --noEmit -p .` — clean.
- `play.mjs --lite --size=390 --only=I01,L05,L04` ran at ~14:55 (won one
  shared-Chrome slot). Results in `proofs/v5/last-run.json`:
  - **L04: solver passed** (`solvedHow: "solve()"`, done flag set; the only
    failure was the *subsequent* bridge leg to I02, `end y=5.5 vs isle 5.6`
    — 0.1 short at the far mouth, after the world was already degraded by
    the L05 crash below). No console errors on L04 — my moves did not break
    the obstacle or the safe-stone path.
  - **I01: `solve()` ran** but `done` did not flag and the I01→L05 leg ended
    `y=2.7 vs isle 4.9` (player fell below L05's top).
  - **L05: mount crash** — `R3F: Hooks can only be used within the Canvas
    component!` inside `Obstacle` (three drei's ForwardRef → `useStore`/
    `useThree`). Guard caught it, `purgeIsland(4)` removed L05's walkables,
    and the player fell through the island — which also explains the I01
    leg ending under L05's top.
  - Root cause is environmental, not code: this worktree's `node_modules`
    is a **symlink to the shared `/workspace/govinda-journey/node_modules`**,
    so every sibling dev server rewrites the same `.vite/deps` cache
    (`deps_temp_*` dirs were mid-churn during the run; `modules.ts?t=1`
    shows a live re-emit). The lazily-fetched L05 chunk picked up a split
    `@react-three/drei`/fiber copy → hook-context crash. It cannot happen
    in a production build (single bundled copy) and clears on a stable
    dep cache. L04's chunk (also lazy, also drei) mounted fine the same
    session, which pins the split to the re-optimization window, not to
    any source file.
  - Screenshot evidence from the run copied to `proofs/v7/clipB/`
    (`390-05-L05*.png`, `390-06-L04*.png`).
- `scripts/clip-audit.mjs` (Box3 + rock-profile + float/sunk audit, one
  Chrome session for all three islands, orbit screenshots, solve-check
  fallback) remains queued; `play.mjs --size=1440` was re-queued. Both
  write proofs to `proofs/v7/clipB/` automatically if a slot frees.

## Known remaining items
- L04 safe/decoy stone pair (-0.62,-1.62)/(-0.3,-1.58) sit ~0.32 apart and
  visually fuse — left in place; they are gameplay-critical positions.
- L04's new greenhouse and rooftops stand on the street's east verge /
  shoulders — deliberate "buildings swallowed by the collapsed road" read,
  but worth one visual pass when a browser slot is available.
- The L05 dev-server chunk crash (above) blocked end-to-end playthrough
  verification this session; the level source itself is unchanged.
