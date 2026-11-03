# V6-PET status

Status: committed as [unverified] (306cc18). One desktop browser check ran at about 04:58 IST (below). Partially verified: follow logic works on the bench with a stand-in model. Sit, hop, teleport, reveal, mobile and a real dog are not verified. tsc was not run at this commit. Since 05:12 IST agents run no browsers or Chrome. The checks below are for QA or Govinda to run.

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

## Verified (one desktop bench check, 1440x900, lock acquired)
Setup: bench with `?qa&model=/models/student.glb&upto=I01` (L01 to L03 done, so the pet mounts). Real keyboard: W held for 2.5 s. The stand-in is a human GLB scaled to 0.5 m, so this tests logic only, not the dog.
- Mounts once L03 is done: yes.
- Standing spot: 1.48 m away, 1.25 m behind (wanted 1.2 to 2.0 m): yes.
- Following: while walking, distance stayed between 1.1 and 1.9 m, behind by 1.1 to 1.7 m once settled.
- Clips: Idle when still, Walking_A while moving (stand-in clip names).
- Start swing: as the player turned away from the spawn facing, the dog came round to 0.7 m off the side before settling behind. It never stood in the path, but it is too close. Needs tuning.
- Stopping: the dog arrived 1.1 m away, just under the 1.2 m band, then drifted to 1.56 m.
- Screenshot at rest (`/tmp/gj-pet/check-1440-a.png`, not committed): the stand-in stands behind and to the right of the player on L01.
- Console: 3 errors. One 404, source not identified (the pet loads only the stand-in model, which did load). Two React warnings about createRoot on an already-used container. Not from Pet.tsx, which never calls createRoot. Likeliest source is `createRoot(host)` in `src/levels/L01/shared.v5.tsx:101`, not checked.

## Not verified
- Sit: not reached in the window. The last sample was still Idle, so the 3 s still timer never completed. The bench runs at a low frame rate under software GL.
- Hop, respawn, `?at` teleport, live reveal (the bench starts with L03 already done, so there is no live unlock), heli hold, bridges, touch input.
- Second screenshot (after walking): timed out in `captureScreenshot` under box load. No post-walk image.
- 390x844: not run.
- No dog model exists yet, so there is nothing visual to judge.

## Handoff: ready to verify (QA or Govinda runs these; agents run no browsers)
Needs the dev server on :5190. The bench is dev-only and not in the build.

Desktop 1440x900, bench with the stand-in human model (logic only):
`http://localhost:5190/src/v5/pet/bench.html?qa&model=/models/student.glb&upto=I01`
Run `__journey.pet.state()` in the DevTools console. Fields: pos, dist, behind, sit, moving, hop, rv, clip.
1. Standing: dist about 1.48, behind about 1.25 (wanted 1.2 to 2.0).
2. Hold W for 3 s: dist stays between 0.6 and 2.5 after the first second.
3. Stand still for 4 s after the dog arrives: sit true, clip `Sit_Floor_Idle`. Then hold W: sit false within about 1 s.
4. Clips: `Idle` while still, `Walking_A` while moving.
5. Teleport (a jump of about 4 m from spawn): run `__journey.player.teleport(0, 0.5, 0)`. Within about 1 s: dist at most 2.0 and behind above 0.
6. Respawn (real input): from spawn, hold S for 3 s. The player walks off the L01 rim, fades, and respawns on the island. The dog should be placed behind within about 2 s (dist at most 2.0). Do not use `teleport` for this: it resets the safe point, so no fall happens.

Mobile 390x844: same URL, device emulation with touch on. Joystick visible. Repeat 2 to 6 with the joystick.

Live reveal, desktop:
`http://localhost:5190/src/v5/pet/bench.html?qa&model=/models/student.glb&upto=L03`
1. Before: `__journey.pet` is undefined (no dog).
2. Run `(await import('/src/v5/core.ts')).useV5.getState().complete('L03')`.
3. Expect the dog to scale in beside the player over about 1 s with a small hop, then settle at dist about 1.5.

Locked check: `http://localhost:5190/src/v5/pet/bench.html?qa&model=/models/student.glb&upto=L02`. Expect `__journey.pet` undefined.

World5 (only after WORLD mounts `<Pet />`):
- `http://localhost:5190/?qa&at=I01&unlock` at 1440x900 and 390x844: same numbers as above, on the real map and bridges.
- `http://localhost:5190/` with no qa, fresh profile: no dog before L03 is done.

Pass: the checks above hold, no PAGEERR, no console errors from src/v5/pet. Visually: the dog is behind and to the right, not in the walking line, about half the player's height, with a shadow under it, and not clipping into island edges.
Fail: the dog stands in the path in front of the player for more than about 1 s, falls off an island, appears before L03 is done, or throws a PAGEERR.
Pre-existing noise, not pet: one 404 (source not identified) and two createRoot warnings (likely `src/levels/L01/shared.v5.tsx:101`).

Commit gate, not run by me: `timeout 120 ./node_modules/.bin/tsc --noEmit -p .`

## Known issues
- Start swing: the dog reaches 0.7 m off the player as the player turns away from the spawn facing. Not blocking, but too close.
- Stopping fast: the dog can drift to 1.1 m, just under the 1.2 m band.
- Timers use real time capped at 0.25 s per frame, so sit is slower on a slow machine.
- No dog model yet. The stand-in is a human at 0.5 m, so shape, facing and clips are not judged.

## Still open
1. WORLD adds the mount line.
2. ART lands the GLB; PET flips `PET_MODEL`.
3. When the real dog passes the handoff checks, drop `[unverified]`.
