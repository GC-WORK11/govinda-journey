# V5-ISL-B — Island obstacles L03 (First websites) + I01 (Stillness)

Status: implemented, verified in dev harness; final in-shell verification pending
(queueing behind the shared browser slot).

## Files I own
- `src/levels/L03/Obstacle.tsx`, `src/levels/L03/shared.v5.tsx` (helpers shared with I01),
  `src/levels/L03/preview.v5.tsx`, `src/levels/L03/dev.v5.tsx` + `dev.html` (isolated preview)
- `src/levels/I01/Obstacle.tsx`, `src/levels/I01/dev.v5.tsx` + `dev.html`

## Design
- L03: the straight path is fenced off south of mid-island; the real route leaves the rim on a
  chain of floating stone platforms over open void (3 gaps). Page blocks (paper slabs with
  printed layout bars — nav, hero, text lines) stand upright in a wooden rack on a rock ledge
  that only opens via the handhold/vine wall (`has('climb')`). E picks up a page → carried flat
  at `carryAnchor` (shrunk to 58%), E near a gap lays it → snaps flush, registers walkable.
  3 placed → pages glow warm ("deployed"), landing lantern lights, then complete() → build.
  Landmark: a small weekend studio — awning, workbench, easel with a tiny lit page, stool,
  crates, tools. Rope fence + stone abutment guide the eye off the rim.
- I01: shallow pond east of the path, bench facing the water (E = sit a while — glides to the
  seat, `playerEmote.name='sit'`, gentle hold, glides back), reeds, lily pads + lotus bud,
  willow with drooping strands, stepping stones (walkable), ripple rings, drifting fireflies,
  stone lantern (lit when done). complete() when the player passes z < 0 (island-local). No task.

## Integration notes (written against the landed core.ts / Player.tsx)
- Player movement is driven through `__journey.player.teleport` (authoritative `s.pos`);
  `tpWorld`/`tpLocal` in shared.v5.tsx fall back to `core.player.pos` only in my dev harness.
  Scripted moves (L03 climb hop ~0.7 s, I01 bench glide) call it per frame while `player.frozen`.
- Carried pages follow `carryAnchor`/`carryQuat` from `src/v5/player/anchor.ts`; fallback
  `player.pos + 0.9 y` while the anchor sits at its -999 sentinel (harness only).
- I01 sit uses `core.playerEmote.name = 'sit'` (real `Sit_Floor_Idle` clip in Player.tsx).
- Interactables: `at()` returns fresh world pos each call via `root.localToWorld`; radius is a
  3D distance vs `s.pos` — all my radii account for it.
- `done` prop true on mount → L03 renders already-bridged (placed slabs snap into gap poses on
  first frame and register walkable). Payoff/lantern already lit, no re-complete.
- QA solvers merged into `window.__journey.solve` via `useSolver` (same convention as ISL-A);
  L03's solver climbs via the real `l03-climb` interactable when `has('climb')` (`?qa&unlock`),
  otherwise teleports to the ledge so a bare `?qa` run still verifies the carry/place loop.
- Materials: all assemblies use `src/world/kit.tsx` `C`/`clay()` — deliberate placeholder seam
  until ART's toon material / `<Prop>` dressing is ready to swap (Dressing.tsx exists now;
  swap is a follow-up polish task once ART publishes which props to use).

## Requests for other areas
- ART: page-slab, floating-rock platform, bench, willow/reeds, lantern props would slot
  straight in; all my assemblies are positioned placeholders ready to swap.
- WORLD: L03's exit is behind my site fence — the player reaches (0,0,-4.2) from the platform
  landing south of the fence; the exit bridge should still land there. Verified locally.
- PLAYER: none remaining — teleport, carryAnchor, playerEmote, frozen all work as contracted.

## Verified
- Dev harness (src/levels/L03/dev.html, I01/dev.html) at 1440x900: scene reads, rack pages
  stand upright with printed layouts, studio + fence + lantern composed; `?auto` solver
  walks the full carry→place loop and completes (slabs walkable across the void).
- I01: bench E → glide-sit (playerEmote), hold, glide back; auto-complete at z < 0;
  stepping stones / seat registered walkable.
- `tsc --noEmit -p .` clean for all owned files.
- Pending: real-shell shots (?qa&at=L03&unlock / ?qa&at=I01) + 390x844 mobile pass,
  solver run inside World5 (queued behind the shared Chrome slot).
