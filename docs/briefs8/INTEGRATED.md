# V8 INTEGRATION — V7 branches landed on main

Integrated by devin-integrate on Nov 4 ~18:45 IST. Each V7 branch was
squash-merged to main; conflicts resolved by hand (AutoMerge wraps kept
around clip/story fixes; clip fixes' coordinates won over stale positions).

## Landed

- **devin/char** — hand-mapped repaint of the student atlas (warm skin,
  near-black hair, cream shirt, blue jeans, leather); `tools/repaint-student.mjs`
  cell mapper, `CharProbe`/`charTool` probe tooling, `char-probe.html` /
  `char-tool.html`; roughness 0.7 traveller (gj7 leftover).
- **devin/light** — `src/v5/world/CharLight.tsx` carried-lantern key light so
  the traveller no longer crushes to black.
- **devin/heli** — procedural CC0-style helicopter (`HeliModel.tsx`) with
  spinning rotors; rider seated inside the open bay; L06 kit cleanup.
- **devin/clipA** — L01-L03 interpenetration fixes + `scripts/v5/clipaudit.mjs`
  (Box3 overlap + rock/float/sunk audit).
- **devin/clipB** — I01 duplicate pond removed; L04 greenhouse/props moved off
  the stone corridor; `scripts/clip-audit.mjs`.
- **devin/clipC** — `scripts/v5/clip-audit.mjs` for I02/L06/L07.
- **devin/clipD** — L08/L09 clipping fixes (gate cluster separated from studio,
  porch/door-stone unburied) + `clipD-audit.mjs`/`clipD-probe.mjs`; StaticBake
  honours `?nomerge`.
- **devin/bridges** — rim-anchored bridge mouths (decks/ropes stop tunnelling
  islands), tapered walk-strip tips, sin² sag.
- **devin/perfA** — AutoMerge statics across L01/L02/L03/L04/L06/L07/L08/L09/
  I01/I02 + `NoMerge` opt-out + re-bake on subtree change + size-gated prop
  shadows.
- **devin/perfB** — cold-path split: drei stays lazy, post FX deferred,
  student preload, async fonts, deferred hidden bridges/sea/far islands,
  idle-prefetch of far chunks; `scripts/v7/coldload.mjs`.
- **devin/storyA** — L01-L03 in-world story lines + one tagline per L03
  project; FACTS additions.
- **devin/storyB** — spoken story lines + taglines for I01, L05, L04.
- **devin/storyC** — Remote (L06) + On the road (I02) speech bubbles;
  width:max-content bubble fix (gj7 leftover).
- **devin/storyD** — L07/L08 story+tagline, L08 board shows the story,
  finale who-line + stack.
- **devin/copyqa** — copy/facts audit, dropped unsourced claims, tighter
  meta description + intro line.

## Conflict resolutions worth knowing

- I01/Diorama: clipB's duplicate-pond removal kept, wrapped in perfA's
  AutoMerge (only statics inside; Fireflies/Scaffold outside).
- I01/Obstacle: single AutoMerge dressing block kept, with clipB's rock
  position fix (-3.45, -2.6) applied inside it.
- L01/Diorama: clipA's buried rim-fence removal kept (no `Fence`); the
  relocated Rock stays inside AutoMerge.
- L02/Obstacle: clipA's letter/step positions + avoid zones kept inside
  perfA's AutoMerge structure.
- Bridge5: bridges' rim-anchored `bridgeGeo(from,to,islandA,islandB)` kept;
  perfB's `shown`-gated lazy build kept on top.
- L06/Obstacle: heli's resized BlockBox kept; storyC's `Speech` added after.
- Import conflicts (AutoMerge vs LEVELS/Speech) resolved as unions.

## Dropped

- `.devin-prompt.md` conflict copies (session noise; kept whichever version
  was already on main).
- `vite.light.config.ts` (gj7/light leftover, session-local dev cache path —
  not repo material).

## Verification

- `pnpm build` passes on the merged tree.
- Per-branch RESULT docs are under `docs/briefs7/RESULT-*.md`.

All V8 sessions: `git rebase origin/main` now — your base is this tree.
