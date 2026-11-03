# V5-ISL-B — Island obstacles L03 (First websites) + I01 (Stillness)

Status: implemented and verified in the real World5 shell (desktop + mobile).

## Files I own
- `src/levels/L03/Obstacle.tsx`, `src/levels/L03/shared.v5.tsx` (helpers shared with I01),
  `src/levels/L03/preview.v5.tsx`, `src/levels/L03/dev.v5.tsx` + `dev.html` (isolated preview)
- `src/levels/I01/Obstacle.tsx`, `src/levels/I01/dev.v5.tsx` + `dev.html`

## Design
- L03: the straight path is fenced off south of mid-island; the real route leaves the rim on a
  chain of floating stone platforms (`platform_stone` props) over open void, with three spans
  missing. Page slabs (printed layout textures — nav, hero, text lines) stand upright in a
  wooden rack on a rock ledge that only opens via the handhold/vine wall (`has('climb')`,
  scripted hop driven through `__journey.player.teleport` while frozen). E picks a page up →
  carried flat at `carryAnchor` at 58% scale, E near a gap lays it → arcs in, snaps flush,
  registers walkable. 3 placed → pages glow warm ("deployed"), landing lantern lights, then
  complete() → build. Landmark: weekend studio — awning, workbench, laptop + book stack props,
  easel with a lit page, stool prop, crates. Rope fence + stone abutment guide off the rim.
- I01: shallow pond east of the path, `bench` prop facing the water (E = glide to seat,
  `playerEmote.name='sit'`, calm hold, glide back), reeds, lily pads + `lily_small` props,
  lotus bud, willow with drooping strands, `rock_path_*` stepping stones (walkable), ripple
  rings, drifting fireflies, stone lantern (lit when done). complete() at island-local z < 0.

## Integration notes
- Player moves through `__journey.player.teleport` (authoritative); `tpWorld`/`tpLocal`
  fall back to `core.player.pos` only in the dev harness. Solvers `await waitTp()` first —
  the api attaches lazily and direct pos writes are overwritten by the controller.
- Carried pages follow `carryAnchor`/`carryQuat`; fallback `player.pos + 0.9 y` only while
  the anchor sits at its -999 sentinel (harness).
- I01 sit uses `core.playerEmote.name = 'sit'` (real `Sit_Floor_Idle` clip).
- `done` on mount → L03 renders already-bridged (placed slabs snap into gap poses and
  register walkable); payoff/lantern pre-lit, no re-complete.
- QA solvers merge into `window.__journey.solve` via `useSolver`. L03's solver climbs via the
  real `l03-climb` interactable when `has('climb')`, else teleports to the ledge so a bare
  `?qa` run still verifies the carry/place loop.
- Visuals: ART `<Prop>` (Dressing) for platforms, bench, laptop, books, stool, rocks, path
  stones, grass/flower tufts, lilies; `clay()` assemblies remain for the page slabs, rack,
  ledge, fence, lantern, willow, reeds (no pack equivalent).

## Verified (real World5 shell, ?qa&fresh + v5.goto)
- L03 solver end-to-end in-world: climb via real interactable → take 3 pages → lay into gaps
  → all walkable → complete(); `abilities` gained `build`. No console errors.
- I01 solver: bench sit via real interactable + glide; complete() at z < 0.
- Desktop 1440x900: page bridge renders laid and readable, player walks the slabs; I01 pond/
  bench/willow/lilies/fireflies render; "E sit for a moment" prompt works.
- Mobile 390x844: both islands render correctly with story captions; no overflow.
- `tsc --noEmit -p .` clean.

## Known cross-area observations (not mine to fix)
- WORLD: `?qa&at=<id>` goto can fire before the lazy Player mounts; Player then seeds its
  own spawn at island 0 and stomps the earlier `core.player.pos` write. Workaround used in
  verification: `__journey.v5.goto(id)` after `__journey.player` exists (what solvers do).
- ART/WORLD: L03's ground (`palette.ground #b5c27a` from registry) renders quite dark when
  shadowed by the neighbouring island; readable, but worth an eyeball pass in final QA.
