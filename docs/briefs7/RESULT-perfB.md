# RESULT-perfB — cold time-to-playable

Goal: cold TTP → ~5 s, production build via `vite preview` on :5210,
fresh browser context + cache disabled, `Emulation.setCPUThrottlingRate` 4x,
measured at 1440x900 (plain `/`) and 390x844 (`/?lite`).

## Metric
`h:playable` — external heuristic, identical on both builds: first presented
frame after (a) `<canvas>` exists, (b) `Player-*.js` chunk arrived,
(c) `student.glb` arrived, (d) an `Obstacle-*.js` chunk arrived — followed by
two rAFs so a real frame was composited. Internal `fj:playable` marks on the
new build corroborate (first useFrame after Player commit + student.glb +
first-island chunks). Harness: `scripts/v7/coldload.mjs` (fresh incognito
context per run; numbers = in-page ms since navigationStart).

## Numbers (median of runs)

| run | build | h:playable | fj:playable | notes |
|-----|-------|-----------:|------------:|-------|
| 1440 | before | TBD | – | |
| 1440 | after  | TBD | TBD | |
| 390 lite | before | TBD | – | |
| 390 lite | after  | TBD | TBD | |

## What changed

### Chunk graph (vite.config)
- Removed the `r3f` manualChunks bucket. It hoisted fiber + **every drei export
  used anywhere** into one 500 KB eager chunk — including troika-three-text,
  Html, Sparkles, OrbitControls which are only touched by lazy level/sandbox
  code — plus react-dom helpers that forced the entry to import it.
- Kept `three` pinned to its own chunk so it still downloads in parallel.
- After: `Text` 117 KB, `Html` 7.7 KB, `OrbitControls` 15.6 KB,
  postprocessing 320 KB, `Overlay`/`registry` ~21 KB are all lazy-only.
  Eager JS on the V5 route drops ~0.5 MB (minified).

### Loading order (App / World5 / modules / perf)
- `warmPlayer()` at World5 eval pulls the Player + Controls chunk requests
  forward through the same glob loaders, several beats before their Suspense
  boundaries would ask.
- NOTE: an earlier draft also fired `import('./v5/World5')` at App module eval
  to skip the first-commit hop. In the production build that page never
  mounted (zero chunks fetched, no canvas, no console error — the Guard
  boundary swallows nothing at that level). Reverted to
  `lazy(() => import('./v5/World5'))` — the lazy import fires at first commit,
  ~1 microtask later, and mounting was verified by fj marks.
- `Overlay` + V4 `store`/`registry` removed from the V5 entry's static graph:
  Overlay is `lazy()`, QA hook imports dynamically only under `?v4&qa`.
- `useGLTF.preload('./models/student.glb')` + `useTexture.preload(skin)` at
  World5 eval — the rig's fetch+parse starts ~a second before the inner
  Suspense would ask; `<link rel=preload>` in index.html starts bytes at HTML
  parse.
- `whenIsland(id)` (+ `finally`) resolves when an island's Obstacle+Diorama
  chunks are cached; gates `fj:playable` on the island underfoot (?at aware).
- `fj:*` performance marks + `fj` flags in `src/v5/perf.ts`, readable via the
  standard Performance API — no globals needed.

### Deferred work (World5)
- Post FX (`Effects` → postprocessing + N8AO, ~320 KB + shader compile) now
  mounts on the first idle beat after playable instead of racing the cold path.
- `Water`+`Dressing` (sea plane + IslandDressing5 seeded props for all 11
  islands) waits for the same `late` wave; 7 s failsafe arms it anyway.
- `Islands5` builds base geometry only for islands ≤ idx+2; the rest mount in
  the late wave.
- `Bridge5` builds zero geometry while `shown` is false (was ~20 plank meshes
  + merged rails/deck per hidden gap); the reveal animation absorbs the
  one-time build when its island completes.

### index.html
- Google Fonts stylesheet is non-blocking (`media=print` → `onload` swap,
  `preload`+`noscript` fallbacks). Fraunces+Inter still `display=swap`.
- `rel=preload` for `student.glb` (as=fetch) + `student-skin.png` (as=image).

## Verified
- `tsc --noEmit` clean.
- TBD: coldload numbers, screenshots, play.mjs smoke.

## Still wrong / rough
- OPEN: in the measurement harness environment (fresh incognito context,
  `setCacheEnabled(false)`, 4x CPU throttle) the page reports only the
  student.glb preload and never mounts — the same failure seen before and
  after the `world5Promise` revert. A non-incognito, unthrottled probe on the
  identical dist showed a healthy boot (fj:playable @ 2255 ms, all chunks,
  no errors). A control run of the pre-change dist under the identical
  harness is queued to isolate environment vs. code.
- `student.glb`/`student-skin.png` link preloads: Chrome warns the skin
  preload is unused when credentials modes differ (fixed by dropping
  `crossorigin` — matches FileLoader/ImageLoader same-origin credentialed
  requests).
- `three` chunk is unchanged (~688 KB) — tree-shaking is already maximal;
  the wins came from moving fiber/drei satellites and postprocessing off the
  cold path, not from shrinking three.
