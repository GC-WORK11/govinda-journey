# V6 PERF: one-island measurement and status

Written 2026-11-04 IST. Script: `scripts/v6/metrics.mjs`. Dist `c92191941e` (index.html built 03:57 IST), served by `vite preview` on :5191.

## Status

- **Capped run: not completed.** Run as `nice -n 19 timeout -k 5 120 node scripts/v6/metrics.mjs /tmp/gj-perf-cap.json L01` (one island, 1440x900, one cold load). It could not get the shared Chrome lock: another agent's `livecheck` (PID 1409461) held it for the whole 60 s wait, so the run ended with `chrome lock wait timeout` after writing the static bundle numbers. I did not retry while the lock was held.
- **Numbers below come from an earlier uncapped run** of the same one island plus one cold load (`ONLY=L01 COLD=1`). It ran 04:13 to 04:35 IST (22 min) and exited 0. I did not cap it, and it overlapped the box freeze you reported (04:13 to 04:34). Its shell was already finished when I stopped it, so nothing was killed mid-run.
- **The committed script is the capped version.** Its cold and island paths have not run end to end; only the lock-timeout path has run. The numbers above came from the previous version of the script, which is not in git.
- `docs/PERF.md` was not written in this run.

## Results (L01 at 1440x900, one cold load, software GL, one run)

Cold visit `/` (fresh context, real clock):

| First canvas frame | Player present | TTI | FCP |
|---|---|---|---|
| 3,424 ms | 7,958 ms | 7,958 ms | 2,360 ms |

One load, so there is no spread.

`?at=L01`:

| | Full tier | As rendered on this box |
|---|---|---|
| Draw calls per frame | **498** | 390 |
| Triangles per frame | 350,263 | 219,531 |
| render() calls per frame | 29 | 1 |
| Geometries | 409 | 342 |
| Pixel ratio | 1 | 0.6 |
| Frames sampled | 5 | 12 |
| JS per frame, median / p95 (ms) | 10.3 / 13.5 | 3.5 / 7.1 |
| render() median (ms) | 9.0 | 2.9 |
| rAF interval, median / p95 (ms) | 366.7 / 1,255 | 133.3 / 283.3 |

Draw counts were identical in every sampled frame in both passes. Frame-time numbers are software-GL numbers, not fps.

What this says:
- **Over the target.** The goal is under about 150 draw calls. L01 is at 498 on the full tier and 390 as rendered.
- **Only L01 was measured.** World5 mounts all 11 islands in one scene, and frustum culling makes the count depend on what the camera sees. Other levels will differ; I have not measured them.
- **The shadow flag did not stay off.** drei's PerformanceMonitor declined at 5,574 ms after navigation, 22 ms after the player appeared, and the pixel ratio dropped to 0.6 with FX off (1 render pass). But the shadow flag read on in all 12 sampled frames. I did not find out why.
- **Not broken down:** which objects make up the 498 draws, and why there are 29 render calls per frame on the full tier.

## Bundle (gzip, zlib level 9)

- All JS: 61 files, 674,621 B gzip (659 KB), 1,990,266 B raw.
- Initial (fetched before TTI on the cold visit): 25 files, 571,184 B gzip (558 KB), which is 85% of all JS. The largest are `three-PXwEd_w5.js` (172 KB gzip), `r3f-DnDbBnyq.js` (160 KB), and `index-2rOB9rmF.js` (156 KB). The "small initial bundle" goal is not met.
- The L01 visit fetched no JS beyond that initial set. It fetched 1,072,071 B of models (raw).
- Console errors on the cold visit and the L01 visit: 0.

## Method

- Draw calls and triangles come from `renderer.info`, read after each `render()` call and summed per animation frame. Shadow and post passes are included.
- Full tier: `performance.now` is pinned to a 60 fps virtual clock during the island run, so drei's PerformanceMonitor never declines and shadows, FX, water, and DPR 1 stay on. Draw counts do not depend on the clock, but this is a measurement harness. I have not checked the full-tier counts on a real GPU.
- Cold visit: real clock, fresh context, no `?qa`. TTI = max(first frame with draw calls, Player.tsx rig in the scene, detected by its `chest` or `spine` bone).
- The hook uses three's own `__THREE_DEVTOOLS__` observe event. No app code was changed.

## Not verified

- The capped run (see status). The committed script's cold and island paths are untested.
- The other 10 islands, mobile, repeat runs (stability), a median TTI (one load only), a breakdown of the 498 draws by object, the shadow-flag question above, and anything on a real GPU.

## Freeze

My uncapped run ran for 22 minutes in the same window as your freeze (04:13 to 04:34 IST). The 5- and 15-minute load averages were around 140 to 150 at 04:37. I cannot tell how much of that load was mine. I should not have run it without a cap.

## Re-run

When the Chrome lock is free:

```
nice -n 19 timeout -k 5 120 node scripts/v6/metrics.mjs /tmp/gj-perf-cap.json L01
```
