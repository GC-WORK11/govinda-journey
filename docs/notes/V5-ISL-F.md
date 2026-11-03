# V5-ISL-F — Island obstacles L08 (Sign Flow) + L09 (Chalk finale)

Status: in progress.

## Files I own
- `src/levels/L08/Obstacle.tsx`, `src/levels/L08/*.v5.tsx` (guardian, sign pad, voice prompt, shared kit, preview)
- `src/levels/L09/Obstacle.tsx`, `src/levels/L09/*.v5.tsx` (schoolhouse, stations, preview)

## Assumptions made (coding against core.ts; stubs marked STUB in my files)
- `src/v5/player/anchor.ts` (carryAnchor) does not exist yet → `v5kit.v5.tsx` exports a
  `carryAnchor` Vector3 updated each frame to `core.player.pos + (0,0.9,0)` (world space).
  Swap for the real import once PLAYER lands (one-line change, marked).
- `src/v5/art/Dressing.tsx` does not exist yet → all props are hand-built clay assemblies using
  `src/world/kit.tsx`'s `C`/`clay()` through one seam (`M()` in v5kit.v5.tsx) so they can be
  swapped for PROPS/toon material later.
- Island world transform: obstacles never assume ISLAND_POS. Everything goes through a group ref:
  `toWorld(local)` / `toLocal(player.pos)` — works wherever WORLD places the group.
- `player.frozen` = controller stops moving the player; my overlays set it while open and
  QA hop/teleport relies on `player.pos` being writable. If the controller also re-imposes
  physics while frozen, hop animations could fight it — flag to PLAYER below.
- `useInteractable` enabled() false = prompt hidden. I keep prompts enabled and explain in `use()`
  when an ability is missing, so nothing is silently dead.

## Requests for other areas
- PLAYER: please confirm semantics of `player.frozen` (does the controller still integrate/gravity
  while frozen?) and how `blockers` are tested (horizontal rays vs capsule? object bounding box?).
  My climbable wall registers its top pad as walkable + side as blocker — please support
  "ledges ≤ ~0.6 m mountable when has('climb')" if that's the climb model; my 'Climb over'
  interactable hop also works regardless.
- PLAYER: when `carryAnchor` lands, keep the same name/export path `src/v5/player/anchor.ts`.
- WORLD: `window.__journey.solve` is merged, not replaced — my islands do
  `j.solve = { ...j.solve, L08: fn }` under `?qa`. Please keep whatever base object you create.
- WORLD: L09 calls `complete()` after the door swing; finale pullback + Resume/Contact are yours.
- ART: a stone-guardian / schoolhouse / bell prop in PROPS would be welcome; my assemblies are
  placeholders ready to swap behind the same JSX positions.

## Notes
- L08 flow: E on guardian (needs voice) → say/type "hello" → tablet reveals a V sign →
  E opens sign pad → draw the V → guardian steps aside → complete() (grants sign).
- L09 flow: climb the low wall (hop interactable, also any passive climb) → carry a plank to the
  porch gap → wind the crank to power the bell → trace a C at the door → all windows lit →
  door swings open → complete().
- Overlays are DOM portals, Inter, soft paper wash, `player.frozen` while open, type fallback
  for voice, canvas draw for sign; camera is an extra optional mode (frame-diff hand tracking,
  never required, only if the user allows).
- Preview (dev only, until World5 lands): `/src/levels/L08/preview.v5.html` and
  `/src/levels/L09/preview.v5.html` — WASD to walk a stub player, E to use, `?auto` runs the QA solver.
