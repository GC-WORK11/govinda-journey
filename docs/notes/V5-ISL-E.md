# ISL-E — L06 Remote + L07 Wispr Wrap obstacles

Status: **both islands verified end-to-end live** in the real world (`/?qa&at=<ID>&unlock`):
`__journey.solve.L06()` → done + `remote` in ~4 s; `__journey.solve.L07()` → done + `voice` in ~10 s,
both via real interactions (teleport + `interactables.get(<id>).use()` + the same DOM paths players
hit). Post-solve screenshots inspected at 1440x900 (door swung open + lantern lit on L07, bridge out
+ dock scene on L06). tsc clean (`npx tsc -p . --noEmit`, filtered).

## What is built

- `src/levels/L06/kit.v5.tsx` — local pieces on ART's `toon()` material: `Desk`, `Stool`, `Pergola`
  (post-and-beam garden shelter), `Dock`, `Laptop` (angled screen, canvas-texture terminal via
  `useTerminalScreen` — idles, then shows the drone uplink while the phone is out), `PhoneOnStand`,
  `SwitchRock` (small lathe island with its own grass cap), `SwitchPost` (lever + lamp),
  `Drone` (quad, spinning props, hover bob), `Pad`, `BlockBox` (invisible physics box,
  `kind='block'|'walk'`).
- `src/levels/L06/PhoneUI.v5.tsx` — DOM overlay phone: dark frame, cream screen, Inter, safe-area
  aware, `min(300px,86vw)`. Status line (linking/flying/hit), thumb joystick with pointer capture
  + `touch-action:none` (drives a shared `stick` ref), Done/Put-away button. `data-qa` hooks:
  `l06-phone`, `l06-stick`, `l06-close`, `l06-done`.
- `src/levels/L06/Obstacle.tsx` — shallow ford across the path (sandy bed + animated water +
  stepping stones, stones are real `useWalkable` footing) hidden under a low drifting smog bank.
  `L06-pulse` interactable (radius 3, needs `sense`) thins the smog ~5 s and glows rings + stones.
  Pergola workspace (desk blocks, posts block, rest walkable). Dock overhanging the rim (walkable)
  with phone on stand (`L06-phone`) + drone pad. Phone opens the DOM overlay; while open the drone
  is flown by the stick and **the camera follows it via `core.cinematic.on`** (PLAYER yields + player
  freezes; released after a short blend-back — see note below). Drone touching the switch tips the
  lever, warms the lamp, extends the plank bridge (walkable once out). Closing the phone after the
  hit calls `complete()` → `remote`. `done` renders bridge out + lamp warm.
- `src/levels/L07/kit.v5.tsx` + `Obstacle.tsx` — garden `DoorWall` + flank boulders sealing the
  exit (blockers ~2.2–2.4 m tall, door panel blocks until the swing). Far side of a gap: a floating
  shelf with `Robot` holding a phone. `L07-console` (needs `remote`) calls the shelf in — it drifts
  up and snugs against the rim (walkable once docked). The laptop on a side table shows the word
  (“open”) on a canvas screen. `L07-speak` opens `VoiceUI.v5.tsx`: Web Speech API listen (9 s cap,
  interim transcript) with automatic + manual typed fallback (`l07-voice`, `l07-input`, `l07-send`,
  `l07-typeinstead`, `l07-notnow`). On submit the letters fly one by one along a bezier from the
  robot's phone to the laptop, landing one char at a time on the screen; the door then swings open,
  the lantern warms, `complete()` fires → `voice`. `done` renders shelf docked + door open.
- `src/levels/L0{6,7}/dev.{html,v5.tsx}` — standalone dev harnesses from before the world landed
  (own Canvas + stub player). Kept for quick solo tweaks; the real check is `/?qa&at=<ID>&unlock`.

## Conventions adopted from the landed world

- `clay()` in both kits now wraps ART's `toon()` (shared cache, wrapped diffuse + rim).
- `<Scatter>` rim dressing on both islands with `avoid` zones over the play spaces.
- Interactable ids are level-scoped (`L06-phone`, `L06-pulse`, `L07-console`, `L07-speak`) like ISL-A.
- Solvers merge into `window.__journey.solve` (spread), delete own key on unmount, skip when the
  island is already done, and teleport via `__journey.player.teleport(x,y,z)` (world coords through
  `localToWorld`) with a `core.player.pos` fallback for the dev harness.
- `playerEmote` used on interactable use (`use` while a sheet is open, `interact` ~1.1 s on pulse /
  console).
- Both overlays freeze the player while open (`core.player.frozen`), always offer a click/typed
  path, and restore on unmount.

## Camera handoff (needs PLAYER/WORLD awareness)

While the L06 phone is open the obstacle claims `core.cinematic.on` so PLAYER stops writing the
camera (this also freezes walking — the drone is the pawn). It releases it after a ~0.9 s blend back
toward the follow position. It never sets `cinematic.on` if it was already true (e.g. WORLD finale),
and only clears a flag it set itself. If PLAYER later adds a proper "UI owns camera" channel, this
should move to it — flagged here.

## QA

`scripts/v5/play.mjs --only=L06,L07` drives the solvers. L06 solver: teleports beside the dock,
`use()`s `L06-phone`, steers the same `stick` ref the DOM joystick writes toward the switch until
`hit`, waits out the bridge, closes the phone. L07 solver: grants `remote` if the chain skipped it
(same convention as ISL-* solvers granting prerequisites), `use()`s `L07-console`, waits for the
shelf, `use()`s `L07-speak`, submits `"open"` through the same `submitRef` the sheet's Send runs.

## Known issues (not mine)

- `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index 36` followed by
  per-frame `pageerror: Cannot read properties of null (reading 'boundingSphere')` during live runs.
  The `mergeGeometries(geos, false)!` call sites are in `src/levels/I02/station.v5.tsx` and
  `src/levels/L04/street.v5.tsx` — a null merged geometry reaches a mesh and crashes the renderer
  every frame. Owner of those files should guard `mergeGeometries` returning null.
- **Cold-start teleport race (WORLD/PLAYER):** `?at=<ID>`'s `j.v5.goto` calls
  `__journey.player.teleport` but falls back to `player.pos.copy` — PLAYER writes `core.player.pos`
  from its own state every frame, so if the lazy Player chunk hasn't attached its api yet the goto
  silently no-ops and the traveller stays at island 0. Observed once on a cold load (`at=L07`
  screenshot showed the L01 island with the L07 caption). My solvers now poll for the api (up to
  8 s) before teleporting; `goto` should do the same (or queue the teleport until the api exists).
- Shared-tree noise from other areas' WIP is expected; my files are tsc-clean.

## Rough edges / ideas if time allows

- The smog ford is intentionally shallow — wading through it is allowed (it's a ford); `sense`
  makes the path legible rather than possible. If QA reports it reads as required, make the puffs
  denser or the water block.
- `Prop`-swapping the desk/stool/table (packs are in) was considered; kept procedural shapes since
  they carry the canvas screens + exact footprints. Easy swap later.
