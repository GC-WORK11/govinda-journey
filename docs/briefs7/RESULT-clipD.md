# clipD — Collision/Clipping Audit: L08, L09, finale

Branch `devin/clipD`, worktree `/workspace/gj7/clipD`, port 5207.

## Method

1. **Static geometry audit** — walked every prop/rope/fence/building in L08 and
   L09 (diorama × `D_SCALE = 5/3.2 = 1.5625` layered under the V5 obstacle in
   island-local units), computed world-space footprints and found the
   interpenetrations listed below. The finale mounts all islands; its own UI is
   DOM-only (no extra props), so finale risk concentrates on the same islands.
2. **Box3 audit harness** — `scripts/clipD-audit.mjs` (new): per island it
   collects every rendered mesh under `island-<ID>`, its two neighbouring
   `bridge-<i>` roots and the world-space dressing group; computes world AABBs;
   reports pairwise overlaps (>2 cm on all axes, vertex-inside confirmation),
   mesh bottoms sunk >9 cm below the island top or hovering 9–55 cm, prop
   centres past the rim, and bridge rope/deck vertices piercing either
   neighbouring island. Then orbits the camera for multi-angle JPEGs.
   `?nomerge` (added to `StaticBake`, mirroring `AutoMerge`) keeps props as
   individual meshes so pairs resolve to real objects, not one baked blob.
3. **Chrome contention** — the box runs ~9 sessions sharing
   `/tmp/gj-chrome.lock`. Three audit attempts died on the wait/lottery; one
   won the lock but hit the 30 s Chrome WS-launch timeout, so my worktree's
   `scripts/chrome.mjs` now passes `timeout: 120000` (launch) and
   `protocolTimeout: 240000`. The audit runs in the background while fixes were
   applied; remaining browser evidence is listed under *Verification*.

## Findings & fixes

### L08 — Sign-Flow (`src/levels/L08/`)

| Problem | Fix |
|---|---|
| Guardian (HOME 0,−1.95, body r≈0.5·1.2) overlapped the hand-sculpture plinth (0.86,−1.48, r≈0.94) by ~0.5 m | Sculpture group + `Scaffold` moved `z −0.95 → −0.2` (world z −1.48 → −0.31): 0.17 m clear of the guardian, 0.15 m clear of the right gate stone |
| Right `GateStone` (1.5,−2.0, r 0.72) intersected the same plinth | Same move — now ~1.8 m between centres |
| Tablet rising at (1.15,−1.5) was embedded in the right gate stone (centre dist 0.61 < r 0.72) | Moved to (−0.8,−1.55) — rises on the guardian's left, clear of both stones and the aside path |
| Guardian's feet sank ~10 cm into the wooden deck (deck top y 0.10, feet y 0) | Deck shifted `x 0.65 → 1.05` local — feet now rest on grass; deck still carries crate/stool/tools |
| Guardian's ASIDE (1.95,−3.7) ended standing inside the fence's end post (dist 0.33) | `ASIDE → (2.2,−4.0)` — beside the exit mouth; fence third point pulled from (1.45,−2.3) to (0.75,−2.35) so it no longer reaches the aside spot |
| `bench` prop (−2.6,−0.5) intersected the diorama `Bush` (−2.89,−0.39), centres 0.31 m | Bench moved to (−2.4,−1.0) — ~0.8 m separation |

Note: gate stones and guardian stay symbolic — `purgeCorridors` already drops
their blockers inside the |x|<1.15 corridor, so no passability change. The
damped aside-walk path still grazes the right gate stone's corner (≈same depth
as the original path, which shipped that way).

### L09 — Chalk (`src/levels/L09/`)

Root cause: the V4-parity schoolhouse (world x −0.86..1.48, z −2.03..−0.16,
h 1.41) sat inside the V5 porch/ramp/door-stone volume.

| Problem | Fix |
|---|---|
| School back-left corner cut through the stone porch (overlap ≈1.16×0.43 m through slab height 0.5) | `SCHOOL_POS` `[0.2,0,−0.7] → [0.55,0,−0.38]` — building now ends 7 cm in front of the porch lip |
| `DoorStone` (0.02, 0.5, −1.78) — the sign you must trace — was fully buried inside the building | Same move — stone now stands visibly on the porch |
| Plank ramp's right-front corner slid inside the building when placed | Same move — ramp right edge clears the wall by ~0.16 m |
| Free-standing scaffold poles (−0.86,−1.72) rose through the porch slab | Moved to local (−0.85,−0.15) — garden left of the path |
| `blackboard` floated 0.3 m behind the school back wall, face pointing into the wall | Remounted on the right side wall (0.77,0.55,−0.1), facing out |
| Plank HOME sank ~5–8 cm into the grass (box y ±0.05, rz 0.06) | Rest position raised to y 0.08 — lies on the grass |
| Flag pole / bush / satchel fell inside the school's new footprint | Flag → (1.5,0,0.5), bush → (−0.95,0,0.35), satchel → (0.55,0.35) in front of the door |

### Finale

`Finale.tsx` is DOM-only; the pull-back mounts every island, so it inherits the
two fixed scenes. The audit's finale jobs (vista screenshots + full-world mesh
sweep) are part of `clipD-audit.mjs` — see Verification for status.

## Changed files

- `src/levels/L08/Diorama.tsx` — deck, sculpture group, scaffold, fence pts
- `src/levels/L08/Obstacle.tsx` — ASIDE, Tablet position, bench position
- `src/levels/L09/Diorama.tsx` — SCHOOL_POS, flag, bush, satchel, scaffold, blackboard
- `src/levels/L09/Obstacle.tsx` — plank rest height
- `src/levels/L08/v5kit.v5.tsx` — `StaticBake` honours `?nomerge` (audit aid)
- `scripts/clipD-audit.mjs` — new Box3 audit + orbit-screenshot harness
- `scripts/clipD-probe.mjs` — minimal boot diagnostic
- `scripts/chrome.mjs` — Chrome launch `timeout: 120000`, `protocolTimeout: 240000` (loaded-box headroom)

## Verification

- `tsc --noEmit -p .` — clean (after fixes and before).
- Box3 audit (`node scripts/clipD-audit.mjs http://localhost:5207/`): queued on
  the shared Chrome lock across several attempts; evidence lands in
  `proofs/v7/clipD/` as it completes.
- `scripts/v5/play.mjs --only=L08,L09 --size=1440` and `--lite --size=390`:
  pending the same lock.

## Remaining known issues

- L08 Play scene (unsolved state): the laptop crate's left edge (~x 0.23)
  kisses the |x|<1.15 walk corridor and the leftmost floating hand sits inside
  it — pre-existing; hands must stay within tap reach, so left as-is.
- The guardian's damped walk to ASIDE still brushes the right gate stone's
  corner by ~0.2 m, same depth as the original shipped path — stone-on-stone
  contact, visually acceptable.
- L09 path lanterns at (±0.9, 3.6/2.75) stand at the corridor edge — visual
  margin only, left as-is.
