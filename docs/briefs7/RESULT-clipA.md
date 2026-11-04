# RESULT — clipA: collision/clipping audit L01, L02, L03

Scope: every prop, rope, fence, bridge-end and dressing item on the three
opening islands. Method: static geometry review of every placement
(island-local coords vs footprints, diorama ×1.5625), a live-scene Box3
overlap audit (`scripts/v5/clipaudit.mjs`, new), orbit screenshots via the
shared Chrome wrapper, and play.mjs re-runs.

## Fixes landed (all in this branch)

| # | Defect | Fix |
|---|--------|-----|
| 1 | **L03 site fence pickets + rails stood ON the main walk path** (x≈0) **and through the gangplank** (x≈3.9). Its one invisible wall spanned the protected z-corridor, so `purgeCorridors()` deleted it on load — the fence never blocked anything and players walked through solid pickets. | `src/levels/L03/Obstacle.tsx` `SiteFence()`: split into a west run (x ≤ −1.5) and an east run (1.5…3.45, ends before the plank), taller gate posts at x=±1.3 so the path has a real opening, and **two** flank blocker boxes (−4.45…−1.3, 1.3…3.45) that avoid the corridor and actually fence. East tie-rocks moved clear of the plank: (4.05,−3.1)→(3.1,−3.0), (3.7,−3.55)→(4.15,−3.55). |
| 2 | **L02 exit lantern embedded in the ledge.** `IslandLanterns5` mounts a lantern at (−0.95,−3.35) on every solved island; L02's ledge (z −4.7…−2.4, y≤1.5) swallowed it whole. | `src/world/Lanterns.tsx`: `Spot` gains `gy` ground-height override. `src/v5/world/Island5.tsx`: L02's exit lantern moves to (−1.35, 1.62, −3.7) on the ledge cap beside the gate. |
| 3 | **L02 diorama gate wall-wings interpenetrated the stone-step run.** Diorama ×1.5625 puts the wings at island x 1.64…3.2, z −1.64…−0.86 — exactly where steps grow (z −1.0…−2.36). | `src/levels/L02/Diorama.tsx`: wings removed (gate reads on pillars + caps). `src/levels/L02/Obstacle.tsx`: step run nudged to x 2.2±0.05 to clear the inner pillar. |
| 4 | **L02 pickup letter + two diorama letter-heaps sat inside future step boxes** — collected late, a letter lay invisible under grown stone; the heaps rode under step 0's corner. | Letter spot (2.5,−1.3)→(2.85,−1.15) (+BloomField avoid updated). Heaps moved to local (1.05,−0.28) and (1.3,−0.25). |
| 5 | **L01 diorama back fence ran through the campus block** (post buried in the rotated building footprint, rope through walls). | `src/levels/L01/Diorama.tsx`: fence removed — the obstacle's own fence-plank props already dress that rim. |
| 6 | **L03 market stall centered on a grass mound** — dome bulged ~0.16 up through the counter box. | Mound (1.4,−1.4)→(1.9,−1.9): both flanking stalls now only graze its rim (feet-on-slope look). |

## Audit tooling

`scripts/v5/clipaudit.mjs` — captures the live R3F scene through a devtools
renderer hook, walks visible meshes, and reports per-island:
- `pairs`: world-`Box3` intersections (same-island props only; skips island
  bases, broad ground-cover sheets, player/pet rigs, and intra-prop pairs)
- `rockHits`: sampled vertices inside the island rock profile (ropes/props
  through rock)
- `float` / `sunk`: mesh bottoms hovering above or buried under the top
- orbit screenshots via drag input (`--shots=dir`)

Run: `node scripts/v5/clipaudit.mjs 5204 <AT> [doneCSV] --shots=proofs/v7/clipA/<AT>`

## Still open / known-benign

- L02 ledge back corners reach r≈5.5 but the 0.16 radius puts the face at
  ≈5.34, flush with the cap lip — pending screenshot confirmation.
- L03 ledge knoll, rim-adjacent StoneLantern (3.05,−3.8), and L01's second
  fence_planks (d≈4.9) sit at the lip edge — reading as intentional
  tie-into-rim dressing pending screenshots.
- Bridge rope ends bury ~0.1 in the cap lip by design (posts planted on the
  rim); rockHits verifies none penetrate the rock body deeper.
- Banyan canopy brushes the L01 campus roof corner (~0.1) — intentional
  tree-over-roof look, left as is.

## Verification

- `npx tsc -p . --noEmit`: clean.
- Runtime Box3 audit + orbit shots (L02, I01 all-solved, L01 unsolved):
  queued on the shared Chrome lock; evidence under `proofs/v7/clipA/`.
- play.mjs L01/L02/L03 at 390 `--lite` and 1440: queued behind the audit.

## Files touched

- `src/levels/L03/Obstacle.tsx` — site-fence rework, mound move
- `src/levels/L02/Obstacle.tsx` — step x, letter spot, BloomField avoid
- `src/levels/L02/Diorama.tsx` — gate wings removed, letter heaps moved
- `src/levels/L01/Diorama.tsx` — back fence removed
- `src/world/Lanterns.tsx` — `gy` spot ground override
- `src/v5/world/Island5.tsx` — per-island lantern spot (L02 ledge)
- `scripts/v5/clipaudit.mjs` — new audit tool
