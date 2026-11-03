# V6-PET status

Status: code written, NOT committed. Not verified in a browser yet. Box overloaded, so no tsc and no Chrome run since the last edits.

## Files (src/v5/pet/**)
- `Pet.tsx`: the dog. Default export `Pet`, plus `PET_MODEL` (null until ART lands the model).
- `bench.tsx` + `bench.html`: dev-only test bench (first 4 islands + real Player + Pet). Not in the build.

## Behaviour
- Unlock: mounts only when `useV5.done` includes `L03`. Scales in on a live unlock; GLB preloaded after `L02`.
- Trail: 1.25 m behind and 0.8 m to the traveller's right (drops to centre on bridges/edges). Stands about 1.5 m off.
- Runs when more than 2.2 m away (5.4 m/s). Keeps pace while the traveller walks. Idles when near and still. Sits after 3 s still and gets up when the traveller moves.
- Ground: down-ray against `walkables`, same as the player. Never added to `blockers`/`walkables`, so it can't block anything.
- Hops (0.6 m arc) when stuck at a gap or ledge for 0.6 s while the player is grounded.
- Teleports behind on respawn, on `?at` jumps (>3 m in one frame), or when more than 10 m away while grounded. Holds while the heli is flying (`usePlayerUI.flying`).
- No model: renders nothing. No primitive dog anywhere.

## WORLD: mount (one JSX line plus its import, src/v5/World5.tsx)
- `import Pet from './pet/Pet'`
- Inside `<Canvas>`, right after the `{Player ? ... : <FallbackRig />}` block: `<Pet />`
- Safe to add now: renders nothing while `PET_MODEL` is null.

## ART: model contract
- File: `public/models/pet/dog.glb` (CC0). Record source and license in `public/models/packs/LICENSES.md`.
- Rigged skinned mesh. Clip names containing idle, run (or gallop/trot/walk) and sit.
- Metres, origin at the feet, forward +Z (if not, tell PET; the `FACE` constant changes it).
- Compressed (meshopt or quantized), about 1 MB or less.
- `docs/notes/V6-ART.md` did not exist when I checked (04:05 IST). I did not create it.
- When the file lands, PET sets `PET_MODEL = './models/pet/dog.glb'` in Pet.tsx.
- Disk: 1.1 GB free at last check. Check `df -h /` before any download.

## Verified
- tsc: clean on the first version of Pet.tsx. Not re-run since the last four edits (no tsc under the overload instruction).
- Browser: nothing run. The shared Chrome lock was held by other agents' jobs (`v6-walk2.mjs`, `isl-f-v6.mjs`). An earlier background attempt never started.

## Not verified
- Follow distance, run/idle/sit, reveal, hop, respawn and `?at` teleports, bridge behaviour, touch input.
- Screenshots at 1440x900 and 390x844: none taken.
- No dog model exists yet, so there is nothing visual to judge.

## To finish
1. WORLD adds the mount line.
2. ART lands the GLB; PET flips `PET_MODEL`.
3. One bounded Chrome run on the bench (`/src/v5/pet/bench.html?qa&model=/models/student.glb&upto=I01`, a stand-in for logic only), at 1440x900 and then 390x844. Then commit.
