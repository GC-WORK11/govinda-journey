# RESULT — heli (V7 sprint)

## Task
Replace the crude block helicopter in `src/v5/player/Heli.tsx` with a real CC0
3D model: spinning main + tail rotors, decent proportions, readable colours,
sized so the player reads as the rider. Keep `heli` API (seat, exitAt, landed,
flying) unchanged.

## What changed
- **`src/v5/player/HeliModel.tsx` (new)** — loads
  `public/models/packs/citykit/helicopter.glb` ("Helicopter" by kazuma via
  poly.pizza, CC0 — already in LICENSES.md). The GLB is one merged node in 4
  material groups; the model bakes transforms, re-pivots the main-rotor
  primitive onto the mast axis (0.02, −0.07), excises the merged tail-rotor
  disc (24 tris, z<−2.86 · y<0.91 · |x|<0.30) and substitutes a procedural
  tail rotor, and retints every material onto the clay palette via `toon()`
  (body terracotta, trim brick, canopy glass, rotors ink). Scale 0.6 →
  ~2.8 m nose-to-tail, ~2.1 m rotor span; skids rest on y=0, nose faces +z.
  Optional `rotorRef`/`tailRef` props hand the pivots to a caller; otherwise
  the model self-spins — lazy idle, full throttle while `heli.flying`.
- **`src/v5/player/Heli.tsx`** — `children ?? <HeliModel/>` default visual.
  Controller, physics and the exported `heli` state untouched.
- **`src/v5/player/Sandbox.tsx`** — demo drops its crude children (uses the
  default model); pad lifted to skid level (0.02), seatY 0.6.
- **`src/levels/L06/kit.v5.tsx`** — local `Heli` stub removed; now wraps
  `HeliModel` flipped π (keeps the stub's -z facing) with the same
  `rotorRef` API plus `tailRef`.
- **`src/levels/L06/Obstacle.tsx`** — spins both rotor pivots (tail at 5×
  main rate, same throttle curve); rider seat raised 0.32→0.62 for the
  taller craft; boarding blocker widened to cover the longer fuselage.

## Verification
- `tsc --noEmit` clean.
- GLB surgery verified offline: excise cut exactly the 24-tri tail disc;
  rotor pivot radius 0.01–2.03 m centred on the mast.
- Screenshots `proofs/v7/heli/l06-{parked,flying}-1440.png` (+ 390 lite) —
  see below for findings.
- `play.mjs` L06 at 1440 and 390 `--lite` — see below.

## Still wrong / notes
- (fill in after visual review)
