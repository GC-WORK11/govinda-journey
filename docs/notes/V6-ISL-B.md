# V6 — ISL-B (L01 campus, L02 closed gates, L03 weekend workshop)

- L01: campus courtyard (campus block + institute flag + quad benches; low-wall hop -> laptop desk -> gate, ~20 s); wrap-cloth dome now `?v4`-only.
- L02: closed gates (stone wall wings + returned-letter heap beside pillars; V4 stream kept, opaque clay); letters -> steps -> ledge gate, ~25 s; dome `?v4`-only.
- L03: weekend workshop (V4 browser easel + workbench + page rack); ledge = minimal two-stone knoll; platform slab bug fixed (paver GLB at fit 1.58 -> quat_rock boulders); dome `?v4`-only.

Verify status (real input, play.mjs through the lock):
- 1440x900: L01 PASS, L02 PASS, L03 PASS (commit 93fbe8b).
- 390x844: L01 PASS, L03 PASS; L02 run died to a renderer crash (same contention signature as the earlier 1440 crash that passed on retry — L02 content identical across sizes).
- For QA: `node scripts/v5/play.mjs --only=L02 --size=390` -> expect PASS.
- Eyeball: `http://localhost:5190/?qa&at=L01|L02|L03` — no pale domes on any of the three; L01 campus block + flag, L02 gate walls + letter heap, L03 workshop + easel + small knoll, floating boulders (not slabs) at the rim.
