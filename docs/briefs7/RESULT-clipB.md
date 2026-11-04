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
  under plinths are intentional (they read as roots running under the pads).
- Verified in-browser by the audit run (results below); nothing required
  repositioning.

## Verification
- `tsc --noEmit -p .` — clean.
- Audit JSON: `proofs/v7/clipB/audit-{I01,L05,L04}[-done].json`
- Screenshots: `proofs/v7/clipB/<ID>-[a-f,top].png` (+ `<ID>-solved.png`)
- play.mjs — see notes below.

## Known remaining items
- L04 safe/decoy stone pair (-0.62,-1.62)/(-0.3,-1.58) sit ~0.32 apart and
  visually fuse — left in place; they are gameplay-critical positions.
- Chrome lock was heavily contended all sprint; each queued job raced for
  slots. Where a real `play.mjs` slot couldn't be won, the audit session's
  solve-check (real `goto` + `teleport` + the island's own `solve()` +
  `done` verification) covers passability as a fallback.
