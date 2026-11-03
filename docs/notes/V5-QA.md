# V5-QA — headless playthrough harness

Owner: QA. Files: `scripts/v5/**`, this note. I do not edit game code.

## Harness
`scripts/v5/play.mjs` — one shared headless Chrome (profile `/tmp/gj-chrome-profile`,
`/tmp/gj-chrome.lock` dir lock, heartbeat while held). Opens `/?qa` (falls back to `/?v5&qa`),
clears `localStorage.govinda-journey-v5` + `useV5.reset()`, then for each island in V5_ORDER:

1. walks with **real inputs** from ENTRY toward the obstacle — WASD probing on desktop
   (key whose burst closes distance is held, re-probed on stall), virtual-joystick
   touch probing on mobile (390×844),
2. calls `window.__journey.solve[ID]()` when present; otherwise walks to each enabled
   `core.interactables` entry and uses it for real (E / Enter / use-button tap),
3. asserts `useV5.done` includes ID and the `GRANTS` ability was granted,
4. walks across the bridge to the next island (verifies `player.island` flips),
5. screenshots `proofs/v5/<size>-<n>-<ID>.png`; writes `proofs/v5/last-run.json`.

FAIL lines are printed and the run continues (recovery teleports to the next ENTRY via
`__journey.v5.goto` → `player.pos` write, so a broken island does not mask later ones).

Read live game state by importing `/src/v5/core.ts` + `/src/v5/world/layout.ts` inside the
page (same module instances the app uses): `player.pos`, `useV5`, `walkables`,
`interactables`, `ISLAND_POS` — no reliance on QA hooks existing.

Usage: `node scripts/v5/play.mjs [baseUrl] [--lite] [--only=L01,L02] [--size=1440|390]`

## Status
- Harness written and syntax-checked. Run loop: every ~15 min once V5 mounts.

## Run log

### Run 1 (~18:50) — BOOT FAIL (expected: V5 not mounted yet)
- `/?qa` and `/?v5&qa` both render V4 (App.tsx not routed). Detection OK, 75 s to give up.
- proof: `proofs/v5/1440-00-nov5.png` shows the V4 world.

### Run 2 (~19:00) — V5 mounted, all 11 islands FAIL on one root cause
- `__journey.v5` live, `__journey.player`=[pos teleport press], solve map at boot =
  [L01 L02 L05 L06 L08 L09]. world: 36 walkables / 43 blockers / 23 interactables. fps≈60 (swiftshader).
- **ROOT CAUSE — PLAYER**: `pageerror: Dust is not defined`. `src/v5/player/Player.tsx:459`
  renders `<Dust />` but the component is declared as `DustPool` (line 126). The error hits the
  boundary, the whole Canvas subtree (islands, obstacles) unmounts → scene is a blank cream
  gradient (`proofs/v5/1440-01-L01.png`), `player.pos` never integrates, every key-burst walk is
  `blocked`, and the `__journey.solve` keys registered by obstacle effects disappear when the
  tree unmounts (boot showed 6 keys; gone by each island's turn; L08/L09 re-registered later
  and their solvers ran but hit `waitFor` timeouts waiting on a dead player).
- Secondary: `pageerror: Cannot read properties of undefined (reading 'copy')` early at L01 —
  likely same crash path (`Player.tsx` spawn/`_v1.copy` or World5 project helper); recheck after
  the Dust fix.
- Expected to unblock a lot: re-run as soon as PLAYER lands the fix.

### Run 3 (~19:05) — solvers work; crossing fails on narrow bridge strip + L05 crash
- **PLAYER fix confirmed**: `<DustPool/>` landed; scene renders (beautiful clay: schoolhouse,
  desk, gates, ribbon, caption, glyph row). L01/L02/L03 solved via `__journey.solve.*`.
- **WORLD (Bridge5) — probable bug**: cross-trace shows the player walks to the exit
  (z≈-4.1, grounded), steps toward the bridge… and reappears at island ENTRY (fell to
  y<-16 → respawn). Deck stand-test (teleport onto t=0.05/0.5/0.9) is fine, so the strip
  itself raycasts — but it is only **0.62 m wide while the visible planks are ~0.95 m**:
  stepping toward plank edge = stepping onto air. Widen the walk strip to ≥ plank width,
  or add low rail blockers so feet can't leave the deck. File under WORLD `Bridge5.tsx:59-70`.
- **ISL-C L05 — page crash**: `THREE.BufferGeometryUtils: .mergeGeometries() failed
  (geometry at index 34)` then `pageerror: Cannot read properties of null (reading
  'boundingSphere')`, then the renderer's execution context died. Guard the merge —
  a null merged geometry propagates and can kill the canvas. Harness now rebuilds the
  page on context-death and continues.
- Harness upgrades: crash-resilient (rebuild page, progress persists via localStorage),
  crossing position trace on fail, `__journey.player.teleport` real-teleport recovery,
  converted to shared `withChrome`, adds `v4-<size>-<n>-<ID>.png` comparison shots,
  mobile `<canvas>` presence check, rAF-fps race.
- `player.pos` writes are **overwritten every frame** by the controller (S.pos → player.pos);
  do NOT use them for teleports — use `__journey.player.teleport` / `v5.goto` (learned the
  hard way: pos.set() is a no-op).
- Churn caveat: runs during agent edits hit transient module breaks (L01 `Hint`→`PillHint`
  rename mid-run; PillHint `<span>` crash in L02). Real signal resumes once edits settle.

### Run 4 (~20:00, aborted by integrator) — two harness root causes found and fixed
- **Backgrounded tab froze the whole sim**: creating the V4 comparison page up-front
  backgrounded the V5 tab → rAF≈0 → `walkables:0`, no `__journey.player`/`solve` keys,
  player never integrated, every island failed identically. Fixed: V4 page created lazily
  inside the island loop and `page.bringToFront()` after every v4 shot + at each island start.
- **fps≈2 under full effects on SwiftShader**: after the focus fix the world populated
  (23 walkables/31 blockers, solve keys [L01 L02 L03]) but fps≈2 → key-burst steering and
  physics-time solvers go flaky (L02's letter-teleport solver uses fixed 1.35 s sleeps;
  at ~500 ms/frame the landings don't register → `done` never set → gate stays shut and the
  player climbs on top of the closed gate box, y≈3.2 vs isle 1.5). L01/L03 solves completed
  but the bridge walk still failed pre-fix. Integrator: rerun with `?lite` when fps<5.
- Harness now logs **per-island fps** (`fps≈N` per line + `fps` field in last-run.json) and
  retries `solve.<ID>` once before declaring done-missing.
- Waiting on **WORLD bridge fix** commit before the full 1440+390 playthrough.

### Run 5 (~20:42, stopped on integrator Chrome-priority hold)
- WORLD's `3fb8c7f` landed (DoubleSide 0.98 m strip extended ±5% past both shores,
  path-corridor blocker purge, gate leaf swings outward) + ISL-E `b95e290` (solvers end
  on the exit path). Started the full 11-island pass with `?lite`.
- Boot under `?lite`: world populated — 23 walkables / 25 blockers / 8 interactables,
  solve keys [L01 L02 L03], player hooks [pos teleport press], canvas present, **fps≈4**
  (up from ≈2 without lite). Run stopped at L01-in-progress (0 island results) when the
  integrator reserved Chrome; queued behind their V4 check otherwise.
- **PASS/FAIL so far: 0 islands recorded this run.** Standing by for 'QA go' to rerun
  the full 1440→390 playthrough.

### Bugs filed (blocking `tsc --noEmit`, all outside my area)
- **ISL-C L05**: `src/levels/L05/parts.v5.tsx` — `RefObject<Object3D>` passed to `<mesh>`/`<group>`
  refs (lines ~70,114,115,157,182,189,232,259,261,280). Type them `useRef<THREE.Mesh>(null)` /
  `useRef<THREE.Group>(null)`.
- **ISL-E L06**: `src/levels/L06/Obstacle.tsx:186` — `Vector3` passed where `Color` is expected.
- **ISL-F L08**: `signui.v5.tsx:241` condition always true (call the fn?); `v5kit.v5.tsx:44`
  expected 2 args, got 1.
- **WORLD**: `src/v5/world/modules.ts` — `import.meta.glob` untyped; needs
  `/// <reference types="vite/client" />` or `"types": ["vite/client"]` in tsconfig.

## Requests to other areas
- WORLD: brief mentions `__journey.v5.goto(id)` — please accept the island id string
  (`'L05'`), that is what the harness passes.
- WORLD/PLAYER: `player.pos` write is used as the QA teleport fallback — keep it writable
  (PLAYER already has `__journey.player.teleport` planned; either works).
- ISL-*: `__journey.solve.<ID>` should be **async** and must work after a forced reset when
  the player stands at island ENTRY; please leave `player.frozen` false when done.
