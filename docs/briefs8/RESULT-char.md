# RESULT — char (V8): player character

Task: full, well-lit 3D player — proper arms/hands, warm readable colours,
never dark/black or flat, smooth idle/run. Files owned: `src/v5/player/*`
(except Heli) + the student model/atlas it consumes.

## Where main already stood (V7 leftovers merged by integrate)

- `2b91333` — hand-mapped cell repaint of `student-skin.png` (warm skin,
  cream shirt, blue jeans, leather, near-black hair) + `CharProbe` tooling.
- `68a48a8` — `src/v5/world/CharLight.tsx` carried-lantern point light that
  follows the player (0.4 + night·3.6 warm glow, camera-facing side).

V7's own close-ups showed the KayKit Rogue rig is NOT broken — the "broken
arms/black blob" report was the atlas crushing to one dark mass. Remaining
gap vs the brief: night still read far too dark (lantern alone isn't a
floor), sprint played the walk clip flat at 2x (no run feel), and the V4
Traveller could diverge.

## What I changed

- `src/v5/player/Player.tsx`
  - **Emissive floor** — `mat.emissiveMap = mat.map` (the retinted atlas,
    set after the skin swap), `emissive #fff4e4`, `intensity 0.16`. The
    character keeps a whisper of his painted colour wherever every light
    term dies — dusk rim, night shade — so he can never collapse to a
    black blob. Zero extra lights/draw calls; shading still dominates in
    daylight.
  - **Sprint lean** — forward pitch `clamp((ts−1)·0.14, 0, 0.13)` rad while
    the walk clip plays, damped at λ8. At run speed ≈7° lean so sprint
    reads as a run rather than a fast-forwarded walk (the GLB ships no
    run clip; walk clip playback rate already follows speed).
- `src/v5/player/CharProbe.tsx` — night preset now includes the CharLight
  lantern point light (probe mirrors real in-game night lighting).
- `src/world/Traveller.tsx` — identical emissive floor for the V4 route's
  render of the same model (V7 char brief: keep Traveller consistent).
- `scripts/v5/char-shot.mjs` (new, dev tooling) — batched player
  screenshots inside one shared-chrome hold, one reused tab, skips shots
  that already exist.

## Verified

- `npx tsc -p . --noEmit` — clean. `pnpm build` — clean (slow: ~32 min
  under box load).
- **Software render (`tools/charrender.mjs`, proofs/char/sw-*.png)** —
  decodes the meshopt GLB, applies real skinning + clip sampling, and
  rasterises with the repainted atlas: verifies at the data level what a
  browser can't be trusted to show under load. Front/3-4/side/back,
  walk mid-stride, jump, cheer, sit, use all render correctly: warm
  brown skin, cream tunic, blue jeans, dark hair, articulated arms with
  proper fists. This confirms rig, weights, clip channels, and atlas are
  all sound — the character is NOT a flat/dark stand-in.
- V7-era real-browser close-ups (from the earlier char worktree) showed
  the repainted day character readable in-engine; those shots predate
  only my emissive-floor tweak.
- Chrome-lock note: the shared box queues extremely hard (multi-20-min
  e2e sweeps + persistent waiters). Two distinct blank-shot causes were
  diagnosed and fixed in `scripts/v5/char-shot.mjs`:
  1. vite's dep optimizer went stale after the config-change restart —
     `three_stdlib.js` went missing, every module 404'd, nothing
     mounted. Fix: `rm -rf node_modules/.vite` + restart (clean).
  2. **"Could not create a WebGL context"** — a Chrome launched under
     box load can come up with a dead GPU process; every canvas then
     fails. Fix: `char-shot` exits nonzero on not-ready shots so the
     caller re-queues and draws a fresh launch.

## Still rough / follow-ups

- In-engine screenshots for L01 (day) + L09 (night), desktop + mobile,
  are queued via `scripts/v5/char-shot.mjs` (retries on dead-WebGL
  launches). If they still hadn't landed at integration time, the
  in-engine evidence from the integrate sweep
  (`proofs/v5/1440-01-L01.png`) already shows the repainted traveller
  reading warm and correct at gameplay distance.
- `tools/charrender.mjs` is committed as reusable verification tooling
  (browser-free char check for future sprints).
