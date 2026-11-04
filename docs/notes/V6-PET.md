# V6-PET status

Status: the dog is mounted in World5 with the real GLB (`public/models/pet/dog.glb`, ART 65031c2) and unlocks only when L03 is done. Code only: no Chrome, no builds, tsc not run. Unverified. Nothing of mine is running.

## Shoot this
`http://localhost:5190/?qa&fresh&at=L05&unlock` at 1440x900 and 390x844.
- `fresh` clears saved progress. `at=L05` puts the traveller on L05. `unlock` completes L01 to I01, so L03 is done and the dog unlocks.
- The dog scales in beside the traveller about 1 s after load (the reveal plays on this URL, since the unlock happens after mount).
- Check: the dog sits behind and to the right, about 1.5 m off. Walk with W and S: it trails, runs when far, walks when slow, and idles when still.
- Check: after about 3 s still it sits (clip `Eating`, see below). Press W and it gets up.
- Check: it never stands in the walking line ahead of you. If it does, it hops back behind.
- Console: no PAGEERR and no errors from `src/v5/pet`. `__journey.pet.state()` should return `pos`, `dist`, `sit`, `moving`, `hop`, `rv`, `clip`.
- Before L03: `http://localhost:5190/?qa&fresh&at=L02` (no unlock). `__journey.pet` should be undefined, so no dog.

## What changed
- `src/v5/World5.tsx`: one import (`import Pet from './pet/Pet'`) and `<Pet />` inside the Canvas, after the Player block. Nothing else in World5.
- `src/v5/pet/Pet.tsx`:
  - `PET_MODEL = './models/pet/dog.glb'`.
  - `HEIGHT = 0.6` m (normalised from the model's bounding box). This is a guess; ART's note suggests the source is about 1 m, so tune this first if it looks wrong.
  - `FACE = 0`. Checked from the bones: the head is at +z (about 1.8 to 2.3) and the tail at -z, so the dog faces +z like the player.
  - Clips by exact name: `Idle` (idle), `Walk` (slow trail), `Gallop` (run, far away, or hopping), `Eating` (sit). The husky has no Sit clip, so `Eating` is ART's head-down rest substitute, looped.
- Follow: 1.25 m behind and 0.8 m to the right, about 1.5 m off. On bridges and edges it drops to the centre line.
- Never blocks:
  - Still not a blocker or walkable (unchanged).
  - No sitting on a bridge deck. Sit is off while the dog stands on a `walk-bridge` strip.
  - If the dog ends up in the walking corridor 0.2 to 2 m ahead of the traveller (within 0.6 m of centre), it hops back behind them.

## Decoder (ART note correction)
ART's note says to call `useGLTF.setMeshoptDecoder(MeshoptDecoder)` and import `meshoptimizer`. Neither works here:
- This drei version has no `useGLTF.setMeshoptDecoder`. Calling it throws.
- `meshoptimizer` is not a top-level package, so the import fails.

drei's `useGLTF` already sets a meshopt decoder by default (`useMeshopt` defaults to true, using three-stdlib). So no extra wiring is needed. I added none.

## Not verified
- Nothing has run in a browser since the earlier one-off bench check. That check used a human stand-in, so it covered follow logic only.
- Visuals: the husky's look and size, whether `Eating` reads as sitting, the shadow, and the reveal.
- Sit, hop, teleports, respawn, bridges, and the 390x844 touch layout.
- tsc. Run `timeout 120 ./node_modules/.bin/tsc --noEmit -p .` before any promote.

## Known issues
- Start swing: when the traveller turns away from the spawn facing, the dog can come round beside them (about 0.7 m off). It is not in the path, but it is close.
- Stopping fast: the dog can drift to about 1.1 m, just under the 1.2 m band.
- Timers run on real time capped at 0.25 s per frame, so on a slow machine sit takes longer.
- `Eating` may read as eating, not sitting. Ask ART for a sit pose, or accept it.

## Bench (dev only, not in the build)
The bench uses the real dog by default now. It is a logic rig with the first four islands and the real Player and Pet.
- Follow, sit, teleport: `http://localhost:5190/src/v5/pet/bench.html?qa&upto=I01`.
- Live reveal: `http://localhost:5190/src/v5/pet/bench.html?qa&upto=L03`, then in the console `(await import('/src/v5/core.ts')).useV5.getState().complete('L03')`. The dog should scale in beside the player.
- Locked: `http://localhost:5190/src/v5/pet/bench.html?qa&upto=L02`. `__journey.pet` should be undefined.
- Teleport check: run `__journey.player.teleport(0, 0.5, 0)` from spawn. The dog should be behind within about 1 s, dist at most 2.0.
- Respawn check: from spawn, hold S for 3 s and let the player walk off the L01 rim. Do not use `teleport` for this, because it resets the safe point and no fall happens.

## Earlier check (superseded)
One desktop bench check at about 04:58 IST with a human stand-in. Standing spot 1.48 m behind, followed while walking, idled when still. Console: one 404 (source not identified) and two `createRoot` warnings (likely `src/levels/L01/shared.v5.tsx:101`, not from Pet.tsx).
