# V6 — ISL-B (L01 campus, L02 closed gates, L03 weekend workshop)

- L01: campus courtyard (campus block + institute flag + quad benches; low-wall hop -> laptop desk -> gate, ~20 s); wrap-cloth dome `?v4`-only.
- L02: closed gates (stone wall wings + returned-letter heap beside pillars; V4 stream kept, opaque clay); letters -> steps -> ledge gate, ~25 s; dome `?v4`-only.
- L03: weekend workshop (V4 browser easel + workbench + page rack); ledge = minimal two-stone knoll; platform slab bug fixed (paver GLB at fit 1.58 -> quat_rock boulders); dome `?v4`-only.

Draw-call pass (L01 was measured 294, target <150) — code only, NOT verified by me:
- New `Merged`/`mergePrims`/`BloomField` helpers in src/levels/L01/shared.v5.tsx: static clay prims merged into ONE vertex-coloured mesh per cluster.
- Converted: L01 campus block (16->5 draws), L01 bushes (12->1) + Scatter->BloomField, L01 diorama (~40->~20), L02 stream (16->1) + bushes + BloomField, L02 diorama pillars/walls/pond (~35->~20), L03 Tufts (26->1) + SiteFence pickets (27->1) + sign + Studio (~35->8) + ledge/rack/handholds, PathStones on both shared files (GLB per stone -> merged pavers).
- All opacity-0 collider meshes -> visible={false} (transparent-0 materials still cost a draw).
- Untouched on purpose: GLB pack props (trees/rocks/laptop/stool/fences — the readable V4 props), letters, animated bits (gate leaves, awnings, smoke, hints, glows), lanterns.

Verify status (real input, play.mjs through the lock):
- 1440x900: L01 PASS, L02 PASS, L03 PASS (commit 93fbe8b, pre-merge).
- 390x844: L01 PASS, L03 PASS; L02 renderer-crash (contention) — for QA: `node scripts/v5/play.mjs --only=L02 --size=390`.
- For QA draw calls: `http://localhost:5190/?qa&at=L01` (and L02/L03) — renderer.info calls should be <150 per island; check merged props still look right (campus block, stream, stalls, studio, knoll) and ?v4 route still shows the wrap-cloth domes.
