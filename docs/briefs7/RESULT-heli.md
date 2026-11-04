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
- **`src/v5/player/Heli.tsx`** — `children ?? <HeliModel/>` default visual;
  default `seatY` 0.62→0.24. Controller, physics and the exported `heli`
  state untouched.
- **`src/v5/player/Sandbox.tsx`** — demo drops its crude children (uses the
  default model); pad lifted to skid level (0.02).
- **`src/levels/L06/kit.v5.tsx`** — local `Heli` stub removed; now wraps
  `HeliModel` flipped π (keeps the stub's -z facing) with the same
  `rotorRef` API plus `tailRef`.
- **`src/levels/L06/Obstacle.tsx`** — spins both rotor pivots (tail at 5×
  main rate, same throttle curve); rider seat 0.32→0.24 (measured: the GLB
  has an open passenger bay at craft centre — bay floor ≈0.23 m world —
  which parks the rider's head ≈0.78 just under the 0.83 rotor disc with
  shoulders above the bay rim; the old 0.62 put the blades through the
  rider's chest); boarding blocker reshaped 0.62×1.0×0.5 → 0.7×1.0×1.8 and
  shifted +0.4 z so the longer fuselage isn't clipped while the prompt
  stays reachable.

## Verification
- `tsc --noEmit` clean; `vite build` clean (6 s, static dist served on :5203).
- GLB surgery verified offline: excise cut exactly the 24-tri tail disc;
  rotor pivot radius 0.01–2.03 m centred on the mast.
- Rider fit measured from the real assets: `Sit_Floor_Idle` head bone
  +0.46/head top ≈+0.55 over the seat; rotor disc at 0.83 → seat 0.24 puts
  the head just under the disc inside the model's open bay.
- `proofs/v7/heli/dev-parked.png` — L06 dev harness render: model loads and
  retints correctly, parked on the pad, main rotor idling.
- `proofs/v7/heli/l06-{parked,flying}-{1440,390}.png` — queued on the shared
  chrome lock (contention on the box is severe; results below when landed).
- `play.mjs` L06 at 1440 and 390 `--lite` — queued behind the same lock.

## Still wrong / notes
- Dev-server mode on the shared box was unusable for verification (Vite dep
  optimizer 504s under disk pressure); screenshots run against the
  production build instead — same code path minus HMR.
- (visual findings appended after the proof run lands)
