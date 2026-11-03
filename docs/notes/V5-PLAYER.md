# V5-PLAYER notes

Status: complete and integrated — all requests below were delivered by WORLD.

## Requests to WORLD (all resolved)
1. ~~`?v5&sandbox` route~~ — done, App.tsx lazy-loads `src/v5/player/Sandbox.tsx` at `?sandbox`.
2. ~~`src/v5/world/layout.ts`~~ — done; PLAYER imports `ISLAND_POS`, `ENTRY`, `nearestIsland`
   from it. `player.island` = `V5_ORDER[nearestIsland(pos)]` every frame.
3. ~~Render `<Player/>` + `<Controls/>`~~ — done via `world/modules.ts` globs; `<Controls/>` is
   mounted by WORLD's Chrome.
4. ~~`export const cinematic`~~ — done; PLAYER reads `cinematic.on` (camera writes + movement
   input both stop while set).

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
- [x] islandLayout stub → replaced by WORLD's layout.ts (stub deleted)
- [x] Player.tsx, Controls.tsx, Sandbox.tsx — all landed, tsc clean
- [x] Verified live at 1440x900 + 390x844 (`?sandbox` and `/?qa`): retinted
  student GLB renders (cream shirt, brown skin, indigo backpack), idle/walk/jump
  anims drive locomotion, carry prompt toggles, fall respawns.
- [x] Camera: V4-style follow — base dist 9.5 m (student ≈ 1/8 screen height),
  pitch 0.42, portrait pull-back `1 + (1 - aspect) * 0.45`, orbit/zoom damped,
  pull-in vs walkables+blockers, hands off while `cinematic.on`.
- [x] Fixed scratch-vector clobber (`near*` helpers now use dedicated `_n1/_n2`)
  that broke camera + wall-ray math.
- [x] `press(key,ms)` keeps jump/use buffers live for the whole hold (QA-safe).

## Still open / watch
- `window.__pldbg` + the `DebugLine` in Sandbox.tsx are dev aids — sandbox is a
  test route only, but strip them if the route ever ships to visitors.
- `player.frozen` zeroes input (move/jump/use) and camera writes while
  `cinematic.on`; gravity/grounding keep integrating so the player stays put
  physically. Velocity damps to a stop.
