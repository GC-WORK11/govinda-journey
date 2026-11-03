# V5-WORLD status

## Done
- `src/v5/world/layout.ts` — `ISLAND_POS`/`ISLAND_R`/`ENTRY`/`EXIT`, gentle S-curve rising ~1 m/island, ~16 m apart, radius 5.
- `src/v5/world/Sky5.tsx` — V4 `sky.ts` stops sampled by continuous player-path progress (morning → golden → dusk → night), fog, dome, stars, `env.night` lamp drive, `skyDebug` export for QA.
- `src/v5/world/Island5.tsx` — **V4 parity base**: `kit.Island(radius=5)` + `scatterGeo` dressing (z path corridor kept clear) + lazy V4 `Diorama` (scaled `5/3.2`, `unlocked=done`, `active=current`), Obstacle layered on top (lazy+guarded, placeholder while missing), exit gate blocker until done, lantern stands lit by `env.night`.
- `src/v5/world/Bridge5.tsx` — bridge rises/planks settle only after previous island complete; registers a walkable strip.
- `src/v5/World5.tsx` — Canvas (shadows, ACES 1.08, dpr ≤1.5, PerformanceMonitor), V4 `Clouds`, ART `Water`, V4 `Effects` (post FX), lazy guarded `Player`/`Controls`, `FallbackRig`, `FinaleCam` (driven by `core.cinematic.on`), `?qa` hooks (`state/complete/goto/project/find` + `&at=&unlock&finale&fresh`), `Hygiene` sweep (hides null-geometry meshes so a bad island merge can't freeze the canvas).
- `src/v5/ui/` — `v5.css` (Fraunces/Inter, no panels), `Ribbon` (years + tick per island + easing marker; stacked under the wordmark row at all widths), `Caption` (registry line/tech, fade), `Glyphs` (7 engraved SVG line glyphs), `Finale` (name + line + Resume/Contact + "Keep walking"), `Chrome`.
- `src/App.tsx` — V5 default; `?v4` keeps old World+Overlay; `?sandbox` lazy PLAYER Sandbox; `?qa`/`?lite` kept.
- `src/levels/registry.ts` — L05 before L04, copy untouched. `src/v5/core.ts` — marked add-only `cinematic` section.

## Verified
- `tsc -p . --noEmit`: clean for all WORLD files.
- `390x844` (?qa&fresh): canvas renders; header stacks cleanly (wordmark row `01 / 11` → ribbon → caption); distant island (L02) visible behind L01; warm horizon + water.
- `1440x900` (?qa&fresh): same layout verified; next island silhouette behind; V4 island visuals (dome, scatter, diorama) + obstacle placeholder live.
- Bridge walk strip = 0.98 m (was 0.62 vs 0.95 m planks — players were falling at the edges).
- `Hygiene` + `Guard.onError → useWorldUI.broken`: a crashed or null-merged island can no longer freeze the canvas or strand the path (gate + bridge open).

## Cross-area notes
- **PLAYER**: follow-cam was framing very close/low on mobile spawn (character fills half the frame). Distance/pitch on `pointer:coarse` may need a look.
- **ISL-A (L01/L02)**: `PillHint` in `shared.v5.tsx` renders a `<span>` inside the R3F tree — React throws, `Guard` catches it, the island's obstacle is skipped and its gate/bridge open via `useWorldUI.broken`. DOM hints need `drei <Html>` or a DOM overlay.
- **ISL**: several island merges can return null (`I02/station.v5`, `L04/street.v5` seen earlier — mixed attribute sets). `Hygiene` now hides the result instead of freezing the canvas, but the meshes are still missing. `mergeGeometries` needs matching attribute sets (position/normal/uv/color) — custom `BufferGeometry` must set `uv` if mixed with primitives.
- **ART**: `IslandBase`/`Clouds5`/`Effects5` are wired in `modules.ts` but NOT mounted — V4 base/scatter/diorama/clouds/effects are the parity baseline per the hard rule ("V5 must never look worse than V4+art"). Swap-in is one line when an ART piece clears the V4 bar. `Water` is mounted (no V4 equivalent).
- Persisted `govinda-journey-v5` in the shared Chrome profile carries `done` state across runs — use `&fresh` for clean verification.

## Open
- Finale pull-back + "Keep walking" — implemented via `cinematic.on`; needs a visual pass once PLAYER camera settles.
- Mid-journey / night lantern + finale screenshots pending Chrome budget.
