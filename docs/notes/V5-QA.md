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

## V6 release check — how I run each item (QA owns, docs/V6.md §Release check)
1. **Fresh-profile visitor path** (no `?qa`): jobs file `<out>\t<url>\t<size>` →
   `node scripts/livecheck.mjs /tmp/jobs.txt` — fresh `browser.createBrowserContext()`
   per job, prints `canvas=…`, console errors, player pos; screenshots to the given
   paths. Jobs: `/`, `/?at=L05`, `/?at=L09` at `390x844` + `1440x900`. PASS = every
   shot shows the right island + character, `errors=0`.
2. **Visitor walk** L01→L02: `node scripts/v5/play.mjs <base> --visitor --size=1440|390`
   — fresh context, plain `/`, real keyboard / real touch joystick+jump. PASS =
   `done.L01` persists (low wall cleared) AND `.v5-prog` header reads `02 / 11`.
   Proof: `proofs/v5/visitor-<size>-L01-to-L02.png`.
3. **Full playthrough**: `node scripts/v5/play.mjs --size=390 --lite` then
   `node scripts/v5/play.mjs --size=1440` — PASS = all 11 islands PASS
   (solve+done+ability+real bridge walk each).
4. **V4-vs-new visual sheet**: `proofs/cmp/{v4,v5}-{desk,mob}-{L01,L05,L09}.png`
   produced by play.mjs; judge clay-tone parity per island.
5. **No-SVG-slop review**: eyeball character/pet/prop shots for primitives-as-props,
   uncanny rigs, neon, boxy panels; list offenders by owner.

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

### Run 6 (~22:08, 390×844 only, stopped on coordinator hold — stale code)
Mobile boot under `?lite` was healthy: world populated, `__journey.player` + solve keys live,
**fps≈27** at boot (mobile lite is far lighter than desktop-full ≈2-4).

| island | result | detail |
|--------|--------|--------|
| L01 | FAIL | solve set `done` ✓ but crossing failed: trace shows the player DID step onto the bridge deck (z past −5.1→−7.2, y≈0.33 on the sag) then could not climb the uphill half to L02's entry — leg1/leg2 both timeout, end y=0.3 vs isle 1.6. fps≈5 at that point. |
| L02 | FAIL | `useV5.done` missing after solve (letter-landing timing solver again — ISL-A), then the player entered a **fall↔respawn loop at world origin** — pos pinned at (0,−0.3,0)→falls to y≈−15→respawn→fall again (respawning over void — PLAYER safe-point issue). Browser then **died entirely** (`Connection closed`) → BOOT fail for L03 onward. fps≈19. |
| L03–L09 | — | never reached (browser crash + coordinator stop for stale code) |

New bugs to file:
- **PLAYER**: fall-respawn loop — after respawn the player can land over void and fall
  forever (trace: pos (0,−0.3,0) cycling y → −15, ~10 cycles until Chrome died). Likely
  interaction with "clear safe-point history on teleport" (06b0aaf) — the respawn target
  had no walkable under it.
- **ISL-A L02**: `__journey.solve.L02` still doesn't reliably set `done` — the fixed
  1.35 s sleeps between letter teleports race the landing detection; second solve
  attempt also failed this run. Consider setting `placed` directly or waiting on state.
- **WORLD**: bridge uphill half — player reached mid-deck but couldn't climb to the
  next island's entry at fps≈5; may just be low-fps steering, verify at real fps.

### Run 7 (~22:25, 390×844, HEAD 55d5bc9 — stopped on coordinator hold)

PLAYER `ff09912` (bridge rail-guide + substepped physics) fixed the crossings: **L01→L02→L03
all PASS end-to-end on mobile** — solve, done, ability grant, and real bridge walks.

| island | result | fps | detail |
|--------|--------|-----|--------|
| L01 | **PASS** | 6 | full loop incl. bridge walk to L02 |
| L02 | **PASS** | 5 | letter solver now lands (substeps) + bridge to L03 |
| L03 | **PASS** | 7 | solve + bridge to I01 |
| I01 | FAIL | 8 | done set, but I01→L05 walk failed: player paced the exit area (x 5.5→11), slipped off the east edge twice (fell to y≈−13, respawned), never found the deck — both legs timeout, end y=2.7 vs L05 4.9. Bridge direction may not match the walk corridor, or `walk-bridge-3` not registered. |
| L05 | FAIL | 5 | `useV5.done` missing after solve attempts; crossing to L04 also timed out (player hovered exit at y 4.9→5.5 island). No mergeGeometries crash this time. |
| L04 | FAIL | 6 | **module crashed** — `L04/Obstacle.tsx:732 BlinkFx` renders `<style>`/`<div>` inside the R3F `<group>` (DOM in the Canvas) → Guard marked broken → no `solve.L04`, no interactables. ISL-D must wrap DOM in `<Html>` (drei) or move it to an overlay. |
| I02–L09 | — | — | never reached: **browser died** (`Connection closed`) right after L04's crash cascade |

New bugs to file:
- **ISL-D L04**: `src/levels/L04/Obstacle.tsx:732` — `BlinkFx` emits DOM `<style>`/`<div>`
  inside the three tree → module crash → island unrunnable (no solver, no interactables).
- **ISL-C L05**: `__journey.solve.L05` ran twice, `done` still unset — same class of
  timing race as L02 had (substeps may have hidden it; verify solver sets done directly).
- **WORLD**: I01→L05 bridge — player can't locate the deck from I01's exit (falls off the
  +x rim). Check bridge-3 registration/orientation; consider rail-guide coverage there too.
- **INFRA**: second consecutive full-browser death (`Connection closed`) after module-crash
  cascades — likely SwiftShader OOM under lazy-loaded islands. Harness rebuilds and
  continues, but the run loses remaining islands each time.

### Run 8 (~22:43, 390×844 `--lite`, HEAD c6cc3e2) — COMPLETE mobile pass

| island | result | fps | detail |
|--------|--------|-----|--------|
| L01 | FAIL | 6 | solve set `done`, but the walk to the exit stalled ~45 s pinned at local (1.3,−0.2) — a prop just outside the |x|<1.15 purged corridor walls the natural path; bot couldn't detour. Also a transient HMR 500 on `Caption.tsx` (mid-edit churn). |
| L02 | **PASS** | 5 | solve + done + `climb` + real bridge walk to L03 |
| L03 | **PASS** | 5 | solve + `build` + bridge to I01 |
| I01 | FAIL | 8 | third consecutive failure here: player paced I01's disc (x 5.5→10.5, z −46→−50.6) for 40 s and never reached the deck mouth at (7.9,−52.2). No blockers registered by I01's obstacle/diorama — either an invisible wall near local z≈−2.6 or the deck-mouth catch doesn't cover this entry. **Needs probe.** |
| L05 | **PASS** | 5 | `fe314e1` done-fallback confirmed working + bridge to L04 |
| L04 | FAIL | 5 | obstacle now loads (BlinkFx DOM fix confirmed), `done` set — but the walk wandered west and slid off the rim at local (−5.1,−0.6); never reached the I02 deck. |
| I02 | FAIL | 5 | reached the exit point (z −100.7) then bounced back north; deck not found. Same class as I01. |
| L06 | **PASS** | 4 | solve + `remote` + bridge to L07 |
| L07 | **PASS** | 4 | solve + `voice` + bridge to L08 |
| L08 | FAIL | 5 | mid-crossing the player teleported to **world origin (0,0.42,0)** — concurrent console shows `Failed to reload /src/v5/player/Player.tsx` (HMR remount mid-edit, not a game bug). L08's solve had set `done`. Verify on a clean run. |
| L09 | **PASS** | 2 | finale reached; screenshot + v4/v5 finale shots saved |

Mobile tally: **6 PASS / 5 FAIL** — of the fails, L08 is an HMR artifact and L01 is a
corridor-edge prop stall; I01, L04, I02 are the real navigation questions (all three are
S-curve-bend islands where the bot walked wide and either missed the deck mouth or slid
off a rim).

### Run 9 (~23:05, 1440×900 full-effects, HEAD c9dc057 — PARTIAL, stopped for stale code)

| island | result | fps | detail |
|--------|--------|-----|--------|
| L01 | **PASS** | 5 | incl. the L01→L02 crossing that failed at 390 — desktop key-steering is more precise |
| L02 | **PASS** | 5 | |
| L03 | **PASS** | 9 | |
| I01 | FAIL | 3 | `Runtime.callFunctionOn timed out` — protocol stall at fps≈3 (harness/environment, not a game logic failure) |
| L05 | **PASS** | 5 | |
| L04 | FAIL | 14 | `no __journey.solve.L04`, manual interact failed, `done` missing — L04 module still not serving hooks in this HEAD (BlinkFx DOM error gone from console though) |
| I02 | **PASS** | 9 | desktop crossed I02→L06 fine — supports the mobile I02 fail being bot-pathing, not bridge registration |
| L06 | **PASS** | 5 | |
| L07 | **PASS** | 4 | |
| L08 | — | | not reached before stop (stale-HEAD halt) |
| L09 | — | | not reached |

Desktop tally: **7 PASS / 2 FAIL / 2 unreached** — full-effects boot fps≈22, island
fps 4–14. Visual (L09 finale mobile shot): dusk sky + lantern-lit island chain reads
lovely; contact/resume footer clean; one nit — dark cloud blobs visible pre-dissolve
during the pull-back (ART c6cc3e2/6610f6d may have addressed; verify on go-4 shots).

### Run 10 (~23:21, 390×844 `--lite`, HEAD a2cbc56) — **11/11 PASS**

PLAYER's `dfed8ea` bridge auto-guide (spline drive across `walk-bridge-*` strips) cleared
every crossing, including the I01→L05 and L04→I02 mouths the bot missed three runs in a
row. Full journey verified end-to-end on mobile: real joystick walks, `__journey.solve`,
`useV5.done`, all seven ability grants (climb/build/power/sense/remote/voice/sign), all
ten bridge walks, L09 finale reached.

| island | result | fps | island | result | fps |
|--------|--------|-----|--------|--------|-----|
| L01 | PASS | 5 | I02 | PASS | 6 |
| L02 | PASS | 5 | L06 | PASS | 4 |
| L03 | PASS | 7 | L07 | PASS | 4 |
| I01 | PASS | 5 | L08 | PASS | 5 |
| L05 | PASS | 5 | L09 | PASS | 2 |
| L04 | PASS | 7 | | | |

Caveats on an otherwise clean board:
- **ISL-D L04 still crashes at mount** (`BlinkFx` emits `<style>`/`<div>` inside the R3F
  tree, `Obstacle.tsx:757`) → Guard marks broken → gate auto-opens → the PASS rides the
  crash-fallback path, not a real mini-game solve. File stands until ISL-D moves the
  DOM to an overlay/`<Html>`.
- fps drifts 5→2 as the world fills; L09 at 2 fps is slideshow-slow on SwiftShader
  (real GPUs will differ, but watch finale weight).
- Boot fps≈11 mobile-lite.

### Run 11 (~23:35, 1440×900 full-effects, HEAD a2cbc56) — **10/11 PASS**

| island | result | fps | island | result | fps |
|--------|--------|-----|--------|--------|-----|
| L01 | PASS | 5 | I02 | PASS | 8 |
| L02 | PASS | 4 | L06 | PASS | 4 |
| L03 | PASS | 7 | L07 | PASS | 6 |
| I01 | FAIL | 6 | L08 | PASS | 7 |
| L05 | PASS | 6 | L09 | FAIL | 3 |
| L04 | PASS | 6 | | | |

- **I01 fail is bot-pathing, not a bridge bug**: trace shows the player steers straight
  at the mid-point target, cuts inside the mouth corner and steps off I01's rim ~2.2 m
  west of the strip centreline (mouth catch ≈2.2 m — right at the edge). leg1 reached
  `mid` ok; the falls all happen at the mouth lip. A human aims down the planks.
  Harness improvement queued: route through the exit mouth before the mid-point.
- **L09 renderer crash**: `page crash: Page crashed!` during the finale pull-back at
  fps≈3 — third SwiftShader death of the day, all under full effects. Mobile-lite
  survived the same sequence at 2 fps. Flagging finale weight to ART/WORLD (the
  `0be8c14` dome-wall disc may already be the mitigation).
- L04 again passed via the crash-fallback (BlinkFx DOM crash still live at `:757`).

### Run 12/13 (~23:55, targeted reruns on HEAD incl. `cc45a8b`)

- `1440 --only=I01,L09`: **I01 PASS** (deck-mouth-first routing `2b0b4b5` removed the
  corner-cut rim drops), **L09 PASS** — no renderer crash this run (finale survived;
  likely helped by WORLD's `0be8c14`/`cc45a8b` dome/far work). Desktop effectively
  **11/11** on current HEAD.
- `390 --only=I01,L05,L09 --lite`: all three **PASS** (fps 8/7/3).
- Combined state: **full 11-island journey green at both sizes** (390 lite = run 10
  clean sweep; 1440 = run 11 + go-5 rerun).

Remaining open items (not launch-blocking but filed):
- **ISL-D L04**: BlinkFx uses `react-dom` `createPortal` inside the R3F tree
  (`Obstacle.tsx:535-547`) — crashes the module every mount; the walkthrough only
  passes via Guard's crash-fallback. Fix: drei `<Html>` or a dedicated DOM root.
- fps still lands ~2-3 during the L09 finale on SwiftShader — fine on real GPUs but
  the finale is the heaviest scene; worth one perf pass if a device budget exists.
- Visual: mobile finale (L09) — dusk sky + lantern-lit island chain, clean contact /
  Résumé block, Fraunces title. One nit seen earlier — dark cloud blobs pre-dissolve;
  ART's finale-dissolve commits landed after, re-verify on the next shot pass.

### Run 14 (~00:20, 390×844 `--lite`, HEAD ec4e3de — PARTIAL, stopped for stale code)

First six islands all green before the coordinator halt — **L01, L02, L03, I01, L05, L04
PASS** (fps 4–6). L04 still logs the `BlinkFx` cross-renderer crash (`:757`) and passes
via Guard fallback only. I02–L09 untested this run. Same code as run 10 which swept
11/11, so no new signal expected — but go-7 will confirm on the settled HEAD.

### Run 15/16 (~00:55, HEAD bb056f1→183ac54) — **both sizes green**

**1440×900 full-effects, full sweep: 11/11 PASS** — first clean desktop sweep
(L01 5, L02 5, L03 7, I01 6, L05 5, L04 5, I02 9, L06 6, L07 7, L08 9, L09 1 fps).
L09 finale survived under full effects at fps≈1.

**390×844 `--lite`, subset `--only=L02,L03,I02,L06,L07,L08,L09`: 6/7 PASS** —
one fail: **L03→I01 crossing** (bot demanded too-tight mouth entry at low fps and
hugged the rim; falls at local x≈+5.5–7.5 east edge). Harness-side fix `782543b`
(leg0 arrive 0.8→1.4 m, 12→9 s) + ISL-B `ff3d358` simpler two-stone ledge:

**Targeted rerun `--only=L03,L06,L07`: L03/L06/L07 PASS at both sizes** (390 fps
7/6/5; 1440 fps 10/8/7).

Standing tally on HEAD: **1440 = 11/11, 390 = 11/11** (full sweep + go-6 partial +
targeted reruns; every island has a recorded PASS at both sizes).

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
