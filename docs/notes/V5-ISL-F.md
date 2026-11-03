# V5-ISL-F — Island obstacles L08 (Sign Flow) + L09 (Chalk finale)

Status: complete. Both islands play end-to-end via their ?qa solvers (verified in the
preview harness); world/player/art seams now use the real landed modules.

## Files I own
- `src/levels/L08/Obstacle.tsx`, `src/levels/L08/*.v5.tsx` (guardian, sign pad, voice prompt, shared kit, preview)
- `src/levels/L09/Obstacle.tsx`, `src/levels/L09/*.v5.tsx` (schoolhouse, stations, preview)

## Integration status (was stubs, now real)
- `M()` in `v5kit.v5.tsx` wraps ART's `toon()` (src/v5/art/material) — cached per colour.
- `carryAnchor`/`carryQuat` imported from `src/v5/player/anchor.ts`; `useCarryAnchor()`
  only stub-drives it while `carryAnchor.y < -500` (i.e. solo preview, no Player mounted).
- Rim dressing uses ART `<Prop>` pack GLBs (src/v5/art/Dressing). Hand-built clay remains
  for gameplay-shaped pieces: the guardian, schoolhouse, and L09's wall hedges (they must
  match invisible blocker panels exactly — a smaller GLB under them would feel buggy).
- `teleportTo()` prefers `__journey.player.teleport` (resets vel/lastSafe/camera) and
  falls back to writing `player.pos` directly.
- Physics via core `useWalkable`/`useBlocker`, prompts via core `useInteractable`,
  abilities via `has()`, grant via `complete()` — all as the contract specifies.

## Requests for other areas
- PLAYER: please confirm semantics of `player.frozen` (does the controller still integrate/gravity
  while frozen?) and how `blockers` are tested. My climbable wall registers its top pad as
  walkable + side as blocker, and offers a 'Climb over' hop interactable as fallback.
- WORLD: L09 calls `complete()` after the door swing; finale pullback + Resume/Contact are
  handled by Chrome/FinaleCam (verified in World5.tsx — nothing needed from me).
- ART: a stone-guardian / schoolhouse / bell prop in PROPS would be welcome; my assemblies
  sit behind stable JSX positions if you want to swap them.

## Flow
- L08: E on guardian (needs `has('voice')`) → say/type "hello" → tablet rises showing a V →
  pad opens → draw the V (tolerant resampled-point match) → guardian steps aside + small
  bow → `complete()` grants `sign`. Tablet/pad also reachable by pressing E again.
- L09: climb the low wall (hop interactable OR passive cap-walk) → carry the plank to the
  porch gap (real `player.carrying` + carryAnchor follow) → wind the crank to power the
  bell → trace a C at the door stone → each beat lights school windows → door swings →
  `complete()`.
- Overlays: DOM on a dedicated react root (`useDomOverlay` — createPortal can't cross the
  R3F reconciler), Inter, soft paper card, `player.frozen` while open, Esc/×/click-out to
  close, typed fallback for voice, canvas draw for sign. Camera air-draw is optional-only.
- `data-qa` attrs on all interactive DOM (`speak-type`, `speak-input`, `sign-canvas`, …).
- Preview (dev only): `/src/levels/L08/preview.v5.html` + `/src/levels/L09/preview.v5.html`
  — WASD stub player, E to use, `?auto` runs the solver, `?fresh` clears persisted state,
  `?ui=signv|signc|speak` mounts an overlay statically.
