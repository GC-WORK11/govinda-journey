# V5-PLAYER notes

Status: in progress.

## Requests to WORLD
1. `?v5&sandbox` (and/or `?sandbox`) route → lazy `src/v5/player/Sandbox.tsx` (default
   export, renders its own `<Canvas>` + `<Controls/>` overlay; self-contained). Brief says you own
   App.tsx — I will add the route myself only if it has not landed ~20 min after this note.
2. `src/v5/world/layout.ts`: please export `ISLAND_POS: THREE.Vector3[]` (indexed by V5_ORDER),
   `ISLAND_R`, `ENTRY`, `EXIT` as promised. Until it lands I stub it in
   `src/v5/player/islandLayout.ts` — I will switch the import once your file exists.
   `player.island` = nearest island centre within `ISLAND_R * 1.7`, else unchanged.
3. Please render `<Player/>` (default export of src/v5/player/Player.tsx) inside the Canvas and
   `<Controls/>` (src/v5/player/Controls.tsx) as a plain DOM sibling (it is a fixed overlay,
   pointer-events only on its buttons). Camera orbit/pinch/wheel are driven from Controls via
   window pointer events filtered to the canvas element — no extra wiring needed.
4. If you add `export const cinematic = { on:false }` to core.ts (marked section): the player
   camera already checks `(core as any).cinematic?.on` and hands control over while it is set
   (movement input also freezes).

## For ISL-* agents (contract usage)
- `core.interactables` — register via `useInteractable({ id, at, radius, label, use, enabled? })`.
  The controller shows ONE quiet prompt for the nearest enabled entry within `radius`
  (`at()` is re-read every frame). Desktop shows `E <label>`; mobile shows the use button with
  your label. `E`/`Enter`/button calls `use()`.
- `core.walkables` / `core.blockers` via `useWalkable(ref)` / `useBlocker(ref)` — world-space
  objects. Ground = downward ray vs walkables (step-up ~0.45 m); walls = short horizontal rays
  vs blockers with slide + push-out.
- `core.player.frozen = true` stops movement input + gravity keeps the player grounded; camera
  keeps working. Use it for modal UIs.
- `core.player.carrying = '<item id>'` — the carried item should be rendered by YOU (island) and
  lerped to `carryAnchor` / `carryQuat` from `src/v5/player/anchor.ts` (a socket on the chest
  bone just above the backpack, world-space, updated every frame).
- `core.playerEmote` (new marked section in core.ts): set `playerEmote.name = 'cheer' | 'sit' |
  'interact' | 'use' | null`. Loops while set; clear to return to locomotion.
- `window.__journey.player` (installed when ?qa or ?v5): `{ pos(), teleport(x,y,z), press(key,ms) }`.
  `press` accepts `w a s d`, `arrowup…`, `shift`, `space`, `e`, `enter`.

## Progress
- [x] islandLayout stub, input, uiState, anchor
- [ ] Player.tsx, Controls.tsx, Sandbox.tsx
- [ ] tsc + live screenshots
