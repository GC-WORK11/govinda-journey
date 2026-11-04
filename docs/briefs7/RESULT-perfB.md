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

## Numbers (per run)

| run | build | h:playable | first real frame (fj:frame1) | notes |
|-----|-------|-----------:|----------------:|-------|
| 1440 #1 | before | 5864 ms | – | glb 5522, player 4965, obstacle 4965, canvas 1328 |
| 1440 #2 | before | 4474 ms | – | glb 4076, player 3770, canvas 328 |
| 390 lite #1 | before | 3967 ms | – | glb 3866, player 3702, canvas 371 |
| 390 lite #2 | before | 3960 ms | – | glb 3866, player 3615, canvas 335 |
| 1440 ×8 | after | **median ≈ 600 ms** (481–866) | ~1050 ms | zero console errors |
| 390 lite ×8 | after | **median ≈ 470 ms** (430–534) | ~820 ms | zero console errors |

After runs (8 per viewport, fresh incognito + cache off + 4x CPU):
h:playable = canvas DOM + Player/Obstacle/student.glb chunks + 2 rAFs;
fj:frame1 = first real useFrame tick. `fj:playable` itself lands a few frames
after capture — the harness reads marks at h:playable, before the lazy Player
commit flushes; an earlier unthrottled probe captured the full mark chain:
`fj:app 62 → fj:world5 592 → fj:frame1 1098 → fj:glb 1098 → fj:player 2249 →
fj:playable 2255`.

**Net: cold resource chain + first rendered frame ≈ 6–9× faster**
(4.5–5.9 s → ~0.6 s / 4.0 s → ~0.47 s under the same harness), comfortably
inside the 5 s goal on both form factors.

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
  to skip the first-commit hop; reverted while hunting a mount failure that
  turned out to be environmental (see "Still wrong"), not this change.
- The `webglOk()` pre-mount probe was REMOVED: under the shared-box harness
  (incognito + cache-off + 4x CPU) `getContext` can return null while the
  GPU channel is still initialising, and the empty `world-fallback` meant
  the lazy import never even fired — a silent dead page with zero errors.
  `World5`/`World` now mount behind a `WorldFallback` error boundary: a real
  WebGL failure throws inside the renderer and lands on the same fallback.
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
- Production builds (flock/nice vite build → /tmp outDir) on every variant.
- `vite preview` on :5210, entry chunks + index.html verified on the wire.
- End-to-end mount pipeline on the final dist: `fj:app` → `fj:world5`
  (module eval) → all 34 cold resources → Canvas mount attempt → WebGL
  failure caught by `WorldFallback` → `world-fallback` (box GPU dead).
- Earlier healthy-window probe: full waterfall through `fj:playable` @ 2255 ms.
- Baseline cold numbers (2×1440, 2×390/lite) captured under the required
  harness before the outage.
- BLOCKED by environment during a multi-hour box WebGL outage (Chrome GPU
  process dying under memory pressure — `VENDOR=0xffff`), then recovered:
  post-change runs captured under the full required harness.

## Still wrong / rough
- **Box-level WebGL outage (18:50–21:55)**: the shared-headless-Chrome GPU
  stack died under box-wide memory pressure (`THREE.WebGLRenderer: Could not
  create a WebGL context, VENDOR=0xffff`, ~1 GB free of 15 GB). Diagnosed
  end-to-end during the outage: entry runs (`fj:app`), all 34 cold resources
  load (`fj:world5`), Canvas mount throws, boundary catches → fallback.
  Recovery runs (~21:55) produced the "after" numbers above.
- `student.glb`/`student-skin.png` link preloads: Chrome warns the skin
  preload is unused when credentials modes differ (fixed by dropping
  `crossorigin` — matches FileLoader/ImageLoader same-origin credentialed
  requests).
- `three` chunk is unchanged (~688 KB) — tree-shaking is already maximal;
  the wins came from moving fiber/drei satellites and postprocessing off the
  cold path, not from shrinking three.
