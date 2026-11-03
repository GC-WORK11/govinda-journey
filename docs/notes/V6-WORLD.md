# V6-WORLD (perf + loading) — status

Bridge decks merge to one mesh after the reveal (~18→~4 calls/bridge); lazy obstacle+diorama chunks preload three islands out on top of the sticky near-mount; island stride tightened 16→14 m (~14% less dead walking); sun shadow map 512; `__journey.v5.stats()` reports calls/tris/dpr/frame-ms for the release check. Commit 57cbd61 (plus finale far/dome + caption fixes in 7909873/0be8c14/cc45a8b, ?at pin in 7d02453).

## Mount window + prop bake (this pass)

- `Island5.tsx`: obstacle/diorama/placeholder now mount ONLY on `|islandIdx − idx| ≤ 1` (non-sticky — registries unregister on unmount, `done`/`broken` persist). Finale still mounts all.
- `Dressing.tsx` (ART file — V6 gate + bake, flagged so ART doesn't revert): `IslandDressing5` self-gates on the same window, and its ~14 kit prop pieces are baked via `piecesGeo()` into ONE vertex-coloured mesh (~50 draws → 1 per dressed island).
- `Island5.tsx` `ExitGate`: the 4-piece swinging leaf merged to one mesh (6 → 2 draws per gate × 11 islands, shadow pass included).

## Measured (`__journey.v5.stats()`, 1440×900, `?qa&fresh&at=<ID>&unlock`)

- L01: **498 calls / 350k tris → 294 calls / 188k tris** (post-decline dpr 0.6). Baseline from docs/notes/V6-PERF.md.
- L06: not re-measured — agent browser runs were stopped mid-sample per the no-Chrome rule.

**For QA to verify:** load `http://localhost:5190/?qa&fresh&at=L01&unlock` and `...&at=L06&unlock` at 1440×900, wait ~25 s for the perf decline to settle, then read `window.__journey.v5.stats()` in console. Expect ~290 calls at L01, similar or lower at L06.

**Honest gap vs the <150 target:** remaining draws live in the 3 mounted islands' lazy diorama/obstacle chunks (ISL owners — merging those is their merge/instance task), the shadow pass (~doubles caster counts; could try `castShadow={false}` on baked dressing), clouds/water/sky, and player chrome. WORLD-side floor is now ~island bases (2/island × 11) + gates (2 × 11) + bridges near. The `ms` field is swiftshader frame time — not a TTI proxy.

## Shadow-caster diet (this pass)

`castShadow` removed from every small prop WORLD draws: island scatter, baked dressing, dressing scatter geos, exit-gate post+leaf, placeholder props, bridge rails/deck/planks. Casters left: player + the island bases themselves (the "big rocks"). Expected effect: each removed caster also disappears from the 512² shadow-map pass, so `gl.info.render.calls` should drop by roughly one call per ex-caster — ~50 calls at L01 (294 → mid-240s estimate), and the shadow pass gets cheaper for whatever remains. Visual cost: small props lose their cast shadow — acceptable, the sun is high and prop shadows were subtle.
