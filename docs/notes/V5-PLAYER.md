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

## Bridge auto-guide (design change — Govinda, since this commit)
- Once grounded on any `walk-bridge-*` mesh the player switches to **spline
  drive**: the strip's world-space vertex pairs give the centreline (41
  sections); the player is carried along it — **cannot fall off**.
- Input still steers: forward/back input advances arc-length `s` (walk/run
  speed × real elapsed seconds — **distance per real time**, works at any
  fps); lateral input steers a small offset `lat` clamped to `hw*0.78` of the
  local section halfwidth (widest at the flared mouths); `lat` drifts back to
  centre gently. Jump still works and lands back on the deck.
- Release: pushing past `s<=0` or `s>=len` hands back to free physics (the
  strip underlaps both island discs, so stepping off is seamless); teleport
  and respawn also clear the mode. Grounded on anything non-bridge releases.
- Legacy note: the pre-drive rail guide still runs for the airborne catch
  (ledge-lip drops onto the deck before the drive engages).
- Mesh requirement: position attribute = WORLD-SPACE vertex PAIRS per
  cross-section (v[2i], v[2i+1] = section i's two edges) — exactly how
  WORLD's Bridge5 strip is built (41 sections × 2 verts, 2 tris/section;
  faceIndex/2 locates the standing section).
- Physics substeps: ≤1/30 s steps, up to 260 ms/frame — sim keeps real pace
  down to ~4 fps (QA headless runs at 5–9 fps).
- Verified: L02→L03 (1440), I01→L05 + L05 island (390) all PASS.

## Low-fps input + path magnetism (since this change)
- **Tap latch (`MIN_HOLD = 300` in input.ts):** every real keydown is latched —
  an early keyup keeps the key "down" via `input.synth` until press+300 ms, so a
  150–260 ms burst (QA probe) or quick tap can never land wholly inside one rAF
  gap at ~5 fps. Space / E / Enter also future-date `jumpAt`/`useAt` by MIN_HOLD
  so the 120/160 ms consume windows can't expire unseen. Held keys unaffected:
  the latch only extends sub-300 ms taps.
- **Exit-mouth magnetism:** grounded on `walk-<id>` (the island's flat top mesh),
  within 5.5 m of `ISLAND_POS[i] + EXIT`, and heading within ~80° of the mouth →
  the wish direction blends toward the mouth (≤50% at point blank, ~15% at 4 m).
  Frame-time independent; only bends heading already aimed at the exit, so rim
  roaming is untouched. It converges probe bursts through furniture pockets
  (L01 desk/tree, I01 seat) onto the path corridor.
- Both target the full-run regression on c6cc3e2+: at 5–6 fps probe bursts were
  falling between frames (0 measured gain) and walkers ping-ponged in pockets
  ~4 m from the bridge mouth until leg timeouts.
