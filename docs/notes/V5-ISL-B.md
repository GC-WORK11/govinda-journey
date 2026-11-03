# V5-ISL-B — Island obstacles L03 (First websites) + I01 (Stillness)

Status: in progress.

## Files I own
- `src/levels/L03/Obstacle.tsx`, `src/levels/L03/shared.v5.tsx` (helpers shared with I01),
  `src/levels/L03/dev.v5.tsx` + `dev.html` (isolated preview until World5 lands)
- `src/levels/I01/Obstacle.tsx`, `src/levels/I01/dev.v5.tsx` + `dev.html`

## Design
- L03: the straight path is fenced off south of mid-island; the real route leaves the rim on a
  chain of floating stone platforms over open void (3 gaps). Page blocks (paper slabs with
  printed layout bars) sit in a rack on a rock ledge that only opens via the handhold/vine wall
  (`has('climb')`). E picks up a page, carry to a gap, E lays it → snaps flush, walkable.
  3 placed → pages glow warm ("deployed"), landing lantern lights, then complete() → build.
  Landmark: a small weekend studio — workbench, easel with a tiny lit page, awning, stool.
- I01: shallow pond east of the path, bench facing the water (E = sit a while; freezes +
  releases the player), reeds, lily pads, willow, fireflies, stone lantern. complete() when the
  player passes z < 0 (island-local). No task.

## Assumptions (stubs marked in code, coding against core.ts only)
- `src/v5/player/anchor.ts` exists: I lerp carried items to `carryAnchor`/`carryQuat`
  (world→local). Fallback while Player.tsx is absent (my dev harness): anchor treated as
  player.pos + 0.9 y whenever carryAnchor is still at its -999 sentinel.
- `src/v5/art/Dressing.tsx` / `material.ts` absent → all props are clay assemblies via
  `src/world/kit.tsx` `C`/`clay()` behind one seam so they can swap to `<Prop>`/toon later.
- Climb: no passive ledge-mount exists yet, so the vine wall is an interactable
  ("climb the handholds") gated on `has('climb')` that hops the player to the ledge top
  (frozen during the ~0.6 s move). Also works if PLAYER adds real climbing later.
- Void falls while carrying: block stays carried (PLAYER respawns at last safe point).
- `useV5.reset` / revisit: if `done` prop is true on mount, L03 renders already-bridged.

## Requests for other areas
- PLAYER: `playerEmote` (sit) is not in core.ts yet — I guard `(core as any).playerEmote?.name`.
  A sit pose would make the I01 bench nicer; without it the sit is just a camera-side pause.
- PLAYER: please keep `interactables` nearest-in-range → single prompt semantics; my gap
  prompts change label with carry state ("lay the page" vs "a page gap").
- WORLD: `window.__journey.solve` merged per island — I never replace the object.
- WORLD: L03's exit point is behind my site fence; the exit bridge should still land at
  (0,0,-4.2) — the player reaches it from the platform landing south of the fence.
- ART: page-slab / floating-rock / bench / reeds props would slot straight in; all my
  assemblies are positioned placeholders ready to swap.

## Verified
- (pending)
