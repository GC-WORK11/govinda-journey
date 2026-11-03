# world — world art + performance (agent note)

Owns `src/world/` (World.tsx, kit.tsx, layout.ts, Traveller.tsx, + new `Effects.tsx`).

## What changed
- **Post-processing** (`Effects.tsx`, lazily imported): `N8AO` (halfRes, performance quality), `TiltShift2`, `Vignette`, `SMAA` inside `EffectComposer` (multisampling 0). Mounted only when **not** `?lite` and `fx` is on; `PerformanceMonitor.onDecline` drops DPR to 1 and unmounts the composer — plain renderer resumes, no breakage. First non-lite load triggers a vite dep-optimize reload once — normal.
- **Islands** (`kit.tsx: islandGeo`): grass-cap lathe with an overhanging lip + displaced rock cone merged into one mesh; AO baked into vertex colours (dark under the lip, shaded cone, slight top lightening). Ground colour comes from `palette.ground` per level.
- **Scatter** (`kit.tsx: scatterGeo` / `<Scatter>`): one merged vertex-coloured mesh per island — trees, boulders, pebbles, grass tufts, flower clusters, and a stepping-stone path along `pathLocal` (incoming bridge edge → stand point → outgoing edge). Keeps the diorama centre and stand area clear.
- **Bridges** (`kit.tsx: Bridge`): existing sagging planks + merged end posts with ball tops and two sagging rope rails (TubeGeometry, vertex-coloured).
- **Sky + clouds**: shader-dome vertical gradient tuned to the visible elevation band (soft aqua → warm cream → sand; fog colour matches). 14 merged clay clouds drift slowly below/around the islands (frozen under `prefers-reduced-motion`).
- **Traveller**: rounder clay figure — cream kurta hem + torso, blue sleeves, dark hair, terracotta backpack + bedroll, blob contact shadow. `body`/`legL`/`legR`/`armL`/`armR` groups are animated in `TravellerRig`: leg+arm swing, bob, forward lean while walking; breathing + limb relax while idle.
- **Camera**: eased lerp follow + `sin(π·progress)` sideways arc while crossing a bridge. Aim keeps the building in the right two-thirds on desktop and in the top half on portrait (text bottom-left / bottom). Portrait distance is wide enough that the island never clips.
- **Lights**: warm key (`PCFSoft`) + cool fill + hemisphere; ACES tone mapping.

## Perf
- DPR capped: 1 in `?lite`, ≤1.5 initial, ≤1.75 max via PerformanceMonitor; effects off in `?lite`.
- Per island: 2 draw calls (island mesh + scatter mesh) vs ~10 before; bridges 1 merged mesh + planks; dioramas still only render on near islands.
- `PATHS`/`BRIDGES` precomputed once so merges aren't rebuilt on store updates.
- `postprocessing` code lives in a lazy chunk (only fetched when effects can run); estimated well under the 1.2 MB gzip budget.
- Also added `C.stoneLight` / `C.waterLight` to the palette (L02's diorama uses them).

## Verified
- `npx tsc -p . --noEmit` — clean.
- `node scripts/shoot.mjs "http://localhost:5190/?lite" proofs/world*` — desktop + mobile, no console errors; `?qa&lite&at=L05` island view good.
- `node scripts/level-check.mjs L05` — **PASS**.
- Non-lite render verified visually: soft shadows, AO grounding, tilt-shift blur band, vignette.

## Rough edges
- Real fps unverifiable on this box (SwiftShader + heavy load); geometry is merged so draw calls are low.
- TiltShift focus band is static screen-space — tuned for the default framing; close-up play view still looks fine.
