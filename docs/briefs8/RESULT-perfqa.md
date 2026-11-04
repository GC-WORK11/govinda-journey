# RESULT — perfqa (V8 sprint)

## Task
Under ~150 draw calls per view, under 5 s cold load (merge geometry,
instancing, drop tiny shadows, lazy-load). Then run scripts/v5/play.mjs
end-to-end repeatedly, fix crashes/softlocks, report blocking bugs.
No level copy edits.

## State found
INTEGRATED.md landed mid-session and V7's perfA had already done most of
the same work I was preparing: `AutoMerge` static wraps across the level
obstacles/dioramas (one big wrap + `NoMerge` carve-outs), size-gated prop
shadows, and a proper idle-time cold path in `World5` (post FX, sea, and
far islands all wait for the first playable frame via requestIdleCallback,
with a 7 s failsafe). My draft wraps for the level files were redundant
and were dropped during the rebase rather than fighting upstream.

## What this session changed
**`src/v5/world/AutoMerge.tsx`**

- **Re-bake poll fix (real bug):** the V7 poll stored `s.n =
  s.hidden.length` but `count()` only counts *eligible* (visible,
  unmerged) meshes — post-bake that's ~0, so `0 !== ~40` re-baked the
  whole subtree every 0.4 s forever (dispose + clone + merge + upload
  churn on every wrapped group). Now stores the post-bake eligible count.
- **Unmount detection:** if a child inside a wrap unmounts (conditional
  dressing), its hidden originals leave the tree — the poll now also
  re-bakes when a hidden mesh has no parent, so merged ghost geometry
  can't linger.
- **`deps?: DependencyList` prop:** explicit re-bake for material
  *identity* flips that don't change the mesh count (e.g. a lamp head
  swapping `clay()` → lit material on unlock), which the count poll
  can't see. Not currently needed by upstream call sites (their lamps
  swap outside the wraps) — kept for future wraps.

**`src/v5/world/Island5.tsx`** — `IslandBase5`: `Island` + `scatterGeo`
are both `clayVC()`; wrapping them collapses 2 meshes → 1 per island
(×3 mounted islands ≈ −3 calls everywhere).

**`src/v5/art/Dressing.tsx`** — `IslandDressing5`: 4 same-material
(`clayVC()`) meshes per mounted island → 1 (×3 mounted ≈ −9 calls
everywhere).

No copy touched. No gameplay blockers moved (hidden originals stay in
the tree; merged meshes opt out of raycast).

## Verified
- `pnpm build` clean (`tsc -b` + vite, 8.8 s).
- `npx tsc -b` clean after the re-bake fix.
- Code review against the V7 story/copy commits during rebase —
  speech/caption code preserved, no wrap covers animated/transparent/
  interactive geometry.

## NOT verified (blocked)
- **Per-view draw-call census and cold-load timing on this tree.** The
  shared headless Chrome profile (`/tmp/gj-chrome-profile`) was held
  continuously by peer sessions all evening (singleton lock; clip/play
  QA loops). My census script (`/tmp/perf8/calls.mjs`, renderer-wrap +
  per-island frustum census, incremental JSON output, 30 retries)
  queued for hours and did not get a window.
  Best available numbers are V7 perfA's measured production-build
  census (`docs/briefs7/RESULT-perfA.md`, `__journey.v5.stats()`):
  L01 124, I01 145, L06 95, L09 125 under target; L02 217, L03 243,
  L04 290, L05 247, L07 197, L08 269, I02 163 still over — dominated by
  live gameplay meshes that must not be merged plus the i±1 mount
  window rendering two neighbours. This diff adds ≈ −12 ambient calls
  per view (island base + dressing) on top of that table, which flips
  I02 close to/at target but does not bring L04/L05/L08 down — those
  need instancing of animated gameplay meshes (L04 stones, L02
  letters, L07 chips), perfA's own recommended next step, not
  attempted here (unverifiable tonight).
- **Full play.mjs run.** Same contention. No crash/softlock
  regressions are expected from this diff (it only merges statics and
  fixes bake churn), but it is unproven.

## Blocking bugs found
None in this diff's scope. Known-risk notes for whoever runs QA next:
- AutoMerge's poll traverses every wrapped subtree each 0.4 s — cheap,
  but if a future wrap contains hundreds of nodes consider widening the
  interval.
- `?nomerge` still disables all merging for A/B verification.
