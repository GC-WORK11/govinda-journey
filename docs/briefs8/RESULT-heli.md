# RESULT — heli (V8 sprint)

## Task
Replace the blocky helicopter with a real 3D helicopter model — procedural or
CC0 glTF <300 KB. Files: `src/v5/player/Heli.tsx` + its assets.

## State found
INTEGRATED.md landed mid-session: the V7 heli work was already on main —
`HeliModel.tsx` wraps the CC0 `helicopter.glb` (kazuma/poly.pizza, 49 KB,
LICENSES.md), `Heli` defaults `children ?? <HeliModel/>`, `seatY` 0.24, L06's
kit wraps `HeliModel` with a π flip and Obstacle drives both rotor pivots.
The blocky stub was already gone.

## What this session changed
**`src/v5/player/HeliModel.tsx`** — rebuilt the model loader, same asset,
same measured pivots (mast 0.02,−0.07; tail disc 0,0.77,−2.885 thin-XY; the
24-tri excise zone re-verified by decoding the meshopt buffer offline):

- every GLB primitive is retinted as **vertex colours and merged into ONE
  body mesh** (`paint` + `mergeGeometries` + `toonVC` — the same pattern
  IslandBase/Dressing use) → the craft is **3 draw calls** (body / main
  rotor / tail rotor), down from ~7;
- new imperative export **`loadHeliCraft()`** → `{ root, main, tail }` —
  same assembly, no React — QA harnesses can add the craft to a live scene
  and drive the pivots;
- loads via `three/examples` `GLTFLoader` + `MeshoptDecoder` (inside the
  `three` package — no new dep), memoized, kicked at module import;
- consumer API unchanged: `<HeliModel rotorRef tailRef scale …group>`,
  self-spins (idle 3.5 rad/s → 26 rad/s while `heli.flying`) on unclaimed
  pivots, refs receive the pivot groups.

`Heli.tsx` needed no further change — V7's defaults were already correct.

## Verified
- GLB re-decoded offline (tools script style): prim0 body+tail+skids,
  prim1 cabin band, prim2 canopy glass, prim3 main rotor (blade radius
  ≤2.03 m about the mast); tail disc = thin XY at tail tip → `.z` pivot.
- `npx tsc -p . --noEmit` clean; `pnpm build` clean (Heli chunk 73.6 kB /
  22 kB gz — GLTFLoader + decoder, code-split).
- In-page screenshots landed ~21:58 after hours of shared-Chrome
  contention — `proofs/v8/heli/`:
  - `l06-island.png` + `craft-a.png`/`craft-b.png`: the merged craft in
    the live L06 island — terracotta fuselage, blue canopy, ink main
    rotor cross, on the pad ring. Visually identical to V7's verified
    `dev-parked.png`, now in 3 draw calls.
  - `sandbox-parked.png`/`sandbox-flying.png`: sandbox route mounts
    `<Heli>` with no children → default `HeliModel` path works (craft at
    frame edge; sandbox cam doesn't centre the pad — cosmetic).

## Left / notes
- The old `?sandbox` DemoHeli mounts `<Heli>` with no children → renders
  this model; L06 uses it via `kit.v5.tsx`'s `Heli` (π-flipped, both pivots
  driven by the obstacle).
- `loadHeliCraft()` re-clones per call; the glb scene is fetched once.
